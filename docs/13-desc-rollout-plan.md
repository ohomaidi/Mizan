# DESC Rollout Plan

**Customer 2 after Sharjah Cybersecurity Center (SCSC):** Dubai Electronic Security Center (DESC), the Dubai Government cybersecurity regulator. DESC presentation is scheduled for next week.

**Two distinct outcomes tracked in this document:**

1. **Early demo environment** on `desc.zaatarlabs.com`, running on the Mac Mini alongside the existing `scscdemo.zaatarlabs.com` demo, ready in time for next week's DESC presentation.
2. **Directive-mode product build** — the code that enables DESC (and future regulators) to push Center-approved baseline policies to consented entities. Shipped incrementally; the demo environment picks it up as each phase lands.

Both demos (SCSC + DESC) are kept up to date throughout the Directive work. SCSC stays in observation mode; DESC gets the full directive experience as it is built.

---

## 1. Deployment-mode enforcement — the foundational rule

Mode is decided once, at container / LaunchAgent install time, via an environment variable:

```
MIZAN_DEPLOYMENT_MODE=observation   # SCSC-style — read only, no directive UI
MIZAN_DEPLOYMENT_MODE=directive     # DESC-style — observation + write surfaces
```

No UI toggle. No DB entry. Changing mode means changing env + restarting the process, which is a deliberate infrastructure action, not a click. This matches the existing `MIZAN_DEMO_MODE` pattern.

At boot time, `directive` mode enables:

- Second (and third, if MDE writes are in scope) Entra app provisioning path
- `/directive` top-level page
- Per-entity `consent_mode` chooser in the onboarding wizard
- Directive-mode Onboarding Letter PDF variant
- Directive engine routes (`/api/directive/*`)

In `observation` mode every code path above is absent at the route-loader level. The `observation` build is indistinguishable from today's SCSC build.

Per-entity consent mode is mutable inside `directive` deployments:

- Upgrade (observation → directive): Mizan generates a new consent URL pointing at the Directive app. Entity's Global Admin consents. Logged.
- Downgrade (directive → observation): Entity's Global Admin revokes the Directive app consent in their own Entra admin center. Mizan detects on next sync. Logged.

---

## 2. Demo environment architecture on Mac Mini

### Two parallel Next.js instances, one codebase, one build

| Thing | SCSC instance | DESC instance |
|---|---|---|
| Public URL | `scscdemo.zaatarlabs.com` | `desc.zaatarlabs.com` |
| Local port | `127.0.0.1:8787` | `127.0.0.1:8788` |
| LaunchAgent | `com.zaatarlabs.scscdemo.plist` (existing) | `com.zaatarlabs.descdemo.plist` (new) |
| Sync agent | `com.zaatarlabs.scscdemo.sync.plist` | `com.zaatarlabs.descdemo.sync.plist` |
| DATA_DIR | `.../web/data/scsc/` | `.../web/data/desc/` |
| SQLite DB | `.../data/scsc/scsc.sqlite` | `.../data/desc/desc.sqlite` |
| Branding | Sharjah (name, emblem, teal palette) | DESC (name, logo, Dubai palette) |
| Framework | NESA | ISR (Information Security Regulation) |
| MIZAN_DEPLOYMENT_MODE | `observation` | `directive` |
| MIZAN_DEMO_MODE | `true` | `true` |
| Git checkout | `/Users/zaatarlabs/Projects/Sharjah-Council-Dashboard/` (shared) | same |
| `.next/` build | shared | shared |
| node_modules | shared | shared |
| Cloudflare tunnel | hostname `scscdemo.zaatarlabs.com` → `127.0.0.1:8787` | hostname `desc.zaatarlabs.com` → `127.0.0.1:8788` |
| Cloudflare Access | in place | required per standing rule |

The shared build means a single `npm ci && next build` rebuilds both demos. Only the env vars + data dirs diverge.

### DATA_DIR split

Current code: `lib/db/client.ts` already honours `DATA_DIR` env var, falling back to `web/data/`. Each LaunchAgent sets its own DATA_DIR; DBs and logo uploads live in separate trees. No code change needed.

