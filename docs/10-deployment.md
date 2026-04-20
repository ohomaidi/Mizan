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

The recommended production deployment. `deploy/azure-container-apps.bicep` + `deploy/aca-workload.bicep` together provision:

- Log Analytics workspace (ACA environment requirement)
- Storage account + Azure Files share (posture-data, 50 GB) → mounted at `/data`
- Managed Environment + Container App with HTTPS ingress
- Liveness probe on `/api/auth/me`
- Min 1 replica / max 2 (not a scale-bound workload)

Deploy:

```sh
az login
az account set --subscription <sub-id>
az deployment sub create \
    --name posture-dash \
    --location uaenorth \
    --template-file deploy/azure-container-apps.bicep \
    --parameters \
        resourceGroupName=posture-dash-rg \
        containerImage=ghcr.io/<org>/posture-dashboard \
        imageTag=1.0.0 \
        appBaseUrl=https://posture.<customer>.gov.ae
```

Output: the `dashboardUrl`. First visit triggers `/setup`.

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
