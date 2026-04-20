# Entity Onboarding Guide — Sharjah Cybersecurity Council Posture Dashboard

> **This document is the exportable template** the Council sends to each of the 100+ Sharjah government entities. The onboarding wizard auto-fills entity-specific values (tenant ID, contact, appId, consent URL) and renders to PDF. Placeholders are shown as `{{VARIABLE}}`.

---

**Document version:** 1.0
**Prepared for:** `{{ENTITY_NAME}}` (`{{ENTITY_NAME_AR}}`)
**Tenant ID:** `{{ENTITY_TENANT_ID}}`
**Verified domain:** `{{ENTITY_DOMAIN}}`
**Issued by:** Sharjah Cybersecurity Council (مجلس الشارقة للأمن السيبراني) · in partnership with Microsoft Security
**Issue date:** `{{ISSUE_DATE}}`
**Council contact:** `{{COUNCIL_CONTACT_NAME}}` · `{{COUNCIL_CONTACT_EMAIL}}` · `{{COUNCIL_CONTACT_PHONE}}`

---

## 1. Overview — what this is and why

The Sharjah Cybersecurity Council is establishing a **unified security oversight platform** across 100+ Sharjah government entities, built on Microsoft 365 E5 (Defender + Purview + Entra + Intune) — **the licensing your entity already owns**.

The platform gives the Council continuous, measured visibility into every entity's security posture and maturity — replacing quarterly surveys with live telemetry. Each entity continues to operate its own tenant and its own security team; the Council layer reads posture signals and ranks, benchmarks, and directs remediation from the top.

**What we ask of you:** a one-time admin consent step in your Entra ID tenant. That's the only step required from your side. No new agents, no new software, no role assignments, no data leaves your tenant except the posture signals listed in §7.

**What you get:**
- Your entity's live posture dashboard, including your Maturity Index and the controls pulling it up or down
- Benchmark position against your cluster (Police / Health / Edu / Municip. / Utilities / Transport)
- Priority remediation list, ranked by Council standards
- Full audit trail of every read the Council performs on your tenant

---

## 2. Prerequisites

Before starting, confirm the following. If any item is missing, email `{{COUNCIL_CONTACT_EMAIL}}` — we'll help.

- [ ] **Microsoft 365 E5** licensing on all relevant seats (required for Defender XDR, Purview, Entra ID P2).
- [ ] **Global Administrator** access in your entity's Entra ID tenant (required for the consent step).
- [ ] **Your entity's designated technical contact** for the dashboard is identified and available during rollout.

---

## 3. What you're consenting to

The Council registers a **single multi-tenant Entra application** in the Council tenant. When you consent, a **service principal is provisioned in your tenant** with the read-only permissions listed below. You can inspect this service principal at any time in the Entra admin center, and revoke it at any time.

| App permission | Purpose |
|---|---|
| `SecurityAlert.Read.All` | Read unified security alerts |
| `SecurityIncident.Read.All` | Read incident correlation and status |
| `SecurityEvents.Read.All` | Read Secure Score and control-level data |
| `ThreatHunting.Read.All` | Run Council-authored KQL hunting queries |
| `ThreatSubmission.Read.All` | Read phishing / threat submission history |
| `AttackSimulation.Read.All` | Read phishing simulation results |
| `ThreatIntelligence.Read.All` | Read threat intelligence signals |
| `SecurityIdentitiesHealth.Read.All` | Read Defender for Identity sensor health |
| `IdentityRiskyUser.Read.All` | Read risky user classifications |
| `IdentityRiskEvent.Read.All` | Read sign-in / user risk detections |
| `Policy.Read.All` | Read Conditional Access policies |
| `RoleManagement.Read.Directory` | Read directory role assignments (for PIM posture) |
| `RoleEligibilitySchedule.Read.Directory` | Read PIM role eligibility |
| `AuditLog.Read.All` | Read Entra audit and sign-in logs |
| `AuditLogsQuery.Read.All` (+ workload-scoped) | Run queries against the Unified Audit Log |
| `DeviceManagementManagedDevices.Read.All` | Read Intune device compliance and health |
| `DeviceManagementConfiguration.Read.All` | Read Intune configuration policies |
| `InformationProtectionPolicy.Read.All` | Read sensitivity label catalog |
| `RecordsManagement.Read.All` | Read retention label configuration |
| `SubjectRightsRequest.Read.All` | Read privacy request throughput |
| `SharePointTenantSettings.Read.All` | Read external sharing posture |
| `Directory.Read.All` | Read tenant metadata |

**All permissions are read-only.** The Council platform never requests write permissions — policy authorship and deployment remain entirely in your tenant, under your control.

---

## 4. Step 1 — Grant admin consent

**Who does this:** Global Administrator in your tenant.
**How long:** 2 minutes.

