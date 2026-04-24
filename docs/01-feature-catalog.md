# Feature Catalog — Mizan

**Purpose:** enumerate every Graph capability Mizan can deliver — what it reads (every deployment) and what it writes (directive deployments only), each mapped to concrete endpoints. This doc is the Graph-facing reference. For the step-by-step operator manual see [`12-operating-manual.md`](12-operating-manual.md).

> **Scope as of 2026-04-24 — two deployment modes.**
>
> - **Observation mode** (default, e.g. Sharjah Cybersecurity Center / SCSC) — the 18 read-only signals listed below. Never writes to an entity's tenant. Framework is configurable per customer (UAE NESA, KSA NCA, ISR/ISO, generic).
> - **Directive mode** (e.g. Dubai Electronic Security Center / DESC) — observation + a write tier: reactive Graph writes (incident dispositions, threat submissions, user session revoke), Conditional Access baseline pushes (12 curated), custom CA policy wizard, idempotent push + rollback + per-entity status view.
>
> Earlier versions of this doc marked write paths as "[deferred]". Those have landed for directive-mode deployments; the marker is now kept only against capabilities still genuinely deferred (Intune / DLP / labels / Defender for Office / Exchange / SP-Teams / PIM / app consent / attack simulation / tenant-wide identity defaults). See the canonical phase roadmap in Claude memory `project_sharjah_council_backlog.md`.

---

## 0. Architectural truth first

Before features: three realities that shape every design decision.

1. **Auth model.** Observation deployments use a single multi-tenant **Graph-Signals** Entra app, admin-consent flow in each of the 100+ entity tenants, one app-only token per tenant, fan-out polling with per-tenant workers. **Directive deployments add a second multi-tenant Entra app (the Directive app)** holding writable scopes; entities opt into directive mode with a separate admin-consent step. GDAP requires CSP status; Lighthouse is Azure-only. Target ~5 concurrent workers (see `SCSC_SYNC_CONCURRENCY`), MSAL token cache, `Retry-After`-aware HTTP client.
2. **PowerShell worker pool remains out of scope.** The ~8 PowerShell-only compliance domains (DLP / IRM / Communication Compliance / Retention *policies* / Information Barriers / Auto-labeling / Audit retention / Compliance Manager) stay policy-authoring surfaces the entities manage themselves. Directive writes today target **Graph-only** endpoints. If future phases need PS (likely for Exchange transport rules + some retention), the architecture note in `04-architecture-and-risks.md §4` returns from deferred to a design decision the user must green-light.
3. **Change notifications are thin.** Only `alerts_v2`, `incidents`, and Subject Rights Requests support webhooks. Everything else is polling — design the pipeline around that.

---

## 1. Maturity Index — the headline number on slide 6

Composite per-entity score, 0–100, computed daily. Drives ranking, benchmarking, and remediation direction from the top.

### Inputs

| Sub-score | Weight (initial) | Source |
|---|---|---|
| Secure Score (normalized) | 25% | `/security/secureScores`, `/security/secureScoreControlProfiles` |
| Identity posture | 20% | `/identity/conditionalAccess/policies`, `/identityProtection/riskyUsers`, `/roleManagement/directory/*` |
| Device posture | 15% | `/deviceManagement/managedDevices`, `/deviceCompliancePolicies` |
| Data protection | 15% | Sensitivity label adoption (audit), DLP alert rate from `alerts_v2` |
| Threat response hygiene | 15% | Mean time to acknowledge / resolve from `/security/incidents` |
| Compliance framework alignment (NESA) | 10% | Synthesized UAE NESA mapping — **no native Compliance Manager API** |

### Call-outs
- Compliance sub-score synthesizes UAE NESA alignment from Secure Score control mappings + audit records. **No Graph API** for the actual Compliance Manager score. Flag this limitation in governance reporting.
- Weights are initial. Council sets final weights via Settings → Maturity Index at runtime.
- NCA and ISR framework mappings are **[deferred]** — the current scope maps only to UAE NESA.

---

## 2. Identity & Access Observatory

