# Microsoft Graph — Purview / Compliance Surface Reference

**As-of:** April 2026. Authoritative sources: learn.microsoft.com/graph + learn.microsoft.com/purview.

**Legend:** `GA` = v1.0, `B` = beta-only, `APP` = application permission supported, `DEL` = delegated only, `PS-ONLY` = not in Graph, `MT-RISK` = blocks multi-tenant automation.

**Purpose:** authoritative endpoint map for Purview/compliance signals — plus a ruthless inventory of what's **not** in Graph and must go through PowerShell.

> **Scope note (2026-04-19) — read-only, no PS tier.** This project consumes only Graph **read** endpoints for Purview. Every PS-ONLY surface below is a **write** path (policy CRUD) and is intentionally **out of scope**. Entities retain authorship of their own DLP / IRM / Communication Compliance / Retention / Information Barrier policies. The `PS-ONLY` annotations stay useful as "why we can't observe this writemode via Graph" context; they are not a to-do for this project.

---

## 1. Information Protection (MIP / Sensitivity Labels)

### Tenant-scope (read labels available across org)
- `GET /security/informationProtection/sensitivityLabels` — **GA**. Perm: `InformationProtectionPolicy.Read.All` (APP+DEL). Returns label definitions (display name, sensitivity, parent, actions). Supports `$expand=sublabels`.
- `GET /security/informationProtection/sensitivityLabels/{id}` — **GA**. Same perms.
- `GET /security/informationProtection/sensitivityLabels/{id}/sublabels` — **GA**.
- `POST /security/informationProtection/sensitivityLabels/evaluateApplication` — **B**. Computes which label to apply given current metadata + context.
- `POST /security/informationProtection/sensitivityLabels/evaluateClassificationResults` — **B**. Applies auto-classification result → recommended label.
- `POST /security/informationProtection/sensitivityLabels/evaluateRemoval` — **B**. Justification/downgrade flow.
- `POST /security/informationProtection/sensitivityLabels/extractContentLabel` — **B**. Inverse of `extractLabel`.

### User-scope (labels a specific user can see, including policy-targeted subset)
- `GET /users/{id}/security/informationProtection/sensitivityLabels` — **GA**. Perm: `InformationProtectionPolicy.Read` (DEL) or `InformationProtectionPolicy.Read.All` (APP).
- `GET /me/security/informationProtection/sensitivityLabels` — **GA**. Delegated.
- `GET /users/{id}/security/informationProtection/labelPolicySettings` — **GA**. Returns default label id, mandatory flag, justification requirement. **Gap: returns one consolidated policy view per user — you cannot list all publish/auto-label policies via Graph.**

### Legacy / deprecated (do not use)
- `/informationProtection/policy/labels`, `informationProtectionLabel: listLabels` — **DEPRECATED, data returns stopped 2023-01-01**. Migrate callers off these.

### Apply labels to items
- `POST /drives/{id}/items/{id}/assignSensitivityLabel` — **GA**. Perm: `Files.ReadWrite.All`.
- `POST /sites/{id}/drive/items/{id}/assignSensitivityLabel` — **GA**.
- Email: `ConvertTo-MIP` only via Graph Mail + extension; assignment is surfacing, not a dedicated action.

### Label usage / analytics / auto-labeling policies
- **GAP — PS-ONLY.** Label analytics (activity explorer counts, per-label application telemetry) is NOT in Graph. Signals are reachable only via the **Audit Log Query API** by filtering `recordTypeFilters` (e.g., `MIPLabel`, `SensitivityLabelAction`, `SensitivityLabeledFileAction`) or via the retiring **Office 365 Management Activity API**.
- Auto-labeling policy CRUD: **PS-ONLY** (Security & Compliance PowerShell `Get/Set-AutoSensitivityLabelPolicy`). **MT-RISK** for 100+ tenants.

---

## 2. Data Loss Prevention (DLP)

### Runtime evaluation (new Purview data-security surface)
- `POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute` — **B**. Perm: `ProtectionScopes.Compute.User` (DEL) / `.All` (APP). Returns applicable DLP + collection policy scopes for a user/app/location tuple.
- `POST /users/{id}/dataSecurityAndGovernance/processContent` — **B**. Perm: `ContentActivity.Write` (APP). Submits LLM prompt / file / text for runtime DLP verdict (`evaluateInline` vs `evaluateOffline`). This is the designated path for Copilot / LOB / RAG integration.
- `POST /copilot/interactionHistory/getAllEnterpriseInteractions` — **B** (related, Purview-facing).
- `/security/dataSecurityAndGovernance/activities/contentActivities` — **B**. Ingest user-activity events for Purview processing.