1. Click the consent URL below **from a clean browser window** (or paste into your address bar):
   ```
   {{CONSENT_URL}}
   ```
   The URL is equivalent to:
   ```
   https://login.microsoftonline.com/{{ENTITY_TENANT_ID}}/adminconsent?client_id={{COUNCIL_APP_ID}}&state={{ONBOARDING_ID}}
   ```

2. Sign in with your Global Administrator account.

3. Review the permission list (it matches §3 above).

4. Click **Accept**.

5. You'll be redirected to `{{COUNCIL_CALLBACK_URL}}` with a success confirmation.

### Verify the consent succeeded
- In the Entra admin center, go to **Enterprise applications** → search for the app named `{{COUNCIL_APP_NAME}}`.
- Confirm it appears in your tenant with the permissions listed in §3.
- Under **Permissions**, you should see "Granted for `{{ENTITY_NAME}}`".

If you see an error like *"AADSTS65001: The user or administrator has not consented…"* — it typically means Conditional Access or an app management policy blocked the consent. Email `{{COUNCIL_CONTACT_EMAIL}}` with the full error and we will assist.

---

## 5. Step 2 — Notify the Council and run the verification handshake

1. Email `{{COUNCIL_CONTACT_EMAIL}}` with **subject:** `Consent complete — {{ENTITY_NAME}}`. Include:
   - Your entity's verified primary domain: `{{ENTITY_DOMAIN}}`
   - Your tenant ID: `{{ENTITY_TENANT_ID}}`
   - Your technical contact's name, email, and phone

2. The Council will run a **first-call verification** against `/security/secureScores` in your tenant. Expected time to complete: **under 10 minutes** from receipt of your email.

3. You'll receive a **"Connection live"** confirmation email with your entity's initial Secure Score reading and a link to your entity's view in the Council dashboard.

> Earlier versions of this template included a Step 2 asking the entity to grant Compliance Administrator / Records Management / eDiscovery Administrator / Compliance Data Administrator roles to the Council's service principal via PowerShell. That step was part of a **deferred write-side automation tier** and has been removed. The Council platform is read-only — Graph admin consent (Step 1) is sufficient for every signal it consumes.

---

## 7. What data is read, how often, and where it's stored

### Signals collected

| Signal | Source | Cadence | Residency |
|---|---|---|---|
| Secure Score (tenant + per-control) | `/security/secureScores` | Daily | UAE-North |
| Conditional Access policies | `/identity/conditionalAccess/policies` | Daily | UAE-North |
| Risky users and sign-in risk events | `/identityProtection/riskyUsers`, `/riskDetections` | Every 15 min | UAE-North |
| PIM role assignments and eligibility | `/roleManagement/directory/*` | Daily | UAE-North |
| Security alerts (unified) | `/security/alerts_v2` | 5 min poll + webhook | UAE-North |
| Security incidents | `/security/incidents` | 5 min poll + webhook | UAE-North |
| Advanced Hunting query results (Council-authored KQL packs) | `/security/runHuntingQuery` | Hourly, serialized | UAE-North |
| Defender for Identity sensor health | `/security/identities/healthIssues` | 15 min | UAE-North |
| Intune device compliance | `/deviceManagement/managedDevices` | Hourly | UAE-North |
| Sensitivity label catalog and application telemetry | `/security/informationProtection/sensitivityLabels`, audit query | Weekly (labels), daily (telemetry) | UAE-North |
| Retention labels | `/security/labels/retentionLabels` | Daily | UAE-North |
| Unified audit log queries | `/security/auditLog/queries` | Daily (bulk) | UAE-North |
| SharePoint external sharing posture | `/admin/sharepoint/settings` | Daily | UAE-North |
| Subject Rights Request throughput | `/security/subjectRightsRequests` | Daily | UAE-North |

### What is NOT read
- Email content (bodies, attachments) — excluded unless an eDiscovery case is authorized in writing by the Council Legal Officer and your entity.
- File content in SharePoint / OneDrive — excluded on the same basis.
- Teams message content — excluded on the same basis.
- Personal device content — excluded.
- Any cross-tenant correlation of user identities beyond what the Maturity Index requires.

### Storage, retention, region
- All signals stored in Azure in the **UAE-North** region (UAE-Central for disaster recovery).
- Signal retention: **2 years** (configurable per Council policy).
- Audit-of-access retention: **2 years minimum**, aligned with UAE NESA audit requirements.
- All data at rest is encrypted with Microsoft-managed or Council-managed keys (configurable).

---

## 8. Ongoing — managing and monitoring the connection

### Your entity's controls

- **Inspect the service principal** at any time: Entra admin center → Enterprise applications → `{{COUNCIL_APP_NAME}}`.
- **Review permissions granted**: same location → Permissions.
- **Review sign-in activity**: same location → Sign-in logs.
- **Revoke consent** at any time: same location → Properties → Delete, or Permissions → Review consent.
- **Scope Conditional Access** to the service principal if desired (e.g., allowlist Council egress IPs). Email `{{COUNCIL_CONTACT_EMAIL}}` for the current IP ranges.

