# Deployment targets

Three shipping formats, one codebase, one container image.

| Target | Artifact | Builder script |
|---|---|---|
| **Azure Container Apps** (recommended for most customers) | Bicep deploy | `az deployment sub create -f azure-container-apps.bicep …` |
| **macOS** (on-prem, air-gapped labs) | `.pkg` installer → LaunchAgent | `deploy/mac-build.sh` |
| **Windows** (on-prem) | `.msi` installer → Windows Service | `deploy/windows-build.ps1` |

The Docker image is the reference build. Both native installers bundle the same `.next` output + `node_modules` + `public/` so the runtime is identical.

## Azure Container Apps (one-click)

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

What it provisions (UAE-North by default):

- Log Analytics workspace (ACA requirement)
- Storage account + Azure Files share → mounted at `/data` for SQLite persistence
- Managed Environment + Container App with HTTPS ingress
- Liveness probe on `/api/auth/me`

Output: the `dashboardUrl` of the provisioned Container App. Visit it — the first-run wizard launches automatically.

## macOS installer

```sh
cd web
bash deploy/mac-build.sh
# Output: deploy/dist/posture-dashboard-<version>.pkg
```

Double-clicking the `.pkg` on a target Mac:

- Drops the app into `/usr/local/posture-dashboard/`
- Creates `~/Library/Application Support/posture-dashboard/` for the SQLite DB + uploaded logo
- Installs a LaunchAgent that starts the dashboard on login
- Writes `posture-dashboard-CREDENTIALS.txt` to the Desktop with the local URL + next-step instructions
- Opens that file automatically when the installer exits

The LaunchAgent listens on `127.0.0.1:8787` — you either hit it locally or front it with a Cloudflare tunnel / reverse proxy.

## Windows installer

```powershell
cd web
powershell -File deploy/windows-build.ps1
# Output: deploy\dist\posture-dashboard-<version>.msi
```

Double-clicking the `.msi`:

- Installs to `C:\Program Files\Posture Dashboard\`
- Creates `%ProgramData%\Posture Dashboard\data\` for the SQLite DB + uploaded logo
- Registers a "Posture Dashboard" Windows Service that starts on boot
- Adds a Desktop shortcut pointing to `http://localhost:8787`

## Prerequisites per target

| Target | Prereqs on the install host |
|---|---|
| Azure | Azure subscription, Entra admin for creating app registrations |
| macOS | Node 22 runtime (the installer bundles the app; Node itself must be present — add `brew install node@22` to the prep script) |
| Windows | Node 22 runtime |

Both native installers can be extended to bundle their own Node runtime (pkg-node or `pkg` by vercel); the scripts here expect Node to be already installed on the target. That's a tradeoff of installer size vs. deploy simplicity — document the chosen approach per customer.
