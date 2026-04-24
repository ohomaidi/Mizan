// Translation dictionary.
//
// Rule for this project: **product names stay in English**, always.
//   - Top-level nav labels (Maturity overview, Entities, Identity, Threats, ...)
//   - Feature/product names (Secure Score, Defender, Purview, Entra ID, Intune, ...)
//   - Entity proper names (Sharjah Police, SEWA, ...) — come from data layer as-is.
//
// What IS translated: page headings, descriptions, column headers, button labels,
// KPI labels, status words, empty-state copy.

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DICT = {
  en: {
    "topbar.demo": "Demo env",
    "topbar.language": "Language",
    "topbar.notifications": "Notifications",
    "theme.switchToLight": "Switch to light mode",
    "theme.switchToDark": "Switch to dark mode",
    "demo.badge": "Demo data",

    "maturity.eyebrow": "{orgShort} overview",
    "maturity.title": "Maturity overview",
    "maturity.subtitle":
      "Live posture across all {count} connected your connected entities, computed continuously from Microsoft Graph signals.",

    "chart.clusters.targetLabel": "TARGET {target}",
    "chart.entities.title": "Maturity by entity",
    "chart.entities.subtitle":
      "One bar per consented entity vs {orgShort} target {target}. Click a bar to drill in.",
    "chart.sort.name": "Name",
    "chart.sort.maturityHigh": "Maturity · high first",
    "chart.sort.maturityLow": "Maturity · low first",

    "time.range.ariaLabel": "Time range",
    "time.range.7d": "7D",
    "time.range.30d": "30D",
    "time.range.qtd": "QTD",
    "time.range.ytd": "YTD",
    "time.range.caption.7d": "vs 7 days ago",
    "time.range.caption.30d": "vs 30 days ago",
    "time.range.caption.qtd": "quarter to date",
    "time.range.caption.ytd": "year to date",
    "time.range.caption.noHistory": "Not enough history yet.",

    "page.identity.eyebrow": "Identity & Access Observatory",
    "page.identity.title": "Identity",
    "page.identity.subtitle":
      "Risky users, conditional access drift, PIM sprawl, legacy auth, and MFA posture across all connected entities.",

    "page.threats.eyebrow": "Threat & Incident Operations",
    "page.threats.title": "Threats",
    "page.threats.subtitle":
      "Unified incidents and alerts across all 100+ entities, Advanced Hunting KQL packs, custom detections sync, and threat intelligence overlays.",

    "page.data.eyebrow": "Data Protection Posture · Purview",
    "page.data.title": "Data protection",
    "page.data.subtitle":
      "Sensitivity label coverage, DLP alert density, insider risk, communication compliance, retention labels, and external sharing posture.",

    "page.devices.eyebrow": "Device & Endpoint Hygiene · Intune",
    "page.devices.title": "Devices",
    "page.devices.subtitle":
      "Compliance by OS and entity, BitLocker / Secure Boot / TPM attestation, MAM coverage, and non-compliant device drill-down.",

    "page.governance.eyebrow": "Governance & Standards",
    "page.governance.title": "Governance",
    "page.governance.subtitle":
      "{orgShort} baseline benchmarks, UAE NESA framework alignment, and unified audit search across every consented entity.",

    "page.settings.eyebrow": "{orgShort} Operations",
    "page.settings.title": "Settings",
    "page.settings.subtitle":
      "Entity onboarding, per-tenant connection health, audit log, and global configuration.",

    "settings.newEntity.title": "Onboard a new entity",
    "settings.newEntity.subtitle":
      "Both English and Arabic names are required. The Arabic name is used in the RTL locale; the English name is used everywhere else.",

    "wizard.step": "Step {n} of {total}",
    "wizard.step1.title": "Identify the entity",
    "wizard.step1.subtitle": "Names, cluster, and CISO contact.",
    "wizard.step2.title": "Tenant and domain",
    "wizard.step2.subtitle":
      "Enter the primary verified domain. We resolve the Entra Tenant ID for you via OIDC discovery.",
    "wizard.step2.resolve": "Resolve from domain",
    "wizard.step2.resolving": "Resolving…",
    "wizard.step2.resolved": "Resolved: {tenantId}",
    "wizard.step2.resolveFailed": "Could not resolve a Tenant ID from that domain.",
    "wizard.step2.manualTenant": "Or paste Tenant ID directly",
    "wizard.step2.license": "E5 licensing confirmed for every seat (or exceptions documented)",
    "wizard.step3.title": "Generate consent artifacts",
    "wizard.step3.subtitle":
      "We'll create the tenant record, mint a unique admin-consent URL, and prepare the bilingual onboarding PDF. Nothing is sent — you review the preview below before forwarding to the entity's Global Admin.",
    "wizard.step3.generate": "Generate",
    "wizard.step3.done": "Generated. Consent URL + PDFs ready below.",
    "wizard.mode.title": "Directive on this entity",
    "wizard.mode.observation.title": "No \u2014 observation only",
    "wizard.mode.observation.body":
      "This entity is read-only for this Center. No policy pushes, no incident writes, no remediation actions. The Center can see everything but cannot change anything.",
    "wizard.mode.directive.title": "Yes \u2014 directive enabled",
    "wizard.mode.directive.body":
      "This entity is subject to Center directive actions: baseline Conditional Access policies, Intune compliance pushes, named locations, incident classification, forced sign-out, and indicator blocks. Every write is previewed, approved, and auditable on both sides.",
    "wizard.step4.title": "Await admin consent",
    "wizard.step4.subtitle":
      "Forward the onboarding letter to the entity's Global Administrator. This page live-polls consent status every 5 seconds. You can close the window — consent continues to be captured by the redirect handler.",
    "wizard.step4.polling": "Polling consent status…",
    "wizard.step4.status.pending": "Awaiting consent",
    "wizard.step4.status.consented": "Consent received",
    "wizard.step4.status.revoked": "Consent revoked",
    "wizard.step4.status.failed": "Consent flow failed",
    "wizard.step5.title": "First sync + verify",
    "wizard.step5.subtitle":
      "Trigger an initial Graph pull to prove the pipeline. Once Secure Score returns a value, the entity moves into the live dashboard.",
    "wizard.step5.run": "Run first sync",
    "wizard.step5.running": "Syncing…",
    "wizard.step5.ok": "First sync succeeded. Entity now appears on the Maturity overview.",
    "wizard.step5.failed": "Sync failed: {message}",
    "wizard.nav.back": "Back",
    "wizard.nav.next": "Next",
    "wizard.nav.finish": "Finish",
    "wizard.nav.cancel": "Cancel",
    "wizard.toggle.useForm": "Use quick form",
    "wizard.toggle.useWizard": "Use guided wizard",
    "settings.field.nameEn": "Name (English)",
    "settings.field.nameAr": "Name (Arabic)",
    "settings.field.cluster": "Cluster",
    "settings.field.tenantId": "Tenant ID",
    "settings.field.domain": "Primary domain",
    "settings.field.ciso": "CISO name",
    "settings.field.cisoEmail": "CISO email",
    "settings.field.required": "required",
    "settings.submit.add": "Generate onboarding letter",
    "settings.submit.preview":
      "In production this generates a PDF onboarding letter and a per-tenant consent URL for the CISO.",
    "settings.existing.title": "Onboarded entities",
    "settings.existing.subtitle":
      "The {count} entities currently registered. Both names are kept and shown based on the active locale.",
    "settings.list.clusterHeader": "Cluster",
    "settings.list.status": "Status",

    "state.loading": "Loading…",
    "state.error": "Something went wrong.",
    "state.retry": "Retry",
    "state.empty.title": "No entities connected yet",
    "state.empty.body":
      "Onboard your first entity from the Settings tab. After admin consent, the dashboard populates automatically from Microsoft Graph.",
    "state.empty.cta": "Go to Settings",
    "state.notConfigured.title": "Azure app registration not configured",
    "state.notConfigured.body":
      "Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in .env.local (see docs/08-phase2-setup.md) and restart the server.",

    "consent.status.pending": "Pending consent",
    "consent.status.consented": "Consented",
    "consent.status.revoked": "Revoked",
    "consent.status.failed": "Consent failed",

    "sync.last": "Last synced {when}",
    "sync.never": "Never synced",
    "sync.now": "Sync now",
    "sync.inProgress": "Syncing…",
    "sync.failed": "Sync failed",
    "sync.all": "Sync all entities",
    "sync.all.title": "Sync all entities now",
    "sync.all.body":
      "This runs a full posture refresh against every consented entity tenant. Each tenant performs five Microsoft Graph calls (Secure Score, Conditional Access, risky users, devices, incidents) serialized to respect per-tenant throttling.",
    "sync.all.warning":
      "This may take several minutes. Please keep this tab open until it completes — closing the tab does not cancel the sync.",
    "sync.all.estimate": "Estimated time: about {duration}.",
    "sync.all.tenantsReal": "{n} real tenant(s) × ~{perTenant}s each.",
    "sync.all.tenantsDemo": "{n} demo tenant(s) — instant, no Graph calls.",
    "sync.all.running": "Syncing {n} entities — please wait",
    "sync.all.running.body":
      "Do not close this tab. The page will refresh automatically when the sync completes.",
    "sync.all.done": "Sync complete",
    "sync.all.doneBody": "{ok} of {total} tenants succeeded.",
    "sync.all.cancel": "Cancel",
    "sync.all.start": "Start sync",
    "sync.all.close": "Close",
    "time.seconds": "{n} second(s)",
    "time.minutes": "{n} minute(s)",
    "time.minutesSeconds": "{m}m {s}s",

    "settings.consent.linkReady":
      "Send the admin-consent link below to the entity's Global Administrator. Once consented, the first sync runs automatically.",
    "settings.consent.openLink": "Open consent link",
    "settings.consent.copy": "Copy link",
    "settings.consent.copied": "Copied",
    "settings.consent.awaiting":
      "Awaiting admin consent from the entity. The dashboard will light up after they click the link.",
    "settings.consent.notConfigured":
      "Entra app registration is not configured yet; we saved the entity but cannot generate a consent link until AZURE_CLIENT_ID is set.",
    "settings.consent.failed":
      "The admin-consent flow reported an error. Check the entity's Conditional Access policies and retry.",
    "settings.consent.ok": "Consent received. Initial sync in progress — refresh in a few seconds.",
    "settings.pdf.download": "Download letter",
    "settings.pdf.en": "English",
    "settings.pdf.ar": "Arabic",

    "settings.tab.entities": "Entities",
    "settings.tab.branding": "Branding",
    "settings.tab.maturity": "Maturity Index",
    "settings.tab.pdf": "Onboarding PDF",
    "settings.tab.discovery": "Discovery PDF",
    "settings.tab.audit": "Audit log",
    "settings.tab.azure": "App Registration",
    "settings.tab.nesa": "NESA mapping",
    "settings.tab.docs": "Documentation",
    "settings.tab.about": "About & updates",

    "settings.about.title": "About Mizan",
    "settings.about.subtitle":
      "Check which version is running and whether a newer release is available on GitHub.",
    "settings.about.current": "Installed version",
    "settings.about.latest": "Latest available",
    "settings.about.published": "Released",
    "settings.about.upToDate": "You're on the latest release.",
    "settings.about.updateAvailable":
      "Update available — v{version}. Pick one command below to upgrade.",
    "settings.about.azureCmd": "Azure Container Apps",
    "settings.about.dockerCmd": "Docker / self-hosted",
    "settings.about.openReleaseNotes": "Open release notes on GitHub",
    "settings.about.lastChecked": "Last checked",
    "settings.about.checkNow": "Check now",
    "settings.about.releaseNotes": "Release notes",
    "settings.about.checkFailedTitle":
      "Couldn't reach GitHub to check for updates",

    "branding.title": "Branding",
    "branding.subtitle":
      "Organization name, colors, and framework. Applies to the dashboard, PDFs, and onboarding letters.",
    "branding.field.nameEn": "Organization name (EN)",
    "branding.field.nameAr": "Organization name (AR)",
    "branding.field.shortEn": "Short form (EN)",
    "branding.field.shortAr": "Short form (AR)",
    "branding.field.taglineEn": "Tagline (EN)",
    "branding.field.taglineAr": "Tagline (AR)",
    "branding.field.accentColor": "Primary accent color",
    "branding.field.accentColorStrong": "Strong accent color",
    "branding.field.framework": "Maturity framework",
    "branding.framework.generic": "Generic (no framework)",
    "branding.framework.nesa": "UAE NESA",
    "branding.framework.dubai-isr": "Dubai ISR",
    "branding.framework.nca": "KSA NCA",
    "branding.framework.isr": "ISR / ISO 27001",
    "branding.field.logo": "Organization logo",
    "branding.logo.helper":
      "PNG, JPEG, or WebP. Background is auto-removed by a local ML model unless you check the box below. Recommended: square, at least 256×256.",
    "branding.logo.keepBackground": "Keep the uploaded image's original background",
    "branding.logo.upload": "Upload logo",
    "branding.logo.remove": "Remove",
    "branding.logo.saved": "Logo uploaded",
    "branding.logo.removed": "Logo removed",
    "branding.logo.deleteConfirm":
      "Remove the current logo? The dashboard will fall back to a text monogram until a new logo is uploaded.",

    "login.title": "Sign in",
    "login.subtitle": "Posture Dashboard",
    "login.body":
      "Sign in with your organization's Microsoft account. Only users registered in the dashboard can access posture and maturity data.",
    "login.signIn": "Continue with Microsoft",
    "login.footer":
      "Protected access · identity provided by Microsoft Entra",
    "login.error.forbidden": "Your account does not have access to this dashboard.",
    "login.error.state_mismatch":
      "Sign-in was interrupted. Please try again.",
    "login.error.token_exchange":
      "Microsoft rejected the authentication. Check the app registration settings.",
    "login.error.missing_params": "The sign-in URL was malformed.",

    "settings.tab.auth": "Authentication",
    "directiveCfg.title": "Directive app",
    "directiveCfg.subtitle":
      "Second Entra app registration with .ReadWrite scopes. Required before any entity can be onboarded in directive mode. Create it in the Entra admin center, paste the credentials below, and grant admin consent on every Entra app permission.",
    "directiveCfg.field.clientId": "Directive app client ID",
    "directiveCfg.field.clientSecret": "Directive app client secret",
    "directiveCfg.field.authorityHost": "Authority host",
    "directiveCfg.clientIdHelper":
      "Distinct from the Graph Signals read-only app. Entra portal \u2192 App registrations \u2192 New registration.",
    "directiveCfg.secretSet": "Secret stored",
    "directiveCfg.secretUnset": "Not set",
    "directiveCfg.secretSetPlaceholder": "(already stored \u2014 leave blank to keep)",
    "directiveCfg.secretUnsetPlaceholder": "Paste the secret value from Entra",
    "directiveCfg.save": "Save",
    "directiveCfg.saved": "Saved. Phase 2 write endpoints will use these credentials.",
    "directiveCfg.clear": "Clear",
    "directiveCfg.clearConfirm":
      "Clear the Directive app credentials? Any in-flight directive work will stop. Active entities stay in directive mode but no further writes can be issued until credentials are restored.",
    "directiveCfg.warningTitle": "Compliance note",
    "directiveCfg.warningBody":
      "The Directive app's permissions include Policy.ReadWrite.ConditionalAccess, DeviceManagementConfiguration.ReadWrite.All, SecurityIncident.ReadWrite.All, IdentityRiskyUser.ReadWrite.All. Any entity that consents to this app is granting the Center the ability to write to their tenant. Treat the admin consent step with the weight it deserves.",

    "authCfg.title": "User authentication",
    "authCfg.subtitle":
      "Sign-in for operators and analysts. Uses a second Entra app registration (separate from the one that reads entity posture). Sign-in is always required — first-run sign-in is handled automatically by the setup wizard.",
    "authCfg.field.clientId": "Auth app client ID",
    "authCfg.field.clientSecret": "Auth app client secret",
    "authCfg.field.clientSecretPlaceholder":
      "Enter a new secret, or leave blank to keep the existing one",
    "authCfg.field.tenantId": "Operator Entra tenant ID",
    "authCfg.field.sessionTimeout": "Session lifetime",
    "authCfg.field.defaultRole": "Default role for new users",
    "authCfg.session.8h": "8 hours",
    "authCfg.session.1d": "24 hours",
    "authCfg.session.7d": "7 days (recommended)",
    "authCfg.session.30d": "30 days (maximum)",
    "authCfg.session.helper":
      "Sliding window — any activity inside the window pushes expiry forward, capped at 30 days. After the window lapses, users sign back in via Microsoft SSO (usually instant, no password prompt).",
    "authCfg.role.admin": "Admin",
    "authCfg.role.analyst": "Analyst",
    "authCfg.role.viewer": "Viewer",
    "authCfg.redirectUri": "Redirect URI (copy to your Entra app)",
    "authCfg.save": "Save authentication settings",
    "authCfg.saved": "Saved. Sign out and back in to pick up the new settings.",
    "authCfg.clear": "Clear",
    "authCfg.clearConfirm":
      "Clear authentication settings? Active sessions remain until they expire.",
    "authCfg.secretSet": "Secret stored",
    "authCfg.secretUnset": "Not set",
    "authCfg.signOut": "Sign out",
    "authCfg.testSignIn": "Test sign-in (new tab)",

    "users.title": "Dashboard users",
    "users.subtitle":
      "Everyone who can sign in. Invite by email to pre-assign a role, or promote a user after they sign in for the first time.",
    "users.empty": "No users yet. Invite the first admin or sign in once yourself to bootstrap.",
    "users.deleteConfirm":
      "Delete this user? Their sessions are terminated immediately.",
    "users.status.active": "Active",
    "users.status.disabled": "Disabled",
    "users.status.pending": "Pending first sign-in",
    "users.col.user": "User",
    "users.col.role": "Role",
    "users.col.status": "Status",
    "users.col.lastLogin": "Last sign-in",
    "users.action.enable": "Enable",
    "users.action.disable": "Disable",
    "users.action.delete": "Delete",
    "users.invite.title": "Invite a new user",
    "users.invite.displayName": "Display name (optional)",
    "users.invite.submit": "Invite",
    "users.invite.helper":
      "Creates a pending record. The user's role lands on their first Microsoft sign-in — they don't see an email from us.",

    "setup.title": "First-run setup",
    "setup.back": "Back",
    "setup.next": "Next",
    "setup.skipHint":
      "You can skip this step and configure it later from Settings.",
    "setup.deployment.title": "Deployment mode",
    "setup.deployment.subtitle":
      "Pick once, permanent. Drives the Graph app's permission set and whether directive actions are available across the product.",
    "setup.deployment.observation.title": "Read-only",
    "setup.deployment.observation.body":
      "The Graph app is provisioned with .Read.All scopes only. The Center can observe every consented entity's posture but cannot push any policy or take any directive action. Choose this for oversight councils and audit-only deployments.",
    "setup.deployment.directive.title": "Read / write",
    "setup.deployment.directive.body":
      "The Graph app is provisioned with .Read.All + .ReadWrite.All scopes. The Center can push Center-approved baselines and directive actions to entities that explicitly consent to directive at onboarding. Choose this for regulators.",
    "setup.deployment.lockedHint":
      "Deployment mode is already set and cannot be changed. Redeploy to change it.",
    "setup.deployment.unlockedWarning":
      "Choose carefully. This decision is permanent once you click Next.",
    "setup.s1.title": "1. Your organization",
    "setup.s1.subtitle":
      "This is the name that appears everywhere — dashboard chrome, PDFs, letters, the sign-in page.",
    "setup.s2.title": "2. Logo",
    "setup.s2.subtitle":
      "Upload a PNG/JPEG/WebP. The background is auto-removed locally — no cloud service is involved.",
    "setup.s2.skip": "Optional — you can skip and add one later from Settings.",
    "setup.s3.title": "3. Graph signals app",
    "setup.s3.subtitle":
      "The multi-tenant Entra app that reads posture from each entity tenant. Each entity's Global Admin consents to it in their own tenant.",
    "setup.s3.b1":
      "Entra admin center → App registrations → New registration → multi-tenant",
    "setup.s3.b2":
      "Add read-only Graph permissions (SecurityEvents.Read.All, Device.Read.All, Directory.Read.All, User.Read.All, Policy.Read.All — application permissions).",
    "setup.s3.b3":
      "Create a client secret and paste the client ID + secret below.",
    "setup.s4.title": "4. User sign-in app",
    "setup.s4.subtitle":
      "A second — separate — Entra app, single-tenant, for your staff to sign in to this dashboard. Keep the Graph-signals app separate so the two secrets rotate independently.",
    "setup.s4.b1":
      "Entra admin center → App registrations → New registration → single-tenant",
    "setup.s4.b2":
      "Under Authentication → Web platform, add this redirect URI:",
    "setup.s4.b3":
      "Create a client secret. Optionally define App roles (Posture.Admin / Analyst / Viewer) and assign users; otherwise the default role below applies.",
    "setup.s5.title": "5. Bootstrap admin",
    "setup.s5.subtitle":
      "Sign in now — the first account to complete sign-in becomes admin automatically.",
    "setup.s5.bootstrapBody":
      "The button below opens Microsoft sign-in in this tab. Come back and click Finish.",
    "setup.s5.openBody":
      "You skipped the user-auth step — the dashboard stays open (no sign-in required). You can configure authentication anytime from Settings → Authentication.",
    "setup.s5.signIn": "Sign in and become admin",
    "setup.s5.afterSignIn":
      "After sign-in you'll land back here. Click Finish to open the dashboard.",
    "setup.s5.finish": "Finish setup — open the dashboard",
    "setup.s5.alreadyTitle": "Signed in — you're the bootstrap admin",
    "setup.s5.alreadyBody":
      "When you approved the device code on an earlier step, we used that same Microsoft sign-in to create your admin session. No second round-trip required. Click Finish to open the dashboard.",
    "setup.s5.consentTitle": "Grant admin consent in Entra (manual step)",
    "setup.s5.consentBody":
      "Mizan created both app registrations for you and stored credentials, but Microsoft requires admin consent to be granted from the Entra portal. For each app you just created: Entra portal → App registrations → this app → API permissions → Grant admin consent for your tenant. Until consent is granted, sign-in below will fail with AADSTS65001.",

    "setup.prov.autoTitle": "Create automatically (recommended)",
    "setup.prov.autoBody":
      "One click — Mizan asks Microsoft for a short-lived code, you sign in once as a tenant admin, and we create the app registration + client secret and wire everything up. No Azure portal clicks needed.",
    "setup.prov.start": "Create for me",
    "setup.prov.waiting": "Waiting for your Microsoft sign-in…",
    "setup.prov.step1a": "Open this URL on any device:",
    "setup.prov.step2a": "Enter this code when prompted:",
    "setup.prov.step3a":
      "Sign in as an Entra admin of your operator tenant and approve the permissions. Mizan finishes the rest automatically — come back to this tab.",
    "setup.prov.expires": "Code expires in about {minutes} minutes. Don't close this tab.",
    "setup.prov.cancel": "Cancel",
    "setup.prov.success": "App created + credentials stored",
    "setup.prov.successHint":
      "You can click Next — credentials are already stored. One manual step remains: open Entra portal → App registrations → this app → API permissions → Grant admin consent for your tenant. Microsoft requires this step to be done in the portal.",
    "setup.prov.failed": "Provisioning failed",
    "setup.prov.retry": "Try again",
    "setup.prov.manualToggle": "Or enter existing credentials manually",
    "branding.save": "Save",
    "branding.reset": "Reset to defaults",
    "branding.resetConfirm":
      "Reset branding to generic defaults? Your name, colors, and framework will be overwritten.",
    "branding.saved": "Branding saved — reloading",

    "docs.title": "Customer handoff documentation",
    "docs.subtitle":
      "PDF documentation bundled with the platform. Each document ships as a separate English and Arabic file (monolingual — no mixed-script PDFs). Click to open in a new tab; right-click → save as to archive.",
    "docs.open.en": "Open EN",
    "docs.open.ar": "Open AR",
    "docs.doc.install.title": "Installation & Deployment Guide",
    "docs.doc.install.body":
      "Zero-to-live runbook for {orgShort} IT + Microsoft delivery teams. Covers prerequisites, Entra app registration, environment config, Docker + Azure deployment, first-tenant onboarding, operational tasks, and troubleshooting.",
    "docs.doc.operator.title": "Operator's Manual",
    "docs.doc.operator.body":
      "Day-to-day dashboard use for {orgShort} staff. Page-by-page tour, how to read the Maturity Index, common tasks (onboard entity, adjust weights, investigate red entities, export reports).",
    "docs.doc.security.title": "Security & Privacy Statement",
    "docs.doc.security.body":
      "Formal statement of what the platform reads and does not read, storage and residency posture, access control, audit and retention, revocation and exit, framework alignment. For {orgShort} leadership, entity CISOs, and legal review.",
    "docs.doc.arch.title": "Architecture & Data Flow Overview",
    "docs.doc.arch.body":
      "Systems view for Microsoft delivery engineers and {orgShort} IT architects. System topology, multi-tenant auth model, sync orchestrator + worker pool, data model, throttling envelope, failure modes, scoping decisions.",
    "docs.doc.handoff.title": "Handoff Checklist",
    "docs.doc.handoff.body":
      "Acceptance artifact. Lists shipped deliverables, functional acceptance criteria, pending operator actions, deferred scope, documentation index, and the sign-off block.",

    "azureCfg.walkthrough.title": "How to register the app in Entra",
    "azureCfg.walkthrough.subtitle":
      "Step-by-step: create a multi-tenant Entra application in the {orgShort} tenant, grant Graph read permissions, create a client secret, and paste the values below.",
    "azureCfg.walkthrough.toggle.show": "Show step-by-step walkthrough",
    "azureCfg.walkthrough.toggle.hide": "Hide walkthrough",
    "azureCfg.walkthrough.redirectUri":
      "Redirect URI to paste into Entra (platform: Web)",

    "azureCfg.title": "Entra app registration",
    "azureCfg.subtitle":
      "Credentials for the {orgShort}'s multi-tenant Entra app that reads Graph signals from every consented entity. Stored in the dashboard database; takes effect immediately on save (MSAL cache is invalidated). Env vars in .env.local still work as a fallback for fresh installs.",
    "azureCfg.field.clientId": "Application (client) ID",
    "azureCfg.field.clientSecret": "Client secret",
    "azureCfg.field.authorityHost": "Authority host",
    "azureCfg.field.consentRedirectUri": "Consent redirect URI (override)",
    "azureCfg.field.consentRedirectUri.hint":
      "Leave blank to auto-derive from APP_BASE_URL. Set explicitly if your deployment uses a different public hostname than APP_BASE_URL.",
    "azureCfg.secret.hasValue": "A secret is stored. Type a new value to replace it.",
    "azureCfg.secret.placeholderReplace": "••••••••  (hidden — type to replace)",
    "azureCfg.secret.placeholderNew": "Paste the client secret value",
    "azureCfg.secret.never": "No secret stored yet.",
    "azureCfg.source.db": "from database",
    "azureCfg.source.env": "from environment variable (fallback)",
    "azureCfg.source.none": "not set",
    "azureCfg.source.label": "Source:",
    "azureCfg.save": "Save",
    "azureCfg.saved": "Saved. MSAL cache invalidated — next sync uses the new credentials.",
    "azureCfg.clear": "Clear stored credentials",
    "azureCfg.cleared": "Stored credentials cleared. Falls back to env vars if present.",
    "azureCfg.status.ready": "Ready — Graph token acquisition should work.",
    "azureCfg.status.missing":
      "Not configured. Real-tenant syncs will return 412 until you set both Client ID and Client Secret.",
    "azureCfg.updatedAt": "Last updated {when}",

    "audit.title": "Graph audit-of-access log",
    "audit.subtitle":
      "Every Graph endpoint the {orgShort} has called against every entity's tenant, with last success, last error, 24h call count, and throttled count. Telemetry comes from the endpoint_health table written on every sync.",
    "audit.empty":
      "No Graph calls recorded yet. The log populates after the first real sync runs.",
    "audit.search":
      "Search entity, endpoint, or error…",
    "audit.filter.all": "All",
    "audit.filter.ok": "Healthy",
    "audit.filter.errors": "With errors",
    "audit.filter.throttled": "Throttled",
    "audit.col.entity": "Entity",
    "audit.col.endpoint": "Endpoint",
    "audit.col.lastSuccess": "Last success",
    "audit.col.lastError": "Last error",
    "audit.col.calls": "Calls (24h)",
    "audit.col.throttled": "Throttled",
    "audit.refresh": "Refresh",
    "audit.showing": "Showing {shown} of {total} records.",

    "discovery.banner.title": "Start here — send the Discovery Letter first",
    "discovery.banner.body":
      "Before you can register an entity below, they need to tell you their Tenant ID, primary domain, Global Admin, CISO, and licensing status. Download the bilingual Discovery Letter and email it to every entity — it walks them through exactly what to gather and where to find it. Once they reply with the info, come back to this form.",
    "discovery.banner.download": "Download Discovery Letter",
    "discovery.banner.preview": "Preview",

    "discoveryCfg.title": "Discovery letter template",
    "discoveryCfg.subtitle":
      "The pre-onboarding letter. Sent to every entity before they appear in the dashboard. Walks their technical team through exactly what to collect (Tenant ID, primary domain, licensing, Global Admin, CISO) and where in Microsoft 365 to find each item.",
    "discoveryCfg.reset": "Reset to defaults",
    "discoveryCfg.save": "Save template",
    "discoveryCfg.saved": "Template saved. Re-download to get the new copy.",
    "discoveryCfg.preview": "Preview PDF",
    "discoveryCfg.section.brand": "{orgShort} identity + header",
    "discoveryCfg.section.title": "Document title + subtitle",
    "discoveryCfg.section.contact": "Reply-to contact",
    "discoveryCfg.section.overview": "Why you're reaching out",
    "discoveryCfg.section.steps": "Checklist steps",
    "discoveryCfg.section.sendBack": "How to send back",
    "discoveryCfg.section.next": "What happens next",
    "discoveryCfg.section.footer": "Footer",
    "discoveryCfg.field.overviewEn": "Overview (English)",
    "discoveryCfg.field.overviewAr": "Overview (Arabic)",
    "discoveryCfg.field.sendBackEn": "Send-back instructions (English)",
    "discoveryCfg.field.sendBackAr": "Send-back instructions (Arabic)",
    "discoveryCfg.field.nextEn": "Next-step narrative (English)",
    "discoveryCfg.field.nextAr": "Next-step narrative (Arabic)",
    "discoveryCfg.field.phone": "Contact phone (optional)",
    "discoveryCfg.field.stepTitleEn": "Step title (English)",
    "discoveryCfg.field.stepTitleAr": "Step title (Arabic)",
    "discoveryCfg.field.stepWhatEn": "What to send (English)",
    "discoveryCfg.field.stepWhatAr": "What to send (Arabic)",
    "discoveryCfg.field.stepWhereEn": "Where to find it (English)",
    "discoveryCfg.field.stepWhereAr": "Where to find it (Arabic)",
    "discoveryCfg.stepHeading": "Step {n}",

    "faq.q.flow.title": "What's the onboarding flow, end-to-end?",
    "faq.q.flow.body":
      "Two stages.\n\nStage 1 — Discovery. {orgShort} downloads the Discovery Letter from Settings and emails it to every entity's CISO. The letter (bilingual) walks the entity's technical team through collecting five items: Entra Tenant ID, primary verified domain, E5 licensing confirmation, a Global Administrator who will click the consent link, and a designated CISO contact. Entity replies with these details.\n\nStage 2 — Onboarding. {orgShort} enters the details in Settings and clicks Generate onboarding letter. The dashboard creates a pending tenant record, generates a unique admin-consent URL, and produces a personalized PDF with the consent URL embedded. {orgShort} sends that PDF to the entity's Global Administrator, who clicks the consent URL, signs in with their tenant's Global Admin account, and approves the read-only Graph permissions. Entra redirects back to the {orgShort} dashboard, which flips the tenant to consented and kicks off an initial sync. Within ten minutes, the entity appears in the Maturity overview with real Secure Score, Conditional Access, risky users, device compliance, and incident data.",

    "maturityCfg.title": "Maturity Index configuration",
    "maturityCfg.subtitle":
      "Weights drive the Maturity Index formula for every entity. They normalize to 100% on save — you don't need to balance them exactly.",
    "maturityCfg.target": "{orgShort} target",
    "maturityCfg.targetHelp":
      "Entities below the target appear in the 'Below target' count on the Maturity overview.",
    "maturityCfg.reset": "Reset to defaults",
    "maturityCfg.save": "Save configuration",
    "maturityCfg.saved": "Saved · applies to the next page load and next sync.",
    "maturityCfg.weightsTotal": "Weights total",
    "maturityCfg.mustBe100": "must equal 100% ({diff} off)",
    "maturityCfg.normalize": "Normalize to 100%",
    "maturityCfg.saveBlocked":
      "Weights must sum to 100% before saving. Use Normalize or adjust sliders.",
    "maturityCfg.defaults": "Defaults: {values}",
    "maturityCfg.w.secureScore": "Secure Score",
    "maturityCfg.w.identity": "Identity posture",
    "maturityCfg.w.device": "Device posture",
    "maturityCfg.w.data": "Data protection",
    "maturityCfg.w.threat": "Threat response",
    "maturityCfg.w.compliance": "Framework alignment",

    "pdfCfg.title": "Onboarding PDF template",
    "pdfCfg.subtitle":
      "Edit the entity-onboarding letter content. Changes apply to every PDF downloaded afterwards. Both languages are edited together — the PDF stays bilingual.",
    "pdfCfg.reset": "Reset to defaults",
    "pdfCfg.save": "Save template",
    "pdfCfg.saved": "Template saved. Re-download any PDF to get the new copy.",
    "pdfCfg.preview": "Preview PDF",
    "pdfCfg.section.brand": "{orgShort} identity + header",
    "pdfCfg.section.title": "Document title + subtitle",
    "pdfCfg.section.contact": "{orgShort} contact",
    "pdfCfg.section.sections": "Body sections",
    "pdfCfg.section.signoff": "Sign-off roles",
    "pdfCfg.section.footer": "Footer",
    "pdfCfg.field.councilEn": "{orgShort} name (English)",
    "pdfCfg.field.councilAr": "{orgShort} name (Arabic)",
    "pdfCfg.field.taglineEn": "Tagline (English)",
    "pdfCfg.field.taglineAr": "Tagline (Arabic)",
    "pdfCfg.field.titleEn": "Title (English)",
    "pdfCfg.field.titleAr": "Title (Arabic)",
    "pdfCfg.field.subtitleEn": "Subtitle (English)",
    "pdfCfg.field.subtitleAr": "Subtitle (Arabic)",
    "pdfCfg.field.contactName": "Contact name",
    "pdfCfg.field.contactEmail": "Contact email",
    "pdfCfg.field.secTitleEn": "Section title (English)",
    "pdfCfg.field.secTitleAr": "Section title (Arabic)",
    "pdfCfg.field.secBodyEn": "Body (English)",
    "pdfCfg.field.secBodyAr": "Body (Arabic)",
    "pdfCfg.field.secNoteEn": "Note (English)",
    "pdfCfg.field.secNoteAr": "Note (Arabic)",
    "pdfCfg.field.bulletEn": "Bullet (English)",
    "pdfCfg.field.bulletAr": "Bullet (Arabic)",
    "pdfCfg.field.footerEn": "Footer text (English)",
    "pdfCfg.field.footerAr": "Footer text (Arabic)",
    "pdfCfg.section.heading": "Section {n}",
    "pdfCfg.sig.role": "Role {n}",
    "pdfCfg.sig.en": "Role title (English)",
    "pdfCfg.sig.ar": "Role title (Arabic)",

    "dataProt.eyebrow": "Data Protection · Purview",
    "dataProt.title": "Data protection — {orgShort} roll-up",
    "dataProt.subtitle":
      "Purview roll-up across consented entities. Live Purview signals (DLP alerts, Insider Risk, sensitivity labels, retention) wire in Phase 3. What shows here today is synthesized from Secure Score + Conditional Access as a Phase-2 approximation.",
    "dataProt.labelCoverage": "Label adoption",
    "dataProt.dlpAlerts": "DLP alerts (last 24h)",
    "dataProt.irmAlerts": "Insider Risk alerts",
    "dataProt.srr": "Subject Rights Requests",
    "dataProt.phase3.title": "Phase 3 surfaces — not yet wired",
    "dataProt.phase3.body":
      "Sensitivity label adoption analytics (via audit log query), DLP / IRM / Communication Compliance alerts from alerts_v2, retention labels, Subject Rights Requests, and Teams + SharePoint external sharing posture land in Phase 3 when Purview signals are added to the sync pipeline.",

    "gov.eyebrow": "Governance & Standards",
    "gov.title": "Governance — UAE NESA alignment",
    "gov.subtitle":
      "{orgShort}-wide alignment to the UAE NESA framework, computed from Secure Score control mappings and {orgShort} baseline enforcement.",
    "gov.framework.nesa": "NESA alignment",
    "gov.framework.dubai-isr": "Dubai ISR alignment",
    "gov.framework.nca": "KSA NCA alignment",
    "gov.framework.isr": "ISR / ISO 27001 alignment",
    "gov.framework.generic": "Framework alignment",
    "gov.baseline.title": "{orgShort} baseline",
    "gov.baseline.body":
      "Percentage of entities scoring above the {orgShort} target across all sub-scores. Drives the standards-tier ranking.",
    "gov.baseline.aligned": "Entities aligned",
    "gov.scope.title": "Scope note",
    "gov.scope.body":
      "This dashboard is read-only observability. Framework alignment is surfaced for measurement; policy authoring and deployment are handled in the entities' own tenants, outside the {orgShort} platform.",
    "gov.clauses.title": "NESA clause coverage",
    "gov.clauses.subtitle":
      "Per-clause average coverage across consented entities. Each clause is backed by Secure Score controls — editable in Settings → NESA mapping.",
    "gov.clauses.col.clause": "Clause",
    "gov.clauses.col.weight": "Weight",
    "gov.clauses.col.coverage": "Coverage",

    "dataProt.labels.title": "Labels",
    "dataProt.labels.subtitle":
      "Sensitivity + retention label averages across consented entities.",
    "dataProt.labels.sensitivityActive": "Active sensitivity labels (avg)",
    "dataProt.labels.retentionAvg": "Retention labels (avg)",
    "dataProt.labels.recordLabels": "Record labels (sum)",
    "dataProt.sharing.title": "External sharing posture",
    "dataProt.sharing.subtitle":
      "SharePoint tenant-level sharing capability across consented entities. More restrictive is better for government data.",
    "dataProt.commComp.title": "Comm Compliance",
    "dataProt.byEntity.title": "By entity",
    "dataProt.byEntity.subtitle":
      "Alert counts in parentheses show active alerts; overdue SRRs in red.",
    "dataProt.col.dlp": "DLP (active)",
    "dataProt.col.irm": "IRM",
    "dataProt.col.commComp": "Comm C.",
    "dataProt.col.srrs": "SRRs (overdue)",
    "dataProt.col.sharing": "Sharing",

    "nesaCfg.title": "UAE NESA clause mapping",
    "nesaCfg.subtitle":
      "{orgShort}-editable mapping from UAE NESA clauses to Microsoft Secure Score controls. Compliance sub-score is computed as the weighted average of per-clause coverage. Weights auto-normalize on save.",
    "nesaCfg.reset": "Reset to defaults",
    "nesaCfg.save": "Save",
    "nesaCfg.saved": "Saved. Applies to the next maturity compute cycle.",
    "nesaCfg.weight": "Weight",
    "nesaCfg.controls": "Secure Score controls (comma-separated)",
    "nesaCfg.totalWeight": "Total weight: {n}",
    "nesaCfg.addClause": "Add clause",
    "nesaCfg.removeClause": "Remove",

    "threats.ti.title": "Threat Intelligence",
    "threats.ti.subtitle": "Recent articles from Microsoft Defender TI linked to the {orgShort} feed.",
    "threats.ti.subtitle30d":
      "Recent Microsoft Defender Threat Intelligence articles — last 30 days. Tap any item for the full brief.",
    "threats.ti.count": "{count} articles",
    "threats.ti.empty": "No threat intel articles available yet.",
    "threats.ti.modal.published": "Published",
    "threats.ti.modal.noSummary":
      "Microsoft didn't include a summary on this article. Open in Defender for the full write-up.",
    "threats.ti.modal.openInDefender": "Open full article in Defender",
    "threats.ti.modal.portalHint":
      "Defender Threat Analytics has the full analyst write-up, IoCs, affected products, and recommended actions.",
    "threats.attackSim.title": "Attack Simulation — phish click-rate",
    "threats.attackSim.subtitle":
      "Ranked per entity. Lower is better. Pulled from /security/attackSimulation/simulations.",
    "threats.window.label": "Window",
    "threats.window.30d": "30 days",
    "threats.window.60d": "60 days",
    "threats.window.90d": "90 days",
    "threats.hunting.title": "Advanced Hunting packs",
    "threats.hunting.subtitle":
      "{orgShort}-authored KQL run against each entity per sync cycle. Click an entity to drill into per-pack results.",
    "threats.hunting.noResults": "No rows.",
    "threats.hunting.failed": "Query failed",

    "identity.pim.title": "Privileged role sprawl",
    "identity.pim.subtitle":
      "Standing (always-on) vs eligible (just-in-time) admin assignments across consented entities. Lower standing = better.",
    "identity.pim.col.entity": "Entity",
    "identity.pim.col.standing": "Standing",
    "identity.pim.col.eligible": "Eligible",
    "identity.pim.col.privileged": "Privileged standing",
    "identity.dfi.title": "Defender for Identity sensor health",
    "identity.dfi.subtitle": "Unhealthy sensor counts by entity. Zero is the goal.",

    "tabs.entity.controls": "Controls",
    "tabs.entity.incidents": "Incidents",
    "tabs.entity.identity": "Identity",

    "maturity.howCalculated": "How is this calculated?",

    "faq.eyebrow": "Reference",
    "faq.title": "How the dashboard works",
    "faq.subtitle":
      "Answers for {orgShort} leadership, entity CISOs, and Microsoft delivery — how the Maturity Index is computed, where the data comes from, and what the limits are.",

    "faq.q.whatIsDashboard.title": "What is this dashboard?",
    "faq.q.whatIsDashboard.body":
      "The {orgName}'s federated visibility layer across 100+ your connected entities. Each entity operates its own Microsoft 365 tenant; the {orgShort} reads read-only posture signals from every tenant via Microsoft Graph, computes a per-entity Maturity Index, and ranks against a {orgShort}-defined target. No day-to-day operations run here — entity SOCs keep full autonomy.",

    "faq.q.whatIsIndex.title": "What is the Maturity Index?",
    "faq.q.whatIsIndex.body":
      "A single 0–100 score summarizing an entity's security posture. Computed daily (or on-demand via Sync Now) from five signal families: Microsoft Secure Score, Conditional Access policies, risky users, Intune device compliance, and security incidents. {orgShort}'s target is 75 — entities scoring below 75 appear in the 'Below target' count and are prioritized for remediation.",

    "faq.q.howCalculated.title": "How is it calculated?",
    "faq.q.howCalculated.intro":
      "Weighted average of six sub-scores, each normalized to 0–100. The weights were set during the briefing and can be adjusted in Governance (Phase 3).",
    "faq.q.howCalculated.colSub": "Sub-score",
    "faq.q.howCalculated.colWeight": "Weight",
    "faq.q.howCalculated.colSource": "Signal",
    "faq.q.howCalculated.row.ss.name": "Microsoft Secure Score",
    "faq.q.howCalculated.row.ss.src": "/security/secureScores (percent of max)",
    "faq.q.howCalculated.row.identity.name": "Identity posture",
    "faq.q.howCalculated.row.identity.src":
      "Conditional Access coverage (50%) + MFA-requiring policies (35%) + legacy auth blocked (15%), penalized by active risky-user ratio",
    "faq.q.howCalculated.row.device.name": "Device posture",
    "faq.q.howCalculated.row.device.src": "Intune device compliance percentage",
    "faq.q.howCalculated.row.data.name": "Data protection",
    "faq.q.howCalculated.row.data.src":
      "Phase 2: synthesized from Secure Score. Phase 3: Purview label adoption + DLP alert rate",
    "faq.q.howCalculated.row.threat.name": "Threat response",
    "faq.q.howCalculated.row.threat.src": "Resolved incidents / total incidents (from /security/incidents)",
    "faq.q.howCalculated.row.compliance.name": "Framework alignment (NESA)",
    "faq.q.howCalculated.row.compliance.src":
      "Synthesized from Secure Score controls mapped to UAE NESA clauses.",
    "faq.q.howCalculated.formula.title": "Formula",
    "faq.q.howCalculated.formula.body":
      "Index = 0.25·SecureScore + 0.20·Identity + 0.15·Device + 0.15·Data + 0.15·Threat + 0.10·Framework",

    "faq.q.target.title": "Why is the target 75?",
    "faq.q.target.body":
      "The {orgShort} set 75 as the benchmark during the executive briefing (slide 6). It reflects 'baseline government-grade posture' — above industry average (around 60 for public sector M365 tenants) but achievable for entities that have completed the standard Microsoft Secure Score hardening playbook. The target is editable in Settings → Maturity Index.",

    "faq.q.signals.title": "What signals feed the index?",
    "faq.q.signals.body":
      "Five signal families pulled per tenant on each sync cycle:",
    "faq.q.signals.ss": "Microsoft Secure Score — tenant score and per-control status.",
    "faq.q.signals.ca": "Conditional Access policies — how many are enabled, enforce MFA, block legacy auth.",
    "faq.q.signals.ru": "Risky users — Identity Protection classifications + historical state.",
    "faq.q.signals.dev": "Managed devices — Intune compliance state per device (compliant / non-compliant / grace / error).",
    "faq.q.signals.inc": "Security incidents — active and resolved from Defender XDR.",

    "faq.q.cadence.title": "How often does the data refresh?",
    "faq.q.cadence.body":
      "Demo tenants: snapshots are fixed at seed time. Real tenants: on-demand via the Sync now button on each entity, plus a scheduled full sync driven by an external timer (recommend 15 min for alerts/incidents, hourly for posture, daily for Secure Score). Every sync writes a timestamped snapshot to the database so historical deltas can be computed.",

    "faq.q.belowTarget.title": "What does 'Below target' mean?",
    "faq.q.belowTarget.body":
      "The count of consented entities whose current Maturity Index is under the {orgShort} target (75 by default). Entities still pending consent are not included — they appear as 'Pending consent' until they're onboarded.",

    "faq.q.data.title": "Where is the data stored?",
    "faq.q.data.body":
      "All signals persist in a local SQLite database on the app's data volume (configurable via the DATA_DIR environment variable). Each signal fetch writes a full snapshot; retention policy is set by the {orgShort}. No entity data leaves the {orgShort}'s hosting environment.",

    "faq.q.limits.title": "Current limitations (Phase 2)",
    "faq.q.limits.body":
      "Being transparent about what's not yet live:",
    "faq.q.limits.a":
      "The {orgShort} platform is read-only by scope. It observes posture across 100+ entity tenants and ranks it against the {orgShort} target; policy authoring and enforcement remain with each entity's own IT team.",
    "faq.q.limits.b":
      "Historical deltas (Δ 7d / 30d / QTD / YTD) require multiple snapshots per tenant and will light up once the sync has been running for a week or more.",
    "faq.q.limits.c":
      "Microsoft Compliance Manager does not expose scores via Graph. NESA alignment is synthesized from Secure Score control mappings rather than lifted from Microsoft.",
    "faq.q.limits.d":
      "Purview policy CRUD (DLP, Insider Risk, Communication Compliance) is only available via Security & Compliance PowerShell and is intentionally out of scope for this read-only platform.",

    "faq.q.demo.title": "Why do some entities show a 'Demo' badge?",
    "faq.q.demo.body":
      "Demo-flagged entities carry pre-baked signals and are never synced against real Graph endpoints. They're there so the dashboard shows populated data before real tenants are onboarded. Production installs ship with seeding disabled by default (set SCSC_SEED_DEMO=true to enable). The {orgShort} can wipe all demo entities at any time with `npm run purge-demo` — real tenants are untouched.",

    "faq.q.glossary.title": "Glossary",
    "faq.q.glossary.tenant": "Tenant — one entity's Microsoft 365 organization, identified by an Entra GUID.",
    "faq.q.glossary.cluster": "Cluster — {orgShort} grouping: Police / Health / Education / Municipality / Utilities / Transport / Other.",
    "faq.q.glossary.consent": "Admin consent — the entity's Global Administrator approves the {orgShort}'s Entra app in their tenant; required before any Graph call works.",
    "faq.q.glossary.secureScore": "Secure Score — Microsoft's built-in tenant-level security posture metric, 0 to a dynamic max.",

    "kpi.maturityIndex": "Maturity index",
    "kpi.entities": "Entities",
    "kpi.belowTarget": "Below target",
    "kpi.controlsPassing": "Controls passing",
    "kpi.deltaNew": "new",
    "kpi.target": "{orgShort} target",

    "chart.clusters.title": "Maturity by entity cluster",
    "chart.clusters.subtitle": "Index, 0–100 · vs. {orgShort} target of {target}",
    "chart.legend.current": "Current",
    "chart.legend.target": "Target",

    "maturity.dragging.title": "Controls dragging the index down",
    "maturity.dragging.subtitle": "{orgShort}-wide, ranked by total missed Secure Score points",
    "maturity.dragging.entitiesAffected": "{n} entities affected",
    "maturity.dragging.empty":
      "No dragging controls — every Secure Score control is implemented {orgShort}-wide.",

    "maturity.movers.title": "Biggest movers — last 7 days",
    "maturity.movers.subtitle": "Entities with the largest Maturity Index change",
    "maturity.movers.empty":
      "Not enough history yet to compute 7-day movement. Check back after a week of syncs.",

    "entities.eyebrow": "Entities",
    "entities.title": "Connected entities",
    "entities.subtitle":
      "{shown} of {total} entities shown{filterSuffix}. Ranked by Maturity Index.",
    "entities.filterSuffix": " · filtered to {cluster}",
    "entities.exportCsv": "Export CSV",
    "entities.search": "Search entities, domain, CISO…",
    "entities.belowTargetLabel": "Below target:",
    "entities.noMatches": "No entities match your search.",
    "entities.pending.copyLink": "Copy consent link",
    "entities.pending.copied": "Copied",
    "entities.pending.cancel": "Cancel onboarding",
    "entities.pending.cancelConfirm":
      "Remove this entity and its pending consent link? You can re-onboard anytime.",
    "entities.pending.linkUnavailable":
      "No consent link stored — re-run the onboarding wizard.",

    "cols.entity": "Entity",
    "cols.cluster": "Cluster",
    "cols.maturity": "Maturity",
    "cols.delta7d": "Δ 7d",
    "cols.target": "Target",
    "cols.controls": "Controls",
    "cols.incidents": "Incidents",
    "cols.riskyUsers": "Risky users",
    "cols.deviceCompl": "Device compl.",
    "cols.labels": "Labels",
    "cols.connection": "Connection",
    "cols.lastSync": "Last sync",
    "cols.all": "All",

    "health.green": "Healthy",
    "health.amber": "Degraded",
    "health.red": "Offline",

    "time.justNow": "just now",
    "time.minutesAgo": "{n}m ago",
    "time.hoursAgo": "{n}h ago",
    "time.daysAgo": "{n}d ago",

    "entity.backToAll": "All entities",
    "entity.backToIdentity": "Back to Identity",
    "entity.backToDevices": "Back to Devices",
    "entity.backToThreats": "Back to Threats",
    "entity.backToVulnerabilities": "Back to Vulnerabilities",
    "entity.backToData": "Back to Data protection",
    "entity.backToGovernance": "Back to Governance",
    "entity.backToMaturity": "Back to Maturity overview",
    "entity.tenant": "Tenant",
    "entity.domain": "Domain",
    "entity.ciso": "CISO",
    "entity.contact": "Contact",
    "entity.lastSync": "Last sync {when}",
    "entity.openDefender": "Defender portal",
    "entity.exportCard": "Export card",
    "entity.scheduleReview": "Schedule review",
    "entity.suspend": "Suspend",
    "entity.resume": "Resume",
    "entity.suspended.banner":
      "Sync is suspended for this entity. Background syncs skip it until you resume.",
    "entity.review.banner": "Review scheduled for {date}.",

    "entity.suspend.dialog.title": "Suspend posture sync?",
    "entity.suspend.dialog.body":
      "Sync will stop for this entity until you resume it. Existing snapshots are preserved. Consent is NOT revoked — the {orgShort} app registration remains authorized in the entity's tenant.",
    "entity.suspend.dialog.confirm": "Suspend",
    "entity.suspend.dialog.cancel": "Cancel",
    "entity.resume.dialog.title": "Resume posture sync?",
    "entity.resume.dialog.body":
      "The next scheduled sync (3 am daily) will pick up this entity again. You can also trigger Sync now immediately after.",
    "entity.resume.dialog.confirm": "Resume",

    "entity.review.dialog.title": "Schedule a posture review",
    "entity.review.dialog.body":
      "Set a target date to review this entity's posture with the {orgShort} team. Informational only — no automated action runs on this date.",
    "entity.review.dialog.dateLabel": "Review date",
    "entity.review.dialog.noteLabel": "Note (optional)",
    "entity.review.dialog.save": "Save",
    "entity.review.dialog.clear": "Clear",
    "entity.review.dialog.cancel": "Cancel",

    "entity.maturityTitle": "Maturity index",
    "entity.maturitySubtitle": "Vs. {orgShort} target {target}",
    "entity.targetMarker": "Target {target}",
    "entity.stats.incidents": "Incidents",
    "entity.stats.riskyUsers": "Risky users",
    "entity.stats.devicesCompliant": "Devices compl.",

    "entity.overview.topVulns.title": "Top vulnerabilities",
    "entity.overview.topVulns.subtitle":
      "Highest-severity CVEs reported by Defender for this entity's endpoints.",
    "entity.overview.topVulns.viewAll": "View all CVEs",
    "entity.overview.topVulns.clean":
      "No CVEs currently reported — fleet is clean.",

    "subscores.title": "Sub-score breakdown",
    "subscores.subtitle": "Weighted inputs into the Maturity Index",
    "subscores.identity": "Identity",
    "subscores.device": "Device",
    "subscores.data": "Data",
    "subscores.threatResponse": "Threat response",
    "subscores.compliance": "Compliance (NESA)",

    "maturity.sub.secureScore": "Secure Score",
    "maturity.sub.identity": "Identity",
    "maturity.sub.device": "Device",
    "maturity.sub.data": "Data",
    "maturity.sub.threat": "Threat response",
    "maturity.sub.compliance": "Compliance",

    "trend.title": "Maturity trend",
    "trend.subtitle":
      "How this entity's Maturity Index and sub-scores moved over time. Toggle any sub-score to overlay it on the chart.",
    "trend.range.7d": "7 days",
    "trend.range.30d": "30 days",
    "trend.range.90d": "90 days",
    "trend.range.all": "All",
    "trend.overSpan.7d": "over 7 days",
    "trend.overSpan.30d": "over 30 days",
    "trend.overSpan.90d": "over 90 days",
    "trend.overSpan.all": "over all time",
    "trend.granularity.daily": "Daily",
    "trend.granularity.weekly": "Weekly",
    "trend.granularity.monthly": "Monthly",
    "trend.overlay": "Overlay",
    "trend.series.overall": "Maturity Index",
    "trend.points": "{count} data points",
    "trend.latest": "Latest",
    "trend.empty.title": "No trend data yet",
    "trend.empty.body":
      "Trend points are captured after each sync. Run a sync now, or use the admin Backfill Historical Data action to reconstruct the last 90 days from existing signals.",

    "recent.title": "Recent changes",
    "recent.subtitle": "Signals that moved the index in the last 7 days",

    "benchmark.title": "Benchmark",
    "benchmark.subtitle": "Position within {cluster} cluster and council-wide",
    "benchmark.within": "Within {cluster}",
    "benchmark.councilWide": "{orgShort}-wide",
    "benchmark.of": "of {total}",
    "benchmark.percentile": "{n}th percentile",
    "benchmark.footer":
      "Cluster average {cluster}. {orgShort} average {council}. Target {target}.",

    "subtabs.more.title": "Other sub-tabs",
    "subtabs.more.subtitle":
      "Data · Governance — Purview signals + NESA alignment per the roadmap.",
    "subtabs.more.body":
      "Data and Governance sub-tabs populate once Purview read signals (DLP alerts, Insider Risk, Subject Rights Requests, label adoption) and UAE NESA control mapping are wired into the sync.",

    "tab.data.title": "Data protection",
    "tab.data.subtitle":
      "DLP, Insider Risk, Communication Compliance, Subject Rights Requests, retention + sensitivity labels, external sharing posture.",
    "tab.data.emptyNoSync":
      "No Purview data yet — this entity hasn't completed its first sync.",
    "tab.data.empty.body":
      "All Purview surfaces report zero. Either this entity has no Purview policies configured yet, or it's missing the license. The data sources are connected; they just have nothing to report.",
    "tab.data.kpi.dlp": "DLP alerts",
    "tab.data.kpi.irm": "Insider Risk",
    "tab.data.kpi.commComp": "Comm Compliance",
    "tab.data.kpi.srrs": "Subject Rights",
    "tab.data.labels.title": "Labels",
    "tab.data.labels.subtitle":
      "Retention + sensitivity label inventory pulled from Purview.",
    "tab.data.labels.retention": "Retention labels",
    "tab.data.labels.retentionRecord": "— of which records",
    "tab.data.labels.sensitivity": "Sensitivity labels",
    "tab.data.labels.sensitivityActive": "— active",
    "tab.data.sharing.title": "External sharing posture",
    "tab.data.sharing.subtitle":
      "SharePoint + OneDrive tenant-level sharing caps.",
    "tab.data.sharing.sharepoint": "SharePoint sharing",
    "tab.data.sharing.guestCount": "Allowed sync domains",
    "tab.data.sharing.syncButtonHidden": "OneDrive sync button hidden",
    "tab.data.sharing.missing": "SharePoint settings not yet collected.",

    "tab.gov.title": "Governance alignment",
    "tab.gov.subtitle":
      "Framework coverage for this entity, derived from Secure Score control groupings. Category pass-rates map to the identity / data / device / apps axes most standards (NESA, NCA, ISR) cluster around.",
    "tab.gov.emptyNoSync":
      "No Secure Score data yet — this entity hasn't completed its first sync.",
    "tab.gov.kpi.controls": "Controls measured",
    "tab.gov.kpi.controlsCaption": "across all framework categories",
    "tab.gov.kpi.passing": "Passing",
    "tab.gov.kpi.passingCaption":
      "{passed} controls fully implemented",
    "tab.gov.kpi.complianceSub": "Compliance sub-score",
    "tab.gov.kpi.complianceSubCaption":
      "from the Maturity Index (NESA weighting)",
    "tab.gov.categories.title": "Coverage by category",
    "tab.gov.categories.subtitle":
      "Green = passing · Amber = partial · Red = not implemented.",

    "tab.overview": "Overview",
    "tab.controls": "Controls",
    "tab.incidents": "Incidents",
    "tab.identity": "Identity",
    "tab.data": "Data",
    "tab.devices": "Devices",
    "tab.governance": "Governance",
    "tab.vulnerabilities": "Vulnerabilities",
    "tab.attackSimulation": "Attack Simulation",
    "tab.connection": "Connection",

    "tab.controls.title": "Secure Score controls",
    "tab.controls.subtitle": "Per-control implementation status from Microsoft Secure Score.",
    "tab.controls.col.name": "Control",
    "tab.controls.col.category": "Category",
    "tab.controls.col.score": "Score",
    "tab.controls.col.status": "Status",
    "tab.controls.implemented": "Implemented",
    "tab.controls.notImplemented": "Not implemented",
    "tab.controls.partial": "Partial",
    "tab.controls.unknown": "Unknown",
    "tab.controls.userImpact": "User impact",
    "tab.controls.implCost": "Impl. cost",
    "tab.controls.filter.label": "Category",
    "tab.controls.filter.uncategorized": "Uncategorized",
    "tab.controls.filter.empty":
      "No controls match this category.",

    "tab.incidents.title": "Security incidents",
    "tab.incidents.subtitle": "Unified from Microsoft Defender XDR.",
    "tab.incidents.col.name": "Incident",
    "tab.incidents.col.severity": "Severity",
    "tab.incidents.col.status": "Status",
    "tab.incidents.col.alerts": "Alerts",
    "tab.incidents.col.created": "Created",
    "tab.incidents.col.updated": "Updated",
    "tab.incidents.summary": "{total} total · {active} active · {resolved} resolved",
    "tab.incidents.drill.created": "Created",
    "tab.incidents.drill.updated": "Last updated",
    "tab.incidents.drill.classification": "Classification",
    "tab.incidents.drill.determination": "Determination",
    "tab.incidents.drill.assignedTo": "Assigned to",
    "tab.incidents.drill.unclassified": "Not yet classified",
    "tab.incidents.drill.unassigned": "Unassigned",
    "tab.incidents.drill.tags": "Tags",
    "tab.incidents.drill.openInDefender": "Open in Defender XDR",
    "tab.incidents.drill.defenderHint":
      "Deep-link opens Microsoft Defender XDR portal in a new tab with the full incident timeline, related alerts, and analyst actions.",

    "incidentClassification.truePositive": "True positive",
    "incidentClassification.falsePositive": "False positive",
    "incidentClassification.informationalExpectedActivity": "Informational / expected",
    "incidentClassification.unknown": "Unknown",

    "incidentDetermination.apt": "APT / targeted attack",
    "incidentDetermination.malware": "Malware",
    "incidentDetermination.phishing": "Phishing",
    "incidentDetermination.unwantedSoftware": "Unwanted software",
    "incidentDetermination.compromisedAccount": "Compromised account",
    "incidentDetermination.maliciousUserActivity": "Malicious user activity",
    "incidentDetermination.insufficientInformation": "Insufficient information",
    "incidentDetermination.other": "Other",

    "tab.identity.title": "Risky users",
    "tab.identity.subtitle": "From Microsoft Entra Identity Protection.",
    "tab.identity.col.user": "User",
    "tab.identity.col.level": "Risk level",
    "tab.identity.col.state": "Risk state",
    "tab.identity.col.updated": "Last updated",
    "tab.identity.summary": "{atRisk} at risk · {total} tracked",
    "tab.identity.empty": "No risky users reported for this entity.",
    "tab.identity.helpBtn": "What's Level vs State?",
    "tab.identity.help.levelTitle": "Risk Level",
    "tab.identity.help.levelBody":
      "Severity of the latest Identity Protection signal: None · Low · Medium · High. Microsoft's confidence that something suspicious is happening.",
    "tab.identity.help.stateTitle": "Risk State",
    "tab.identity.help.stateBody":
      "Lifecycle status: At risk · Confirmed compromised · Remediated · Dismissed · Confirmed safe. Level is the signal; State is what's been done about it.",
    "tab.identity.help.clickHint":
      "Click “At risk” on any user to see the exact detections (event type, location, IP) driving the alert.",
    "tab.identity.clickToExplain": "Click to see why",
    "tab.identity.why": "why?",
    "tab.identity.why.title": "Why is {user} at risk?",
    "tab.identity.why.subtitle":
      "Microsoft Entra Identity Protection detections that triggered this user's risk state. Every row is a separate signal from the last 7 days.",
    "tab.identity.why.noDetections":
      "No detection records returned by Graph for this user. The risk state is still active but the underlying evidence may have aged out of the /riskDetections endpoint.",
    "tab.identity.why.event": "Detection",
    "tab.identity.why.severity": "Severity",
    "tab.identity.why.location": "Location",
    "tab.identity.why.ip": "IP",
    "tab.identity.why.detected": "Detected",

    "riskEvent.unfamiliarFeatures": "Unfamiliar sign-in properties",
    "riskEvent.atypicalTravel": "Atypical travel",
    "riskEvent.maliciousIPAddress": "Malicious IP address",
    "riskEvent.leakedCredentials": "Leaked credentials",
    "riskEvent.passwordSpray": "Password spray",
    "riskEvent.anonymousIPAddress": "Anonymous / Tor IP",
    "riskEvent.impossibleTravel": "Impossible travel",
    "riskEvent.suspiciousInboxManipulation": "Suspicious inbox manipulation",
    "tab.identity.view.label": "Show",
    "tab.identity.view.risky": "Risky users",
    "tab.identity.view.privileged": "Privileged roles",
    "tab.identity.view.sensors": "Sensor health",
    "tab.identity.filter.level": "Level",
    "tab.identity.filter.state": "State",
    "tab.identity.filter.empty": "No users match the active filters.",

    "tab.identity.pim.title": "Privileged role sprawl",
    "tab.identity.pim.subtitle":
      "Active + eligible PIM role assignments in this tenant. Privileged roles are the ones an attacker wants most.",
    "tab.identity.pim.summary":
      "{active} standing · {eligible} eligible · {privileged} privileged",
    "tab.identity.pim.activeKpi": "Active (standing)",
    "tab.identity.pim.eligibleKpi": "Eligible (PIM)",
    "tab.identity.pim.privilegedKpi": "Privileged",
    "tab.identity.pim.col.role": "Role",
    "tab.identity.pim.col.active": "Active",
    "tab.identity.pim.col.eligible": "Eligible",
    "tab.identity.pim.col.total": "Total",
    "tab.identity.pim.empty": "No role assignments reported.",

    "tab.identity.dfi.title": "Defender for Identity — sensor health",
    "tab.identity.dfi.subtitle":
      "Every Defender for Identity sensor the tenant runs, plus its most recent health telemetry.",
    "tab.identity.dfi.summary":
      "{total} sensors · {healthy} healthy · {unhealthy} unhealthy",
    "tab.identity.dfi.totalKpi": "Sensors",
    "tab.identity.dfi.healthyKpi": "Healthy",
    "tab.identity.dfi.unhealthyKpi": "Unhealthy",
    "tab.identity.dfi.notLicensed":
      "No Defender for Identity sensors reported. This tenant either has no DfI deployment or isn't licensed.",
    "tab.identity.dfi.allHealthy":
      "All sensors healthy — no active issues.",
    "tab.identity.dfi.col.sensor": "Sensor / issue",
    "tab.identity.dfi.col.severity": "Severity",
    "tab.identity.dfi.col.status": "Status",
    "tab.identity.dfi.col.category": "Category",
    "tab.identity.dfi.col.created": "Opened",
    "tab.identity.dfi.filter.severity": "Severity",
    "tab.identity.dfi.filter.status": "Status",
    "tab.identity.dfi.filter.empty": "No sensor issues match the active filters.",

    "tab.devices.title": "Managed devices",
    "tab.devices.subtitle": "Intune device inventory and compliance state.",
    "tab.devices.col.name": "Device",
    "tab.devices.col.os": "OS",
    "tab.devices.col.user": "Primary user",
    "tab.devices.col.state": "Compliance",
    "tab.devices.col.encrypted": "Encrypted",
    "tab.devices.col.cves": "CVEs",
    "tab.devices.col.cvesHint": "Click to expand CVE detail",
    "tab.devices.col.lastSync": "Last sync",
    "tab.devices.drilldown.title": "{count} CVEs on this device",
    "tab.devices.drilldown.empty":
      "No CVE data indexed for this device. Defender TVM hasn't reported on it yet.",
    "tab.devices.summary": "{total} devices · {compliancePct}% compliant",

    "tab.connection.title": "Per-endpoint health",
    "tab.connection.subtitle": "Last successful call, errors, throttling across the 24h window.",
    "tab.connection.col.endpoint": "Endpoint",
    "tab.connection.col.lastSuccess": "Last success",
    "tab.connection.col.lastError": "Last error",
    "tab.connection.col.callCount": "Calls (24h)",
    "tab.connection.col.throttled": "Throttled (24h)",

    "directive.eyebrow": "Directive",
    "directive.title": "Baselines and directive actions",
    "directive.subtitle":
      "Center-authored baselines and directive actions that push to consented entities. Every action is previewed, approved, and auditable. Entities decide whether to accept directive consent alongside observation; nothing is pushed without it.",
    "directive.phase": "Phase {n}",
    "directive.status.available": "Available",
    "directive.status.inProgress": "In progress",
    "directive.status.planned": "Planned",
    "directive.setup.title": "Directive app not yet provisioned",
    "directive.setup.body":
      "Directive-mode deployments require a second Entra app with .ReadWrite scopes, separate from the Graph Signals read-only app. Provision it from Settings \u2192 Authentication and grant admin consent before onboarding any entity in directive mode.",
    "directive.setup.cta": "Go to Settings",
    "directive.setup.helper": "One-time setup. Takes about 5 minutes.",
    "directive.roadmap.title": "Capability roadmap",
    "directive.roadmap.subtitle":
      "What this deployment will be able to do as directive phases land. Phase numbering maps to the product plan in docs/13.",
    "directive.cap.incidentOps.title": "Incident operations",
    "directive.cap.incidentOps.body":
      "Classify, assign, comment on Defender XDR incidents and alerts across every directive-consented entity. Low risk, daily-use value.",
    "directive.cap.riskyUsers.title": "Risky user dispositions",
    "directive.cap.riskyUsers.body":
      "Confirm-compromised or dismiss risk detections on Entra ID Protection; force sign-out via revokeSignInSessions.",
    "directive.cap.threatSubmissions.title": "Threat submissions",
    "directive.cap.threatSubmissions.body":
      "Submit phishing emails, malicious URLs, and file hashes to Microsoft for analysis.",
    "directive.cap.caBaselines.title": "Conditional Access baselines",
    "directive.cap.caBaselines.body":
      "Push Center-authored CA policy baselines to every consented entity. Report-only default, two-person approval, per-entity admin exclusion, one-click rollback.",
    "directive.cap.intuneBaselines.title": "Intune compliance baselines",
    "directive.cap.intuneBaselines.body":
      "Push minimum OS, encryption, and passcode policies to every entity's Intune tenant.",
    "directive.cap.iocPush.title": "Indicator push (Defender)",
    "directive.cap.iocPush.body":
      "Block an IP, URL, or file hash across every entity's Defender for Endpoint fleet in one action.",
    "directive.cap.deviceIsolation.title": "Device isolation",
    "directive.cap.deviceIsolation.body":
      "Request isolation of a compromised endpoint. Entity on-call approves; MDE executes. Never unilateral.",
    "directive.cap.namedLocations.title": "Named locations",
    "directive.cap.namedLocations.body":
      "Push Center-mandated trusted IP ranges to every entity's Conditional Access named locations.",
    "directive.guardrails.title": "Safety rails",
    "directive.guardrails.subtitle":
      "These protections are baked into the Directive engine from day one, not opt-in.",
    "directive.guardrails.reportOnly":
      "Every Conditional Access policy lands as report-only. The entity admin (not the Center) toggles enforcement.",
    "directive.guardrails.twoPerson":
      "High-risk baselines require two-person approval. The Center user who pushes is not the user who approves.",
    "directive.guardrails.adminExclusion":
      "Every Center-authored CA policy excludes the entity's own Global Administrators. A bad push cannot lock the entity out of their own tenant.",
    "directive.guardrails.rollback":
      "Every push is recorded with its rollback plan. One click reverses the last N actions.",
    "directive.guardrails.consentGated":
      "Nothing writes to an entity tenant that has not explicitly consented to the Directive app. Observation-only entities are never touched.",

    "mode.observation": "Observation",
    "mode.directive": "Directive",

    "directive.action.title": "Directive action",
    "directive.action.apply": "Apply",
    "directive.action.comment": "Add comment",
    "directive.action.commentLabel": "Analyst comment",
    "directive.action.commentPlaceholder":
      "Short note that lands in the incident / alert on Defender XDR.",
    "directive.action.confirmCompromised": "Confirm compromised",
    "directive.action.dismiss": "Dismiss risk",
    "directive.action.revokeSessions": "Force sign-out",
    "directive.action.riskyHelper":
      "Confirm-compromised flags the user as a genuine threat in Entra ID Protection. Dismiss clears the flag. Force sign-out invalidates every active session for that user.",
    "directive.action.observationHint":
      "This entity was onboarded in observation mode. Directive actions are disabled \u2014 the Center cannot write to this tenant. Upgrade the entity's consent to directive at onboarding to enable.",
    "directive.toast.success": "Sent \u2014 audit #{auditId}",
    "directive.toast.simulated": "Simulated \u2014 audit #{auditId}",

    "directive.threat.title": "Submit threat to Microsoft",
    "directive.threat.subtitle":
      "Forward phishing emails, malicious URLs, and suspicious files to Microsoft for analysis. Submissions feed back into Defender so every entity benefits from the classification.",
    "directive.threat.noDirectiveEntities":
      "No directive-mode entities onboarded yet. Onboard an entity with directive consent first.",
    "directive.threat.kind": "Kind",
    "directive.threat.category": "Category",
    "directive.threat.url": "URL",
    "directive.threat.recipient": "Recipient email",
    "directive.threat.messageUri":
      "Message Graph URI (from Defender XDR alert or email headers)",
    "directive.threat.fileName": "File name",
    "directive.threat.fileContent": "Base64 file content",
    "directive.threat.submit": "Submit",
    "directive.threat.relatedIncident": "Related incident (optional)",
    "directive.threat.pickIncident": "Pick an incident for context…",
    "directive.threat.noIncidents": "No incidents on this entity yet.",
    "directive.threat.alertsCount": "{count} alerts · use the Defender XDR link below to copy the exact URL, message URI, or file hash from the alert evidence.",
    "directive.threat.openInDefender": "Open incident in Defender XDR",
    "directive.threat.contextHint":
      "Pasting the URL / message URI / file from the alert evidence into the form below makes the submission precise. The incident details above stay on screen while you fill the form.",

    "directive.audit.title": "Audit log",
    "directive.audit.subtitle":
      "Every directive action, ever. Refreshes every 15 seconds. Simulated actions against demo tenants are marked so they cannot be confused with real Graph writes.",
    "directive.audit.refresh": "Refresh",
    "directive.audit.empty":
      "No directive actions recorded yet. The next classify / comment / disposition / submission will land here.",
    "directive.audit.col.when": "When",
    "directive.audit.col.entity": "Entity",
    "directive.audit.col.action": "Action",
    "directive.audit.col.target": "Target",
    "directive.audit.col.status": "Status",
    "directive.audit.status.success": "Success",
    "directive.audit.status.simulated": "Simulated",
    "directive.audit.status.failed": "Failed",

    "vuln.eyebrow": "Vulnerability management",
    "vuln.title": "Vulnerabilities across the federation",
    "vuln.subtitle":
      "CVE-level endpoint vulnerabilities pulled from Microsoft Defender Vulnerability Management across every consented entity. Cross-tenant correlation surfaces CVEs affecting multiple entities — what no single CISO can see alone.",
    "vuln.empty.body":
      "No vulnerability data reported yet. Entities need Defender for Endpoint P2 or the Defender Vulnerability Management add-on for TVM telemetry to flow into Graph.",
    "vuln.kpi.totalCves": "Unique CVEs",
    "vuln.kpi.critical": "Critical",
    "vuln.kpi.high": "High",
    "vuln.kpi.exploitable": "Publicly exploitable",
    "vuln.kpi.affectedDevices": "Affected devices",
    "vuln.kpi.exposedDevices": "Exposed devices",
    "vuln.kpi.remediatedDevices": "Remediated devices",
    "vuln.severityFilter": "Severity",
    "vuln.sev.critical": "Critical",
    "vuln.sev.high": "High",
    "vuln.sev.medium": "Medium",
    "vuln.sev.low": "Low",
    "vuln.exploit.yes": "Exploit",
    "vuln.byEntity.title": "By entity",
    "vuln.byEntity.subtitle":
      "Each row is one entity's posture. Click the name to drill into device + CVE detail.",
    "vuln.cols.total": "Total",
    "vuln.cols.critical": "Critical",
    "vuln.cols.high": "High",
    "vuln.cols.exploitable": "Exploitable",
    "vuln.cols.devices": "Devices",
    "vuln.cols.exposedDevices": "Exposed devices",
    "vuln.cols.remediatedDevices": "Remediated",
    "vuln.cols.cve": "CVE",
    "vuln.cols.severity": "Severity",
    "vuln.cols.cvss": "CVSS",
    "vuln.cols.exploit": "Exploit",
    "vuln.cols.published": "Published",
    "vuln.correlated.title": "Cross-tenant correlation",
    "vuln.correlated.subtitle":
      "CVEs present in 2 or more consented entities — a federated view nobody at an individual entity can produce. Prioritize patching here first.",
    "vuln.correlated.summary": "{count} shared",
    "vuln.correlated.empty": "No CVE currently appears in more than one entity.",
    "vuln.correlated.entityCount": "Entities",
    "vuln.correlated.affectedEntities": "Present in",
    "vuln.topCves.title": "Top CVEs across the fleet",
    "vuln.topCves.subtitle":
      "Ranked by severity, CVSS, then total affected devices across all tenants.",
    "vuln.topCves.empty": "No CVEs reported at this severity.",
    "vuln.topCves.totalDevices": "Devices",

    "vuln.drill.loading": "Loading affected devices…",
    "vuln.drill.error": "Failed to load drill-down: {error}",
    "vuln.drill.empty": "No devices reported for this CVE.",
    "vuln.drill.entityHeader":
      "{name} — {exposed} exposed · {remediated} remediated",
    "vuln.drill.col.device": "Device",
    "vuln.drill.col.os": "OS",
    "vuln.drill.col.totalCves": "Total CVEs",
    "vuln.drill.col.critical": "Critical",
    "vuln.drill.col.high": "High",
    "vuln.drill.col.maxCvss": "Max CVSS",
    "vuln.drill.entitiesHint":
      "Click a row in the Entities or Exposed devices columns to expand.",

    "tab.vulnerabilities.title": "Vulnerabilities",
    "tab.vulnerabilities.subtitle":
      "Per-device and per-CVE posture for this entity, pulled from Defender Vulnerability Management.",
    "tab.vulnerabilities.notLicensedTitle":
      "Defender Vulnerability Management not available",
    "tab.vulnerabilities.notLicensedBody":
      "This entity's tenant returned an error querying the TVM tables — usually because they don't have Defender for Endpoint P2 or the Defender Vulnerability Management add-on. No action is required from the Council; the sync is healthy.",
    "tab.vulnerabilities.kpi.cves": "Unique CVEs",
    "tab.vulnerabilities.kpi.critical": "Critical",
    "tab.vulnerabilities.kpi.high": "High",
    "tab.vulnerabilities.kpi.exploitable": "Exploitable",
    "tab.vulnerabilities.kpi.devices": "Devices",
    "tab.vulnerabilities.filter.severity": "Severity",
    "tab.vulnerabilities.filter.exploitOnly": "Exploitable only",
    "tab.vulnerabilities.filter.empty": "No items match the active filters.",
    "tab.vulnerabilities.byDevice.title": "Affected devices",
    "tab.vulnerabilities.byDevice.subtitle":
      "Top 50 devices by critical + high CVE count.",
    "tab.vulnerabilities.byDevice.subtitleAll":
      "All {count} devices with at least one CVE — click the CVE count to see which ones.",
    "tab.vulnerabilities.byDevice.device": "Device",
    "tab.vulnerabilities.byDevice.os": "OS",
    "tab.vulnerabilities.byDevice.cves": "CVEs",
    "tab.vulnerabilities.byDevice.maxCvss": "Max CVSS",
    "tab.vulnerabilities.topCves.title": "Top CVEs on this entity",
    "tab.vulnerabilities.topCves.titleAll": "All CVEs on this entity",
    "tab.vulnerabilities.topCves.subtitle":
      "Ranked by affected device count × CVSS.",
    "tab.vulnerabilities.topCves.subtitleAll":
      "All {count} CVEs on this entity — click the exposed-device count to see which hosts.",
    "tab.vulnerabilities.topCves.clickHint":
      "Show devices affected by this CVE",
    "tab.vulnerabilities.topCves.affectedDevicesLabel":
      "{count} devices affected",
    "tab.vulnerabilities.topCves.noDevices":
      "No devices found for this CVE (likely aged out of the top-50 device window).",
    "tab.vulnerabilities.remediationNotTracked":
      "Remediation count requires a historical snapshot diff — not yet available for this tenant.",

    "tab.attackSim.title": "Attack Simulation Training",
    "tab.attackSim.subtitle":
      "Phishing and social-engineering simulations run by this entity's security team. Low click-rate = users spotted the simulated phish.",
    "tab.attackSim.notLicensedTitle":
      "Attack Simulation Training not configured",
    "tab.attackSim.notLicensedBody":
      "This entity either hasn't run any simulations yet, or doesn't have the Defender for Office 365 Plan 2 add-on that unlocks the simulation workload.",
    "tab.attackSim.kpi.simulations": "Simulations run",
    "tab.attackSim.kpi.attempts": "Users targeted",
    "tab.attackSim.kpi.clicks": "Clicked",
    "tab.attackSim.kpi.clickRate": "Click rate",
    "tab.attackSim.kpi.reported": "Reported",
    "tab.attackSim.list.title": "Simulations timeline",
    "tab.attackSim.list.subtitle":
      "Each row is one simulation run. Click-rate is color-coded: green <10% · amber 10–20% · red 20%+.",
    "tab.attackSim.filter.status": "Status",
    "tab.attackSim.filter.empty": "No simulations match the active filters.",
    "tab.attackSim.col.name": "Simulation",
    "tab.attackSim.col.status": "Status",
    "tab.attackSim.col.clickRate": "Click rate",
    "tab.attackSim.col.launched": "Launched",

    "severity.high": "High",
    "severity.medium": "Medium",
    "severity.low": "Low",
    "severity.informational": "Informational",

    "status.active": "Active",
    "status.inProgress": "In progress",
    "status.resolved": "Resolved",
    "status.redirected": "Redirected",

    "risk.high": "High",
    "risk.medium": "Medium",
    "risk.low": "Low",
    "risk.none": "None",
    "risk.hidden": "Hidden",
    "riskState.atRisk": "At risk",
    "riskState.confirmedCompromised": "Compromised",
    "riskState.remediated": "Remediated",
    "riskState.dismissed": "Dismissed",
    "riskState.confirmedSafe": "Confirmed safe",
    "riskState.none": "None",

    "compliance.compliant": "Compliant",
    "compliance.noncompliant": "Non-compliant",
    "compliance.inGracePeriod": "Grace period",
    "compliance.conflict": "Conflict",
    "compliance.error": "Error",
    "compliance.unknown": "Unknown",

    "rollup.identity.title": "Identity posture — {orgShort} roll-up",
    "rollup.identity.subtitle":
      "Aggregate risky users and Conditional Access coverage across all consented entities.",
    "rollup.threats.title": "Threats — {orgShort} roll-up",
    "rollup.threats.subtitle":
      "Aggregate incidents across all consented entities, by severity and entity.",
    "rollup.devices.title": "Devices — {orgShort} roll-up",
    "rollup.devices.subtitle":
      "Aggregate Intune device compliance across all consented entities.",
    "rollup.totalUsers": "Total risky users (tracked)",
    "rollup.atRiskUsers": "Currently at risk",
    "rollup.caPoliciesMfa": "CA policies with MFA",
    "rollup.activeIncidents": "Active incidents",
    "rollup.totalDevices": "Total managed devices",
    "rollup.compliantDevices": "Compliant",
    "rollup.byEntity": "By entity",

    "placeholder.phase2.title": "Wiring live signals — Phase 2",
    "placeholder.phase2.body":
      "The views for this surface are specified and scaffolded. They will populate once the per-tenant Graph pipeline is online for the first 10 pilot entities.",

    "nav.eyebrow": "Navigate",
    "nav.maturity": "Maturity overview",
    "nav.entities": "Entities",
    "nav.identity": "Identity",
    "nav.threats": "Threats",
    "nav.vulnerabilities": "Vulnerabilities",
    "nav.data": "Data protection",
    "nav.devices": "Devices",
    "nav.governance": "Governance",
    "nav.directive": "Directive",
    "nav.settings": "Settings",
    "nav.faq": "FAQ",
    "sidebar.dataSources": "Data sources",
    "sidebar.dataSources.suffix": "· Graph APIs",
    "ds.secureScore.detail": "tenant & control-level",
    "ds.defender.detail": "Endpoint / Identity / O365",
    "ds.purview.detail": "DLP, labels, insider risk",
    "ds.entra.detail": "identity posture, CA, PIM",
    "ds.intune.detail": "device compliance, MAM",
    "ds.compliance.detail": "UAE NESA",
  },

  ar: {
    "topbar.demo": "بيئة عرض",
    "topbar.language": "اللغة",
    "topbar.notifications": "الإشعارات",
    "theme.switchToLight": "التبديل إلى الوضع الفاتح",
    "theme.switchToDark": "التبديل إلى الوضع الداكن",
    "demo.badge": "بيانات تجريبية",

    "maturity.eyebrow": "نظرة {orgShort}",
    "maturity.title": "نظرة عامة على النضج",
    "maturity.subtitle":
      "الوضع الأمني المباشر لجميع الجهات المتصلة وعددها {count}، محسوب باستمرار من إشارات Microsoft Graph.",

    "chart.clusters.targetLabel": "الهدف {target}",

    "page.identity.eyebrow": "مرصد الهوية والوصول",
    "page.identity.title": "الهوية",
    "page.identity.subtitle":
      "المستخدمون ذوو المخاطر، انحراف سياسات الوصول المشروط، تضخم PIM، المصادقة القديمة، ووضع التحقق متعدد العوامل عبر جميع الجهات المتصلة.",

    "page.threats.eyebrow": "عمليات التهديدات والحوادث",
    "page.threats.title": "التهديدات",
    "page.threats.subtitle":
      "حوادث وتنبيهات موحدة عبر أكثر من ١٠٠ جهة، حزم استعلامات KQL للبحث المتقدم، مزامنة الاكتشافات المخصصة، وطبقات استخبارات التهديدات.",

    "page.data.eyebrow": "وضع حماية البيانات · Purview",
    "page.data.title": "حماية البيانات",
    "page.data.subtitle":
      "تغطية تصنيف الحساسية، كثافة تنبيهات DLP، مخاطر الداخل، الامتثال في الاتصالات، تصنيفات الاحتفاظ، ووضع المشاركة الخارجية.",

    "page.devices.eyebrow": "نظافة الأجهزة والنقاط الطرفية · Intune",
    "page.devices.title": "الأجهزة",
    "page.devices.subtitle":
      "الامتثال حسب نظام التشغيل والجهة، شهادة BitLocker / Secure Boot / TPM، تغطية MAM، والتعمق في الأجهزة غير الممتثلة.",

    "page.governance.eyebrow": "الحوكمة والمعايير",
    "page.governance.title": "الحوكمة",
    "page.governance.subtitle":
      "معايير {orgShort} المرجعية، المواءمة مع إطار NESA الإماراتي، والبحث الموحد في السجلات عبر كل جهة موافِقة.",

    "page.settings.eyebrow": "عمليات {orgShort}",
    "page.settings.title": "الإعدادات",
    "page.settings.subtitle":
      "تسجيل الجهات، صحة الاتصال لكل مستأجر، سجل التدقيق، والإعدادات العامة.",

    "settings.newEntity.title": "تسجيل جهة جديدة",
    "settings.newEntity.subtitle":
      "يجب إدخال الاسم بالعربية والإنجليزية. يُعرض الاسم العربي في الواجهة العربية، ويُعرض الاسم الإنجليزي في الإنجليزية.",

    "wizard.step": "الخطوة {n} من {total}",
    "wizard.step1.title": "تعريف الجهة",
    "wizard.step1.subtitle": "الأسماء والقطاع وجهة اتصال مسؤول أمن المعلومات.",
    "wizard.step2.title": "المستأجر والنطاق",
    "wizard.step2.subtitle":
      "أدخل النطاق الرئيسي المُحقَّق. سنستخرج لك معرّف المستأجر في Entra آليًا عبر اكتشاف OIDC.",
    "wizard.step2.resolve": "استخراج من النطاق",
    "wizard.step2.resolving": "جارٍ الاستخراج…",
    "wizard.step2.resolved": "تم الاستخراج: {tenantId}",
    "wizard.step2.resolveFailed": "تعذّر استخراج معرّف المستأجر من هذا النطاق.",
    "wizard.step2.manualTenant": "أو الصق معرّف المستأجر مباشرة",
    "wizard.step2.license": "تم تأكيد ترخيص E5 لكل المستخدمين (أو توثيق الاستثناءات)",
    "wizard.step3.title": "إنشاء أدوات الموافقة",
    "wizard.step3.subtitle":
      "سننشئ سجل المستأجر، ونصنع رابط موافقة مخصصًا، ونُجهّز ملف PDF ثنائي اللغة. لا يُرسل شيء — راجع المعاينة أدناه قبل إعادة التوجيه إلى المسؤول العام للجهة.",
    "wizard.step3.generate": "إنشاء",
    "wizard.step3.done": "تم الإنشاء. رابط الموافقة وملفات PDF جاهزة أدناه.",
    "wizard.mode.title": "التوجيه على هذه الجهة",
    "wizard.mode.observation.title": "لا — مراقبة فقط",
    "wizard.mode.observation.body":
      "هذه الجهة للقراءة فقط بالنسبة لهذا المركز. لا دفع للسياسات، ولا كتابة للحوادث، ولا إجراءات معالجة. يستطيع المركز رؤية كل شيء ولكن لا يغيّر أي شيء.",
    "wizard.mode.directive.title": "نعم — التوجيه مفعّل",
    "wizard.mode.directive.body":
      "تخضع هذه الجهة لإجراءات المركز التوجيهية: قواعد Conditional Access، وقواعد امتثال Intune، والمواقع المُسمّاة، وتصنيف الحوادث، وفرض تسجيل الخروج، وحجب المؤشرات. كل كتابة تمر بمعاينة وموافقة وقابلة للتدقيق من الطرفين.",
    "wizard.step4.title": "انتظار الموافقة",
    "wizard.step4.subtitle":
      "أعد توجيه خطاب الإعداد إلى المسؤول العام لمستأجر الجهة. تتم مراجعة حالة الموافقة كل ٥ ثوانٍ. يمكنك إغلاق النافذة — سيبقى التقاط الموافقة عبر معالج إعادة التوجيه.",
    "wizard.step4.polling": "جارٍ متابعة حالة الموافقة…",
    "wizard.step4.status.pending": "بانتظار الموافقة",
    "wizard.step4.status.consented": "تم استلام الموافقة",
    "wizard.step4.status.revoked": "تم سحب الموافقة",
    "wizard.step4.status.failed": "فشل مسار الموافقة",
    "wizard.step5.title": "المزامنة الأولى والتحقق",
    "wizard.step5.subtitle":
      "شغّل سحبًا أوليًا من Graph لإثبات جاهزية خط الأنابيب. بمجرد رجوع قيمة Secure Score، تظهر الجهة في اللوحة الحيّة.",
    "wizard.step5.run": "تشغيل المزامنة الأولى",
    "wizard.step5.running": "جارٍ المزامنة…",
    "wizard.step5.ok": "نجحت المزامنة الأولى. الجهة تظهر الآن في لوحة النضج.",
    "wizard.step5.failed": "فشلت المزامنة: {message}",
    "wizard.nav.back": "رجوع",
    "wizard.nav.next": "التالي",
    "wizard.nav.finish": "إنهاء",
    "wizard.nav.cancel": "إلغاء",
    "wizard.toggle.useForm": "استخدم النموذج السريع",
    "wizard.toggle.useWizard": "استخدم المعالج الموجَّه",
    "settings.field.nameEn": "الاسم (بالإنجليزية)",
    "settings.field.nameAr": "الاسم (بالعربية)",
    "settings.field.cluster": "القطاع",
    "settings.field.tenantId": "معرّف المستأجر",
    "settings.field.domain": "النطاق الرئيسي",
    "settings.field.ciso": "اسم مسؤول أمن المعلومات",
    "settings.field.cisoEmail": "بريد مسؤول أمن المعلومات",
    "settings.field.required": "حقل مطلوب",
    "settings.submit.add": "إنشاء رسالة التسجيل",
    "settings.submit.preview":
      "في الإنتاج يتم توليد رسالة تسجيل بصيغة PDF ورابط موافقة إداري خاص بمسؤول أمن الجهة.",
    "settings.existing.title": "الجهات المسجّلة",
    "settings.existing.subtitle":
      "عدد الجهات المسجّلة حالياً {count}. يُحفظ الاسمان ويُعرض أحدهما بحسب اللغة الحالية.",
    "settings.list.clusterHeader": "القطاع",
    "settings.list.status": "الحالة",

    "state.loading": "جارٍ التحميل…",
    "state.error": "حدث خطأ ما.",
    "state.retry": "إعادة المحاولة",
    "state.empty.title": "لا توجد جهات متصلة بعد",
    "state.empty.body":
      "سجّل أول جهة من تبويب الإعدادات. بعد موافقة المسؤول، تُعبّأ اللوحة تلقائياً من Microsoft Graph.",
    "state.empty.cta": "الذهاب إلى الإعدادات",
    "state.notConfigured.title": "لم يُعدّ تسجيل تطبيق Azure",
    "state.notConfigured.body":
      "اضبط AZURE_CLIENT_ID و AZURE_CLIENT_SECRET في ملف .env.local (راجع docs/08-phase2-setup.md) ثم أعد تشغيل الخادم.",

    "consent.status.pending": "بانتظار الموافقة",
    "consent.status.consented": "تمت الموافقة",
    "consent.status.revoked": "أُلغيت الموافقة",
    "consent.status.failed": "فشلت الموافقة",

    "sync.last": "آخر مزامنة {when}",
    "sync.never": "لم تتم المزامنة بعد",
    "sync.now": "مزامنة الآن",
    "sync.inProgress": "جارٍ المزامنة…",
    "sync.failed": "فشلت المزامنة",
    "sync.all": "مزامنة كل الجهات",
    "sync.all.title": "مزامنة كل الجهات الآن",
    "sync.all.body":
      "يُشغّل هذا تحديثاً شاملاً للوضع الأمني عبر جميع مستأجري الجهات الموافقة. تُجري كل جهة خمس استدعاءات لـ Microsoft Graph (Secure Score، الوصول المشروط، المستخدمون ذوو المخاطر، الأجهزة، الحوادث) بالتسلسل احتراماً لحدود الاستدعاء لكل مستأجر.",
    "sync.all.warning":
      "قد يستغرق هذا عدة دقائق. احرص على إبقاء هذه الصفحة مفتوحة حتى اكتمال العملية — إغلاقها لا يُلغي المزامنة.",
    "sync.all.estimate": "الوقت المتوقع: حوالي {duration}.",
    "sync.all.tenantsReal": "{n} مستأجر حقيقي × ~{perTenant} ثانية.",
    "sync.all.tenantsDemo": "{n} مستأجر تجريبي — فوري، بدون استدعاءات Graph.",
    "sync.all.running": "تتم مزامنة {n} جهة — الرجاء الانتظار",
    "sync.all.running.body":
      "لا تُغلق هذه الصفحة. ستُحدَّث تلقائياً عند اكتمال المزامنة.",
    "sync.all.done": "اكتملت المزامنة",
    "sync.all.doneBody": "نجحت {ok} من أصل {total} جهات.",
    "sync.all.cancel": "إلغاء",
    "sync.all.start": "بدء المزامنة",
    "sync.all.close": "إغلاق",
    "time.seconds": "{n} ثانية",
    "time.minutes": "{n} دقيقة",
    "time.minutesSeconds": "{m}د {s}ث",

    "settings.consent.linkReady":
      "أرسل رابط الموافقة أدناه إلى المسؤول العام للجهة. بعد الموافقة، تبدأ المزامنة الأولى تلقائياً.",
    "settings.consent.openLink": "فتح رابط الموافقة",
    "settings.consent.copy": "نسخ الرابط",
    "settings.consent.copied": "تم النسخ",
    "settings.consent.awaiting":
      "بانتظار موافقة المسؤول من الجهة. ستظهر البيانات بعد الضغط على الرابط.",
    "settings.consent.notConfigured":
      "لم يُعدّ تسجيل تطبيق Entra بعد؛ تم حفظ الجهة، لكن لا يمكن توليد رابط الموافقة حتى يُضبط AZURE_CLIENT_ID.",
    "settings.consent.failed":
      "أبلغ تدفق الموافقة عن خطأ. راجع سياسات الوصول المشروط للجهة ثم أعد المحاولة.",
    "settings.consent.ok": "تم استلام الموافقة. المزامنة الأولى جارية — حدّث الصفحة بعد لحظات.",
    "settings.pdf.download": "تنزيل الرسالة",
    "settings.pdf.en": "بالإنجليزية",
    "settings.pdf.ar": "بالعربية",

    "settings.tab.entities": "الجهات",
    "settings.tab.branding": "الهوية",
    "settings.tab.maturity": "مؤشر النضج",
    "settings.tab.pdf": "ملف PDF للتسجيل",
    "settings.tab.discovery": "ملف PDF للاكتشاف",
    "settings.tab.audit": "سجل التدقيق",
    "settings.tab.azure": "تسجيل التطبيق",
    "settings.tab.nesa": "مواءمة NESA",
    "settings.tab.docs": "التوثيق",
    "settings.tab.about": "حول والتحديثات",

    "settings.about.title": "حول Mizan",
    "settings.about.subtitle":
      "تحقق من الإصدار المُثبَّت وما إذا كان هناك إصدار أحدث متاح على GitHub.",
    "settings.about.current": "الإصدار المُثبَّت",
    "settings.about.latest": "أحدث إصدار متاح",
    "settings.about.published": "تم إصداره",
    "settings.about.upToDate": "أنت تستخدم أحدث إصدار.",
    "settings.about.updateAvailable":
      "تحديث متاح — v{version}. اختر أحد الأوامر أدناه للترقية.",
    "settings.about.azureCmd": "Azure Container Apps",
    "settings.about.dockerCmd": "Docker / استضافة ذاتية",
    "settings.about.openReleaseNotes": "فتح ملاحظات الإصدار على GitHub",
    "settings.about.lastChecked": "آخر فحص",
    "settings.about.checkNow": "افحص الآن",
    "settings.about.releaseNotes": "ملاحظات الإصدار",
    "settings.about.checkFailedTitle": "تعذّر الاتصال بـ GitHub للتحقق من التحديثات",

    "branding.title": "الهوية",
    "branding.subtitle":
      "اسم الجهة والألوان وإطار العمل. يُطبَّق على لوحة التحكم وملفات PDF ورسائل التسجيل.",
    "branding.field.nameEn": "اسم الجهة (إنجليزي)",
    "branding.field.nameAr": "اسم الجهة (عربي)",
    "branding.field.shortEn": "الاختصار (إنجليزي)",
    "branding.field.shortAr": "الاختصار (عربي)",
    "branding.field.taglineEn": "الشعار (إنجليزي)",
    "branding.field.taglineAr": "الشعار (عربي)",
    "branding.field.accentColor": "اللون الأساسي",
    "branding.field.accentColorStrong": "اللون الأساسي القوي",
    "branding.field.framework": "إطار النضج",
    "branding.framework.generic": "عام (بدون إطار)",
    "branding.framework.nesa": "NESA الإمارات",
    "branding.framework.dubai-isr": "ISR دبي",
    "branding.framework.nca": "NCA السعودية",
    "branding.framework.isr": "ISR / ISO 27001",
    "branding.field.logo": "شعار الجهة",
    "branding.logo.helper":
      "PNG أو JPEG أو WebP. تُزال الخلفية تلقائيًا عبر نموذج ML محلي ما لم تُفعّل الخيار أدناه. يُفضَّل: مربع، ٢٥٦×٢٥٦ أو أكثر.",
    "branding.logo.keepBackground": "الإبقاء على خلفية الصورة الأصلية",
    "branding.logo.upload": "رفع الشعار",
    "branding.logo.remove": "إزالة",
    "branding.logo.saved": "تم رفع الشعار",
    "branding.logo.removed": "تمت إزالة الشعار",
    "branding.logo.deleteConfirm":
      "إزالة الشعار الحالي؟ ستعتمد اللوحة على الاختصار النصي حتى رفع شعار جديد.",

    "login.title": "تسجيل الدخول",
    "login.subtitle": "لوحة الوضع الأمني",
    "login.body":
      "سجّل الدخول بحساب Microsoft الخاص بالجهة. يقتصر الوصول إلى بيانات الوضع والنضج على المستخدمين المسجلين في اللوحة.",
    "login.signIn": "المتابعة عبر Microsoft",
    "login.footer": "وصول مقيَّد · الهوية عبر Microsoft Entra",
    "login.error.forbidden": "ليس لحسابك صلاحية الوصول إلى هذه اللوحة.",
    "login.error.state_mismatch":
      "تم قطع عملية تسجيل الدخول. يرجى المحاولة مرة أخرى.",
    "login.error.token_exchange":
      "رفضت Microsoft المصادقة. تحقق من إعدادات تسجيل التطبيق.",
    "login.error.missing_params": "عنوان تسجيل الدخول غير مكتمل.",

    "settings.tab.auth": "المصادقة",
    "directiveCfg.title": "تطبيق التوجيهات",
    "directiveCfg.subtitle":
      "تسجيل تطبيق Entra ثانٍ بصلاحيات .ReadWrite. مطلوب قبل إدراج أي جهة في وضع التوجيهات. أنشئه في مركز إدارة Entra، ألصق بيانات الاعتماد أدناه، وامنح موافقة المسؤول على كل صلاحية.",
    "directiveCfg.field.clientId": "معرّف عميل تطبيق التوجيهات",
    "directiveCfg.field.clientSecret": "سر تطبيق التوجيهات",
    "directiveCfg.field.authorityHost": "مضيف الصلاحيات",
    "directiveCfg.clientIdHelper":
      "متميّز عن تطبيق Graph للقراءة فقط. بوابة Entra ← تسجيلات التطبيقات ← تسجيل جديد.",
    "directiveCfg.secretSet": "تم تخزين السر",
    "directiveCfg.secretUnset": "غير محدد",
    "directiveCfg.secretSetPlaceholder": "(مخزّن بالفعل — اتركه فارغًا للإبقاء عليه)",
    "directiveCfg.secretUnsetPlaceholder": "ألصق قيمة السر من Entra",
    "directiveCfg.save": "حفظ",
    "directiveCfg.saved": "تم الحفظ. ستستخدم نهايات الكتابة في المرحلة الثانية هذه البيانات.",
    "directiveCfg.clear": "مسح",
    "directiveCfg.clearConfirm":
      "مسح بيانات اعتماد تطبيق التوجيهات؟ سيتوقف أي عمل توجيهي قيد التنفيذ. تبقى الجهات النشطة في وضع التوجيهات ولكن لا يمكن إصدار المزيد من عمليات الكتابة حتى تُستعاد بيانات الاعتماد.",
    "directiveCfg.warningTitle": "ملاحظة امتثال",
    "directiveCfg.warningBody":
      "تتضمن صلاحيات تطبيق التوجيهات: Policy.ReadWrite.ConditionalAccess و DeviceManagementConfiguration.ReadWrite.All و SecurityIncident.ReadWrite.All و IdentityRiskyUser.ReadWrite.All. أي جهة توافق على هذا التطبيق تمنح المركز القدرة على الكتابة في مستأجرها. تعامل مع خطوة موافقة المسؤول بالجدية التي تستحقها.",

    "authCfg.title": "مصادقة المستخدمين",
    "authCfg.subtitle":
      "تسجيل الدخول للمشغّلين والمحللين. يستخدم تسجيل تطبيق Entra ثانيًا (مستقل عن تطبيق قراءة وضع الجهات). تسجيل الدخول مطلوب دائمًا — يتولى معالج الإعداد الأولي تسجيل الدخول تلقائيًا.",
    "authCfg.field.clientId": "معرّف تطبيق المصادقة",
    "authCfg.field.clientSecret": "سر تطبيق المصادقة",
    "authCfg.field.clientSecretPlaceholder":
      "أدخل سرًا جديدًا، أو اتركه فارغًا للإبقاء على الموجود",
    "authCfg.field.tenantId": "معرّف مستأجر Entra المشغِّل",
    "authCfg.field.sessionTimeout": "مدة الجلسة",
    "authCfg.field.defaultRole": "الدور الافتراضي للمستخدمين الجدد",
    "authCfg.session.8h": "٨ ساعات",
    "authCfg.session.1d": "٢٤ ساعة",
    "authCfg.session.7d": "٧ أيام (موصى به)",
    "authCfg.session.30d": "٣٠ يومًا (الحد الأقصى)",
    "authCfg.session.helper":
      "نافذة منزلقة — أي نشاط داخل النافذة يُمدّد الانتهاء، بحد أقصى ٣٠ يومًا. بعد انتهاء النافذة يُعيد المستخدمون تسجيل الدخول عبر Microsoft SSO (عادةً فوريًا دون طلب كلمة المرور).",
    "authCfg.role.admin": "مشرف",
    "authCfg.role.analyst": "محلل",
    "authCfg.role.viewer": "مشاهد",
    "authCfg.redirectUri": "Redirect URI (انسخه إلى تطبيق Entra)",
    "authCfg.save": "حفظ إعدادات المصادقة",
    "authCfg.saved":
      "تم الحفظ. يرجى تسجيل الخروج وإعادة الدخول لاعتماد الإعدادات.",
    "authCfg.clear": "مسح",
    "authCfg.clearConfirm":
      "مسح إعدادات المصادقة؟ تظل الجلسات النشطة حتى انتهاء صلاحيتها.",
    "authCfg.secretSet": "السر محفوظ",
    "authCfg.secretUnset": "غير محدد",
    "authCfg.signOut": "تسجيل الخروج",
    "authCfg.testSignIn": "تجربة تسجيل الدخول (نافذة جديدة)",

    "users.title": "مستخدمو اللوحة",
    "users.subtitle":
      "كل من يمكنه تسجيل الدخول. ادعُ عبر البريد لتحديد الدور مسبقًا، أو عدّل دور المستخدم بعد أول تسجيل دخول.",
    "users.empty":
      "لا يوجد مستخدمون بعد. ادعُ أول مشرف أو سجّل الدخول مرة واحدة بنفسك لبدء النظام.",
    "users.deleteConfirm":
      "حذف هذا المستخدم؟ ستُنهى جلساته فورًا.",
    "users.status.active": "نشط",
    "users.status.disabled": "معطَّل",
    "users.status.pending": "بانتظار أول تسجيل دخول",
    "users.col.user": "المستخدم",
    "users.col.role": "الدور",
    "users.col.status": "الحالة",
    "users.col.lastLogin": "آخر دخول",
    "users.action.enable": "تفعيل",
    "users.action.disable": "تعطيل",
    "users.action.delete": "حذف",
    "users.invite.title": "دعوة مستخدم جديد",
    "users.invite.displayName": "الاسم الظاهر (اختياري)",
    "users.invite.submit": "دعوة",
    "users.invite.helper":
      "يُنشئ سجلًا معلَّقًا. يُطبَّق الدور على المستخدم عند أول تسجيل دخول عبر Microsoft — لا نُرسل إليه بريدًا.",

    "setup.title": "الإعداد الأولي",
    "setup.back": "السابق",
    "setup.next": "التالي",
    "setup.skipHint":
      "يمكنك تخطي هذه الخطوة وإعدادها لاحقًا من الإعدادات.",
    "setup.deployment.title": "وضع النشر",
    "setup.deployment.subtitle":
      "يُختار مرة واحدة ودائم. يحدّد مجموعة صلاحيات تطبيق Graph، وما إذا كانت الإجراءات التوجيهية متاحة في المنتج.",
    "setup.deployment.observation.title": "قراءة فقط",
    "setup.deployment.observation.body":
      "يُنشَأ تطبيق Graph بصلاحيات .Read.All فقط. يستطيع المركز مراقبة وضع كل جهة مُصرِّحة ولا يستطيع دفع أي سياسة أو اتخاذ أي إجراء توجيهي. مناسب للمجالس الرقابية وعمليات التدقيق فقط.",
    "setup.deployment.directive.title": "قراءة / كتابة",
    "setup.deployment.directive.body":
      "يُنشَأ تطبيق Graph بصلاحيات .Read.All و .ReadWrite.All. يستطيع المركز دفع القواعد المعتمَدة والإجراءات التوجيهية على الجهات التي توافق صراحةً على التوجيه عند الإدراج. مناسب للجهات التنظيمية.",
    "setup.deployment.lockedHint":
      "تم تحديد وضع النشر ولا يمكن تغييره. لتغييره يلزم إعادة النشر.",
    "setup.deployment.unlockedWarning":
      "اختر بعناية. هذا القرار دائم بمجرد الضغط على التالي.",
    "setup.s1.title": "١. اسم الجهة",
    "setup.s1.subtitle":
      "هذا الاسم يظهر في كل مكان — واجهة اللوحة، ملفات PDF، الرسائل، صفحة تسجيل الدخول.",
    "setup.s2.title": "٢. الشعار",
    "setup.s2.subtitle":
      "ارفع PNG/JPEG/WebP. تُزال الخلفية محليًا عبر نموذج ML — بدون أي خدمة سحابية.",
    "setup.s2.skip":
      "اختياري — يمكنك التخطي وإضافة الشعار لاحقًا من الإعدادات.",
    "setup.s3.title": "٣. تطبيق إشارات Graph",
    "setup.s3.subtitle":
      "تطبيق Entra متعدد المستأجرين لقراءة الوضع الأمني من كل جهة. يوافق المسؤول العام لكل جهة على هذا التطبيق داخل مستأجره.",
    "setup.s3.b1":
      "مركز إدارة Entra → App registrations → New registration → متعدد المستأجرين",
    "setup.s3.b2":
      "أضف أذونات Graph للقراءة فقط (SecurityEvents.Read.All، Device.Read.All، Directory.Read.All، User.Read.All، Policy.Read.All — أذونات تطبيق).",
    "setup.s3.b3":
      "أنشئ سر عميل والصق معرّف العميل والسر أدناه.",
    "setup.s4.title": "٤. تطبيق تسجيل دخول المستخدمين",
    "setup.s4.subtitle":
      "تطبيق Entra ثانٍ — مستقل — أحادي المستأجر لدخول موظفيك إلى اللوحة. نحتفظ به منفصلًا عن تطبيق Graph لندوير الأسرار باستقلالية.",
    "setup.s4.b1":
      "مركز إدارة Entra → App registrations → New registration → أحادي المستأجر",
    "setup.s4.b2":
      "تحت Authentication → Web platform، أضِف عنوان إعادة التوجيه:",
    "setup.s4.b3":
      "أنشئ سر عميل. اختياريًا عرّف App roles (Posture.Admin/Analyst/Viewer) وعيّن المستخدمين؛ وإلا يُطبَّق الدور الافتراضي أدناه.",
    "setup.s5.title": "٥. إنشاء مشرف النظام",
    "setup.s5.subtitle":
      "سجّل الدخول الآن — أول حساب يكمل الدخول يصبح مشرفًا تلقائيًا.",
    "setup.s5.bootstrapBody":
      "يفتح الزر أدناه تسجيل الدخول في Microsoft في هذه النافذة. عُد واضغط إنهاء.",
    "setup.s5.openBody":
      "لقد تخطيت خطوة تسجيل الدخول — ستبقى اللوحة مفتوحة (لا حاجة لتسجيل الدخول). يمكنك إعداد المصادقة في أي وقت من الإعدادات ← المصادقة.",
    "setup.s5.signIn": "تسجيل الدخول كمشرف",
    "setup.s5.afterSignIn":
      "بعد تسجيل الدخول ستعود إلى هنا. اضغط إنهاء لفتح اللوحة.",
    "setup.s5.finish": "إنهاء الإعداد — فتح اللوحة",
    "setup.s5.alreadyTitle": "تم تسجيل الدخول — أنت مشرف النظام المُهيَّأ",
    "setup.s5.alreadyBody":
      "عند تأكيد رمز الجهاز في خطوة سابقة، استخدمنا ذلك التسجيل نفسه لإنشاء جلسة المشرف. لا حاجة لجولة ثانية مع Microsoft. اضغط إنهاء لفتح اللوحة.",
    "setup.s5.consentTitle": "منح موافقة المسؤول في Entra (خطوة يدوية)",
    "setup.s5.consentBody":
      "أنشأ Mizan تسجيلَي التطبيق نيابةً عنك وحفظ بيانات الاعتماد، لكن Microsoft تشترط منح موافقة المسؤول من بوابة Entra. لكل تطبيق للتو أُنشئ: بوابة Entra ← App registrations ← هذا التطبيق ← API permissions ← Grant admin consent لمستأجرك. بدون هذه الموافقة سيفشل تسجيل الدخول أدناه برمز AADSTS65001.",

    "setup.prov.autoTitle": "الإنشاء التلقائي (موصى به)",
    "setup.prov.autoBody":
      "نقرة واحدة — يطلب Mizan من Microsoft رمزًا قصير الأمد، وتسجّل الدخول مرة واحدة كمسؤول في المستأجر، ونقوم بإنشاء تسجيل التطبيق وسرّ العميل وتوصيل كل شيء. لا حاجة لفتح بوابة Azure.",
    "setup.prov.start": "أنشئ لي التطبيق",
    "setup.prov.waiting": "بانتظار تسجيل دخولك عبر Microsoft…",
    "setup.prov.step1a": "افتح هذا الرابط على أي جهاز:",
    "setup.prov.step2a": "أدخل هذا الرمز عند الطلب:",
    "setup.prov.step3a":
      "سجّل الدخول بحساب مسؤول Entra في مستأجر الجهة المشغِّلة ومنح الأذونات. سيكمل Mizan الباقي تلقائيًا — عُد إلى هذه النافذة.",
    "setup.prov.expires":
      "ينتهي الرمز خلال {minutes} دقيقة تقريبًا. لا تُغلق هذه النافذة.",
    "setup.prov.cancel": "إلغاء",
    "setup.prov.success": "تم إنشاء التطبيق وحفظ بيانات الاعتماد",
    "setup.prov.successHint":
      "يمكنك الضغط على التالي — تم حفظ بيانات الاعتماد. تبقّى إجراء يدوي واحد: افتح بوابة Entra ← تسجيلات التطبيقات ← هذا التطبيق ← أذونات API ← منح موافقة المسؤول لمستأجرك. تشترط Microsoft تنفيذ هذه الخطوة من البوابة.",
    "setup.prov.failed": "فشل الإنشاء",
    "setup.prov.retry": "حاول مرة أخرى",
    "setup.prov.manualToggle": "أو أدخل بيانات اعتماد موجودة يدويًا",
    "branding.save": "حفظ",
    "branding.reset": "استعادة الافتراضي",
    "branding.resetConfirm":
      "استعادة الهوية إلى الإعدادات الافتراضية؟ سيتم الكتابة فوق الاسم والألوان والإطار.",
    "branding.saved": "تم حفظ الهوية — جارٍ إعادة التحميل",

    "docs.title": "توثيق تسليم العميل",
    "docs.subtitle":
      "وثائق PDF مرفقة بالمنصة. يُسلَّم كل مستند كملف منفصل بالإنجليزية وآخر بالعربية (أحادي اللغة — بدون ملفات PDF مختلطة النص). اضغط لفتحه في تبويب جديد؛ كليك يمين ← حفظ باسم للأرشفة.",
    "docs.open.en": "فتح EN",
    "docs.open.ar": "فتح AR",
    "docs.doc.install.title": "دليل التثبيت والنشر",
    "docs.doc.install.body":
      "دليل من الصفر إلى التشغيل لتقنية المعلومات في {orgShort} وفرق تسليم Microsoft. يغطي المتطلبات، تسجيل تطبيق Entra، إعداد البيئة، نشر Docker و Azure، تسجيل أول جهة، المهام التشغيلية، واستكشاف الأخطاء.",
    "docs.doc.operator.title": "دليل المستخدم التشغيلي",
    "docs.doc.operator.body":
      "الاستخدام اليومي للوحة لموظفي {orgShort}. جولة صفحة تلو الأخرى، كيفية قراءة مؤشر النضج، المهام الشائعة (تسجيل جهة، تعديل الأوزان، التحقيق في الجهات الحمراء، تصدير التقارير).",
    "docs.doc.security.title": "بيان الأمن والخصوصية",
    "docs.doc.security.body":
      "بيان رسمي لما تقرأه المنصة وما لا تقرأه، وضع التخزين والسيادة، ضبط الوصول، التدقيق والاحتفاظ، الإلغاء والخروج، المواءمة مع الأطر. موجَّه لقيادة {orgShort}، مسؤولي أمن المعلومات، والمراجعة القانونية.",
    "docs.doc.arch.title": "البنية وتدفق البيانات — نظرة عامة",
    "docs.doc.arch.body":
      "نظرة على مستوى الأنظمة لمهندسي تسليم Microsoft ومعماريي تقنية المعلومات في {orgShort}. بنية النظام، نموذج المصادقة متعدد المستأجرين، منسق المزامنة ومجموعة العمال، نموذج البيانات، إطار التقييد، أوضاع الفشل، قرارات النطاق.",
    "docs.doc.handoff.title": "قائمة تسليم المنتج",
    "docs.doc.handoff.body":
      "وثيقة قبول. تُعدِّد ما تم تسليمه، معايير القبول الوظيفي، الإجراءات المعلَّقة من المشغّل، النطاق المؤجَّل، فهرس التوثيق، وخانة التوقيع.",

    "azureCfg.walkthrough.title": "كيفية تسجيل التطبيق في Entra",
    "azureCfg.walkthrough.subtitle":
      "خطوة بخطوة: أنشئ تطبيق Entra متعدد المستأجرين في مستأجر {orgShort}، امنح أذونات قراءة Graph، أنشئ سر عميل، والصق القيم أدناه.",
    "azureCfg.walkthrough.toggle.show": "إظهار الخطوات",
    "azureCfg.walkthrough.toggle.hide": "إخفاء الخطوات",
    "azureCfg.walkthrough.redirectUri":
      "رابط إعادة التوجيه المطلوب لصقه في Entra (المنصة: Web)",

    "azureCfg.title": "تسجيل تطبيق Entra",
    "azureCfg.subtitle":
      "بيانات اعتماد تطبيق Entra متعدد المستأجرين الخاص ب{orgShort} والذي يقرأ إشارات Graph من كل جهة موافِقة. مخزَّنة في قاعدة بيانات اللوحة؛ وتأخذ مفعولها فور الحفظ (تُفرَّغ ذاكرة MSAL المؤقتة). تبقى متغيرات البيئة في .env.local بديلًا احتياطيًا لعمليات التثبيت الجديدة.",
    "azureCfg.field.clientId": "معرّف التطبيق (client ID)",
    "azureCfg.field.clientSecret": "سر العميل",
    "azureCfg.field.authorityHost": "مضيف الجهة المُصدِرة",
    "azureCfg.field.consentRedirectUri": "رابط إعادة توجيه الموافقة (تجاوز)",
    "azureCfg.field.consentRedirectUri.hint":
      "اتركه فارغًا لاشتقاقه تلقائيًا من APP_BASE_URL. اضبطه صراحةً إذا كان نشر الإنتاج يستخدم اسم مضيف عامًا مختلفًا.",
    "azureCfg.secret.hasValue": "يوجد سر مخزَّن. اكتب قيمة جديدة لاستبداله.",
    "azureCfg.secret.placeholderReplace": "••••••••  (مخفي — اكتب للاستبدال)",
    "azureCfg.secret.placeholderNew": "الصق قيمة سر العميل",
    "azureCfg.secret.never": "لا يوجد سر مخزَّن بعد.",
    "azureCfg.source.db": "من قاعدة البيانات",
    "azureCfg.source.env": "من متغير البيئة (احتياطي)",
    "azureCfg.source.none": "غير مضبوط",
    "azureCfg.source.label": "المصدر:",
    "azureCfg.save": "حفظ",
    "azureCfg.saved": "تم الحفظ. تم تفريغ ذاكرة MSAL — ستستخدم المزامنة التالية البيانات الجديدة.",
    "azureCfg.clear": "مسح بيانات الاعتماد المخزَّنة",
    "azureCfg.cleared": "تم المسح. تعود للبيئة إن وُجدت.",
    "azureCfg.status.ready": "جاهز — يجب أن يعمل طلب رموز Graph.",
    "azureCfg.status.missing":
      "غير مضبوط. ستُرجع المزامنات الحقيقية خطأ ٤١٢ حتى تضبط معرّف العميل وسر العميل.",
    "azureCfg.updatedAt": "آخر تحديث {when}",

    "audit.title": "سجل الوصول عبر Microsoft Graph",
    "audit.subtitle":
      "كل نقطة نهاية في Graph استدعاها {orgShort} مقابل مستأجر كل جهة، مع آخر نجاح وآخر خطأ وعدد الاستدعاءات خلال ٢٤ ساعة وعدد الاستدعاءات المقيدة. تُكتب هذه البيانات في جدول endpoint_health مع كل مزامنة.",
    "audit.empty":
      "لا توجد استدعاءات Graph مسجلة بعد. يبدأ السجل بالامتلاء بعد أول مزامنة حقيقية.",
    "audit.search": "بحث عن جهة أو نقطة نهاية أو خطأ…",
    "audit.filter.all": "الكل",
    "audit.filter.ok": "سليم",
    "audit.filter.errors": "بها أخطاء",
    "audit.filter.throttled": "مقيدة",
    "audit.col.entity": "الجهة",
    "audit.col.endpoint": "نقطة النهاية",
    "audit.col.lastSuccess": "آخر نجاح",
    "audit.col.lastError": "آخر خطأ",
    "audit.col.calls": "الاستدعاءات (٢٤ س)",
    "audit.col.throttled": "مقيدة",
    "audit.refresh": "تحديث",
    "audit.showing": "عرض {shown} من أصل {total} سجلًا.",

    "discovery.banner.title": "ابدأ هنا — أرسل رسالة الاكتشاف أولاً",
    "discovery.banner.body":
      "قبل تسجيل جهة في النموذج أدناه، تحتاج الجهة أن تُرسل لكم معرّف المستأجر، النطاق الرئيسي، المسؤول العام، مسؤول أمن المعلومات، وتأكيد الترخيص. حمّل رسالة الاكتشاف ثنائية اللغة وأرسلها إلى كل جهة — تُوضّح لهم بدقة ما يجب جمعه وأين يجدونه. بعد ردّهم بالمعلومات، عد إلى هذا النموذج.",
    "discovery.banner.download": "تنزيل رسالة الاكتشاف",
    "discovery.banner.preview": "معاينة",

    "discoveryCfg.title": "قالب رسالة الاكتشاف",
    "discoveryCfg.subtitle":
      "رسالة ما قبل التسجيل. تُرسَل إلى كل جهة قبل ظهورها في اللوحة. تُرشِد فريقهم التقني بدقة إلى ما يجب جمعه (معرّف المستأجر، النطاق الرئيسي، الترخيص، المسؤول العام، مسؤول أمن المعلومات) وأين يجد كل عنصر في Microsoft 365.",
    "discoveryCfg.reset": "استعادة الافتراضي",
    "discoveryCfg.save": "حفظ القالب",
    "discoveryCfg.saved": "تم حفظ القالب. أعد تنزيل النسخة الجديدة.",
    "discoveryCfg.preview": "معاينة PDF",
    "discoveryCfg.section.brand": "هوية {orgShort} والترويسة",
    "discoveryCfg.section.title": "عنوان الوثيقة والعنوان الفرعي",
    "discoveryCfg.section.contact": "جهة الاتصال للرد",
    "discoveryCfg.section.overview": "سبب التواصل",
    "discoveryCfg.section.steps": "خطوات القائمة",
    "discoveryCfg.section.sendBack": "كيفية إرسال الرد",
    "discoveryCfg.section.next": "الخطوات التالية",
    "discoveryCfg.section.footer": "التذييل",
    "discoveryCfg.field.overviewEn": "نظرة عامة (بالإنجليزية)",
    "discoveryCfg.field.overviewAr": "نظرة عامة (بالعربية)",
    "discoveryCfg.field.sendBackEn": "تعليمات الإرسال (بالإنجليزية)",
    "discoveryCfg.field.sendBackAr": "تعليمات الإرسال (بالعربية)",
    "discoveryCfg.field.nextEn": "وصف الخطوة التالية (بالإنجليزية)",
    "discoveryCfg.field.nextAr": "وصف الخطوة التالية (بالعربية)",
    "discoveryCfg.field.phone": "رقم الهاتف (اختياري)",
    "discoveryCfg.field.stepTitleEn": "عنوان الخطوة (بالإنجليزية)",
    "discoveryCfg.field.stepTitleAr": "عنوان الخطوة (بالعربية)",
    "discoveryCfg.field.stepWhatEn": "ما المطلوب (بالإنجليزية)",
    "discoveryCfg.field.stepWhatAr": "ما المطلوب (بالعربية)",
    "discoveryCfg.field.stepWhereEn": "مكان العثور (بالإنجليزية)",
    "discoveryCfg.field.stepWhereAr": "مكان العثور (بالعربية)",
    "discoveryCfg.stepHeading": "الخطوة {n}",

    "faq.q.flow.title": "ما تدفق التسجيل من البداية للنهاية؟",
    "faq.q.flow.body":
      "مرحلتان.\n\nالمرحلة الأولى — الاكتشاف. يحمّل {orgShort} رسالة الاكتشاف من الإعدادات ويرسلها إلى مسؤول أمن المعلومات في كل جهة. الرسالة (ثنائية اللغة) تُرشِد فريق الجهة التقني لجمع خمسة عناصر: معرّف مستأجر Entra، النطاق الرئيسي المتحقَّق، تأكيد ترخيص E5، مسؤول عام سيضغط رابط الموافقة، وجهة اتصال معيَّنة لمسؤول أمن المعلومات. ترد الجهة بهذه التفاصيل.\n\nالمرحلة الثانية — التسجيل. يُدخل {orgShort} التفاصيل في الإعدادات ويضغط 'إنشاء رسالة التسجيل'. تنشئ اللوحة سجل مستأجر بانتظار الموافقة، تولّد رابط موافقة مسؤول فريد، وتنتج ملف PDF مخصصاً يحتوي على رابط الموافقة. يرسل {orgShort} هذا الملف إلى المسؤول العام للجهة، الذي يضغط الرابط ويسجّل الدخول بحساب المسؤول العام الخاص بمستأجره ويُوافق على أذونات Graph للقراءة فقط. يُعيد Entra التوجيه إلى لوحة {orgShort}، التي تُحوّل المستأجر إلى 'تمت الموافقة' وتُشغّل أول مزامنة. خلال عشر دقائق، تظهر الجهة في نظرة النضج العامة ببيانات حقيقية من Secure Score، الوصول المشروط، المستخدمين ذوي المخاطر، امتثال الأجهزة، والحوادث.",

    "maturityCfg.title": "إعدادات مؤشر النضج",
    "maturityCfg.subtitle":
      "تحدد الأوزان معادلة احتساب مؤشر النضج لكل جهة. تُطبَّع تلقائياً إلى ١٠٠٪ عند الحفظ — لا يلزم موازنتها بدقة.",
    "maturityCfg.target": "هدف {orgShort}",
    "maturityCfg.targetHelp":
      "الجهات تحت الهدف تظهر في عدّاد 'دون الهدف' على صفحة نظرة عامة على النضج.",
    "maturityCfg.reset": "استعادة القيم الافتراضية",
    "maturityCfg.save": "حفظ الإعدادات",
    "maturityCfg.saved": "تم الحفظ · يُطبَّق عند تحديث الصفحة وعند المزامنة التالية.",
    "maturityCfg.weightsTotal": "مجموع الأوزان",
    "maturityCfg.mustBe100": "يجب أن يساوي ١٠٠٪ (الفرق {diff})",
    "maturityCfg.normalize": "تطبيع إلى ١٠٠٪",
    "maturityCfg.saveBlocked":
      "يجب أن تكون مجموع الأوزان ١٠٠٪ قبل الحفظ. استخدم زر التطبيع أو عدّل الأشرطة.",
    "maturityCfg.defaults": "القيم الافتراضية: {values}",
    "maturityCfg.w.secureScore": "Secure Score",
    "maturityCfg.w.identity": "وضع الهوية",
    "maturityCfg.w.device": "وضع الأجهزة",
    "maturityCfg.w.data": "حماية البيانات",
    "maturityCfg.w.threat": "الاستجابة للتهديدات",
    "maturityCfg.w.compliance": "المواءمة مع الأطر",

    "pdfCfg.title": "قالب PDF للتسجيل",
    "pdfCfg.subtitle":
      "حرّر محتوى رسالة تسجيل الجهات. تنطبق التغييرات على كل PDF يتم تنزيله بعد ذلك. يُحرَّر كلا اللغتين معاً — يظل الملف ثنائي اللغة.",
    "pdfCfg.reset": "استعادة الافتراضي",
    "pdfCfg.save": "حفظ القالب",
    "pdfCfg.saved": "تم حفظ القالب. أعد تنزيل أي PDF لرؤية النسخة الجديدة.",
    "pdfCfg.preview": "معاينة PDF",
    "pdfCfg.section.brand": "هوية {orgShort} والترويسة",
    "pdfCfg.section.title": "عنوان الوثيقة والعنوان الفرعي",
    "pdfCfg.section.contact": "جهة اتصال {orgShort}",
    "pdfCfg.section.sections": "الأقسام الرئيسية",
    "pdfCfg.section.signoff": "أدوار التوقيع",
    "pdfCfg.section.footer": "التذييل",
    "pdfCfg.field.councilEn": "اسم {orgShort} (بالإنجليزية)",
    "pdfCfg.field.councilAr": "اسم {orgShort} (بالعربية)",
    "pdfCfg.field.taglineEn": "الشعار التعريفي (بالإنجليزية)",
    "pdfCfg.field.taglineAr": "الشعار التعريفي (بالعربية)",
    "pdfCfg.field.titleEn": "العنوان (بالإنجليزية)",
    "pdfCfg.field.titleAr": "العنوان (بالعربية)",
    "pdfCfg.field.subtitleEn": "العنوان الفرعي (بالإنجليزية)",
    "pdfCfg.field.subtitleAr": "العنوان الفرعي (بالعربية)",
    "pdfCfg.field.contactName": "اسم جهة الاتصال",
    "pdfCfg.field.contactEmail": "بريد جهة الاتصال",
    "pdfCfg.field.secTitleEn": "عنوان القسم (بالإنجليزية)",
    "pdfCfg.field.secTitleAr": "عنوان القسم (بالعربية)",
    "pdfCfg.field.secBodyEn": "النص (بالإنجليزية)",
    "pdfCfg.field.secBodyAr": "النص (بالعربية)",
    "pdfCfg.field.secNoteEn": "ملاحظة (بالإنجليزية)",
    "pdfCfg.field.secNoteAr": "ملاحظة (بالعربية)",
    "pdfCfg.field.bulletEn": "نقطة (بالإنجليزية)",
    "pdfCfg.field.bulletAr": "نقطة (بالعربية)",
    "pdfCfg.field.footerEn": "نص التذييل (بالإنجليزية)",
    "pdfCfg.field.footerAr": "نص التذييل (بالعربية)",
    "pdfCfg.section.heading": "القسم {n}",
    "pdfCfg.sig.role": "الدور {n}",
    "pdfCfg.sig.en": "عنوان الدور (بالإنجليزية)",
    "pdfCfg.sig.ar": "عنوان الدور (بالعربية)",

    "dataProt.eyebrow": "حماية البيانات · Purview",
    "dataProt.title": "حماية البيانات — تجميع {orgShort}",
    "dataProt.subtitle":
      "تجميع Purview عبر الجهات الموافقة. إشارات Purview الحية (تنبيهات DLP، مخاطر الداخل، تصنيفات الحساسية، الاحتفاظ) ستُربط في المرحلة الثالثة. ما يُعرض اليوم مستخلص من Secure Score والوصول المشروط كتقريب للمرحلة الثانية.",
    "dataProt.labelCoverage": "تبنّي التصنيفات",
    "dataProt.dlpAlerts": "تنبيهات DLP (آخر ٢٤س)",
    "dataProt.irmAlerts": "تنبيهات مخاطر الداخل",
    "dataProt.srr": "طلبات حقوق الأفراد",
    "dataProt.phase3.title": "عناصر المرحلة الثالثة — لم تُربط بعد",
    "dataProt.phase3.body":
      "تحليلات تبنّي تصنيف الحساسية (عبر استعلام سجل التدقيق)، تنبيهات DLP / IRM / Communication Compliance من alerts_v2، تصنيفات الاحتفاظ، طلبات حقوق الأفراد، ووضع المشاركة الخارجية في Teams و SharePoint — كلها تصل في المرحلة الثالثة عند إضافة إشارات Purview إلى خط المزامنة.",

    "gov.eyebrow": "الحوكمة والمعايير",
    "gov.title": "الحوكمة — المواءمة مع NESA الإماراتي",
    "gov.subtitle":
      "مواءمة {orgShort} مع إطار NESA الإماراتي، محسوبة من ارتباط ضوابط Secure Score وتطبيق خط الأساس للمجلس.",
    "gov.framework.nesa": "مواءمة NESA",
    "gov.framework.dubai-isr": "مواءمة ISR دبي",
    "gov.framework.nca": "مواءمة NCA السعودية",
    "gov.framework.isr": "مواءمة ISR / ISO 27001",
    "gov.framework.generic": "مواءمة الإطار",
    "gov.baseline.title": "خط أساس {orgShort}",
    "gov.baseline.body":
      "نسبة الجهات المتفوّقة على هدف {orgShort} في جميع المؤشرات الفرعية. تقود ترتيب طبقة المعايير.",
    "gov.baseline.aligned": "الجهات الممتثلة",
    "gov.scope.title": "ملاحظة النطاق",
    "gov.scope.body":
      "هذه اللوحة قراءة فقط للملاحظة والمراقبة. تُعرض المواءمة مع الأطر للقياس؛ بينما يبقى تأليف السياسات وتطبيقها ضمن مستأجر كل جهة، خارج نطاق منصة {orgShort}.",
    "gov.clauses.title": "تغطية بنود NESA",
    "gov.clauses.subtitle":
      "متوسط التغطية لكل بند عبر الجهات الموافِقة. كل بند مدعوم بضوابط Secure Score — قابلة للتعديل في الإعدادات ← مواءمة NESA.",
    "gov.clauses.col.clause": "البند",
    "gov.clauses.col.weight": "الوزن",
    "gov.clauses.col.coverage": "التغطية",

    "dataProt.labels.title": "التصنيفات",
    "dataProt.labels.subtitle":
      "متوسطات تصنيفات الحساسية والاحتفاظ عبر الجهات الموافِقة.",
    "dataProt.labels.sensitivityActive": "تصنيفات حساسية نشطة (متوسط)",
    "dataProt.labels.retentionAvg": "تصنيفات احتفاظ (متوسط)",
    "dataProt.labels.recordLabels": "تصنيفات سجلات (المجموع)",
    "dataProt.sharing.title": "وضع المشاركة الخارجية",
    "dataProt.sharing.subtitle":
      "قدرة SharePoint على المشاركة على مستوى المستأجر. الأكثر تقييدًا أفضل لبيانات الحكومة.",
    "dataProt.commComp.title": "الامتثال في الاتصالات",
    "dataProt.byEntity.title": "حسب الجهة",
    "dataProt.byEntity.subtitle":
      "أعداد التنبيهات بين قوسين تُظهر التنبيهات النشطة؛ طلبات حقوق الأفراد المتأخرة بالأحمر.",
    "dataProt.col.dlp": "DLP (نشطة)",
    "dataProt.col.irm": "IRM",
    "dataProt.col.commComp": "امتثال",
    "dataProt.col.srrs": "طلبات (متأخرة)",
    "dataProt.col.sharing": "المشاركة",

    "nesaCfg.title": "مواءمة بنود NESA الإماراتي",
    "nesaCfg.subtitle":
      "مواءمة قابلة للتحرير من {orgShort} بين بنود NESA الإماراتي وضوابط Microsoft Secure Score. يُحسب المؤشر الفرعي للامتثال كمتوسط موزون لتغطية البنود. يتم تطبيع الأوزان تلقائيًا عند الحفظ.",
    "nesaCfg.reset": "إعادة إلى الافتراضي",
    "nesaCfg.save": "حفظ",
    "nesaCfg.saved": "تم الحفظ. يُطبَّق في دورة حساب النضج التالية.",
    "nesaCfg.weight": "الوزن",
    "nesaCfg.controls": "ضوابط Secure Score (مفصولة بفاصلة)",
    "nesaCfg.totalWeight": "مجموع الأوزان: {n}",
    "nesaCfg.addClause": "إضافة بند",
    "nesaCfg.removeClause": "حذف",

    "threats.ti.title": "استخبارات التهديدات",
    "threats.ti.subtitle": "مقالات حديثة من Microsoft Defender TI مرتبطة بتغذية {orgShort}.",
    "threats.ti.subtitle30d":
      "مقالات Microsoft Defender Threat Intelligence الأخيرة — آخر ٣٠ يومًا. اضغط على أي عنصر لعرض التفاصيل الكاملة.",
    "threats.ti.count": "{count} مقالة",
    "threats.ti.modal.published": "تاريخ النشر",
    "threats.ti.modal.noSummary":
      "لم تُدرج Microsoft ملخصًا لهذه المقالة. افتح في Defender للاطلاع على التحليل الكامل.",
    "threats.ti.modal.openInDefender": "فتح المقالة الكاملة في Defender",
    "threats.ti.modal.portalHint":
      "تتضمن Defender Threat Analytics التحليل الكامل ومؤشرات الاختراق والمنتجات المتأثرة والإجراءات المقترحة.",
    "threats.window.label": "النافذة",
    "threats.window.30d": "٣٠ يومًا",
    "threats.window.60d": "٦٠ يومًا",
    "threats.window.90d": "٩٠ يومًا",
    "threats.ti.empty": "لا توجد مقالات استخبارات تهديدات بعد.",
    "threats.attackSim.title": "محاكاة الهجمات — معدل الضغط على التصيد",
    "threats.attackSim.subtitle":
      "مرتبة لكل جهة. الأقل أفضل. مسحوبة من /security/attackSimulation/simulations.",
    "threats.hunting.title": "حزم الاستعلام المتقدم",
    "threats.hunting.subtitle":
      "استعلامات KQL من تأليف {orgShort} تُنفَّذ على كل جهة في كل دورة مزامنة. انقر على جهة للاطلاع على نتائج كل حزمة.",
    "threats.hunting.noResults": "لا توجد صفوف.",
    "threats.hunting.failed": "فشل الاستعلام",

    "identity.pim.title": "تضخم الأدوار المميّزة",
    "identity.pim.subtitle":
      "التعيينات الدائمة مقابل المؤهَّلة (حسب الحاجة) عبر الجهات الموافِقة. الدائم الأقل = أفضل.",
    "identity.pim.col.entity": "الجهة",
    "identity.pim.col.standing": "دائم",
    "identity.pim.col.eligible": "مؤهَّل",
    "identity.pim.col.privileged": "دائم مميّز",
    "identity.dfi.title": "صحة مستشعرات Defender for Identity",
    "identity.dfi.subtitle": "عدد المستشعرات غير السليمة لكل جهة. الهدف صفر.",

    "tabs.entity.controls": "الضوابط",
    "tabs.entity.incidents": "الحوادث",
    "tabs.entity.identity": "الهوية",

    "maturity.howCalculated": "كيف يُحتسب؟",

    "faq.eyebrow": "مرجع",
    "faq.title": "كيف تعمل اللوحة",
    "faq.subtitle":
      "إجابات لقيادة {orgShort} ومسؤولي أمن الجهات وفريق Microsoft — كيفية احتساب مؤشر النضج، ومصادر البيانات، والقيود الحالية.",

    "faq.q.whatIsDashboard.title": "ما هذه اللوحة؟",
    "faq.q.whatIsDashboard.body":
      "طبقة الرؤية الفيدرالية لـ{orgName} عبر كل الجهات المتصلة. تشغّل كل جهة مستأجر Microsoft 365 الخاص بها؛ تقرأ {orgShort} إشارات الوضع الأمني للقراءة فقط من كل مستأجر عبر Microsoft Graph، وتحتسب مؤشر النضج لكل جهة، وترتّب مقارنةً بهدف تحدده {orgShort}. لا تُدار أي عمليات يومية هنا — تحتفظ مراكز عمليات الأمن في الجهات بكامل استقلاليتها.",

    "faq.q.whatIsIndex.title": "ما مؤشر النضج؟",
    "faq.q.whatIsIndex.body":
      "درجة من ٠ إلى ١٠٠ تلخّص الوضع الأمني لجهة واحدة. تُحتسب يومياً (أو عند الطلب عبر زر المزامنة) من خمس مجموعات إشارات: Microsoft Secure Score، سياسات الوصول المشروط، المستخدمون ذوو المخاطر، امتثال أجهزة Intune، والحوادث الأمنية. هدف {orgShort} هو ٧٥ — تظهر الجهات تحت ٧٥ في عداد 'دون الهدف' وتحظى بأولوية المعالجة.",

    "faq.q.howCalculated.title": "كيف يُحتسب؟",
    "faq.q.howCalculated.intro":
      "متوسط مرجّح لستة مؤشرات فرعية، كل منها معياري من ٠ إلى ١٠٠. ضُبطت الأوزان خلال جلسة العرض ويمكن تعديلها في تبويب الحوكمة (المرحلة الثالثة).",
    "faq.q.howCalculated.colSub": "المؤشر الفرعي",
    "faq.q.howCalculated.colWeight": "الوزن",
    "faq.q.howCalculated.colSource": "الإشارة",
    "faq.q.howCalculated.row.ss.name": "Microsoft Secure Score",
    "faq.q.howCalculated.row.ss.src": "/security/secureScores (النسبة من الحد الأقصى)",
    "faq.q.howCalculated.row.identity.name": "وضع الهوية",
    "faq.q.howCalculated.row.identity.src":
      "تغطية الوصول المشروط (٥٠٪) + السياسات التي تفرض MFA (٣٥٪) + حظر المصادقة القديمة (١٥٪)، مع خصم نسبة المستخدمين ذوي المخاطر النشطة",
    "faq.q.howCalculated.row.device.name": "وضع الأجهزة",
    "faq.q.howCalculated.row.device.src": "نسبة امتثال أجهزة Intune",
    "faq.q.howCalculated.row.data.name": "حماية البيانات",
    "faq.q.howCalculated.row.data.src":
      "المرحلة الثانية: مستخلصة من Secure Score. المرحلة الثالثة: تبنّي تصنيفات Purview + معدل تنبيهات DLP",
    "faq.q.howCalculated.row.threat.name": "الاستجابة للتهديدات",
    "faq.q.howCalculated.row.threat.src": "الحوادث المُغلقة / إجمالي الحوادث (من /security/incidents)",
    "faq.q.howCalculated.row.compliance.name": "المواءمة مع الأطر",
    "faq.q.howCalculated.row.compliance.src":
      "مستخلصة من ضوابط Secure Score المرتبطة ببنود إطار NESA الإماراتي.",
    "faq.q.howCalculated.formula.title": "المعادلة",
    "faq.q.howCalculated.formula.body":
      "المؤشر = ٠٫٢٥·SecureScore + ٠٫٢٠·Identity + ٠٫١٥·Device + ٠٫١٥·Data + ٠٫١٥·Threat + ٠٫١٠·Framework",

    "faq.q.target.title": "لماذا الهدف ٧٥؟",
    "faq.q.target.body":
      "اعتمد {orgShort} ٧٥ معياراً خلال جلسة العرض التنفيذية (الشريحة ٦). يعكس 'الوضع الأمني الحكومي الأساسي' — أعلى من متوسط القطاع (حوالي ٦٠ لمستأجري M365 في القطاع العام) لكنه قابل للتحقيق للجهات التي أنجزت خطة Microsoft Secure Score الأساسية. يمكن تعديل الهدف من قبل قيادة معايير {orgShort} في المرحلة الثالثة.",

    "faq.q.signals.title": "ما الإشارات التي تغذّي المؤشر؟",
    "faq.q.signals.body":
      "خمس مجموعات إشارات تُسحب لكل مستأجر في كل دورة مزامنة:",
    "faq.q.signals.ss": "Microsoft Secure Score — درجة المستأجر وحالة كل ضابط تحكّم.",
    "faq.q.signals.ca": "سياسات الوصول المشروط — كم منها مُفعّل، يفرض MFA، يحظر المصادقة القديمة.",
    "faq.q.signals.ru": "المستخدمون ذوو المخاطر — تصنيفات Identity Protection + الحالة التاريخية.",
    "faq.q.signals.dev": "الأجهزة المُدارة — حالة امتثال كل جهاز في Intune (ممتثل / غير ممتثل / فترة سماح / خطأ).",
    "faq.q.signals.inc": "الحوادث الأمنية — النشطة والمُغلقة من Defender XDR.",

    "faq.q.cadence.title": "كم مرة يتم تحديث البيانات؟",
    "faq.q.cadence.body":
      "الجهات التجريبية: اللقطات ثابتة عند البذر. الجهات الحقيقية: عند الطلب عبر زر 'مزامنة الآن' على كل جهة، بالإضافة إلى مزامنة شاملة مجدولة من مُوقّت خارجي (يُنصح ١٥ دقيقة للتنبيهات، ساعياً للوضع الأمني، يومياً لـ Secure Score). كل مزامنة تكتب لقطة بتاريخ محدّد في قاعدة البيانات ليتسنى احتساب الفروق التاريخية.",

    "faq.q.belowTarget.title": "ماذا يعني 'دون الهدف'؟",
    "faq.q.belowTarget.body":
      "عدد الجهات الموافقة التي مؤشر نضجها الحالي أقل من هدف {orgShort} (٧٥ افتراضياً). الجهات التي لم تمنح الموافقة بعد لا تُحتسب — تظهر كـ 'بانتظار الموافقة' حتى يتم تسجيلها.",

    "faq.q.data.title": "أين تُخزّن البيانات؟",
    "faq.q.data.body":
      "تستقر جميع الإشارات في قاعدة بيانات SQLite محلية على وحدة تخزين التطبيق (قابلة للضبط عبر متغير DATA_DIR). كل عملية جلب إشارة تكتب لقطة كاملة؛ سياسة الاحتفاظ يحددها {orgShort}. لا تغادر بيانات الجهات بيئة استضافة {orgShort}.",

    "faq.q.limits.title": "القيود الحالية (المرحلة الثانية)",
    "faq.q.limits.body":
      "شفافية بما هو ليس مُفعّلاً بعد:",
    "faq.q.limits.a":
      "منصة {orgShort} قراءة فقط بحكم النطاق. تُلاحظ الوضع الأمني عبر أكثر من ١٠٠ مستأجر جهة وترتّبه مقابل هدف {orgShort}؛ بينما يبقى تأليف السياسات وتطبيقها لدى فرق تقنية المعلومات في كل جهة.",
    "faq.q.limits.b":
      "الفروق التاريخية (Δ ٧ أيام / ٣٠ / ربع سنوي / سنوي) تتطلب عدة لقطات لكل جهة وستظهر بعد أسبوع من تشغيل المزامنة.",
    "faq.q.limits.c":
      "Microsoft Compliance Manager لا يكشف درجات عبر Graph. المواءمة مع الأطر مُستخلصة وليست مأخوذة مباشرة من Microsoft.",
    "faq.q.limits.d":
      "إدارة سياسات Purview (DLP، مخاطر الداخل، الامتثال في الاتصالات) متاحة فقط عبر Security & Compliance PowerShell، وهي خارج نطاق هذه المنصة المخصصة للقراءة فقط.",

    "faq.q.demo.title": "لماذا تحمل بعض الجهات شارة 'تجريبي'؟",
    "faq.q.demo.body":
      "الجهات الموسومة كتجريبية تحمل إشارات مُعدّة مسبقاً ولا تُزامن أبداً مع نقاط Graph الحقيقية. وجودها لعرض لوحة مأهولة قبل تسجيل جهات حقيقية. عمليات التثبيت الإنتاجية تُشحن بتعطيل البذر افتراضياً (اضبط SCSC_SEED_DEMO=true لتفعيله). يمكن للمجلس مسح كل الجهات التجريبية في أي وقت عبر الأمر `npm run purge-demo` — الجهات الحقيقية لا تُمس.",

    "faq.q.glossary.title": "مسرد المصطلحات",
    "faq.q.glossary.tenant": "مستأجر — مؤسسة Microsoft 365 لجهة واحدة، يُعرّف بـ GUID في Entra.",
    "faq.q.glossary.cluster": "قطاع — تجميع {orgShort}: الشرطة / الصحة / التعليم / البلدية / الخدمات / النقل / أخرى.",
    "faq.q.glossary.consent": "موافقة المسؤول — يوافق المسؤول العام للجهة على تطبيق Entra الخاص ب{orgShort} في مستأجرها؛ مطلوبة قبل أن تعمل أي استدعاءات Graph.",
    "faq.q.glossary.secureScore": "Secure Score — مقياس الوضع الأمني المضمّن من Microsoft على مستوى المستأجر، من ٠ إلى حد أقصى ديناميكي.",

    "kpi.maturityIndex": "مؤشر النضج",
    "kpi.entities": "الجهات",
    "kpi.belowTarget": "دون الهدف",
    "kpi.controlsPassing": "الضوابط المطابقة",
    "kpi.deltaNew": "جديد",
    "kpi.target": "هدف {orgShort}",

    "chart.clusters.title": "النضج حسب قطاع الجهات",
    "chart.clusters.subtitle": "المؤشر من ٠ إلى ١٠٠ · مقارنة بهدف {orgShort} البالغ {target}",
    "chart.entities.title": "النضج حسب الجهة",
    "chart.entities.subtitle":
      "عمود واحد لكل جهة موافِقة مقارنة بهدف {orgShort} {target}. اضغط على العمود للتعمق.",
    "chart.sort.name": "الاسم",
    "chart.sort.maturityHigh": "النضج · من الأعلى",
    "chart.sort.maturityLow": "النضج · من الأدنى",

    "time.range.ariaLabel": "النطاق الزمني",
    "time.range.7d": "٧ أيام",
    "time.range.30d": "٣٠ يوم",
    "time.range.qtd": "منذ الربع",
    "time.range.ytd": "منذ السنة",
    "time.range.caption.7d": "مقابل قبل ٧ أيام",
    "time.range.caption.30d": "مقابل قبل ٣٠ يومًا",
    "time.range.caption.qtd": "منذ بداية الربع",
    "time.range.caption.ytd": "منذ بداية السنة",
    "time.range.caption.noHistory": "لا يوجد تاريخ كافٍ بعد.",
    "chart.legend.current": "الحالي",
    "chart.legend.target": "الهدف",

    "maturity.dragging.title": "الضوابط التي تخفض المؤشر",
    "maturity.dragging.subtitle":
      "على مستوى {orgShort}، مرتَّبة حسب مجموع نقاط Secure Score المفقودة",
    "maturity.dragging.entitiesAffected": "{n} جهة متأثرة",
    "maturity.dragging.empty":
      "لا توجد ضوابط خافضة — كل ضوابط Secure Score مُطبَّقة على مستوى {orgShort}.",

    "maturity.movers.title": "أكبر التحولات — آخر ٧ أيام",
    "maturity.movers.subtitle": "الجهات صاحبة أكبر تغير في مؤشر النضج",
    "maturity.movers.empty":
      "لا يوجد تاريخ كافٍ بعد لحساب التغيير خلال ٧ أيام. تحقق بعد أسبوع من المزامنات.",

    "entities.eyebrow": "الجهات",
    "entities.title": "الجهات المتصلة",
    "entities.subtitle":
      "عرض {shown} من أصل {total} جهة{filterSuffix}. مرتبة حسب مؤشر النضج.",
    "entities.filterSuffix": " · مصفاة على {cluster}",
    "entities.exportCsv": "تصدير CSV",
    "entities.search": "بحث عن جهة أو نطاق أو مسؤول أمن…",
    "entities.belowTargetLabel": "دون الهدف:",
    "entities.noMatches": "لا توجد جهات تطابق بحثك.",
    "entities.pending.copyLink": "نسخ رابط الموافقة",
    "entities.pending.copied": "تم النسخ",
    "entities.pending.cancel": "إلغاء التهيئة",
    "entities.pending.cancelConfirm":
      "إزالة هذه الجهة ورابط الموافقة المعلّق؟ يمكنك إعادة التهيئة في أي وقت.",
    "entities.pending.linkUnavailable":
      "لا يوجد رابط موافقة مخزّن — أعد تشغيل معالج التهيئة.",

    "cols.entity": "الجهة",
    "cols.cluster": "القطاع",
    "cols.maturity": "النضج",
    "cols.delta7d": "Δ ٧ أيام",
    "cols.target": "الهدف",
    "cols.controls": "الضوابط",
    "cols.incidents": "الحوادث",
    "cols.riskyUsers": "المستخدمون ذوو المخاطر",
    "cols.deviceCompl": "امتثال الأجهزة",
    "cols.labels": "التصنيفات",
    "cols.connection": "الاتصال",
    "cols.lastSync": "آخر مزامنة",
    "cols.all": "الكل",

    "health.green": "سليم",
    "health.amber": "متدهور",
    "health.red": "غير متصل",

    "time.justNow": "الآن",
    "time.minutesAgo": "قبل {n} دقيقة",
    "time.hoursAgo": "قبل {n} ساعة",
    "time.daysAgo": "قبل {n} يوم",

    "entity.backToAll": "جميع الجهات",
    "entity.backToIdentity": "العودة إلى الهوية",
    "entity.backToDevices": "العودة إلى الأجهزة",
    "entity.backToThreats": "العودة إلى التهديدات",
    "entity.backToVulnerabilities": "العودة إلى الثغرات",
    "entity.backToData": "العودة إلى حماية البيانات",
    "entity.backToGovernance": "العودة إلى الحوكمة",
    "entity.backToMaturity": "العودة إلى مؤشر النضج",
    "entity.tenant": "المستأجر",
    "entity.domain": "النطاق",
    "entity.ciso": "مسؤول أمن المعلومات",
    "entity.contact": "جهة الاتصال",
    "entity.lastSync": "آخر مزامنة {when}",
    "entity.openDefender": "بوابة Defender",
    "entity.exportCard": "تصدير البطاقة",
    "entity.scheduleReview": "جدولة مراجعة",
    "entity.suspend": "إيقاف مؤقت",
    "entity.resume": "استئناف",
    "entity.suspended.banner":
      "المزامنة موقوفة مؤقتًا لهذه الجهة. ستتخطاها المزامنات الدورية حتى تستأنفها.",
    "entity.review.banner": "مراجعة مجدولة في {date}.",

    "entity.suspend.dialog.title": "إيقاف مزامنة الوضع الأمني؟",
    "entity.suspend.dialog.body":
      "ستتوقف المزامنة لهذه الجهة حتى تقوم باستئنافها. تبقى اللقطات السابقة محفوظة. لا تُلغى الموافقة — يبقى تسجيل تطبيق {orgShort} مرخصًا في مستأجر الجهة.",
    "entity.suspend.dialog.confirm": "إيقاف",
    "entity.suspend.dialog.cancel": "إلغاء",
    "entity.resume.dialog.title": "استئناف مزامنة الوضع الأمني؟",
    "entity.resume.dialog.body":
      "ستلتقط المزامنة المجدولة التالية (الساعة الثالثة صباحًا) هذه الجهة من جديد. يمكنك أيضًا تشغيل «مزامنة الآن» فور ذلك.",
    "entity.resume.dialog.confirm": "استئناف",

    "entity.review.dialog.title": "جدولة مراجعة للوضع الأمني",
    "entity.review.dialog.body":
      "حدّد تاريخًا لمراجعة الوضع الأمني لهذه الجهة مع فريق {orgShort}. للإعلام فقط — لا يتم تنفيذ أي إجراء آلي في هذا التاريخ.",
    "entity.review.dialog.dateLabel": "تاريخ المراجعة",
    "entity.review.dialog.noteLabel": "ملاحظة (اختياري)",
    "entity.review.dialog.save": "حفظ",
    "entity.review.dialog.clear": "مسح",
    "entity.review.dialog.cancel": "إلغاء",

    "entity.maturityTitle": "مؤشر النضج",
    "entity.maturitySubtitle": "مقارنة بهدف {orgShort} {target}",
    "entity.targetMarker": "الهدف {target}",
    "entity.stats.incidents": "الحوادث",
    "entity.stats.riskyUsers": "ذوو المخاطر",
    "entity.stats.devicesCompliant": "امتثال الأجهزة",

    "entity.overview.topVulns.title": "أبرز الثغرات",
    "entity.overview.topVulns.subtitle":
      "أعلى الثغرات خطورةً التي أبلغ عنها Defender لأجهزة هذه الجهة.",
    "entity.overview.topVulns.viewAll": "عرض كل CVEs",
    "entity.overview.topVulns.clean":
      "لا توجد CVEs مُبلّغ عنها حاليًا — الأجهزة سليمة.",

    "subscores.title": "تفصيل المؤشرات الفرعية",
    "subscores.subtitle": "المدخلات المرجحة في مؤشر النضج",
    "subscores.identity": "الهوية",
    "subscores.device": "الأجهزة",
    "subscores.data": "البيانات",
    "subscores.threatResponse": "الاستجابة للتهديدات",
    "subscores.compliance": "الامتثال (NESA)",

    "maturity.sub.secureScore": "Secure Score",
    "maturity.sub.identity": "الهوية",
    "maturity.sub.device": "الأجهزة",
    "maturity.sub.data": "البيانات",
    "maturity.sub.threat": "الاستجابة للتهديدات",
    "maturity.sub.compliance": "الامتثال",

    "trend.title": "اتجاه النضج",
    "trend.subtitle":
      "كيف تحرك مؤشر النضج لهذه الجهة والمؤشرات الفرعية بمرور الوقت. بدّل أيًّا من المؤشرات الفرعية لإظهاره على الرسم.",
    "trend.range.7d": "٧ أيام",
    "trend.range.30d": "٣٠ يومًا",
    "trend.range.90d": "٩٠ يومًا",
    "trend.range.all": "الكل",
    "trend.overSpan.7d": "خلال ٧ أيام",
    "trend.overSpan.30d": "خلال ٣٠ يومًا",
    "trend.overSpan.90d": "خلال ٩٠ يومًا",
    "trend.overSpan.all": "خلال كل الفترة",
    "trend.granularity.daily": "يومي",
    "trend.granularity.weekly": "أسبوعي",
    "trend.granularity.monthly": "شهري",
    "trend.overlay": "طبقة",
    "trend.series.overall": "مؤشر النضج",
    "trend.points": "{count} نقطة بيانات",
    "trend.latest": "الأحدث",
    "trend.empty.title": "لا توجد بيانات اتجاه بعد",
    "trend.empty.body":
      "تُلتقط نقاط الاتجاه بعد كل مزامنة. شغّل مزامنة الآن، أو استخدم إجراء المشرف لإعادة بناء بيانات آخر ٩٠ يومًا من الإشارات الموجودة.",

    "recent.title": "التغييرات الأخيرة",
    "recent.subtitle": "الإشارات التي حركت المؤشر خلال الأيام السبعة الأخيرة",

    "benchmark.title": "المعيار المقارن",
    "benchmark.subtitle": "الموقع داخل قطاع {cluster} وعلى مستوى {orgShort}",
    "benchmark.within": "داخل {cluster}",
    "benchmark.councilWide": "على مستوى {orgShort}",
    "benchmark.of": "من أصل {total}",
    "benchmark.percentile": "المئين {n}",
    "benchmark.footer":
      "متوسط القطاع {cluster}. متوسط {orgShort} {council}. الهدف {target}.",

    "tab.data.title": "حماية البيانات",
    "tab.data.subtitle":
      "DLP، مخاطر الداخل، الامتثال في الاتصالات، طلبات حقوق الأفراد، تصنيفات الاحتفاظ والحساسية، وضعية المشاركة الخارجية.",
    "tab.data.emptyNoSync":
      "لا توجد بيانات Purview بعد — هذه الجهة لم تُكمل أول مزامنة.",
    "tab.data.empty.body":
      "جميع مؤشرات Purview صفر. إما أن الجهة لا تملك سياسات Purview مُفعَّلة، أو تفتقد للترخيص. الاتصال بمصادر البيانات قائم، ولكن لا توجد بيانات لعرضها.",
    "tab.data.kpi.dlp": "تنبيهات DLP",
    "tab.data.kpi.irm": "مخاطر الداخل",
    "tab.data.kpi.commComp": "امتثال الاتصالات",
    "tab.data.kpi.srrs": "طلبات حقوق",
    "tab.data.labels.title": "التصنيفات",
    "tab.data.labels.subtitle":
      "جرد تصنيفات الاحتفاظ والحساسية من Purview.",
    "tab.data.labels.retention": "تصنيفات الاحتفاظ",
    "tab.data.labels.retentionRecord": "— منها سجلات",
    "tab.data.labels.sensitivity": "تصنيفات الحساسية",
    "tab.data.labels.sensitivityActive": "— نشطة",
    "tab.data.sharing.title": "المشاركة الخارجية",
    "tab.data.sharing.subtitle":
      "حدود المشاركة على مستوى المستأجر في SharePoint وOneDrive.",
    "tab.data.sharing.sharepoint": "مشاركة SharePoint",
    "tab.data.sharing.guestCount": "نطاقات المزامنة المسموح بها",
    "tab.data.sharing.syncButtonHidden": "زر مزامنة OneDrive مخفي",
    "tab.data.sharing.missing": "لم يتم جمع إعدادات SharePoint بعد.",

    "tab.gov.title": "محاذاة الحوكمة",
    "tab.gov.subtitle":
      "تغطية إطار العمل لهذه الجهة، مُشتقة من تجميعات ضوابط Secure Score. معدلات النجاح لكل فئة تُطابق محاور الهوية/البيانات/الأجهزة/التطبيقات التي تُصنِّف حولها معظم الأطر (NESA، NCA، ISR).",
    "tab.gov.emptyNoSync":
      "لا توجد بيانات Secure Score بعد — هذه الجهة لم تُكمل أول مزامنة.",
    "tab.gov.kpi.controls": "الضوابط المُقاسة",
    "tab.gov.kpi.controlsCaption": "عبر كل فئات الإطار",
    "tab.gov.kpi.passing": "ناجحة",
    "tab.gov.kpi.passingCaption": "{passed} ضابط مُطبَّق بالكامل",
    "tab.gov.kpi.complianceSub": "المؤشر الفرعي للامتثال",
    "tab.gov.kpi.complianceSubCaption":
      "من مؤشر النضج (وزن NESA)",
    "tab.gov.categories.title": "التغطية حسب الفئة",
    "tab.gov.categories.subtitle":
      "أخضر = ناجح · كهرماني = جزئي · أحمر = غير مُطبَّق.",

    "subtabs.more.title": "علامات تبويب أخرى",
    "subtabs.more.subtitle":
      "Data · Governance — ستأتي في المرحلة الثالثة مع إشارات Purview.",
    "subtabs.more.body":
      "تبويبات Data و Governance تمتلئ بعد توصيل إشارات Purview المقروءة (تنبيهات DLP، مخاطر الداخل، طلبات حقوق الأفراد، تبنّي التصنيفات) والمواءمة مع إطار NESA الإماراتي.",

    "tab.overview": "نظرة عامة",
    "tab.controls": "الضوابط",
    "tab.incidents": "الحوادث",
    "tab.identity": "الهوية",
    "tab.data": "البيانات",
    "tab.devices": "الأجهزة",
    "tab.governance": "الحوكمة",
    "tab.vulnerabilities": "الثغرات",
    "tab.attackSimulation": "محاكاة الهجمات",
    "tab.connection": "الاتصال",

    "tab.controls.title": "ضوابط Secure Score",
    "tab.controls.subtitle": "حالة تطبيق كل ضابط من Microsoft Secure Score.",
    "tab.controls.col.name": "الضابط",
    "tab.controls.col.category": "الفئة",
    "tab.controls.col.score": "النقاط",
    "tab.controls.col.status": "الحالة",
    "tab.controls.implemented": "مُطبَّق",
    "tab.controls.notImplemented": "غير مُطبَّق",
    "tab.controls.partial": "جزئي",
    "tab.controls.unknown": "غير معروف",
    "tab.controls.userImpact": "الأثر على المستخدم",
    "tab.controls.implCost": "تكلفة التطبيق",
    "tab.controls.filter.label": "الفئة",
    "tab.controls.filter.uncategorized": "غير مُصنَّف",
    "tab.controls.filter.empty": "لا توجد ضوابط تطابق هذه الفئة.",

    "tab.incidents.title": "الحوادث الأمنية",
    "tab.incidents.subtitle": "موحّدة من Microsoft Defender XDR.",
    "tab.incidents.col.name": "الحادثة",
    "tab.incidents.col.severity": "الخطورة",
    "tab.incidents.col.status": "الحالة",
    "tab.incidents.col.alerts": "التنبيهات",
    "tab.incidents.col.created": "الإنشاء",
    "tab.incidents.col.updated": "آخر تحديث",
    "tab.incidents.summary": "{total} إجمالي · {active} نشطة · {resolved} مُغلقة",
    "tab.incidents.drill.created": "تاريخ الإنشاء",
    "tab.incidents.drill.updated": "آخر تحديث",
    "tab.incidents.drill.classification": "التصنيف",
    "tab.incidents.drill.determination": "التحديد",
    "tab.incidents.drill.assignedTo": "مُكلَّف إلى",
    "tab.incidents.drill.unclassified": "لم يُصنَّف بعد",
    "tab.incidents.drill.unassigned": "غير مُكلَّف",
    "tab.incidents.drill.tags": "الوسوم",
    "tab.incidents.drill.openInDefender": "فتح في Defender XDR",
    "tab.incidents.drill.defenderHint":
      "الرابط يفتح بوابة Microsoft Defender XDR في علامة تبويب جديدة مع الخط الزمني الكامل للحادثة والتنبيهات المرتبطة وإجراءات المحلل.",

    "incidentClassification.truePositive": "إيجابي حقيقي",
    "incidentClassification.falsePositive": "إيجابي خاطئ",
    "incidentClassification.informationalExpectedActivity": "إعلامي / متوقع",
    "incidentClassification.unknown": "غير معروف",

    "incidentDetermination.apt": "تهديد مُستمر متقدم (APT)",
    "incidentDetermination.malware": "برامج ضارة",
    "incidentDetermination.phishing": "تصيد إلكتروني",
    "incidentDetermination.unwantedSoftware": "برامج غير مرغوبة",
    "incidentDetermination.compromisedAccount": "حساب مُخترَق",
    "incidentDetermination.maliciousUserActivity": "نشاط مستخدم خبيث",
    "incidentDetermination.insufficientInformation": "معلومات غير كافية",
    "incidentDetermination.other": "أخرى",

    "tab.identity.title": "المستخدمون ذوو المخاطر",
    "tab.identity.subtitle": "من Microsoft Entra Identity Protection.",
    "tab.identity.col.user": "المستخدم",
    "tab.identity.col.level": "مستوى الخطر",
    "tab.identity.col.state": "حالة الخطر",
    "tab.identity.col.updated": "آخر تحديث",
    "tab.identity.summary": "{atRisk} في خطر · {total} متابعون",
    "tab.identity.empty": "لا توجد مستخدمون ذوو مخاطر مُبلَّغ عنهم لهذه الجهة.",
    "tab.identity.helpBtn": "ما الفرق بين المستوى والحالة؟",
    "tab.identity.help.levelTitle": "مستوى الخطر",
    "tab.identity.help.levelBody":
      "شدة أحدث إشارة من Identity Protection: لا يوجد · منخفض · متوسط · مرتفع. درجة ثقة Microsoft بوجود نشاط مشبوه.",
    "tab.identity.help.stateTitle": "حالة الخطر",
    "tab.identity.help.stateBody":
      "الحالة الحالية: في خطر · مُؤكَّد الاختراق · تم العلاج · مرفوض · آمن مؤكَّد. المستوى هو الإشارة؛ الحالة هي ما اتُّخذ تجاهها.",
    "tab.identity.help.clickHint":
      "اضغط على «في خطر» لأي مستخدم لرؤية الكشوفات الدقيقة (نوع الحدث، الموقع، IP) المسببة للتنبيه.",
    "tab.identity.clickToExplain": "اضغط لمعرفة السبب",
    "tab.identity.why": "لماذا؟",
    "tab.identity.why.title": "لماذا {user} في خطر؟",
    "tab.identity.why.subtitle":
      "الكشوفات من Microsoft Entra Identity Protection التي أدّت إلى حالة الخطر لهذا المستخدم. كل صف إشارة مستقلة خلال الأيام السبعة الماضية.",
    "tab.identity.why.noDetections":
      "لم تُرجِع Graph سجلات كشف لهذا المستخدم. الحالة لا تزال نشطة لكن الأدلة قد تكون انتهت صلاحيتها في نقطة /riskDetections.",
    "tab.identity.why.event": "الكشف",
    "tab.identity.why.severity": "الشدة",
    "tab.identity.why.location": "الموقع",
    "tab.identity.why.ip": "IP",
    "tab.identity.why.detected": "وقت الكشف",

    "riskEvent.unfamiliarFeatures": "خصائص تسجيل دخول غير مألوفة",
    "riskEvent.atypicalTravel": "سفر غير نمطي",
    "riskEvent.maliciousIPAddress": "عنوان IP خبيث",
    "riskEvent.leakedCredentials": "بيانات اعتماد مُسرَّبة",
    "riskEvent.passwordSpray": "هجوم رش كلمات المرور",
    "riskEvent.anonymousIPAddress": "عنوان IP مجهول / Tor",
    "riskEvent.impossibleTravel": "سفر مستحيل",
    "riskEvent.suspiciousInboxManipulation": "تلاعب مشبوه بصندوق الوارد",
    "tab.identity.view.label": "العرض",
    "tab.identity.view.risky": "المستخدمون ذوو المخاطر",
    "tab.identity.view.privileged": "الأدوار المميَّزة",
    "tab.identity.view.sensors": "صحة المستشعرات",
    "tab.identity.filter.level": "المستوى",
    "tab.identity.filter.state": "الحالة",
    "tab.identity.filter.empty": "لا يوجد مستخدمون يطابقون الفلاتر الحالية.",

    "tab.identity.pim.title": "تَضخّم الأدوار المميَّزة",
    "tab.identity.pim.subtitle":
      "تعيينات أدوار PIM النشطة والمؤهلة في هذا المستأجر. الأدوار المميَّزة هي ما يستهدفه المهاجم.",
    "tab.identity.pim.summary":
      "{active} ثابت · {eligible} مؤهل · {privileged} مميَّز",
    "tab.identity.pim.activeKpi": "نشط (ثابت)",
    "tab.identity.pim.eligibleKpi": "مؤهل (PIM)",
    "tab.identity.pim.privilegedKpi": "مميَّز",
    "tab.identity.pim.col.role": "الدور",
    "tab.identity.pim.col.active": "نشط",
    "tab.identity.pim.col.eligible": "مؤهل",
    "tab.identity.pim.col.total": "الإجمالي",
    "tab.identity.pim.empty": "لا توجد تعيينات أدوار مُبلَّغ عنها.",

    "tab.identity.dfi.title": "Defender for Identity — صحة المستشعرات",
    "tab.identity.dfi.subtitle":
      "كل مستشعر Defender for Identity يعمل في المستأجر، مع أحدث بيانات الصحة.",
    "tab.identity.dfi.summary":
      "{total} مستشعر · {healthy} سليم · {unhealthy} معطوب",
    "tab.identity.dfi.totalKpi": "المستشعرات",
    "tab.identity.dfi.healthyKpi": "سليمة",
    "tab.identity.dfi.unhealthyKpi": "معطوبة",
    "tab.identity.dfi.notLicensed":
      "لا توجد مستشعرات Defender for Identity مُبلَّغ عنها. إما أن هذا المستأجر لا يشغّل DfI، أو لا يمتلك ترخيصًا.",
    "tab.identity.dfi.allHealthy":
      "جميع المستشعرات سليمة — لا توجد مشاكل نشطة.",
    "tab.identity.dfi.col.sensor": "المستشعر / المشكلة",
    "tab.identity.dfi.col.severity": "الخطورة",
    "tab.identity.dfi.col.status": "الحالة",
    "tab.identity.dfi.col.category": "الفئة",
    "tab.identity.dfi.col.created": "تاريخ الفتح",
    "tab.identity.dfi.filter.severity": "الخطورة",
    "tab.identity.dfi.filter.status": "الحالة",
    "tab.identity.dfi.filter.empty": "لا توجد مشاكل مستشعرات تطابق الفلاتر الحالية.",

    "tab.devices.title": "الأجهزة المُدارة",
    "tab.devices.subtitle": "مخزون أجهزة Intune وحالة الامتثال.",
    "tab.devices.col.name": "الجهاز",
    "tab.devices.col.os": "نظام التشغيل",
    "tab.devices.col.user": "المستخدم",
    "tab.devices.col.state": "الامتثال",
    "tab.devices.col.encrypted": "مُشفَّر",
    "tab.devices.col.cves": "CVEs",
    "tab.devices.col.cvesHint": "اضغط لعرض تفاصيل CVE",
    "tab.devices.col.lastSync": "آخر مزامنة",
    "tab.devices.summary": "{total} جهاز · {compliancePct}% ممتثل",
    "tab.devices.drilldown.title": "{count} CVE على هذا الجهاز",
    "tab.devices.drilldown.empty":
      "لا توجد بيانات CVE مفهرسة لهذا الجهاز. لم يُبلّغ Defender TVM عنه بعد.",

    "tab.connection.title": "صحة كل نقطة نهاية",
    "tab.connection.subtitle": "آخر استدعاء ناجح، الأخطاء، الحدّ من الاستدعاءات خلال ٢٤ ساعة.",
    "tab.connection.col.endpoint": "نقطة النهاية",
    "tab.connection.col.lastSuccess": "آخر نجاح",
    "tab.connection.col.lastError": "آخر خطأ",
    "tab.connection.col.callCount": "الاستدعاءات (٢٤س)",
    "tab.connection.col.throttled": "محدودة (٢٤س)",

    "directive.eyebrow": "التوجيهات",
    "directive.title": "القواعد الأساسية والإجراءات التوجيهية",
    "directive.subtitle":
      "قواعد أساسية وإجراءات توجيهية يُؤلّفها المركز ويطبّقها على الجهات المُصرِّحة. كل إجراء يمر بمعاينة وموافقة وقابل للتدقيق. لا يُطبَّق شيء على جهة إلا بموافقتها الصريحة على تطبيق التوجيهات.",
    "directive.phase": "المرحلة {n}",
    "directive.status.available": "متاح",
    "directive.status.inProgress": "قيد التنفيذ",
    "directive.status.planned": "مخطَّط",
    "directive.setup.title": "لم يتم إعداد تطبيق التوجيهات بعد",
    "directive.setup.body":
      "تتطلب عمليات النشر بوضع التوجيهات تطبيق Entra ثانيًا بصلاحيات .ReadWrite، منفصل عن تطبيق قراءة Graph. أعِدّه من الإعدادات ← المصادقة وامنح موافقة المسؤول قبل إدراج أي جهة في وضع التوجيهات.",
    "directive.setup.cta": "الانتقال إلى الإعدادات",
    "directive.setup.helper": "إعداد لمرة واحدة، يستغرق نحو ٥ دقائق.",
    "directive.roadmap.title": "خارطة القدرات",
    "directive.roadmap.subtitle":
      "ما سيتمكن هذا النشر من فعله مع إطلاق مراحل التوجيهات. ترقيم المراحل يتبع خطة المنتج في docs/13.",
    "directive.cap.incidentOps.title": "عمليات الحوادث",
    "directive.cap.incidentOps.body":
      "تصنيف وتعيين وتعليق على حوادث وتنبيهات Defender XDR عبر كل جهة مُصرِّحة بالتوجيهات. مخاطرة منخفضة، قيمة يومية عالية.",
    "directive.cap.riskyUsers.title": "إجراءات المستخدمين ذوي المخاطر",
    "directive.cap.riskyUsers.body":
      "تأكيد التسريب أو تجاهل اكتشافات المخاطر في Entra ID Protection؛ فرض تسجيل الخروج عبر revokeSignInSessions.",
    "directive.cap.threatSubmissions.title": "تقديم التهديدات",
    "directive.cap.threatSubmissions.body":
      "إرسال رسائل التصيد وعناوين URL الضارة وقيم hash الملفات إلى Microsoft للتحليل.",
    "directive.cap.caBaselines.title": "قواعد Conditional Access",
    "directive.cap.caBaselines.body":
      "نشر سياسات CA موحَّدة يؤلّفها المركز على كل جهة مُصرِّحة. الوضع الافتراضي للتقارير فقط، مع موافقة شخصَيْن، واستثناء مسؤول الجهة، وتراجع بنقرة واحدة.",
    "directive.cap.intuneBaselines.title": "قواعد امتثال Intune",
    "directive.cap.intuneBaselines.body":
      "نشر سياسات الحد الأدنى لنظام التشغيل والتشفير ورمز المرور على Intune لكل جهة.",
    "directive.cap.iocPush.title": "دفع المؤشرات (Defender)",
    "directive.cap.iocPush.body":
      "حظر عنوان IP أو URL أو hash ملف على كل أسطول Defender for Endpoint للجهات في خطوة واحدة.",
    "directive.cap.deviceIsolation.title": "عزل الجهاز",
    "directive.cap.deviceIsolation.body":
      "طلب عزل جهاز مخترق. يوافق المناوب لدى الجهة؛ يُنفِّذ MDE. لا يتم انفراديًا أبدًا.",
    "directive.cap.namedLocations.title": "المواقع المُسمّاة",
    "directive.cap.namedLocations.body":
      "دفع نطاقات IP الموثوقة التي يحدّدها المركز إلى المواقع المُسمّاة في CA لكل جهة.",
    "directive.guardrails.title": "ضوابط السلامة",
    "directive.guardrails.subtitle":
      "هذه الحمايات مدمجة في محرك التوجيهات من اليوم الأول، وليست اختيارية.",
    "directive.guardrails.reportOnly":
      "كل سياسة Conditional Access تُنشَر بوضع التقارير فقط. مسؤول الجهة (وليس المركز) يُفعّل الإنفاذ.",
    "directive.guardrails.twoPerson":
      "القواعد عالية المخاطر تتطلب موافقة شخصَيْن. مستخدم المركز الذي يدفع ليس نفسه مستخدم المركز الذي يوافق.",
    "directive.guardrails.adminExclusion":
      "كل سياسة CA يؤلّفها المركز تستثني مسؤولي Global Admin الخاصين بالجهة. لا يمكن أن يقفل الدفع الخاطئ الجهة خارج نطاق مستأجرها.",
    "directive.guardrails.rollback":
      "كل دفع يُسجَّل مع خطة التراجع. نقرة واحدة لعكس آخر N إجراء.",
    "directive.guardrails.consentGated":
      "لا يُكتب شيء على جهة لم توافق صراحةً على تطبيق التوجيهات. الجهات في وضع المراقبة فقط لا تُمَس.",

    "mode.observation": "مراقبة",
    "mode.directive": "توجيه",

    "directive.action.title": "إجراء توجيهي",
    "directive.action.apply": "تطبيق",
    "directive.action.comment": "إضافة تعليق",
    "directive.action.commentLabel": "تعليق المحلّل",
    "directive.action.commentPlaceholder":
      "ملاحظة قصيرة تظهر على الحادث / التنبيه في Defender XDR.",
    "directive.action.confirmCompromised": "تأكيد الاختراق",
    "directive.action.dismiss": "تجاهل المخاطرة",
    "directive.action.revokeSessions": "فرض تسجيل الخروج",
    "directive.action.riskyHelper":
      "تأكيد الاختراق يُعلّم المستخدم تهديدًا فعليًا في Entra ID Protection. تجاهل يُزيل الإشارة. فرض تسجيل الخروج يُبطل كل جلسة نشطة للمستخدم.",
    "directive.action.observationHint":
      "أُدرجت هذه الجهة في وضع المراقبة. الإجراءات التوجيهية معطَّلة — لا يستطيع المركز الكتابة على مستأجر هذه الجهة. لتفعيل الإجراءات، يلزم إعادة إدراج الجهة بموافقة توجيهية.",
    "directive.toast.success": "تم الإرسال — تدقيق #{auditId}",
    "directive.toast.simulated": "محاكاة — تدقيق #{auditId}",

    "directive.threat.title": "إرسال تهديد إلى Microsoft",
    "directive.threat.subtitle":
      "أرسل رسائل التصيّد وعناوين URL الضارّة والملفات المشبوهة إلى Microsoft للتحليل. تغذّى الاستعلامات في Defender لتستفيد كل جهة من التصنيف.",
    "directive.threat.noDirectiveEntities":
      "لا توجد جهات في وضع التوجيه بعد. أدرج جهة بموافقة التوجيه أولًا.",
    "directive.threat.kind": "النوع",
    "directive.threat.category": "التصنيف",
    "directive.threat.url": "رابط URL",
    "directive.threat.recipient": "بريد المستلم",
    "directive.threat.messageUri":
      "رابط Graph للرسالة (من تنبيه Defender XDR أو رؤوس البريد)",
    "directive.threat.fileName": "اسم الملف",
    "directive.threat.fileContent": "محتوى الملف Base64",
    "directive.threat.submit": "إرسال",
    "directive.threat.relatedIncident": "حادثة ذات صلة (اختياري)",
    "directive.threat.pickIncident": "اختر حادثة للسياق…",
    "directive.threat.noIncidents": "لا توجد حوادث لهذه الجهة بعد.",
    "directive.threat.alertsCount": "{count} تنبيه · استخدم رابط Defender XDR أدناه لنسخ الرابط أو URI الرسالة أو تجزئة الملف من أدلة التنبيه.",
    "directive.threat.openInDefender": "فتح الحادثة في Defender XDR",
    "directive.threat.contextHint":
      "لصق الرابط / URI الرسالة / الملف من أدلة التنبيه في النموذج أدناه يجعل الإرسال دقيقًا. تبقى تفاصيل الحادثة أعلاه على الشاشة أثناء ملء النموذج.",

    "directive.audit.title": "سجل التدقيق",
    "directive.audit.subtitle":
      "كل إجراء توجيهي، بلا استثناء. يُحدَّث كل ١٥ ثانية. إجراءات المحاكاة على الجهات التجريبية مُعلَّمة حتى لا تُخلط بعمليات Graph الحقيقية.",
    "directive.audit.refresh": "تحديث",
    "directive.audit.empty":
      "لم تُسجَّل إجراءات توجيهية بعد. أول إجراء تصنيف / تعليق / تصرّف / إرسال سيظهر هنا.",
    "directive.audit.col.when": "متى",
    "directive.audit.col.entity": "الجهة",
    "directive.audit.col.action": "الإجراء",
    "directive.audit.col.target": "الهدف",
    "directive.audit.col.status": "الحالة",
    "directive.audit.status.success": "نجاح",
    "directive.audit.status.simulated": "محاكاة",
    "directive.audit.status.failed": "فشل",

    "vuln.eyebrow": "إدارة الثغرات",
    "vuln.title": "الثغرات الأمنية عبر الجهات",
    "vuln.subtitle":
      "ثغرات CVE على مستوى الأجهزة مسحوبة من Microsoft Defender Vulnerability Management لجميع الجهات المُوافقة. الارتباط العابر للمستأجرين يكشف الثغرات التي تصيب عدة جهات — وهو ما لا يراه مسؤول أمن أي جهة بمفرده.",
    "vuln.empty.body":
      "لا توجد بيانات ثغرات بعد. الجهات تحتاج إلى Defender for Endpoint P2 أو إضافة Defender Vulnerability Management حتى تنساب بيانات TVM إلى Graph.",
    "vuln.kpi.totalCves": "CVEs فريدة",
    "vuln.kpi.critical": "حرجة",
    "vuln.kpi.high": "عالية",
    "vuln.kpi.exploitable": "قابلة للاستغلال علنًا",
    "vuln.kpi.affectedDevices": "الأجهزة المتأثرة",
    "vuln.kpi.exposedDevices": "الأجهزة المكشوفة",
    "vuln.kpi.remediatedDevices": "الأجهزة المُعالَجة",
    "vuln.severityFilter": "الخطورة",
    "vuln.sev.critical": "حرجة",
    "vuln.sev.high": "عالية",
    "vuln.sev.medium": "متوسطة",
    "vuln.sev.low": "منخفضة",
    "vuln.exploit.yes": "استغلال",
    "vuln.byEntity.title": "حسب الجهة",
    "vuln.byEntity.subtitle":
      "كل صف هو وضع جهة واحدة. اضغط الاسم للانتقال إلى تفاصيل الأجهزة وCVE.",
    "vuln.cols.total": "الإجمالي",
    "vuln.cols.critical": "حرجة",
    "vuln.cols.high": "عالية",
    "vuln.cols.exploitable": "قابلة للاستغلال",
    "vuln.cols.devices": "الأجهزة",
    "vuln.cols.exposedDevices": "أجهزة مكشوفة",
    "vuln.cols.remediatedDevices": "مُعالَجة",
    "vuln.cols.cve": "CVE",
    "vuln.cols.severity": "الخطورة",
    "vuln.cols.cvss": "CVSS",
    "vuln.cols.exploit": "استغلال",
    "vuln.cols.published": "النشر",
    "vuln.correlated.title": "ارتباط عابر للجهات",
    "vuln.correlated.subtitle":
      "ثغرات موجودة في جهتين أو أكثر — عرض اتحادي لا يستطيع تكوينه أي مسؤول أمن منفرد. أعطِ الأولوية لترقيع هذه القائمة.",
    "vuln.correlated.summary": "{count} مشتركة",
    "vuln.correlated.empty": "لا يوجد حاليًا CVE في أكثر من جهة واحدة.",
    "vuln.correlated.entityCount": "عدد الجهات",
    "vuln.correlated.affectedEntities": "موجودة في",
    "vuln.topCves.title": "أبرز CVEs في الشبكة",
    "vuln.topCves.subtitle":
      "مرتَّبة حسب الخطورة ثم CVSS ثم إجمالي الأجهزة المتأثرة.",
    "vuln.topCves.empty": "لا توجد CVEs بهذه الخطورة.",
    "vuln.topCves.totalDevices": "الأجهزة",

    "vuln.drill.loading": "جاري تحميل الأجهزة المتأثرة…",
    "vuln.drill.error": "تعذّر تحميل التفاصيل: {error}",
    "vuln.drill.empty": "لا توجد أجهزة مُبلَّغ عنها لهذا CVE.",
    "vuln.drill.entityHeader":
      "{name} — {exposed} مكشوفة · {remediated} مُعالَجة",
    "vuln.drill.col.device": "الجهاز",
    "vuln.drill.col.os": "نظام التشغيل",
    "vuln.drill.col.totalCves": "إجمالي CVEs",
    "vuln.drill.col.critical": "حرجة",
    "vuln.drill.col.high": "عالية",
    "vuln.drill.col.maxCvss": "أعلى CVSS",
    "vuln.drill.entitiesHint":
      "اضغط صفًا في أعمدة الجهات أو الأجهزة المكشوفة لعرض التفاصيل.",

    "tab.vulnerabilities.title": "الثغرات",
    "tab.vulnerabilities.subtitle":
      "وضع الثغرات لكل جهاز وكل CVE على هذه الجهة، من Defender Vulnerability Management.",
    "tab.vulnerabilities.notLicensedTitle":
      "Defender Vulnerability Management غير متاح",
    "tab.vulnerabilities.notLicensedBody":
      "عادت جداول TVM بخطأ — على الأرجح لأن هذه الجهة لا تملك Defender for Endpoint P2 أو إضافة Defender Vulnerability Management. لا يتطلب الأمر إجراءً من المجلس؛ المزامنة سليمة.",
    "tab.vulnerabilities.kpi.cves": "CVEs فريدة",
    "tab.vulnerabilities.kpi.critical": "حرجة",
    "tab.vulnerabilities.kpi.high": "عالية",
    "tab.vulnerabilities.kpi.exploitable": "قابلة للاستغلال",
    "tab.vulnerabilities.kpi.devices": "الأجهزة",
    "tab.vulnerabilities.filter.severity": "الخطورة",
    "tab.vulnerabilities.filter.exploitOnly": "فقط القابلة للاستغلال",
    "tab.vulnerabilities.filter.empty": "لا توجد عناصر تطابق الفلاتر الحالية.",
    "tab.vulnerabilities.byDevice.title": "الأجهزة المتأثرة",
    "tab.vulnerabilities.byDevice.subtitle":
      "أكثر 50 جهازًا حسب عدد CVEs الحرجة والعالية.",
    "tab.vulnerabilities.byDevice.subtitleAll":
      "جميع الأجهزة الـ{count} التي تحمل CVE واحدًا على الأقل — اضغط عدد CVEs لعرضها.",
    "tab.vulnerabilities.byDevice.device": "الجهاز",
    "tab.vulnerabilities.byDevice.os": "نظام التشغيل",
    "tab.vulnerabilities.byDevice.cves": "CVEs",
    "tab.vulnerabilities.byDevice.maxCvss": "أعلى CVSS",
    "tab.vulnerabilities.topCves.title": "أبرز CVEs في هذه الجهة",
    "tab.vulnerabilities.topCves.titleAll": "جميع CVEs في هذه الجهة",
    "tab.vulnerabilities.topCves.subtitle":
      "مرتَّبة حسب عدد الأجهزة المتأثرة × CVSS.",
    "tab.vulnerabilities.topCves.subtitleAll":
      "جميع CVEs الـ{count} — اضغط عدد الأجهزة المكشوفة لعرضها.",
    "tab.vulnerabilities.topCves.clickHint":
      "عرض الأجهزة المتأثرة بهذا CVE",
    "tab.vulnerabilities.topCves.affectedDevicesLabel":
      "{count} أجهزة متأثرة",
    "tab.vulnerabilities.topCves.noDevices":
      "لم يُعثر على أجهزة لهذا CVE (على الأرجح خارج نطاق أول 50 جهازًا).",
    "tab.vulnerabilities.remediationNotTracked":
      "عدد المعالجات يتطلب مقارنة لقطات تاريخية — غير متاح لهذه الجهة بعد.",

    "tab.attackSim.title": "تدريب محاكاة الهجمات",
    "tab.attackSim.subtitle":
      "محاكاة التصيد والهندسة الاجتماعية التي يُجريها فريق الأمن في هذه الجهة. انخفاض معدل الضغط = المستخدمون رصدوا التصيد المُحاكى.",
    "tab.attackSim.notLicensedTitle": "تدريب محاكاة الهجمات غير مُهيَّأ",
    "tab.attackSim.notLicensedBody":
      "هذه الجهة لم تشغّل أي محاكاة بعد، أو لا تملك إضافة Defender for Office 365 Plan 2 التي تُفعّل وحدة المحاكاة.",
    "tab.attackSim.kpi.simulations": "محاكاة مُشغّلة",
    "tab.attackSim.kpi.attempts": "مستخدمون مستهدفون",
    "tab.attackSim.kpi.clicks": "ضغطوا",
    "tab.attackSim.kpi.clickRate": "معدل الضغط",
    "tab.attackSim.kpi.reported": "أبلغوا",
    "tab.attackSim.list.title": "الخط الزمني للمحاكاة",
    "tab.attackSim.list.subtitle":
      "كل صف هو محاكاة واحدة. معدل الضغط مُلوَّن: أخضر <١٠٪ · كهرماني ١٠–٢٠٪ · أحمر ٢٠٪+.",
    "tab.attackSim.filter.status": "الحالة",
    "tab.attackSim.filter.empty": "لا توجد محاكاة تطابق الفلاتر الحالية.",
    "tab.attackSim.col.name": "المحاكاة",
    "tab.attackSim.col.status": "الحالة",
    "tab.attackSim.col.clickRate": "معدل الضغط",
    "tab.attackSim.col.launched": "تاريخ الإطلاق",

    "severity.high": "عالية",
    "severity.medium": "متوسطة",
    "severity.low": "منخفضة",
    "severity.informational": "إعلامية",

    "status.active": "نشطة",
    "status.inProgress": "قيد المعالجة",
    "status.resolved": "مُغلقة",
    "status.redirected": "مُحوَّلة",

    "risk.high": "عالٍ",
    "risk.medium": "متوسط",
    "risk.low": "منخفض",
    "risk.none": "لا يوجد",
    "risk.hidden": "مخفي",
    "riskState.atRisk": "في خطر",
    "riskState.confirmedCompromised": "مُخترق",
    "riskState.remediated": "مُعالَج",
    "riskState.dismissed": "مُرفوض",
    "riskState.confirmedSafe": "آمن مؤكد",
    "riskState.none": "لا يوجد",

    "compliance.compliant": "ممتثل",
    "compliance.noncompliant": "غير ممتثل",
    "compliance.inGracePeriod": "فترة سماح",
    "compliance.conflict": "تعارض",
    "compliance.error": "خطأ",
    "compliance.unknown": "غير معروف",

    "rollup.identity.title": "وضع الهوية — تجميع {orgShort}",
    "rollup.identity.subtitle":
      "تجميع المستخدمين ذوي المخاطر وتغطية الوصول المشروط عبر كل الجهات الموافقة.",
    "rollup.threats.title": "التهديدات — تجميع {orgShort}",
    "rollup.threats.subtitle":
      "تجميع الحوادث عبر كل الجهات الموافقة، حسب الخطورة والجهة.",
    "rollup.devices.title": "الأجهزة — تجميع {orgShort}",
    "rollup.devices.subtitle":
      "تجميع امتثال أجهزة Intune عبر كل الجهات الموافقة.",
    "rollup.totalUsers": "إجمالي المستخدمين ذوي المخاطر",
    "rollup.atRiskUsers": "في خطر حالياً",
    "rollup.caPoliciesMfa": "سياسات MFA",
    "rollup.activeIncidents": "الحوادث النشطة",
    "rollup.totalDevices": "إجمالي الأجهزة المُدارة",
    "rollup.compliantDevices": "ممتثلة",
    "rollup.byEntity": "حسب الجهة",

    "placeholder.phase2.title": "ربط الإشارات الحية — المرحلة الثانية",
    "placeholder.phase2.body":
      "هذه الواجهات محددة ومُهيكلة. ستظهر البيانات عند تفعيل أنبوب Graph لكل مستأجر بدءاً بالجهات العشر الأولى في التجربة الرائدة.",

    "nav.eyebrow": "التنقل",
    "nav.maturity": "نظرة عامة على النضج",
    "nav.entities": "الجهات",
    "nav.identity": "الهوية",
    "nav.threats": "التهديدات",
    "nav.vulnerabilities": "الثغرات الأمنية",
    "nav.data": "حماية البيانات",
    "nav.devices": "الأجهزة",
    "nav.governance": "الحوكمة",
    "nav.directive": "التوجيهات",
    "nav.settings": "الإعدادات",
    "nav.faq": "الأسئلة الشائعة",
    "sidebar.dataSources": "مصادر البيانات",
    "sidebar.dataSources.suffix": "· Graph APIs",
    "ds.secureScore.detail": "على مستوى المستأجر والضوابط",
    "ds.defender.detail": "Endpoint / Identity / O365",
    "ds.purview.detail": "منع تسرب البيانات، التصنيفات، مخاطر الداخل",
    "ds.entra.detail": "وضع الهوية، CA، PIM",
    "ds.intune.detail": "امتثال الأجهزة، MAM",
    "ds.compliance.detail": "UAE NESA",
  },
} as const;

export type DictKey = keyof (typeof DICT)["en"];
