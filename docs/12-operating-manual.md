# Operating Manual

**Audience:** the human driving Mizan day-to-day — a regulator's SOC analyst, a holding company's security lead, a ministry's cybersecurity officer.

**Scope:** every routine action Mizan supports, how to perform it, and what happens to the entity's tenant when you do.

Mizan runs in one of two deployment modes, fixed at install time by the `MIZAN_DEPLOYMENT_MODE` environment variable:

| Mode | What the operator can do | Example customer |
|---|---|---|
| **Observation** (`observation`) | Read every entity's posture, score it, report on it. **Never writes to an entity's tenant.** | Sharjah Cybersecurity Center (SCSC) — posture visibility only |
| **Directive** (`directive`) | Everything observation mode does, **plus** push incident dispositions, Conditional Access policy baselines, and custom CA policies to consented entities. | Dubai Electronic Security Center (DESC) — regulator with authority to harden |

This manual is therefore **two parallel halves**. Part A covers what every Mizan deployment can do (read). Part B covers what directive deployments add on top (readwrite). If you're running an observation deployment, stop reading at the end of Part A.

---

## Part A — Observation (READ)

Every Mizan deployment, observation or directive, supports this section in full. **No action here ever writes to an entity's tenant.**

### A.1 What Mizan reads from every connected entity

The Graph-Signals Entra app pulls 18 read-only signal types on a daily cadence. Full endpoint list in [`01-feature-catalog.md`](01-feature-catalog.md) and [`02-graph-api-reference-defender.md`](02-graph-api-reference-defender.md) / [`03-graph-api-reference-purview.md`](03-graph-api-reference-purview.md).

Summary:

| Category | Signals |
|---|---|
| **Secure Score** | Overall score, per-control states |
| **Identity** | Conditional Access policy inventory, risky users, PIM sprawl (eligible + active role assignments), Defender for Identity sensor health |
| **Device** | Intune-managed device compliance, Defender Vulnerability Management CVE posture per device |
| **Threat** | Defender incidents + alerts unified, Advanced Hunting KQL packs, Threat Intelligence articles, Attack Simulation results |
| **Data protection** | DLP / IRM / Communication Compliance alerts, Subject Rights Requests, retention + sensitivity label catalogs, SharePoint tenant settings, async label-adoption audit query |

### A.2 Daily operator flow (observation)

```
/ (landing page)
├── Overview — Maturity Index rollup, top alerts, trend chart
├── /entities — list of every onboarded entity, each with maturity chip + drift flag
│   └── /entities/[id] — per-entity drill-down: all 18 signals, trend charts, 30-day events
├── /maturity — scoring tab (weights + target editor)
├── /identity — identity-posture roll-up (MFA %, legacy auth, PIM sprawl)
├── /data — data-protection roll-up (DLP, IRM, labels)
├── /devices — Intune compliance % + non-compliant device drill-downs
├── /vulnerabilities — cross-tenant CVE correlation + per-device CVE posture
├── /threats — unified incidents + alerts across all entities
├── /governance — framework clause coverage (NESA / NCA / ISR / generic)
└── /settings — configure branding, framework, Entra apps, RBAC, entities
```

**Typical analyst week (observation-mode):**

1. **Monday** — glance at `/` dashboard, note which entities slipped below target over the weekend.
2. **Tuesday–Thursday** — open `/threats`, triage new unified incidents. Hand off follow-ups to the entity's own SOC.
3. **Friday** — `/vulnerabilities` cross-tenant CVE review; publish a weekly bulletin to entities whose CVE posture regressed.
4. **Monthly** — export the `/governance` clause coverage as PDF, share with the regulator board.

### A.3 Onboarding a new entity

Every new entity walks the same 3-step path, regardless of deployment mode:

1. **Settings → Entities → + New entity**
   - Capture name (EN + AR), cluster (police / health / edu / municipality / utilities / transport / other), primary contact email
   - Mizan generates a consent URL pointing at the Graph-Signals app
2. **Send the Onboarding Letter PDF** to the entity's Global Administrator. The PDF contains the consent URL and plain-language framing of what the app reads.
3. **Entity's GA consents** in their own Entra admin center. Mizan detects the consent on the next sync (within 1 hour) and the entity turns green on the list.

First sync produces the initial Maturity Index. Subsequent syncs refresh daily.

> **Directive-mode deployments** add a second step to the onboarding flow — see **Part B.2** for the consent-mode chooser.