| Feature | Graph source | Cadence |
|---|---|---|
| Risky user / detection live feed | `/identityProtection/riskyUsers`, `/riskDetections` | 15-min poll (1 rps/tenant cap — stagger) |
| Conditional Access policy drift | `/identity/conditionalAccess/policies` | Daily snapshot diff |
| PIM standing-access sprawl | `/roleManagement/directory/roleAssignmentSchedules`, `/roleEligibilitySchedules` | Daily |
| Sign-in anomaly rollup | `/auditLogs/signIns` | Near-real-time via Sentinel Entra connector |
| Privileged account count (GA sprawl) | `/roleManagement/directory/roleAssignments` | Daily |
| Legacy auth usage heatmap | `/auditLogs/signIns` (filter `clientAppUsed`) | Daily |
| MFA enforcement % | CA policies + sign-ins | Daily |
| Break-glass account audit | `/users` + CA exclusions + sign-in monitoring | Daily |

**Council KPI target:** "eliminate standing access" — PIM eligibility % vs active assignment %.

---

## 3. Threat & Incident Operations (shared with Pillar 2 SOC)

| Feature | Graph source | Notes |
|---|---|---|
| Unified incidents across all 100+ tenants | `/security/incidents` + `$expand=alerts` | 5-min poll with `lastUpdateDateTime` watermark |
| Unified alerts feed | `/security/alerts_v2` | `$filter` on `serviceSource`, `severity`, `status` |
| Advanced Hunting KQL packs | `POST /security/runHuntingQuery` | **45 calls/min/tenant cap** — serialize per tenant |
| Custom Detections sync | `/security/rules/detectionRules` (beta) | Council-authored KQL pushed to every tenant |
| Threat Intelligence overlay | `/security/threatIntelligence/*` (hosts, IPs, indicators, articles) | Requires Defender TI license |
| Defender for Identity sensor health | `/security/identities/healthIssues`, `/sensors` | 15-min |
| Attack Simulation results rollup | `/security/attackSimulation/simulations` | Weekly |
| Phish / spam submissions | `/security/threatSubmission/*` | Event-driven |

### Pre-built KQL packs (starter set)
- Ransomware precursors (MDE LOLBin chain)
- OAuth consent abuse
- Token theft patterns
- Lateral movement via Kerberoasting
- Suspicious admin role assignment

### Gap
- **Device response actions** (isolate, quarantine file, AV scan) are **not in Graph** — MDE direct API required for automation. Pillar 3 MTO handles the analyst UX side.

### Shipped in v1.1 — Vulnerability Management (Defender TVM)

CVE posture is now a first-class surface. We query `DeviceTvmSoftwareVulnerabilities` via `/security/runHuntingQuery` (two parallel KQL queries per tenant):

- Per-CVE rollup: severity, CVSS, known-exploit flag, affected device count, remediated device count (where derivable), publishedDateTime
- Per-device rollup: device name, OS platform, total CVE count, criticals/highs/mediums/lows, max CVSS, the list of CVE IDs on that host

Three UI surfaces:

- `/vulnerabilities` — fleet rollup with **cross-tenant CVE correlation** (CVEs present in 2+ entities, expandable per-entity device drill-down — the Council-unique view that no individual CISO can produce), top-CVEs, by-entity posture.
- Entity sub-tab — all CVEs + all devices with bidirectional expand; CVE row shows affected hosts, device row shows CVEs on that host.
- Entity Overview — top-5 CVEs card sorted by severity → exposed-device count → CVSS.

Graceful fallback when the tenant lacks Defender VM P2 — KQL returns 400, fetcher treats it as "not licensed" and emits an empty payload with a helpful UI banner rather than failing the sync.

Still-missing Defender-direct surfaces:
- **MDE exposure score / recommendations / missing KBs / software inventory** — not in Graph, still requires `api.securitycenter.microsoft.com` per tenant. Not shipped.

---

## 4. Data Protection Posture (Purview)

| Feature | Graph source | Notes |
|---|---|---|
| Sensitivity label catalog diff | `/security/informationProtection/sensitivityLabels` (beta) | Compare each entity vs Council baseline |
| Label adoption telemetry | `/security/auditLog/queries` filtered on `MIPLabel`, `SensitivityLabelAction` | Weekly rollup |
| DLP alert density by category | `/security/alerts_v2?serviceSource=microsoftPurviewDataLossPrevention` | Real-time |
| Endpoint DLP activity heatmap | `/security/auditLog/queries` (`DLPEndpoint` records) | Daily |
| Insider Risk alert feed | `/security/alerts_v2?serviceSource=microsoftPurviewInsiderRiskManagement` | Real-time |
| Communication Compliance alerts | `/security/alerts_v2?serviceSource=microsoftPurviewCommunicationCompliance` | Real-time |
| Subject Rights Requests throughput | `/security/subjectRightsRequests` | Privacy KPI |
| External sharing posture | `/admin/sharepoint/settings` | Daily |
| eDiscovery case inventory | `/security/cases/ediscoveryCases` | On-demand |
| Retention label coverage | `/security/labels/retentionLabels` | Daily |

