# Mizan — Security Posture, Measured.

<p align="center">
  <strong>A read-only observability layer over Microsoft Graph that scores every entity's security posture against a target, continuously.</strong>
</p>

<p align="center">
  <a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fohomaidi%2FMizan%2Fmain%2Fweb%2Fdeploy%2Fazure-container-apps.json">
    <img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure" />
  </a>
  &nbsp;
  <a href="#macos">
    <img src="https://img.shields.io/badge/macOS-.pkg-silver?logo=apple" alt="macOS" />
  </a>
  &nbsp;
  <a href="#windows">
    <img src="https://img.shields.io/badge/Windows-.msi-blue?logo=windows" alt="Windows" />
  </a>
</p>

<p align="center">
  <img src="docs/images/dashboard-overview.png" alt="Dashboard overview" width="860" />
</p>

---

## What it does

Mizan pulls **18 read-only security signals** from every entity's Microsoft 365 tenant via Microsoft Graph, computes a per-entity **Maturity Index** (0–100), and ranks every entity against a target score you define. It's the one pane of glass for a holding company, ministry, or council that oversees dozens to hundreds of sub-organizations — each running their own tenant.

- **Federated visibility** across every consented Microsoft 365 tenant
- **18 Graph signals** — Secure Score, Conditional Access, Identity Protection, Intune compliance, Defender incidents, Purview DLP/IRM/Comm Compliance, Subject Rights Requests, retention/sensitivity labels, SharePoint tenant settings, PIM sprawl, Defender for Identity sensor health, Attack Simulation, Threat Intelligence, Advanced Hunting, label adoption
- **Pluggable frameworks** — UAE NESA, KSA NCA, ISR / ISO 27001, or generic
- **Entra ID sign-in + RBAC** — Admin / Analyst / Viewer, with configurable session timeouts
- **White-label** — organization name, logo (auto background-strip, 100% local), colors, tagline, framework — all in Settings
- **Bilingual** — full English + Arabic, RTL-native
- **Read-only, always** — never writes to an entity's tenant; no configuration push, no policy deployment

---

## Deploy

### <a name="azure"></a>🚀 Azure (recommended)

Click the button above. Azure portal opens with the template pre-loaded — fill in two fields and click Create. Works on any subscription (including MCA-managed and policy-locked tenants) because the template uses NFS-mounted Azure Files, which doesn't rely on shared-key auth.

Or via CLI:

```sh
az group create -n mizan-rg -l uaenorth
az deployment group create \
    -g mizan-rg \
    --template-file web/deploy/azure-container-apps.bicep \
    --parameters appBaseUrl=https://posture.example.com
```

After the deployment completes (~3 min), click **Go to resource**. You'll land on the **Deployment overview** page — find the `dashboardUrl` in the **Outputs** section (left sidebar). Paste it in a new browser tab. First load takes ~30s (container cold-start), then the `/setup` wizard fires.

Alternate path to the same URL: Resource group → Container App (`mizan-app-<random>`) → **Application URL** in the top-right.

**What gets provisioned:**
- Virtual network with two subnets (ACA-delegated + private-endpoint)
- Premium FileStorage account (NFS-enabled, public network access disabled, shared-key disabled)
- Private DNS zone `privatelink.file.core.windows.net` + private endpoint for SMB-free mounts
- Log Analytics workspace for app logs
- VNet-integrated Container Apps managed environment (Consumption profile) + Container App — pulls the public image from ghcr.io, no registry setup on your side
- HTTPS ingress with auto-managed TLS

Cost: ~$35–55/month for a single-customer install (Premium FileStorage minimum ~100GB is the main uplift).

### Changing the dashboard URL after the first deploy

The ACA-assigned URL (`https://mizan-app-xxx.region.azurecontainerapps.io`) works out of the box. Three ways to swap it for something nicer later:

**Option 1 — Bind a custom domain to the Container App (recommended)**
1. Buy/own the DNS for `posture.yourcompany.gov.ae`
2. Azure portal → your Container App → **Custom domains** → **Add custom domain**
3. Pick **Managed certificate** (Azure auto-issues + renews the cert)
4. Add the CNAME Azure shows you to your DNS provider; wait ~2 min for validation
5. Done. Both the new domain and the original `.azurecontainerapps.io` URL keep working

