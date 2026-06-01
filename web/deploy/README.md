# Deployment targets

Two shipping formats, one codebase, one container image.

| Target | Artifact | Builder script |
|---|---|---|
| **Azure Container Apps** (recommended for most customers) | Bicep deploy | `az deployment sub create -f azure-container-apps.bicep …` |
| **macOS** (on-prem, air-gapped labs) | `.pkg` installer → LaunchAgent | `deploy/mac-build.sh` |
| **Self-hosted Docker** (Linux servers, Windows via Docker Desktop / WSL2) | `ghcr.io/ohomaidi/mizan:<tag>` | `docker run …` |

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
- VNet with two subnets (`aca` /23 delegated to `Microsoft.App/environments`, `pe` /28 for private endpoints)
- Storage account + NFS 4.1 Azure Files share → mounted at `/data` (uploaded logos + branding assets + SQLite backup target). `publicNetworkAccess: Disabled`, `allowSharedKeyAccess: false`, private endpoint in the `pe` subnet
- **`EmptyDir` volume** mounted at `/local-data` (live SQLite file — fast local disk, microsecond locks, WAL-safe)
- **Azure Key Vault** (RBAC, `publicNetworkAccess: Disabled`, `enablePurgeProtection: true`) with a private endpoint in the same `pe` subnet, plus the `privatelink.vaultcore.azure.net` private DNS zone
- **9 pre-seeded secrets** in the vault: `mizan-graph-client-secret`, `mizan-graph-cert-pem`, `mizan-graph-cert-thumbprint`, `mizan-graph-cert-chain`, `mizan-auth-client-secret`, `mizan-auth-cert-pem`, `mizan-auth-cert-thumbprint`, `mizan-auth-cert-chain`, `mizan-sync-secret`. The setup wizard overwrites them with real values
- Managed Environment + Container App, **single-replica** (`minReplicas: 1, maxReplicas: 1`, `activeRevisionsMode: Single`), HTTPS ingress, **system-assigned managed identity**
- **Container App `configuration.secrets`** sources every secret from `keyVaultUrl` + `identity: 'system'`; the env block exposes them via `secretRef` under the standard names (`AZURE_CLIENT_SECRET`, `AZURE_CLIENT_CERT_PRIVATE_KEY_PEM`, `AZURE_CLIENT_CERT_THUMBPRINT`, `AZURE_CLIENT_CERT_CHAIN_PEM`, `MIZAN_AUTH_CLIENT_SECRET`, `MIZAN_AUTH_CERT_PRIVATE_KEY_PEM`, `MIZAN_AUTH_CERT_THUMBPRINT`, `MIZAN_AUTH_CERT_CHAIN_PEM`, `SCSC_SYNC_SECRET`)
- Two role assignments to the managed identity: **Container Apps Contributor** on the resource group (self-upgrade) and **Key Vault Secrets Officer** on the vault (in-app secret rotations)
- Env vars: `SCSC_DB_PATH=/local-data/scsc.sqlite` (live), `MIZAN_DB_BACKUP_DIR=/data` (snapshot target), `MIZAN_AZURE_RESOURCE_ID` (so `/api/updates/apply` can swap its own image), `MIZAN_KEY_VAULT_URL` and `MIZAN_KEY_VAULT_NAME` (flip the runtime onto the Key Vault path), `CONTAINER_APP_NAME` (needed for revision restart after secret rotation)
- Liveness probe on `/api/auth/me`

**Storage architecture (v2.5.17+):** SQLite lives on the container's local `EmptyDir` for speed; a backup loop snapshots it to `/data/scsc.sqlite` (NFS) every 5 minutes plus on graceful shutdown. New revisions restore from the latest snapshot at boot. Soft restarts lose zero data; SIGKILL hard-crashes can lose up to N minutes (default 5).

**Secret architecture (v2.7.15+):** Every credential (Graph + user-auth `client_secret`, cert PEMs, thumbprints, chains, sync trigger secret) lives in Key Vault. The runtime reads them as plain env vars that the Container App populates from the vault via `secretRef`. Writes from the setup wizard or Settings → App Registration go through `@azure/keyvault-secrets` with the system identity, then fire-and-forget a revision restart so the next pod's env vars are dereferenced fresh. A pod-local override map lets the writer pod use the new value immediately during the restart window. The DB row keeps only non-secret config.

Output: the `dashboardUrl` of the provisioned Container App. Visit it — the first-run wizard launches automatically. From there, every future release can be applied via the **Settings → About → Upgrade now** button (no CLI needed).

The Bicep template is idempotent — re-running it on the same resource group adds missing pieces (e.g. enabling managed identity on a pre-v2.5.6 deployment, attaching the EmptyDir volume on a pre-v2.5.17 deployment, or provisioning the Key Vault + role assignment on a pre-v2.7.15 deployment) without recreating the container app or losing data.

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

## Self-hosted Docker

Run the reference image anywhere Docker runs — Linux servers, Windows hosts via Docker Desktop or WSL2, macOS for dev:

```sh
docker run -d -p 8787:8787 -v mizan_data:/data ghcr.io/ohomaidi/mizan:latest
```

Upgrade by `docker pull` + recreate; the named volume survives.

## Prerequisites per target

| Target | Prereqs on the install host |
|---|---|
| Azure | Azure subscription, Entra admin for creating app registrations |
| macOS | Node 22 runtime (the installer bundles the app; Node itself must be present — `brew install node@22`) |
| Self-hosted Docker | Docker / Docker Desktop |
