# Microsoft Graph — Security & Defender Surface Reference

**As-of:** April 2026. Sourced from learn.microsoft.com/graph, learn.microsoft.com/defender-xdr, learn.microsoft.com/azure/sentinel, learn.microsoft.com/partner-center. Base host: `https://graph.microsoft.com`. Primary namespace: `microsoft.graph.security`.

**Purpose:** authoritative endpoint map for dashboard design — every Defender / identity / endpoint / Entra signal the Council can pull via Graph.

---

## 1. `/security` — Graph Security API

### 1.1 Alerts & Incidents (`microsoft.graph.security` namespace)

| Endpoint | Ver | Perms (least-priv) | Methods | Filter/Expand | Notes |
|---|---|---|---|---|---|
| `/security/alerts_v2` | v1.0 | `SecurityAlert.Read.All` / `SecurityAlert.ReadWrite.All` (app + delegated) | GET list, GET `/{id}`, PATCH, POST `/comments` | `$filter` on `assignedTo, classification, determination, createdDateTime, lastUpdateDateTime, severity, serviceSource, status, category, incidentId, tenantId`; `$top`, `$skip`, `$count`. No `$expand`. | Unified alerts from Entra ID Protection, Defender XDR, Defender for Endpoint/Identity/Cloud Apps/Office 365, Purview DLP, Insider Risk. |
| `/security/incidents` | v1.0 | `SecurityIncident.Read.All` / `SecurityIncident.ReadWrite.All` | GET, PATCH, POST `/comments` | `$filter` on `assignedTo, classification, createdDateTime, determination, lastUpdateDateTime, severity, status, redirectIncidentId, tenantId, customTags`; `$expand=alerts` supported. | `priorityScore` (0–100, ML-generated) and `summary` fields live; status includes `awaitingAction` (Defender Experts only, use `Prefer: include-unknown-enum-members`). |
| `/security/alerts` (legacy) | v1.0 | `SecurityEvents.Read.All` / `SecurityEvents.ReadWrite.All` | GET, PATCH, subscribe | Same filter set, no evidence/MITRE. | **Deprecated; removal by April 2026.** Migrate all callers to `alerts_v2`. |

### 1.2 Secure Score

| Endpoint | Ver | Perms | Use case |
|---|---|---|---|
| `/security/secureScores` | v1.0 | `SecurityEvents.Read.All` (delegated + app) | Daily tenant snapshot (90 days retained). Fields: `currentScore`, `maxScore`, `controlScores[]`, `averageComparativeScores[]` (by industry/seating/category), `licensedUserCount`, `activeUserCount`, `enabledServices[]`. Page via `$top=n`. |
| `/security/secureScoreControlProfiles` | v1.0 | `SecurityEvents.Read.All` / `SecurityEvents.ReadWrite.All` | Per-control metadata: category (Identity/Data/Device/Apps/Infra), max score, remediation, threat types, compliance frameworks. PATCH to override tenant state (`ignored`, `thirdParty`, `reviewed`). Ideal for per-control maturity weighting. |

### 1.3 Advanced Hunting — `runHuntingQuery`

| Property | Value |
|---|---|
| Endpoint | `POST /security/runHuntingQuery` (v1.0 + beta) |
| Perms | `ThreatHunting.Read.All` (delegated + app) |
| Body | `{ "Query": "<KQL>", "Timespan": "P30D" | "ISO8601/ISO8601" }` |
| Tables | All Defender XDR advanced-hunting schema: `DeviceInfo, DeviceNetworkInfo, DeviceProcessEvents, DeviceNetworkEvents, DeviceFileEvents, DeviceRegistryEvents, DeviceLogonEvents, DeviceImageLoadEvents, DeviceEvents, DeviceFileCertificateInfo, EmailEvents, EmailAttachmentInfo, EmailPostDeliveryEvents, EmailUrlInfo, UrlClickEvents, IdentityDirectoryEvents, IdentityLogonEvents, IdentityQueryEvents, CloudAppEvents, AlertInfo, AlertEvidence` + TVM tables. |
| **Quotas** | 30-day lookback; 100,000 row max; 50 MB result max; **≥45 calls/min/tenant** (varies by tenant size); CPU quota enforced on 15-min cycle; 3-min per-request timeout; 429 on quota hit with reason in body. |
| Migration | Replaces `api.security.microsoft.com/api/advancedhunting/run` and `api.securitycenter.microsoft.com/api/advancedqueries/run` — **both retired Feb 1, 2027**. |

