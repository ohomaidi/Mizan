# Settings Tab — Specification

**Purpose:** the Council's operational console for onboarding, monitoring, and managing data connections to 100+ Sharjah entity tenants. This is where the posture dashboard's data supply chain is configured and observed.

**Audience:** Council SOC lead, Council IT admin, Microsoft delivery team.

> **Scope note (2026-04-19).** Read-only project. §3.3 "PowerShell role memberships", §3.4 "PowerShell Automation", §5.4 "PowerShell Automation", §3.6 "Revoke connection" (write action on entity tenant), and §1 sub-nav items referencing "PowerShell Automation" are **[deferred]**. Revoke means only "stop reading from this tenant" on the Council side. Framework weights (§5.5) narrow to **UAE NESA only**.

---

## 1. Information architecture

```
Settings
├── Entities                     ← list view, the main screen
│   └── Entity Detail            ← per-entity drill-down
├── Onboarding Wizard            ← add a new entity end-to-end (5 steps)
├── Global Configuration
│   ├── App Registration         ← the Council's multi-tenant Entra app
│   ├── Regions & Data Residency
│   ├── Polling Cadences
│   ├── Framework Weights        ← Maturity Index weights + UAE NESA target
│   └── Webhook Endpoints        ← change-notification receivers
├── Audit                         ← all Council access to entity tenants
└── Access Control               ← Council staff RBAC within the dashboard
```
Deferred: `PowerShell Automation` sub-nav, `Sentinel Workspaces` sub-nav (Pillar 2 scope), NCA/ISR framework weights.

---

## 2. Entities list view

**The operational heart of the Settings tab.**

### Columns

| Column | Source | Notes |
|---|---|---|
| Entity | Tenant registry | Display name + Arabic name |
| Cluster | Registry | Police / Health / Edu / Municip. / Utilities / Transport / Other |
| Tenant ID | Registry | Shortened; full on hover |
| Consent status | `/auditLogs/directoryAudits` verification + SPN check | `Consented` / `Pending` / `Revoked` / `Failed` |
| Token health | MSAL cache + last-call metrics | Green/Amber/Red with last-success timestamp |
| Signals (24h) | Ingest telemetry | Number of Graph calls + signals stored |
| Maturity Index | Compute engine | Live score 0–100 + 7d delta |
| Last sync | Ingest telemetry | Timestamp |
| Actions | — | Refresh · Re-consent · Export onboarding letter · Pause / Resume · Revoke (read-side, stops sync) |

~~PS bootstrap column~~ — **[deferred]**, removed with the PS tier.

### Filters
- Cluster · Consent status · Token health · Maturity band · Data-residency region
- Free-text search on name / domain / tenant ID

### Bulk actions
- Send re-consent reminder email to entity CISO contacts
- Export CSV of entity status for executive reporting
- Trigger on-demand full resync

---

## 3. Entity Detail view

One page per entity. Five tabs.

### 3.1 Overview
- Entity name (EN + AR), logo, cluster, CISO contact, technical contact
- Tenant ID, verified domain, licensing (E5 confirmed?)
- Consent date, consented-by (user), consent expiry (if applicable)
- Data residency override
- Maturity Index tile + 7d/30d/QTD/YTD trend
- Notes field (free-form, Council-internal)

### 3.2 Connection Health
- Token status per scope (Graph app-only, PS cert)
- **Per-endpoint call health table:**

| Endpoint | Last success | 24h call count | 24h 429s | Last error |
|---|---|---|---|---|
| `/security/alerts_v2` | … | … | … | … |
| `/security/incidents` | … | … | … | … |
| `/security/secureScores` | … | … | … | … |
| `/security/runHuntingQuery` | … | … | … | … |
| `/identityProtection/riskyUsers` | … | … | … | … |
| `/identity/conditionalAccess/policies` | … | … | … | … |
| `/roleManagement/directory/roleAssignmentSchedules` | … | … | … | … |
| `/deviceManagement/managedDevices` | … | … | … | … |
| `/security/informationProtection/sensitivityLabels` | … | … | … | … |
| `/security/labels/retentionLabels` | … | … | … | … |
| `/security/auditLog/queries` | … | … | … | … |
| `/admin/sharepoint/settings` | … | … | … | … |
| `/auditLogs/directoryAudits` | … | … | … | … |
| `/auditLogs/signIns` | … | … | … | … |
| … (full list per `docs/01-feature-catalog.md`) | | | | |

- Webhook subscription status for `alerts_v2`, `incidents`, `subjectRightsRequests`

### 3.3 Permissions & Roles