**Option 2 — Put a Cloudflare tunnel / Azure Front Door in front**
Zero ACA config change needed. Mizan's runtime resolver picks up the incoming `Host` / `X-Forwarded-Host` header automatically.

**Option 3 — Explicit override**
Container App → **Containers** → **Environment variables** → add `APP_BASE_URL=https://posture.yourcompany.gov.ae` → **Save**. Triggers a rolling revision (~30s) and pins the URL regardless of incoming headers.

**Whichever option you use** — after the URL changes, you **must** also update the redirect URI on your **User Auth** Entra app (Entra portal → App registrations → your user-auth app → **Authentication** → update the Web redirect URI to `https://<new-url>/api/auth/user-callback`). Entra does exact-match, so a mismatch breaks sign-in with `AADSTS50011: redirect URI mismatch`.

### <a name="troubleshooting"></a>Troubleshooting Azure deployments

The deployment completed but the URL returns nothing / times out? Walk through these in order.

#### 1. Is the container actually running?

Azure portal → Container App → **Revisions and replicas**. You want `Healthy` + 1/1 replicas.

If you see `Unhealthy` + 0/1 replicas with a container stuck in `Waiting / PodInitializing`, read on.

#### 2. NFS mount failure (rare — Premium FileStorage SKU unavailable)

```sh
az login
az containerapp logs show -n <mizan-app-name> -g <your-rg> --type system --tail 30
```

If you see `MountVolume.SetUp failed` with NFS-specific errors, the most common cause is Premium_LRS FileStorage not being available in the chosen region. Check:
```sh
az rest --method GET \
  --url "https://management.azure.com/subscriptions/<sub>/providers/Microsoft.Storage/skus?api-version=2023-01-01" \
  --query "value[?kind=='FileStorage' && tier=='Premium']" -o table
```
If Premium isn't available in your region, redeploy in a nearby region that supports it (every major Azure region does, including `uaenorth`, `westeurope`, `eastus`, `northeurope`).

Cleanup commands if you need to redeploy:
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

#### 3. Image pull failure

Log stream shows `Failed to pull image` or `ErrImagePull`. Verify the public image is reachable:
```sh
curl -fsS "https://ghcr.io/token?scope=repository:ohomaidi/mizan:pull&service=ghcr.io" >/dev/null && echo "token OK"
```
If the image somehow regressed to private on GHCR, flip it back to public at **github.com/users/ohomaidi/packages/container/mizan/settings** → Danger Zone.

#### 4. Liveness probe timeouts

Logs show `Readiness probe failed` or `Liveness probe failed` repeatedly. The NFS variant already bumps the probe generosity (initialDelaySeconds=30, timeoutSeconds=5, failureThreshold=5). If the legacy variant is hitting probe timeouts, update:
```sh
az containerapp update -n <mizan-app-name> -g <your-rg> \
    --set-env-vars NODE_ENV=production
# probes are set via the Bicep, easier to redeploy than patch them live
```

#### 5. "Kubernetes error happened. Closing the connection." when opening Log stream

That's ACA's way of saying no replica is running — the container failed before stdout could open. Use the system logs (`az containerapp logs show ... --type system`) or the **Revisions and replicas** page. Don't try to stream app logs until at least one replica is healthy.

#### 6. `AADSTS50011: redirect URI mismatch` on sign-in