### 1.4 Custom Detections — `rules/detectionRules`

| Endpoint | Ver | Perms | Notes |
|---|---|---|---|
| `/security/rules/detectionRules` | **beta only** | `CustomDetection.Read.All` / `CustomDetection.ReadWrite.All` | Full CRUD. Schedules: 1h, 3h, 12h, 24h. Holds `queryCondition` (KQL), `detectionAction` (alert + response actions), `lastRunDetails`. Inherits `protectionRule`. |

### 1.5 Threat Intelligence — `/security/threatIntelligence`

Requires **Defender TI Portal license + API add-on**. Perms: `ThreatIntelligence.Read.All` (app + delegated).

| Resource | Path | Ver |
|---|---|---|
| `article` | `/security/threatIntelligence/articles` | v1.0 |
| `intelligenceProfile` | `/security/threatIntelligence/intelProfiles` | v1.0 |
| `host` | `/security/threatIntelligence/hosts/{hostname}` | v1.0 |
| `hostPair, hostComponent, hostCookie, hostTracker, hostPort, hostSslCertificate, hostReputation` | nested under host | v1.0 |
| `passiveDnsRecord` | `/security/threatIntelligence/passiveDnsRecords` | v1.0 |
| `sslCertificate` | `/security/threatIntelligence/sslCertificates` | v1.0 |
| `subdomain`, `whoisRecord`, `vulnerability` | parallel collections | v1.0 |
| `tiIndicator` (legacy IoC submission) | `/security/tiIndicators` | v1.0 — being superseded by Defender XDR indicators; app perm `ThreatIndicators.ReadWrite.OwnedBy`. |

### 1.6 Identities (Defender for Identity / ITDR)

Under `/security/identities`. Perms: `SecurityIdentitiesHealth.Read.All`, `SecurityIdentitiesSensors.ReadWrite.All`, `SecurityIdentities.ReadWrite.All`. **Requires MDI plan or E5 Security.**

| Endpoint | Ver |
|---|---|
| `/security/identities/healthIssues` | v1.0 |
| `/security/identities/sensors` | v1.0 |
| `/security/identities/sensorCandidates` | v1.0 |
| `/security/identities/sensorCandidateActivationConfiguration` | v1.0 |
| `/security/identities/settings` | v1.0 |
| `/security/identities/identityAccounts` (user lookup + `disableAccount`, `forcePasswordReset`) | v1.0 |

**Gap:** MDI "identity security posture assessments" (ISPMs) are **not** in Graph — still only via Defender portal / Secure Score controls.

### 1.7 Threat Submissions — `/security/threatSubmission`

| Endpoint | Ver | Perms |
|---|---|---|
| `/security/threatSubmission/emailThreats` | v1.0 | `ThreatSubmission.Read.All` / `ThreatSubmission.ReadWrite.All` |
| `/security/threatSubmission/urlThreats` | v1.0 | same |
| `/security/threatSubmission/fileThreats` | v1.0 | same |
| `/security/threatSubmission/emailThreatSubmissionPolicies` | beta | `ThreatSubmissionPolicy.ReadWrite.All` |

Exposes Defender for Office 365 user + admin submissions + policy-check results. `threatAssessmentRequests` (older) still at `/informationProtection/threatAssessmentRequests` v1.0.

### 1.8 Attack Simulation & Training

| Endpoint | Ver | Perms |
|---|---|---|
| `/security/attackSimulation/simulations` | v1.0 | `AttackSimulation.Read.All` / `AttackSimulation.ReadWrite.All` |
| `/security/attackSimulation/simulationAutomations` | v1.0 | same |
| `/security/attackSimulation/payloads`, `landingPages`, `loginPages`, `endUserNotifications`, `trainings`, `operations` | v1.0 | same |
| Aggregate reports under `/reports/security/...` | v1.0 | `Reports.Read.All` |