### A.4 Operator actions that stay inside Mizan (never Graph-side)

These actions change what Mizan **shows**, not what any entity's tenant contains. Safe in every deployment mode.

| Action | Where | Effect |
|---|---|---|
| Pause syncing an entity | `/entities/[id] → Suspend` | Mizan stops fanning out to that tenant until resumed |
| Schedule a review | `/entities/[id] → Schedule review` | Adds a tickler with a note; no Graph side-effect |
| Change maturity weights | `/maturity → Configure weights` | Recomputes the score on next sync |
| Change the framework | `/settings → Framework` | Re-renders `/governance` clause mappings |
| Rotate the Graph-Signals app secret | `/settings → App Registration` | Next token acquisition uses the new secret |

All the above log an audit row in `config_audit` or `consent_history`. None of them touch Graph.

### A.5 What observation mode **cannot** do

Hard rules baked into the code, not UI toggles:

- **No** Conditional Access writes
- **No** incident classify, alert comment, user session revoke, threat submission
- **No** directive consent flow — the "consent mode" column on every entity is hard-wired to `observation` and has no UI to change it
- **No** `/directive` page — observation builds don't render it even if a URL is typed manually

To do any of those, deploy Mizan in directive mode (see Part B) **as a separate, second installation**. Same underlying code, different env variable. Observation installs do not upgrade to directive — you deploy a new instance.

---

## Part B — Directive (READWRITE)

**This section only applies to deployments started with `MIZAN_DEPLOYMENT_MODE=directive`.** Skip it if you're on an observation deployment.

Directive mode adds a second Entra app (the **Directive** app, holding writable Graph scopes) and a new top-level page (`/directive`) that hosts every write action the regulator can fire. Everything in Part A still works exactly the same — directive mode is additive.

### B.1 The directive engine — what gates every write

Before any Graph WRITE fires, the request passes through `lib/directive/engine.ts` which enforces five rules:

1. **RBAC gate.** Write actions require the `admin` role (reads need `viewer`).
2. **Deployment-mode gate.** Observation builds return HTTP 404 on every `/api/directive/*` route at the route-loader level — the code doesn't even register.
3. **Per-entity consent gate.** The entity's `consent_mode` column must equal `directive`. Entities that onboarded as observation (the default) can't be written to, even in a directive-mode deployment.
4. **Demo simulation gate.** Tenants flagged `is_demo = 1` (the synthesized demo entities on `scscdemo` / `descdemo`) short-circuit to a simulated success response without ever calling Graph.
5. **Audit.** Every attempt — success, failure, or simulation — lands in `directive_actions` before the caller sees a result. Append-only, never deleted. Powers `/directive → Audit log`.

If any of (1)–(3) fails, the route returns 404/409 with a structured error code. (4) returns a success-shaped response marked `simulated: true`. (5) never fails the request but always writes the audit row.

### B.2 Onboarding an entity into directive mode

Directive deployments add a **consent-mode chooser** to the onboarding flow:

1. **Settings → Entities → + New entity** — same as observation
2. **Choose consent mode:**
   - **Observation** — read-only, entity gets the Graph-Signals consent link only. Safe default.
   - **Directive** — entity will be asked to consent to **both** the Graph-Signals app *and* the Directive app. Only pick this after a written agreement with the entity.
3. **Onboarding Letter PDF** — directive-mode deployments generate a different PDF variant that explains both apps, what the Directive app can do, and includes two consent URLs.
4. **Entity's GA consents separately** to each app. Mizan tracks each consent timestamp + status in `tenants.directive_app_consented_at` + `.consent_mode`.

**Downgrade path.** To remove directive authority after the fact, the entity's GA revokes the Directive app's consent in their own Entra admin center. Mizan detects it on the next sync, flips `consent_mode` back to `observation`, and every `/api/directive/*` call for that entity starts returning 409.

### B.3 Reactive writes (Phase 2)

Incident / alert / user-level actions, one Graph write per operator click. Available on `/directive` and inside the incident/alert modal.

