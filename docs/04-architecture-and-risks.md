# Architecture, Multi-Tenant Patterns, and Risk Register

**Scope:** how Mizan reaches connected entity tenants, the throttling envelope it must live inside, how directive writes are gated + audited + rollback-safe, and the risks to name in the board deck.

> **Scope reversal (2026-04-20) — productization pivot.** The project is being white-labeled as **Mizan**. Multi-framework mapping (NESA / NCA / ISR / Generic) is back in scope; NESA-only is out. MSAL user-auth + RBAC are back in scope. Azure deploy is a single one-click template that uses NFS-mounted Azure Files so it works under any governance posture including MCA-managed tenants. See §7 below.
>
> **Scope update (2026-04-24) — directive mode shipped.** A second deployment mode (`MIZAN_DEPLOYMENT_MODE=directive`) adds a write tier: a second multi-tenant Entra app (the Directive app), per-entity consent mode, a directive engine that centralises gating/audit, and a full Conditional Access authoring surface (12 curated baselines + custom wizard with tenant-scoped mode). See new §8 below.

---

## 1. Multi-Tenant Auth — the only scalable pattern

**Single multi-tenant Entra app + per-tenant admin consent + per-tenant app-only token.**

### Onboarding sequence (per entity)

1. **Register** one multi-tenant app in the provider tenant (`signInAudience=AzureADMultipleOrgs`). Add the read-only app permission set (see §1.2).
2. **Admin consent** per entity: each Sharjah entity's admin visits `https://login.microsoftonline.com/{tenantId}/adminconsent?client_id=<app_id>`. This provisions a service principal in the customer tenant.
3. **Capture `tenantId`** in the Council's tenant registry + admin consent event verified via `/auditLogs/directoryAudits`.

~~eDiscovery / Records Management role bootstrap~~ — **[deferred]**, only relevant to the removed PS write tier.

### Runtime

- Acquire a **separate app-only token per tenant**: `POST https://login.microsoftonline.com/{customerTenantId}/oauth2/v2.0/token`, `grant_type=client_credentials`, `scope=https://graph.microsoft.com/.default`. ~60 min TTL. Cache per tenant (MSAL does this).
- Every Graph call targets `graph.microsoft.com` with the tenant-scoped bearer. **There is no cross-tenant Graph query — you fan out.**

### 1.2 App permission set (least-privilege, read-heavy)

```
SecurityAlert.Read.All
SecurityIncident.Read.All
ThreatHunting.Read.All
SecurityEvents.Read.All
IdentityRiskyUser.Read.All
IdentityRiskEvent.Read.All
Policy.Read.All
AuditLog.Read.All
DeviceManagementManagedDevices.Read.All
DeviceManagementConfiguration.Read.All
Directory.Read.All
ThreatSubmission.Read.All
AttackSimulation.Read.All
eDiscovery.Read.All
SecurityIdentitiesHealth.Read.All
AuditLogsQuery.Read.All
AuditLogsQuery-Exchange.Read.All
AuditLogsQuery-SharePoint.Read.All
AuditLogsQuery-Entra.Read.All
InformationProtectionPolicy.Read.All
RecordsManagement.Read.All
SubjectRightsRequest.Read.All
SharePointTenantSettings.Read.All
ThreatIntelligence.Read.All
RoleManagement.Read.Directory
RoleEligibilitySchedule.Read.Directory
```

### 1.2b Directive Graph app (directive-mode deployments only)

Deployments with `MIZAN_DEPLOYMENT_MODE=directive` provision a **second** multi-tenant Entra app alongside Graph-Signals. The Directive app holds the write-scoped permissions each phase needs; entities opt into directive mode with a separate admin-consent step.

Permissions currently requested (Phase 2c + 3 + 4 + 4.5 shipped):

```
# Phase 2c — reactive writes
SecurityAlert.ReadWrite.All
SecurityIncident.ReadWrite.All
IdentityRiskyUser.ReadWrite.All
ThreatSubmission.ReadWrite.All
User.RevokeSessions.All

# Phase 3 / 4 / 4.5 — Conditional Access
Policy.ReadWrite.ConditionalAccess
Policy.Read.All                 # already in Graph-Signals; duplicated here for CA read path when sharing tokens
Application.Read.All            # app-picker typeahead in custom wizard

# Phase 4.5 tenant-scoped pickers (reads only — same tenant the write lands in)
User.Read.All
Group.Read.All
Agreement.Read.All              # Terms of Use list

# Phase 5+ permissions land here as each phase ships. Add them at release time
# so entities see the expanded scope when they re-consent during an upgrade.
```