### 1.9 eDiscovery & Cases — `/security/cases`

| Endpoint | Ver | Perms |
|---|---|---|
| `/security/cases/ediscoveryCases` | v1.0 | `eDiscovery.Read.All` / `eDiscovery.ReadWrite.All` |
| `.../custodians`, `/legalHolds`, `/noncustodialDataSources`, `/searches`, `/reviewSets`, `/tags`, `/operations`, `/settings`, `/caseMembers` | v1.0 | same |
| Actions: `close`, `reopen` | v1.0 | |

**Insider risk cases:** NOT available in Graph as of v1.0 today; Purview Insider Risk is only partly exposed (alerts flow into `alerts_v2` via provider `microsoftInsiderRiskManagement`; case CRUD still portal-only).

### 1.10 Information Protection / Sensitivity Labels

| Endpoint | Ver | Perms |
|---|---|---|
| `/security/informationProtection/sensitivityLabels` | **beta** (v1.0 partial under `/me/informationProtection/sensitivityLabels`) | `InformationProtectionPolicy.Read` / `.Read.All` |
| `/security/informationProtection/labelPolicySettings` | beta | same |
| `/informationProtection/threatAssessmentRequests` | v1.0 | `ThreatAssessment.ReadWrite.All` |
| `/informationProtection/dataLossPreventionPolicies/evaluate`, `/sensitivityLabels/evaluate`, `/sensitivityLabels/extractContentLabel` | beta | `InformationProtectionContent.Sign.All` / `.Write.All` |

### 1.11 Audit Log (Purview Audit) via Graph

| Endpoint | Ver | Perms | Notes |
|---|---|---|---|
| `/security/auditLog/queries` | **beta** (v1.0 GA pending) | `AuditLogsQuery.Read.All` + service-specific (e.g., `AuditLogsQuery-Exchange.Read.All`, `...-SharePoint.Read.All`, `...-Entra.Read.All`) | Async job: POST query with filters (time, user, operations, services), poll `status`, then GET `/records`. Unified audit log (UAL) successor; replaces Search-UnifiedAuditLog PowerShell at scale. Throttle: ~100 requests / 5 min per tenant (Exchange component). |

### 1.12 Other `/security` resources

- `/security/triggers`, `/security/triggerTypes` — policy-rule trigger automation (beta).
- `/security/subjectRightsRequests` — Priva / Privacy DSR (v1.0).
- `/security/labels/retentionLabels` + `/security/labels/authorities`, `/categories`, `/citations`, `/departments`, `/filePlanReferences` — Records management (v1.0).
- `/security/collaboration/analyzedEmails` — Defender for Office 365 email entity page (beta).

---

## 2. Defender XDR / MDE — Legacy Endpoint Deprecations

Microsoft's guidance: **"Try our new APIs using MS Graph security API."** Deprecation track:

| Legacy host / endpoint | Status | Graph replacement |
|---|---|---|
| `api.security.microsoft.com/api/incidents`, `/alerts` | Legacy, being superseded | `/security/incidents`, `/security/alerts_v2` |
| `api.security.microsoft.com/api/advancedhunting/run` | **Retires Feb 1, 2027** | `/security/runHuntingQuery` |
| `api.securitycenter.microsoft.com/api/advancedqueries/run` | **Retires Feb 1, 2027** | same |
| `api.securitycenter.microsoft.com/api/machines` | Still live; Graph equivalent in **beta** | `/security/machines` (beta, limited) — most consumers still use MDE direct API |
| `.../api/machines/{id}/isolate`, `/unisolate`, `/restrictCodeExecution`, `/runAntiVirusScan`, `/stopAndQuarantineFile` (device response actions) | MDE direct only | **No Graph equivalent yet** |
| `.../api/vulnerabilities`, `/recommendations`, `/exposureScore`, `/configurationScore`, `/software`, `/missingKBs` (TVM) | MDE direct | **No full Graph coverage**; partial beta under `/security/threatIntelligence/vulnerabilities` (CVE metadata only, not tenant posture) |
| Streaming API (Event Hub / Storage) for raw advanced-hunting tables | Live, recommended for SIEM | No Graph equivalent; use Sentinel XDR connector |

