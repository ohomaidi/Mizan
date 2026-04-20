# Phase 2 Setup — Entra app registrations + environment

The dashboard needs **two** separate Entra app registrations. Freshly packaged installs are walked through both by the first-run wizard at `/setup`; this doc is the runbook for operators doing it by hand (e.g. recovering a broken config, or rotating secrets).

Audience: someone with Entra ID *Application Administrator* (or higher) in the operator's provider tenant, plus shell access to the app host.

| App registration | Purpose | Tenancy | Consented in |
|---|---|---|---|
| **Graph Signals** | Read posture from every entity's M365 tenant | Multi-tenant | Each entity tenant |
| **User Sign-in** | Let operator staff sign in to the dashboard | Single-tenant | Only the operator tenant |

Why two: keeping the secrets separate means the user-auth secret can rotate frequently without touching the long-lived Graph secret that's baked into every entity's consent. It also stops cross-tenant sign-in leaks — an entity admin consented to the Graph app should never be able to sign in to your dashboard.

Outcome when complete: clicking **Generate onboarding letter** in Settings produces a real admin-consent URL, Council staff can sign in at `/login`, and the Users tab in Settings shows everyone who has signed in plus anyone invited by email.

---

## 1. Register the Graph-signals multi-tenant app

One-time setup per deployment. Do it in the **operator's tenant** (the provider), not in any entity tenant.

### Steps (Azure portal)