Entity-side admin consent is mandatory before any directive route touches Graph — enforced by `consent_mode = 'directive'` on the `tenants` row (see §8).

### 1.2c Permissions NOT requested

~~Write-scoped perms for Intune (`DeviceManagementConfiguration.ReadWrite.All`), Defender (`CustomDetection.ReadWrite.All`), Records Management (`RecordsManagement.ReadWrite.All`)~~ — added only when the respective future phase ships. Early-adopter entities should re-consent when Mizan expands the scope; the directive-mode Onboarding Letter PDF warns them this will happen.

### 1.3 Patterns ruled out

- **GDAP (Granular Delegated Admin Privileges):** partner-tenant only — requires CSP status. Sharjah Council isn't a CSP. Not the right model here.
- **Azure Lighthouse:** Azure ARM only. Useful for Defender for Cloud / Sentinel MSSP-style management, **does not apply to Graph**.
- **Partner Center / `managedTenants`:** CSP-only; not applicable.

---

## 2. Fan-out architecture

```
┌────────────────────────────┐
│  Tenant Registry (100+)    │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐     MSAL token cache (per tenantId)
│  Per-tenant worker pool    │──────────────────────────────┐
│  (5 default, SCSC_SYNC_    │                              │
│   CONCURRENCY 1–20)        │                              │
└──────┬──────┬──────┬───────┘                              │
       │      │      │                                      │
       ▼      ▼      ▼                                      ▼
    Graph  Graph  Graph  …  MDE direct API   PowerShell pool (Azure Automation)
   (tenantA)(tenantB)(tenantC)  (per tenant)   (cert-based, per tenant)
       │      │      │            │                          │
       └──────┴──────┴────────────┴──────────────────────────┘
                             │
                             ▼
                 Tenant-partitioned store
                 (Cosmos DB / Azure Data Explorer)
                             │
                             ▼
                    Maturity Index compute
                             │
                             ▼
                  Dashboard (Power BI / Web)
                             │
                             ▼
                  Sentinel (CCF connector)
```

### Principles

- **Bounded worker pool** (shipped 2026-04-19). `lib/sync/orchestrator.ts` fans out tenants across N parallel workers (default 5, clamped 1–20 via `SCSC_SYNC_CONCURRENCY`). Signals run **serially within each tenant** to respect per-tenant Graph throttle envelopes; tenants fan out across each other because throttles are per-tenant-app-pair. 200 tenants × 18 signals complete in ≈ 24 min at concurrency 5 vs ≈ 2 h fully serial.
- **Retry-After-aware client.** All Graph HTTP calls respect `Retry-After`; identity-protection endpoints don't set the header — implement exponential backoff there.
- **Product-unavailable tolerance** (shipped 2026-04-20). Every signal fetcher treats HTTP `400/403/404` as "tenant doesn't have this product licensed/activated" and returns an empty payload instead of failing the sync. Tenants without Defender XDR, Intune, Entra ID P2, or Purview don't break first-sync.
- **Revocation auto-detection** (shipped 2026-04-19). If every signal in a single sync fails with either HTTP `401` or a known AADSTS revocation code (`65001`, `700016`, `50020`, `500011`), the orchestrator flips `consent_status` → `revoked`, invalidates the MSAL token cache, and skips that tenant on subsequent syncs. Settings → Entities surfaces the state.
- **Tenant-partitioned storage.** Every row carries `tenantId`; queries never cross tenants without explicit roll-up permission.
- **Defender XDR → Sentinel.** For raw advanced-hunting tables at scale, don't fan-out via Graph. Use Sentinel's Defender XDR connector per tenant (Pillar 2).
- **Codeless Connector Framework (CCF).** Use CCF for per-entity Graph pulls that have no native Sentinel connector (Secure Score, `riskDetections`, Intune compliance).

---

## 3. Throttling envelope