### Gaps (PS-only surfaces) — **[deferred, all write-side]**
- DLP policy CRUD → PowerShell (`New-/Set-DlpCompliancePolicy`)
- IRM policy/case CRUD → PowerShell
- Communication Compliance policy CRUD → PowerShell (`New-SupervisoryReviewPolicyV2`)
- Retention *policies* (not labels) → PowerShell (`New-RetentionCompliancePolicy`)
- Information Barriers → PowerShell
- Auto-labeling policy CRUD → PowerShell (`New-AutoSensitivityLabelPolicy`)
- Audit log retention policy → PowerShell (`New-UnifiedAuditLogRetentionPolicy`)
- eDiscovery case *creation* → delegated-only (app-only cannot create; read/update OK)

All of the above are **write paths** — creating or modifying policy objects inside entity tenants. The current project is read-only, so the Council platform does not call any of these. Entities continue to author policies in their own tenants using their own tooling.

---

## 5. Device & Endpoint Hygiene (Intune)

| Feature | Graph source | Cadence |
|---|---|---|
| Compliance % by OS / by entity | `/deviceManagement/managedDevices` | Hourly (`$filter=lastSyncDateTime`) |
| Non-compliant device drill-down | `/deviceManagement/managedDevices?$filter=complianceState eq 'noncompliant'` | Hourly |
| Autopilot / enrollment coverage | `/deviceManagement/windowsAutopilotDeviceIdentities` | Daily |
| BitLocker / Secure Boot / TPM attestation | `managedDevice.deviceHealthAttestationState` | Daily |
| App protection (MAM) policy presence | `/deviceAppManagement/managedAppPolicies` | Daily |
| Compliance policy inventory | `/deviceManagement/deviceCompliancePolicies` | Daily |
| Settings Catalog configuration drift | `/deviceManagement/configurationPolicies` (beta) | Daily |
| Mobile Threat Defense integration status | `managedDevice.partnerReportedThreatState` | Daily |
| Device wipe / retire / remote-lock actions | `/deviceManagement/managedDevices/{id}/retire` etc. | On-demand, requires `DeviceManagementManagedDevices.PrivilegedOperations.All` |

---

## 6. Governance & Standards (the Council's distinctive tier)

Mizan is a federated **observability** layer for observation-mode customers (entity SOCs retain full policy autonomy). Directive-mode customers get the same observability layer plus a curated write tier — see [`12-operating-manual.md §B`](12-operating-manual.md) for the operator flow.

| Feature | Mechanism | Status |
|---|---|---|
| **Control Benchmark** — every entity scored against a baseline | Baseline = curated target per sub-score. Dashboard shows % aligned per entity. | ✅ Shipped |
| **Maturity Index ranking** | Composite 0–100 score, tunable weights + target | ✅ Shipped |
| **Multi-framework mapping** | UAE NESA / KSA NCA / ISR & ISO 27001 / generic — per-customer at install time, editable via Settings | ✅ Shipped |
| **Unified Audit Search (read)** | `/security/auditLog/queries` across all tenants with workload-scoped least-privilege permissions. | 🟡 Shipped as label-adoption query; broader use planned |
| **Cross-entity eDiscovery (read)** | Read existing cases via `/security/cases/ediscoveryCases`. Creation stays in each entity's own tenant. | 🟡 Planned (read-only) |
| **Attack Simulation benchmark** | Phish click rate per entity from `/security/attackSimulation`. | ✅ Shipped (read) |
| **Executive reporting pack** | Monthly PDF/PPT auto-generated from the maturity index, delivered to leadership. | 🟡 Planned |
| **Policy Deployment Service — Conditional Access (Graph)** | 12 curated CA baselines + custom CA wizard, idempotent push, per-entity status, pre-flight rollback preview, tenant-scoped wizard mode | ✅ Shipped — **directive deployments only** |
| **Policy Deployment Service — Intune (Graph)** | Device compliance + app-protection / MAM + device configuration baselines | 🟡 Phase 5 — next |
| **Policy Deployment Service — Purview DLP / labels / retention (Graph)** | DLP / sensitivity-label / retention-label / retention-policy push | 🟡 Phases 6–8 |
| **Policy Deployment Service — Defender for Office / Exchange / SP-Teams / PIM / App consent / Attack sim / Tenant identity defaults** | See roadmap | 🟡 Phases 9–15 |
| Two-person approval workflow before push | Reviewer/approver split | 🟡 Deferred by user 2026-04-24 |
| ~~Policy Deployment Service (PS tier)~~ | DLP / IRM / Comm Compliance / Info Barriers PS runbooks | **[deferred]** — reopens only if Exchange transport rules force the question |