### Council-side controls you can request
- Per-signal opt-out (with written justification to Council)
- Pause connection during maintenance windows
- Receive copies of all audit-of-access logs for your entity
- Quarterly review meeting with Council SOC lead

### What the Council commits to
- Read-only access as specified in §3; any scope expansion requires written request + entity approval.
- Full audit trail of every read, shared on request.
- Incident notification within 1 hour if Council-side credentials are ever suspected compromised.
- Annual third-party audit of the Council platform, results shared with entities.

---

## 9. Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| `AADSTS65001` at consent | CA policy blocks admin consent | Temporarily exempt the admin account, or consent from a named location in policy |
| `AADSTS50020` | Signed-in user is not a member of the tenant | Sign in with a Global Admin of `{{ENTITY_TENANT_ID}}` |
| `Add-eDiscoveryCaseAdmin` returns "cmdlet not found" | Not connected to Security & Compliance PowerShell | Re-run `Connect-IPPSSession` |
| `Add-RoleGroupMember` returns "group not found" | Compliance Admin role not yet provisioned in tenant | In Purview portal, visit Permissions once to provision; retry |
| Council verification call fails with 403 | Role assignments in §5 not completed | Re-run §5d; email Council the output |
| Tokens expire unexpectedly | Token lifetime CA policy too aggressive | Review token-lifetime CA; 60-min default is sufficient |
| Webhook validation fails | Egress blocking Microsoft Graph callback | Allow outbound to `graph.microsoft.com` |

For anything not listed above, email `{{COUNCIL_CONTACT_EMAIL}}` with:
- Entity name and tenant ID
- Exact error text and timestamp
- Screenshot if available
- Your contact info

The Council SOC on-call responds within **4 business hours** during the 90-day rollout, and within **8 business hours** in steady state.

---

## 10. Legal & governance

- This onboarding is executed under the **Memorandum of Understanding between Sharjah Cybersecurity Council and `{{ENTITY_NAME}}`** dated `{{MOU_DATE}}`.
- Data processing is governed by **UAE federal data protection law** and Sharjah-specific regulations.
- Entity remains **data controller** for all entity data. The Council acts as **data processor** for posture signals only.
- Any law-enforcement or regulatory request for entity data must be directed to the entity, not the Council.
- This document, once signed, is retained by both parties for the duration of the connection plus 7 years.

---

## 11. Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Entity Global Administrator (performed consent) | | | |
| Entity CISO / Security Lead | | | |
| Entity Data Protection Officer | | | |
| Council Technical Onboarding Lead | | | |
| Council Legal Officer | | | |

---

**Document ID:** `{{ONBOARDING_ID}}`
**Generated:** `{{GENERATED_TIMESTAMP}}`
**Council dashboard URL:** `{{DASHBOARD_URL}}/entity/{{ONBOARDING_ID}}`

---

## Appendix A — Permission reference by data domain

> For technical reviewers. Maps each Council feature to the Graph permission(s) required and the PS role(s) required.

| Dashboard feature | Graph perms | PS roles | Docs |
|---|---|---|---|
| Maturity Index (Secure Score component) | `SecurityEvents.Read.All` | — | §3 |
| Identity & Access Observatory | `Policy.Read.All`, `IdentityRiskyUser.Read.All`, `IdentityRiskEvent.Read.All`, `AuditLog.Read.All`, `RoleManagement.Read.Directory`, `RoleEligibilitySchedule.Read.Directory` | — | §3 |
| Threat & Incident Operations | `SecurityAlert.Read.All`, `SecurityIncident.Read.All`, `ThreatHunting.Read.All`, `ThreatIntelligence.Read.All`, `AttackSimulation.Read.All`, `ThreatSubmission.Read.All`, `SecurityIdentitiesHealth.Read.All` | — | §3 |
| Data Protection Posture | `InformationProtectionPolicy.Read.All`, `AuditLogsQuery.Read.All` + workload-scoped, `SharePointTenantSettings.Read.All`, `SubjectRightsRequest.Read.All` | Compliance Administrator, Records Management, Compliance Data Administrator | §3, §5 |
| Device & Endpoint Hygiene | `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All` | — | §3 |
| eDiscovery-based investigations | `eDiscovery.Read.All` | eDiscovery Administrator | §3, §5 |
| Retention label posture | `RecordsManagement.Read.All` | Records Management | §3, §5 |
| Unified audit queries | `AuditLogsQuery.Read.All`, plus `AuditLogsQuery-Exchange.Read.All`, `-SharePoint.Read.All`, `-Entra.Read.All` | Compliance Data Administrator | §3, §5 |

## Appendix B — IP ranges for Conditional Access allowlisting

If you scope the Council service principal's sign-ins to specific egress IPs via Conditional Access, use the current list at:

```
{{COUNCIL_IP_LIST_URL}}
```

The Council maintains this list and notifies entity technical contacts at least **14 days** before any change.