| Namespace | Limit (per tenant unless noted) | 429 behavior |
|---|---|---|
| Global | 130,000 req / 10 s per app across all tenants | `Retry-After` |
| `alerts_v2`, `incidents` | ≈150 req/min/app/tenant (observed; undocumented) | `Retry-After` |
| `runHuntingQuery` | ≥45 calls/min/tenant; CPU quota resets every 15 min; 3-min per-query; 50 MB/100k row cap | 429 with reason in body |
| Identity Protection | **1 req/sec per tenant across all apps** | **No `Retry-After`** — exponential backoff |
| Intune `deviceManagement` | 2,000 req/20s/tenant (all apps); 1,000 req/20s/app; writes 200/20s tenant, 100/20s app | `Retry-After` |
| Directory (users/groups) | Token-bucket 3,500–8,000 RU/10s by tenant size; writes 3,000/150s | `Retry-After` |
| Exchange / Audit Log Query | 100 req / 5 min per tenant | `Retry-After` |
| JSON batching | Each sub-request counted individually; partial 429s possible | Retry each inner failure |

### Cadence guidance

| Signal | Cadence | Why |
|---|---|---|
| Secure Score | Daily | Score only refreshes daily in MS |
| CA policy list | Daily (snapshot diff) | No webhook |
| PIM assignments / eligibility | Daily | Low churn |
| Compliance policies / Intune | Hourly (filtered `lastSyncDateTime`) | Device posture drifts daily |
| Incidents / alerts | 5 min polling + webhook | Near-real-time needed for SOC |
| Risky users | 15 min | 1 rps tenant cap forces staggering |
| Advanced Hunting packs | Hourly, serialized per tenant | 45/min tenant cap |
| Audit Log Query | Daily bulk pull | Async job; ~3 concurrent per tenant |
| Sensitivity label adoption | Weekly | Slow-moving |
| Subject Rights Requests | On-demand + daily rollup | Low volume |

---

## 4. PowerShell automation tier — permanently out of scope

User decision 2026-04-24: **no PowerShell tier, ever.** Phases that would need one (Phase 6 DLP, Phase 7 Sensitivity Labels, portions of Phase 8 Retention, portions of Phase 10 Exchange) ship as **coming-soon catalog UIs** instead. The curated baselines render with an accent "Coming soon" banner and disabled push buttons; when Microsoft closes the Graph authoring API gap for each phase, we flip `pushEnabled: true` in the relevant API route and push unlocks — no architectural change required.

Rationale: the PS tier would have meant a separate Azure Automation module, certificate-based tenant connection, credential vaulting, and a parallel execution path out of band from the directive engine. That's a big architecture surface to justify for phases that Microsoft is already moving into Graph. Waiting is cheaper than duplicating.

The following domains have **no Graph CRUD** — they must be scripted via Security & Compliance PowerShell (`Connect-IPPSSession`) or Exchange Online PowerShell (`Connect-ExchangeOnline`):

| Domain | Cmdlet family | MT-RISK severity |
|---|---|---|
| DLP policy CRUD | `New-/Set-DlpCompliancePolicy`, `New-/Set-DlpComplianceRule` | High (core control) |
| Insider Risk policy / case CRUD | `Get-/New-InsiderRiskPolicy`, `Get-InsiderRiskCaseInfo` | High |
| Communication Compliance policy CRUD | `Get-/New-SupervisoryReviewPolicyV2`, `Get-/New-SupervisoryReviewRule` | Medium |
| Retention policies (non-label) | `New-RetentionCompliancePolicy`, `New-ComplianceRetentionEvent` | High |
| Information Barriers | `New-OrganizationSegment`, `New-InformationBarrierPolicy`, `Start-InformationBarrierPoliciesApplication` | Medium |
| Auto-labeling policies | `New-AutoSensitivityLabelPolicy`, `Set-AutoSensitivityLabelPolicy` | Medium |
| Audit log retention policies | `New-UnifiedAuditLogRetentionPolicy` | Medium |
| Customer Lockbox approvals | `Approve-AccessToCustomerDataRequest` | Low (audit-only) |
| Exchange mail-flow DLP trace | `Get-MessageTraceV2` | Low |

### Implementation

- **Azure Automation** runbooks, PowerShell 7 runtime.
- **Certificate-based auth** (`Connect-IPPSSession -AppId X -Certificate Y -Organization contoso.onmicrosoft.com`).
- **Per-tenant credential vaulting** (Key Vault, one cert per tenant or shared cert with per-tenant consent).
- **Parallel job orchestration** with tenant-scoped timeouts + retry. Log all runs to the tenant registry.

---

## 5. Risk Register

