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

### Phase 1 — Foundation (week 1)

Goal: stand up the plumbing, ship what is safe to ship before the DESC presentation.

- `MIZAN_DEPLOYMENT_MODE` env check at module load; conditionally-mounted routes.
- Schema migration: `tenants.consent_mode`, `tenants.directive_app_consented_at`, `tenants.directive_app_consent_error`. Audit table `consent_history`.
- New config key `azure.directive` for the Directive Graph app (writes app registration).
- Setup wizard extension: conditional step that provisions the Directive Graph app via device-code flow when the deployment is `directive`.
- Entity onboarding wizard: conditional mode-chooser step when the deployment is `directive`.
- Dual Onboarding Letter PDF templates: `pdf.onboarding.observation` and `pdf.onboarding.directive`.
- UI: `/directive` top-level page shell (empty dashboard, roadmap-style cards listing upcoming phases). Visible in DESC demo, absent in SCSC demo by env gate.
- Per-entity consent-mode badge on the tenant list + entity detail header.

**No writes actually happen in Phase 1.** The app exists, the consent flow exists, but the Directive engine is not built yet. This is deliberate — it lets the compliance story land cleanly before any `.ReadWrite` scope fires.

### Phase 2 — Low-risk writes (week 2-3, post-presentation)

- Incident operations (classify, assign, comment)
- Alert operations (same)
- Risky user dispositions (confirm compromised, dismiss)
- Force sign-out (`POST /users/{id}/revokeSignInSessions`)
- Threat submissions (email, URL, file to Microsoft)
- Audit log for every write
- Approval UX (single-person for these low-risk actions)

### Phase 3 — Conditional Access baselines (3-4 weeks)

The big one. Separate doc once scoped. Report-only default, two-person approval, preview, rollback, entity-admin exclusion.

### Phase 4 — Intune compliance baselines (2-3 weeks)

### Phase 5 — MDE writes (IOC push, device isolation) — 3+ weeks

Requires the third Entra app (Defender for Endpoint API scopes — `Ti.ReadWrite`, `Machine.Isolate`). Per-entity consent model may need extending to "observation / directive-graph / directive-full" tiering at this point.

### Phase 6 — Sentinel analytics rule baselines (optional — depends on DESC Sentinel footprint)

---

## 5. Timeline to DESC presentation

Assuming presentation is roughly 7 days out:

| Day | Work |
|---|---|
| 1 | Plan approved. DESC branding + seed parameters confirmed with user. DNS for `desc.zaatarlabs.com` provisioned in Cloudflare. |
| 2 | DESC demo live locally. DB seeded, LaunchAgent running, cloudflared routing, Zero Trust Access in place. DESC-branded UI verified end to end. |
| 3 | SCSC DATA_DIR migration (`web/data/` → `web/data/scsc/`), plist edit, re-verify SCSC demo still green. |
| 3-4 | Phase 1 foundation code: env mode gate, schema migration, `/directive` roadmap page, deployment-mode assertion on boot. |
| 4-5 | Phase 1 continued: onboarding wizard mode chooser wired (UI only, consent flow built but second app not yet provisioned), Directive Onboarding Letter PDF template. |
| 6 | Rehearsal run-through of the DESC presentation on `desc.zaatarlabs.com` with the user. Polish. |
| 7 | DESC presentation. |
| 8+ | Post-presentation: Phase 2 work. |

The DESC demo for the presentation does **not** need Phase 1 foundation fully built. A viable presentation can be delivered with:

- DESC-branded observation dashboard (like SCSC but with DESC entities + ISR)
- A clean `/directive` roadmap page showing what is coming
- A walkthrough of the planned onboarding flow (can be mock screens)

Phase 1 real wiring is a nice-to-have, not a blocker.

---

## 6. Release and deployment cadence going forward

- Every merge to `main` → tag (`v1.1.x` or `v1.2.0` once Phase 1 lands) → GHCR release workflow → image on `ghcr.io/ohomaidi/mizan:x.y.z`.
- On the Mac Mini: `bash deploy/restart-demos.sh` picks up the code change and restarts both LaunchAgents. Both demos stay current.
- On customer Azure deployments: `bash web/deploy/update-azure.sh --tag x.y.z` pulls the new image. SCSC customers stay on observation behaviour; DESC (when they deploy) runs directive.

---

## 7. Open items needing user input before execution

1. **DESC logo** — PNG with background that the app's auto-strip can clean up.
2. **DESC name EN + AR** — confirm exact spelling and short form.
3. **DESC primary color** — hex or a reference image.
4. **DESC demo entity list** — accept proposed 14 or specify replacements.
5. **DNS access for `zaatarlabs.com`** — I assume user will add the CNAME record themselves in the Cloudflare dashboard. Will paste the target as soon as tunnel UUID is confirmed.
6. **Presentation date** — exact day so the timeline aligns.
7. **Maturity target for DESC** — 80, or stick with 75?

---

## 8. Non-goals for this rollout

- Multi-customer-per-deployment (a single Mizan instance serving both SCSC and DESC users). Not pursued — each customer gets their own deployment, own Azure subscription, own Entra apps, own data. Simpler, more compliant, matches existing productization direction.
- Auto-upgrading the deployment mode from observation to directive. Requires a redeploy with the new env var; not changeable from inside Mizan.
- Directive-mode dashboard for SCSC. SCSC is and will remain observation-mode. If SCSC ever wants directive, they redeploy separately.