---

## Feature-to-Graph-endpoint summary

Quick reference, one line per feature, for design review:

| # | Feature | Primary endpoint | Perm | App-only? |
|---|---|---|---|---|
| 1 | Secure Score | `/security/secureScores` | `SecurityEvents.Read.All` | ✅ |
| 2 | Secure Score control detail | `/security/secureScoreControlProfiles` | `SecurityEvents.Read.All` | ✅ |
| 3 | Incidents | `/security/incidents` | `SecurityIncident.Read.All` | ✅ |
| 4 | Alerts | `/security/alerts_v2` | `SecurityAlert.Read.All` | ✅ |
| 5 | Advanced Hunting | `/security/runHuntingQuery` | `ThreatHunting.Read.All` | ✅ |
| 6 | Custom Detections | `/security/rules/detectionRules` (beta) | `CustomDetection.Read.All` | ✅ |
| 7 | Threat Intelligence | `/security/threatIntelligence/*` | `ThreatIntelligence.Read.All` | ✅ |
| 8 | MDI sensor health | `/security/identities/healthIssues` | `SecurityIdentitiesHealth.Read.All` | ✅ |
| 9 | Attack Simulation | `/security/attackSimulation/*` | `AttackSimulation.Read.All` | ✅ |
| 10 | Threat Submissions | `/security/threatSubmission/*` | `ThreatSubmission.Read.All` | ✅ |
| 11 | Risky users | `/identityProtection/riskyUsers` | `IdentityRiskyUser.Read.All` | ✅ |
| 12 | Risk detections | `/identityProtection/riskDetections` | `IdentityRiskEvent.Read.All` | ✅ |
| 13 | CA policies | `/identity/conditionalAccess/policies` | `Policy.Read.All` | ✅ |
| 14 | PIM role assignments | `/roleManagement/directory/roleAssignmentSchedules` | `RoleManagement.Read.Directory` | ✅ |
| 15 | PIM role eligibility | `/roleManagement/directory/roleEligibilitySchedules` | `RoleEligibilitySchedule.Read.Directory` | ✅ |
| 16 | Sign-in logs | `/auditLogs/signIns` | `AuditLog.Read.All` | ✅ |
| 17 | Directory audits | `/auditLogs/directoryAudits` | `AuditLog.Read.All` | ✅ |
| 18 | Managed devices | `/deviceManagement/managedDevices` | `DeviceManagementManagedDevices.Read.All` | ✅ |
| 19 | Compliance policies | `/deviceManagement/deviceCompliancePolicies` | `DeviceManagementConfiguration.Read.All` | ✅ |
| 20 | Sensitivity labels | `/security/informationProtection/sensitivityLabels` (beta) | `InformationProtectionPolicy.Read.All` | ✅ |
| 21 | Retention labels | `/security/labels/retentionLabels` | `RecordsManagement.Read.All` | ✅ |
| 22 | Audit log query | `/security/auditLog/queries` | `AuditLogsQuery.Read.All` + per-workload | ✅ |
| 23 | eDiscovery cases (read/update) | `/security/cases/ediscoveryCases` | `eDiscovery.Read.All` | ✅ (create: ❌ DEL-only) |
| 24 | Subject Rights Requests | `/security/subjectRightsRequests` | `SubjectRightsRequest.Read.All` | ✅ |
| 25 | SharePoint tenant settings | `/admin/sharepoint/settings` | `SharePointTenantSettings.Read.All` | ✅ |

---

## Phasing

Phases 1–4.5 are the observation + directive ladder as actually shipped. Phases 5+ are forward-looking; the canonical ordered table lives in Claude memory `project_sharjah_council_backlog.md`.