Ordered by what the board must hear before approving the build.

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Compliance Manager score has no Graph API. | UAE NESA maturity numbers on slide 6 can't be pulled directly. | Synthesize from Secure Score control mappings + audit records; name this explicitly in governance reporting. |
| 2 | DLP / sensitivity labels / retention / Comm Compliance / IB / auto-label / retention-policy CRUD has limited or no Graph coverage today. | Phases 6–10 want these; Microsoft's Graph authoring API is incomplete in public preview. | **User decision 2026-04-24: no PowerShell tier.** Ship coming-soon catalogs for affected phases (Phase 6 DLP + Phase 7 Labels already shipped that way). Flip `pushEnabled: true` when Microsoft exposes the missing endpoints. No architectural change required when they do. |
| 3 | Device response actions (isolate, quarantine) not in Graph. | Analyst automation needs MDE direct API. | MTO (Pillar 3) handles UX; programmatic orchestration uses MDE API. |
| 4 | Advanced Hunting 45 calls/min/tenant. | At 100 entities × hourly query pack, serialized — any bursty workload hits the wall. | Pre-aggregate into Sentinel, use advanced-hunting sparingly for drill-downs only. |
| 5 | `alerts_v2` / `incidents` webhook support is beta / undocumented. | Can't rely on push for alerts in v1. | Poll with `lastUpdateDateTime` watermark + webhook subscription where available. |
| 6 | eDiscovery case *creation* is delegated-only. | Zero-touch case provisioning blocked. | Service account with cert-based delegated flow, OR portal bootstrap at case open. |
| 7 | Audit Log Query API oscillates GA↔beta. | Schema breakage risk. | Build against beta, feature-flag for v1.0 promotion. |
| 8 | Identity Protection rate limit is 1 req/sec/tenant with no `Retry-After` header. | Fan-out burst = 429 storm. | Implement exponential backoff explicitly for this namespace. |
| 9 | PIM for Azure resources (`/privilegedAccess/azureResources`) retires Oct 28, 2026. | Any dependency breaks. | Migrate to Azure REST PIM API (ARM-side) from day one. |
| 10 | Sentinel in the Azure portal retires March 31, 2027. | Pillar 2 positioning must anticipate. | Defender portal is the go-forward home for unified SecOps. |
| 11 | MDCA (Defender for Cloud Apps) entity/discovery APIs are MCAS-native only. | No Graph bridge. | Separate per-tenant MCAS API credentials if discovery data is in scope. |
| 12 | Fabric / Data Governance API is at `{account}.purview.azure.com`, not Graph. | Out-of-scope unless entities have Purview accounts. | Exclude from v1. Revisit if Council wants data-map posture. |
| 13 | Per-tenant admin consent collection is organizational, not technical. | Rollout timing depends on 100+ entity admins. | Council-led comms plan; staged consent waves (clusters first); portal for status tracking. |
| 14 | Data residency for dashboard backend. | Gov customers typically require in-country. | Deploy in UAE-North / UAE-Central; Sentinel workspace in same region. |
| 15 | Entity tenants may enforce device-auth Conditional Access on admin consent (AADSTS50097). | Global Admin on an unmanaged device can't grant consent via browser. | Documented in Installation Guide troubleshooting. Guide entities to consent from a managed/hybrid-joined device or from Edge signed into Windows PRT. |
| 16 | @react-pdf/textkit bidi-reorder crashes when an Arabic Tatweel (U+0640) appears before whitespace+Latin. | AR PDFs fail rendering until the offending string is edited. | `lib/pdf/sanitize-ar.ts` — defensive sanitizer applied at every PDF template getter + layout component. Strips malformed Tatweels while preserving stylistically-correct ones between Arabic letters. |
| 17 | Directive-mode push lands real CA policy in entity tenant. Bad baseline → entity lockout. | Business risk: regulator push breaks an entity's sign-in. | Every baseline ships in report-only (`enabledForReportingButNotEnforced`); the UI leads with a yellow warning chip; custom wizard default is report-only with a red banner on Enabled; every baseline that touches admin roles auto-excludes Global Administrator templates; per-tenant rollback + pre-flight preview + baseline-wide rollback always available. |
| 18 | Approver can push their own policy (no two-person rule). | Single compromised admin could push a lockout policy. | User deferred the approval workflow. Mitigations until then: audit log captures every action with actor; RBAC gates pushes to admin role; real deployments should limit admin count. Reopen the two-person rule when multi-admin regulators deploy. |
| 19 | Custom CA wizard may reference tenant-local IDs (users, groups, named locations) that don't exist in other tenants. | Push to wrong tenant → 400 from Graph + noisy audit row. | Tenant-scoped drafts are bound to their reference tenant at spec level; the push route rejects off-tenant targets with `scope_mismatch` before any Graph call. The Review step disables non-reference tenants in the picker. Clone-and-adapt is the cross-tenant workflow. |
| 20 | Idempotent push + rollback could cascade delete a policy created by an earlier push. | Data-loss risk: rollback #2 deletes policy from push #1. | `push_actions.graph_policy_id` is set to `NULL` on idempotent rows; rollback skips null-policy rows with `no_policy_id` reason. See `04-architecture-and-risks.md §8.1`. |