| Action | Graph endpoint | Required Entra consent |
|---|---|---|
| Classify / comment on an incident | `PATCH /security/incidents/{id}` | `SecurityIncident.ReadWrite.All` |
| Classify / comment on an alert | `PATCH /security/alerts_v2/{id}` | `SecurityAlert.ReadWrite.All` |
| Confirm a risky user as compromised | `POST /identityProtection/riskyUsers/confirmCompromised` | `IdentityRiskyUser.ReadWrite.All` |
| Dismiss a risky user | `POST /identityProtection/riskyUsers/dismiss` | `IdentityRiskyUser.ReadWrite.All` |
| Revoke all sign-in sessions for a user | `POST /users/{id}/revokeSignInSessions` | `User.RevokeSessions.All` |
| Submit email / URL / file to Microsoft as a threat | `POST /security/threatSubmission/*` | `ThreatSubmission.ReadWrite.All` |

Every action logs to `directive_actions` with the actor, timestamp, target Graph ID, and response. On demo entities, the write is simulated.

### B.4 Conditional Access baseline pushes (Phase 3)

Mizan ships **12 curated CA baselines** covering identity hardening, legacy-surface reduction, risk-based enforcement, session hygiene, and device posture. Full catalog + rationale per baseline in the UI (each card has a **Details** expand).

#### B.4.1 Push a baseline

1. Go to `/directive → Conditional Access baselines`.
2. Find the baseline card. Every card leads with a yellow **"Ships report-only"** chip + plain-English warning: *"Nothing is enforced until the entity flips the policy on in their own Entra tenant."*
3. Click **Details** to read Why / User impact / Prerequisites / Rollout advice + Microsoft Learn link.
4. Click **Push to entities**. A modal opens.
5. Pick one or more directive-mode entities. A selection count chip (`2 of 14 entities selected`) confirms scope.
6. **Push**. Mizan:
   - Calls `findCaPolicyByIdempotencyTag()` against each target tenant — if the baseline is already present (matched by `mizan:<id>:v1` displayName suffix), returns an **Already applied** chip with the current state and does **not** create a duplicate.
   - Otherwise POSTs to `/identity/conditionalAccess/policies`, stamps the idempotency tag into the displayName.
   - Per-tenant result chip appears: `Success` (fresh), `Already applied` (no-op), `Simulated` (demo), `Failed` + error, or `Skipped (observation)`.

#### B.4.2 See what's in each entity right now

`/directive → Baseline status per entity`:

1. Pick an entity from the dropdown.
2. One Graph call lists every Mizan-tagged CA policy in their tenant.
3. The 12-row matrix shows each baseline's **present / absent** state + **current state** chip (Report-only / Enabled / Disabled) + "Observed at" timestamp.
4. Two annotations surface drift:
   - **"Different from the report-only state we pushed — entity flipped this on"** (warn) — answers *did they enforce?*
   - **"Still in report-only — entity hasn't enforced yet"** (info) — answers *why isn't this doing anything?*

The view auto-refreshes on re-select; manual **Refresh** button for immediate re-read.

#### B.4.3 Roll back a push

Every push that completed or failed shows a **Roll back** button in `/directive → Push history`.

The rollback modal opens a pre-flight preview that:

- Lists every tenant the push created a policy in
- Reads each policy's **current state from Graph** (live) — if the entity flipped it to Enabled, a yellow **"Entity has flipped this to Enabled — rollback will un-enforce"** warning appears per-row
- Pre-selects every eligible row
- Lets the operator **deselect** rows they want to leave untouched — scoped rollback

Rollback is **idempotency-safe**: if a push was a no-op (matched an existing policy from an earlier push), that row stores `graph_policy_id = null` and the rollback skips it with reason *"Idempotent match — this push didn't create the policy"*. Prevents a rollback of push #2 from deleting a policy created by push #1.

#### B.4.4 Remove a baseline from **every** entity at once

Every baseline card has a **Remove from ALL entities** button (red). It:

1. Finds every `directive_push_actions` row for that baseline across the whole history
2. De-dupes per tenant
3. For each tenant, **re-resolves** the policy id from Graph by idempotency-tag match (in case the entity rotated it) and DELETEs
4. Marks every matching action as `rolledback`

Confirmation modal required. Same button exists on custom drafts.

### B.5 Custom CA policy wizard (Phase 4 + 4.5)

For CA policies beyond the 12 curated baselines. No JSON required. Full wizard lives at `/directive/custom-policies/[id]/edit`.

#### B.5.1 Scope model — cross-tenant vs tenant-scoped

Every custom policy is either:

- **Cross-tenant** (default, green banner at the top). Uses only values that mean the same thing in every Entra tenant: `All users`, directory role template GUIDs (58 roles, global), Microsoft-published app GUIDs, built-in auth strengths. Pushable to many entities at once.
- **Tenant-scoped to one reference tenant** (yellow banner). Unlocks specific users, specific groups, named locations, Terms of Use, and custom authentication strengths from the chosen tenant. **Push is restricted to that tenant** — the push route returns 409 `scope_mismatch` if you try to target a different entity. Clone the draft if you need the same policy in another entity.