Minor migration: the existing scscdemo DB currently sits at `web/data/scsc.sqlite`. We move it to `web/data/scsc/scsc.sqlite` and set `DATA_DIR=.../web/data/scsc/` on the SCSC LaunchAgent. One-shot mv + plist edit.

### Cloudflare tunnel changes

Cloudflared currently routes `scscdemo.zaatarlabs.com → 127.0.0.1:8787`. Config lives in `~/.cloudflared/config.yml` and its ingress block.

Three changes:

1. **DNS.** Add a `CNAME desc.zaatarlabs.com → <tunnel-uuid>.cfargotunnel.com` record in the Cloudflare zone.
2. **Ingress rule.** Add entry before the catch-all:
   ```yaml
   - hostname: desc.zaatarlabs.com
     service: http://127.0.0.1:8788
   ```
3. **Zero Trust Access.** Per the standing rule (memory: "Gate Cloudflare Tunnel Services with Access"), the new hostname must sit behind a Cloudflare Access policy before it serves traffic. Rule applied through the Zero Trust dashboard, same pattern as scscdemo.

Reload cloudflared via `launchctl kickstart -k gui/$UID/com.cloudflare.cloudflared` after config edit.

### LaunchAgent templates

```xml
<!-- com.zaatarlabs.descdemo.plist — mirror of scscdemo with port 8788 and desc env -->
<key>Label</key>
<string>com.zaatarlabs.descdemo</string>
<key>WorkingDirectory</key>
<string>/Users/zaatarlabs/Projects/Sharjah-Council-Dashboard/web</string>
<key>ProgramArguments</key>
<array>
  <string>/opt/homebrew/bin/node</string>
  <string>/Users/zaatarlabs/Projects/Sharjah-Council-Dashboard/web/node_modules/next/dist/bin/next</string>
  <string>start</string>
  <string>-H</string>
  <string>127.0.0.1</string>
  <string>-p</string>
  <string>8788</string>
</array>
<key>EnvironmentVariables</key>
<dict>
  <key>NODE_ENV</key><string>production</string>
  <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  <key>MIZAN_DEMO_MODE</key><string>true</string>
  <key>MIZAN_DEPLOYMENT_MODE</key><string>directive</string>
  <key>DATA_DIR</key>
  <string>/Users/zaatarlabs/Projects/Sharjah-Council-Dashboard/web/data/desc</string>
</dict>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key>
<string>/Users/zaatarlabs/Library/Logs/descdemo.out.log</string>
<key>StandardErrorPath</key>
<string>/Users/zaatarlabs/Library/Logs/descdemo.err.log</string>
```

SCSC plist gets one addition: `MIZAN_DEPLOYMENT_MODE=observation` and `DATA_DIR=.../web/data/scsc`.

### Keeping both demos up to date as development continues

A single script handles "pull + build + restart both" — `deploy/restart-demos.sh`:

```sh
#!/usr/bin/env bash
set -euo pipefail
cd /Users/zaatarlabs/Projects/Sharjah-Council-Dashboard
git pull --ff-only
cd web
npm ci
# Atomic rebuild (remembering the iCloud EDEADLK history is gone now since checkout moved)
launchctl unload ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/com.zaatarlabs.descdemo.plist 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
sleep 3
rm -rf .next
npx next build
launchctl load ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist
launchctl load ~/Library/LaunchAgents/com.zaatarlabs.descdemo.plist
sleep 10
curl -fsS "http://127.0.0.1:8787/api/auth/me" >/dev/null && echo "SCSC ✓"
curl -fsS "http://127.0.0.1:8788/api/auth/me" >/dev/null && echo "DESC ✓"
```

Run this after every `v1.1.x` release and both demos pick up the new code automatically.

Data changes (re-seed, migration) are per-instance because DATA_DIR differs. The scripts in `web/scripts/` already read `DATA_DIR`, so `DATA_DIR=.../web/data/desc node scripts/seed-demo-*.mjs` targets the right DB.

---

## 3. DESC branding and demo seed

### Branding (placeholders — confirm with user before seeding)