---

## 6. Decisions still open

Per-customer + operational decisions. Code-level questions are resolved.

- ~~Framework priority~~ **Resolved 2026-04-20: per-customer config (NESA / NCA / ISR / generic).**
- **Entity clustering** — default clusters shipped; each customer edits via Settings.
- **Azure region** for dashboard backend + Sentinel workspace. Default `uaenorth`.
- **Target maturity threshold** — default 75, customer-tunable via Settings → Maturity Index.
- ~~Policy deployment authority~~ **Resolved 2026-04-20/24: per-deployment via `MIZAN_DEPLOYMENT_MODE`. Observation = no push. Directive = reactive writes + CA baselines + custom CA wizard shipped; Intune + DLP + labels + retention + Defender for Office + Exchange + SP/Teams + PIM + App consent + Attack sim + Tenant identity defaults are sequenced in phases 5–15 (see `project_sharjah_council_backlog.md` in memory).**
- **Credential bootstrap owner** — regulator central team or per-entity CISO? Affects onboarding comms.
- **Two-person approval workflow** — deferred 2026-04-24; reopens with the first multi-admin regulator deployment.

---

## 7. Deployment topology (Azure Container Apps)

Single canonical template: `deploy/azure-container-apps.bicep`. Uses NFS-mounted Azure Files so the deploy works under any governance posture, including MCA-managed subscriptions that enforce `StorageAccount_DisableLocalAuth_Modify`.

### 7.1 Resource topology

```
                   ┌───────────────────────────────────────────────────────┐
                   │  VNet  10.60.0.0/16                                   │
                   │  ┌──────────────────────┐  ┌──────────────────────┐   │
                   │  │ subnet "aca"  /23    │  │ subnet "pe"   /28    │   │
                   │  │ delegated to         │  │ Private endpoint to  │   │
                   │  │ Microsoft.App/       │  │ Premium File Storage │   │
                   │  │ environments         │  │ (file sub-resource)  │   │
                   │  └──────────┬───────────┘  └──────────┬───────────┘   │
                   │             │                         │               │
                   │   VNet-integrated ACA env             │               │
                   │             │                         │               │
                   │        Container App  ◄───────NFS 4.1─┘               │
                   │             │      mount /data  (no shared key)       │
                   └─────────────┼───────────────────────────────────────┬─┘
     public HTTPS ──────────────►│ ingress (external: true)              │
                   ┌─────────────┼──────────────────────────────────────┐│
                   │  Premium FileStorage account                        ││
                   │  allowSharedKeyAccess: false                        ││
                   │  publicNetworkAccess: Disabled                      ││
                   │  NFS-enabled file share "mizan-data" (100GB min)    ││
                   └─────────────────────────────────────────────────────┴┘

      privatelink.file.core.windows.net  ─── VNet-linked DNS zone
```

Why NFS: auth is network-level (private endpoint + VNet ACL) instead of account-key. `allowSharedKeyAccess: false` is actually required for NFS file shares anyway, so it aligns with the MCA policy stance that blocked the previous SMB-based approach.

Cost: Premium_LRS FileStorage minimum 100GB ⇒ ~$15/mo. Private endpoint ~$7/mo. LAW + ACA ~$10–20/mo. Total ~$35–55/mo for a single-customer install.

### 7.2 Why redeploy instead of update