**Takeaway:** For device response actions and TVM posture (exposure score, missing KBs, recommendations, software inventory), you **still need the MDE direct API at `api-{region}.security.microsoft.com`** — or `runHuntingQuery` over `DeviceTvm*` tables (`DeviceTvmSoftwareInventory`, `DeviceTvmSoftwareVulnerabilities`, `DeviceTvmSecureConfigurationAssessment`, `DeviceTvmSecureConfigurationAssessmentKB`).

---

## 3. Defender for Cloud Apps (MCAS)

- Native API at `https://<tenant>.<region>.portal.cloudappsecurity.com/api/v1` (activities, alerts, entities, files, discovery).
- **Graph coverage:** Alerts only — surfaced via `alerts_v2` with `serviceSource=microsoftDefenderForCloudApps`. No Graph endpoints for discovery, OAuth app governance, or file policies.
- MDCA session policies / OAuth app catalog still **MCAS-native only**.

---

## 4. Defender for Identity

See §1.6. Posture & ISPM assessments not in Graph.

---

## 5. Defender for Office 365

- Alerts via `alerts_v2` (`serviceSource=microsoftDefenderForOffice365`).
- `/security/threatSubmission/*` (§1.7).
- Advanced-hunting tables `EmailEvents`, `EmailAttachmentInfo`, `EmailUrlInfo`, `EmailPostDeliveryEvents`, `UrlClickEvents` reachable via `runHuntingQuery`.
- **Not in Graph:** Threat Explorer, campaigns, Safe Links/Attachments policy CRUD (Exchange Online PowerShell only).

---

## 6. Defender for Cloud (Azure workload protection)

**Not a Graph surface.** Lives under ARM: `https://management.azure.com/subscriptions/{sub}/providers/Microsoft.Security/*`:

- `Microsoft.Security/alerts`, `/assessments`, `/secureScores`, `/secureScoreControls`, `/regulatoryComplianceStandards`, `/pricings`, `/recommendations`, `/advancedThreatProtectionSettings`.
- Alerts DO flow into Graph `alerts_v2` with `serviceSource=microsoftDefenderForCloud` — but posture/recommendations require ARM + the Defender for Cloud REST API. Separate auth (Azure RBAC, not Graph permissions).

---

## 7. Entra ID — Protection & Governance

### 7.1 Identity Protection (`/identityProtection`, namespace `microsoft.graph`)

| Endpoint | Ver | Perms | Filter |
|---|---|---|---|
| `/identityProtection/riskyUsers` | v1.0 | `IdentityRiskyUser.Read.All` / `.ReadWrite.All` | `$filter` on `riskLevel, riskState, riskDetail, riskLastUpdatedDateTime, userPrincipalName` |
| `/identityProtection/riskyUsers/{id}/history` | v1.0 | same | |
| `/identityProtection/riskDetections` | v1.0 | `IdentityRiskEvent.Read.All` | `$filter` on `riskEventType, riskLevel, detectedDateTime, userPrincipalName, ipAddress` |
| `/identityProtection/riskyServicePrincipals` | v1.0 | `IdentityRiskyServicePrincipal.Read.All` / `.ReadWrite.All` | |
| `/identityProtection/servicePrincipalRiskDetections` | v1.0 | same | |
| Actions: `riskyUsers/confirmCompromised`, `/dismiss`; `riskyServicePrincipals/confirmCompromised`, `/dismiss` | v1.0 | `.ReadWrite.All` | |

### 7.2 Conditional Access — `/identity/conditionalAccess`

| Endpoint | Ver | Perms |
|---|---|---|
| `/identity/conditionalAccess/policies` | v1.0 | `Policy.Read.All` / `Policy.ReadWrite.ConditionalAccess` |
| `/identity/conditionalAccess/namedLocations` | v1.0 | `Policy.Read.All` / `Policy.ReadWrite.ConditionalAccess` |
| `/identity/conditionalAccess/authenticationContextClassReferences` | v1.0 | same |
| `/identity/conditionalAccess/templates` | v1.0 | `Policy.Read.All` |
| Authentication strength: `/policies/authenticationStrengthPolicies` | v1.0 | `Policy.Read.All` / `.ReadWrite.AuthenticationMethod` |