The URL Mizan is running at doesn't match the redirect URI you registered on the Entra user-auth app. Update the Entra app's Web redirect URI to `https://<your-actual-url>/api/auth/user-callback`. See [Changing the dashboard URL](#changing-the-dashboard-url-after-the-first-deploy) above.

#### 7. `AADSTS50076: multi-factor authentication required` when running `az` commands

Your tenant enforces MFA on management operations. The CLI surfaces the specific `az login` command to run in the error message — paste it verbatim, complete MFA in the browser, retry.

#### 8. Deployment gets stuck "InProgress" for >15 min

Most likely a prerequisite resource hit a policy block. Run:
```sh
az deployment group show -n <deployment-name> -g <your-rg> --query "properties.error"
```
The error usually points at the resource type and policy reason.

---

### <a name="macos"></a>🖥 macOS

For on-prem labs, airgapped review stations, and demos.

```sh
git clone https://github.com/ohomaidi/Mizan.git
cd mizan
bash web/deploy/mac-build.sh
# Output: web/deploy/dist/mizan-<version>.pkg
```

Double-clicking the `.pkg` on the target Mac:

- Drops the app at `/usr/local/mizan/`
- Installs a LaunchAgent that starts it on login (http://localhost:8787)
- Creates `~/Library/Application Support/mizan/` for the SQLite DB + uploaded logos
- Writes `~/Desktop/mizan-CREDENTIALS.txt` with first-run instructions — auto-opens when the installer finishes

---

### <a name="windows"></a>🪟 Windows

For on-prem government desktops.

```powershell
git clone https://github.com/ohomaidi/Mizan.git
cd mizan
powershell -File web/deploy/windows-build.ps1
# Output: web\deploy\dist\mizan-<version>.msi
```

Double-clicking the `.msi`:

- Installs to `C:\Program Files\Mizan\`
- Registers "Mizan" Windows Service (starts on boot)
- Creates `%ProgramData%\Mizan\data\` for SQLite + uploaded logos
- Adds a Desktop shortcut → http://localhost:8787

---

## First-run setup

Every install drops the operator on a 5-step setup wizard at `/setup`:

| Step | What it captures |
|---|---|
| 1 | Organization name (EN + AR), short form, framework (NESA / NCA / ISR / Generic) |
| 2 | Logo upload — background auto-removed locally via a bundled U-2-Netp ONNX model (no cloud, no Python) |
| 3 | Graph-signals Entra app (multi-tenant, for reading posture) |
| 4 | User sign-in Entra app (single-tenant, for staff sign-in) |
| 5 | Bootstrap admin — the first account to complete sign-in is promoted to admin automatically |

Steps 2–5 are all skippable — configure them from Settings anytime.

<p align="center">
  <img src="docs/images/setup-wizard.png" alt="First-run setup wizard" width="700" />
</p>

---

## Screenshots

### Maturity overview — the morning glance
Every connected entity ranked against your target, KPI tiles for the whole estate, 7d/30d/QTD/YTD deltas. One screen tells you who's dragging and who's pulling away.

<img src="docs/images/maturity.png" alt="Maturity overview" width="860" />

### Connected entities
Full list, sortable by any column. Cluster chips (Police / Health / Edu / Municipality / Utilities / Transport / Other) filter in place. CSV export one click away.

<img src="docs/images/entities.png" alt="Connected entities" width="860" />

### Entity drill-down
Per-entity Maturity Index with sub-score breakdown (identity, device, data, threat, compliance). Controls tab for dragging Secure Score items, Incidents tab for active Defender alerts, Connection tab for sync health.

<img src="docs/images/entity-detail.png" alt="Entity detail" width="860" />

### Governance — framework alignment
UAE NESA alignment by default. Switch to KSA NCA, ISR / ISO 27001, or generic at install time. Per-clause coverage bars backed by real Secure Score control mappings.

<img src="docs/images/governance.png" alt="Governance and NESA alignment" width="860" />

### Data protection, identity posture, threats, devices
Roll-up views for the cross-entity security story.

<p align="center">
  <img src="docs/images/data.png" alt="Data protection roll-up" width="420" />
  <img src="docs/images/identity.png" alt="Identity roll-up" width="420" />
</p>
<p align="center">
  <img src="docs/images/threats.png" alt="Threats roll-up" width="420" />
  <img src="docs/images/devices.png" alt="Devices roll-up" width="420" />
</p>

### Branded sign-in + user management
Entra ID sign-in, Admin / Analyst / Viewer roles, invite-by-email. All gated behind the in-app **Enforce sign-in** toggle so first-run installs stay open until you're ready.

<p align="center">
  <img src="docs/images/login.png" alt="Branded sign-in" width="420" />
  <img src="docs/images/settings-users.png" alt="Users and roles" width="420" />
</p>

### White-label branding in 30 seconds
Name (EN + AR), short form, tagline, colors, framework. Upload a logo and the ML model auto-strips the background locally.

<img src="docs/images/settings-branding.png" alt="Branding settings" width="860" />

---

## Architecture at a glance

Azure Container Apps (the one-click deploy):

```
                         ┌─────────────────────────────────────────────────┐
                         │  VNet  10.60.0.0/16                             │
                         │  ┌───────────────────┐  ┌───────────────────┐   │
                         │  │ subnet "aca" /23  │  │ subnet "pe" /28   │   │
    public HTTPS ──────► │  │ VNet-integrated   │  │ Private endpoint  │   │
    (managed TLS)        │  │ ACA environment   │  │ → Azure Files     │   │
                         │  │ ┌───────────────┐ │  └─────────┬─────────┘   │
                         │  │ │ Container App │ │            │             │
                         │  │ │  Next.js      │ │            │  NFS 4.1    │
                         │  │ │  app router   │ │            │  (no keys)  │
                         │  │ │      +        │◄┼────────────┘             │
                         │  │ │  sync         │ │                          │
                         │  │ │  orchestrator │ │      ┌──────────────────┐│
                         │  │ │  + 5 workers  │ │      │ Premium          ││
                         │  │ │      +        │ │      │ FileStorage      ││
                         │  │ │  SQLite on    │─┼──►  │ allowSharedKey=F ││
                         │  │ │  /data        │ │      │ publicNet=Off    ││
                         │  │ └───────┬───────┘ │      │ share "mizan-    ││
                         │  └─────────┼─────────┘      │   data" (100GB)  ││
                         │            │                └──────────────────┘│
                         └────────────┼──────────────────────────────────┬─┘
                                      │ Microsoft Graph (read-only, daily)
                                      ▼
                        ┌─────────────────────────────────────────┐
                        │  Each connected entity's M365 tenant    │
                        │  (consented the multi-tenant Graph app) │
                        └─────────────────────────────────────────┘
```

- **VNet-integrated ACA env** — the managed environment is attached to the `aca` subnet; the container reaches storage via a private endpoint in the `pe` subnet, so storage never has a public exposure.
- **NFS for persistence** — `Premium_LRS` FileStorage mounted at `/data`. SQLite (signals, users, config) + the uploaded logo live here. Survives container restarts and revision swaps.
- **Why NFS and not SMB** — many Azure tenants enforce `StorageAccount_DisableLocalAuth_Modify` policy that silently disables shared-key auth. SMB needs shared-key; NFS uses network-level auth via the private endpoint, so the deploy works under any governance posture.
- **Daily sync** — one `POST /api/sync` per day pulls all 18 Graph signals from every consented entity with a 5-worker pool.
- **No write path ever** — all Graph permissions are `.Read` scopes.

**On the Mac/Windows installers**: same Next.js app + SQLite, but `DATA_DIR` points at `~/Library/Application Support/mizan/` or `%ProgramData%\Mizan\data\` respectively. No VNet, no NFS — local filesystem directly.

See [docs/04-architecture-and-risks.md](docs/04-architecture-and-risks.md) for the full breakdown including the multi-tenant Graph auth model, throttling envelope, failure modes, and production hardening checklist.

---

## Documentation

- [docs/10-deployment.md](docs/10-deployment.md) — end-to-end deployment runbook (all three targets)
- [docs/11-branding-and-rbac.md](docs/11-branding-and-rbac.md) — branding config, RBAC model, session management
- [docs/08-phase2-setup.md](docs/08-phase2-setup.md) — Entra app registrations (both apps), app roles, lockout recovery
- [docs/01-feature-catalog.md](docs/01-feature-catalog.md) — full feature inventory
- [docs/04-architecture-and-risks.md](docs/04-architecture-and-risks.md) — multi-tenant auth, sync orchestrator, throttling, failure modes
- [docs/09-runtime-configuration.md](docs/09-runtime-configuration.md) — every editable config surface in Settings
- [CHANGELOG.md](CHANGELOG.md) — build log

---

## License

MIT. See [LICENSE](LICENSE).

Built on [Microsoft Graph](https://learn.microsoft.com/en-us/graph/), [Next.js](https://nextjs.org/), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [ONNX Runtime](https://onnxruntime.ai/), [sharp](https://sharp.pixelplumbing.com/), [@react-pdf](https://react-pdf.org/).
