# Deployment

Three shipping formats for the Posture & Maturity Dashboard, all from one codebase:

| Target | Use case | Artifact | Build script |
|---|---|---|---|
| **Azure Container Apps** | Recommended for most customers, UAE-North data residency | Bicep deploy | `az deployment sub create -f deploy/azure-container-apps.bicep …` |
| **macOS** | On-prem labs, airgapped review stations | `.pkg` installer → LaunchAgent | `bash deploy/mac-build.sh` |
| **Windows** | On-prem government desktops | `.msi` installer → Windows Service | `powershell deploy/windows-build.ps1` |

## Docker image

Reference build. Defined in `web/Dockerfile` — Debian slim (glibc) multi-stage, running on Node 22. Stages: deps (install native-module toolchain) → builder (`next build`) → runner (non-root app user, no dev tools).

Environment:

| Var | Default | Purpose |
|---|---|---|
| `APP_BASE_URL` | `http://localhost:8787` | Public URL — used as the OIDC redirect host |
| `DATA_DIR` | `/data` | Where SQLite + uploaded logos live |
| `SCSC_SYNC_SECRET` | _(empty)_ | Shared secret for scheduled sync hits |
| `SCSC_SEED_DEMO` | `false` | Demo tenants + Sharjah branding if `true` (unset in packaged installs) |

Volume: mount anything at `/data` to persist the SQLite DB and uploaded logo across restarts.

Health check: `HEALTHCHECK` curls `/api/auth/me` — cheap, always returns 200, exercises the DB read path.

## Azure Container Apps (one-click)

The recommended production deployment. Two templates are shipped — pick based on your tenant's governance posture:

### Variant A — default (`deploy/azure-container-apps.bicep`)

Uses **SMB/CIFS Azure Files** with shared-key authentication. Simplest, cheapest, works on any subscription that allows `allowSharedKeyAccess: true` on storage accounts.

Provisions:
- Log Analytics workspace
- Storage account (Standard GPv2) + Azure Files share (50 GB), mounted at `/data`
- Managed Environment + Container App with HTTPS ingress
- Liveness probe on `/api/auth/me`
- Min 1 replica / max 2

Cost: ~$25–40/month for a single install (~200 entities).

### Variant B — NFS (`deploy/azure-container-apps-nfs.bicep`)

Use this when the tenant's Azure Policy blocks shared-key auth (common in **MCA-managed** subscriptions — look for the `StorageAccount_DisableLocalAuth_Modify` modify-effect policy). NFS 4.1 doesn't use shared keys at all.

Provisions everything Variant A does, plus:
- Virtual network with two subnets (ACA-delegated `/23` + private-endpoint `/28`)
- **Premium FileStorage account** (`allowSharedKeyAccess: false`; NFS-enabled)
- NFS file share (100 GB — Premium minimum)
- Private DNS zone `privatelink.file.core.windows.net` + VNet link
- Private endpoint to the storage account's file subresource
- VNet-integrated ACA managed environment (Consumption profile)

Cost: ~$35–55/month (Premium file share is the main uplift).

### Deploying

```sh
az login
# Variant A:
az deployment group create \
    -g <rg> \
    --template-file deploy/azure-container-apps.bicep
# Variant B:
az deployment group create \
    -g <rg> \
    --template-file deploy/azure-container-apps-nfs.bicep
```

Either variant's output includes `dashboardUrl`. First visit triggers `/setup`.

### Which storage account SKUs are legal in your tenant?

```sh
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub>/providers/Microsoft.Storage/skus?api-version=2023-01-01" \
  --query "value[?kind=='FileStorage'].{name:name,tier:tier}" -o table
```

You need `Premium_LRS` (kind `FileStorage`) available in your region for Variant B. It's supported in UAE North and all major Azure regions.

### Migrating from Variant A → Variant B

You cannot switch in-place — ACA environments have immutable VNet configuration. Redeploy:

1. Delete the Mizan resources from Variant A:
   ```sh
   RG=<your-rg>
   az containerapp delete -n <mizan-app-name> -g $RG --yes
   az containerapp env delete -n <mizan-env-name> -g $RG --yes
   az storage account delete -n <mizan-storage-name> -g $RG --yes
   az monitor log-analytics workspace delete -n <mizan-law-name> -g $RG --force true --yes
   ```
2. Click the **Deploy to Azure (NFS / locked-down tenants)** button in the repo README, or run the CLI version with the NFS template.

### Post-deploy

**Certificate migration:** the default secret-based MSAL auth is fine for pilot; for production you'd rotate to a certificate in Azure Key Vault with a short-lived cert-based MSAL config. Tracked in backlog.

**Daily sync:** wire an Azure Function / Logic App to POST `/api/sync` at 03:00 UAE. Include the `SCSC_SYNC_SECRET` as an `X-Sync-Secret` header.

## macOS installer

`deploy/mac-build.sh` produces a signed `.pkg`:

- Drops the app into `/usr/local/posture-dashboard/`
- Writes LaunchAgent to `~/Library/LaunchAgents/com.postureDashboard.plist`
- Creates `~/Library/Application Support/posture-dashboard/` for `DATA_DIR`
- Writes `~/Desktop/posture-dashboard-CREDENTIALS.txt` with first-run instructions + auto-opens it

Node 22 must be present on the target (or extend the script to bundle it via `pkg`/`vercel/pkg`).

Signing (optional, required for distribution outside the install org):

```sh
productsign --sign "Developer ID Installer: Your Name" \
    posture-dashboard-<ver>.pkg posture-dashboard-<ver>-signed.pkg
xcrun notarytool submit --wait posture-dashboard-<ver>-signed.pkg \
    --apple-id … --team-id … --password …
```

## Windows installer

`deploy/windows-build.ps1` produces an MSI via WiX Toolset v4:

- Installs to `C:\Program Files\Posture Dashboard\`
- Creates `%ProgramData%\Posture Dashboard\data\`
- Registers "Posture Dashboard" Windows Service (starts on boot)
- Adds a desktop shortcut → `http://localhost:8787`

Signing:

```powershell
signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 `
    posture-dashboard-<ver>.msi
```

## Post-install UX

All three installers drop the operator on the first-run `/setup` wizard when they first open the URL. The wizard:

1. Captures organization name (EN + AR) + short form + framework
2. Uploads logo (optional — local U-2-Netp bg removal)
3. Collects Graph-signals app credentials (optional — can be done later)
4. Collects user-auth app credentials (optional — dashboard stays open until configured)
5. Prompts bootstrap sign-in → first user becomes admin

Marking setup complete sets `app_config.setup.completed = true`. Re-running the wizard requires direct DB surgery (`DELETE FROM app_config WHERE key='setup'`).

## Upgrade paths

- **ACA:** push new image tag, `az containerapp update --image …`. Session cookies + SQLite survive the restart; Azure Files mount is shared across revisions.
- **macOS:** ship a new `.pkg`; `pkgbuild --upgrade` replaces the existing install. LaunchAgent reload is automatic.
- **Windows:** new `.msi` with a bumped `MajorUpgrade` version; Windows Service restarts post-upgrade.

Schema migrations run on first DB access after the upgrade (`applyMigrations()` in `lib/db/client.ts`) — idempotent.