### 7.3 Identity Governance & PIM

| Endpoint | Ver | Perms |
|---|---|---|
| **Directory roles (Entra) PIM** — `/roleManagement/directory/roleAssignmentScheduleRequests`, `/roleAssignmentSchedules`, `/roleAssignmentScheduleInstances`, `/roleEligibilityScheduleRequests`, `/roleEligibilitySchedules`, `/roleEligibilityScheduleInstances` | v1.0 | `RoleManagement.Read.Directory` / `RoleManagement.ReadWrite.Directory`, `RoleAssignmentSchedule.Read.Directory`, `RoleEligibilitySchedule.Read.Directory` |
| **Groups PIM** — `/identityGovernance/privilegedAccess/group/*` | v1.0 | `PrivilegedAccess.Read.AzureADGroup` / `.ReadWrite.AzureADGroup` |
| **Azure resources PIM** — `/privilegedAccess/azureResources/*` | beta, **deprecated; retires Oct 28, 2026** | migrate to **Azure REST PIM API** (ARM, not Graph) |
| `/identityGovernance/accessReviews/definitions` | v1.0 | `AccessReview.Read.All` / `.ReadWrite.All` |
| `/identityGovernance/entitlementManagement/accessPackages, /assignments, /catalogs` | v1.0 | `EntitlementManagement.Read.All` / `.ReadWrite.All` |
| `/identityGovernance/termsOfUse/agreements` | v1.0 | `Agreement.Read.All` / `.ReadWrite.All` |

### 7.4 Directory audits & sign-ins

| Endpoint | Ver | Perms |
|---|---|---|
| `/auditLogs/directoryAudits` | v1.0 | `AuditLog.Read.All` |
| `/auditLogs/signIns` | v1.0 | `AuditLog.Read.All` + `Directory.Read.All` |
| `/auditLogs/provisioning` | v1.0 | `AuditLog.Read.All` |

---

## 8. Intune / Endpoint Manager — `/deviceManagement`

All require Intune license. Base perms: `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All`, `DeviceManagementServiceConfig.Read.All` (Read/ReadWrite variants). App-only supported throughout.

| Endpoint | Ver | Notes |
|---|---|---|
| `/deviceManagement/managedDevices` | v1.0 | Full inventory: `complianceState` (`compliant, noncompliant, conflict, error, inGracePeriod, configManager, unknown`), `deviceHealthAttestationState` (BitLocker, Secure Boot, TPM, PCR0, code integrity), `jailBroken`, `isEncrypted`, `partnerReportedThreatState` (MTD). `$filter` on `complianceState, operatingSystem, lastSyncDateTime, enrolledDateTime, managementAgent`. |
| Device actions: `/retire`, `/wipe`, `/remoteLock`, `/resetPasscode`, `/syncDevice`, `/rebootNow`, `/shutDown`, `/windowsDefenderScan`, `/windowsDefenderUpdateSignatures`, `/locateDevice`, `/cleanWindowsDevice` | v1.0 | `DeviceManagementManagedDevices.PrivilegedOperations.All` |
| `/deviceManagement/deviceCompliancePolicies` | v1.0 | Per-OS compliance rules; + `/assignments`, `/deviceStatuses`, `/userStatuses`. |
| `/deviceManagement/deviceConfigurations` | v1.0 | Legacy config profiles + device restrictions. |
| `/deviceManagement/configurationPolicies` | beta | Settings Catalog (modern). |
| `/deviceManagement/deviceHealthScripts`, `/deviceCustomAttributeShellScripts`, `/deviceShellScripts` | beta | Proactive remediations. |
| `/deviceManagement/windowsAutopilotDeploymentProfiles`, `/windowsAutopilotDeviceIdentities` | v1.0/beta | |
| `/deviceManagement/deviceManagementScripts` | beta | PowerShell scripts. |
| `/deviceManagement/reports/getDeviceNonComplianceReport`, `/getComplianceSettingDetailsReport`, many others | beta | POST with JSON body; async. |
| `/deviceAppManagement/mobileApps`, `/managedAppPolicies` (MAM) | v1.0 | App protection policies (Intune MAM). |