Flip between the two on the **Identify** step. Toggling back to cross-tenant preserves the tenant-local IDs in the spec but stops emitting them to Graph — non-destructive.

#### B.5.2 The seven wizard steps

Always-visible right-hand Review panel summarizes every step; click a row to jump there.

| # | Step | Key fields |
|---|---|---|
| 1 | **Identify** | Name, internal description, initial state (Report-only default; Enabled triggers red warning), policy scope (cross-tenant / tenant-scoped) |
| 2 | **Users** | Include: All / None / Specific roles / Guests & external. When tenant-scoped: + specific users, specific groups (typeahead against reference tenant). Exclude: roles + "Exclude Global Administrators" ON by default (safety rail) + when scoped: exclude-specific-users/groups |
| 3 | **Apps** | All / Office 365 / Admin portals / Azure Management / Specific (Microsoft-published GUIDs + custom-by-GUID) |
| 4 | **Conditions** | User risk, sign-in risk, device platforms, client app types, locations (Any / Trusted only / Specific named locations when scoped), device filter rule builder |
| 5 | **Access** | Block OR Grant with requirements (AND/OR combiner + 6 built-in grants + authentication strength dropdown — 3 built-in + custom from reference tenant when scoped + Terms of Use checkboxes when scoped) |
| 6 | **Session** | Sign-in frequency (hours/days + value), persistent browser (default/never/always), app-enforced restrictions |
| 7 | **Review** | Computed risk tier, plain-English grant summary, expandable exact-Graph-body JSON, target entity picker, Push button |

#### B.5.3 Authoring + autosave

- Every field change debounces 600ms then PATCHes the draft. Saving… / Saved indicator in the header.
- On hot reload or browser refresh, everything's there.
- Drafts live in `custom_ca_policies` table (status = `draft` / `archived`).

#### B.5.4 Template library shortcuts

Two clone paths to avoid starting from scratch:

1. **Clone as custom draft** — on every baseline card. Creates a new draft pre-populated with the baseline's spec (reverse-engineered via `body-to-spec.ts` mapper). Edit freely, push as custom.
2. **Clone** — on every draft row in the custom-policies table. Bit-for-bit copy with ` (copy)` suffix. For branching.

#### B.5.5 Device filter rule builder

A simpler builder than Entra's free-text rule grammar, AND-joined only:

- 4 attributes: `trustType`, `isCompliant`, `mdmAppId`, `operatingSystem`
- 3 operators: `-eq`, `-ne`, `-contains`
- Mode: `include` / `exclude`
- Builder emits the Kusto-like `rule` string at build time, e.g. `device.trustType -eq "AzureAD" -and device.isCompliant -eq True`

OR / parentheses / extension attributes are deliberately out of scope for the builder; advanced users can't enter them today. Hand-write raw rules via Entra if needed.

#### B.5.6 Push, idempotency, rollback, status

Identical plumbing to baseline pushes — same directive engine, same idempotency by `mizan:custom:<id>:v1` tag, same rollback modal, same "Remove from ALL entities" shortcut. Custom policies appear in `/directive → Push history` tagged as `custom:<id>`.

### B.6 Reading the audit log

`/directive → Audit log` shows every directive action attempted in the last 500 rows. Each row has:

- Timestamp
- Entity name
- Action type (`incident.classify`, `baseline.push.require-mfa-for-admins`, `baseline.rollback-all.custom:7`, etc.)
- Status chip (success / failed / simulated)
- Actor (Mizan user)
- "View details" → full request body + Graph response JSON

Never deleted. When real tenants go live, this is the regulator's defensible record of what happened and when.

### B.7 Intune baselines (Phase 5) — SHIPPED 2026-04-24

Seven Intune baselines live on `/directive → Intune device posture baselines`. Same card + push + rollback pattern as CA; separate section in the UI, different Graph collections underneath.