### Policy CRUD + alerts
- DLP **policy CRUD**: **GAP — NOT in Graph**. Still `New-/Set-DlpCompliancePolicy`, `New-/Set-DlpComplianceRule` in Security & Compliance PowerShell. **MT-RISK: hard blocker for multi-tenant config automation.** Community `Get-/New-MgBetaInformationProtectionDataLossPreventionPolicy` PowerShell cmdlets wrap a **deprecated** beta endpoint (`/me/informationProtection/dataLossPreventionPolicies`) — do not build on it.
- DLP **alerts**: **Available via `/security/alerts_v2`** with `serviceSource = 'microsoftPurviewDataLossPrevention'`. **GA**.
- `evaluatePoliciesForUser`: **Never promoted beyond early beta**, effectively superseded by `/dataSecurityAndGovernance/protectionScopes/compute`.
- Endpoint DLP telemetry: surfaces as audit records (`Endpoint`, `DLPEndpoint` record types) + alerts_v2, not a dedicated resource.

---

## 3. Insider Risk Management (IRM)

- **GAP — no dedicated case/policy CRUD in Graph.** There is no `/security/cases/insiderRiskCases` resource in v1.0 or beta as of 2026-04.
- **Alert access: `/security/alerts_v2`** with `serviceSource = 'microsoftPurviewInsiderRiskManagement'` — **GA**. This is the only officially documented Graph path for IRM signals. Perm: `SecurityAlert.Read.All` (APP+DEL).
- User-level risk signals: available in advanced-hunting tables (`IRM*` schemas) via `POST /security/runHuntingQuery` — **GA**, `ThreatHunting.Read.All` (APP+DEL).
- Case/policy/indicator CRUD, user-health scores, export-event triggers: **PS-ONLY** (`Get-/New-InsiderRiskPolicy`, `Get-InsiderRiskCaseInfo`). **MT-RISK.**
- Data Security Investigations (new 2025 surface): portal + PowerShell only; no Graph resource published.

---

## 4. Communication Compliance

- **GAP — severe.** Communication Compliance policy CRUD, review queue, and remediation actions are **PS-ONLY** (`Get-/New-SupervisoryReviewPolicyV2`, `Get-/New-SupervisoryReviewRule`). **MT-RISK.**
- Alerts ARE in unified `/security/alerts_v2` with `serviceSource = 'microsoftPurviewCommunicationCompliance'` — **GA**.
- Teams-side DLP/comms-compliance policy-violation update (the only CRUD in Graph for this domain): `PATCH /teams/{id}/channels/{id}/messages/{id}` or `/chats/{id}/messages/{id}` — **GA**, perm `ChatMessage.UpdatePolicyViolation.All` (APP). License: Communications DLP SKU required.

---

## 5. eDiscovery (Premium)

All under `/security/cases/ediscoveryCases`. **Promoted to GA (v1.0) for E5** in 2024; eDiscovery Standard (E3) Graph API reached GA in 2025.

| Resource | Path | GA/B | App-only? |
|---|---|---|---|
| Case | `/security/cases/ediscoveryCases` | GA | **Create = DEL only** (MT-RISK). Read/update/close/reopen = APP OK with prerequisites. |
| Custodian | `…/{caseId}/custodians` | GA | APP OK |
| Non-custodial data source | `…/{caseId}/noncustodialDataSources` | GA | APP OK |
| Hold | custodian/source → `applyHold`/`removeHold` | GA | APP OK |
| Search | `…/{caseId}/searches` | GA | APP OK (incl. estimate stats, export report) |
| Review set | `…/{caseId}/reviewSets` | GA | APP OK |
| Review set query | `…/reviewSets/{id}/queries` | GA | APP OK |
| Tag | `…/{caseId}/tags` | GA | APP OK |
| Export | `…/reviewSets/{id}/export` (action) | GA | APP OK |
| Operations (long-running jobs) | `…/{caseId}/operations` | GA | APP OK |