---

## 9. Documentation gaps (flagged for dashboard design)

1. **Custom detections (`/security/rules/detectionRules`)** — **beta only**; no v1.0 parity commitment published.
2. **Change notifications for `alerts_v2`/`incidents`** — missing from the supported-resources table. Polling remains the safe answer.
3. **Device response actions** (isolate, restrict code execution, AV scan, quarantine file) — no Graph coverage; MDE direct API at `api.securitycenter.microsoft.com` still required.
4. **TVM posture (exposure score, recommendations, missing KBs, software inventory)** — partial Graph coverage (CVE metadata only in TI); full posture via `runHuntingQuery` over `DeviceTvm*` tables or MDE direct API.
5. **Insider Risk case CRUD** — not in Graph (alerts flow through `alerts_v2` only).
6. **MDCA entity/discovery APIs** — MCAS REST only, not Graph.
7. **Defender XDR service-namespace throttling** — undocumented specific limits; plan for 429 + `Retry-After` and measure in pilot.
8. **Sensitivity labels** — `/security/informationProtection/sensitivityLabels` is beta only; v1.0 has `/me/informationProtection/sensitivityLabels` (delegated only).
9. **PIM for Azure resources** (`/privilegedAccess/azureResources`) — retires **Oct 28, 2026**; migrate to Azure REST PIM API (ARM-side).
10. **Defender for Identity posture (ISPMs)** — not in Graph; only sensor health + alerts.
11. **Legacy `/security/alerts`** — removal by April 2026; migrate all readers to `alerts_v2`.
12. **Advanced Hunting legacy endpoints** (`api.security.microsoft.com/api/advancedhunting/run`) — retire Feb 1, 2027.

---

## Sources

- [Use the Microsoft Graph security API](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview)
- [security: runHuntingQuery](https://learn.microsoft.com/en-us/graph/api/security-security-runhuntingquery)
- [alert resource (alerts_v2)](https://learn.microsoft.com/en-us/graph/api/resources/security-alert)
- [incident resource](https://learn.microsoft.com/en-us/graph/api/resources/security-incident)
- [secureScore resource](https://learn.microsoft.com/en-us/graph/api/resources/securescore)
- [threatIntelligence overview](https://learn.microsoft.com/en-us/graph/api/resources/security-threatintelligence-overview)
- [identityContainer (MDI)](https://learn.microsoft.com/en-us/graph/api/resources/security-identitycontainer)
- [detectionRule (beta)](https://learn.microsoft.com/en-us/graph/api/resources/security-detectionrule)
- [informationProtection (beta)](https://learn.microsoft.com/en-us/graph/api/resources/security-informationprotection)
- [ediscoveryCase](https://learn.microsoft.com/en-us/graph/api/resources/security-ediscoverycase)
- [identityProtectionRoot](https://learn.microsoft.com/en-us/graph/api/resources/identityprotectionroot)
- [conditionalAccessRoot](https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessroot)
- [managedDevice (Intune)](https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevice)
- [attackSimulationRoot](https://learn.microsoft.com/en-us/graph/api/resources/attacksimulationroot)
- [Graph throttling](https://learn.microsoft.com/en-us/graph/throttling) and [throttling-limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [Change notifications overview](https://learn.microsoft.com/en-us/graph/change-notifications-overview)
- [Defender XDR supported APIs](https://learn.microsoft.com/en-us/defender-xdr/api-supported)
- [Get access without a user (client credentials)](https://learn.microsoft.com/en-us/graph/auth-v2-service)
- [GDAP introduction](https://learn.microsoft.com/en-us/partner-center/gdap-introduction)
- [Sentinel Defender XDR connector](https://learn.microsoft.com/en-us/azure/sentinel/connect-microsoft-365-defender)
