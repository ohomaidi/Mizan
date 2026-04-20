# Feature Catalog — Council Posture & Maturity Dashboard

**Purpose:** enumerate every feature the dashboard can deliver against Microsoft Graph (Defender + Purview + Entra + Intune + Compliance Manager), mapped to concrete endpoints, so the Council has thorough visibility across 100+ Sharjah government entities.

> **Scope as of 2026-04-19 — read-only, NESA-only.** The project closes in read-only posture. Write paths (Policy Deployment Service, PowerShell automation tier, cross-entity policy push) and multi-framework mapping (NCA / ISR) are deferred to a potential follow-on engagement. Sections below that reference those capabilities are preserved for continuity but marked **[deferred]**.

---

## 0. Architectural truth first

Before features: three realities that shape every design decision.

1. **Auth model.** Single multi-tenant Entra app, admin-consent flow in each of the 100+ entity tenants, one app-only token per tenant, fan-out polling with per-tenant workers. GDAP requires CSP status; Lighthouse is Azure-only. Target ~5 concurrent workers (see `SCSC_SYNC_CONCURRENCY`), MSAL token cache, `Retry-After`-aware HTTP client.
2. ~~**PowerShell worker pool is mandatory.**~~ **[deferred]** — The ~8 PowerShell-only compliance domains (DLP / IRM / Communication Compliance / Retention *policies* / Information Barriers / Auto-labeling / Audit retention / Compliance Manager) are intentionally **out of scope** for this read-only engagement. They remain policy-authoring surfaces the entities manage themselves.
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
- **MDE TVM** (exposure score, recommendations, missing KBs, software inventory) is **not in Graph**. Either use MDE direct API (`api.securitycenter.microsoft.com`) per tenant, or hunt over `DeviceTvm*` advanced-hunting tables. Cost accordingly.
- **Device response actions** (isolate, quarantine file, AV scan) are **not in Graph** — MDE direct API required for automation. Pillar 3 MTO handles the analyst UX side.

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

The Council is a federated **observability** layer. Read-only by design — entity SOCs retain full policy autonomy.

| Feature | Mechanism | Status |
|---|---|---|
| **Control Benchmark** — every entity scored against Council baseline | Baseline = curated target per sub-score. Dashboard shows % aligned per entity. | ✅ In scope |
| **Maturity Index ranking** | Composite 0–100 score, Council-tunable weights + target | ✅ In scope |
| **UAE NESA framework alignment** | Map Secure Score controls + custom signals to NESA clauses. Synthesized, not from Compliance Manager API. | ✅ In scope |
| **Unified Audit Search (read)** | `/security/auditLog/queries` across all tenants with workload-scoped least-privilege permissions. | 🟡 Planned (read-only) |
| **Cross-entity eDiscovery (read)** | Read existing cases via `/security/cases/ediscoveryCases`. Creation stays in each entity's own tenant. | 🟡 Planned (read-only) |
| **Attack Simulation benchmark** | Phish click rate per entity from `/security/attackSimulation`. | 🟡 Planned (read-only) |
| **Executive reporting pack** | Monthly PDF/PPT auto-generated from the maturity index, delivered to Council leadership. | 🟡 Planned |
| ~~Policy Deployment Service (Graph side)~~ | CA / retention labels / custom detections push from Council | **[deferred]** |
| ~~Policy Deployment Service (PS side)~~ | DLP / IRM / Comm Compliance / Info Barriers runbooks | **[deferred]** |
| ~~NCA / ISR framework mapping~~ | Additional clause-tables for other frameworks | **[deferred]** |

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

## Phasing (maps to slide 9 roadmap)

| Phase | Days | Scope |
|---|---|---|
| 1 — Foundation | 0–15 | Multi-tenant app, per-tenant onboarding runbook, token cache, fan-out framework. ✅ Shipped. |
| 2 — Dashboard build | 15–45 | Maturity Index v1 (Secure Score + CA + Device compliance + Risky users + Incidents) + UI + polish. ✅ Shipped. |
| 3 — Read-completeness | 45–75 | Purview reads (DLP + IRM + Comm Compliance + SRRs + retention labels + sensitivity labels + external sharing + label-adoption async), Defender depth (Advanced Hunting KQL packs + Threat Intel + Attack Simulation + DFI sensor health + PIM sprawl), UAE NESA clause mapping, App Registration settings panel. **All read-only.** ✅ Shipped. |
| 4 — Cutover & launch | 75–90 | Full entity onboarding, executive reporting pack, handoff packaging (Azure App Service / Container Apps deployment runbook, cert-based MSAL). In progress. |
| ~~5 — Write tier~~ | — | Policy Deployment Service, PowerShell automation runbooks, NCA / ISR mapping, MSAL user-auth for Council staff, change-notification webhooks. **[deferred]** — next-year engagement. |

---

## Open questions for the Council

1. ~~**Framework priority** — is the maturity index primarily NCA-aligned, NESA-aligned, ISR-aligned, or a composite?~~ **Resolved 2026-04-19: UAE NESA.**
2. **Entity clustering** — slide 6 shows Police / Health / Edu / Municip. / Utilities / Transport. Is this the final cluster set? Drives rollup views.
3. **Data residency** — must the dashboard backend run in UAE-North / UAE-Central? Affects Azure region choice.
4. **Target maturity threshold** — slide 6 shows target 75. Council-tunable via Settings → Maturity Index.
5. ~~**Entity autonomy** — can the Council push policies directly?~~ **Resolved 2026-04-19: read-only. No policy push. Entities retain full autonomy.**
6. **Credential bootstrap** — who performs admin consent in each entity? Centralized Council team, or entity CISO? Affects onboarding sequence.