Perm: `eDiscovery.Read.All` / `eDiscovery.ReadWrite.All` (APP + DEL). **Mandatory setup: service principal must be added to `eDiscoveryAdministrator` role via `Add-eDiscoveryCaseAdmin` PowerShell in each tenant** before APP calls succeed — per-tenant onboarding overhead. Legacy `microsoft.graph.eDiscovery` namespace is **deprecated**; use `microsoft.graph.security` paths.

**App-only still cannot create a case** (case creation = DEL). MT-RISK for zero-touch provisioning of cases.

---

## 6. Audit Log

- `POST /security/auditLog/queries` — Create async job. **Oscillating GA ↔ Beta**: promoted to v1.0 2024-11, reverted to beta April 2025, re-promotion expected. Treat as **B** for design safety. Perm: `AuditLogsQuery.Read.All` (APP+DEL) plus finer-grained per-workload perms (`AuditLogsQuery-Exchange.Read.All`, `AuditLogsQuery-SharePoint.Read.All`, `AuditLogsQuery-CRM.Read.All`, `AuditLogsQuery-OneDrive.Read.All` etc.) — least-privilege split is mandatory.
- `GET /security/auditLog/queries/{id}` — poll status.
- `GET /security/auditLog/queries/{id}/records` — fetch `auditLogRecord` collection. **999 records per page, paginate via `@odata.nextLink`**. Results retained ~30 days after job.
- Filters: `filterStartDateTime`, `filterEndDateTime`, `recordTypeFilters[]` (enum with 100+ workloads including MIP, DLP, Endpoint DLP, IRM), `keywordFilter`, `serviceFilter`, `operationFilters[]`, `userPrincipalNameFilters[]`, `ipAddressFilters[]`, `objectIdFilters[]`, `administrativeUnitIdFilters[]`.
- **Retention config (set 10-year retention, assign policies)**: **PS-ONLY** (`New-UnifiedAuditLogRetentionPolicy`). **MT-RISK.**
- Legacy Office 365 Management Activity API still returns richer real-time streaming but is on an announced deprecation glide path; new builds should target the Graph query API.

---

## 7. Records Management / Retention

Namespace: `microsoft.graph.security` → `/security/labels/*`, `/security/triggers*`.

- `GET/POST/PATCH/DELETE /security/labels/retentionLabels` — **GA**. Perm: `RecordsManagement.Read.All` / `RecordsManagement.ReadWrite.All`. **App-only + delegated both supported** for labels.
- `/security/labels/retentionLabels/{id}/descriptors/{authority|category|citation|department|filePlanReference}` — **GA**. File plan descriptors.
- `/security/triggers/retentionEvents` + `/security/triggerTypes/retentionEventTypes` — **GA**. Event-based retention CRUD.
- Apply label to driveItem: `PATCH /drives/{id}/items/{id}/retentionLabel` — **GA**.
- **Retention *policies* (publish to locations) + Disposition Reviews**: **GAP — PS-ONLY** (`New-RetentionCompliancePolicy`, `Get-ComplianceRetentionEvent`). **MT-RISK.** Only the labels themselves and event triggers are Graph-addressable.

---

## 8. Data Governance / Data Catalog (Purview Fabric side)

- **Split is real.** M365 compliance-side Purview = Microsoft Graph (`/security`, `/informationProtection`, `/dataSecurityAndGovernance`). Fabric/Azure data-governance (former Azure Purview Data Map, now Unified Catalog) is **NOT on graph.microsoft.com**. It uses its own Purview REST at `{account}.purview.azure.com` + `api.purview-service.microsoft.com`, plus the Azure Resource Manager provider `Microsoft.Purview`.
- For a posture dashboard scoped to M365 E5 tenants, the Fabric data-map APIs are out-of-scope unless entities are explicitly onboarded. Call-out: **no Graph bridge exists**; any data-map signals must be sourced via the Purview account endpoint per-tenant (needs Purview account + managed identity in each tenant — heavy).

---

## 9. Compliance Manager

- **GAP — no Graph endpoints.** No `/security/complianceManagementPartners/*assessments*` resource ships. `complianceManagementPartner` under `/deviceManagement` is Intune MDM partner config, unrelated to Compliance Manager scoring.
- Score, assessments, improvement actions, templates (NCA/NESA/ISR included among the 350+ built-in templates): **reachable only via the Purview portal + Service Assurance / Compliance Manager export, and via audit records in the AuditLog Query API** (`recordType = ComplianceManager`). **MT-RISK** for programmatic score retrieval at scale.
- Custom regulatory templates: portal-only upload today.

