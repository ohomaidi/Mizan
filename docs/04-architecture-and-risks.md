# Architecture, Multi-Tenant Patterns, and Risk Register

**Scope:** how Mizan reaches connected entity tenants, the throttling envelope it must live inside, and the risks to name in the board deck.

> **Scope reversal (2026-04-20) — productization pivot.** The project is being white-labeled. Multi-framework mapping (NESA / NCA / ISR / Generic) is back in scope; NESA-only is out. MSAL user-auth + RBAC are back in scope. Two Azure deployment variants ship: shared-key SMB (simple, locked-down tenants block it) and NFS (more resources, works under MCA policy). See §7 below.

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

~~Write-scoped perms (`Policy.ReadWrite.ConditionalAccess`, `CustomDetection.ReadWrite.All`, `RecordsManagement.ReadWrite.All`)~~ — **[deferred]**, out of scope for this read-only engagement.

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

## 4. PowerShell automation tier — **[deferred, out of scope]**

Preserved here as a record of PS-only surfaces. None of this tier is in scope for the read-only project: Council does not author or deploy policies, so these cmdlet families are not orchestrated by the platform. Retained for continuity in case a future write-tier engagement is authorized.

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
| 2 | ~~DLP / IRM / Comm Compliance / IB / auto-label / retention-policy CRUD is PowerShell-only.~~ | **[deferred]** — entities retain policy authorship in their own tenants. The Council does not push policies, so this isn't a risk against the current scope. | — |
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

---

## 6. Decisions still open

Track these with the Council before Phase 1 kickoff. See also the open-questions list in [`01-feature-catalog.md`](01-feature-catalog.md).

- ~~Framework priority~~ **Resolved 2026-04-19: UAE NESA.**
- **Entity clustering** final list (slide 6 shows Police / Health / Edu / Municip. / Utilities / Transport).
- **Azure region** for dashboard backend + Sentinel workspace.
- **Target maturity threshold** — Council-tunable at runtime via Settings → Maturity Index (default 75).
- ~~Policy deployment authority~~ **Resolved 2026-04-19: no push. Read-only scope.**
- **Credential bootstrap owner** — Council central team or per-entity CISO?

---

## 7. Deployment topology (Azure Container Apps)

Two flavors of ACA deployment ship. Same container image (`ghcr.io/ohomaidi/mizan`), same app code, different persistence + networking around it.

### 7.1 Variant A — shared-key SMB (default; simplest)

```
                   ┌─────────────────────────────────┐
                   │  Azure Container Apps (public)  │
public HTTPS ───►  │  mizan-app-<uniq>               │
                   │   ingress (auto TLS)            │
                   │   liveness: /api/auth/me        │
                   │   CSI mount /data via SMB/CIFS  │
                   └────────────┬────────────────────┘
                                │  shared-key auth
                                ▼
                   ┌─────────────────────────────────┐
                   │  Storage account (Standard_LRS) │
                   │  allowSharedKeyAccess: true     │
                   │  file share "mizan-data" (50GB) │
                   └─────────────────────────────────┘
```

Falls over when `StorageAccount_DisableLocalAuth_Modify` policy silently flips `allowSharedKeyAccess` to `false` on update. Mount returns `mount error(13): Permission denied`.

### 7.2 Variant B — NFS + private endpoint (policy-compliant)

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

Why this works under tight policy: NFS 4.1 auth is network-level (private endpoint + VNet ACL) instead of account-key. `allowSharedKeyAccess: false` is actually the *required* state for NFS — the Bicep sets it explicitly.

Cost delta: Premium_LRS FileStorage minimum ~100GB ⇒ ~$15/mo. Private endpoint ~$7/mo. Total uplift ~$10–15/mo over Variant A.

### 7.3 Why an in-place migration isn't possible

ACA Managed Environments have **immutable `vnetConfiguration`** — Azure forbids adding VNet integration to an existing environment, even with `--yes`. Switching from Variant A → B requires deleting the env, its Container App, and the existing storage account + share, then running the NFS Bicep. Cleanup commands in [`10-deployment.md`](10-deployment.md#migrating-from-variant-a--variant-b).

### 7.4 Hardening checklist for production

- [ ] Swap `allowPublicNetworkAccess` on the Premium storage account from the default (Variant A) to `Disabled` (already the case in Variant B).
- [ ] Bind a custom domain to the Container App and issue a managed cert.
- [ ] Update both Entra app registrations' redirect URIs to the custom domain.
- [ ] Enable diagnostic settings on the Container App → Log Analytics for 30-day audit retention.
- [ ] Add a daily sync trigger: Azure Function or Logic App hitting `/api/sync` with the shared `X-Sync-Secret` header.
- [ ] Rotate the user-auth client secret on a 90-day cycle; plan for cert-based MSAL + Key Vault at year one.