| Phase | Scope | Status |
|---|---|---|
| 1 — Foundation | Multi-tenant Graph-Signals app, per-tenant onboarding, token cache, fan-out framework. | ✅ Shipped |
| 2a — Dashboard build | Maturity Index v1 (Secure Score + CA + device compliance + risky users + incidents) + UI. | ✅ Shipped |
| 2b — Read-completeness | Purview reads (DLP + IRM + Comm Compliance + SRRs + retention labels + sensitivity labels + external sharing + async label-adoption), Defender depth (Advanced Hunting packs + Threat Intel + Attack Simulation + DFI sensor health + PIM sprawl), multi-framework clause mapping, Settings → App Registration panel. | ✅ Shipped |
| 2c — Directive reactive writes | Directive app provisioning, per-entity `consent_mode` chooser, incident/alert classification, threat submission (email/URL/file), risky user confirm/dismiss, session revoke. | ✅ Shipped (directive only) |
| 3 — Conditional Access baselines | 12 curated baselines + idempotent push + per-entity status + pre-flight rollback preview + per-tenant rollback + baseline-wide "remove from all". | ✅ Shipped (directive only) |
| 4 — Custom CA wizard (MVP) | 7-step cross-tenant wizard (cross-tenant-stable fields only), clone-from-baseline. | ✅ Shipped (directive only) |
| 4.5 — CA wizard close-out | Tenant-scoped mode (reference tenant) unlocks specific users / groups / named locations / ToU / custom auth strengths. Device filter rule builder. Push scope gate. | ✅ Shipped (directive only) |
| 5 — Intune writes | Device compliance baselines, app protection (MAM) baselines, device configuration profiles. | 🟡 Next |
| 6 — Purview DLP writes | DLP policies across Exchange / SharePoint / OneDrive / Teams / endpoint. | 🟡 Future |
| 7 — Sensitivity labels + auto-labeling | Label hierarchy push, encryption, auto-label rules. | 🟡 Future |
| 8 — Retention + records | Retention baselines + records-management holds. | 🟡 Future |
| 9 — Defender for Office | Anti-phishing, Safe Links, Safe Attachments, preset security policies, attack simulation scheduling. | 🟡 Future |
| 10 — Exchange transport + email auth | Transport rules, DMARC/SPF/DKIM. Has Graph-coverage gap — may reopen PS tier. | 🟡 Future |
| 11 — SharePoint / OneDrive / Teams governance | External sharing defaults, guest access, Teams policies. | 🟡 Future |
| 12 — Identity governance + PIM | PIM activation settings, access reviews, entitlement mgmt, ToU creation. | 🟡 Future |
| 13 — App consent policies | Restrict user consent to verified publishers, admin consent workflow. | 🟡 Future |
| 14 — Attack simulation + ASR rules | Scheduled drills + endpoint Attack Surface Reduction baselines. | 🟡 Future |
| 15 — Tenant-wide identity defaults | Authentication-methods policy, authorization policy, cross-tenant access settings. | 🟡 Future |
| ∞ — Two-person approval workflow | Reviewer/approver split before every push. | 🟡 Deferred by user (2026-04-24) |

---

## Open questions for customers

Customer-specific decisions that are *not* resolved at the code level.

1. ~~**Framework priority**~~ **Resolved 2026-04-20: multi-framework via per-customer config (NESA / NCA / ISR / generic).**
2. **Entity clustering** — current clusters: Police / Health / Edu / Municipality / Utilities / Transport / Other. Customer-editable.
3. **Data residency** — must the dashboard backend run in-country? Drives Azure region (default `uaenorth`).
4. **Target maturity threshold** — default 75, configurable per customer via Settings → Maturity Index.
5. ~~**Entity autonomy** — can the regulator push policies directly?~~ **Resolved 2026-04-20: customer-dependent. SCSC = observation only. DESC = directive mode (reactive writes + CA baselines + custom CA wizard). Future customers decide at install via `MIZAN_DEPLOYMENT_MODE`.**
6. **Credential bootstrap** — who performs admin consent in each entity? Centralized regulator team, or entity CISO? Affects onboarding sequence. No code impact.
7. **Approval workflow** — deferred by user 2026-04-24; reopens when the first multi-admin regulator deployment asks for two-person rule.
