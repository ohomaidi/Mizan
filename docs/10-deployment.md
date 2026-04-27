# Deployment

Two shipping formats for the Posture & Maturity Dashboard, all from one codebase:

| Target | Use case | Artifact | Build script |
|---|---|---|---|
| **Azure Container Apps** | Recommended for most customers, UAE-North data residency | Bicep deploy | `az deployment sub create -f deploy/azure-container-apps.bicep …` |
| **macOS** | On-prem labs, airgapped review stations | `.pkg` installer → LaunchAgent | `bash deploy/mac-build.sh` |

> **Windows native install** was attempted briefly in v2.5.8–v2.5.12 (`.msi` via WiX) and dropped in v2.5.14. Operators on Windows hosts run Mizan inside Docker Desktop or WSL2 — same image, same upgrade path as Linux Docker.

## Docker image

Reference build. Defined in `web/Dockerfile` — Debian slim (glibc) multi-stage, running on Node 22. Stages: deps (install native-module toolchain) → builder (`next build`) → runner (non-root app user, no dev tools).

Environment:

| Var | Default | Purpose |
|---|---|---|
| `APP_BASE_URL` | `http://localhost:8787` | Public URL — used as the OIDC redirect host |
| `DATA_DIR` | `/data` | Where uploaded logos / branding assets live, and (on ACA) the backup target for SQLite snapshots |
| `SCSC_DB_PATH` | `${DATA_DIR}/scsc.sqlite` | Live SQLite file path. ACA deployments override this to `/local-data/scsc.sqlite` so the live DB sits on a fast local volume (v2.5.17+) |
| `MIZAN_DB_BACKUP_DIR` | _(empty)_ | When set, every 5 min (configurable via `MIZAN_DB_BACKUP_INTERVAL_MS`) the SQLite file is backed up to `${MIZAN_DB_BACKUP_DIR}/scsc.sqlite`. ACA sets this to `/data` (the NFS mount) so EmptyDir wipes during revision swap don't lose data. Mac/Docker self-hosted leave it unset — durable local disk doesn't need a separate backup target. |
| `SCSC_SYNC_SECRET` | _(empty)_ | Shared secret for scheduled sync hits |
| `SCSC_SEED_DEMO` | `false` | Demo tenants + Sharjah branding if `true` (unset in packaged installs) |

**Volume strategy (Mac / Docker):** mount anything at `${DATA_DIR}` (default `/data`) to persist the SQLite DB and uploaded logo across restarts. WAL mode is safe on local filesystems — single-replica deployment, no contention.

**Volume strategy (ACA):** see the dedicated section below.

Health check: `HEALTHCHECK` curls `/api/auth/me` — cheap, always returns 200, exercises the DB read path.

## Azure Container Apps (one-click)

The canonical production deployment: `deploy/azure-container-apps.bicep`.

**Storage architecture (as of v2.5.17):** SQLite lives on the container's **local `EmptyDir` volume** for speed (microsecond locks, full POSIX semantics, WAL mode safe). The **NFS 4.1 Azure Files** share is mounted as a **backup target** at `/data` only — it holds uploaded logos, branding assets, and a snapshot of the SQLite file taken every 5 minutes plus on graceful shutdown. NFS is auth'd by network rules + a private endpoint so `allowSharedKeyAccess` can stay `false` and governance policies like MCA's `StorageAccount_DisableLocalAuth_Modify` don't bite.

The dashboard is **single-replica by design** (`minReplicas: 1, maxReplicas: 1`, `activeRevisionsMode: Single`). SQLite is single-writer; horizontal scale-out is incompatible with the current schema and would require migrating to a server-side database.

### What the template provisions

- Log Analytics workspace (ACA environment requirement)
- Virtual network `10.60.0.0/16` with two subnets
  - `aca` /23 — delegated to `Microsoft.App/environments`, service endpoint for `Microsoft.Storage`
  - `pe` /28 — hosts the private endpoint