**Graph app permissions granted** (checklist, auto-polled from entity's SPN):
- Each required permission from `docs/04-architecture-and-risks.md §1.2` with status ✓ / ✗
- "Missing permissions" banner + copy-to-clipboard re-consent URL

~~PowerShell role memberships~~ — **[deferred]** with the PS tier. Not applicable to read-only scope.

### 3.4 ~~PowerShell Automation~~ — **[deferred]**
Removed from scope. Retained in history for potential follow-on engagement.

### 3.5 Audit
- All Council staff / automation access to this tenant, paginated:
  - Timestamp · actor (user or app) · action · endpoint · result · correlation ID
- Exportable (CSV / JSON)
- Retained per Council policy (default 2 years)

### 3.6 Actions (top-right menu)
- Refresh token
- Trigger full resync
- Re-send onboarding letter (PDF, to CISO contact)
- Pause / Resume data collection
- Schedule posture review
- Revoke connection — **Council-side only** (removes the tenant record + stops syncing). Does NOT uninstall the service principal in the entity's tenant; the entity admin can revoke consent from their own side at any time.

~~Rotate PS cert~~ — **[deferred]**.

---

## 4. Onboarding Wizard — **shipped 2026-04-19**

Five-step flow for adding a new entity. Implementation lives in [`web/components/settings/OnboardingWizard.tsx`](../web/components/settings/OnboardingWizard.tsx).

### Step 1 — Identify entity
- Entity name (EN + AR), cluster assignment, CISO + contact emails

### Step 2 — Tenant + domain
- Primary verified domain with OIDC auto-resolve via `GET https://login.microsoftonline.com/{domain}/.well-known/openid-configuration` — wizard extracts the GUID from the `issuer` field (see `app/api/discovery/resolve-tenant/route.ts`)
- Manual Tenant ID paste as fallback
- License-confirmation checkbox (E5 on every seat, or exceptions documented)

### Step 3 — Generate consent artifacts
- Construct per-tenant consent URL: `https://login.microsoftonline.com/{tenantId}/adminconsent?client_id={councilAppId}&redirect_uri={councilCallback}&state={onboardingId}`
- Generate entity-specific PDF of the onboarding guide (see `docs/06-entity-onboarding-guide.md`) with tenant ID, domain, and appId pre-filled
- Send to CISO via tracked email (manual today)

### Step 4 — Await consent
- Live-poll `/api/tenants/{id}` every 5 s client-side to surface `consent_status` transitions
- Consent callback writes `consented` when Entra redirects back

### Step 5 — First sync + verify
- Trigger initial pull on `/security/secureScores` to prove the pipeline
- Show success chip + move entity into the Entities list

~~Step 4 — Role bootstrap (PowerShell runbook)~~ — **[deferred]**, was prep for the removed write tier.

---

## 5. Global Configuration screens

### 5.1 App Registration — **shipped 2026-04-20**
Implementation: Settings → App Registration tab ([`AzureConfigPanel.tsx`](../web/components/settings/AzureConfigPanel.tsx)), backing API at `GET/PUT /api/config/azure`, persistence at `app_config.key = 'azure.app'`.

- Inputs: Client ID (GUID-validated), Client secret (write-only, masked display with "Replace" affordance), Authority host (default `https://login.microsoftonline.com`), Consent redirect URI override.
- Source pills: each field shows whether its current value came from the DB, env vars (fallback), or isn't set.
- **MSAL cache invalidation on save** — `invalidateAllTokens()` clears both `clientCache` and `tokenCache` in `lib/graph/msal.ts` so the next Graph call uses fresh credentials without a server restart.
- **Inline walkthrough** at the top of the panel: 6 numbered steps covering multi-tenant app registration, Graph permission set, client secret, redirect URI copy-button (always shows the deployment's correct URI), and first-entity consent verification. Saves support calls.
- Still pending: client cert fingerprint (production MSAL), webhook validation token ([deferred, change notifications not in scope]), "view in Entra" deep-link.

### 5.2 Regions & Data Residency
- Default Azure region (UAE-North / UAE-Central)
- Per-entity override
- Sentinel workspace per region

### 5.3 Polling Cadences
Editable per signal (with safety bounds from throttling limits):
- Secure Score — default daily
- Incidents / alerts — default 5 min
- Risky users — default 15 min
- CA policies — default daily
- Compliance policies — default hourly
- Advanced Hunting packs — default hourly (serialized)
- Audit Log Query — default daily
- Sensitivity labels / retention labels — default weekly

### 5.4 ~~PowerShell Automation~~ — **[deferred]**

### 5.5 Framework Weights — **UAE NESA only**
- Sub-score weights (SecureScore / Identity / Device / Data / Threat / Compliance) — sum auto-normalized
- Target slider (default 75)
- "Reset to Council-approved baseline"
- Settings → Maturity Index already implements this at runtime via `app_config` SQLite store
- **Weight-sum guard (shipped 2026-04-20)**: Save button is disabled unless weights total 100%; banner shows current delta; one-click **Normalize to 100%** scales proportionally and absorbs rounding drift on the largest weight.
- ~~NCA / ISR weight sliders~~ — **[deferred]** with multi-framework mapping

### 5.5a NESA clause mapping — **shipped 2026-04-19**
Implementation: Settings → NESA mapping tab ([`NesaMappingPanel.tsx`](../web/components/settings/NesaMappingPanel.tsx)), API at `/api/config/nesa`, defaults in [`lib/config/nesa-mapping.ts`](../web/lib/config/nesa-mapping.ts), persistence at `app_config.key = 'nesa.mapping'`.

- 8 default clauses (T.1–T.8): Identification & Authentication, Access Control, Information Classification, DLP, Endpoint Security, Incident Detection & Response, Audit & Accountability, Data Residency.
- Per-clause fields: `id`, `ref`, `titleEn`/`titleAr`, `descriptionEn`/`descriptionAr`, `secureScoreControls[]`, `weight`.
- Council can add/remove clauses, edit bilingual titles, reassign Secure Score controls, tune weights (auto-normalized to 100 on save).
- `/governance` page renders coverage bars per clause, weighted average → Maturity Index compliance sub-score.

### 5.6 Webhook Endpoints
- Subscription lifecycle per entity for `alerts`, `incidents`, `subjectRightsRequests`
- Renewal scheduler (max ~3-day lifetime)
- Failure alert routing

### 5.7 Sentinel Workspaces
- Per-region workspace mapping
- CCF connector status
- Ingestion volume dashboards (cost signal)

---

## 6. Audit tab (global) — **shipped 2026-04-19**
Implementation: Settings → Audit log tab ([`AuditLogPanel.tsx`](../web/components/settings/AuditLogPanel.tsx)), backing API at `GET /api/audit`, pulled from the `endpoint_health` SQLite table written on every Graph call.

- Council-wide Graph audit-of-access log: every endpoint × tenant × last-success × last-error × 24h call count × 24h throttle count.
- Search box: free-text across entity name (EN/AR), endpoint path, error message.
- Filter pills: All / Healthy / With errors / Throttled.
- Manual refresh button.
- Still pending: **actor column** — requires MSAL user-auth (deferred). Current scope captures endpoint-level telemetry only, not per-user action attribution.
- Export CSV / JSON — not shipped; Settings → Entities already exports the tenant roster as CSV, and individual entity detail has Export card (JSON).

## 6a. Documentation tab — **shipped 2026-04-19**
Implementation: Settings → Documentation tab ([`DocumentationPanel.tsx`](../web/components/settings/DocumentationPanel.tsx)), PDFs served by `GET /api/docs/{id}?lang=en|ar`.

- Five customer-facing handoff PDFs downloadable from the dashboard: Installation Guide · Operator's Manual · Security & Privacy Statement · Architecture & Data Flow Overview · Handoff Checklist.
- EN + AR separately (monolingual PDFs per the bidi rule).
- Content is source-controlled in [`lib/pdf/docs/`](../web/lib/pdf/docs/); edits are PR-reviewed.

---

## 7. Access Control tab

- Council staff RBAC within the dashboard:
  - **Council Admin** — everything
  - **SOC Analyst** — read posture + alerts + hunting; no settings
  - **Compliance Auditor** — read posture + audit; no alerts drill-down
  - **Entity Liaison** — read-only per assigned cluster
- Integrates with Entra ID groups in the Council's own tenant
- All role changes audited

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Entities list < 2s for 150 rows |
| Freshness | Connection health updated at least every 5 min |
| Availability | 99.5% target (backend) |
| Auth | Entra SSO for Council staff; MFA enforced; CA policy scoped to Council tenant |
| Audit | All actions logged, 2-year retention |
| Data residency | UAE-North primary, UAE-Central DR |
| Accessibility | WCAG 2.2 AA, EN/AR bilingual UI, RTL support |
| Export | CSV, JSON, PDF for entity cards and onboarding letters |

---

## 9. Open questions (for design review)

1. **Consent collection model** — does every entity's Global Admin click the consent link themselves, or does the Council run a federated identity (GDAP-like) flow through a partner arrangement?
2. ~~PS cert pool~~ — **[deferred]** with PS tier.
3. **Revocation workflow** — does a Council-side revoke require entity notification + cooling-off period?
4. **Delegation to Microsoft delivery team** — during the 90-day build, Microsoft engineers need elevated access. How do we scope that?
5. **Alert routing** — when an entity's token expires or consent is revoked, who gets paged? (Revocation auto-detection ships 2026-04-19 — flip to `consent_status='revoked'` on 401. Paging not yet wired.)