---

## 10. Information Barriers

- **GAP — PS-ONLY** for policy/segment CRUD (`New-/Get-OrganizationSegment`, `New-/Get-InformationBarrierPolicy`, `Start-InformationBarrierPoliciesApplication`). **MT-RISK.**
- Segment *attributes* are read from Entra ID user attributes (`department`, `jobTitle`, custom extension attributes) via `/users` — **GA** — so you can read the inputs, not the policies.

---

## 11. Customer Lockbox / PAM / Customer Key

- **All three: NOT in Graph.**
- Customer Lockbox enable/approve/deny — **PS-ONLY** (`Set-AccessToCustomerDataRequest`, `Approve-AccessToCustomerDataRequest`).
- Privileged Access Management (task-based M365 PAM, distinct from PIM): **PS-ONLY**.
- Customer Key: Azure Key Vault (ARM) + Exchange PS only.
- **MT-RISK across all three.** Dashboard can surface *whether enabled* only via audit records or per-tenant PS runbooks.

*(Entra PIM — different service — IS on Graph at `/roleManagement/directory/*` and is fully APP-capable. Don't confuse with M365 PAM.)*

---

## 12. Cross-workload Compliance Signals in Graph

- **Teams DLP / policy-violation update**: `PATCH /chats/{id}/messages/{id}` and `/teams/.../messages/{id}` with `policyViolation` payload — **GA**, APP (`ChatMessage.UpdatePolicyViolation.All`).
- **SharePoint external sharing posture**: `GET /admin/sharepoint/settings` — **GA**, perm `SharePointTenantSettings.Read.All` (APP+DEL). Properties: `sharingCapability`, `isResharingByExternalUsersEnabled`, `availableManagedPathsForSiteCreation`, `idleSessionSignOut`, `deletedUserPersonalSiteRetentionPeriodInDays`. Per-site: `GET /sites/{id}` (`sharingCapability` via beta expansion).
- **Exchange mail-flow DLP events**: **PS-ONLY** message-trace V2 (`Get-MessageTraceV2`); DLP-specific outcomes surface via alerts_v2 + audit records. No streaming Graph equivalent. **MT-RISK for real-time mail DLP.**
- **Threat assessment** (`/informationProtection/threatAssessmentRequests`): **GA**. Submit mail/URL/file for rescan; small perm surface. Throttle limits are strict (see §14).

---

## 13. Subject Rights Requests

- `GET/POST/PATCH /security/subjectRightsRequests` — **GA**. Perm: `SubjectRightsRequest.Read.All` / `.ReadWrite.All` (APP+DEL). Rich KQL `contentQuery`, mailbox + site location filters, stage telemetry, final report stream. **Legacy `/privacy/subjectRightsRequests` retired 2025-03-30** — don't call it.

---

## 14. Throttling / Rate Limits (documented)

- **Global**: 130,000 requests / 10 s per app across all tenants.
- **Advanced hunting (`/security/runHuntingQuery`)**: ≥45 calls/min per tenant; 100K rows/query; 50 MB result cap; 3-min per-request timeout; per-tenant CPU quota on 15-min cycle.
- **Information Protection threat assessment POSTs**: 150 / 15 min and 10,000 / 24 h per tenant; 1 / 15 min and 3 / 24 h per resource (recipient/msg-id pair).
- **`/security` generic** and **`/security/ediscoveryCases`**: documented as having "specific limits" but numeric values not published. **GAP — design for 429-with-Retry-After backoff; don't assume headroom.**
- **`/security/auditLog/queries`**: undocumented quantitative limit; practical ceiling of ~3 concurrent jobs per tenant observed. **GAP.**
- **`/dataSecurityAndGovernance/*`**: limits undocumented (Microsoft Q&A still open). **GAP** — this is the runtime DLP path, assume conservative (<30 calls/s per tenant) until Microsoft publishes.

---

## 15. Change Notifications (Webhooks)

| Resource | Subscription supported? | Max lifetime |
|---|---|---|
| `/security/alerts_v2` (alert) | **YES, GA**. `resource = "security/alerts"` or filtered equivalent | ~3 days |
| `/security/incidents` | **YES, B** | ~3 days |
| `/security/cases/ediscoveryCases` and children | **NO** (undocumented). **GAP — poll via `operations`.** | — |
| `subjectRightsRequest` | **YES** via `resource = "security/subjectRightsRequests"` (B) | ~3 days |
| `auditLogQuery` | **NO**. Poll `status` field. | — |
| `retentionLabel`, `retentionEvent` | **NO** | — |
| `dataSecurityAndGovernance/*` | **NO** | — |
| `sensitivityLabel` | **NO** | — |

Webhook validation: 3 s to 200 OK, 10 s hard cap (persist & 202). Delivery channels: webhooks, Azure Event Hubs, Azure Event Grid. **For the 100-tenant dashboard: only alerts + incidents + SRR fan-out via notifications; everything else needs polling jobs.**

---

## Summary of Dashboard Risk Areas (ordered by severity)

1. **DLP/IRM/Comm-Compliance/IB/Auto-label policy CRUD is PS-only** — unavoidable per-tenant PowerShell workers.
2. **eDiscovery case creation is delegated-only** — need service-account with cert-based delegated flow, or portal bootstrap.
3. **Compliance Manager scoring has zero Graph surface** — posture index must synthesize from audit records + alerts + secure score, not from the official CM score.
4. **Fabric / Data Governance is on a different API surface** — exclude from v1 or build separate per-tenant Purview-account connector.
5. **Throttling numbers for `/security`, `/dataSecurityAndGovernance`, `/security/auditLog` are not published** — design for aggressive 429 backoff and per-tenant concurrency caps.
6. **Audit Log Query API is oscillating GA↔beta** — build against beta schema, feature-flag GA.
7. **eDiscovery + records management require role membership on the SPN** per tenant (`eDiscoveryAdministrator`, `Records Management`) — PS bootstrap during tenant onboarding.
8. **No webhooks for eDiscovery cases, audit queries, retention, or MIP** — polling architecture required for 5 of the 10 domains.

---

## Sources

- [Microsoft Graph security API overview (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview?view=graph-rest-1.0)
- [Microsoft Purview data security and governance overview](https://learn.microsoft.com/en-us/graph/security-datasecurityandgovernance-overview)
- [Microsoft Purview Information Protection labeling overview](https://learn.microsoft.com/en-us/graph/security-information-protection-overview)
- [Records management API overview (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/security-recordsmanagement-overview?view=graph-rest-1.0)
- [eDiscovery API overview (beta)](https://learn.microsoft.com/en-us/graph/api/resources/ediscovery-ediscoveryapioverview?view=graph-rest-beta)
- [Set up app-only access for Purview eDiscovery](https://learn.microsoft.com/en-us/graph/security-ediscovery-appauthsetup)
- [auditLogQuery resource (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/security-auditlogquery?view=graph-rest-1.0)
- [alert (alerts_v2) resource (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/security-alert?view=graph-rest-1.0)
- [subjectRightsRequest resource (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/subjectrightsrequest?view=graph-rest-1.0)
- [Microsoft Graph compliance & privacy APIs overview](https://learn.microsoft.com/en-us/graph/compliance-concept-overview)
- [Microsoft Graph throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [Microsoft Graph change notifications overview](https://learn.microsoft.com/en-us/graph/change-notifications-overview)
- [sensitivityLabel resource (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/security-sensitivitylabel?view=graph-rest-1.0)
- [GA of Purview eDiscovery Graph API for E3](https://techcommunity.microsoft.com/blog/microsoft-security-blog/general-availability-of-microsoft-purview-ediscovery-graph-api-for-e3-customers/4489678)
- [Audit log retention policies (Purview)](https://learn.microsoft.com/en-us/purview/audit-log-retention-policies)
- [Share Insider Risk Management data with other solutions](https://learn.microsoft.com/en-us/purview/insider-risk-management-settings-share-data)
- [Information Barriers attributes](https://learn.microsoft.com/en-us/purview/information-barriers-attributes)
- [sharepointSettings resource (v1.0)](https://learn.microsoft.com/en-us/graph/api/resources/sharepointsettings?view=graph-rest-1.0)
- [Microsoft Purview Compliance Manager overview](https://learn.microsoft.com/en-us/purview/compliance-manager)
- [Use Microsoft Purview APIs (Purview SDK overview — Fabric side)](https://learn.microsoft.com/en-us/purview/developer/microsoft-purview-sdk-documentation-overview)