1. Navigate to **Azure portal → Microsoft Entra ID → App registrations → New registration**.
2. **Name:** `Posture Dashboard — Graph signals` (or your organization's preferred name).
3. **Supported account types:** *Accounts in any organizational directory (Any Microsoft Entra ID tenant — Multitenant)*.
4. **Redirect URI:** Web → `<APP_BASE_URL>/api/auth/consent-callback`
   (use the dashboard's public URL — Settings → Branding surfaces it).
5. Click **Register**.
6. Capture the **Application (client) ID** — paste it into **Settings → App Registration → client ID**.

### Client secret

1. **Certificates & secrets → Client secrets → New client secret**.
2. Description: `posture-graph-signals`; expiry: 24 months (customer policy dependent).
3. Capture the **Value** immediately — paste into **Settings → App Registration → client secret**.

> Certificate-based credentials are preferable for production. Swap when moving off the demo Mac — see §6.

### API permissions

Add these **application permissions** (not delegated) under **API permissions → Add a permission → Microsoft Graph → Application permissions**. All are **read-only**.

| Permission | Purpose |
|---|---|
| `SecurityEvents.Read.All` | Secure Score + per-control profiles |
| `SecurityAlert.Read.All` | alerts_v2 |
| `SecurityIncident.Read.All` | incidents |
| `ThreatHunting.Read.All` | Advanced Hunting (future) |
| `IdentityRiskyUser.Read.All` | Identity Protection risky users |
| `IdentityRiskEvent.Read.All` | Identity Protection risk detections |
| `Policy.Read.All` | Conditional Access policies |
| `RoleManagement.Read.Directory` | PIM role assignments |
| `RoleEligibilitySchedule.Read.Directory` | PIM eligibility |
| `AuditLog.Read.All` | Directory audit + sign-in logs |
| `DeviceManagementManagedDevices.Read.All` | Intune device inventory |
| `DeviceManagementConfiguration.Read.All` | Intune compliance policies |
| `Directory.Read.All` | Tenant metadata + user lookup |

Click **Grant admin consent for [provider tenant]** so the Council's own tenant has these (otherwise your own consent screen will block).

### Verify redirect URI

Re-open the registration → **Authentication** → confirm `https://<your-host>/api/auth/consent-callback` is listed under **Redirect URIs** for Web. Add additional URIs here when the production hostname differs from the demo.

---

## 2. Register the User-sign-in single-tenant app

Skip this section entirely if you want to leave the dashboard open (demos, airgapped labs). The first-run wizard also walks you through it with copyable redirect URIs.

### Steps (Azure portal)

1. Same tenant as above. **New registration**.
2. **Name:** `Posture Dashboard — User Auth`.
3. **Supported account types:** *Accounts in this organizational directory only (Single tenant)*.
4. **Redirect URI:** Web → `<APP_BASE_URL>/api/auth/user-callback`.
5. Register. Capture the client ID.

### Client secret

Same path as the Graph app. Paste the secret into **Settings → Authentication → client secret** in the dashboard.

### (Optional) App roles for Admin / Analyst / Viewer

1. On the new registration → **App roles** → Create three roles: `Posture.Admin`, `Posture.Analyst`, `Posture.Viewer`. Allowed member types: *Users/Groups*. Value = the role name verbatim.
2. In the operator tenant → **Enterprise applications** → find *Posture Dashboard — User Auth* → **Users and groups** → assign users to roles.
3. On sign-in the dashboard reads the `roles` claim from the ID token and maps it to the internal RBAC role. Anyone who signs in without an explicit role gets the **Default role** from Settings (ships as `viewer`).

### Bootstrap first admin

The first successful sign-in with an empty users table is auto-promoted to admin, regardless of whether you defined App roles. From there that admin can invite, promote, disable, or delete other users from **Settings → Authentication → Dashboard users**.

### Turn on enforcement

Leave **Enforce sign-in** off until you've verified at least one successful sign-in. Once the Users tab shows you as admin, flip enforce on and save — the dashboard now redirects every unauthenticated visit to `/login`.

Lock-out recovery: while the users table is empty, the bootstrap escape hatch leaves all admin endpoints open — so you can always clear the config from Settings → Authentication → Clear. Once any user exists the escape closes. If you've somehow locked yourself out with an existing user, delete from the DB directly:

```sh
sqlite3 $DATA_DIR/scsc.sqlite "DELETE FROM users; DELETE FROM app_config WHERE key='auth.user';"
```

---

## 3. Configure the Graph app

**Two paths — pick one.** The recommended path for production and for day-to-day key rotation is the in-dashboard Settings panel; the env-vars path remains as a fallback for fresh installs where the dashboard isn't running yet.

### 2a. Recommended: Settings → App Registration — shipped 2026-04-19

Boot the dashboard (first time can run without credentials — it'll surface a warning but not crash), sign in, open **Settings → App Registration**. Paste:

- **Application (client) ID** from step 1.6
- **Client secret** from step 1.7 (stored write-only; masked after save, replaced by typing a new value)
- **Authority host** defaults to `https://login.microsoftonline.com` — only change for sovereign clouds
- **Consent redirect URI** blank = derive from `APP_BASE_URL`; set explicitly if your public hostname differs

The panel contains a 6-step inline walkthrough (with a one-click Copy for the exact redirect URI you need to register in Entra) so an operator can finish the full Azure portal setup without leaving the dashboard. On Save, `invalidateAllTokens()` clears both the MSAL client and token caches; the next Graph call uses fresh credentials immediately — no restart.

Values persist in the SQLite `app_config` table at `key = 'azure.app'`. See [`lib/config/azure-config.ts`](../web/lib/config/azure-config.ts).

### 2b. Fallback: `.env.local`

If the dashboard can't boot without Azure config yet (very rare — product-unavailable tolerance means it can start even with blank creds):

```bash
cd "Sharjah-Council-Dashboard/web"
cp .env.example .env.local
```

```env
APP_BASE_URL=https://scscdemo.zaatarlabs.com
AZURE_CLIENT_ID=<from step 1.6>
AZURE_CLIENT_SECRET=<from step 1.7>
```

Env values are a **fallback only** — once DB values are set in the Settings panel, they take precedence. The Settings UI shows a "from DB" / "from env" badge per field so operators can see the source.

### Other optional env vars

```env
# Persistent DB location. Default: ./data/scsc.sqlite
DATA_DIR=/var/lib/scsc

# Require a bearer token on /api/sync so only the Council's scheduler can trigger syncs
SCSC_SYNC_SECRET=<random 32-byte hex>

# Parallel tenant workers for the daily sync. Default 5, clamped 1–20.
SCSC_SYNC_CONCURRENCY=5

# Signal snapshot retention. Default 90 days.
SCSC_RETENTION_DAYS=90

# Seed 12 demo Sharjah entities on first boot (development / demo only).
SCSC_SEED_DEMO=false
```

---

## 3. Rebuild + restart

On the demo Mac:

```bash
cd "Sharjah-Council-Dashboard/web"
npm run build
launchctl unload ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist
launchctl load   ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist
```

Verify:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://scscdemo.zaatarlabs.com/maturity
curl -sS https://scscdemo.zaatarlabs.com/api/signals/kpi | head -c 200
```

In production, run `npm run build && npm run start` behind a process manager (Docker, systemd, Azure App Service, etc.). See `docs/09-deployment.md` (upcoming).

---

## 4. Onboard an entity — the two-stage flow

Onboarding is **two stages**: discovery (Council sends a generic letter asking for five details) and enrollment (Council generates a tenant-specific consent letter once the details come back).

### Stage 1 — Send the Discovery Letter

The Council does not yet have a tenant record for this entity — it doesn't have the Tenant ID, the primary domain, or the CISO contact. The **Discovery Letter** is the bilingual PDF that tells the entity exactly what to send back and where in Microsoft 365 to find each item.

1. Go to `/settings` → **Entities** tab.
2. At the top of the page you'll see a gold-accented banner: *"Start here — send the Discovery Letter first"*. Click **Download Discovery Letter** (or **Preview** to open in a new tab).
3. The PDF (one file, bilingual, 3 pages) walks the entity through collecting:
   - **Microsoft Entra Tenant ID** (where to find it: Azure portal → Entra ID → Overview)
   - **Primary verified domain** (Entra admin center → Settings → Domain names)
   - **Microsoft 365 E5 licensing confirmation** (admin.microsoft.com → Billing → Your products)
   - **Global Administrator** who will click the consent link
   - **Designated CISO contact**
4. Email the PDF to every entity's CISO. They reply with the five items.

The Discovery Letter is **editable**. Go to **Settings → Discovery PDF** to change any of the step instructions, the contact block, the "what happens next" narrative, the footer, etc. Both EN and AR are edited together.

### Stage 2 — Register the entity and send the Onboarding Letter

Once the entity has replied with the five items:

1. Go to `/settings` → **Entities** tab.
2. Click into the **Onboard a new entity** form below the banner.
3. Fill in **Name (English)**, **Name (Arabic)**, **Cluster**, **Primary domain**, **Tenant ID** (the Entra GUID the entity sent you), and CISO contact.
4. Click **Generate onboarding letter**.
5. A consent URL appears + a **Download PDF** button (the tenant-specific Onboarding Letter — bilingual, with the unique consent URL embedded).
6. Email that PDF to the entity's Global Administrator. They click the consent URL, sign in with a Global Admin account of their tenant, review the read-only permissions, and click **Accept**.
7. Entra redirects to `/api/auth/consent-callback?state=<opaque>&tenant=<guid>`. The app:
   - Looks up the `state` in SQLite, finds the matching tenant row.
   - Flips `consent_status = consented`.
   - Kicks off an initial sync (Secure Score + CA + risky users + devices + incidents, plus the 13 Phase-3 signals).
8. Browser lands on **`/consent-success`** — standalone thank-you page **outside** the `(dashboard)` route group. The entity admin never sees Council-wide posture data. (Shipped 2026-04-20 after a leak incident where the callback redirected to `/settings?consent=ok` and the entity admin could browse every other entity's posture.)
9. Council operator watching the Onboarding Wizard on their own browser sees Step 4 flip to "Consent received" via the 5-second live-poll, then Step 5 "Run first sync" uses the lightweight `/api/tenants/{id}/verify` endpoint (single Secure Score call, ~2 s) to prove the pipeline — the full 18-signal sync runs in the background from the callback.

> Earlier template revisions instructed the entity admin to run four PowerShell role-assignment commands after consent. That step was prep for a deferred write-side automation tier and has been removed from the letter — the read-only platform only needs the Graph admin-consent step.

### Troubleshoot (common AADSTS errors)

Observed in real onboarding flows (including the `mixox` pilot on 2026-04-20):

- **`AADSTS50097` — Device authentication is required.** The entity tenant has a Conditional Access policy requiring a compliant/hybrid-joined device for admin sign-in. The Global Admin tried to consent from an unmanaged browser. Remedy: entity admin signs in from a managed device (often Edge on a Windows machine signed into the tenant satisfies this via the PRT), OR a CA admin in the entity tenant temporarily excludes the admin from the policy for the consent session. **Not a Council-side issue.**
- **`AADSTS50011` — Redirect URI mismatch.** The URI sent by `/api/auth/consent-callback?state=...` doesn't match any URI registered in the Entra app. Remedy: Entra portal → the Council app registration → **Authentication** → Platform configurations → Web → Redirect URIs → add the exact URL, **character for character** (lowercase, no trailing slash, hyphens between `consent` and `callback`). Save at the top of the blade.
- **`AADSTS65001` — Admin/user has not consented.** Entity admin hasn't clicked Accept yet, or accepted for the wrong app. Have them re-open the consent URL as a Global Administrator.
- **`AADSTS700016` — Application not found in the directory.** Council app's service principal was uninstalled from the entity tenant. Regenerate the consent URL from the wizard and re-consent.
- **Consent URL has no `client_id`** (dashboard shows "Azure app registration not configured"): Client ID is blank. Set it in **Settings → App Registration**.
- **Callback 404s**: redirect URI in the Entra app doesn't exactly match `APP_BASE_URL + /api/auth/consent-callback`. Fix on the Entra side OR set **Consent redirect URI** in the Settings panel explicitly.
- **"Load failed" on wizard Step 5 (Run first sync)**: the browser timeout hit before the full 18-signal sync returned. The wizard now uses `/api/tenants/{id}/verify` (single-signal, ~2 s) — if you see this on an older build, refresh. The entity record is already persisted regardless of Step 5's outcome.

---

## 5. Sync + refresh

- **Lightweight verify (wizard Step 5 + on-demand):** `POST /api/tenants/{id}/verify` — single Secure Score call, ~2 s. Used by the Onboarding Wizard to confirm the pipeline is live without waiting 30–60 s for the full signal set.
- **Manual sync per entity:** Settings → row → circular-arrow button, or Entity Detail → **Sync now**. Calls `POST /api/tenants/{id}/sync`, runs all 18 signals serially.
- **Full sync (all consented entities):** `curl -X POST https://<host>/api/sync` (add `Authorization: Bearer $SCSC_SYNC_SECRET` if set). Fans out across the worker pool (default 5 parallel, `SCSC_SYNC_CONCURRENCY` tunable 1–20).
- **Scheduled:** add a cron entry (Linux) or Azure Automation schedule hitting `/api/sync` daily at 3 am UAE. For the demo Mac, there's a separate `launchd` agent already loaded (`com.zaatarlabs.scscdemo.sync`):

```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key><integer>3</integer>
  <key>Minute</key><integer>0</integer>
</dict>
```

### Demo helpers

- **`npm run purge-demo`** — deletes every `is_demo=1` tenant and their snapshots. Real consented tenants untouched.
- **`npm run reseed-demo`** — purges demos then prompts the operator to reload the server so `seedDemoTenantsIfEmpty` fires again with the latest generators. Used when the demo catalog or historical-snapshot seed changes.
- **`npm run migrate`** — applies any pending schema migrations (`schema.sql` + delta migrations in `lib/db/client.ts`). Called automatically on server boot; exposed for CI/dev sanity.

---

## 6. Going to production

When leaving the demo Mac:

1. **Move off client secret → certificate.** Create a self-signed cert, upload `.cer` to the Entra app (Certificates & secrets → Certificates), ship the `.pfx` privately to the app host. Update MSAL config to use `clientCertificate` instead of `clientSecret`. (Covered in `docs/09-deployment.md` — upcoming.)
2. **Host in the Council's tenant** (Azure App Service or Container Apps) so data residency stays UAE-North. Mount a persistent disk / Azure Storage for `DATA_DIR`.
3. **Put Cloudflare Access (or Entra-based authN) in front** of the dashboard. The app itself does not authenticate Council users yet — that's the next phase.
4. **Swap SQLite → Azure SQL / PostgreSQL** when scaling past ~20 entities. The DB layer is small and isolated to `lib/db/` — adapter swap is bounded.
5. **Enable streaming** for high-volume signals (alerts, audit logs) via Sentinel's Defender XDR connector rather than Graph polling.

---

## 7. Demo data — seed + purge

The dashboard ships with an optional demo seed of 12 representative Sharjah entities with pre-baked signal snapshots. This lets stakeholders see a populated dashboard before any real tenant is onboarded. Demo tenants are **never synced** against real Graph (their GUIDs are fake) and are flagged with a visible `DEMO` badge.

### Defaults
- **Customer production installs:** seed is **off** by default. Empty DB stays empty until you onboard real tenants.
- **Dev / demo machines:** set `SCSC_SEED_DEMO=true` in `.env.local` to seed on first run (the ZaatarLabs demo Mac already has this).

### Remove demo data

One idempotent command, safe next to real tenants:

```bash
npm run purge-demo
```

Deletes every `is_demo = 1` tenant plus its cascade (signal snapshots, endpoint-health rows). Real onboarded tenants are untouched. The DEMO badge is data-driven — nothing to toggle in code; after purge, no badge appears anywhere.

If the DB doesn't exist yet, `purge-demo` is a no-op. Safe to run before, after, or instead of the first sync.

---

## 8. Capacity & scale — sizing for 200 entities

Designed-for envelope: **200 government entities × ~400 users × ~400 devices each**.

| Dimension | Estimate |
|---|---|
| DB size (90-day retention, aggregate payloads) | ~3–5 GB |
| RAM | <500 MB |
| Graph API calls/hour (full-fleet hourly sync) | ~1,500 (well inside per-tenant + app limits) |
| Full-fleet sync cycle | ~25 s with 8-worker concurrency; ~3 min serial |
| Ingress bandwidth | ~2–3 GB/day |
| Egress | Negligible |

### Why user/device populations don't blow up storage
Every signal payload is **aggregates + bounded samples**, not raw per-record data:
- Devices snapshot: counts by OS, total, compliance %, not the full device list.
- Risky-users snapshot: counts by level + atRisk ratio + top-25 sample.
- CA policies: enabled / MFA / legacy-blocked aggregate + first 50 policies.
- Incidents: top 25 by recency.

An entity with 50 devices and one with 5,000 devices produce snapshots of the same size.

### What does scale with population
Graph API call complexity per tenant:
- `/deviceManagement/managedDevices` paginates at 200 per page; 400 devices = 2 pages (~400 ms).
- `/identityProtection/riskyUsers` has a 1 req/sec-per-tenant-per-all-apps cap — we stay at ≤ 1 call per 15-min sync.
- No Graph endpoint scales super-linearly with user count at the rates we poll.

### Recommended customer infrastructure (200 entities)
- **Compute**: 2 vCPU / 4 GB RAM — Azure App Service S1, Container Apps 0.5 CPU / 1 GB, or equivalent.
- **Storage**: **20 GB persistent volume** mounted at `DATA_DIR`. Room for 90-day retention + Phase 3 Purview signals + growth headroom.
- **Network**: any standard tier — outbound < 100 MB/day.
- **Scheduler**: Azure Timer Function or cron hitting `POST /api/sync` every 15 min (guard with `SCSC_SYNC_SECRET`).

### When to outgrow SQLite
- >1,000 entities, OR
- Multi-instance HA deployment (SQLite is single-writer).
- Migration path is bounded to `lib/db/*` (tenant + signal repo) — swap the driver, everything above stays the same.

### Open scale items before go-live (Phase 3)
- Bounded concurrent worker pool in the sync orchestrator (8–10 in-flight tenants).
- Live drill-through from Entity Detail into per-user / per-device records via Graph, keeping hot storage aggregate-only.
- Schema change: snapshot pruning job (delete snapshots older than N days) — trivial DELETE on a timestamp index.

---

## 9. Built-in FAQ

The dashboard ships with a live FAQ at `/faq` (also linked from the sidebar) explaining how the Maturity Index is computed, what signals feed it, why the target is 75, and what the current limitations are. Translated EN / AR and kept in sync with the formula in `lib/compute/maturity.ts`.

The "How is this calculated?" link under the page title on `/maturity` deep-links into the relevant FAQ section.

---

## 10. What Phase 2 does NOT yet cover

- **MSAL user auth for Council staff.** Currently trusting Cloudflare Access. Add when named audit is required.
- **Purview domain signals** (DLP alerts, Insider Risk alerts, retention labels) — see Phase 3 placeholders on `/data`, `/governance`.
- **Advanced Hunting KQL packs** — stubbed in `/threats`.
- ~~PowerShell automation tier for policy CRUD~~ — **[deferred]**, see `docs/04-architecture-and-risks.md §4`. Out of scope for this read-only engagement.
- **Historical trend deltas** — we store snapshots, but `Δ 7d` requires a bit more aggregation. Next sprint.