ACA Managed Environments have **immutable `vnetConfiguration`** — Azure forbids adding or changing VNet integration on an existing environment. If a customer ever pre-deployed an older SMB-based variant, the only path to this topology is delete + redeploy. Cleanup commands are in [`10-deployment.md`](10-deployment.md#cleanup-for-redeploy).

### 7.3 Hardening checklist for production

- [ ] Swap `allowPublicNetworkAccess` on the Premium storage account from the default (Variant A) to `Disabled` (already the case in Variant B).
- [ ] Bind a custom domain to the Container App and issue a managed cert.
- [ ] Update both Entra app registrations' redirect URIs to the custom domain.
- [ ] Enable diagnostic settings on the Container App → Log Analytics for 30-day audit retention.
- [ ] Add a daily sync trigger: Azure Function or Logic App hitting `/api/sync` with the shared `X-Sync-Secret` header.
- [ ] Rotate the user-auth client secret on a 90-day cycle; **OR** switch to cert-based MSAL via Settings → App Registration → Certificate (shipped v2.0.0).

### 7.4 Cert-based MSAL (production hardening, v2.0+)

`AzureAppConfig` and `UserAuthConfig` carry both credential modes side-by-side. The MSAL client builders in `lib/graph/msal.ts` and `lib/auth/msal-user.ts` prefer cert when `clientCertThumbprint` + `clientCertPrivateKeyPem` are present; secret is the fallback. `getAzureAuthMethod()` / `getUserAuthMethod()` report which mode is active so the UI renders the right Settings panel.

Switching credential mode in the UI (Secret → Certificate or vice versa) clears the OTHER credential on save so a customer never accumulates stale shared secrets after migrating to certs.

For Azure Container Apps + Key Vault: store the PEM block as a Container App secret referencing a Key Vault secret URI, expose it as `AZURE_CLIENT_CERT_PRIVATE_KEY_PEM` in env, set `AZURE_CLIENT_CERT_THUMBPRINT` alongside, and leave the DB-side cert fields empty — the env-fallback path picks both up. `assertAzureConfigured()` accepts either secret OR cert as evidence the app is wired.

### 7.5 Accessibility v1 (shipped v2.0+)

Concrete improvements landed against WCAG 2.2 baseline:

- **Skip-to-content link** in `(dashboard)/layout.tsx` — first focus stop on every page; visually hidden until focused; jumps to `<main id="main">` (WCAG 2.4.1 Bypass Blocks).
- **Modal focus management** in `components/ui/Modal.tsx` — `aria-labelledby` on the title, focus moved into the panel on open, `Tab` + `Shift+Tab` cycle within the modal, `Esc` closes, focus restores to the previously-focused element on close (WCAG 2.4.3 + 2.4.7).
- **Sidebar nav** — `aria-label` on `<nav>`, `aria-current="page"` on the active link, decorative icons marked `aria-hidden="true"`.
- **Autosave indicator** in the wizard — wrapped in `role="status"` + `aria-live="polite"` so AT announces "Saving / Saved" without interrupting typing.
- **Theme + language toggles** already had `aria-label` + `aria-pressed`; decorative icons inside also marked `aria-hidden`.

Not yet shipped: full WCAG 2.2 axe-core CI pass, formal color-contrast pass, keyboard-only end-to-end smoke test of every page.

---

## 8. Directive engine (directive-mode deployments only)

Every Graph WRITE that directive mode performs — incident classifications, threat submissions, Conditional Access policy creates, custom-policy pushes, rollbacks — passes through one function: `lib/directive/engine.ts :: executeDirective`. Five responsibilities, in order:

1. **RBAC gate.** Minimum `admin` role on write actions (`analyst` on specific reactive actions, `viewer` on read-only directive status queries). Enforced via `gateDirectiveRoute()`.
2. **Deployment-mode gate.** `/api/directive/*` routes check `isDirectiveDeployment()` at module load; observation builds return 404. This is belt-and-braces on top of RBAC.
3. **Per-entity consent gate.** The target tenant's `consent_mode` column must equal `directive`. Entities that onboarded as observation (the default) reject every directive action with `tenant_not_directive`. This backs the "observation entities are never written to" promise at the code level, independent of who clicks what in the UI.
4. **Demo simulation gate.** Tenants flagged `is_demo = 1` (the synthesized Sharjah / DESC demo entities whose Entra GUIDs are fake) short-circuit to a simulated success before any Graph call. Demo tenants are auto-seeded; real tenants onboarded to a demo-mode deployment (`MIZAN_DEMO_MODE=true`) still hit real Graph — `MIZAN_DEMO_MODE` controls the auth bypass only, not the write simulation.
5. **Audit.** Every attempt — success, failure, or simulation — writes a row to `directive_actions` before the caller sees a result. Never deleted. Powers `/directive → Audit log`.

### 8.1 Push + rollback idempotency model

Both Conditional Access baselines and wizard-authored custom policies use the same idempotency pattern:

- Every policy's `displayName` embeds a tag: `[Mizan] <title> (mizan:<baseline-id>:v1)` or `[Custom] <name> (mizan:custom:<id>:v1)`.
- Before a push, `findCaPolicyByIdempotencyTag()` reads the tenant's CA policy list and greps for the tag. If a match exists, no new policy is created; the existing policy is returned with `idempotent: true` and surfaced as **Already applied** in the UI. The push_action row's `graph_policy_id` is set to `NULL` in this case — critical safety.
- Rollback `DELETE`s by `graph_policy_id`. Because idempotent rows store `NULL`, a rollback of push #2 against a policy that was actually created by push #1 is a **no-op**. Prevents cross-push rollback hazard.
- Baseline-wide rollback (*Remove from ALL entities*) does not trust stored `graph_policy_id` — it re-resolves the current policy id from Graph by tag match, then DELETEs. Handles the case where the entity rotated the policy after our push.

### 8.2 Pre-flight rollback preview

The UI never fires a rollback blind. Opening the rollback modal first calls `GET /api/directive/pushes/{id}/rollback-preview`, which:

- Reads each target policy's **current state live from Graph** (real tenants) or from the stored state (demo tenants).
- Flags `wouldUnprotect: true` when the entity has flipped the policy from `enabledForReportingButNotEnforced` to `enabled`. A yellow *"Entity has flipped this to Enabled — rollback will un-enforce"* warning appears next to that row.
- Returns `alreadyGone: true` when a policy has already been deleted upstream, and specific `skipReason` values for ineligible rows (`already_rolledback`, `failed`, `no_policy_id`).

Operator deselects any row they don't want to touch. Scoped rollbacks leave the push_request in its prior status until every eligible action has actually been reversed.

### 8.3 Cross-tenant vs tenant-scoped custom policies

The custom CA wizard builds specs in one of two modes (see `lib/directive/custom-policies/types.ts`):

- **Cross-tenant** (default) — uses only values that mean the same thing in every Entra tenant: role template GUIDs (58), Microsoft-published app GUIDs, built-in auth strengths, `All`/`AllTrusted` locations, risk levels, platforms, client app types. Pushable to many entities at once.
- **Tenant-scoped** — binds to one reference tenant; enables specific users/groups (Graph typeahead), named locations, Terms of Use, custom authentication strengths from that tenant. The `/api/directive/custom-policies/[id]/push` route rejects any off-tenant target with `scope_mismatch`.

All tenant-local reference data is read through `lib/directive/custom-policies/ref-data.ts`, which handles both live Graph reads and demo-mode synthesis (5 users, 4 groups, 3 named locations, 2 ToU, 1 custom auth strength per demo tenant).

### 8.4 Database schema supporting all of the above

Two migrations (v9, v10; v11 was reserved for approval workflow and is intentionally unused):

- `directive_push_requests` — one row per push attempt. Columns include `baseline_id` (or `custom:<id>`), `status` (preview / executing / complete / failed / rolledback), `target_tenant_ids_json`, `summary_json`, actor + timestamps.
- `directive_push_actions` — one row per tenant per push. Stores `graph_policy_id` (null when idempotent or failed), `status`, `error_message`. Rollback walks these.
- `custom_ca_policies` — wizard drafts. `spec_json` carries the UI-oriented spec; `status` is `draft` / `archived`. Never holds a Graph body directly — the body is rebuilt from the spec by `builder.ts` at preview + push time.
- `directive_actions` — audit row per attempt. Never deleted.

### 8.5 What directive mode does **not** have

- **No two-person approval workflow.** Any admin can push. Deferred by user 2026-04-24; design sketched but not shipped. When it lands: push creates a pending request; a separate admin approves; only then does the fan-out run.
- **No PowerShell execution tier.** Everything shipped today targets Graph. Future phases that require PS (Exchange transport, DLP CRUD) must be explicitly approved before design.
- **No cross-tenant user/group ID resolution.** Tenant-scoped policies are genuinely bound to one tenant. To push the same logical policy to a different entity, clone the draft and re-pick user/group IDs. This is a deliberate simplification — full cross-tenant resolution (Phase 4 "scope mode v2") would need a per-tenant name-matching heuristic and push-time validation.