- **Premium FileStorage account** (`allowSharedKeyAccess: false`, `publicNetworkAccess: Disabled`)
- NFS 4.1 file share `mizan-data` (100 GB — Premium minimum), mounted at `/data` (backup target + write-once assets)
- **`EmptyDir` volume** mounted at `/local-data` — hosts the live SQLite file (`SCSC_DB_PATH=/local-data/scsc.sqlite`)
- Private DNS zone `privatelink.file.core.windows.net` + VNet link
- Private endpoint to the storage account's `file` subresource
- VNet-integrated ACA managed environment (Consumption profile)
- Container App pulling `ghcr.io/ohomaidi/mizan:latest`, system-assigned managed identity + Container Apps Contributor on the RG (for self-upgrade)
- HTTPS ingress with auto-managed TLS
- Liveness probe: `/api/auth/me`, initialDelay 30s, timeout 5s, threshold 5

**Backup + restore behaviour** (in `lib/db/client.ts`):
- On boot: if `/local-data/scsc.sqlite` is missing (e.g. fresh pod after revision swap), copy `/data/scsc.sqlite` → `/local-data/scsc.sqlite` so the new revision inherits the previous pod's last-saved state.
- Periodic: every 5 min, `db.backup()` writes `/local-data/scsc.sqlite` → `/data/scsc.sqlite` atomically (tmp + rename). Configurable via `MIZAN_DB_BACKUP_INTERVAL_MS`.
- Shutdown: SIGTERM handler runs one final backup before exit. Soft restarts (revision swap, deploy) lose zero data. Only a SIGKILL hard-crash can lose up to N minutes.

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

## Windows (Docker only)

Native Windows install is no longer shipped (dropped in v2.5.14). Operators on Windows hosts run the same Docker image as Linux:

```powershell
docker run -d -p 8787:8787 -v mizan_data:/data ghcr.io/ohomaidi/mizan:latest
```

Upgrade by `docker pull` + recreate. The `mizan_data` volume survives.

## Post-install UX

All three installers drop the operator on the first-run `/setup` wizard when they first open the URL. The wizard:

1. Captures organization name (EN + AR) + short form + framework
2. Uploads logo (optional — local U-2-Netp bg removal)
3. **Graph-signals app** — click *Create for me* to auto-provision (device-code flow against Microsoft's public CLI client) OR paste credentials from a manually-created app
4. **User-auth app** — same *Create for me* auto-provisioning option, OR manual credentials
5. Prompts bootstrap sign-in → first user becomes admin

Marking setup complete sets `app_config.setup.completed = true`. Re-running the wizard requires direct DB surgery (`DELETE FROM app_config WHERE key='setup'`).

### ⚠ Grant admin consent after auto-provisioning

Auto-provisioning creates both apps and stores the client IDs + secrets, but **Microsoft requires admin consent to be granted manually through the Entra portal** — there is no Graph API for it. Immediately after the wizard finishes:

1. **Entra portal → App registrations** → find each newly-created app.
2. For each app: **API permissions → Grant admin consent for &lt;tenant&gt;** → confirm.
3. Verify every row in API permissions shows Status *"Granted for &lt;tenant&gt;"* (green).

Until consent is granted, user sign-in fails with `AADSTS65001` and entity onboarding consent URLs won't render correctly. See `docs/08-phase2-setup.md §0` for the full checklist.

## Upgrade paths

- **ACA:** push new image tag, `az containerapp update --image …`. Session cookies survive the restart. SQLite live file lives on the new pod's `EmptyDir` and is restored from `/data/scsc.sqlite` (NFS backup) at boot, so per-tenant data persists across the swap. The previous pod's SIGTERM handler runs one final backup before exit so there's no data loss in the swap window.
- **macOS:** ship a new `.pkg`; `pkgbuild --upgrade` replaces the existing install. LaunchAgent reload is automatic.
- **Windows:** new `.msi` with a bumped `MajorUpgrade` version; Windows Service restarts post-upgrade.

Schema migrations run on first DB access after the upgrade (`applyMigrations()` in `lib/db/client.ts`) — idempotent.
