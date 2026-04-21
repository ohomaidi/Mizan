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

The canonical production deployment: `deploy/azure-container-apps.bicep`.

Uses **NFS 4.1 Azure Files** for persistence. NFS is auth'd by network rules + a private endpoint, so `allowSharedKeyAccess` can stay `false` and governance policies like MCA's `StorageAccount_DisableLocalAuth_Modify` (which silently flip shared-key off) don't bite. This is the one template that works everywhere.

### What the template provisions

- Log Analytics workspace (ACA environment requirement)
- Virtual network `10.60.0.0/16` with two subnets
  - `aca` /23 — delegated to `Microsoft.App/environments`, service endpoint for `Microsoft.Storage`
  - `pe` /28 — hosts the private endpoint
- **Premium FileStorage account** (`allowSharedKeyAccess: false`, `publicNetworkAccess: Disabled`)
- NFS 4.1 file share `mizan-data` (100 GB — Premium minimum)
- Private DNS zone `privatelink.file.core.windows.net` + VNet link
- Private endpoint to the storage account's `file` subresource
- VNet-integrated ACA managed environment (Consumption profile)
- Container App pulling `ghcr.io/ohomaidi/mizan:latest`, mounting the NFS share at `/data`
- HTTPS ingress with auto-managed TLS
- Liveness probe: `/api/auth/me`, initialDelay 30s, timeout 5s, threshold 5

Cost: ~$35–55/month for a single-customer install (Premium FileStorage minimum 100 GB is ~$15/mo, private endpoint ~$7/mo, rest is LAW + Container App consumption).

### Deploying

**Via the portal (recommended):** the "Deploy to Azure" button in the repo README.

**Via CLI:**
```sh
az login
az group create -n mizan-rg -l uaenorth
az deployment group create \
    -g mizan-rg \
    --template-file deploy/azure-container-apps.bicep
```

Output includes `dashboardUrl`. First visit triggers `/setup`.

### Region availability check (before deploying)

The template requires Premium_LRS FileStorage in the target region. Check:
```sh
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub>/providers/Microsoft.Storage/skus?api-version=2023-01-01" \
  --query "value[?kind=='FileStorage' && tier=='Premium']" -o table
```

Supported in every major region including `uaenorth`, `uaecentral`, `westeurope`, `eastus`, `northeurope`.

### Cleanup (for redeploy)

ACA env's VNet config is immutable, so "trying again" means tearing down and recreating:

```sh
RG=<your-rg>
az containerapp delete          -n <mizan-app-name>     -g $RG --yes
az containerapp env delete      -n <mizan-env-name>     -g $RG --yes
az network private-endpoint delete -n <mizan-pe-file-name> -g $RG
az network vnet delete          -n <mizan-vnet-name>    -g $RG
az storage account delete       -n <mizan-storage-name> -g $RG --yes
az monitor log-analytics workspace delete -n <mizan-law-name> -g $RG --force true --yes
az network private-dns zone delete -n privatelink.file.core.windows.net -g $RG --yes
```

Resource names follow `mizan-*-<hash>` where the hash is deterministic per-RG (`uniqueString(resourceGroup().id)`). Get the actual names with `az resource list -g $RG --query "[?starts_with(name,'mizan')].name" -o tsv`.

### Post-deploy

**Certificate migration:** the default secret-based MSAL auth is fine for pilot. Production: rotate to a certificate in Azure Key Vault with a short-lived cert-based MSAL config. Tracked in backlog.

**Daily sync:** wire an Azure Function / Logic App to POST `/api/sync` at 03:00 UAE. Include `SCSC_SYNC_SECRET` as an `X-Sync-Secret` header.

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