| Field | Proposed value | Source needed |
|---|---|---|
| `shortEn` | `DESC` | ✓ |
| `shortAr` | `مركز دبي` | confirm |
| `nameEn` | `Dubai Electronic Security Center` | confirm |
| `nameAr` | `مركز دبي للأمن الإلكتروني` | confirm |
| `tagline` | `Dubai Government cybersecurity regulation` | confirm |
| `logoPath` | `assets/demo/desc-logo.png` | **needed from user** |
| `primaryColor` | to pick (Dubai government visual identity commonly uses the Dubai Police gold or Emirates red-white) | confirm |
| `frameworkId` | `isr` | ✓ |
| `maturityTarget` | `80` (vs. Sharjah's 75 — regulator wants higher bar) | confirm |

### Demo entities (proposed, subject to user approval)

Dubai Government entities DESC would plausibly oversee, mapped into the existing cluster taxonomy:

| Entity (EN) | Entity (AR) | Cluster |
|---|---|---|
| Dubai Police | شرطة دبي | police |
| General Directorate of Civil Defence (Dubai) | الإدارة العامة للدفاع المدني بدبي | police |
| Dubai Health Authority | هيئة الصحة بدبي | health |
| Mohammed Bin Rashid University of Medicine | جامعة محمد بن راشد للطب والعلوم الصحية | health |
| Knowledge and Human Development Authority (KHDA) | هيئة المعرفة والتنمية البشرية | education |
| Dubai Municipality | بلدية دبي | municipality |
| Dubai Land Department | دائرة الأراضي والأملاك | municipality |
| Dubai Electricity and Water Authority (DEWA) | هيئة كهرباء ومياه دبي | utilities |
| Roads and Transport Authority (RTA) | هيئة الطرق والمواصلات | transport |
| Dubai Airports | مطارات دبي | transport |
| Dubai Customs | جمارك دبي | other |
| Dubai Courts | محاكم دبي | other |
| Dubai Statistics Center | مركز دبي للإحصاء | other |
| Dubai Future Foundation | مؤسسة دبي للمستقبل | other |

14 entities, same size as Sharjah's seed, realistic mix of clusters. All read from a new seed module `lib/db/seed-desc.ts` that produces the same signal-snapshot shape as `lib/db/seed.ts` but with Dubai-specific names and cluster distribution.

Mixed posture for drama: 3 entities well above target (DEWA, RTA, Dubai Police), 8 hovering near target, 3 below (smaller entities that regulator would focus on). Cross-tenant CVE correlation will show realistic shared vulnerabilities across the fleet.

### Seeding approach

Option A: extend existing `seed.ts` with a `customer` flag (`sharjah` | `desc`). One codebase, one schema. Each LaunchAgent sets `SCSC_SEED_CUSTOMER=desc` when reseeding its own DATA_DIR.

Option B: separate `seed-desc.ts` module, called explicitly.

Prefer A — less duplication, easier to evolve the signal-generation logic once. DESC seed is a parameterisation, not a fork.

---

## 4. Directive build plan — phases delivered to both demo environments

(Observation-mode SCSC demo is unaffected by every Directive phase. Directive-mode DESC demo picks up each phase as it ships.)

### Phase 1 — Foundation ✅ shipped

- `MIZAN_DEPLOYMENT_MODE` env check at module load; conditionally-mounted routes.
- Schema migration: `tenants.consent_mode`, `tenants.directive_app_consented_at`, `tenants.directive_app_consent_error`. Audit table `consent_history`.
- Config key `azure.directive` for the Directive Graph app.
- Setup wizard extension: directive step provisions the Directive Graph app via device-code flow when deployment is `directive`.
- Entity onboarding wizard: consent-mode chooser step on directive deployments.
- Dual Onboarding Letter PDF templates (`pdf.onboarding.observation` + `pdf.onboarding.directive`).
- `/directive` top-level page shell visible in DESC demo, absent in SCSC.
- Per-entity consent-mode badge on tenant list + entity detail header.

### Phase 2 — Low-risk reactive writes ✅ shipped

- Incident operations (classify, assign, comment) — `PATCH /security/incidents/{id}`
- Alert operations (same) — `PATCH /security/alerts_v2/{id}`
- Risky user dispositions (confirm compromised / dismiss) — `/identityProtection/riskyUsers/*`
- Force sign-out — `POST /users/{id}/revokeSignInSessions`
- Threat submissions (email / URL / file) — `POST /security/threatSubmission/*`
- Audit log for every write in `directive_actions`
- Single-person approval today; two-person rule deferred (see §6 "deferred items")
- Evidence surface: `/api/directive/tenant-incident-evidence` (synthesised for demo tenants, real Graph for live tenants) — DESC uses this to review incidents without opening the Defender portal

### Phase 3 — Conditional Access baselines ✅ shipped

12 curated baselines covering identity hardening, legacy-surface reduction, risk-based enforcement, session hygiene, and device posture. Every baseline is validated against the Graph CA schema; full list + rationale in `/directive → Baselines` (Details expand).

Safety rails:

- Every baseline ships in `enabledForReportingButNotEnforced`. The operator must explicitly override to `enabled`.
- Card UI leads with a yellow "Ships report-only" chip.
- Baselines touching admin roles auto-exclude the Global Administrator role template.
- Idempotency via `mizan:<baseline-id>:v1` tag in the policy displayName — repeat pushes are no-ops.
- Per-entity status view (`/directive → Baseline status per entity`) reads the tenant's CA policies live, maps each of the 12 baselines to present / absent / current-state, and flags drift (entity flipped to Enabled, or still in report-only).
- Rollback: pre-flight preview modal, per-tenant scoping (tick which rows to roll back), "Remove from ALL entities" baseline-wide action, warning when the entity has flipped a policy to Enabled.
- Two-person approval deferred (see §6).

### Phase 4 — Custom CA policy wizard (MVP) ✅ shipped

7-step wizard at `/directive/custom-policies/[id]/edit`:

1. Identify (name, description, initial state)
2. Users (All / roles / guests + mandatory Global Admin exclusion)
3. Apps (All / Office 365 / Admin portals / Azure Mgmt / specific)
4. Conditions (risk, platforms, client-app types, locations)
5. Access (Block or Grant + built-in controls + authentication strength dropdown)
6. Session (sign-in frequency, persistent browser, app-enforced restrictions)
7. Review (risk tier, grant summary, exact Graph body, push)

Always-visible right-hand Review panel. 600ms-debounced autosave. "Clone as custom draft" shortcut on every baseline card pre-populates the wizard via a `body-to-spec` reverse mapper.

### Phase 4.5 — Close the CA chapter ✅ shipped

Tenant-scoped wizard mode unlocks specific users, specific groups, named locations, Terms of Use, and custom authentication strengths from a chosen reference tenant. Device filter rule builder (4 attributes × 3 operators, AND-joined). Push route enforces scope (`scope_mismatch` 409 on off-tenant target).

Clone-a-draft shortcut + baseline-wide rollback + per-tenant rollback within a push batch + pre-flight preview all shipped in this phase.

### Phase 5 — Intune writes (next)

**Not yet shipped.** Three baselines to validate the plumbing:

- Device compliance: min OS + passcode + encryption + jailbreak detection per platform
- App protection (MAM): copy/paste restrictions, Save-As block, require PIN, wipe on jailbreak
- Device configuration profile: Wi-Fi / VPN / disk encryption forcing (minor)

Architecture is copy-paste from Phase 3 — `executeDirective` + idempotency-tag pattern + rollback + status view all reused. The only new work is the Graph endpoints (`/deviceManagement/deviceCompliancePolicies`, `/deviceAppManagement/iosManagedAppProtections`, etc.) and the Intune baseline catalog.

### Phase 6+ — DLP, labels, retention, Defender for Office, Exchange, SP/Teams, PIM, app consent, attack sim, tenant identity defaults

Full ordered list in `project_sharjah_council_backlog.md` (Claude memory). Each phase is comparable in scope to Phase 3 or Phase 4.

### Former Phase 5 — MDE direct API writes

~~Requires the third Entra app (Defender for Endpoint API scopes — `Ti.ReadWrite`, `Machine.Isolate`).~~ Retained as a future direction but not on the current roadmap. Intune covers device response in most of the regulator's target scenarios.

### Phase ∞ — Two-person approval workflow

Deferred by user 2026-04-24. Design sketch preserved in session notes; reopens when a multi-admin regulator deployment needs segregation of duties.

---

## 5. Timeline — status as of 2026-04-24

Phases 1 through 4.5 are all shipped. Demo at `desc.zaatarlabs.com` is live with:

- DESC-branded directive dashboard
- `/directive` page fully wired: reactive actions on incidents/alerts/users, 12 CA baselines, custom CA wizard, tenant-scoped wizard mode, rollback (per-tenant + baseline-wide), per-entity baseline status view, audit log
- Onboarding flow with consent-mode chooser, directive-variant Onboarding Letter PDF

### What the DESC presentation can now show

- **Live directive push** to Dubai Police (the demo directive-mode tenant) via any of the 12 baselines — simulated, but shows the full UI + audit + rollback flow.
- **Wizard authoring** with both cross-tenant and tenant-scoped modes. The tenant-scoped mode surfaces the typeahead pickers against Dubai Police's synthesized users/groups/locations/ToU/custom auth strengths, which is a strong "regulator-authors-bespoke-policies" demo.
- **Rollback safety** — pre-flight preview modal showing current state per tenant, per-row deselect, baseline-wide "remove from all" action.

### Before going to a real tenant

Every feature above is either simulated (demo tenants) or passes its typecheck + build but hasn't hit a real Graph write endpoint yet. Real-tenant validation is the remaining step before DESC uses this in production; see `project_sharjah_council_backlog.md §A — user-blocked items`.

---

## 6. Release and deployment cadence going forward

**Rule (feedback_mizan_release_cadence.md):** commits to `main` during dev are fine; **tag + GHCR build + Azure redeploy happen only when the user signs off a full feature cluster and explicitly says "publish"**. Mac Mini demos are the test surface.

- Mac Mini: `bash web/deploy/restart-demos.sh --no-pull` after any commit to pick up the change in both demos.
- Release: when the user approves, tag `v1.x.y`, GHCR builds multi-arch image, Azure redeploy via `bash web/deploy/update-azure.sh --tag x.y.z`.
- SCSC customers stay on observation behaviour; DESC (when they deploy) runs directive.

### Deferred items

- **Two-person approval workflow.** User deferred 2026-04-24. No env var controls it today. When it lands: push creates a pending request; a separate admin approves; fan-out only runs at approval time. Demo-safe self-approve lets single-operator demos still walk the flow.
- **Per-tenant scope resolution across multiple target tenants.** Custom wizard's tenant-scoped mode today binds to one reference tenant. Cross-tenant push with ID-mapping would require name-matching heuristics + push-time validation — worth building only when a regulator wants one logical policy applied to N tenants with per-tenant user IDs.

---

## 7. Open items needing user input

Original pre-presentation items (DNS, logos, colours, entity list) are resolved. Remaining items apply once DESC moves from demo to real tenants.

1. **Real Entra app registration in DESC's tenant** — Directive app + Graph-Signals app. Manual device-code flow through the setup wizard.
2. **Real entity consent onboarding** — each Dubai entity's Global Admin must consent to both apps (for directive) or just Graph-Signals (for observation).
3. **Cloudflare Zero Trust Access** on any URL that will hold real data.
4. **Approval workflow decision** — if DESC eventually wants two-person rule, that reopens the deferred item.

---

## 8. Non-goals for this rollout

- Multi-customer-per-deployment (a single Mizan instance serving both SCSC and DESC users). Not pursued — each customer gets their own deployment, own Azure subscription, own Entra apps, own data. Simpler, more compliant, matches existing productization direction.
- Auto-upgrading the deployment mode from observation to directive. Requires a redeploy with the new env var; not changeable from inside Mizan.
- Directive-mode dashboard for SCSC. SCSC is and will remain observation-mode. If SCSC ever wants directive, they redeploy separately.