| Baseline | Kind | Platform | Notes |
|---|---|---|---|
| iOS compliance — minimum | compliance | iOS | 6-digit passcode, no jailbreak, iOS 16+ |
| iOS app protection (MAM) | mam | iOS | Copy/paste block, 6-digit PIN, jailbreak wipe, no enrolment needed |
| Android compliance — minimum | compliance | Android | 6-digit passcode, no root, Play Protect, Android 12+ |
| Android app protection (MAM) | mam | Android | Parallel to iOS MAM |
| Windows compliance — minimum | compliance | Windows | BitLocker, Secure Boot, TPM, Defender, 22H2+ |
| Windows BitLocker enforcement | config | Windows | Endpoint Protection profile that actually TURNS ON encryption |
| macOS compliance — minimum | compliance | macOS | FileVault, Gatekeeper, firewall, Ventura 13+ |

Policies ship **un-assigned by default** — the Intune equivalent of CA's report-only. The entity's admin decides which users/devices they enforce against. Same idempotency tag (`mizan:intune-<id>:v1`), same rollback pre-flight modal, same "Remove from ALL entities" shortcut.

License requirement: every target entity must have Intune P1 (Microsoft 365 E3+ / A3+ / standalone). Unlicensed tenants return 403 on push — the push modal surfaces this as `failed` with the Graph error.

### B.8 DLP + Sensitivity Labels (Phases 6/7) — COMING SOON

Both Phases 6 (Data Loss Prevention) and 7 (Sensitivity Labels) ship as **catalog + card UI with push disabled**. An accent *"Coming soon"* banner explains why.

Reason: Microsoft Graph doesn't yet expose the full DLP and sensitivity-label authoring API. Endpoint DLP, rule exceptions, user notifications, incident reports, label encryption, content marking, publishing policies, and auto-labeling rules are missing from Graph's public preview today.

**User decision 2026-04-24: no PowerShell workaround.** We wait for Microsoft to close the Graph gap instead of building a parallel PS execution tier. When the missing endpoints land on Graph, we flip `pushEnabled: true` in the relevant API route and push unlocks — no redeploy, no architectural change.

The catalog is fully authored today and reviewable by customers. Use it to pre-brief entities on the direction of travel so they're not surprised when push lands.

### B.9 What directive mode still doesn't do (deferred)

These features appeared on the roadmap but are **not shipped**. Don't promise them to customers.

| Feature | Status | Notes |
|---|---|---|
| Two-person approval workflow | Deferred | Every push today is single-click. Approval workflow is a future feature — user explicitly asked to defer it. No env var controls it. |
| PowerShell automation tier | **Permanently out of scope** (2026-04-24) | Phases 6 / 7 / 8 / 10 wait on Microsoft to close the Graph authoring API gap rather than being built via PowerShell. |
| Defender for Office presets / Safe Links / anti-phishing pushes | Later phase (Phase 9) | |
| SharePoint / OneDrive / Teams governance pushes | Later phase (Phase 11) | |

See [`project_sharjah_council_backlog.md`](../../.claude/projects/-Users-zaatarlabs/memory/project_sharjah_council_backlog.md) (Claude memory) for the full phase order.

---

## Appendix — quick reference

### Deployment mode by customer

| Customer | Mode | Public URL |
|---|---|---|
| Sharjah Cybersecurity Center (SCSC) | observation | `scscdemo.zaatarlabs.com` (demo); customer prod URL TBD |
| Dubai Electronic Security Center (DESC) | directive | `desc.zaatarlabs.com` (demo); customer prod URL TBD |

Demo restarts after a code change on the Mac Mini: `bash web/deploy/restart-demos.sh --no-pull`.

### Release cadence

- Commits to `main` during dev are routine and safe.
- Tag + GHCR build + Azure redeploy happens **only** when the user signs off a full feature cluster (2–4 items shipped together). Mac Mini demos are the test surface.
- See `feedback_mizan_release_cadence.md` (Claude memory) for the full rule.

### When something breaks

| Symptom | Look in |
|---|---|
| Sync fails for one tenant but not others | `/entities/[id] → Sync history` + Graph response code surfaced in `data-source-health` |
| `/directive` returns 404 on a directive deployment | Check `MIZAN_DEPLOYMENT_MODE` env; the route is gated by `isDirectiveDeployment()` at load time |
| Every directive action fails with "tenant_not_directive" | The target entity's `consent_mode` is still `observation`. Check `/settings → Entities → <entity> → Consent` |
| Push shows "Simulated" on what you thought was a real tenant | Entity has `is_demo = 1`. Only real-sync tenants create real policies. |
| Rollback preview warns "Entity has flipped this to Enabled" | The entity enabled the policy after your push. Decide if the un-enforcement is acceptable before rolling back. |
