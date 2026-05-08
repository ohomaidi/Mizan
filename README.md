# Mizan — Security Posture, Measured.

<p align="center">
  <strong>A federated security-posture platform over Microsoft Graph. Ships in two modes: <em>observation</em> (read-only scoring across every entity) and <em>directive</em> (observation + curated Conditional Access policy pushes with rollback).</strong>
</p>

<p align="center">
  <a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fohomaidi%2FMizan%2Fmain%2Fweb%2Fdeploy%2Fazure-container-apps.json">
    <img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure" />
  </a>
  &nbsp;
  <a href="#macos">
    <img src="https://img.shields.io/badge/macOS-.pkg-silver?logo=apple" alt="macOS" />
  </a>
</p>

<p align="center">
  <img src="docs/images/dashboard-overview.png" alt="Dashboard overview" width="860" />
</p>

> **Personal work product, not a Microsoft offering.** Mizan is not Microsoft IP, is provided on a best-effort basis, and is not supported or endorsed by Microsoft. Use at your own risk. See the [full disclaimer](#disclaimer-and-notice-of-non-affiliation) below.

---

## What it does

Mizan pulls **18 read-only security signals** from every entity's Microsoft 365 tenant via Microsoft Graph, computes a per-entity **Maturity Index** (0–100), and ranks every entity against a target score you define. It's the one pane of glass for a holding company, ministry, or regulator that oversees dozens to hundreds of sub-organizations — each running their own tenant.

- **Federated visibility** across every consented Microsoft 365 tenant
- **18 Graph signals** — Secure Score, Conditional Access, Identity Protection, Intune compliance, Defender incidents, **Defender Vulnerability Management (CVE posture per device + cross-tenant CVE correlation)**, Purview DLP/IRM/Comm Compliance, Subject Rights Requests, retention/sensitivity labels, SharePoint tenant settings, PIM sprawl, Defender for Identity sensor health, Attack Simulation, Threat Intelligence, label adoption
- **Cross-tenant CVE correlation** — surfaces CVEs present in 2+ consented entities with exposed/remediated device rollups; a federated view no individual CISO can produce
- **Maturity trending** — per-entity daily snapshots with 30/90/180-day chart on the Overview tab
- **Pluggable frameworks** — UAE NESA, KSA NCA, ISR / ISO 27001, or generic
- **Entra ID sign-in + RBAC** — Admin / Analyst / Viewer, 7-day sliding-window session (configurable 8h / 24h / 7d / 30d) with silent Microsoft SSO re-auth on expiry
- **White-label** — organization name, logo (auto background-strip, 100% local), colors, tagline, framework — all in Settings
- **Bilingual** — full English + Arabic, RTL-native
- **Mobile + tablet ready (v2.5.0)** — middleware classifies the device on every request and renders a mobile-optimized chrome (compact topbar + off-canvas drawer, sheet-style modals, safe-area padding for iOS notch + home indicator) for phones, while tablets and desktops keep the persistent-sidebar dashboard chrome unchanged. Override with `?device=mobile|tablet|desktop` for QA or to force a layout. See [docs/14-responsive-and-mobile.md](docs/14-responsive-and-mobile.md).

### Directive mode — regulator write tier (optional, v2.0+)

Deploy with `MIZAN_DEPLOYMENT_MODE=directive` and you also get a second Entra app (provisioned through the setup wizard) holding writable Graph scopes, plus a `/directive` surface for regulators who have authority to harden consented entities. v2.0 ships the full directive write tier on every Graph-reachable surface today + curated coming-soon catalogs for the rest.

**Live in v2.0 — push works, real Graph writes:**

- **Per-entity consent mode** — each entity opts in or stays in observation. Observation entities are never written to, regardless of role.
- **12 Conditional Access baselines** — identity hardening, legacy auth block, risk-based enforcement, session hygiene, device posture. Report-only by default.
- **Custom CA wizard** — 7 steps, no JSON. Cross-tenant + tenant-scoped modes (latter unlocks specific users / groups / named locations / Terms of Use / custom auth strengths via Graph typeahead). Device filter rule builder.
- **13 Intune device-posture baselines** — iOS / Android / Windows / macOS compliance + iOS / Android MAM (no enrolment needed) + Windows BitLocker enforcement + 6 Defender for Endpoint **Attack Surface Reduction rules** (audit mode default).
- **4 SharePoint tenant external-sharing baselines** — strict external sharing, default link Internal+View, domain allow-list, anonymous links off. Singleton model — push only, no rollback (audit captures the diff).
- **IOC push console** — Defender for Endpoint Threat Intelligence indicators (file hash / URL / domain / IPv4 / IPv6) with per-IOC expiration, idempotency by description tag, full rollback.
- **Reactive writes** — incident classification, alert comments, risky-user confirm/dismiss, session revoke, threat submission.
- **Idempotent push** — repeat pushes match by tag and no-op instead of duplicating.
- **Rollback safety** — pre-flight preview reads each policy's current state from Graph, warns if the entity flipped report-only → enabled, per-row deselect, baseline-wide "Remove from ALL entities".
- **Per-entity baseline status** — one-call Graph-tag scan showing which baselines are present in each entity and what state each is in.
- **Audit log** — every directive action captured in `directive_actions` with actor, timestamp, Graph response. Never deleted.

**Coming soon catalogs in v2.0 — UI ready, push disabled until Microsoft Graph API closes the gap:**

DLP (4 baselines), Sensitivity Labels (3), Attack Simulation Training (3), PIM + Identity Governance (5), App Consent Policies (4), Tenant Identity Defaults (6). Catalogs render with an accent "Coming soon" banner; flipping `pushEnabled: true` is the only change needed when each phase's authoring API moves to GA.

**Production hardening:**

- **Cert-based MSAL** — swap `client_secret` for a PEM private key + SHA-1 thumbprint via Settings → App Registration → Certificate. No more shared-secret rotation; cert lifetime is whatever you sign with. Env-var fallback (`AZURE_CLIENT_CERT_THUMBPRINT` + `AZURE_CLIENT_CERT_PRIVATE_KEY_PEM`) for Azure Key Vault deployments. Same option on the user-auth Entra app.
- **`/api/health` endpoint** — DB ping for Azure liveness + monitoring probes. No auth required (probes have no creds; response carries no secrets — just `{ status, deploymentMode, tenantCount, latencyMs }`).
- **Accessibility v1** — skip-to-content link, modal focus trap + restore + `aria-labelledby`, sidebar `aria-current="page"`, autosave `aria-live="polite"` regions. Formal WCAG 2.2 audit deferred but the worst gaps are closed.

See [`docs/12-operating-manual.md`](docs/12-operating-manual.md) for the step-by-step operator flow. Observation-mode deployments render none of the directive surface — the `/directive` route returns 404 at the route-loader level.

### Executive mode — single-org CISO workspace (optional, v2.6+)

Deploy with `MIZAN_DEPLOYMENT_KIND=executive` (or pick "Single organisation" on the first-run `/setup` wizard) and Mizan reshapes itself for a CISO running **one** organisation rather than a regulator overseeing dozens. Same engine, same Microsoft Graph signals, same Maturity Index — different chrome, different IA, four extra modules built for board-level conversations.

**Same repo, one image.** `deploymentKind` is locked at first-run alongside `deploymentMode`, mirrors-then-diverges from Council.

**Information architecture — Executive sidebar drops 14 → 9 entries:**

```
Today                  ← daily-driver home (Maturity hero · top risks · open
                         incidents · pinned KPI tiles · 7-day change feed)
Posture                ← single tabbed page consolidating Identity / Devices /
                         Data / Threats / Vulnerabilities. Estate radar at top
                         with 90-day-ago dashed reference overlay.
Compliance             ← single-framework view (Dubai ISR, NESA, NCA, …).
                         Directive folded in as a callout when applicable.
─── Risk management ───
Risk register          ← board-grade risk list, impact × likelihood 1–25,
                         5×5 heat-map view, per-risk treatment plans
CISO scorecard         ← 10-pin catalog + operator-defined custom KPIs
─── Reports ───
Cyber insurance        ← aviation questionnaire (~30 q, IATA/ICAO/FAA-sourced),
                         Mizan auto-answers from signals where possible,
                         broker-export PDF
Board report           ← on-demand + weekly auto-draft, brand-coloured
                         4-page PDF
─── Workspace ───
Settings · FAQ
```

**Four new modules — full-stack:**

- **Risk register** — board-grade list with auto-suggest engine (5 hardcoded rules: critical CVE > N days unpatched, admin deactivation, MFA drop, maturity drop, high-severity incident SLA breach). Operator accepts → register; dismisses → 30-day cooldown. Tunable thresholds via Settings → Risk register slider. Per-risk treatment plans with owner / due date / status. 5×5 heat-map view alongside the table.
- **CISO scorecard** — pin board commitments from a 10-KPI catalog (Maturity Index, framework compliance, MFA on admins, critical CVE age, privileged role count, incident MTTR, device compliance, high-risk users, audit closure SLA, board report delivered). Each tile shows current vs target with green/amber/red status and a 7-day inline sparkline. Operator-defined custom KPIs supported via formula builder (`signalNumber` or `ratio`).
- **Cyber insurance readiness** — aviation-specific questionnaire (~30 questions) synthesised from public Beazley / Coalition / AIG forms, cross-referenced against IATA Cybersecurity Toolkit, ICAO Doc 8973, FAA AC 119-1A. Auto-evaluator answers questions where Microsoft 365 signals can prove the control (MFA on admins, MDE onboarding, device compliance, sensitivity-label catalog, vulnerability scanning, phishing simulation campaigns). Manual answers + free-text evidence persist alongside auto-answers. One-click "Export for broker" PDF.
- **Board PDF report** — quarterly cybersecurity report rendered with `@react-pdf/renderer`. 4-page brand-coloured layout: cover (org logo + period) · executive summary with headline KPIs and posture sub-scores · CISO scorecard table · top risks + top vulnerabilities · insurance readiness summary + planned actions. On-demand "Generate now" button + drafts list (the auto-weekly cron landing point).

**Setup wizard adapts.** The `/setup` wizard auto-creates both Entra apps via Microsoft device-code flow regardless of kind. In Executive mode the Graph signals app is registered as **single-tenant** (`AzureADMyOrg`) — pinned to the operator's own org instead of the multi-tenant audience Council needs for federated entity consent.

See [`docs/16-executive-mode-roadmap.md`](docs/16-executive-mode-roadmap.md) for the canonical roadmap covering everything Executive — what's shipped (v2.6.0 → v2.7.1), what's deferred (v2.8.0+), and the architectural decisions locked in.

---

## Access you need

Before clicking Deploy, confirm you have **both** of the following. Without them the deploy won't finish, or the post-deploy setup wizard won't be able to create the Entra apps.

### Azure subscription — to provision the infrastructure

Either:
- **Contributor** on the subscription (or the target resource group), OR
- A custom role with create/write rights on: `Microsoft.App/managedEnvironments`, `Microsoft.App/containerApps`, `Microsoft.Network/virtualNetworks`, `Microsoft.Network/privateEndpoints`, `Microsoft.Network/privateDnsZones`, `Microsoft.Storage/storageAccounts`, `Microsoft.OperationalInsights/workspaces`.

The template also creates role assignments between the Container App, the VNet, and the Storage account — that requires Contributor-equivalent permission at the resource-group scope. **Reader** is not enough.

Quick check:
```sh
az role assignment list --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope /subscriptions/<sub-id> --query "[].roleDefinitionName" -o tsv
```

### Microsoft Entra tenant — to create the two app registrations

The first-run wizard's **Create for me** buttons do this via device-code flow. Whoever approves the device code on their browser needs one of:
- **Application Administrator** (minimum — can create app registrations + client secrets), OR
- **Cloud Application Administrator**, OR
- **Global Administrator**.

To **grant admin consent** to each newly-created app afterwards (one button click in Entra portal), one of:
- **Privileged Role Administrator**, OR
- **Cloud Application Administrator**, OR
- **Global Administrator**.

In practice most operators use Global Admin for the whole setup to avoid juggling roles.

### Per-entity onboarding (later, not during first-run)

When you onboard each entity onto Mizan, that entity's **Global Administrator** (not yours) must click the consent URL Mizan generates for them. This is a one-time click per entity, done in the entity's own tenant.

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

#### 6a. After sign-in, browser lands on `https://0.0.0.0:8787/` and times out

You're on a pre-v1.1.2 image behind a reverse proxy that doesn't forward `Host` cleanly — the OIDC callback built the post-sign-in redirect off the container's internal bind address instead of the public FQDN. Fix in two steps:

1. Upgrade to `:1.1.2` or newer — every outbound redirect now resolves through `APP_BASE_URL` → `x-forwarded-host` → `Host`.
2. Set `APP_BASE_URL` explicitly on the Container App so the base URL is deterministic:

```sh
az containerapp update -n <mizan-app-name> -g <your-rg> \
    --image ghcr.io/ohomaidi/mizan:latest \
    --set-env-vars APP_BASE_URL=https://<your-fqdn>
```

#### 7. `AADSTS65001: admin has not consented` on sign-in (or user gets a consent prompt that errors out)

You skipped the admin-consent step after auto-provisioning. Open Entra admin center → **App registrations** → your user-auth app → **API permissions** → **Grant admin consent for \<tenant\>** → confirm every permission shows Status *"Granted for \<tenant\>"* in green. Retry sign-in.

#### 8. `AADSTS50194: Application is not configured as a multi-tenant application` on sign-in

The stored tenantId on the user-auth app is `common` but the app itself is single-tenant (`AzureADMyOrg`). Fixed in v1.0.5 — make sure you're running `ghcr.io/ohomaidi/mizan:latest` or `:1.0.5` and re-run the wizard's Step 4. If you previously ran an older build that saved `tenantId: common`, `az containerapp update --image ghcr.io/ohomaidi/mizan:latest` to pull the fix, then open **Settings → Authentication** and re-enter the correct tenant GUID (Entra portal → Overview → Tenant ID).

#### 9. `AADSTS50076: multi-factor authentication required` when running `az` commands

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
cd Mizan
VERSION=2.0.0 bash web/deploy/mac-build.sh
# Output: web/deploy/dist/posture-dashboard-2.0.0.pkg
#
# Note: the build artefact + install path still use the legacy
# "posture-dashboard" identifier from before the Mizan rebrand. The
# UI is fully Mizan-branded; only the file/path names are legacy.
# Renaming would break the in-place upgrade path for existing installs;
# planned in a future release alongside a migration script.
```

Double-clicking the `.pkg` on the target Mac:

- Drops the app at `/usr/local/posture-dashboard/`
- Installs a LaunchAgent that starts it on login (http://localhost:8787)
- Creates `~/Library/Application Support/posture-dashboard/` for the SQLite DB + uploaded logos
- Writes `~/Desktop/posture-dashboard-CREDENTIALS.txt` with first-run instructions — auto-opens when the installer finishes

---

### Self-hosted Docker (Linux / Windows / anywhere)

Run the reference image anywhere Docker runs. On Windows hosts use Docker Desktop or WSL2 — same image, same upgrade path as Linux:

```sh
docker run -p 8787:8787 -v mizan_data:/data ghcr.io/ohomaidi/mizan:latest
```

---

## Upgrading an existing install

New releases are published to `ghcr.io/ohomaidi/mizan` with both a `:latest` tag and an explicit semver tag (`:1.1.2`, `:1.2.0`, etc.). The in-app **Settings → About → Check for updates** panel polls GitHub Releases and tells you when a new version is available; applying the update is a one-command roll.

### Azure Container Apps

From any shell with `az` installed and `az login` completed:

```sh
curl -fsSL https://raw.githubusercontent.com/ohomaidi/Mizan/main/web/deploy/update-azure.sh \
    | bash -s -- --tag 1.1.2
```

The script auto-discovers the Container App in the current subscription, derives `APP_BASE_URL` from the ingress FQDN, and applies the update idempotently. Zero flags needed in the common case. Pass `--rg <group> --app <name>` to override auto-discovery if you have multiple Mizan installs in one subscription.

Manual equivalent:

```sh
az containerapp update \
  --name <your-mizan-app-name> \
  --resource-group <your-rg> \
  --image ghcr.io/ohomaidi/mizan:1.1.2 \
  --set-env-vars APP_BASE_URL=https://<your-fqdn>
```

A new revision rolls in ~30–60 s. SQLite lives on the new pod's local `EmptyDir` volume (v2.5.17+) and is restored from the `/data/scsc.sqlite` NFS backup at boot, so per-tenant data persists across the swap. The previous pod runs one final SIGTERM-triggered backup before exit, so the swap window itself loses zero data. Uploaded logos + branding stay on `/data` directly throughout.

### macOS on-prem installer

Re-run the builder script from the latest `main`, then re-install the produced `.pkg`. The installer places files over the existing install and preserves `~/Library/Application Support/mizan/` so the SQLite DB and logo survive.

```sh
git pull && bash web/deploy/mac-build.sh
sudo installer -pkg web/deploy/dist/mizan-1.1.2.pkg -target /
```

(Or just download the latest `.pkg` from the GitHub Releases page — the in-app **Settings → About** panel surfaces a one-click download button.)

### Upgrading from v1.0.x to v1.1 — one breaking change

The `enforce` sign-in toggle is gone. Sign-in is always required in v1.1. If you had `enforce=false` on your v1.0.x deployment (the default — most installs), three things happen after the update:

1. Any cached session you had keeps working until it expires.
2. Anonymous requests to dashboard pages (`/entities`, `/settings`, etc.) now redirect to `/login`.
3. Until the first admin in your `users` table signs in successfully, the bootstrap escape hatch keeps the dashboard open — so nobody is locked out during the transition.

If your ACA deployment has `APP_BASE_URL` unset in env (the old default), set it during the upgrade — the update script does this automatically. Without it you may hit the post-signin `0.0.0.0:8787` redirect bug documented in troubleshooting §6a.

---

## First-run setup

Every install drops the operator on a 5-step setup wizard at `/setup`:

| Step | What it captures |
|---|---|
| 1 | Organization name (EN + AR), short form, framework (NESA / NCA / ISR / Generic) |
| 2 | Logo upload — background auto-removed locally via a bundled U-2-Netp ONNX model (no cloud, no Python) |
| 3 | Graph-signals Entra app (multi-tenant, for reading posture) — **"Create for me" auto-provisions the app + secret via Microsoft device-code flow; no Azure portal clicks needed** |
| 4 | User sign-in Entra app (single-tenant, for staff sign-in) — same auto-provision flow |
| 5 | Bootstrap admin — the first account to complete sign-in is promoted to admin automatically |

Steps 2–5 are all skippable — configure them from Settings anytime.

<p align="center">
  <img src="docs/images/setup-wizard.png" alt="First-run setup wizard" width="700" />
</p>

### ⚠ Grant admin consent after auto-provisioning — required before Step 5

The wizard creates both Entra apps for you and stores the credentials, but **Microsoft requires a human admin to approve the permissions in the Entra portal**. There is no Graph API that can do this for you. **Do this before clicking *Sign in and become admin* on Step 5**, otherwise the sign-in round-trip fails with `AADSTS65001: admin has not consented` and drops you out of the wizard.

**Step-by-step, right after Step 4 of the wizard finishes:**

1. **User-auth app** — required for staff sign-in.
   - Entra admin center → **App registrations** → open the app named `<your short form> — User Auth` (e.g. `Mizan — User Auth`)
   - Left menu → **API permissions**
   - Click **Grant admin consent for \<your tenant\>** → confirm
   - Every row (User.Read / openid / profile / email) flips to Status *"Granted for &lt;tenant&gt;"* in green

2. **Graph-signals app** — required **per connected entity**, not in your operator tenant.
   - For each entity you onboard later, Mizan generates an Onboarding Letter PDF with a per-entity admin-consent URL
   - Send it to the entity's Global Admin — one click in their tenant grants consent for the 18 read-only Graph permissions
   - Consent in your operator tenant is only needed if you want to read posture from your *own* tenant as a test

3. **(Optional) Custom roles** — if you want Admin / Analyst / Viewer separation driven by Entra rather than Mizan's internal RBAC:
   - App registrations → User-auth app → **App roles** → define `Posture.Admin`, `Posture.Analyst`, `Posture.Viewer`
   - Enterprise applications → User-auth app → **Users and groups** → assign users to roles

Mizan's bootstrap-admin flow still applies: the first successful Microsoft sign-in becomes admin automatically. The consent step above isn't about who's admin — it's about Microsoft letting the sign-in happen at all.

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
Entra ID sign-in, Admin / Analyst / Viewer roles, invite-by-email. **Sign-in is always required** — the first-run wizard auto-provisions the Entra app and auto-signs-in the operator as admin via device-code flow. Subsequent users sign in via Microsoft SSO. Session is a 7-day sliding window by default (configurable 8h / 24h / 7d / 30d in Settings → Authentication); when it lapses, Microsoft SSO silently re-issues a session — no password prompt unless cookies were cleared.

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
                                      │ Microsoft Graph
                                      │   - daily reads (always)
                                      │   - directive writes (directive mode only,
                                      │     via a second Entra app)
                                      ▼
                        ┌─────────────────────────────────────────┐
                        │  Each connected entity's M365 tenant    │
                        │  (consented the multi-tenant Graph app) │
                        └─────────────────────────────────────────┘
```

- **VNet-integrated ACA env** — the managed environment is attached to the `aca` subnet; the container reaches storage via a private endpoint in the `pe` subnet, so storage never has a public exposure.
- **Live SQLite on local `EmptyDir`, NFS as backup target (v2.5.17+)** — the live database lives on the container's local volume at `/local-data/scsc.sqlite` (microsecond locks, WAL mode, full POSIX semantics — the latency-sensitive happy path). The NFS Azure Files share is mounted at `/data` as a backup target; a 5-minute backup loop + a SIGTERM final-backup hook keep it within 5 minutes of the live DB at all times. New revisions restore from the latest snapshot at boot. Soft restarts lose zero data; hard SIGKILL crashes lose at most the configured backup interval.
- **NFS still hosts logos + branding assets** — write-once data lives on `/data` directly (no perf concern). Single-replica deployment (`maxReplicas: 1, activeRevisionsMode: Single`) means no concurrent-writer issues.
- **Why NFS and not SMB for the backup share** — many Azure tenants enforce `StorageAccount_DisableLocalAuth_Modify` policy that silently disables shared-key auth. SMB needs shared-key; NFS uses network-level auth via the private endpoint, so the deploy works under any governance posture.
- **Daily sync** — one `POST /api/sync` per day pulls all 18 Graph signals from every consented entity with a 5-worker pool.
- **Two deployment modes** — `observation` uses only `.Read` Graph scopes. `directive` provisions a second Entra app with write scopes for the shipped directive surfaces (reactive actions + Conditional Access policy push + rollback). Mode is fixed at install time via `MIZAN_DEPLOYMENT_MODE` and cannot be toggled at runtime — switching modes is a redeploy.

**On the Mac installer**: same Next.js app + SQLite, but `DATA_DIR` points at `~/Library/Application Support/mizan/`. No VNet, no NFS — local filesystem directly.

See [docs/04-architecture-and-risks.md](docs/04-architecture-and-risks.md) for the full breakdown including the multi-tenant Graph auth model, throttling envelope, failure modes, and production hardening checklist.

---

## Documentation

- [docs/12-operating-manual.md](docs/12-operating-manual.md) — **day-to-day operator manual**, split into Part A (observation / read) and Part B (directive / readwrite)
- [docs/10-deployment.md](docs/10-deployment.md) — end-to-end deployment runbook (all three targets)
- [docs/11-branding-and-rbac.md](docs/11-branding-and-rbac.md) — branding config, RBAC model, session management
- [docs/08-phase2-setup.md](docs/08-phase2-setup.md) — Entra app registrations (Graph-Signals + Directive), app roles, lockout recovery
- [docs/01-feature-catalog.md](docs/01-feature-catalog.md) — full feature + Graph endpoint inventory, phase roadmap
- [docs/04-architecture-and-risks.md](docs/04-architecture-and-risks.md) — multi-tenant auth, sync orchestrator, directive engine, throttling, failure modes, risk register
- [docs/09-runtime-configuration.md](docs/09-runtime-configuration.md) — every editable config surface in Settings
- [docs/14-responsive-and-mobile.md](docs/14-responsive-and-mobile.md) — mobile / tablet shell, middleware UA classification, override patterns
- [docs/15-self-upgrade.md](docs/15-self-upgrade.md) — self-upgrade flow + version checking
- [docs/16-executive-mode-roadmap.md](docs/16-executive-mode-roadmap.md) — Executive Mode canonical roadmap (v2.6.0 → v2.7.1 shipped, v2.8.0+ deferred)
- [CHANGELOG.md](CHANGELOG.md) — build log

---

## Disclaimer and Notice of Non-Affiliation

### Important Notice — Personal Work Product

This Security Dashboard and any accompanying materials, documentation, code, visuals, or outputs (collectively, the "Artifact") have been developed independently and as a personal initiative by the author. The Artifact is **not a Microsoft product, service, solution, feature, or offering**, and does **not constitute Microsoft Intellectual Property**.

### No Microsoft Endorsement or Affiliation

The Artifact is **not endorsed, sponsored, reviewed, supported, maintained, or certified by Microsoft**. No representation should be made or inferred that this work reflects Microsoft's official roadmap, recommendations, or positions.

### No Support or Service Commitments

Microsoft provides **no technical support, service level agreements (SLAs), updates, fixes, warranties, or guarantees — express or implied — for the Artifact**. Any use of the Artifact is outside of Microsoft's support channels, and Microsoft bears no responsibility for its operation, usage, or outcomes.

### Best-Effort and Informational Use Only

The Artifact is shared for informational and illustrative purposes only, on a best-effort basis. While reasonable care may have been taken during its creation, no guarantee is provided regarding accuracy, reliability, completeness, performance, fitness for a particular purpose, or ongoing availability.

### No Warranties

To the fullest extent permitted by applicable law, the Artifact is provided **"as is"** and **"as available,"** without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or accuracy.

### Limitation of Liability

Under no circumstances shall the author or Microsoft be liable for any direct, indirect, incidental, consequential, special, exemplary, or punitive damages, including but not limited to loss of data, loss of business, loss of revenue, operational impact, or security incidents, arising from or related to the use of, reliance on, or inability to use the Artifact, even if advised of the possibility of such damages.

### User Responsibility

Recipients and users are solely responsible for:

- Evaluating the Artifact before use,
- Validating any outputs or insights,
- Ensuring compliance with their internal policies, legal, regulatory, security, and privacy requirements, and
- Making independent decisions based on their own judgment.

### No Transfer of Rights

Nothing in this disclaimer grants any license or rights to Microsoft trademarks, logos, branding, or intellectual property. Any use of Microsoft names or references is descriptive only and does not imply endorsement.

### Views Are Personal

Any views, approaches, or designs reflected in the Artifact are solely those of the author and do not necessarily represent the views of Microsoft or any of its affiliates.

---

## License

MIT. See [LICENSE](LICENSE).

Built on [Microsoft Graph](https://learn.microsoft.com/en-us/graph/), [Next.js](https://nextjs.org/), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [ONNX Runtime](https://onnxruntime.ai/), [sharp](https://sharp.pixelplumbing.com/), [@react-pdf](https://react-pdf.org/).
