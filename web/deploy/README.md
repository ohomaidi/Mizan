# Deployment targets

Two shipping formats, one codebase, one container image.

| Target | Artifact | Builder script |
|---|---|---|
| **Azure Container Apps** (recommended for most customers) | Bicep deploy | `az deployment sub create -f azure-container-apps.bicep …` |
| **macOS** (on-prem, air-gapped labs) | `.pkg` installer → LaunchAgent | `deploy/mac-build.sh` |

> **Windows** native install was dropped in v2.5.14. The `.msi` packaging pipeline failed in CI five times in a row across three different rewrite attempts (WiX 4 schema gotchas) and `deploy/windows-build.ps1` had bit-rotted years before that. Operators on Windows hosts run Mizan inside Docker Desktop or WSL2 — same image, same upgrade path as Linux Docker.

The Docker image is the reference build. The Mac installer bundles the same `.next` output + `node_modules` + `public/` + `assets/fonts/` so the runtime is identical.

## Azure Container Apps (one-click)

```sh
az login
az account set --subscription <sub-id>
az deployment group create \
    --resource-group <your-rg> \
    --template-file deploy/azure-container-apps.bicep \
    --parameters \
        appBaseUrl=https://<your-host> \
        imageTag=2.5.14
```

What it provisions (UAE-North by default):

- Log Analytics workspace (ACA requirement)
- Storage account + Azure Files share → mounted at `/data` for SQLite persistence
- Managed Environment + Container App with HTTPS ingress + **system-assigned managed identity**
- **Container Apps Contributor** role on the resource group, granted to the managed identity
- `MIZAN_AZURE_RESOURCE_ID` env var injected so `/api/updates/apply` can swap its own image
- Liveness probe on `/api/auth/me`

Output: the `dashboardUrl` of the provisioned Container App. Visit it — the first-run wizard launches automatically. From there, every future release can be applied via the **Settings → About → Upgrade now** button (no CLI needed).

The Bicep template is idempotent — re-running it on the same resource group adds missing pieces (e.g. enabling managed identity on a pre-v2.5.6 deployment) without recreating the container app.

## macOS installer

```sh
cd web
bash deploy/mac-build.sh
# Output: deploy/dist/mizan-<version>.pkg
```

Or just download the latest `.pkg` from a GitHub Release — the in-app **Settings → About** panel surfaces a one-click download button.

Double-clicking the `.pkg` on a target Mac:

- Drops the app into `/usr/local/posture-dashboard/`
- Creates `~/Library/Application Support/posture-dashboard/` for the SQLite DB + uploaded logo
- Installs a LaunchAgent that starts the dashboard on login + restarts on crash
- Writes a CREDENTIALS.txt to the Desktop with the local URL + next-step instructions on first install only
- On upgrade installs: postinstall does `launchctl bootout` + `bootstrap` so the running LaunchAgent picks up the new code without a manual restart

The LaunchAgent listens on `127.0.0.1:8787` — you either hit it locally or front it with a Cloudflare tunnel / reverse proxy.

`DATA_DIR` lives outside the install root so SQLite + uploaded logo + config survive every upgrade untouched.

## Windows (Docker only)

Native Windows install isn't shipped. Run the same image as Linux:

```powershell
docker run -d -p 8787:8787 -v mizan_data:/data ghcr.io/ohomaidi/mizan:latest
```

Upgrade by `docker pull` + recreate; the data volume survives.

## Prerequisites per target

| Target | Prereqs on the install host |
|---|---|
| Azure | Azure subscription, Entra admin for creating app registrations |
| macOS | Node 22 runtime (the installer bundles the app; Node itself must be present — `brew install node@22`) |
| Windows / Linux Docker | Docker / Docker Desktop |
