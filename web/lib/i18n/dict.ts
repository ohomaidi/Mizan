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
      "{orgShort} baseline benchmarks, {framework} framework alignment, and unified audit search across every consented entity.",

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
    "wizard.step3.demoToggle.title": "Onboard as a demo / simulated entity",
    "wizard.step3.demoToggle.body":
      "OFF (default): the wizard generates a real Microsoft Entra admin-consent URL — the entity admin must sign in and grant consent for sync to start. ON: the entity is auto-consented, marked is_demo, and every directive write against the row is simulated. Tick this only when you want to walk through the UI without a real Entra app.",
    "wizard.step3.demoToggle.statusReal": "Real tenant — Entra consent required",
    "wizard.step3.demoToggle.statusDemo": "Demo tenant — consent simulated",
    "wizard.step3.demoToggle.realRequires.title":
      "Heads up — Entra credentials must be configured",
    "wizard.step3.demoToggle.realRequires.body":
      "The wizard will generate a real Microsoft consent URL. That URL only redeems if the operator's Entra app credentials are set in",
    "wizard.step4.title": "Await admin consent",
    "wizard.step4.subtitle":
      "Forward the onboarding letter to the entity's Global Administrator. This page live-polls consent status every 5 seconds. You can close the window — consent continues to be captured by the redirect handler.",
    "wizard.step4.polling": "Polling consent status…",
    "wizard.step4.status.pending": "Awaiting consent",
    "wizard.step4.status.consented": "Consent received",
    "wizard.step4.status.revoked": "Consent revoked",
    "wizard.step4.status.failed": "Consent flow failed",
    "wizard.step4.demoBypass":
      "Demo mode — consent simulated. The new entity has been marked as a demo tenant and auto-consented; no real Microsoft Entra registration was attempted. Continue to the final step.",
    "wizard.step4.demoBypass.title": "Consent simulated — this is a demo tenant",
    "wizard.step4.demoBypass.body":
      "You ticked the demo toggle on the previous step, so the wizard skipped the Microsoft Entra consent round-trip and stamped the entity as is_demo=1. Sync will return synthesised signals; directive writes will be simulated. The entity carries a DEMO chip everywhere it appears.",
    "wizard.step4.demoBypass.realInstead.title":
      "Wanted a real tenant?",
    "wizard.step4.demoBypass.realInstead.body":
      "Cancel this wizard, delete the new row from Settings → Entities, then start over with the demo toggle UNticked on step 3.",
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
    "settings.field.nameEn.placeholder": "e.g. Ministry of Health",
    "settings.field.nameAr.placeholder": "مثال: وزارة الصحة",
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

    "settings.deleteEntity.title": "Delete {name}?",
    "settings.deleteEntity.summary":
      "This removes {name} from this dashboard, including its sync history and any directive push records. The action is permanent.",
    "settings.deleteEntity.spWarning.heading":
      "The service principal in the entity tenant remains",
    "settings.deleteEntity.spWarning.body":
      "Deleting this row does NOT remove {name}'s service principal from their Microsoft Entra tenant. If you re-onboard them later, the consent URL will hit AADSTS650051 because the SP still exists. To avoid that, delete the service principal from their Enterprise Applications first — or use the AADSTS650051 recovery flow when re-onboarding (admin grants consent on the existing SP, then clicks Verify and complete).",
    "settings.deleteEntity.spWarning.openLink":
      "Open Enterprise Apps in entity tenant",
    "settings.deleteEntity.alternative":
      "If you only want to pause syncing, use Suspend instead — that keeps the consent intact and re-enabling later is one click.",
    "settings.deleteEntity.confirm": "Delete from Mizan",
    "common.cancel": "Cancel",

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
    "settings.tab.nesa": "Compliance framework",
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
      "Update available — v{version}.",
    "settings.about.azureCmd": "Azure Container Apps",
    "settings.about.dockerCmd": "Docker / self-hosted",
    "settings.about.openReleaseNotes": "Open release notes on GitHub",
    "settings.about.lastChecked": "Last checked",
    "settings.about.checkNow": "Check now",
    "settings.about.releaseNotes": "Release notes",
    "settings.about.checkFailedTitle":
      "Couldn't reach GitHub to check for updates",
    "settings.about.upgradeNow": "Upgrade to v{version}",
    "settings.about.confirmUpgrade.title":
      "Upgrade Mizan to v{version}?",
    "settings.about.confirmUpgrade.body":
      "This will swap the running container app's image and trigger a rolling revision update. The dashboard stays available — Azure brings the new revision up alongside the old one and shifts traffic when it passes its readiness probe (typically 1–2 minutes). You may need to refresh the page once the new revision is serving.",
    "settings.about.confirmUpgrade.cancel": "Cancel",
    "settings.about.confirmUpgrade.confirm": "Upgrade now",
    "settings.about.upgradeRequested.title":
      "Upgrade requested — v{from} → v{to}",
    "settings.about.upgradeRequested.body":
      "Azure Container Apps is pulling the new image and rolling out a new revision. Refresh the page in 1–2 minutes; the installed version will then read v{to}.",
    "settings.about.upgradeFailed.title": "Upgrade failed",
    "settings.about.aca.selfUpgradeNotReady.title":
      "One-click upgrade not configured",
    "settings.about.aca.selfUpgradeNotReady.body":
      "This Container App's managed identity isn't wired to ARM. Re-deploy with the latest azure-container-apps.bicep template (enables system-assigned identity + assigns the Container Apps Contributor role on the resource group + injects MIZAN_AZURE_RESOURCE_ID), or run the manual command below.",
    "settings.about.downloadPkg": "Download Mizan-{version}.pkg",
    "settings.about.downloadPkg.help":
      "Run the installer once it downloads. It upgrades in place — your data directory and configuration survive. The dashboard restarts automatically.",
    "settings.about.installerMissing":
      "The v{version} installer for your platform isn't available yet on GitHub. Try \"Check now\" in a minute, or use the manual command above.",

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
    "azureCfg.field.authMethod": "Authentication method",
    "azureCfg.authMethod.secret": "Client secret",
    "azureCfg.authMethod.secretHint":
      "Paste a client secret string from Entra → Certificates & secrets. Easy to provision; rotates every 6–24 months.",
    "azureCfg.authMethod.cert": "Certificate (production-hardening)",
    "azureCfg.authMethod.certHint":
      "Upload a private key + record the matching public-cert thumbprint. Recommended for production. No shared-secret rotation; cert lifetime is whatever you sign it with.",
    "azureCfg.field.clientCertThumbprint": "Certificate thumbprint (SHA-1)",
    "azureCfg.field.clientCertPrivateKeyPem": "Private key (PEM)",
    "azureCfg.field.clientCertChainPem": "Certificate chain (PEM, optional)",
    "azureCfg.cert.thumbprintHint":
      "From Entra → Certificates & secrets → Certificates tab → the Thumbprint column on the row for your uploaded cert. Hex only, no colons. Mizan upper-cases on save.",
    "azureCfg.cert.privateKeyPlaceholderReplace":
      "-----BEGIN PRIVATE KEY-----\\n…   (key already stored — paste a new one to replace)",
    "azureCfg.cert.hasValue":
      "A private key is stored. Paste a new PEM block to replace it.",
    "azureCfg.cert.never": "No private key stored yet.",
    "azureCfg.cert.chainHint":
      "Optional. Sends the public cert (and any intermediates) via x5c on each token request so Entra can validate against a chain. Leave blank if you uploaded the public cert directly to the Entra app.",
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
    "pdfCfg.preview.noTenants":
      "Onboard at least one entity to preview the personalized letter",
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
    "gov.title": "Governance — {framework} alignment",
    "gov.subtitle":
      "{orgShort}-wide alignment to the {framework} framework, computed from Secure Score control mappings and {orgShort} baseline enforcement.",
    "gov.framework.nesa": "NESA alignment",
    "gov.framework.dubai-isr": "Dubai ISR alignment",
    "gov.framework.nca": "KSA NCA alignment",
    "gov.framework.isr": "ISR / ISO 27001 alignment",
    "gov.framework.generic": "Framework alignment",
    "gov.baseline.title": "{orgShort} baseline",
    "gov.baseline.body":
      "Entities whose Maturity Index scores at or above the {orgShort} target. Drives the standards-tier ranking.",
    "gov.baseline.aligned": "Entities aligned to Target",
    "gov.scope.title": "Scope note",
    "gov.scope.body":
      "This dashboard is read-only observability. Framework alignment is surfaced for measurement; policy authoring and deployment are handled in the entities' own tenants, outside the {orgShort} platform.",
    "gov.clauses.draftBanner.title":
      "Draft mapping — pending official catalog verification.",
    "gov.clauses.title": "{framework} clause coverage",
    "gov.clauses.subtitle":
      "Per-clause average coverage across consented entities. Each clause is backed by Secure Score controls — editable in Settings → Compliance framework.",
    "gov.clauses.col.clause": "Clause",
    "gov.clauses.col.weight": "Weight",
    "gov.clauses.col.coverage": "Coverage",
    "gov.clauses.openDetail": "Open detail for {name}",
    "gov.class.governance": "Governance",
    "gov.class.operation": "Operation",
    "gov.class.assurance": "Assurance",

    "gov.domainModal.loadingTitle": "Loading domain detail…",
    "gov.domainModal.weight": "Weight in framework: {pct}%",
    "gov.domainModal.coverageHeadline": "Coverage",
    "gov.domainModal.descriptionHeading": "Domain description",
    "gov.domainModal.calcHeading": "How coverage is calculated",
    "gov.domainModal.calcExplanation":
      "Mean of clause coverage across {scored} of {total} in-scope entities. Each entity's clause score is the average pass-rate of {controls} Microsoft Secure Score controls plus {evidence} operator-managed evidence anchors mapped to this domain. Entities with no observable evidence on this clause are skipped (not counted as zero); entities marked Out-of-Scope are excluded entirely.",
    "gov.domainModal.controlsHeading":
      "Microsoft Secure Score controls — Council-wide rollup",
    "gov.domainModal.controls.col.control": "Control",
    "gov.domainModal.controls.col.service": "Service",
    "gov.domainModal.controls.col.passRate": "Mean pass rate",
    "gov.domainModal.controls.col.entities": "Full · Partial · Fail",
    "gov.domainModal.controls.unscoredShort": "no data",
    "gov.domainModal.controls.fullPassTip":
      "Entities scoring 100% on this control",
    "gov.domainModal.controls.partialTip":
      "Entities scoring above 0% but below 100% — Secure Score awards partial credit when implementation is in progress",
    "gov.domainModal.controls.failTip":
      "Entities scoring exactly 0% on this control",
    "gov.domainModal.controls.legend":
      "Microsoft Secure Score awards partial credit, so most controls fall into the partial bucket while in progress. The clause coverage % uses the actual partial-credit ratio (e.g. 8/9 = 88.9%), not a binary pass/fail.",
    "gov.domainModal.customEvidenceHeading": "Operator-managed evidence",
    "gov.domainModal.perEntityHeading": "Per-entity coverage",
    "gov.domainModal.perEntity.col.entity": "Entity",
    "gov.domainModal.perEntity.col.samples": "Evidence count",
    "gov.domainModal.perEntity.col.coverage": "Coverage",
    "gov.domainModal.perEntity.noEvidence": "No evidence",
    "gov.domainModal.perEntity.globalOos": "Out of scope (global)",
    "gov.domainModal.perEntity.tenantOos": "Out of scope (entity)",

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

    "nesaCfg.hero.eyebrow": "ACTIVE REGULATORY FRAMEWORK",
    "nesaCfg.hero.activeBadge": "Selected",
    "nesaCfg.hero.changeLabel": "Change framework",
    "nesaCfg.hero.switching": "Switching\u2026",
    "nesaCfg.frameworkSwitched":
      "Framework switched. Catalog reloaded against the new selection; dashboard-wide UI updated.",
    "nesaCfg.hero.body.dubai-isr":
      "Dubai Information Security Regulation, published under Dubai Law No. 11 of 2014. Mandatory for Dubai government entities and critical-sector organisations. 13 domains across 3 classes (Governance, Operation, Assurance) anchored on ISO/IEC 27001 + 27002.",
    "nesaCfg.hero.body.nesa":
      "UAE NESA Information Assurance Standard, published by the federal National Electronic Security Authority. The federal baseline for UAE government entities outside Dubai's regulatory scope.",
    "nesaCfg.hero.body.nca":
      "Saudi Arabia\u2019s National Cybersecurity Authority controls. Used for KSA-based entities. Catalog ships as a placeholder \u2014 build out per the NCA Essential Cybersecurity Controls (ECC).",
    "nesaCfg.hero.body.isr":
      "Generic ISO 27001/27002-aligned controls. Useful for entities that don\u2019t fall under a specific national regulator. Catalog ships as a placeholder \u2014 build out against ISO/IEC 27001:2022 Annex A.",
    "nesaCfg.hero.bodyGeneric":
      "No regulatory framework is currently selected. The dashboard hides framework-specific UI: the Framework Compliance card on each entity\u2019s overview, the Framework column on the entity grid, the Framework Compliance KPI tile, and the per-clause breakdown panel. Pick a framework above to bring those back.",
    "nesaCfg.hero.genericHidden.title": "What\u2019s hidden right now",
    "nesaCfg.hero.genericHidden.body":
      "Framework Compliance card on every entity overview, the per-domain breakdown panel, the Framework column on the entity grid, the Framework Compliance KPI tile on the council dashboard, and the framework reference on the governance page. Maturity Index and all other dashboards are unaffected. Pick a framework above to bring everything back.",
    "nesaCfg.cfg.targetLabel": "Pass-mark (target %)",
    "nesaCfg.cfg.targetHelp":
      "Entities scoring below this on Framework Compliance are flagged on the council KPI tile and the entity grid. Default 70.",
    "nesaCfg.cfg.treatmentLabel": "Unscored-clause treatment",
    "nesaCfg.cfg.treatmentSkip": "Skip (lenient)",
    "nesaCfg.cfg.treatmentZero": "Count as 0% (strict)",
    "nesaCfg.cfg.treatmentSkipHelp":
      "Clauses with no observable evidence on a tenant are excluded from both numerator and denominator. Default. Best for partial-data tenants.",
    "nesaCfg.cfg.treatmentZeroHelp":
      "Clauses with no observable evidence are scored as 0%. Stricter \u2014 \u201cif you can\u2019t prove you have it, you don\u2019t have it.\u201d",
    "nesaCfg.title": "Clause catalog \u2014 mapping",
    "nesaCfg.subtitle":
      "{orgShort}-editable mapping from regulatory clauses to Microsoft Secure Score controls for the framework selected in Branding (UAE NESA, Dubai ISR, etc.). Compliance sub-score is computed as the weighted average of per-clause coverage. Weights auto-normalize on save.",
    "nesaCfg.draftBanner.title":
      "Draft mapping — pending official catalog verification.",
    "nesaCfg.reset": "Reset to defaults",
    "nesaCfg.save": "Save",
    "nesaCfg.saved": "Saved. Applies to the next maturity compute cycle.",
    "nesaCfg.weight": "Weight",
    "nesaCfg.controls": "Evidence anchors — Microsoft Secure Score controls",
    "nesaCfg.coverage": "Live coverage",
    "nesaCfg.coverage.noControls":
      "No controls mapped yet — add evidence anchors below.",
    "nesaCfg.coverage.notObserved":
      "Mapped controls not yet observed in any consented tenant.",
    "nesaCfg.coverage.observedNoScore":
      "{n} of {total} controls observed (informational, no pass-rate).",
    "nesaCfg.coverage.acrossTenants": "across {n} tenants",
    "nesaCfg.coverage.unmatched": "+{n} unmatched",
    "nesaCfg.picker.noneSelected": "No evidence anchors selected.",
    "nesaCfg.picker.addControl": "Add control…",
    "nesaCfg.picker.available": "available",
    "nesaCfg.picker.custom": "Custom…",
    "nesaCfg.picker.customLabel":
      "Add a control ID by hand. Useful when the regulator publishes a new sub-control before our registry has caught up — the chip will show with no live coverage data until a tenant reports it.",
    "nesaCfg.picker.customPlaceholder": "e.g. ISR-Custom-001",
    "nesaCfg.picker.cancel": "Cancel",
    "nesaCfg.picker.add": "Add",
    "nesaCfg.picker.searchPlaceholder":
      "Search by id, title, service, or category…",
    "nesaCfg.picker.noResults": "No controls match your search.",
    "nesaCfg.picker.showing": "Showing {n} of {total}",
    "nesaCfg.picker.customLink": "Add a custom ID instead",
    "nesaCfg.picker.filterBy": "Filter:",
    "nesaCfg.picker.allCategories": "All categories",
    "nesaCfg.picker.allServices": "All services",
    "nesaCfg.picker.clearFilters": "Clear",
    "nesaCfg.coverage.customEvidenceCount": "+{n} custom",
    "nesaCfg.custom.title": "Custom evidence (operator-managed)",
    "nesaCfg.custom.subtitle":
      "For controls Microsoft can't see — BCP drills, physical audits, HR processes.",
    "nesaCfg.custom.empty":
      "No custom evidence yet. Add anchors for non-Microsoft controls.",
    "nesaCfg.custom.add": "Add custom evidence",
    "nesaCfg.custom.edit": "Edit",
    "nesaCfg.custom.save": "Save",
    "nesaCfg.custom.stale": "Stale",
    "nesaCfg.custom.reviewedAt": "Last reviewed: {date}",
    "nesaCfg.custom.labelPlaceholder":
      "e.g. Annual physical access audit — Q1 2026",
    "nesaCfg.custom.passRate": "Pass rate",
    "nesaCfg.custom.reviewedDateLabel": "Last reviewed",
    "nesaCfg.custom.notePlaceholder":
      "Reviewer note (optional) — what was checked, what evidence was sighted, who signed off.",
    "nesaCfg.totalWeight": "Total weight: {n}",
    "nesaCfg.addClause": "Add clause",
    "nesaCfg.removeClause": "Remove",
    "nesaCfg.oos.mark": "Mark out-of-scope",
    "nesaCfg.oos.unmark": "Restore to scope",
    "nesaCfg.oos.globalChip": "Out of scope",
    "nesaCfg.oos.toggleHelp":
      "When out-of-scope, this clause is excluded from every entity's framework compliance score (use when a 3rd-party product covers it).",

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
    "faq.q.howCalculated.row.compliance.name": "Framework alignment ({framework})",
    "faq.q.howCalculated.row.compliance.src":
      "Synthesized from Secure Score controls mapped to {framework} clauses.",
    "faq.q.howCalculated.formula.title": "Formula",
    "faq.q.howCalculated.formula.body":
      "Index = 0.25·SecureScore + 0.20·Identity + 0.15·Device + 0.15·Data + 0.15·Threat + 0.10·Framework",

    "faq.q.target.title": "Why is the target 75?",
    "faq.q.target.body":
      "The {orgShort} set 75 as the benchmark during the executive briefing (slide 6). It reflects 'baseline government-grade posture' — above industry average (around 60 for public sector M365 tenants) but achievable for entities that have completed the standard Microsoft Secure Score hardening playbook. The target is editable in Settings → Maturity Index.",

    "faq.q.frameworkCompliance.title":
      "How is Framework Compliance calculated?",
    "faq.q.frameworkCompliance.intro":
      "Framework Compliance is a separate primary metric, sitting alongside the Maturity Index. Maturity Index answers \u201chow well-protected is this entity?\u201d. Framework Compliance answers \u201chow aligned with the active regulatory framework?\u201d. Different question, different number, both visible.",
    "faq.q.frameworkCompliance.formulaIntro":
      "For the active framework (set in Settings → Compliance framework), the score is the weighted average of per-clause coverage. Each clause\u2019s coverage is the average of its mapped Microsoft Secure Score pass-rates and any operator-managed \u201ccustom evidence\u201d anchors the Council reviews periodically:",
    "faq.q.frameworkCompliance.unscoredNote":
      "Clauses with no observable evidence on a tenant are handled per the Settings → Compliance framework toggle. \u201cSkip\u201d (default) excludes them from the calculation entirely \u2014 fair to entities with partial data. \u201cCount as 0%\u201d is stricter \u2014 \u201cif you can\u2019t prove you have it, you don\u2019t have it.\u201d Both are Council-editable.",
    "faq.q.frameworkCompliance.coverageHeading":
      "Coverage from Microsoft \u2014 what we can see vs what we can\u2019t",
    "faq.q.frameworkCompliance.strong.title":
      "Strong Microsoft coverage (10 of 13 ISR domains)",
    "faq.q.frameworkCompliance.strong.body":
      "ISR-1 Governance, ISR-2 Asset Mgmt, ISR-3 Risk Mgmt, ISR-4 Incident, ISR-5 Access Control, ISR-6 Operations & Comms, ISR-8 Systems Acquisition, ISR-11 Compliance & Audit, ISR-12 Assurance, ISR-13 Cloud. Microsoft 365 Secure Score has 200+ controls evidencing these \u2014 score is driven by real Graph data.",
    "faq.q.frameworkCompliance.partial.title":
      "Microsoft has limited visibility",
    "faq.q.frameworkCompliance.partial.body":
      "Some ISR sub-controls (e.g. encryption-at-rest specifics, cross-tenant CRUD audit trails) are visible only via the Defender for Cloud Apps portal or Compliance Manager rather than Graph \u2014 Mizan can fetch them but reliability varies. Document the gap with a custom evidence anchor on the affected clauses.",
    "faq.q.frameworkCompliance.uncovered.title":
      "Microsoft cannot see (3 of 13 domains)",
    "faq.q.frameworkCompliance.uncovered.body":
      "ISR-7 BCP (DR drills, business-impact analyses), ISR-9 Environmental & Physical Security (data center, badges, fire), ISR-10 HR (screening, training, leaver process). Microsoft has no view of any of these. Mizan ships these clauses with operator-managed \u201ccustom evidence\u201d anchors \u2014 the Council reviews each entity\u2019s evidence quarterly and sets a manual pass rate. A stale-review badge appears after 90 days.",
    "faq.q.frameworkCompliance.tuneHeading":
      "How to tune it",
    "faq.q.frameworkCompliance.tuneBody":
      "Settings → Compliance framework: change the active regulation (Dubai ISR / NESA / others), edit per-clause weights so the framework reflects this Council\u2019s priorities, set the pass-mark target (default 70%), and toggle the unscored-clause treatment. The selector at the top of that tab also lets the Council deselect the framework entirely \u2014 the Framework Compliance card, KPI tile, entity-grid column, and per-clause breakdown all hide automatically when no framework is selected.",

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

    "faq.q.consentLifecycle.title":
      "Where does an entity's consent live, and can it be revoked?",
    "faq.q.consentLifecycle.body":
      "When an entity's Global Administrator clicks the consent URL and approves, Microsoft Entra creates a Service Principal (also known as an Enterprise Application) inside the entity's own tenant directory. That service principal is the local representation of {orgShort}'s multi-tenant app inside the entity's tenant. Two collections attach to it: appRoleAssignments (one per granted application permission — SecurityEvents.Read.All, Policy.ReadWrite.ConditionalAccess, etc.) and oauth2PermissionGrants (delegated scopes; mostly empty for this app since it uses application permissions only). The service principal carries the operator's chosen display name (e.g. \"{orgShort} Posture Dashboard\") plus a \"Granted by\" admin name and timestamp on each consent record.\n\nWhere the entity admin sees and revokes it: entra.microsoft.com → Identity → Applications → Enterprise applications → search by the app's display name → click in. Two relevant tabs:\n• Permissions — lists every granted role with the granting admin's name. \"Revoke admin consent\" button per row, plus \"Review permissions\" for a guided revoke.\n• Properties — shows whether sign-in is enabled (mostly relevant for delegated scopes, which we don't use).\n\nThree revocation paths:\n1. Delete the Enterprise Application — Permissions tab → … menu → Delete. Removes the service principal entirely. {orgShort} cannot acquire any token for that tenant on the next sync.\n2. Revoke individual permissions — granular but more brittle. Calls that needed the revoked scope start returning 403; everything else still works.\n3. Conditional Access policy in the entity's tenant blocking the app's appId. Consent stays on paper, but {orgShort} cannot get tokens. Useful for temporary blocks during incidents.\n\nWhat {orgShort} does when consent is revoked: the sync orchestrator auto-detects revocation. If every signal fails with a revocation-class error (HTTP 401 or AADSTS codes 65001, 700016, 50020, 500011) the tenant's consent_status flips to revoked and the token cache invalidates. The entity row shows a red \"consent revoked\" badge, and the entity admin can re-grant from a fresh consent URL — the wizard's idempotent re-onboarding path generates one without creating a duplicate row.",

    "faq.q.limits.title": "Current limitations (Phase 2)",
    "faq.q.limits.body":
      "Being transparent about what's not yet live:",
    "faq.q.limits.a":
      "The {orgShort} platform is read-only by scope. It observes posture across 100+ entity tenants and ranks it against the {orgShort} target; policy authoring and enforcement remain with each entity's own IT team.",
    "faq.q.limits.b":
      "Historical deltas (Δ 7d / 30d / QTD / YTD) require multiple snapshots per tenant and will light up once the sync has been running for a week or more.",
    "faq.q.limits.c":
      "Microsoft Compliance Manager does not expose scores via Graph. {framework} alignment is synthesized from Secure Score control mappings rather than lifted from Microsoft.",
    "faq.q.limits.d":
      "Purview policy CRUD (DLP, Insider Risk, Communication Compliance) is only available via Security & Compliance PowerShell and is intentionally out of scope for this read-only platform.",

    "faq.q.demo.title": "Why do some entities show a 'Demo' badge?",
    "faq.q.demo.body":
      "Demo-flagged entities carry pre-baked signals and are never synced against real Graph endpoints. They're there so the dashboard shows populated data before real tenants are onboarded. Production installs ship with seeding disabled by default (set `SCSC_SEED_DEMO=true` to enable). An admin can wipe all demo entities at any time with `npm run purge-demo` — real tenants are untouched.",

    "faq.q.glossary.title": "Glossary",
    "faq.q.glossary.tenant": "Tenant — one entity's Microsoft 365 organization, identified by an Entra GUID.",
    "faq.q.glossary.cluster": "Cluster — {orgShort} grouping: Police / Health / Education / Municipality / Utilities / Transport / Other.",
    "faq.q.glossary.consent": "Admin consent — the entity's Global Administrator approves the {orgShort}'s Entra app in their tenant; required before any Graph call works.",
    "faq.q.glossary.secureScore": "Secure Score — Microsoft's built-in tenant-level security posture metric, 0 to a dynamic max.",

    "kpi.maturityIndex": "Maturity index",
    "kpi.frameworkCompliance": "Framework compliance",
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
    "entities.scopeStale.title":
      "{count} tenants need re-consent for newly added permissions",
    "entities.scopeStale.body":
      "A recent release added Microsoft Graph or Defender scopes that these tenants haven't been consented for yet. Until they re-consent, sync will run with the old permission set and some signals (e.g. vulnerability hunting) won't return data.",
    "entities.scopeStale.reverify": "Re-verify",
    "entities.scopeStale.hint":
      "If Re-verify still fails, the entity admin must open Enterprise Applications in their tenant, find the Mizan app, and click Grant admin consent — that picks up the new scopes from the source app definition. Then click Re-verify here.",
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
    "cols.frameworkCompliance": "Framework",
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

    "workloadCoverage.title": "Microsoft 365 workload coverage",
    "workloadCoverage.subtitle":
      "What this entity has licensed, what's actively deployed, and where the coverage gaps are. Tools served by Microsoft Graph beta endpoints are tagged BETA; tools whose deployment details aren't on Microsoft Graph yet show license + activity proxies.",
    "workloadCoverage.collectedAt": "Collected {when}",
    "workloadCoverage.notYetCollected": "Coverage signal not collected yet for this entity. Press \u201cSync now\u201d to gather it.",
    "workloadCoverage.awaitingFirstSync": "Waiting on the first sync of this entity.",
    "workloadCoverage.licensed": "Licensed.",
    "workloadCoverage.notLicensed": "Not licensed.",
    "workloadCoverage.seatMath": "{consumed} of {total} seats assigned.",
    "workloadCoverage.licenseNoSeatData": "Seats not reported.",
    "workloadCoverage.andMore": "+{n} more",

    "workloadCoverage.badge.live": "Live",
    "workloadCoverage.badge.beta": "Beta",
    "workloadCoverage.badge.comingSoon": "Coming soon",
    "workloadCoverage.badge.comingSoonLicensed": "Coming soon",

    "workloadCoverage.tool.intune.name": "Intune",
    "workloadCoverage.tool.intune.subtitle":
      "Device + app management. MDM authority, enrolled devices, compliance + configuration profiles.",
    "workloadCoverage.intune.mdmAuthority": "MDM authority",
    "workloadCoverage.intune.enrolled": "Enrolled devices",
    "workloadCoverage.intune.compliant": "% compliant",
    "workloadCoverage.intune.compliancePolicies": "Compliance policies",
    "workloadCoverage.intune.configProfiles": "Config profiles",
    "workloadCoverage.intune.settingsCatalog": "Settings catalog",
    "workloadCoverage.intune.byPlatform": "By platform",

    "workloadCoverage.tool.mde.name": "Defender for Endpoint (MDE)",
    "workloadCoverage.tool.mde.subtitle":
      "Endpoint sensors. Onboarded device count, OS distribution, last-seen activity, stale-sensor detection.",
    "workloadCoverage.mde.onboarded": "Onboarded",
    "workloadCoverage.mde.activeLast7d": "Active (7d)",
    "workloadCoverage.mde.staleOver30d": "Stale (>30d)",
    "workloadCoverage.mde.byOs": "By OS",
    "workloadCoverage.mde.coverageGap":
      "{n} Intune-managed devices are not yet onboarded to MDE. Closing this gap is the highest-leverage endpoint-protection action for this entity.",

    "workloadCoverage.tool.mdi.name": "Defender for Identity (MDI)",
    "workloadCoverage.tool.mdi.subtitle":
      "On-prem AD sensor coverage + sensor health. Sensor inventory pulled from Microsoft Graph beta — schema may shift.",
    "workloadCoverage.mdi.sensors": "Sensors",
    "workloadCoverage.mdi.openHealth": "Open issues",
    "workloadCoverage.mdi.criticalHealth": "Critical issues",

    "workloadCoverage.tool.labels.name": "Sensitivity Labels",
    "workloadCoverage.tool.labels.subtitle":
      "Microsoft Purview sensitivity-label catalog. Label policies + auto-labelling rules require Security & Compliance PowerShell — coming soon.",
    "workloadCoverage.labels.published": "Published labels",
    "workloadCoverage.labels.eventsLast30d": "Activity (30d)",
    "workloadCoverage.labels.catalog": "Catalog",

    "workloadCoverage.tool.mdo.name": "Defender for Office 365 (MDO)",
    "workloadCoverage.tool.mdo.subtitle":
      "Email + collab threat protection. Policy details (Safe Attachments, Safe Links, anti-phishing) require Exchange Online PowerShell.",
    "workloadCoverage.mdo.alertsLast30d": "Alerts (30d)",
    "workloadCoverage.mdo.submissionsLast30d": "Submissions (30d)",
    "workloadCoverage.mdo.comingSoonNote":
      "Activity proxy (alerts + submissions) shown here. Full policy details available in the Defender admin portal.",

    "workloadCoverage.tool.mdca.name": "Defender for Cloud Apps (MDCA)",
    "workloadCoverage.tool.mdca.subtitle":
      "SaaS / OAuth security. Sanctioned-app catalog + connected apps live on the per-tenant MDCA portal API.",
    "workloadCoverage.mdca.alertsLast30d": "Alerts (30d)",
    "workloadCoverage.mdca.comingSoonNote":
      "Activity proxy (alerts) shown here. Sanctioned apps + connected apps are available in the Defender for Cloud Apps portal.",

    "workloadCoverage.tool.dlp.name": "Data Loss Prevention",
    "workloadCoverage.tool.dlp.subtitle":
      "Endpoint DLP, Teams DLP, SharePoint, OneDrive, Exchange. Per-workload deployment requires Security & Compliance PowerShell.",
    "workloadCoverage.dlp.policiesBeta": "Policies (beta)",
    "workloadCoverage.dlp.alertsLast30d": "Alerts (30d)",
    "workloadCoverage.dlp.comingSoonNote":
      "Activity proxy (alerts) + tenant policy count from Microsoft Graph beta. Per-workload (Endpoint / Teams / SPO / OneDrive / Exchange) deployment available in the Purview portal.",

    "entity.frameworkCompliance.title": "Framework compliance",
    "entity.frameworkCompliance.titleFor": "{framework} compliance",
    "entity.frameworkCompliance.titleGeneric": "Framework compliance",
    "entity.frameworkCompliance.subtitle":
      "Single-axis alignment with the active regulatory framework. Separate from the maturity index — answers \u201chow aligned, not how protected\u201d.",
    "entity.frameworkCompliance.subtitleFor": "vs. {framework}",
    "entity.frameworkCompliance.viewBreakdown": "View breakdown",
    "entity.frameworkCompliance.clausesScored": "Clauses scored",
    "entity.frameworkCompliance.unscoredClausesLabel": "Unscored clauses",
    "entity.frameworkCompliance.treatmentSkipHint": "Skipped from math",
    "entity.frameworkCompliance.treatmentZeroHint": "Counted as 0%",
    "entity.frameworkCompliance.noData":
      "No framework data computed yet. The first sync will populate this.",
    "entity.frameworkBreakdown.title": "Framework compliance breakdown",
    "entity.frameworkBreakdown.titleFor": "{framework} \u2014 per-clause coverage",
    "entity.frameworkBreakdown.subtitleFor":
      "Per-clause coverage against {framework}. Tells you exactly which domains the entity is failing.",
    "entity.frameworkBreakdown.filterBy": "Filter:",
    "entity.frameworkBreakdown.allClasses": "All classes",
    "entity.frameworkBreakdown.allStatus": "All status",
    "entity.frameworkBreakdown.statusFailing": "Failing only",
    "entity.frameworkBreakdown.statusPartial": "Partial only",
    "entity.frameworkBreakdown.statusPassing": "Passing only",
    "entity.frameworkBreakdown.statusUnscored": "Unscored only",
    "entity.frameworkBreakdown.classClauseCount": "across {n} clauses",
    "entity.frameworkBreakdown.col.clause": "Clause",
    "entity.frameworkBreakdown.col.class": "Class",
    "entity.frameworkBreakdown.col.weight": "Weight",
    "entity.frameworkBreakdown.col.evidence": "Evidence",
    "entity.frameworkBreakdown.col.coverage": "Coverage",
    "entity.frameworkBreakdown.samples": "{n} samples",
    "entity.frameworkBreakdown.noRows": "No clauses match the current filters.",
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
    "subscores.compliance": "Compliance ({framework})",

    "maturity.sub.secureScore": "Secure Score",
    "maturity.sub.identity": "Identity",
    "maturity.sub.device": "Device",
    "maturity.sub.data": "Data",
    "maturity.sub.threat": "Threat response",
    "maturity.sub.compliance": "Compliance",
    "radar.ariaLabel":
      "Six-axis radar chart of Maturity sub-scores: Secure Score, Identity, Device, Data, Threat response, Compliance",
    "radar.entityProfile.title": "Posture profile",
    "radar.entityProfile.subtitle":
      "Six-axis radar of this entity's Maturity sub-scores. Compare against the Council mean overlay to see where this entity is strong or weak relative to peers.",
    "radar.councilMean": "Council mean",
    "radar.councilTarget": "Council target",
    "radar.councilOverview.title": "Posture profile by cluster",
    "radar.councilOverview.subtitle":
      "Mean Maturity sub-scores across each cluster. The {target}% Council target is overlaid as a dashed reference so weak axes per cluster jump out at a glance.",

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
      "Data · Governance — Purview signals + {framework} alignment per the roadmap.",
    "subtabs.more.body":
      "Data and Governance sub-tabs populate once Purview read signals (DLP alerts, Insider Risk, Subject Rights Requests, label adoption) and {framework} control mapping are wired into the sync.",

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
      "from the Maturity Index ({framework} weighting)",
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
    "tab.framework": "Framework",
    "tab.vulnerabilities": "Vulnerabilities",
    "tab.attackSimulation": "Attack Simulation",
    "tab.connection": "Connection",
    "entity.frameworkTab.eyebrowFor": "{framework} compliance — entity view",
    "entity.frameworkTab.titleFor": "{framework} controls deployed on this entity",
    "entity.frameworkTab.subtitleFor":
      "Per-clause coverage and out-of-scope carve-outs for {entity}. Mark a clause out-of-scope when this entity's controls are covered by a 3rd-party product the Council has accepted.",
    "entity.frameworkTab.stat.clausesTotal": "Clauses in framework",
    "entity.frameworkTab.stat.clausesScored": "Clauses scoring",
    "entity.frameworkTab.stat.clausesOos": "Out of scope",
    "entity.frameworkTab.stat.target": "Target",
    "entity.frameworkTab.controls.title": "Per-clause coverage + scope",
    "entity.frameworkTab.controls.subtitle":
      "Mark a clause out of scope when it's covered by a non-Microsoft tool — it'll be excluded from this entity's framework score. Global OOS marks (set in Settings → Compliance framework) cannot be overridden here.",
    "entity.frameworkTab.col.scope": "Scope",
    "entity.frameworkTab.scope.markOos": "Mark out of scope",
    "entity.frameworkTab.scope.restore": "Restore to scope",
    "entity.frameworkTab.scope.globalLocked": "Global · locked",
    "entity.frameworkTab.chip.globalOos": "Global OOS",
    "entity.frameworkTab.chip.tenantOos": "Out of scope",
    "entity.frameworkTab.reason.title": "Reason for marking out of scope",
    "entity.frameworkTab.reason.body":
      "Optional. Captured for the audit trail (covered by 3rd-party product, federal carve-out, etc.). Up to 500 characters.",
    "entity.frameworkTab.reason.placeholder":
      "e.g. Endpoint protection covered by federal SOC contract.",
    "entity.frameworkTab.reason.cancel": "Cancel",
    "entity.frameworkTab.reason.confirm": "Mark out of scope",
    "entity.frameworkTab.deployments.title": "Deployed via Directive",
    "entity.frameworkTab.deployments.subtitle":
      "Recent baseline pushes that have executed against this entity. New pushes appear here within seconds of completion.",
    "entity.frameworkTab.deployments.empty":
      "No directive pushes have executed against this entity yet.",

    "tab.controls.title": "Secure Score controls",
    "tab.controls.subtitle": "Per-control implementation status from Microsoft Secure Score. Mark a control out of scope when it's covered by a non-Microsoft tool — it'll be excluded from the Maturity Index calculation.",
    "tab.controls.col.name": "Control",
    "tab.controls.col.category": "Category",
    "tab.controls.col.score": "Score",
    "tab.controls.col.status": "Status",
    "tab.controls.col.scope": "Scope",
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
    // v2.5.22: per-control Out-of-Scope marks. Removes the control from
    // Mizan's Maturity Index calculation when it's covered by a non-Microsoft tool.
    "tab.controls.scope.markOos": "Mark out of scope",
    "tab.controls.scope.restore": "Restore to scope",
    "tab.controls.scope.oosChip": "Out of scope",
    "tab.controls.scope.help":
      "Mark out of scope = Done using a non-Microsoft tool. Removes this control from the Maturity Index calculation.",
    "tab.controls.scope.reason.title": "Mark this control out of scope",
    "tab.controls.scope.reason.body":
      "Out of scope means this control is covered by a non-Microsoft tool. Removing it from the calculation tells Mizan not to penalise this entity for a control Microsoft can't see. Add a short reason so future reviewers understand the carve-out.",
    "tab.controls.scope.reason.placeholder":
      "e.g. CrowdStrike Falcon covers endpoint hardening — Microsoft Secure Score can't observe it.",
    "tab.controls.scope.reason.cancel": "Cancel",
    "tab.controls.scope.reason.confirm": "Mark out of scope",
    "tab.controls.scope.reason.saving": "Saving…",

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
    "tab.identity.showingFirst":
      "Showing first {shown} of {total} matching users.",
    "tab.identity.showAll": "Show all {count}",
    "tab.identity.pim.excessive.title":
      "Excessive admin accounts: {count} privileged role(s) exceed the recommended ceiling",
    "tab.identity.pim.excessive.body":
      "Microsoft Secure Score recommends keeping privileged role membership tight (e.g. fewer than 5 Global Administrators). Review the highlighted rows below — every extra admin account expands the blast radius of a single credential compromise.",
    "tab.identity.pim.excessive.chip": "Over {threshold}",
    "tab.identity.pim.deactivations.title":
      "{count} admin account(s) deactivated in the last 30 days",
    "tab.identity.pim.deactivations.body":
      "Cross-referenced from /auditLogs/directoryAudits — only Disable-account events targeting users who hold a privileged role surface here. Review each event to confirm it was authorized; consider deploying the Mizan deactivation-prohibition Conditional Access baseline (Directive → Conditional Access) to require approval on future deactivations.",
    "tab.identity.pim.deactivations.col.target": "User",
    "tab.identity.pim.deactivations.col.role": "Privileged role",
    "tab.identity.pim.deactivations.col.actor": "Disabled by",
    "tab.identity.pim.deactivations.col.when": "When",

    "notif.popover.title": "Notifications",
    "notif.popover.summary": "{count} item · {unread} new",
    "notif.popover.empty":
      "No active alerts across the federation. Sync errors, scope-stale tenants, admin deactivations, high-risk users, and active high-severity incidents land here as they happen.",
    "notif.popover.footer":
      "Updates every minute. Click any item to drill into the entity.",
    "notif.syncFailure.title": "Sync error on entity",
    "notif.consentFailed.title": "Consent flow needs attention",
    "notif.scopeStale.title": "Tenant needs re-consent for new scopes",
    "notif.adminDeactivated.title": "Admin account deactivated",
    "notif.highRiskUser.title": "High-risk user detected",
    "notif.criticalIncident.title": "Active critical/high incident",
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
    "directive.demoBanner.title":
      "Demo mode — dashboard auth is bypassed.",
    "directive.demoBanner.body":
      "Actions on DEMO tenants (flagged with a DEMO chip) are simulated: no Graph call, no Defender XDR change, no Microsoft submission. Actions on real onboarded tenants go through the full Graph path and do make real writes. The simulation is keyed on each tenant's is_demo flag, not on the deployment's demo-mode setting — you can onboard a real tenant into this environment for testing directive writes end to end without turning demo mode off.",

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
    "directive.cap.caBaselines.title": "Conditional Access baselines + custom wizard",
    "directive.cap.caBaselines.body":
      "Push the 12 curated CA baselines (identity hardening, legacy auth block, risk-based, session hygiene, device posture). Report-only default, idempotent push, per-row rollback with pre-flight preview, baseline-wide \"Remove from all\". Custom CA wizard adds tenant-scoped mode (specific users/groups/named locations/ToU/custom auth strengths) + device filter rule builder.",
    "directive.cap.intuneBaselines.title": "Intune device-posture baselines",
    "directive.cap.intuneBaselines.body":
      "13 baselines pushed via Graph: iOS / Android / Windows / macOS compliance, iOS / Android app protection (MAM, no enrolment needed), Windows BitLocker enforcement. Policies ship un-assigned; entity admin assigns from Intune.",
    "directive.cap.sharepointSharing.title": "SharePoint tenant external-sharing",
    "directive.cap.sharepointSharing.body":
      "Tenant-level SharePoint sharing-defaults baselines: strict external sharing (guests only, no anonymous), default link Internal+View, domain allow-list, anonymous links off. Singleton model — push only, audit captures the before/after diff.",
    "directive.cap.iocPush.title": "Threat Intelligence — IOC push",
    "directive.cap.iocPush.body":
      "Block (or alert on) a file hash, URL, domain, IPv4, or IPv6 indicator across every consented entity's Defender for Endpoint fleet. Per-IOC expiration, idempotency by description tag, full rollback by indicator id.",
    "directive.cap.asrRules.title": "Defender for Endpoint ASR rules",
    "directive.cap.asrRules.body":
      "6 Attack Surface Reduction baselines: Office child processes, executable email content, LSASS credential theft, JS/VBS launching downloaded executables, PSExec + WMI, untrusted USB processes. All ship in audit mode; flip to Block in the Defender portal once telemetry is reviewed.",
    "directive.cap.deviceIsolation.title": "Device isolation (MDE direct)",
    "directive.cap.deviceIsolation.body":
      "Request isolation of a compromised endpoint. Requires the Defender for Endpoint direct API (separate Entra app), not in scope for v2.0.",
    "directive.cap.dlp.title": "Data Loss Prevention baselines",
    "directive.cap.dlp.body":
      "Curated DLP catalog (block sensitive external sharing, credential exfil, bulk transfer, labelled-data egress). Push unlocks the day Microsoft Graph exposes the full DLP authoring API — today's beta covers a small subset only.",
    "directive.cap.labels.title": "Sensitivity labels",
    "directive.cap.labels.body":
      "Curated 4-level label hierarchy + auto-labelling rules (internal email, sensitive-info content). Push unlocks once Graph can configure encryption, content marking, publishing, and auto-label rules — today's beta only creates bare labels.",
    "directive.cap.attackSim.title": "Attack simulation training",
    "directive.cap.attackSim.body":
      "Quarterly phishing simulations + new-hire awareness training + repeat-offender retraining. Push unlocks when Microsoft GAs the simulation create + automation API on Graph; reads are wired today.",
    "directive.cap.pim.title": "PIM + identity governance",
    "directive.cap.pim.body":
      "MFA-on-activation, 8-hour activation cap, justification + notification on activation, quarterly access reviews. Held coming-soon until cross-tenant CRUD on role-management policies is reliable.",
    "directive.cap.appConsent.title": "App consent policies",
    "directive.cap.appConsent.body":
      "Restrict consent to verified publishers, enable admin consent workflow, block high-risk permissions, pre-approve low-risk. Closes the OAuth consent phishing surface. Held coming-soon while verified-publisher allowlists stabilise.",
    "directive.cap.tenantIdentity.title": "Tenant-wide identity defaults",
    "directive.cap.tenantIdentity.body":
      "Authentication-methods policy (FIDO2/passkey, deprecate SMS), default user permissions, cross-tenant access trust. Held coming-soon while Graph schemas (FIDO2 → passkey rename, B2B trust rev) settle.",
    "directive.cap.namedLocations.title": "Named locations",
    "directive.cap.namedLocations.body":
      "Already shipped as part of Phase 4.5 — the custom CA wizard's tenant-scoped mode lets the operator pick named locations from the reference tenant. No separate console.",
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

    "directive.tabs.label": "Directive sections",
    "directive.tab.overview": "Overview",
    "directive.tab.compliance": "Compliance",
    "directive.tab.ca": "Conditional Access",
    "directive.tab.intune": "Intune",
    "directive.tab.sharepoint": "SharePoint",
    "directive.tab.ioc": "Threat indicators",
    "directive.tab.roadmap": "Roadmap",
    "directive.tab.history": "History & audit",
    "directive.compliance.loading": "Loading compliance gap…",
    "directive.compliance.title.generic": "No compliance framework selected",
    "directive.compliance.subtitle.generic":
      "Pick a regulatory framework in Settings → Compliance framework (Dubai ISR, UAE NESA, etc.) to see per-clause gaps and suggested baselines to push.",
    "directive.compliance.eyebrowFor": "{framework} compliance — push planning",
    "directive.compliance.titleFor": "{framework} gap → push suggestions",
    "directive.compliance.subtitleFor":
      "Per-clause coverage of {framework} ({version}) rolled up across every consented entity, with the lowest-scoring clauses surfaced first and concrete baselines to push to drive the score up.",
    "directive.compliance.stat.clausesInScope": "Clauses in scope",
    "directive.compliance.stat.failingClauses": "Below target",
    "directive.compliance.stat.consentedEntities": "Consented entities",
    "directive.compliance.stat.target": "Target",
    "directive.compliance.oosNote":
      "{n} clause(s) marked out-of-scope and excluded from this view. Manage in Settings → Compliance framework.",
    "directive.compliance.gap.title": "Per-clause gap",
    "directive.compliance.gap.subtitle":
      "Failing clauses sorted to the top. Click an entity name to jump to that entity's Framework tab; click a baseline to jump to the matching push card.",
    "directive.compliance.col.clause": "Clause",
    "directive.compliance.col.avgCoverage": "Avg coverage",
    "directive.compliance.col.entities": "Entities",
    "directive.compliance.col.weakest": "Weakest entities",
    "directive.compliance.col.suggestions": "Suggested pushes",
    "directive.compliance.failingN": "{n} failing",
    "directive.compliance.noSuggestions":
      "No matching baseline yet — covered by custom evidence.",
    "directive.tab.overview.title": "Capability matrix",
    "directive.tab.overview.subtitle":
      "What the Directive engine can push today, what is on deck, and the safety rails that ride along on every action.",
    "directive.tab.roadmap.title": "On the roadmap",
    "directive.tab.roadmap.subtitle":
      "Authoring scaffolds for capabilities that need a Microsoft Graph write surface or are pending Center sign-off. Pushes are disabled until each catalog flips to GA.",

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
    "directive.threat.evidenceTitle": "Evidence from alerts",
    "directive.threat.noEvidence":
      "This incident has no extractable evidence (URLs, emails, or files) cached. Try another incident.",
    "directive.threat.useInForm": "Use in form",
    "directive.threat.submitToMicrosoft": "Submit to Microsoft",
    "directive.threat.evidenceHint":
      "Each evidence item was pulled from the alerts attached to this incident. Click \u201CUse in form\u201D to pre-fill the submission below \u2014 no need to leave Mizan or open the entity's Defender XDR portal.",

    "directive.baselines.title": "Conditional Access baselines",
    "directive.baselines.subtitle":
      "Center-authored Conditional Access policies. Pushed to every directive-consent entity in one action. Every push ships as report-only by default; the entity toggles enforcement from their own Entra admin center after they've verified the scope. Rollback is one click and deletes the pushed policies.",
    "directive.baselines.target": "Targets",
    "directive.baselines.grant": "Grant",
    "directive.baselines.initialState": "Initial state",
    "directive.baselines.reportOnly": "Report-only (not enforced)",
    "directive.baselines.pushCta": "Push to entities",
    "directive.baselines.risk.low": "Low risk",
    "directive.baselines.risk.medium": "Medium risk",
    "directive.baselines.risk.high": "High risk",
    "directive.baselines.previewTitle": "Preview — this is what will be created",
    "directive.baselines.stateLabel": "State",
    "directive.baselines.targetsTitle": "Push to which entities?",
    "directive.baselines.selectAll": "Select all",
    "directive.baselines.selectNone": "Select none",
    "directive.baselines.cancel": "Cancel",
    "directive.baselines.close": "Close",
    "directive.baselines.executeCta": "Push to {count} entity(ies)",
    "directive.baselines.resultTitle": "Push #{pushId} complete",
    "directive.baselines.skippedObservation": "Skipped (observation)",
    "directive.baselines.historyTitle": "Push history",
    "directive.baselines.historySubtitle":
      "Every baseline push, newest first. Rollback deletes the created policies from each target tenant — audited as its own directive action.",
    "directive.baselines.historyEmpty":
      "No baseline pushes yet. Pick a baseline above, choose the target entities, and push.",
    "directive.baselines.col.baseline": "Baseline",
    "directive.baselines.col.targets": "Targets",
    "directive.baselines.col.actions": "Actions",
    "directive.baselines.rollback": "Roll back",
    "directive.baselines.rollbackConfirm":
      "Roll back this push? The Conditional Access policies it created will be deleted from every target tenant. This cannot be undone from inside Mizan — to re-apply, push the baseline again.",
    "directive.baselines.rolledbackStatus": "Rolled back",
    "directive.baselines.runningStatus": "Running",
    "directive.baselines.details": "Details",
    "directive.baselines.hideDetails": "Hide details",
    "directive.baselines.why": "Why this matters",
    "directive.baselines.impact": "User impact",
    "directive.baselines.prerequisites": "Prerequisites",
    "directive.baselines.rollout": "Rollout advice",
    "directive.baselines.docsLink": "Microsoft Learn reference",
    "directive.baselines.excludesOwnAdmins":
      "Automatically excludes the entity's own Global Administrators",
    "directive.baselines.selectedCount":
      "{count} of {total} baselines selected",
    "directive.baselines.noneSelected":
      "Select one or more baselines to push.",

    "directive.baselines.reportOnlyChip": "Ships report-only",
    "directive.baselines.reportOnlySubtitle":
      "Nothing is enforced until the entity flips the policy on in their own Entra tenant.",
    "directive.baselines.alreadyAppliedStatus": "Already applied",
    "directive.baselines.alreadyAppliedExplain":
      "The entity already has this baseline (matched by Mizan tag). No new policy was created — Mizan detected it and made the push a no-op. The state column shows the state inside the entity's tenant right now.",

    "directive.baselines.stateReportOnly": "Report-only",
    "directive.baselines.stateEnabled": "Enabled (enforced)",
    "directive.baselines.stateDisabled": "Disabled",
    "directive.baselines.stateUnknown": "Unknown",

    "directive.status.title": "Baseline status per entity",
    "directive.status.subtitle":
      "For the selected entity, shows which of the catalogue baselines are present in the entity's Entra tenant right now and what state each is in — so you can see if they flipped a report-only policy to enabled after your push.",
    "directive.status.entityLabel": "Entity",
    "directive.status.entityPlaceholder": "Select a directive entity…",
    "directive.status.refresh": "Refresh",
    "directive.status.refreshing": "Refreshing…",
    "directive.status.generatedAt": "Snapshot taken",
    "directive.status.modeSimulated":
      "Simulated view — reconstructed from the most recent push to this demo entity",
    "directive.status.modeReal": "Live from the entity's Entra tenant",
    "directive.status.col.baseline": "Baseline",
    "directive.status.col.present": "Present",
    "directive.status.col.state": "Current state",
    "directive.status.col.observed": "Observed",
    "directive.status.presentYes": "Yes",
    "directive.status.presentNo": "Not present",
    "directive.status.empty":
      "Pick an entity above — the matrix will show each of the 12 baselines with its current state.",
    "directive.status.flippedWarn":
      "Different from the report-only state we pushed — entity flipped this on",
    "directive.status.stillReportOnly":
      "Still in report-only — entity hasn't enforced yet",

    "custom.title": "Custom CA policies",
    "custom.subtitle":
      "Build a Conditional Access policy for your entities — no JSON required. Drafts are saved here; push when ready. All pushes are tagged for idempotency and rollback the same way baselines are.",
    "custom.newDraft": "New custom policy",
    "custom.noDrafts":
      "No drafts yet. Click \"New custom policy\" to open the wizard.",
    "custom.col.name": "Name",
    "custom.col.risk": "Risk",
    "custom.col.scope": "Scope",
    "custom.col.state": "State",
    "custom.col.updated": "Updated",
    "custom.col.actions": "Actions",
    "custom.edit": "Edit",
    "custom.delete": "Delete",
    "custom.confirmDelete":
      "Delete this draft? This cannot be undone.",
    "custom.clone": "Clone",
    "custom.cloneFromBaseline": "Clone as custom draft",
    "custom.scopeUsers.all": "All users",
    "custom.scopeUsers.none": "No users",
    "custom.scopeUsers.roles": "Directory roles",
    "custom.scopeUsers.guests": "Guests & external",
    "custom.scopeApps.all": "All apps",
    "custom.scopeApps.office365": "Office 365",
    "custom.scopeApps.adminPortals": "Admin portals",
    "custom.scopeApps.azureManagement": "Azure mgmt",
    "custom.scopeApps.specific": "Specific apps",
    "custom.grantKind.block": "Block",
    "custom.grantKind.grantWithRequirements": "Grant",

    "wizard.title": "Custom CA policy wizard",
    "wizard.subtitle":
      "Autosaves as you go. Push only after review.",
    "wizard.back": "Back to /directive",
    "wizard.saving": "Saving…",
    "wizard.saved": "Saved",
    "wizard.pushCta": "Push to entities",
    "wizard.step.identify": "Identify",
    "wizard.step.users": "Users",
    "wizard.step.apps": "Apps",
    "wizard.step.conditions": "Conditions",
    "wizard.step.grant": "Access",
    "wizard.step.session": "Session",
    "wizard.step.review": "Review",

    "wizard.identify.name": "Policy name",
    "wizard.identify.nameHint":
      "Appears in Entra with [Custom] prefix. Use something descriptive — \"Block legacy auth for Finance\", \"Require phishing-resistant MFA on Billing Admins\", etc.",
    "wizard.identify.description": "Internal description (Mizan only)",
    "wizard.identify.state": "Initial state",
    "wizard.identify.stateReportOnly":
      "Report-only — recommended. Policy is logged but not enforced.",
    "wizard.identify.stateDisabled":
      "Disabled — policy is created but never applied. Useful for drafts.",
    "wizard.identify.stateEnabled":
      "Enabled — policy IS enforced immediately on every matching sign-in.",
    "wizard.identify.enabledWarn":
      "⚠ You've chosen to enforce this immediately. Make sure you've simulated against a demo entity first.",
    "wizard.identify.scope": "Policy scope",
    "wizard.identify.scopeHint":
      "Cross-tenant policies are built from values that mean the same thing in every Entra tenant (All users, directory roles, guests, Microsoft-published apps, built-in auth strengths). Tenant-scoped policies can additionally reference specific users, groups, named locations, Terms of Use, and custom auth strengths from one chosen entity — at the cost of only being pushable to that one entity.",
    "wizard.identify.scopeCrossTenant": "Cross-tenant (default)",
    "wizard.identify.scopeCrossTenantHint":
      "Pushable to many entities at once. Tenant-local pickers stay hidden.",
    "wizard.identify.scopeTenantScoped": "Tenant-scoped to one entity",
    "wizard.identify.scopeTenantScopedHint":
      "Unlocks specific users, groups, named locations, Terms of Use, and custom auth strengths from the chosen reference tenant. Push is restricted to that tenant.",

    "wizard.scope.crossTenant":
      "Cross-tenant policy — every field works in every entity's Entra tenant.",
    "wizard.scope.scopedTitle":
      "Tenant-scoped to {tenant}",
    "wizard.scope.scopedBody":
      "Tenant-local IDs (specific users, groups, named locations, ToU, custom auth strengths) are resolved against this entity. Push is restricted to it.",

    "wizard.users.includeTitle": "Apply to",
    "wizard.users.includeAll": "All users in the tenant",
    "wizard.users.includeNone": "No users (disable)",
    "wizard.users.includeRoles": "Specific directory roles",
    "wizard.users.includeGuests": "Guests and external users only",
    "wizard.users.rolesPickerLabel": "Pick one or more directory roles",
    "wizard.users.rolesPickerHint":
      "Role template IDs are the same in every tenant, so this policy will hit the matching role wherever it's pushed.",
    "wizard.users.guestTypesLabel": "Include these guest types",
    "wizard.users.externalTenantMembership":
      "Apply to guests from any external tenant",
    "wizard.users.excludeTitle": "Exclude",
    "wizard.users.excludeGaLabel":
      "Exclude Global Administrators (safety rail)",
    "wizard.users.excludeGaHint":
      "Keeps a recoverable path into every tenant. Disable only if you truly understand the lockout risk.",
    "wizard.users.excludeRolesLabel":
      "Also exclude these directory roles",
    "wizard.users.tenantLocalHint":
      "These fields reference specific users and groups from the reference tenant. They are added on top of whatever Include kind you picked above — so \"All users + specific excluded users\" works the same way it does in Entra.",
    "wizard.users.specificUsersLabel":
      "Also include these specific users (typeahead against reference tenant)",
    "wizard.users.specificGroupsLabel":
      "Also include these specific groups",
    "wizard.users.excludeSpecificUsersLabel":
      "Also exclude these specific users",
    "wizard.users.excludeSpecificGroupsLabel":
      "Also exclude these specific groups",

    "wizard.apps.targetTitle": "Target cloud apps",
    "wizard.apps.targetAll": "All cloud apps",
    "wizard.apps.targetOffice365": "Office 365 (Exchange, SharePoint, Teams, Office)",
    "wizard.apps.targetAdminPortals":
      "Microsoft admin portals (Entra, Intune, Defender, Exchange, SharePoint, M365)",
    "wizard.apps.targetAzureManagement":
      "Azure Management (Azure portal, CLI, PowerShell, ARM)",
    "wizard.apps.targetSpecific": "Specific applications",
    "wizard.apps.specificHint":
      "Pick from Microsoft-published apps below, or add a custom application by GUID. Custom GUIDs must exist in every target tenant.",
    "wizard.apps.excludeTitle": "Exclude apps (optional)",
    "wizard.apps.addCustomGuid": "Add custom app by GUID",
    "wizard.apps.addCustomPlaceholder": "00000000-0000-0000-0000-000000000000",
    "wizard.apps.add": "Add",

    "wizard.conditions.title":
      "Conditions (all optional — leave blank to match any)",
    "wizard.conditions.userRisk": "User risk levels",
    "wizard.conditions.signInRisk": "Sign-in risk levels",
    "wizard.conditions.platforms": "Device platforms",
    "wizard.conditions.clientAppTypes": "Client app types",
    "wizard.conditions.locations": "Locations",
    "wizard.conditions.locationsAny": "Any location",
    "wizard.conditions.locationsTrusted":
      "Trusted locations only (named locations marked trusted in the tenant)",
    "wizard.conditions.locationsSpecific":
      "Specific named locations (from reference tenant)",
    "wizard.conditions.namedLocationsHint":
      "Named locations are defined per tenant. Pick one or more to include or exclude. Trusted locations are tagged.",
    "wizard.conditions.namedLocationsEmpty":
      "No named locations found in this tenant.",
    "wizard.conditions.deviceFilter": "Device filter",
    "wizard.conditions.deviceFilterHint":
      "Narrow by device attributes the sign-in reports. Rules are AND-joined and translated to Entra's rule grammar at render time (e.g. device.trustType -eq \"AzureAD\" -and device.isCompliant -eq True).",
    "wizard.conditions.deviceFilterEnable":
      "Enable device filter",
    "wizard.conditions.deviceFilterAdd": "Add rule",

    "wizard.grant.title": "What happens when the conditions match?",
    "wizard.grant.block": "Block the sign-in",
    "wizard.grant.grantWithRequirements":
      "Grant the sign-in, but require the following",
    "wizard.grant.operatorTitle": "Combine requirements with",
    "wizard.grant.operatorAnd": "ALL of the selected (AND)",
    "wizard.grant.operatorOr": "ANY of the selected (OR)",
    "wizard.grant.requireMfa": "Require multi-factor authentication",
    "wizard.grant.authStrengthLabel":
      "Require a specific authentication strength (overrides plain MFA)",
    "wizard.grant.authStrengthNone": "(none — use plain MFA)",
    "wizard.grant.requireCompliantDevice": "Require Intune-compliant device",
    "wizard.grant.requireHybridJoined":
      "Require Entra hybrid-joined device",
    "wizard.grant.requireApprovedApp":
      "Require approved client app (iOS/Android)",
    "wizard.grant.requireCompliantApp":
      "Require app protection policy (Intune MAM)",
    "wizard.grant.requirePasswordChange":
      "Force password change (for risk-remediation policies)",
    "wizard.grant.touLabel":
      "Terms of Use (from reference tenant)",
    "wizard.grant.touHint":
      "User must accept each selected Terms of Use document to satisfy the grant. ToU must already exist in the reference tenant.",
    "wizard.grant.touEmpty":
      "No Terms of Use agreements found in this tenant.",

    "wizard.session.title":
      "Session controls (all optional)",
    "wizard.session.signInFrequencyEnable":
      "Force re-authentication on a cadence",
    "wizard.session.signInFrequencyValue":
      "Every",
    "wizard.session.signInFrequencyTypeHours": "hours",
    "wizard.session.signInFrequencyTypeDays": "days",
    "wizard.session.persistentBrowser": "Persistent browser sessions",
    "wizard.session.persistentDefault": "Leave unchanged",
    "wizard.session.persistentNever": "Never persist (sign in every browser restart)",
    "wizard.session.persistentAlways": "Always persist",
    "wizard.session.appEnforced":
      "Enable app-enforced restrictions (SharePoint/OneDrive partial access on unmanaged devices)",

    "wizard.review.title": "Review and push",
    "wizard.review.riskTier": "Computed risk tier",
    "wizard.review.grant": "Access summary",
    "wizard.review.previewBody": "Exact Graph body (preview)",
    "wizard.review.showBody": "Show Graph body",
    "wizard.review.hideBody": "Hide Graph body",
    "wizard.review.targetPickerTitle": "Push to which entities?",
    "wizard.review.pushCta": "Push policy to {count} entity(ies)",
    "wizard.review.cannotPushYet":
      "Fix validation errors on earlier steps before pushing.",
    "wizard.review.scopedTargetOnly":
      "This policy is tenant-scoped — push is restricted to its reference tenant. Clone the draft if you need to push to a different entity.",

    "wizard.validation.nameRequired": "A policy name is required.",
    "wizard.validation.rolesRequired":
      "Pick at least one directory role when targeting roles.",
    "wizard.validation.guestsRequired":
      "Pick at least one guest type when targeting guests.",
    "wizard.validation.specificAppsRequired":
      "Add at least one application when targeting specific apps.",
    "wizard.validation.grantEmpty":
      "Pick at least one requirement — or choose Block.",

    "rollback.preflightTitle": "Before rolling back",
    "rollback.preflightIntro":
      "Review what will be deleted. Any policy still in report-only is safe to remove. Policies now in Enabled were flipped on by the entity — deleting them immediately un-enforces the control for that entity.",
    "rollback.flipWarn":
      "Entity has flipped this to Enabled — rollback will un-enforce",
    "rollback.alreadyGone":
      "Policy not found in entity — nothing to delete",
    "rollback.skipReason.already_rolledback": "Already rolled back",
    "rollback.skipReason.failed": "Push failed — nothing to roll back",
    "rollback.skipReason.no_policy_id":
      "Idempotent match — this push didn't create the policy",
    "rollback.col.tenant": "Entity",
    "rollback.col.currentState": "Current state",
    "rollback.col.action": "Action",
    "rollback.actionWillDelete": "Will DELETE",
    "rollback.actionSkip": "Skip",
    "rollback.perTenantCta": "Roll back selected ({count})",
    "rollback.allCta": "Roll back all eligible",
    "rollback.cancel": "Cancel",
    "rollback.confirmOne":
      "Roll back from {tenant}? The CA policy will be deleted in their Entra tenant.",

    "rollback.all.cta": "Remove from ALL entities",
    "rollback.all.confirmTitle":
      "Remove this policy from every entity that has it",
    "rollback.all.confirmBody":
      "Mizan will DELETE the CA policy in every Entra tenant where it was pushed (by tag match, so even if the entity renamed it). This cannot be undone — re-pushing will create a fresh policy with a new Graph id.",
    "rollback.all.confirmCta": "Yes, remove from all",
    "rollback.all.done":
      "Removed from {count} entity(ies)",

    // ---- Phase 5 Intune ----
    "intune.title": "Intune device posture baselines",
    "intune.subtitle":
      "Push device-compliance, app-protection (MAM), and endpoint-configuration policies to consented entities. Policies ship un-assigned by default — the Intune equivalent of report-only. The entity's admin decides which users / devices the policy enforces against. Same idempotency + rollback as Conditional Access.",
    "intune.platformFilter": "Platform",
    "intune.platformAll": "All platforms",
    "intune.platform.iOS": "iOS",
    "intune.platform.Android": "Android",
    "intune.platform.Windows": "Windows",
    "intune.platform.macOS": "macOS",
    "intune.targets": "Targets",
    "intune.effect": "Effect",
    "intune.pushCta": "Push to entities",
    "intune.unassignedChip": "Ships un-assigned",
    "intune.unassignedSubtitle":
      "The policy is created but not applied to any users/devices. Entity admin assigns from their Intune portal once they've reviewed it.",
    "intune.asrComingSoon.title": "Coming soon",
    "intune.asrComingSoon.body":
      "ASR rules are gated until the Phase 14 Settings Catalog rewrite ships. Microsoft Graph's v1.0 endpoint-protection schema doesn't expose ASR fields as a collection — they live on the beta resource as discrete named properties. The catalog UI stays available for review; push unlocks once Mizan migrates the writer to Settings Catalog (`/deviceManagement/configurationPolicies`).",
    "intune.licenseNote":
      "Requires Intune licensing at each target entity (Microsoft 365 E3+ / A3+ / standalone Intune P1). Unlicensed entities return 403 on push.",

    "intune.baseline.iosCompliance.title": "iOS compliance — minimum",
    "intune.baseline.iosCompliance.body":
      "iOS / iPadOS devices must have a 6-digit numeric passcode, lock after 5 minutes, not be jailbroken, and run iOS 16 or later. Data encryption is enforced by the passcode requirement.",
    "intune.baseline.iosCompliance.why":
      "iOS devices are the highest-volume Microsoft 365 mobile endpoint for most regulators and the most common lost/stolen surface. A passcode + encryption + jailbreak block forms the single strongest return per configured control. Fits CIS iOS Benchmark L1 and NIST 800-124.",
    "intune.baseline.iosCompliance.impact":
      "Devices that don't meet all criteria get marked non-compliant in Intune. If paired with a Conditional Access 'require compliant device' baseline (Phase 3), those devices are blocked from Microsoft 365. Users can remediate by setting a passcode, updating iOS, or replacing a jailbroken device.",
    "intune.baseline.iosCompliance.prerequisites":
      "Intune P1 licence per user. iOS devices enrolled via Company Portal, ADE, or User-affinity DEP. Users capable of running iOS 16 (iPhone 8 or later).",
    "intune.baseline.iosCompliance.rollout":
      "Create the policy un-assigned. Let it populate in Intune for 24h. Then assign to a pilot group of 10 and check the compliance dashboard. Expand the assignment over 2–4 weeks.",

    "intune.baseline.androidCompliance.title": "Android compliance — minimum",
    "intune.baseline.androidCompliance.body":
      "Android work-profile devices must have a 6-digit numeric passcode, device encryption, Google Play Protect attestation (SafetyNet certified), not be rooted, and run Android 12 or later.",
    "intune.baseline.androidCompliance.why":
      "Android fragmentation means the OS floor matters more than on iOS. Android 12 brings Scoped Storage enforcement, permission auto-reset, and required privacy indicators — meaningful drops in exfiltration surface. Combined with Play Protect attestation, blocks the typical stolen-device / rooted-device attack chain.",
    "intune.baseline.androidCompliance.impact":
      "Devices running Android < 12 or with a non-certified ROM become non-compliant. Older hardware (pre-2020 flagships; many budget devices) may need replacement. SafetyNet failures often signal a carrier image without Play Services.",
    "intune.baseline.androidCompliance.prerequisites":
      "Intune P1 licence per user. Devices enrolled via Android Enterprise (work profile or fully-managed). Google Play Services available.",
    "intune.baseline.androidCompliance.rollout":
      "Inventory devices running Android < 12 before assigning. Give users 30–60 days to update or replace. Ship to a pilot first, watch non-compliant count, then expand.",

    "intune.baseline.windowsCompliance.title": "Windows compliance — minimum",
    "intune.baseline.windowsCompliance.body":
      "Windows 10/11 devices must have BitLocker on the OS drive, Secure Boot enabled, TPM present, Windows Defender real-time protection + antivirus + antispyware enabled, firewall on, 8-character alphanumeric password with 15-minute lock, and at least Windows 10.0.19045 (22H2).",
    "intune.baseline.windowsCompliance.why":
      "BitLocker + Secure Boot + TPM is the defence-in-depth triad for the physical-access attack. Defender real-time + firewall is the runtime triad. Windows 10 22H2 is the last supported Win10 feature update — anything earlier is out of support and accumulates unpatched CVEs. This baseline is the minimum no CISO can defend against.",
    "intune.baseline.windowsCompliance.impact":
      "Devices without TPM 1.2+ / Secure Boot (most pre-2018 hardware) become non-compliant. CA-paired enforcement blocks them from Microsoft 365. Operator should flag hardware refresh cycles before assigning broadly.",
    "intune.baseline.windowsCompliance.prerequisites":
      "Intune P1 licence. Devices enrolled via Autopilot, Hybrid Entra Join, or Entra Join. Windows 10 21H2+ or Windows 11. TPM 1.2 or higher; Secure Boot capable hardware.",
    "intune.baseline.windowsCompliance.rollout":
      "Biggest hardware-refresh impact of any baseline — inventory TPM / Secure Boot coverage first. Ship to IT-managed fleet pilot. Expand over a quarter, aligned with hardware refresh plans.",

    "intune.baseline.macosCompliance.title": "macOS compliance — minimum",
    "intune.baseline.macosCompliance.body":
      "macOS devices must have an 8-character alphanumeric passcode locking after 15 minutes, FileVault full-disk encryption, System Integrity Protection enabled, firewall on with stealth mode, Gatekeeper set to App Store + identified developers, and at least macOS Ventura 13.0.",
    "intune.baseline.macosCompliance.why":
      "macOS ships with strong defaults but users commonly disable them. FileVault off leaves disks readable on theft. Gatekeeper off lets unsigned binaries run. Enforcing the defaults through Intune means the policy persists across user reinstalls.",
    "intune.baseline.macosCompliance.impact":
      "Users who previously disabled FileVault will be prompted to enable it (requires restart). Unsigned-developer binaries stop running. Minor user friction; no hardware impact on Macs from 2018+.",
    "intune.baseline.macosCompliance.prerequisites":
      "Intune P1 licence. Macs enrolled via user-approved enrolment (UAMDM) or ABM. macOS Monterey 12+ supports all settings; Ventura 13 is the minimum for full compliance-evaluation parity.",
    "intune.baseline.macosCompliance.rollout":
      "FileVault enablement is disruptive — schedule it with users rather than silent-pushing. Pilot IT + finance Macs first, then broaden.",

    "intune.baseline.iosMam.title": "iOS app protection (MAM)",
    "intune.baseline.iosMam.body":
      "Protects corporate data inside Outlook, Teams, Word, Excel, OneDrive, Edge, and other Microsoft apps on iOS — no device enrolment required. Blocks copy/paste from managed apps to personal apps, blocks Save-As to personal clouds, requires a 6-digit app PIN, wipes corporate data on jailbreak detection, forces a re-auth after 30 minutes offline, blocks printing, forces managed Edge for link handling.",
    "intune.baseline.iosMam.why":
      "MAM works on unenrolled and BYOD devices — the attack surface enrolment-based compliance policies miss. Copy/paste + Save-As block closes the typical accidental-exfil path; jailbreak wipe closes the malicious path. High-leverage control with no hardware or enrolment cost.",
    "intune.baseline.iosMam.impact":
      "Users see an app PIN on first launch of any corporate app. Copy from Outlook to WhatsApp fails silently. Save-As from Word to personal iCloud fails. Links from corporate apps open in Edge rather than Safari.",
    "intune.baseline.iosMam.prerequisites":
      "Intune P1 licence per user. Users signed into the Microsoft apps with their work account.",
    "intune.baseline.iosMam.rollout":
      "Safe to enforce broadly — no device-level changes, no hardware dependency. Communicate the PIN expectation before assigning.",

    "intune.baseline.androidMam.title": "Android app protection (MAM)",
    "intune.baseline.androidMam.body":
      "Parallel to iOS MAM, for Android corporate apps — no enrolment required. Copy/paste + Save-As block, 6-digit PIN, root wipe, 30-minute offline re-auth, printing blocked, screen capture blocked, managed Edge for links.",
    "intune.baseline.androidMam.why":
      "Same as iOS MAM but Android often has larger BYOD surface — MAM fills that gap without requiring fully-managed enrolment. Screen-capture block is an Android-specific mitigation against screenshot-based exfil.",
    "intune.baseline.androidMam.impact":
      "Same as iOS MAM plus: users can't screenshot corporate apps. The managed-browser requirement means Chrome opens non-work links (where configured).",
    "intune.baseline.androidMam.prerequisites":
      "Intune P1 licence. Corporate apps signed in with work account. Google Play Services available (non-GMS Android devices don't support MAM).",
    "intune.baseline.androidMam.rollout":
      "Same as iOS MAM — safe to enforce broadly.",

    "intune.baseline.windowsBitlocker.title": "Windows BitLocker enforcement",
    "intune.baseline.windowsBitlocker.body":
      "Endpoint Protection configuration profile that turns on BitLocker with XTS-AES 256-bit encryption on the OS drive + fixed data drives, requires TPM-backed startup auth (no PIN), backs up recovery keys to Entra, and blocks write access to unencrypted removable drives.",
    "intune.baseline.windowsBitlocker.why":
      "The Windows compliance baseline CHECKS for BitLocker; this profile ENFORCES it. Ship them together: compliance reports non-compliant devices, this profile brings them into compliance by actively enabling encryption. Entra recovery-key escrow means a forgotten PIN never bricks the device.",
    "intune.baseline.windowsBitlocker.impact":
      "Devices without BitLocker start encrypting silently in the background (~30 min to 2h depending on drive size + usage). No user-visible change once encryption completes, except on removable drives — writing to an unencrypted USB stick is blocked.",
    "intune.baseline.windowsBitlocker.prerequisites":
      "Intune P1. TPM 1.2+ present. Windows Pro / Enterprise / Education (BitLocker isn't on Home). Entra Join or Hybrid Join (for key escrow).",
    "intune.baseline.windowsBitlocker.rollout":
      "Test on an IT pilot machine first — validate the recovery-key escrow path works by deliberately triggering recovery. Then assign to IT fleet, then to general population. The removable-drive write block causes the most user friction; communicate before assigning.",

    // ---- Phase 14 ASR rules ----
    "intune.baseline.asrOfficeChildProcesses.title":
      "ASR — block Office child processes (audit)",
    "intune.baseline.asrOfficeChildProcesses.body":
      "Block Office (Word/Excel/PowerPoint/Outlook) from creating child processes. Stops macro-driven cmd.exe / powershell.exe spawning — top initial-access vector across phishing campaigns. Ships in audit mode; flip to Block once you've reviewed Defender telemetry.",
    "intune.baseline.asrOfficeChildProcesses.why":
      "Office macro execution chains overwhelmingly start with `winword.exe → cmd.exe`, `excel.exe → powershell.exe`, etc. CISA + Microsoft recommend this rule as the single highest-ROI ASR control.",
    "intune.baseline.asrOfficeChildProcesses.impact":
      "Audit mode: Defender logs every block-worthy event but doesn't intervene. Move to Block: legitimate macros that spawn external processes (rare, usually engineering tooling) need to be exempted via Defender ASR exclusions before flipping.",
    "intune.baseline.asrOfficeChildProcesses.prerequisites":
      "Defender for Endpoint P1 or P2. Devices onboarded to Defender. Audit telemetry visible in Defender XDR portal.",
    "intune.baseline.asrOfficeChildProcesses.rollout":
      "Audit mode 14 days. Review Defender → Reports → Attack surface reduction → Audit events. Whitelist any legitimate macro chains. Flip to Block.",

    "intune.baseline.asrExecutableContentEmail.title":
      "ASR — block executable content from email (audit)",
    "intune.baseline.asrExecutableContentEmail.body":
      "Block executable content (.exe / .scr / .ps1 / .vbs / .js) launched from email and webmail attachments. Ships in audit mode.",
    "intune.baseline.asrExecutableContentEmail.why":
      "Email is the #1 malware delivery vector. Even with Defender for Office filtering, occasional executables slip through; this rule provides the endpoint-side safety net.",
    "intune.baseline.asrExecutableContentEmail.impact":
      "Audit mode: logs only. Block: users opening legitimate .exe attachments (rare in modern enterprise) get blocked. Communicate before flipping.",
    "intune.baseline.asrExecutableContentEmail.prerequisites":
      "Defender for Endpoint. Devices onboarded.",
    "intune.baseline.asrExecutableContentEmail.rollout":
      "Audit mode → review for legitimate exceptions → flip to Block.",

    "intune.baseline.asrCredentialTheft.title":
      "ASR — block credential theft from LSASS (audit)",
    "intune.baseline.asrCredentialTheft.body":
      "Block credential stealing from the Windows Local Security Authority Subsystem Service (LSASS). Stops Mimikatz-class tools from reading hashed credentials out of lsass.exe memory. Ships in audit mode.",
    "intune.baseline.asrCredentialTheft.why":
      "Credential dumping from LSASS is the canonical post-exploitation step in lateral movement. Mimikatz and its derivatives still work on unpatched / unprotected hosts.",
    "intune.baseline.asrCredentialTheft.impact":
      "Audit mode: visibility into any process touching LSASS. Block: legitimate credential-related tooling (most rare, but present in some IT scenarios — backup agents, password managers) needs exemption first.",
    "intune.baseline.asrCredentialTheft.prerequisites":
      "Defender for Endpoint. LSA Protection (Credential Guard) ideally also on for defence-in-depth.",
    "intune.baseline.asrCredentialTheft.rollout":
      "Audit 30 days — LSASS reads are rarer + slower to surface. Review thoroughly. Then Block.",

    "intune.baseline.asrJsVbsLaunchExe.title":
      "ASR — block JS/VBS launching downloaded executables (audit)",
    "intune.baseline.asrJsVbsLaunchExe.body":
      "Block JavaScript or VBScript from launching executable content downloaded by them. Closes the 'phishing → JS dropper → ransomware' chain. Ships in audit mode.",
    "intune.baseline.asrJsVbsLaunchExe.why":
      "JavaScript droppers (`.js` files masquerading as documents) are a recurring initial-access tactic. Native Windows Script Host runs these by default; this rule disables the second-stage execution.",
    "intune.baseline.asrJsVbsLaunchExe.impact":
      "Audit mode: log only. Block: legacy line-of-business apps that legitimately use WSH to install update components may break — exempt via Defender.",
    "intune.baseline.asrJsVbsLaunchExe.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrJsVbsLaunchExe.rollout":
      "Audit 14 days, review, exempt legitimate cases, Block.",

    "intune.baseline.asrPsExecWmi.title":
      "ASR — block PSExec + WMI process creations (audit)",
    "intune.baseline.asrPsExecWmi.body":
      "Block process creations originating from PSExec and WMI commands. Stops common lateral-movement tradecraft. Ships in audit mode.",
    "intune.baseline.asrPsExecWmi.why":
      "Both PSExec and WMI are well-documented red-team and ransomware lateral-movement tools. Many enterprises don't legitimately use these on endpoints — auditing first reveals real usage before blocking.",
    "intune.baseline.asrPsExecWmi.impact":
      "Audit mode: see who's using PSExec or WMI command-execution legitimately. Common false positives: SCCM client-side actions, some monitoring agents. Exempt before Block.",
    "intune.baseline.asrPsExecWmi.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrPsExecWmi.rollout":
      "Audit 21 days (longer, because legitimate usage is sporadic). Review thoroughly. Block.",

    "intune.baseline.asrUntrustedUsb.title":
      "ASR — block untrusted/unsigned USB processes (audit)",
    "intune.baseline.asrUntrustedUsb.body":
      "Block untrusted and unsigned processes that run from USB drives. Stops the 'plug in a malicious USB' attack chain. Ships in audit mode.",
    "intune.baseline.asrUntrustedUsb.why":
      "USB-borne malware is rare but high-impact. Defender ASR's signed-binary check is fast + low-false-positive.",
    "intune.baseline.asrUntrustedUsb.impact":
      "Audit mode: see USB executable activity. Block: legitimate signed installers from USB still work. Unsigned binaries (some custom IT tooling) need exemption.",
    "intune.baseline.asrUntrustedUsb.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrUntrustedUsb.rollout":
      "Audit 14 days, exempt edge cases, Block.",

    // ---- Phase 11a SharePoint tenant external-sharing ----
    "sharepoint.title": "SharePoint tenant external-sharing defaults",
    "sharepoint.subtitle":
      "Tenant-level SharePoint settings controlling how users share files externally. PATCHes the singleton `/admin/sharepoint/settings`. No rollback button — settings are mutated in place; the audit log captures the before/after diff for manual revert.",
    "sharepoint.licenseNote":
      "All baselines target settings that exist in every SharePoint Online tenant — no extra licence required.",
    "sharepoint.singletonNote":
      "Heads-up: SharePoint settings are a singleton per tenant, not a separate policy. Pushing a baseline mutates the entity's tenant settings directly. There's no rollback button — the audit log records the before/after; revert manually in the entity's SharePoint admin centre.",
    "sharepoint.effect": "Effect",
    "sharepoint.pushCta": "Push to entities",

    "sharepoint.baseline.strictExternalSharing.title":
      "Strict external sharing — guests only, no anonymous links",
    "sharepoint.baseline.strictExternalSharing.body":
      "Cap external sharing at 'authenticated guests only' — no anonymous 'anyone with the link' URLs. Anonymous link expiry hard-set to 30 days as a safety net even when this baseline is later relaxed.",
    "sharepoint.baseline.strictExternalSharing.why":
      "Anonymous links are the #1 accidental data leak vector in SharePoint. Forcing authenticated guests means every external recipient is logged + tied to a real identity.",
    "sharepoint.baseline.strictExternalSharing.impact":
      "Existing 'anyone with the link' URLs stop working. Users sharing externally will see a sign-in screen for the recipient. Communicate the change widely before pushing.",
    "sharepoint.baseline.strictExternalSharing.prerequisites":
      "SharePoint Online active. Plan for any active 'anyone' links in current sites.",
    "sharepoint.baseline.strictExternalSharing.rollout":
      "Run an audit query first (`/security/auditLog/queries`) for AnonymousLink usage in the last 30 days. Communicate to active users. Push.",

    "sharepoint.baseline.defaultLinkInternal.title":
      "Default link type 'Internal' + 'View'",
    "sharepoint.baseline.defaultLinkInternal.body":
      "First-click default for sharing is 'Internal' (people in this org) with 'View' permission. Users can still pick external + edit deliberately, but the safe default is internal-view-only.",
    "sharepoint.baseline.defaultLinkInternal.why":
      "Most 'oops shared externally' incidents are first-click defaults. Internal+View as the default removes the most common foot-gun.",
    "sharepoint.baseline.defaultLinkInternal.impact":
      "Users see 'Internal' selected on every share dialog. They can still change it. Minor friction for users who routinely share externally; meaningful safety lift for everyone else.",
    "sharepoint.baseline.defaultLinkInternal.prerequisites":
      "SharePoint Online active.",
    "sharepoint.baseline.defaultLinkInternal.rollout":
      "Safe to push directly. Communicate to power users who share externally so they know to change the default per-share.",

    "sharepoint.baseline.domainAllowList.title":
      "Domain allow-list for guest sharing (placeholder)",
    "sharepoint.baseline.domainAllowList.body":
      "Switch sharing-domain mode to allow-list. SHIPS WITH AN EMPTY LIST — operator must add the entity's known partner domains via the SharePoint admin centre or a follow-up Mizan action before pushing this baseline broadly.",
    "sharepoint.baseline.domainAllowList.why":
      "Once you know an entity collaborates with N specific external partners, an allow-list cuts off every other external domain — including phishing-impersonator domains.",
    "sharepoint.baseline.domainAllowList.impact":
      "Sharing to any domain not on the list fails. With an empty list, ALL external sharing fails. Configure the list before pushing or it'll be a hard kill.",
    "sharepoint.baseline.domainAllowList.prerequisites":
      "Inventory of legitimate partner domains the entity collaborates with. Edit the list before pushing.",
    "sharepoint.baseline.domainAllowList.rollout":
      "Push only after the partner-domain list is complete. Otherwise this is a self-DoS.",

    "sharepoint.baseline.anonymousLinksOff.title":
      "Disable anonymous links entirely",
    "sharepoint.baseline.anonymousLinksOff.body":
      "Hardest-stance external sharing: only existing external users who've already authenticated to the tenant can be shared with. No new external sharing, no anonymous links.",
    "sharepoint.baseline.anonymousLinksOff.why":
      "For high-sensitivity entities (defence, judicial, intelligence), the only acceptable default. No accidental leak path.",
    "sharepoint.baseline.anonymousLinksOff.impact":
      "Net new external collaboration via SharePoint stops. Existing external collaborators continue to work. Net new external collaboration must go through admin-mediated B2B invite first.",
    "sharepoint.baseline.anonymousLinksOff.prerequisites":
      "Operational maturity to handle B2B invite flow as the only external-collab path.",
    "sharepoint.baseline.anonymousLinksOff.rollout":
      "Coordinate widely before pushing. This is a strict baseline; only suitable for the right entity profile.",

    // ---- Phase 14b IOC push ----
    "ioc.title": "Threat Intelligence — IOC push",
    "ioc.subtitle":
      "Push file-hash / URL / domain / IP indicators to the entity's Defender for Endpoint as block lists. Each IOC has its own expiration; pushes are idempotent (Mizan tag in the description); rollback DELETEs the indicator from each tenant.",
    "ioc.licenseNote":
      "Requires Defender for Endpoint at each target entity. Indicators that already exist in the tenant (matched by Mizan tag) are no-ops.",
    "ioc.formTitle": "Add a new indicator",
    "ioc.field.type": "Indicator type",
    "ioc.field.value": "Indicator value",
    "ioc.field.action": "Action on match",
    "ioc.field.severity": "Severity",
    "ioc.field.description": "Description (visible in Defender)",
    "ioc.field.internalNote": "Internal note (Mizan-only)",
    "ioc.field.expirationDateTime": "Expires (default: 90 days)",
    "ioc.field.targetTenants": "Push to entities",
    "ioc.action.allow": "Allow (whitelist)",
    "ioc.action.alert": "Alert only",
    "ioc.action.alertAndBlock": "Alert + Block (recommended)",
    "ioc.action.block": "Block silently",
    "ioc.severity.informational": "Informational",
    "ioc.severity.low": "Low",
    "ioc.severity.medium": "Medium",
    "ioc.severity.high": "High",
    "ioc.type.fileHashSha256": "File hash (SHA-256)",
    "ioc.type.fileHashSha1": "File hash (SHA-1)",
    "ioc.type.url": "URL",
    "ioc.type.domainName": "Domain",
    "ioc.type.ipv4": "IPv4 address",
    "ioc.type.ipv6": "IPv6 address",
    "ioc.submit": "Push to {count} entity(ies)",
    "ioc.recentTitle": "Recent IOCs",
    "ioc.recentEmpty": "No IOCs pushed yet.",
    "ioc.col.value": "Value",
    "ioc.col.action": "Action",
    "ioc.col.severity": "Severity",
    "ioc.col.expires": "Expires",
    "ioc.col.created": "Pushed",
    "ioc.descriptionHint":
      "Free-text description; Mizan auto-prefixes with `[Mizan IOC <id>]` so we can find it for rollback.",

    // ---- Phase 6 DLP (coming soon — waiting on Microsoft Graph) ----
    "dlp.title": "Data Loss Prevention baselines",
    "dlp.subtitle":
      "Curated DLP policy catalog. Push unlocks the day Microsoft exposes the full DLP authoring API on Graph — today's beta endpoints cover a small subset only. The catalog below is ready: review it with your entities so they see the direction ahead of time.",
    "dlp.previewBanner.title": "Coming soon",
    "dlp.previewBanner.body":
      "Microsoft Graph doesn't yet expose the full DLP authoring API (rule exceptions, user notifications, incident reports, endpoint DLP, most condition types are missing from public preview). When Microsoft closes that gap, every card here unlocks automatically — no redeploy needed, just a catalog refresh.",
    "dlp.surface": "Surface",
    "dlp.baseline.blockSensitiveExternal.title":
      "Block external sharing of sensitive data",
    "dlp.baseline.blockSensitiveExternal.body":
      "Across Exchange, SharePoint, OneDrive, and Teams, block external send/share of content matching the built-in sensitive-info types (credit cards, ID numbers, financial data, health records). Allow with business justification for select exceptions.",
    "dlp.baseline.blockCredentialExfil.title":
      "Block credential exfiltration",
    "dlp.baseline.blockCredentialExfil.body":
      "Detect secret patterns — Azure Service Principal keys, AWS access keys, GitHub PATs, PEM private keys — in outbound email and chat. Block transmission, alert admin. Highest-signal DLP rule in most tenants.",
    "dlp.baseline.blockBulkExfil.title":
      "Flag bulk data transfer",
    "dlp.baseline.blockBulkExfil.body":
      "Warn the user and notify admin when a single action moves >100 files or >500 MB to external cloud or personal storage. Behavioural signal — catches departing-employee exfil.",
    "dlp.baseline.regulatedDataLabels.title":
      "Block external share of labelled data",
    "dlp.baseline.regulatedDataLabels.body":
      "Block external sharing of anything labelled Confidential or Highly Confidential by the Phase 7 sensitivity-label hierarchy. Simplest and strongest DLP rule, but depends on labels being in place first.",

    // ---- Phase 7 Sensitivity Labels (coming soon — waiting on Microsoft Graph) ----
    "labels.title": "Sensitivity labels",
    "labels.subtitle":
      "Curated label hierarchy + auto-labeling catalog. Push unlocks when Microsoft exposes the full label authoring API on Graph — today's beta endpoints create bare labels but can't configure encryption, content marking, publishing, or auto-labeling rules. The catalog below is ready for review.",
    "labels.previewBanner.title": "Coming soon",
    "labels.previewBanner.body":
      "Microsoft Graph creates basic labels today but can't yet configure the settings that matter in practice — encryption, content marking, protection, label publishing policies, auto-labeling rules. When Microsoft exposes those on Graph, every card here unlocks automatically.",
    "labels.baseline.hierarchy4.title":
      "4-level label hierarchy",
    "labels.baseline.hierarchy4.body":
      "Create Public / Internal / Confidential / Highly Confidential labels. Baseline user-visible structure every entity uses identically. Encryption and content-marking settings (required in practice) need the PS tier.",
    "labels.baseline.autoLabelInternal.title":
      "Auto-label internal email",
    "labels.baseline.autoLabelInternal.body":
      "Every outbound email from an internal user to an internal recipient is auto-labelled 'Internal'. Removes the 'no label at all' baseline that makes every downstream DLP rule weaker.",
    "labels.baseline.autoLabelSensitive.title":
      "Auto-label sensitive content",
    "labels.baseline.autoLabelSensitive.body":
      "Content matching built-in sensitive-info types is auto-labelled Confidential or Highly Confidential based on severity. Bridges the gap between DLP detection and label-based enforcement.",

    // ---- Phase 9 Attack Simulation Training (coming soon) ----
    "attackSim.title": "Attack simulation training",
    "attackSim.subtitle":
      "Curated phishing-simulation + awareness-training schedule. Push unlocks when Microsoft GAs the simulation create + automation API on Graph — read-side is already wired.",
    "attackSim.previewBanner.title": "Coming soon",
    "attackSim.previewBanner.body":
      "Microsoft Graph exposes Attack Simulation reads but the create + schedule surface is in beta only. When Microsoft GAs the simulation create + automation API, every card here unlocks automatically.",
    "attackSim.baseline.quarterlyPhishing.title":
      "Quarterly phishing simulation",
    "attackSim.baseline.quarterlyPhishing.body":
      "Schedule a phishing simulation against all licensed users every 90 days. Microsoft's curated payload library; randomise across credential-harvest, link-in-attachment, and malware-attachment patterns. Click rate trends per entity over time.",
    "attackSim.baseline.newHireTraining.title":
      "Auto-enroll new hires in training",
    "attackSim.baseline.newHireTraining.body":
      "Every newly licensed user is auto-enrolled in Microsoft's phishing-awareness training course within 30 days of license assignment. No manual provisioning. Closes the 'new joiner is the easiest target' gap.",
    "attackSim.baseline.repeatOffender.title":
      "Repeat-offender retraining",
    "attackSim.baseline.repeatOffender.body":
      "Users who clicked or supplied credentials in the last simulation get a follow-up training within 7 days. Compounds across simulations — third-time offenders trigger a manager notification.",

    // ---- Phase 12 PIM + Identity Governance (coming soon) ----
    "pim.title": "PIM + identity governance",
    "pim.subtitle":
      "Privileged Identity Management activation policies + access reviews + Terms of Use. Most write paths land on Graph today; held coming-soon until the cross-tenant CRUD contract is stable.",
    "pim.previewBanner.title": "Coming soon",
    "pim.previewBanner.body":
      "PIM + Identity Governance writes mostly land on Graph today, but role-management policy settings + entitlement-management catalogs have rough edges in cross-tenant CRUD. The catalog below ships now; full Phase 12 implementation lands once the contract is reliable across tenants.",
    "pim.baseline.mfaOnActivation.title":
      "MFA required on PIM activation",
    "pim.baseline.mfaOnActivation.body":
      "Every privileged role activation requires MFA at the moment of activation, even if the admin's session is already MFA'd. The single most-cited PIM control in audits.",
    "pim.baseline.maxActivation8h.title":
      "Cap activation at 8 hours",
    "pim.baseline.maxActivation8h.body":
      "Maximum activation duration capped at 8 hours; auto-expires. Admins can request shorter (e.g. 1h for a specific change) but never longer. Reduces the 'forgot to deactivate over the weekend' lateral-move surface.",
    "pim.baseline.justificationRequired.title":
      "Justification required on activation",
    "pim.baseline.justificationRequired.body":
      "Activation requires a free-text justification of at least 20 characters. Stored on the role-assignment-schedule audit row, surfaced in Mizan's audit log next to the activation event.",
    "pim.baseline.notificationOnActivation.title":
      "Notify on activation",
    "pim.baseline.notificationOnActivation.body":
      "Security team email + admin's manager notified on every privileged role activation. Catches the rogue-admin scenario early; pairs with the audit log for forensic context.",
    "pim.baseline.quarterlyAccessReview.title":
      "Quarterly privileged-role access review",
    "pim.baseline.quarterlyAccessReview.body":
      "Quarterly access review of every privileged role assignment (eligible + active). Reviewers = role's manager chain. Auto-removal of un-reviewed assignments at deadline closes the 'forgot they had Global Admin from a project two years ago' gap.",

    // ---- Phase 13 App Consent (coming soon) ----
    "appConsent.title": "App consent policies",
    "appConsent.subtitle":
      "OAuth consent guardrails. Restrict which third-party apps users can consent to without admin approval. Closes the OAuth consent phishing surface.",
    "appConsent.previewBanner.title": "Coming soon",
    "appConsent.previewBanner.body":
      "App consent + admin consent workflow are on Graph today (`/policies/adminConsentRequestPolicy`, `/policies/permissionGrantPolicies`). Verified-publisher allowlists + pre-approved permission sets vary tenant-to-tenant. Coming-soon catalog now; real Phase 13 implementation lands next.",
    "appConsent.baseline.verifiedOnly.title":
      "Restrict consent to verified publishers",
    "appConsent.baseline.verifiedOnly.body":
      "Users can only consent to apps from Microsoft-verified publishers. Unverified third-party apps require admin approval. Closes the OAuth consent phishing surface — one of the top current attack vectors.",
    "appConsent.baseline.adminWorkflow.title":
      "Enable admin consent request workflow",
    "appConsent.baseline.adminWorkflow.body":
      "When users hit a blocked app, they can submit an admin consent request via the Microsoft 365 portal. Designated reviewers (Cloud Application Administrators) approve or reject in the Entra admin center. Removes the 'just disable it for everyone' tax.",
    "appConsent.baseline.blockHighRisk.title":
      "Always require admin approval for high-risk permissions",
    "appConsent.baseline.blockHighRisk.body":
      "Block user consent to apps requesting high-risk permissions: Mail.ReadWrite, Files.ReadWrite.All, Sites.FullControl.All, Application.ReadWrite.All, Directory.ReadWrite.All. These permissions enable the most common consent-phishing exfiltration paths.",
    "appConsent.baseline.preapproveLowRisk.title":
      "Pre-approve low-risk permissions",
    "appConsent.baseline.preapproveLowRisk.body":
      "Pre-approve user consent for the low-risk permission set (User.Read, openid, profile, email, offline_access). Preserves frictionless sign-in for legitimate apps; reduces noise in the admin-consent inbox.",

    // ---- Phase 15 Tenant Identity Defaults (coming soon) ----
    "tenantIdentity.title": "Tenant-wide identity defaults",
    "tenantIdentity.subtitle":
      "Authentication-methods policy, default user permissions, cross-tenant access trust. Completes the identity hardening story alongside Conditional Access.",
    "tenantIdentity.previewBanner.title": "Coming soon",
    "tenantIdentity.previewBanner.body":
      "Tenant-wide identity defaults live on `/authenticationMethodsPolicy`, `/authorizationPolicy`, and the cross-tenant access settings endpoints. Schemas have been moving (FIDO2 → passkey rename, B2B trust model rev). Coming-soon catalog now; real Phase 15 implementation lands once the schemas settle.",
    "tenantIdentity.baseline.fido2TenantWide.title":
      "FIDO2 / passkey enabled tenant-wide",
    "tenantIdentity.baseline.fido2TenantWide.body":
      "Tenant-wide allow + recommend FIDO2 / passkey for every user. Pairs with the Phase 3 phishing-resistant MFA admin baseline by ensuring users CAN enroll a key in the first place. Without this, the admin policy fails on registration day.",
    "tenantIdentity.baseline.blockUserAppRegistration.title":
      "Only admins register apps",
    "tenantIdentity.baseline.blockUserAppRegistration.body":
      "Only Application Administrators (and equivalents) can register Entra apps. Default user permission `allowedToCreateApps: false`. Removes the 'rogue user creates app, consents itself, exfils data' attack chain.",
    "tenantIdentity.baseline.blockUserTenantCreation.title":
      "Only admins create tenants",
    "tenantIdentity.baseline.blockUserTenantCreation.body":
      "Block ordinary users from spinning up new Entra tenants under your subscription. Default user permission `allowedToCreateTenants: false`. Closes a quirky exfil path where users move data to a new tenant they control.",
    "tenantIdentity.baseline.restrictDefaultUserPerms.title":
      "Lock down default user permissions",
    "tenantIdentity.baseline.restrictDefaultUserPerms.body":
      "Default user role can no longer read all directory objects, create Microsoft 365 groups, or invite guests. Guest invites delegated to a Guest Inviter role. Tightens the 'reconnaissance from a low-priv account' gap.",
    "tenantIdentity.baseline.crossTenantTrustMfa.title":
      "Trust partner-tenant MFA + compliance",
    "tenantIdentity.baseline.crossTenantTrustMfa.body":
      "Trust inbound MFA + compliant-device claims from explicitly-listed partner tenants (B2B collaboration). Avoids re-MFA prompts on legitimate B2B collaboration without lowering the bar for unknown tenants.",
    "tenantIdentity.baseline.blockPersonalLinking.title":
      "Block personal-account linking",
    "tenantIdentity.baseline.blockPersonalLinking.body":
      "Disable LinkedIn account connections + similar personal-account linking. Removes the 'add my personal LinkedIn to my work identity' surface that has been used for credential-correlation phishing.",

    "baseline.prohibitAdminDeactivation.title":
      "Prohibit admin-account deactivation",
    "baseline.prohibitAdminDeactivation.body":
      "Force any admin who reaches the Microsoft Entra / Azure / M365 admin portals to satisfy MFA + a compliant device + a fresh sign-in within the last hour. Conditional Access can't intercept the specific Disable-account API call, but it can make every privileged management surface high-friction; combined with Mizan's audit-log detection (Entity → Identity), unauthorized deactivations are now visible AND friction-bound.",
    "baseline.prohibitAdminDeactivation.why":
      "Deactivating an admin account is a textbook persistence-removal step in cross-tenant attacks. Forcing fresh MFA from a managed device dramatically raises the bar on this single mutation surface.",
    "baseline.prohibitAdminDeactivation.impact":
      "Privileged admins must reauthenticate with MFA + compliant device every hour when working in admin portals. Existing sessions stay alive within the hour. No impact on read-only operations or non-admin users.",
    "baseline.prohibitAdminDeactivation.prerequisites":
      "Tenant needs Entra ID P1 (or higher) + at least one Intune compliance policy so the compliant-device condition has a population to match against. The current entity admin is auto-excluded so the operator can never lock themselves out.",
    "baseline.prohibitAdminDeactivation.rollout":
      "Ship in report-only first (default). Watch the sign-in logs for one full week to surface admins who'd be challenged at unfortunate times (CI service principals, vendor support windows). Add named exclusions, then enable enforcement.",

    "baseline.requireMfaForAdmins.title": "Require MFA for admin roles",
    "baseline.requireMfaForAdmins.body":
      "Every privileged directory role (Global Admin, Security Admin, Exchange / SharePoint / User / App / Cloud App / Authentication / Helpdesk / Intune / Billing / Privileged Role / Conditional Access Administrator) must satisfy multi-factor authentication. Report-only by default.",
    "baseline.requireMfaForAdmins.why":
      "Admin accounts are the highest-value target in any tenant. A compromised Global Admin can exfiltrate mail, rotate secrets, add backdoors, and disable audit. MFA on admin roles is Microsoft's single most-recommended control and maps to CIS 5.1, NIST 800-63 AAL2, and NESA UAE-IAM-5.",
    "baseline.requireMfaForAdmins.impact":
      "Every user assigned to one of the 13 privileged roles will be prompted for a second factor on every new sign-in that doesn't already satisfy MFA. Existing sessions are not invalidated. Break-glass / emergency-access accounts should be excluded at the tenant level before enforcing.",
    "baseline.requireMfaForAdmins.prerequisites":
      "Entra ID P1 or higher on every targeted admin. At least one MFA method registered per admin (Authenticator app, FIDO2 key, or phone). A documented break-glass account that stays excluded from this policy.",
    "baseline.requireMfaForAdmins.rollout":
      "Ship in report-only for 7–14 days. Review the sign-in logs under Monitoring → Sign-ins filtered to Conditional Access → Report-only: Success. Confirm every admin has registered MFA. Then flip to enabled.",
    "baseline.blockLegacyAuth.title": "Block legacy authentication",
    "baseline.blockLegacyAuth.body":
      "Block sign-ins using legacy auth protocols (IMAP, POP, SMTP basic, Exchange ActiveSync basic, other clients). Modern auth not affected. Report-only by default; Global Admins auto-excluded so a misconfigured legacy-auth client on an admin's device cannot cause a lockout.",
    "baseline.blockLegacyAuth.why":
      "Legacy auth protocols do not support MFA, so every other MFA policy is bypassable while they remain open. Microsoft Threat Intelligence attributes >99% of password-spray success to legacy auth. Disabling it is the single highest-ROI change in Entra.",
    "baseline.blockLegacyAuth.impact":
      "Any client still authenticating with basic auth (old Outlook, scan-to-email devices, scripts, line-of-business apps using SMTP AUTH / IMAP / POP) will fail to sign in. Users on modern Outlook, Teams, OWA, and mobile Outlook are unaffected.",
    "baseline.blockLegacyAuth.prerequisites":
      "Inventory of any service accounts / MFPs / line-of-business apps using SMTP AUTH, IMAP, or POP. Plan to migrate them to Graph or OAuth 2.0 before enforcing.",
    "baseline.blockLegacyAuth.rollout":
      "Report-only for 14–30 days. Filter Sign-in logs by Client app = 'Other clients' / 'IMAP' / 'POP' / 'SMTP' — each result is a legacy-auth attempt that will be blocked once enforced. Remediate each before flipping to enabled.",
    "baseline.requireCompliantDevice.title": "Require compliant device for Office 365",
    "baseline.requireCompliantDevice.body":
      "Office 365 apps (Exchange Online, SharePoint, Teams, Office web/desktop) require either an Intune-compliant device OR a Microsoft Entra hybrid-joined device. Blocks data exfiltration to personal / unmanaged endpoints. Report-only by default; Global Admins auto-excluded.",
    "baseline.requireCompliantDevice.why":
      "A valid credential + unmanaged device is the canonical supply-chain / BYOD compromise path: attacker extracts a refresh token on a personal laptop and uses it to drain mailboxes. Tying access to device posture makes the credential alone insufficient.",
    "baseline.requireCompliantDevice.impact":
      "Users on personal or BYOD devices lose access to Exchange / SharePoint / Teams until the device is enrolled in Intune (and passes compliance) or hybrid-joined. Managed corporate endpoints are unaffected.",
    "baseline.requireCompliantDevice.prerequisites":
      "Intune tenant with compliance policies defined, OR AD/Entra hybrid-join configured. Users must be licensed for Intune. A communication plan for BYOD users who will need to enroll.",
    "baseline.requireCompliantDevice.rollout":
      "Start report-only. Review the 'Not compliant' bucket in Intune device compliance — enroll or remediate each. Run a 7-day soak. Then flip to enabled, ideally outside business hours.",

    "baseline.requireMfaAllUsers.title": "Require MFA for all users",
    "baseline.requireMfaAllUsers.body":
      "Every user in the tenant must satisfy MFA on sign-in to any cloud app. Global Administrators are excluded at the policy level to keep a recoverable path into the tenant. Report-only by default.",
    "baseline.requireMfaAllUsers.why":
      "Password-only authentication is bypassed by 99% of automated attacks according to Microsoft's Digital Defense Report. Tenant-wide MFA closes the most common intrusion path and is a CIS Level 1 / NESA core control.",
    "baseline.requireMfaAllUsers.impact":
      "Every user will be prompted for MFA on new sign-ins that don't already satisfy it (roughly every 90 days per device by default). Users without a registered MFA method will be sent through combined registration on their next sign-in.",
    "baseline.requireMfaAllUsers.prerequisites":
      "Entra ID P1 tenant-wide. Combined registration enabled. A plan for users without mobile phones (FIDO2 keys / Windows Hello as alternatives).",
    "baseline.requireMfaAllUsers.rollout":
      "Report-only for at least 14 days while driving MFA registration. Watch Sign-in logs → Conditional Access → Report-only Failure for users who would have been blocked. Remediate registration, then enforce.",

    "baseline.blockHighSignInRisk.title": "Block high sign-in risk",
    "baseline.blockHighSignInRisk.body":
      "Entra Identity Protection calculates a per-sign-in risk score based on anomalous location, impossible travel, leaked credentials, and token anomalies. This baseline blocks any sign-in classified 'high'. Report-only by default.",
    "baseline.blockHighSignInRisk.why":
      "A 'high' sign-in risk verdict from Identity Protection correlates with genuine compromise in >85% of cases (Microsoft internal telemetry). Blocking high-risk sign-ins stops an attack during the session rather than after.",
    "baseline.blockHighSignInRisk.impact":
      "Users flagged high-risk will be blocked and must contact the helpdesk to regain access. False-positive rate is low but non-zero on legitimate VPN usage or travel — a remediation playbook is required.",
    "baseline.blockHighSignInRisk.prerequisites":
      "Entra ID P2 (Identity Protection). A helpdesk runbook for user-reported lockouts. A named responder who can review Identity Protection alerts daily.",
    "baseline.blockHighSignInRisk.rollout":
      "Report-only for 14 days. Compare to Identity Protection → Risky sign-ins filtered by 'high'. Validate each was genuinely suspicious. Then enforce.",

    "baseline.requirePasswordChangeHighUserRisk.title":
      "Require password change on high user risk",
    "baseline.requirePasswordChangeHighUserRisk.body":
      "When Entra Identity Protection raises a user's risk to 'high' (typically from leaked-credentials feeds), the user is forced to change password AND re-satisfy MFA at next sign-in. Self-remediation cuts incident response time dramatically.",
    "baseline.requirePasswordChangeHighUserRisk.why":
      "High user risk almost always means the credential is circulating publicly (paste sites, breach dumps). Auto-forcing a password change closes the window without helpdesk involvement, while still requiring MFA so an attacker with the leaked password alone cannot rotate it.",
    "baseline.requirePasswordChangeHighUserRisk.impact":
      "Affected users see a self-service password reset prompt on next sign-in. They must complete SSPR + MFA to regain access. Existing sessions are not cut off but will be forced on re-auth.",
    "baseline.requirePasswordChangeHighUserRisk.prerequisites":
      "Entra ID P2 for every targeted user. Self-service password reset enabled. Users registered for SSPR (via combined registration).",
    "baseline.requirePasswordChangeHighUserRisk.rollout":
      "Report-only for 7 days to validate the SSPR registration rate. If low, drive registration first. Then enforce.",

    "baseline.phishingResistantMfaAdmins.title":
      "Phishing-resistant MFA for admin roles",
    "baseline.phishingResistantMfaAdmins.body":
      "Privileged roles must authenticate with phishing-resistant methods only — FIDO2 security keys, Windows Hello for Business, or certificate-based authentication. Standard Authenticator-app push and SMS are rejected.",
    "baseline.phishingResistantMfaAdmins.why":
      "Push-fatigue and real-time phishing proxies (Evilginx, EvilProxy) routinely bypass standard MFA. CISA and NSA guidance 2023+ explicitly require phishing-resistant methods for privileged accounts. This policy enforces that boundary.",
    "baseline.phishingResistantMfaAdmins.impact":
      "Admins without a FIDO2 key / Windows Hello / CBA enrolment lose access until they enrol. Standard Authenticator push or SMS will be rejected for the listed roles.",
    "baseline.phishingResistantMfaAdmins.prerequisites":
      "FIDO2 security keys procured and distributed, OR Windows Hello for Business rolled out, OR a CBA configuration. Entra Authentication methods policy must allow the chosen method.",
    "baseline.phishingResistantMfaAdmins.rollout":
      "Report-only while distributing keys. Track registration via Entra Authentication methods usage report. Flip to enabled only when every admin has a registered phishing-resistant method.",

    "baseline.requireMfaGuests.title":
      "Require MFA for guests and external users",
    "baseline.requireMfaGuests.body":
      "Every guest / external identity type (B2B collaboration guests, B2B members, B2B direct-connect users, service providers, internal guests, other external users) must satisfy MFA. Closes the most common supply-chain compromise path.",
    "baseline.requireMfaGuests.why":
      "Guest accounts are the #1 supply-chain intrusion vector in M365 — a compromised partner sign-in becomes a lateral move into your tenant. Forcing MFA on guests eliminates the 'trusted partner account → inside your tenant' path entirely.",
    "baseline.requireMfaGuests.impact":
      "Every external collaborator will be prompted for MFA on first sign-in to a resource in the tenant. If the guest's home tenant already enforces MFA and cross-tenant access settings trust inbound MFA, they may not be re-prompted.",
    "baseline.requireMfaGuests.prerequisites":
      "Entra External Identities configured. Cross-tenant access settings reviewed — decide whether to accept inbound MFA claims from partner tenants.",
    "baseline.requireMfaGuests.rollout":
      "Safe to enforce directly in most tenants — guests are comparatively low-volume and the policy is purely protective. If you have legacy partners without MFA, run report-only first and surface them through Sign-in logs.",

    "baseline.adminSignInFrequency4h.title":
      "4-hour sign-in frequency for admins",
    "baseline.adminSignInFrequency4h.body":
      "Admin sessions force re-authentication every 4 hours. Without this policy, a session token issued to an admin is valid for up to 90 days — a stolen token would give an attacker that full window.",
    "baseline.adminSignInFrequency4h.why":
      "Session token theft (via adversary-in-the-middle phishing, stealer malware, cookie theft) defeats MFA because the token already represents a completed MFA. Short sign-in frequency limits the time a stolen admin token stays useful.",
    "baseline.adminSignInFrequency4h.impact":
      "Admins re-authenticate (password + MFA) every 4 hours of active use. This is a session-control only — it does not change who can sign in, just how often they must prove it.",
    "baseline.adminSignInFrequency4h.prerequisites":
      "None beyond the baseline role assignments already in place. Admins must accept the reduced convenience.",
    "baseline.adminSignInFrequency4h.rollout":
      "Report-only for 3–5 days to confirm the interval matches admin workflow. Increase to 8h or 12h if 4h is disruptive. Enforce once admins have adapted.",

    "baseline.adminNoPersistentBrowser.title":
      "No persistent browser sessions for admins",
    "baseline.adminNoPersistentBrowser.body":
      "Disables 'Stay signed in?' for privileged accounts. An admin who closes their browser must sign in again to the next session, even on their primary device.",
    "baseline.adminNoPersistentBrowser.why":
      "Persistent browser cookies remain valid after the user walks away. On a shared workstation or lost laptop, that cookie is enough to enter the Entra admin center. Blocking persistence eliminates a cheap lateral-move path.",
    "baseline.adminNoPersistentBrowser.impact":
      "Admins see a fresh sign-in prompt every time they re-open a browser after a full close. Still benefits from SSO within the same session.",
    "baseline.adminNoPersistentBrowser.prerequisites":
      "None. This is a policy-only session control.",
    "baseline.adminNoPersistentBrowser.rollout":
      "Safe to enforce directly. The UX impact is mild and the security win is immediate.",

    "baseline.compliantDeviceAdminPortals.title":
      "Compliant device for admin portals",
    "baseline.compliantDeviceAdminPortals.body":
      "Access to Microsoft admin portals (Entra admin, Azure portal, Defender XDR, Intune, Exchange admin, SharePoint admin, M365 admin) requires a compliant or hybrid-joined device. Prevents admin tasks from a personal / unmanaged endpoint.",
    "baseline.compliantDeviceAdminPortals.why":
      "Even phishing-resistant MFA doesn't defend against session hijack from a malware-infected personal device. Binding admin portal access to device compliance raises the attack floor to 'compromise a managed device' — materially harder.",
    "baseline.compliantDeviceAdminPortals.impact":
      "Admins on personal / unmanaged devices cannot reach any Microsoft admin portal. Managed laptops, Windows 365 Cloud PCs, and hybrid-joined desktops are unaffected.",
    "baseline.compliantDeviceAdminPortals.prerequisites":
      "Intune compliance policies OR hybrid Entra join. Every admin issued a managed device or a Cloud PC.",
    "baseline.compliantDeviceAdminPortals.rollout":
      "Report-only for 7 days. Confirm every admin has a compliant device visible in Intune. Then enforce.",

    "baseline.requireMfaAzureManagement.title":
      "Require MFA for Azure management",
    "baseline.requireMfaAzureManagement.body":
      "MFA is required for every sign-in to the Azure control plane (Azure portal, Azure CLI, Azure PowerShell, ARM REST). The highest-blast-radius surface in the tenant. Report-only by default; Global Admins auto-excluded.",
    "baseline.requireMfaAzureManagement.why":
      "Anyone reaching ARM with a valid token can inventory, reconfigure, or destroy subscriptions wholesale. Protecting the control plane with MFA is Microsoft's reference Azure policy and a NIST 800-53 AC-2(12) / ISO 27001 A.9.4.2 equivalent.",
    "baseline.requireMfaAzureManagement.impact":
      "Azure portal / CLI / PowerShell / ARM sign-ins re-prompt for MFA. Service principals and managed identities are not affected (they sign in with certificates or secrets, not user credentials).",
    "baseline.requireMfaAzureManagement.prerequisites":
      "Entra ID P1. Service principals used in CI/CD should be reviewed and converted to federated credentials where possible.",
    "baseline.requireMfaAzureManagement.rollout":
      "Report-only for 7–14 days. Confirm CI/CD pipelines do not trip the policy (they shouldn't — they use app credentials). Then enforce.",

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
    "vuln.kpi.zeroDay": "Zero-day",
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
    "vuln.cols.fixPrefix": "Fix",
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
    "nav.menu.open": "Open menu",
    "nav.menu.close": "Close menu",
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
    "ds.compliance.detail": "{framework}",
    "ds.compliance.detail.generic": "no framework selected",
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
      "معايير {orgShort} المرجعية، المواءمة مع إطار {framework}، والبحث الموحد في السجلات عبر كل جهة موافِقة.",

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
    "wizard.step3.demoToggle.title": "تسجيل كجهة تجريبية / محاكاة",
    "wizard.step3.demoToggle.body":
      "متوقّف (افتراضيًا): ينشئ المعالج رابط موافقة Microsoft Entra حقيقيًا — على المسؤول العام للجهة تسجيل الدخول ومنح الموافقة كي تبدأ المزامنة. مُفعّل: تتم الموافقة تلقائيًا، تُعلَّم الجهة بـ is_demo=1، وتُحاكى كل عمليات الكتابة التوجيهية. لا تفعّل هذا إلا إذا كنت تريد المرور بالواجهة دون تطبيق Entra حقيقي.",
    "wizard.step3.demoToggle.statusReal": "جهة حقيقية — تتطلّب موافقة Entra",
    "wizard.step3.demoToggle.statusDemo": "جهة تجريبية — الموافقة محاكاة",
    "wizard.step3.demoToggle.realRequires.title":
      "تنبيه — يجب تهيئة بيانات اعتماد Entra",
    "wizard.step3.demoToggle.realRequires.body":
      "سينشئ المعالج رابط موافقة Microsoft حقيقيًا. لا يعمل هذا الرابط إلا إذا كانت بيانات تطبيق Entra الخاصة بجهة التشغيل مضبوطة من",
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
    "wizard.step4.demoBypass":
      "وضع العرض التجريبي — الموافقة محاكاة. تم تعليم الجهة الجديدة كجهة تجريبية والموافقة عليها تلقائياً؛ لم تُجرَ أي عملية تسجيل تطبيق Entra حقيقية. تابع إلى الخطوة الأخيرة.",
    "wizard.step4.demoBypass.title": "الموافقة محاكاة — هذه جهة تجريبية",
    "wizard.step4.demoBypass.body":
      "حدّدت خيار الجهة التجريبية في الخطوة السابقة، فتجاوز المعالج جولة موافقة Microsoft Entra ووسم الجهة بـ is_demo=1. ستعيد المزامنة إشارات مركّبة، وستُحاكى عمليات الكتابة التوجيهية. تحمل الجهة شارة DEMO في كل مكان تظهر فيه.",
    "wizard.step4.demoBypass.realInstead.title":
      "كنت تريد جهة حقيقية؟",
    "wizard.step4.demoBypass.realInstead.body":
      "ألغِ هذا المعالج، احذف السجل الجديد من الإعدادات → الجهات، ثم ابدأ من جديد مع إلغاء تحديد خيار الجهة التجريبية في الخطوة الثالثة.",
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
    "settings.field.nameEn.placeholder": "e.g. Ministry of Health",
    "settings.field.nameAr.placeholder": "مثال: وزارة الصحة",
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

    "settings.deleteEntity.title": "حذف {name}؟",
    "settings.deleteEntity.summary":
      "ستتم إزالة {name} من هذه اللوحة، بما يشمل سجل المزامنة وأي عمليات دفع توجيهية. هذا الإجراء نهائي.",
    "settings.deleteEntity.spWarning.heading":
      "يبقى الـ service principal في مستأجر الجهة",
    "settings.deleteEntity.spWarning.body":
      "حذف هذا السجل لا يُزيل الـ service principal الخاص بـ {name} من مستأجر Microsoft Entra لديهم. إذا أعدت تسجيلهم لاحقًا فسيُصدر رابط الموافقة الخطأ AADSTS650051 لأن الـ SP لا يزال موجودًا. لتفادي ذلك، احذف الـ service principal من Enterprise Applications لديهم أولاً — أو استخدم تدفق الإصلاح AADSTS650051 عند إعادة التسجيل (يمنح المسؤول الموافقة على الـ SP الحالي، ثم يضغط على «التحقق وإتمام الربط»).",
    "settings.deleteEntity.spWarning.openLink":
      "فتح Enterprise Apps في مستأجر الجهة",
    "settings.deleteEntity.alternative":
      "إذا كنتم تريدون فقط إيقاف المزامنة مؤقتًا، استخدموا «تعليق» بدلاً من ذلك — يحافظ على الموافقة قائمة وإعادة التفعيل لاحقًا تتم بضغطة واحدة.",
    "settings.deleteEntity.confirm": "حذف من Mizan",
    "common.cancel": "إلغاء",

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
    "settings.tab.nesa": "إطار الامتثال",
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
      "تحديث متاح — v{version}.",
    "settings.about.upgradeNow": "ترقية إلى v{version}",
    "settings.about.confirmUpgrade.title":
      "هل تريد ترقية Mizan إلى v{version}؟",
    "settings.about.confirmUpgrade.body":
      "ستُستبدل صورة الحاوية للتطبيق الجاري وتُفعَّل عملية تحديث متدرّج لمراجعة الـ Container App. تبقى اللوحة متاحة — يُشغّل Azure المراجعة الجديدة بجانب القديمة ويحوّل حركة المرور عند نجاح فحص الجاهزية (عادةً ١–٢ دقيقة). قد تحتاج إلى تحديث الصفحة بعد بدء المراجعة الجديدة.",
    "settings.about.confirmUpgrade.cancel": "إلغاء",
    "settings.about.confirmUpgrade.confirm": "ترقية الآن",
    "settings.about.upgradeRequested.title":
      "طُلبت الترقية — v{from} ← v{to}",
    "settings.about.upgradeRequested.body":
      "يقوم Azure Container Apps بسحب الصورة الجديدة وإطلاق مراجعة جديدة. أعِد تحميل الصفحة بعد ١–٢ دقيقة؛ سيظهر الإصدار المُثبَّت عندها v{to}.",
    "settings.about.upgradeFailed.title": "فشلت الترقية",
    "settings.about.aca.selfUpgradeNotReady.title":
      "الترقية بنقرة واحدة غير مُهيَّأة",
    "settings.about.aca.selfUpgradeNotReady.body":
      "الهوية المُدارة لتطبيق الحاوية هذا غير مرتبطة بـ ARM. أعِد النشر باستخدام أحدث قالب azure-container-apps.bicep (يُفعّل الهوية المُسنَدة-تلقائيًا، ويمنح دور Container Apps Contributor على مجموعة الموارد، ويحقن MIZAN_AZURE_RESOURCE_ID)، أو شغّل الأمر اليدوي أدناه.",
    "settings.about.downloadPkg": "تنزيل Mizan-{version}.pkg",
    "settings.about.downloadPkg.help":
      "شغّل المثبّت بعد تنزيله. تجري الترقية بدون فقد للبيانات — مجلد البيانات والإعدادات يبقى كما هو، ويُعاد تشغيل اللوحة تلقائيًا.",
    "settings.about.installerMissing":
      "مثبّت الإصدار v{version} لمنصّتك غير متاح بعد على GitHub. جرّب \"افحص الآن\" بعد دقيقة، أو استخدم الأمر اليدوي أعلاه.",
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
    "azureCfg.field.authMethod": "طريقة المصادقة",
    "azureCfg.authMethod.secret": "سر العميل",
    "azureCfg.authMethod.secretHint":
      "ألصق سرّ عميل من Entra → Certificates & secrets. سهل التزويد؛ يحتاج تدوير كل 6–24 شهرًا.",
    "azureCfg.authMethod.cert": "شهادة (تشديد إنتاج)",
    "azureCfg.authMethod.certHint":
      "حمّل مفتاحًا خاصًا + سجّل بصمة الشهادة العامة المطابقة. موصى به للإنتاج. لا تدوير سرّ مشترك؛ عمر الشهادة يساوي ما وقّعتها به.",
    "azureCfg.field.clientCertThumbprint": "بصمة الشهادة (SHA-1)",
    "azureCfg.field.clientCertPrivateKeyPem": "المفتاح الخاص (PEM)",
    "azureCfg.field.clientCertChainPem": "سلسلة الشهادة (PEM، اختيارية)",
    "azureCfg.cert.thumbprintHint":
      "من Entra → Certificates & secrets → تبويب Certificates → عمود Thumbprint للصفّ الخاص بشهادتك المُحمَّلة. ست عشرية فقط، بلا نقاط. Mizan يرفع الحالة عند الحفظ.",
    "azureCfg.cert.privateKeyPlaceholderReplace":
      "-----BEGIN PRIVATE KEY-----\\n…   (المفتاح مخزَّن — ألصق مفتاحًا جديدًا للاستبدال)",
    "azureCfg.cert.hasValue":
      "يوجد مفتاح خاص مخزَّن. ألصق كتلة PEM جديدة لاستبداله.",
    "azureCfg.cert.never": "لا يوجد مفتاح خاص مخزَّن بعد.",
    "azureCfg.cert.chainHint":
      "اختياري. يُرسل الشهادة العامة (وأي وسطاء) عبر x5c في كل طلب رمز ليتسنّى لـ Entra التحقّق مقابل سلسلة. اتركه فارغًا إن رفعتَ الشهادة العامة مباشرةً إلى تطبيق Entra.",
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
    "pdfCfg.preview.noTenants":
      "سجّل جهة واحدة على الأقل لمعاينة الخطاب المخصّص",
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
    "gov.title": "الحوكمة — المواءمة مع {framework}",
    "gov.subtitle":
      "مواءمة {orgShort} مع إطار {framework}، محسوبة من ارتباط ضوابط Secure Score وتطبيق خط الأساس للمجلس.",
    "gov.framework.nesa": "مواءمة NESA",
    "gov.framework.dubai-isr": "مواءمة ISR دبي",
    "gov.framework.nca": "مواءمة NCA السعودية",
    "gov.framework.isr": "مواءمة ISR / ISO 27001",
    "gov.framework.generic": "مواءمة الإطار",
    "gov.baseline.title": "خط أساس {orgShort}",
    "gov.baseline.body":
      "الجهات التي يبلغ مؤشر النضج لديها هدف {orgShort} أو يتجاوزه. يقود ترتيب طبقة المعايير.",
    "gov.baseline.aligned": "الجهات المُحاذاة مع الهدف",
    "gov.scope.title": "ملاحظة النطاق",
    "gov.scope.body":
      "هذه اللوحة قراءة فقط للملاحظة والمراقبة. تُعرض المواءمة مع الأطر للقياس؛ بينما يبقى تأليف السياسات وتطبيقها ضمن مستأجر كل جهة، خارج نطاق منصة {orgShort}.",
    "gov.clauses.draftBanner.title":
      "تطابق مؤقّت — بانتظار التحقّق من الكتالوج الرسمي.",
    "gov.clauses.title": "تغطية بنود {framework}",
    "gov.clauses.subtitle":
      "متوسط التغطية لكل بند عبر الجهات الموافِقة. كل بند مدعوم بضوابط Secure Score — قابلة للتعديل في الإعدادات ← إطار الامتثال.",
    "gov.clauses.col.clause": "البند",
    "gov.clauses.col.weight": "الوزن",
    "gov.clauses.col.coverage": "التغطية",
    "gov.clauses.openDetail": "فتح تفاصيل {name}",
    "gov.class.governance": "حوكمة",
    "gov.class.operation": "تشغيل",
    "gov.class.assurance": "ضمان",

    "gov.domainModal.loadingTitle": "جاري تحميل تفاصيل النطاق…",
    "gov.domainModal.weight": "الوزن في الإطار: {pct}%",
    "gov.domainModal.coverageHeadline": "التغطية",
    "gov.domainModal.descriptionHeading": "وصف النطاق",
    "gov.domainModal.calcHeading": "كيف تُحسب التغطية",
    "gov.domainModal.calcExplanation":
      "متوسط تغطية البند عبر {scored} من أصل {total} جهة ضمن النطاق. تغطية كل جهة هي متوسط معدّل اجتياز {controls} من ضوابط Microsoft Secure Score بالإضافة إلى {evidence} مرساة أدلة تديرها فِرق التشغيل وتُربط بهذا النطاق. تُستثنى الجهات التي ليس لديها أدلة قابلة للملاحظة على هذا البند (لا تُحسب صفرًا)، وتُستثنى الجهات الموسومة «خارج النطاق» كليًا.",
    "gov.domainModal.controlsHeading":
      "ضوابط Microsoft Secure Score — تجميع على مستوى المجلس",
    "gov.domainModal.controls.col.control": "الضابط",
    "gov.domainModal.controls.col.service": "الخدمة",
    "gov.domainModal.controls.col.passRate": "متوسط معدّل الاجتياز",
    "gov.domainModal.controls.col.entities": "اكتمال · جزئي · إخفاق",
    "gov.domainModal.controls.unscoredShort": "بدون بيانات",
    "gov.domainModal.controls.fullPassTip":
      "الجهات التي حقّقت 100% على هذا الضابط",
    "gov.domainModal.controls.partialTip":
      "الجهات التي تجاوزت 0% لكنها لم تبلغ 100% — يمنح Secure Score رصيدًا جزئيًا عند التطبيق المتدرّج",
    "gov.domainModal.controls.failTip":
      "الجهات التي حقّقت 0% بالضبط على هذا الضابط",
    "gov.domainModal.controls.legend":
      "يمنح Microsoft Secure Score رصيدًا جزئيًا، لذا تقع معظم الضوابط في خانة «جزئي» أثناء التطبيق المتدرّج. تستخدم نسبة تغطية البند الرصيد الجزئي الفعلي (مثلًا 8/9 = 88.9%) وليس قبولًا/رفضًا ثنائيًا.",
    "gov.domainModal.customEvidenceHeading": "أدلة من المشغّل",
    "gov.domainModal.perEntityHeading": "التغطية لكل جهة",
    "gov.domainModal.perEntity.col.entity": "الجهة",
    "gov.domainModal.perEntity.col.samples": "عدد الأدلة",
    "gov.domainModal.perEntity.col.coverage": "التغطية",
    "gov.domainModal.perEntity.noEvidence": "لا توجد أدلة",
    "gov.domainModal.perEntity.globalOos": "خارج النطاق (عام)",
    "gov.domainModal.perEntity.tenantOos": "خارج النطاق (الجهة)",

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

    "nesaCfg.hero.eyebrow": "الإطار التنظيمي الفعّال",
    "nesaCfg.hero.activeBadge": "مُختار",
    "nesaCfg.hero.changeLabel": "تغيير الإطار",
    "nesaCfg.hero.switching": "جارٍ التبديل\u2026",
    "nesaCfg.frameworkSwitched":
      "تم تبديل الإطار. أُعيد تحميل الكتالوج وفق الاختيار الجديد؛ تحديث الواجهة في جميع أنحاء اللوحة.",
    "nesaCfg.hero.body.dubai-isr":
      "اللائحة التنظيمية لأمن المعلومات في دبي، الصادرة بموجب قانون دبي رقم 11 لسنة 2014. إلزامية على جهات حكومة دبي والمنظّمات في القطاعات الحيوية. 13 نطاقاً عبر 3 فئات (الحوكمة، التشغيل، الضمان) مُؤسَّسة على ISO/IEC 27001 + 27002.",
    "nesaCfg.hero.body.nesa":
      "معيار ضمان المعلومات NESA الإماراتي، الصادر عن السلطة الوطنية الاتحادية للأمن الإلكتروني. الأساس الاتحادي للجهات الحكومية الإماراتية خارج نطاق دبي التنظيمي.",
    "nesaCfg.hero.body.nca":
      "ضوابط الهيئة الوطنية للأمن السيبراني السعودية. تُستخدم للجهات السعودية. الكتالوج يأتي كقالب \u2014 يُبنى وفق الضوابط الأساسية للأمن السيبراني (ECC).",
    "nesaCfg.hero.body.isr":
      "ضوابط عامة متماشية مع ISO 27001/27002. مفيدة للجهات التي لا تخضع لمنظِّم وطني محدّد. الكتالوج يأتي كقالب \u2014 يُبنى وفق ISO/IEC 27001:2022 الملحق أ.",
    "nesaCfg.hero.bodyGeneric":
      "لا يوجد إطار تنظيمي محدَّد حالياً. اللوحة تُخفي الواجهات الخاصة بالإطار: بطاقة الامتثال على نظرة عامة كل جهة، عمود الإطار في شبكة الجهات، بطاقة المؤشر العام، ولوحة تفاصيل البنود. اختر إطاراً أعلاه لإعادتها.",
    "nesaCfg.hero.genericHidden.title": "ما هو مُخفى حالياً",
    "nesaCfg.hero.genericHidden.body":
      "بطاقة الامتثال للإطار على كل صفحة جهة، لوحة التفاصيل لكل نطاق، عمود الإطار في الشبكة، بطاقة KPI الامتثال، ومرجع الإطار في صفحة الحوكمة. مؤشر النضج وكل اللوحات الأخرى غير متأثّرة. اختر إطاراً لإعادة كل ذلك.",
    "nesaCfg.cfg.targetLabel": "حد النجاح (الهدف ٪)",
    "nesaCfg.cfg.targetHelp":
      "الجهات التي يقل امتثالها للإطار عن هذه القيمة تُعلَّم في بطاقة KPI وشبكة الجهات. الافتراضي 70.",
    "nesaCfg.cfg.treatmentLabel": "معاملة البنود غير المُسجَّلة",
    "nesaCfg.cfg.treatmentSkip": "تجاوز (متساهل)",
    "nesaCfg.cfg.treatmentZero": "احتساب 0% (صارم)",
    "nesaCfg.cfg.treatmentSkipHelp":
      "البنود التي لا تتوفر لها أدلّة على الجهة تُستبعَد من البسط والمقام معاً. الافتراضي. الأنسب للجهات ذات البيانات الجزئية.",
    "nesaCfg.cfg.treatmentZeroHelp":
      "البنود غير المُسجَّلة تُحسَب 0٪. أكثر صرامة \u2014 \u00abإن لم تستطع إثباته فأنت لا تملكه\u00bb.",
    "nesaCfg.title": "كتالوج البنود \u2014 المواءمة",
    "nesaCfg.draftBanner.title":
      "تطابق مؤقّت — بانتظار التحقّق من الكتالوج الرسمي.",
    "nesaCfg.subtitle":
      "تطابق قابل للتحرير من {orgShort} بين بنود الإطار التنظيمي المختار في الهوية (NESA الإماراتي، ISR دبي، إلخ) وضوابط Microsoft Secure Score. يُحسب المؤشر الفرعي للامتثال كمتوسط موزون لتغطية البنود. يتم تطبيع الأوزان تلقائيًا عند الحفظ.",
    "nesaCfg.reset": "إعادة إلى الافتراضي",
    "nesaCfg.save": "حفظ",
    "nesaCfg.saved": "تم الحفظ. يُطبَّق في دورة حساب النضج التالية.",
    "nesaCfg.weight": "الوزن",
    "nesaCfg.controls": "مرتكزات الأدلة — ضوابط Microsoft Secure Score",
    "nesaCfg.coverage": "التغطية الحيّة",
    "nesaCfg.coverage.noControls":
      "لا توجد ضوابط مُربَطة بعد — أضف مرتكزات أدلة في الأسفل.",
    "nesaCfg.coverage.notObserved":
      "الضوابط المُربَطة لم تُرصد في أي جهة موافقة بعد.",
    "nesaCfg.coverage.observedNoScore":
      "تم رصد {n} من {total} ضابط (معلومات، بدون نسبة نجاح).",
    "nesaCfg.coverage.acrossTenants": "عبر {n} جهة",
    "nesaCfg.coverage.unmatched": "+{n} غير مطابق",
    "nesaCfg.picker.noneSelected": "لم يتم اختيار مرتكزات أدلة.",
    "nesaCfg.picker.addControl": "إضافة ضابط…",
    "nesaCfg.picker.available": "متاح",
    "nesaCfg.picker.custom": "مخصّص…",
    "nesaCfg.picker.customLabel":
      "أضف معرّف ضابط يدوياً. مفيد عندما تنشر الجهة المنظِّمة ضابطاً فرعياً جديداً قبل تحديث سجلّنا — ستظهر الرقاقة بلا بيانات تغطية حيّة حتى تُبلّغ إحدى الجهات عنه.",
    "nesaCfg.picker.customPlaceholder": "مثال: ISR-Custom-001",
    "nesaCfg.picker.cancel": "إلغاء",
    "nesaCfg.picker.add": "إضافة",
    "nesaCfg.picker.searchPlaceholder":
      "ابحث بالمعرّف أو العنوان أو الخدمة أو الفئة…",
    "nesaCfg.picker.noResults": "لا توجد ضوابط تطابق بحثك.",
    "nesaCfg.picker.showing": "عرض {n} من {total}",
    "nesaCfg.picker.customLink": "أضف معرّفاً مخصّصاً بدلاً من ذلك",
    "nesaCfg.picker.filterBy": "تصفية:",
    "nesaCfg.picker.allCategories": "كل الفئات",
    "nesaCfg.picker.allServices": "كل الخدمات",
    "nesaCfg.picker.clearFilters": "مسح",
    "nesaCfg.coverage.customEvidenceCount": "+{n} مخصّصة",
    "nesaCfg.custom.title": "أدلّة مخصّصة (يديرها المُشغّل)",
    "nesaCfg.custom.subtitle":
      "للضوابط التي لا تراها Microsoft — تمارين BCP، التدقيق المادي، عمليات الموارد البشرية.",
    "nesaCfg.custom.empty":
      "لا توجد أدلّة مخصّصة بعد. أضف مرتكزات للضوابط غير الميكروسوفتية.",
    "nesaCfg.custom.add": "إضافة دليل مخصّص",
    "nesaCfg.custom.edit": "تحرير",
    "nesaCfg.custom.save": "حفظ",
    "nesaCfg.custom.stale": "قديم",
    "nesaCfg.custom.reviewedAt": "آخر مراجعة: {date}",
    "nesaCfg.custom.labelPlaceholder":
      "مثال: تدقيق الوصول الفيزيائي السنوي — الربع الأول 2026",
    "nesaCfg.custom.passRate": "نسبة النجاح",
    "nesaCfg.custom.reviewedDateLabel": "تاريخ المراجعة",
    "nesaCfg.custom.notePlaceholder":
      "ملاحظة المراجع (اختيارية) — ما الذي تمّ فحصه، الأدلّة المُعتمدة، من اعتمد.",
    "nesaCfg.totalWeight": "مجموع الأوزان: {n}",
    "nesaCfg.addClause": "إضافة بند",
    "nesaCfg.removeClause": "حذف",
    "nesaCfg.oos.mark": "خارج النطاق",
    "nesaCfg.oos.unmark": "إعادة للنطاق",
    "nesaCfg.oos.globalChip": "خارج النطاق",
    "nesaCfg.oos.toggleHelp":
      "عند تعليمها بأنها خارج النطاق، تُستبعد هذه المادة من حساب الامتثال لكل جهة (تُستخدم عندما يغطيها منتج طرف ثالث).",

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
      "مستخلصة من ضوابط Secure Score المرتبطة ببنود إطار {framework}.",
    "faq.q.howCalculated.formula.title": "المعادلة",
    "faq.q.howCalculated.formula.body":
      "المؤشر = ٠٫٢٥·SecureScore + ٠٫٢٠·Identity + ٠٫١٥·Device + ٠٫١٥·Data + ٠٫١٥·Threat + ٠٫١٠·Framework",

    "faq.q.frameworkCompliance.title":
      "كيف يُحسَب الامتثال للإطار؟",
    "faq.q.frameworkCompliance.intro":
      "الامتثال للإطار مؤشّر رئيسي مستقلّ يقع بجانب مؤشر النضج. مؤشر النضج يجيب \u00abما مدى حماية هذه الجهة؟\u00bb. الامتثال للإطار يجيب \u00abما مدى التماشي مع الإطار التنظيمي للجهة المنظِّمة؟\u00bb (Dubai ISR لـDESC، NESA للشارقة). سؤالان مختلفان، رقمان مختلفان، كلاهما ظاهر.",
    "faq.q.frameworkCompliance.formulaIntro":
      "للإطار الفعّال (مُحدَّد في الإعدادات \u2192 إطار الامتثال)، النتيجة هي المتوسّط الموزون لتغطية كل بند. تغطية البند هي متوسّط نسب نجاح ضوابط Microsoft Secure Score المُربَطة + أي أدلّة مُخصّصة يديرها المُشغّل ويراجعها المجلس دورياً:",
    "faq.q.frameworkCompliance.unscoredNote":
      "البنود التي لا تتوفّر لها أدلّة على جهة ما تُعالَج وفق المفتاح في الإعدادات → إطار الامتثال. «تجاوز» (الافتراضي) يستبعدها من الحساب — منصف للجهات ذات البيانات الجزئية. «احتساب 0%» أكثر صرامة — «إن لم تستطع إثباته فأنت لا تملكه». كلاهما قابل للتحرير.",
    "faq.q.frameworkCompliance.coverageHeading":
      "تغطية Microsoft \u2014 ما نراه وما لا نراه",
    "faq.q.frameworkCompliance.strong.title":
      "تغطية Microsoft قويّة (10 من 13 نطاقاً)",
    "faq.q.frameworkCompliance.strong.body":
      "نطاقات ISR من 1 إلى 6 و8 و11 و12 و13. لدى Microsoft 365 Secure Score أكثر من 200 ضابط تُغطّي هذه النطاقات \u2014 النتيجة مدفوعة ببيانات Graph حقيقية.",
    "faq.q.frameworkCompliance.partial.title":
      "رؤية Microsoft محدودة",
    "faq.q.frameworkCompliance.partial.body":
      "بعض البنود الفرعية (مثل تشفير البيانات الساكنة بالتفصيل، مسارات التدقيق عبر المستأجرين) متاحة فقط عبر بوابة Defender for Cloud Apps أو Compliance Manager بدلاً من Graph \u2014 ميزان يجمعها لكن الموثوقية تتفاوت. وثّق الفجوة بأنخر دليل مخصّص.",
    "faq.q.frameworkCompliance.uncovered.title":
      "Microsoft لا ترى (3 من 13)",
    "faq.q.frameworkCompliance.uncovered.body":
      "ISR-7 استمرارية الأعمال، ISR-9 الأمن المادي والبيئي، ISR-10 الموارد البشرية. لا رؤية لـMicrosoft. يأتي ميزان بهذه البنود مع «أدلّة مخصّصة» يُديرها المُشغّل — يراجع المجلس أدلّة كل جهة ربع سنوياً ويضع نسبة نجاح يدوية. تظهر علامة «مراجعة قديمة» بعد 90 يوماً.",
    "faq.q.frameworkCompliance.tuneHeading":
      "كيف تُضبَط",
    "faq.q.frameworkCompliance.tuneBody":
      "الإعدادات \u2192 إطار الامتثال: غيّر اللائحة الفعّالة (Dubai ISR / NESA / غيرهما)، حرّر أوزان البنود لتعكس أولويات المجلس، اضبط حدّ النجاح (افتراضي 70٪)، بدّل معاملة البنود غير المُسجَّلة. كما يُتيح المُحدِّد في أعلى التبويبة للمجلس إلغاء اختيار الإطار كلياً \u2014 تختفي تلقائياً بطاقة الامتثال، بطاقة KPI، عمود الشبكة، ولوحة التفاصيل.",
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

    "faq.q.consentLifecycle.title":
      "أين تُحفظ موافقة الجهة، وهل يمكن سحبها؟",
    "faq.q.consentLifecycle.body":
      "حين يضغط المسؤول العام للجهة على رابط الموافقة ويوافق، تنشئ Microsoft Entra حساب خدمة (Service Principal، يُعرف أيضًا باسم Enterprise Application) داخل دليل المستأجر الخاص بالجهة نفسها. هذا الحساب هو التمثيل المحلي لتطبيق {orgShort} متعدد المستأجرين داخل مستأجر الجهة. يرتبط به سجلّان: appRoleAssignments (سجل لكل صلاحية ممنوحة — SecurityEvents.Read.All وPolicy.ReadWrite.ConditionalAccess وغيرها) وoauth2PermissionGrants (نطاقات تفويضية، تكون فارغة هنا لأن التطبيق يستخدم صلاحيات تطبيق فقط). يحمل حساب الخدمة الاسم الذي اختاره المشغّل (مثلًا \"{orgShort} Posture Dashboard\") مع اسم المسؤول الذي منح الموافقة وتاريخها.\n\nأين يراها مسؤول الجهة وكيف يسحبها: entra.microsoft.com ← Identity ← Applications ← Enterprise applications ← ابحث باسم التطبيق ← اضغط للدخول. تبويبان مهمّان:\n• Permissions — يسرد كل الصلاحيات الممنوحة مع اسم المسؤول الذي منحها. زر \"Revoke admin consent\" لكل صف، إضافةً إلى \"Review permissions\" للسحب الموجَّه.\n• Properties — يظهر ما إذا كان تسجيل الدخول مفعّلًا (يهم النطاقات التفويضية فقط، ولا نستخدمها).\n\nثلاث طرق للسحب:\n١. حذف Enterprise Application كاملًا — تبويب Permissions ← قائمة … ← Delete. يُزيل حساب الخدمة بأكمله. لا تستطيع {orgShort} الحصول على أي رمز للجهة في المزامنة التالية.\n٢. سحب صلاحيات منفردة — أدق ولكن أهش. الاستدعاءات التي تحتاج النطاق المسحوب تبدأ بإرجاع 403؛ ما تبقى يعمل.\n٣. سياسة Conditional Access في مستأجر الجهة تحجب appId الخاص بالتطبيق. الموافقة تبقى على الورق، لكن {orgShort} لا تستطيع الحصول على رموز. مفيدة للحجب المؤقت أثناء الحوادث.\n\nماذا تفعل {orgShort} عند سحب الموافقة: ينكشف ذلك تلقائيًا في منسّق المزامنة. إذا فشلت كل الإشارات بأخطاء سحب-معروفة (HTTP 401 أو رموز AADSTS رقم 65001 و700016 و50020 و500011)، يتحوّل consent_status للجهة إلى revoked وتُفرَّغ ذاكرة الرموز. يظهر صف الجهة بشارة حمراء \"الموافقة مسحوبة\"، وبإمكان مسؤول الجهة منح الموافقة مجددًا من رابط جديد — مسار إعادة التسجيل المتسامِح في المعالج ينتج رابطًا دون إنشاء صف مكرّر.",

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
      "الجهات الموسومة كتجريبية تحمل إشارات مُعدّة مسبقاً ولا تُزامن أبداً مع نقاط Graph الحقيقية. وجودها لعرض لوحة مأهولة قبل تسجيل جهات حقيقية. عمليات التثبيت الإنتاجية تُشحن بتعطيل البذر افتراضياً (اضبط `SCSC_SEED_DEMO=true` لتفعيله). يمكن للمسؤول مسح كل الجهات التجريبية في أي وقت عبر الأمر `npm run purge-demo` — الجهات الحقيقية لا تُمس.",

    "faq.q.glossary.title": "مسرد المصطلحات",
    "faq.q.glossary.tenant": "مستأجر — مؤسسة Microsoft 365 لجهة واحدة، يُعرّف بـ GUID في Entra.",
    "faq.q.glossary.cluster": "قطاع — تجميع {orgShort}: الشرطة / الصحة / التعليم / البلدية / الخدمات / النقل / أخرى.",
    "faq.q.glossary.consent": "موافقة المسؤول — يوافق المسؤول العام للجهة على تطبيق Entra الخاص ب{orgShort} في مستأجرها؛ مطلوبة قبل أن تعمل أي استدعاءات Graph.",
    "faq.q.glossary.secureScore": "Secure Score — مقياس الوضع الأمني المضمّن من Microsoft على مستوى المستأجر، من ٠ إلى حد أقصى ديناميكي.",

    "kpi.maturityIndex": "مؤشر النضج",
    "kpi.frameworkCompliance": "الامتثال للإطار",
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
    "entities.scopeStale.title":
      "{count} جهة تحتاج إلى إعادة الموافقة على صلاحيات أُضيفت حديثًا",
    "entities.scopeStale.body":
      "أضافت إصدارة حديثة صلاحيات Microsoft Graph أو Defender لم توافق عليها هذه الجهات بعد. حتى إعادة الموافقة، ستعمل المزامنة بمجموعة الصلاحيات القديمة ولن تُرجع بعض الإشارات (مثل تتبّع الثغرات) أي بيانات.",
    "entities.scopeStale.reverify": "إعادة التحقق",
    "entities.scopeStale.hint":
      "إذا استمر فشل إعادة التحقق، يجب على مسؤول الجهة فتح «التطبيقات المؤسسية» في مستأجره، واختيار تطبيق Mizan، والضغط على «منح موافقة المسؤول» — هذا يلتقط الصلاحيات الجديدة من تعريف التطبيق المصدر. ثم اضغطوا «إعادة التحقق» هنا.",
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
    "cols.frameworkCompliance": "الإطار",
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

    "workloadCoverage.title": "تغطية أحمال Microsoft 365",
    "workloadCoverage.subtitle":
      "ما رخّصته هذه الجهة، وما هو منشور فعلياً، وأين فجوات التغطية. الأدوات المخدومة من نقاط Microsoft Graph التجريبية موسومة BETA؛ الأدوات التي لم تُكشف تفاصيل نشرها على Graph بعد تظهر مؤشرات الترخيص + النشاط.",
    "workloadCoverage.collectedAt": "جُمعت {when}",
    "workloadCoverage.notYetCollected": "إشارة التغطية لم تُجمع بعد لهذه الجهة. اضغط \u00ab\u062cمزامنة الآن\u00bb لجمعها.",
    "workloadCoverage.awaitingFirstSync": "بانتظار أول مزامنة لهذه الجهة.",
    "workloadCoverage.licensed": "مُرخَّص.",
    "workloadCoverage.notLicensed": "غير مُرخَّص.",
    "workloadCoverage.seatMath": "{consumed} من أصل {total} مقعد مُسنَد.",
    "workloadCoverage.licenseNoSeatData": "لم تُرفع المقاعد.",
    "workloadCoverage.andMore": "+{n} أخرى",

    "workloadCoverage.badge.live": "متاح",
    "workloadCoverage.badge.beta": "تجريبي",
    "workloadCoverage.badge.comingSoon": "قادم قريباً",
    "workloadCoverage.badge.comingSoonLicensed": "قادم قريباً",

    "workloadCoverage.tool.intune.name": "Intune",
    "workloadCoverage.tool.intune.subtitle":
      "إدارة الأجهزة + التطبيقات. سلطة MDM، الأجهزة المسجَّلة، سياسات الالتزام، ملفات الإعداد.",
    "workloadCoverage.intune.mdmAuthority": "سلطة MDM",
    "workloadCoverage.intune.enrolled": "أجهزة مسجَّلة",
    "workloadCoverage.intune.compliant": "% ملتزم",
    "workloadCoverage.intune.compliancePolicies": "سياسات الالتزام",
    "workloadCoverage.intune.configProfiles": "ملفات الإعداد",
    "workloadCoverage.intune.settingsCatalog": "كتالوج الإعدادات",
    "workloadCoverage.intune.byPlatform": "حسب المنصّة",

    "workloadCoverage.tool.mde.name": "Defender for Endpoint (MDE)",
    "workloadCoverage.tool.mde.subtitle":
      "حسّاسات النقاط الطرفية. عدد الأجهزة المُلحَقة، توزيع نظام التشغيل، النشاط الأخير، اكتشاف الحسّاسات الراكدة.",
    "workloadCoverage.mde.onboarded": "مُلحَقة",
    "workloadCoverage.mde.activeLast7d": "نشطة (7 أيام)",
    "workloadCoverage.mde.staleOver30d": "راكدة (>30 يوماً)",
    "workloadCoverage.mde.byOs": "حسب نظام التشغيل",
    "workloadCoverage.mde.coverageGap":
      "{n} جهاز مُدار بـ Intune لم يُلحَق بعد بـ MDE. سدّ هذه الفجوة هو أعلى إجراءات حماية النقاط الطرفية رفعاً للقيمة لهذه الجهة.",

    "workloadCoverage.tool.mdi.name": "Defender for Identity (MDI)",
    "workloadCoverage.tool.mdi.subtitle":
      "تغطية حسّاسات AD المحلية + صحة الحسّاس. جرد الحسّاسات يأتي من Microsoft Graph التجريبي — قد يتغيّر المخطط.",
    "workloadCoverage.mdi.sensors": "حسّاسات",
    "workloadCoverage.mdi.openHealth": "مشاكل مفتوحة",
    "workloadCoverage.mdi.criticalHealth": "مشاكل حرجة",

    "workloadCoverage.tool.labels.name": "تصنيفات الحساسية",
    "workloadCoverage.tool.labels.subtitle":
      "كتالوج تصنيفات Microsoft Purview. سياسات التصنيف + التصنيف التلقائي تتطلب PowerShell — قادم قريباً.",
    "workloadCoverage.labels.published": "تصنيفات منشورة",
    "workloadCoverage.labels.eventsLast30d": "نشاط (30 يوماً)",
    "workloadCoverage.labels.catalog": "الكتالوج",

    "workloadCoverage.tool.mdo.name": "Defender for Office 365 (MDO)",
    "workloadCoverage.tool.mdo.subtitle":
      "حماية البريد + التعاون. تفاصيل السياسات (Safe Attachments / Links / anti-phishing) تتطلب PowerShell الخاص بـ Exchange Online.",
    "workloadCoverage.mdo.alertsLast30d": "تنبيهات (30 يوماً)",
    "workloadCoverage.mdo.submissionsLast30d": "إرساليات (30 يوماً)",
    "workloadCoverage.mdo.comingSoonNote":
      "مؤشر النشاط (التنبيهات + الإرساليات) معروض هنا. تفاصيل السياسات الكاملة متاحة في بوابة Defender.",

    "workloadCoverage.tool.mdca.name": "Defender for Cloud Apps (MDCA)",
    "workloadCoverage.tool.mdca.subtitle":
      "حماية SaaS / OAuth. كتالوج التطبيقات المُجازة + التطبيقات المتّصلة على واجهة بوابة MDCA لكل مستأجر.",
    "workloadCoverage.mdca.alertsLast30d": "تنبيهات (30 يوماً)",
    "workloadCoverage.mdca.comingSoonNote":
      "مؤشر النشاط (التنبيهات) معروض هنا. التطبيقات المُجازة + المتّصلة متوفّرة في بوابة Defender for Cloud Apps.",

    "workloadCoverage.tool.dlp.name": "منع تسرّب البيانات",
    "workloadCoverage.tool.dlp.subtitle":
      "Endpoint DLP، Teams DLP، SharePoint، OneDrive، Exchange. النشر لكل حِمل يتطلب PowerShell.",
    "workloadCoverage.dlp.policiesBeta": "سياسات (تجريبي)",
    "workloadCoverage.dlp.alertsLast30d": "تنبيهات (30 يوماً)",
    "workloadCoverage.dlp.comingSoonNote":
      "مؤشر النشاط (التنبيهات) + عدد سياسات المستأجر من Microsoft Graph التجريبي. النشر لكل حِمل (Endpoint / Teams / SPO / OneDrive / Exchange) متاح في بوابة Purview.",

    "entity.frameworkCompliance.title": "الامتثال للإطار",
    "entity.frameworkCompliance.titleFor": "الامتثال لـ{framework}",
    "entity.frameworkCompliance.titleGeneric": "الامتثال للإطار",
    "entity.frameworkCompliance.subtitle":
      "محور واحد لقياس مدى التماشي مع الإطار التنظيمي الفعّال. منفصل عن مؤشر النضج — يجيب: \u00abمدى التوافق، لا مدى الحماية\u00bb.",
    "entity.frameworkCompliance.subtitleFor": "مقابل {framework}",
    "entity.frameworkCompliance.viewBreakdown": "عرض التفاصيل",
    "entity.frameworkCompliance.clausesScored": "البنود المُسجَّلة",
    "entity.frameworkCompliance.unscoredClausesLabel": "بنود غير مسجَّلة",
    "entity.frameworkCompliance.treatmentSkipHint": "تُتجاوَز من الحساب",
    "entity.frameworkCompliance.treatmentZeroHint": "تُحسَب 0٪",
    "entity.frameworkCompliance.noData":
      "لم تُحسَب بيانات الإطار بعد. سيُملأ هذا في أول مزامنة.",
    "entity.frameworkBreakdown.title": "تفاصيل الامتثال للإطار",
    "entity.frameworkBreakdown.titleFor": "{framework} \u2014 تغطية البنود",
    "entity.frameworkBreakdown.subtitleFor":
      "تغطية كل بند مقارنةً بـ {framework}. توضّح بدقّة أين تتعثّر الجهة.",
    "entity.frameworkBreakdown.filterBy": "تصفية:",
    "entity.frameworkBreakdown.allClasses": "كل الفئات",
    "entity.frameworkBreakdown.allStatus": "كل الحالات",
    "entity.frameworkBreakdown.statusFailing": "المتعثّرة فقط",
    "entity.frameworkBreakdown.statusPartial": "الجزئية فقط",
    "entity.frameworkBreakdown.statusPassing": "الناجحة فقط",
    "entity.frameworkBreakdown.statusUnscored": "غير المُسجَّلة",
    "entity.frameworkBreakdown.classClauseCount": "عبر {n} بند",
    "entity.frameworkBreakdown.col.clause": "البند",
    "entity.frameworkBreakdown.col.class": "الفئة",
    "entity.frameworkBreakdown.col.weight": "الوزن",
    "entity.frameworkBreakdown.col.evidence": "الأدلّة",
    "entity.frameworkBreakdown.col.coverage": "التغطية",
    "entity.frameworkBreakdown.samples": "{n} عيّنات",
    "entity.frameworkBreakdown.noRows": "لا توجد بنود تطابق التصفية الحالية.",
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
    "subscores.compliance": "الامتثال ({framework})",

    "maturity.sub.secureScore": "Secure Score",
    "maturity.sub.identity": "الهوية",
    "maturity.sub.device": "الأجهزة",
    "maturity.sub.data": "البيانات",
    "maturity.sub.threat": "الاستجابة للتهديدات",
    "maturity.sub.compliance": "الامتثال",
    "radar.ariaLabel":
      "مخطط راداري بستة محاور لمؤشرات النضج الفرعية: Secure Score، الهوية، الأجهزة، البيانات، الاستجابة للتهديدات، الامتثال",
    "radar.entityProfile.title": "ملف الوضع الأمني",
    "radar.entityProfile.subtitle":
      "مخطط راداري بستة محاور للمؤشرات الفرعية للنضج لهذه الجهة. قارن مع متوسط المجلس لمعرفة نقاط القوة والضعف لدى هذه الجهة مقارنة بالأخريات.",
    "radar.councilMean": "متوسط المجلس",
    "radar.councilTarget": "هدف المجلس",
    "radar.councilOverview.title": "ملف الوضع الأمني حسب القطاع",
    "radar.councilOverview.subtitle":
      "متوسط مؤشرات النضج الفرعية لكل قطاع. يُعرض هدف المجلس {target}% كخط مرجعي متقطّع حتى تبرز المحاور الضعيفة لكل قطاع بلمحة واحدة.",

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
      "من مؤشر النضج (وزن {framework})",
    "tab.gov.categories.title": "التغطية حسب الفئة",
    "tab.gov.categories.subtitle":
      "أخضر = ناجح · كهرماني = جزئي · أحمر = غير مُطبَّق.",

    "subtabs.more.title": "علامات تبويب أخرى",
    "subtabs.more.subtitle":
      "Data · Governance — ستأتي في المرحلة الثالثة مع إشارات Purview.",
    "subtabs.more.body":
      "تبويبات Data و Governance تمتلئ بعد توصيل إشارات Purview المقروءة (تنبيهات DLP، مخاطر الداخل، طلبات حقوق الأفراد، تبنّي التصنيفات) والمواءمة مع إطار {framework}.",

    "tab.overview": "نظرة عامة",
    "tab.controls": "الضوابط",
    "tab.incidents": "الحوادث",
    "tab.identity": "الهوية",
    "tab.data": "البيانات",
    "tab.devices": "الأجهزة",
    "tab.governance": "الحوكمة",
    "tab.framework": "الإطار",
    "tab.vulnerabilities": "الثغرات",
    "tab.attackSimulation": "محاكاة الهجمات",
    "tab.connection": "الاتصال",
    "entity.frameworkTab.eyebrowFor": "امتثال {framework} — عرض الجهة",
    "entity.frameworkTab.titleFor": "ضوابط {framework} المطبّقة على هذه الجهة",
    "entity.frameworkTab.subtitleFor":
      "تغطية كل مادة وحالات الاستثناء من النطاق لـ {entity}. ضع المادة خارج النطاق إذا كانت ضوابطها يغطيها منتج طرف ثالث وافق عليه المجلس.",
    "entity.frameworkTab.stat.clausesTotal": "إجمالي مواد الإطار",
    "entity.frameworkTab.stat.clausesScored": "مواد محتسبة",
    "entity.frameworkTab.stat.clausesOos": "خارج النطاق",
    "entity.frameworkTab.stat.target": "الهدف",
    "entity.frameworkTab.controls.title": "تغطية المواد ونطاق التطبيق",
    "entity.frameworkTab.controls.subtitle":
      "عيِّن المادة خارج النطاق إذا كانت مغطّاة بأداة غير تابعة لـ Microsoft — ستُستبعد من حساب امتثال هذه الجهة. الاستثناءات العالمية (المضبوطة من الإعدادات) لا يمكن تجاوزها هنا.",
    "entity.frameworkTab.col.scope": "النطاق",
    "entity.frameworkTab.scope.markOos": "خارج النطاق",
    "entity.frameworkTab.scope.restore": "إعادة للنطاق",
    "entity.frameworkTab.scope.globalLocked": "عالمي · مقفل",
    "entity.frameworkTab.chip.globalOos": "خارج النطاق عالميًا",
    "entity.frameworkTab.chip.tenantOos": "خارج النطاق",
    "entity.frameworkTab.reason.title": "سبب إخراج المادة من النطاق",
    "entity.frameworkTab.reason.body":
      "اختياري — يُحفظ للسجل التدقيقي (مغطّى بمنتج طرف ثالث، استثناء فدرالي، إلخ). حتى 500 حرف.",
    "entity.frameworkTab.reason.placeholder":
      "مثال: حماية النقاط الطرفية مشمولة بعقد المركز الفدرالي للعمليات الأمنية.",
    "entity.frameworkTab.reason.cancel": "إلغاء",
    "entity.frameworkTab.reason.confirm": "وضع خارج النطاق",
    "entity.frameworkTab.deployments.title": "المنشور عبر Directive",
    "entity.frameworkTab.deployments.subtitle":
      "أحدث عمليات نشر الخطوط الأساسية على هذه الجهة. تظهر الجديدة خلال ثوانٍ من اكتمالها.",
    "entity.frameworkTab.deployments.empty":
      "لم يُنفّذ أي توجيه على هذه الجهة بعد.",

    "tab.controls.title": "ضوابط Secure Score",
    "tab.controls.subtitle": "حالة تطبيق كل ضابط من Microsoft Secure Score. عيِّن الضابط خارج النطاق إذا كان مغطّى بأداة غير تابعة لـ Microsoft — سيُستبعد من حساب مؤشر النضج.",
    "tab.controls.col.name": "الضابط",
    "tab.controls.col.category": "الفئة",
    "tab.controls.col.score": "النقاط",
    "tab.controls.col.status": "الحالة",
    "tab.controls.col.scope": "النطاق",
    "tab.controls.implemented": "مُطبَّق",
    "tab.controls.notImplemented": "غير مُطبَّق",
    "tab.controls.partial": "جزئي",
    "tab.controls.unknown": "غير معروف",
    "tab.controls.userImpact": "الأثر على المستخدم",
    "tab.controls.implCost": "تكلفة التطبيق",
    "tab.controls.filter.label": "الفئة",
    "tab.controls.filter.uncategorized": "غير مُصنَّف",
    "tab.controls.scope.markOos": "وضع خارج النطاق",
    "tab.controls.scope.restore": "إعادة إلى النطاق",
    "tab.controls.scope.oosChip": "خارج النطاق",
    "tab.controls.scope.help":
      "خارج النطاق = منفَّذ بأداة غير تابعة لـ Microsoft. يستبعد هذا الضابط من حساب مؤشر النضج.",
    "tab.controls.scope.reason.title": "تعيين الضابط خارج النطاق",
    "tab.controls.scope.reason.body":
      "خارج النطاق يعني أن هذا الضابط مغطّى بأداة غير تابعة لـ Microsoft. استبعاده من الحساب يُعفي هذه الجهة من العقوبة على ضابط لا تراه Microsoft. أضِف سببًا قصيرًا ليفهم المراجعون لاحقًا أساس الاستثناء.",
    "tab.controls.scope.reason.placeholder":
      "مثال: CrowdStrike Falcon يغطّي تأمين نقاط النهاية — لا يستطيع Microsoft Secure Score رصده.",
    "tab.controls.scope.reason.cancel": "إلغاء",
    "tab.controls.scope.reason.confirm": "وضع خارج النطاق",
    "tab.controls.scope.reason.saving": "جارٍ الحفظ…",
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
    "tab.identity.showingFirst":
      "عرض أول {shown} من أصل {total} مستخدم.",
    "tab.identity.showAll": "عرض الكل ({count})",
    "tab.identity.pim.excessive.title":
      "تجاوز في حسابات المسؤولين: {count} أدوار مميّزة تتجاوز الحد الموصى به",
    "tab.identity.pim.excessive.body":
      "يوصي Microsoft Secure Score بالحفاظ على عضوية الأدوار المميّزة في أضيق الحدود (مثلًا أقل من ٥ مسؤولين عامّين). راجع الأسطر المُبرزة أدناه — كل حساب مسؤول إضافي يوسّع نطاق التأثر عند اختراق بيانات اعتماد واحدة.",
    "tab.identity.pim.excessive.chip": "أكثر من {threshold}",
    "tab.identity.pim.deactivations.title":
      "{count} حساب مسؤول تم تعطيله خلال آخر ٣٠ يومًا",
    "tab.identity.pim.deactivations.body":
      "تم استخراج هذه الأحداث من /auditLogs/directoryAudits — تظهر فقط أحداث «تعطيل حساب» التي استهدفت مستخدمًا يحمل دورًا مميّزًا. راجع كل حدث للتأكد من أنه إجراء معتمد؛ يمكن نشر أساس Mizan لمنع التعطيل عبر «التوجيه ← الوصول المشروط» لاشتراط الموافقة على عمليات التعطيل المستقبلية.",
    "tab.identity.pim.deactivations.col.target": "المستخدم",
    "tab.identity.pim.deactivations.col.role": "الدور المميّز",
    "tab.identity.pim.deactivations.col.actor": "نُفِّذ بواسطة",
    "tab.identity.pim.deactivations.col.when": "متى",

    "notif.popover.title": "الإشعارات",
    "notif.popover.summary": "{count} عنصر · {unread} جديد",
    "notif.popover.empty":
      "لا توجد تنبيهات نشطة عبر الجهات. تظهر هنا أخطاء المزامنة، والجهات بحاجة لتحديث الموافقة، وعمليات تعطيل المسؤولين، والمستخدمون عاليو الخطورة، والحوادث النشطة عالية الخطورة فور وقوعها.",
    "notif.popover.footer": "تحديث كل دقيقة. اضغط على أي عنصر للانتقال إلى الجهة.",
    "notif.syncFailure.title": "خطأ في مزامنة الجهة",
    "notif.consentFailed.title": "مسار الموافقة يحتاج مراجعة",
    "notif.scopeStale.title": "الجهة تحتاج إعادة موافقة على صلاحيات جديدة",
    "notif.adminDeactivated.title": "تم تعطيل حساب مسؤول",
    "notif.highRiskUser.title": "تم رصد مستخدم عالي الخطورة",
    "notif.criticalIncident.title": "حادث نشط عالي الخطورة",
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
    "directive.demoBanner.title":
      "وضع تجريبي — تم تجاوز مصادقة لوحة التحكم.",
    "directive.demoBanner.body":
      "الإجراءات على الجهات التجريبية (المُعلَّمة بشارة DEMO) مُحاكاة: لا استدعاء Graph، ولا تغيير في Defender XDR، ولا إرسال إلى Microsoft. أما الإجراءات على الجهات الحقيقية المُدرَجة فتمر بمسار Graph الكامل وتُنفَّذ كتابات فعلية. المحاكاة مرتبطة بعلم is_demo لكل جهة، لا بإعداد الوضع التجريبي في النشر — يمكنك إدراج جهة حقيقية في هذه البيئة لاختبار كتابات التوجيه من طرف إلى طرف دون إيقاف الوضع التجريبي.",

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
    "directive.cap.caBaselines.title": "قواعد Conditional Access + معالج مخصّص",
    "directive.cap.caBaselines.body":
      "ادفع 12 قاعدة CA منسَّقة (تقوية الهوية، حظر المصادقة القديمة، إنفاذ مبني على المخاطر، نظافة الجلسة، وضع الأجهزة). افتراضي تقارير فقط، دفع idempotent، تراجع بصفّ مع معاينة استباقية، \"إزالة من كل الجهات\". يضيف معالج CA المخصّص الوضع المُقيَّد بمستأجر (مستخدمون/مجموعات/مواقع مسماة/ToU/قوى مصادقة مخصّصة) + باني قواعد مُرشّح الجهاز.",
    "directive.cap.intuneBaselines.title": "قواعد وضع الأجهزة عبر Intune",
    "directive.cap.intuneBaselines.body":
      "13 قاعدة تُدفَع عبر Graph: امتثال iOS / Android / Windows / macOS، حماية تطبيقات iOS / Android (MAM، بلا تسجيل)، إنفاذ BitLocker على Windows. تُشحَن بدون تخصيص؛ يخصّصها مسؤول الجهة من Intune.",
    "directive.cap.sharepointSharing.title": "إعدادات SharePoint للمشاركة الخارجية",
    "directive.cap.sharepointSharing.body":
      "قواعد على مستوى المستأجر: مشاركة خارجية صارمة (ضيوف فقط، بلا روابط مجهولة)، الافتراضي 'داخلي + View'، قائمة سماح بالنطاقات، إيقاف الروابط المجهولة. نموذج singleton — دفع فقط، يلتقط السجلّ الفرق before/after.",
    "directive.cap.iocPush.title": "دفع مؤشّرات التهديد (IOC)",
    "directive.cap.iocPush.body":
      "احظر (أو نبّه على) hash ملف أو URL أو نطاق أو IPv4 أو IPv6 على كل أسطول Defender for Endpoint لدى الجهات الموافقة. صلاحية لكل IOC، idempotency بوسم الوصف، تراجع كامل بمعرّف المؤشّر.",
    "directive.cap.asrRules.title": "قواعد ASR لـ Defender for Endpoint",
    "directive.cap.asrRules.body":
      "6 قواعد Attack Surface Reduction: العمليات الفرعية لـ Office، المحتوى التنفيذي من البريد، سرقة الاعتمادات من LSASS، JS/VBS تُشغّل التنفيذيات المُنزَّلة، PSExec + WMI، عمليات USB غير الموثوقة. كلّها بوضع التدقيق؛ تُحوَّل إلى Block في بوّابة Defender بعد مراجعة التيليمتري.",
    "directive.cap.deviceIsolation.title": "عزل الجهاز (MDE مباشر)",
    "directive.cap.deviceIsolation.body":
      "طلب عزل جهاز مخترق. يتطلّب واجهة Defender for Endpoint المباشرة (تطبيق Entra منفصل)، خارج نطاق v2.0.",
    "directive.cap.dlp.title": "قواعد منع تسرّب البيانات (DLP)",
    "directive.cap.dlp.body":
      "كتالوج DLP مُنسَّق (حظر المشاركة الخارجية للبيانات الحساسة، تسريب الاعتمادات، النقل الجماعي، خروج البيانات المُصنَّفة). يُفعَّل الدفع يوم تطرح Microsoft واجهة تأليف DLP الكاملة على Graph — الـ beta اليوم يغطي جزءاً صغيراً فقط.",
    "directive.cap.labels.title": "تصنيفات الحساسية",
    "directive.cap.labels.body":
      "هيكل تصنيف من 4 مستويات + قواعد التصنيف التلقائي (بريد داخلي، محتوى معلومات حساسة). يُفعَّل الدفع عندما يستطيع Graph ضبط التشفير وعلامات المحتوى والنشر وقواعد التصنيف التلقائي — الـ beta اليوم يُنشئ تصنيفات فقط.",
    "directive.cap.attackSim.title": "تدريب محاكاة الهجمات",
    "directive.cap.attackSim.body":
      "محاكاة تصيّد ربع سنوية + تدريب توعية للموظفين الجدد + إعادة تدريب المُكرّرين. يُفعَّل الدفع عند GA لواجهة إنشاء + أتمتة المحاكاة على Graph؛ القراءة موصولة اليوم.",
    "directive.cap.pim.title": "PIM + حوكمة الهوية",
    "directive.cap.pim.body":
      "MFA عند التفعيل، حد أقصى 8 ساعات، تبرير + إشعار عند التفعيل، مراجعات وصول ربع سنوية. مُعلَّقة حتى يستقر CRUD عبر المستأجرين على سياسات إدارة الأدوار.",
    "directive.cap.appConsent.title": "سياسات موافقة التطبيقات",
    "directive.cap.appConsent.body":
      "تقييد الموافقة على الناشرين الموثَّقين، تفعيل سير عمل موافقة المسؤول، حظر الصلاحيات عالية الخطورة، اعتماد مسبق للصلاحيات منخفضة الخطورة. تُغلق سطح تصيّد OAuth.",
    "directive.cap.tenantIdentity.title": "إعدادات الهوية الافتراضية للمستأجر",
    "directive.cap.tenantIdentity.body":
      "سياسة طرق المصادقة (FIDO2/passkey، إيقاف SMS)، صلاحيات المستخدم الافتراضية، ثقة الوصول عبر المستأجرين. مُعلَّقة حتى تستقر مخططات Graph (إعادة تسمية FIDO2 → passkey، مراجعة ثقة B2B).",
    "directive.cap.namedLocations.title": "المواقع المُسمّاة",
    "directive.cap.namedLocations.body":
      "تم شحنها كجزء من المرحلة 4.5 — يُتيح وضع المعالج المُقيَّد بمستأجر اختيار المواقع المسماة من المستأجر المرجعي. لا حاجة لمنصّة منفصلة.",
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

    "directive.tabs.label": "أقسام التوجيهات",
    "directive.tab.overview": "نظرة عامة",
    "directive.tab.ca": "الوصول المشروط",
    "directive.tab.intune": "Intune",
    "directive.tab.sharepoint": "SharePoint",
    "directive.tab.compliance": "الامتثال",
    "directive.tab.ioc": "مؤشّرات التهديد",
    "directive.tab.roadmap": "خارطة الطريق",
    "directive.tab.history": "السجلّ والتدقيق",
    "directive.compliance.loading": "تحميل فجوة الامتثال…",
    "directive.compliance.title.generic": "لم يتم اختيار إطار امتثال",
    "directive.compliance.subtitle.generic":
      "اختر إطارًا تنظيميًا من الإعدادات → إطار الامتثال (Dubai ISR، UAE NESA، إلخ) لعرض فجوات المواد ومقترحات الخطوط الأساسية للدفع.",
    "directive.compliance.eyebrowFor": "امتثال {framework} — تخطيط الدفع",
    "directive.compliance.titleFor": "فجوة {framework} ← مقترحات الدفع",
    "directive.compliance.subtitleFor":
      "تغطية مواد {framework} ({version}) عبر كل الجهات المُوافِقة، مع إبراز المواد الأضعف أولًا وخطوط أساسية ملموسة للدفع لرفع النتيجة.",
    "directive.compliance.stat.clausesInScope": "مواد ضمن النطاق",
    "directive.compliance.stat.failingClauses": "أقل من الهدف",
    "directive.compliance.stat.consentedEntities": "جهات مُوافِقة",
    "directive.compliance.stat.target": "الهدف",
    "directive.compliance.oosNote":
      "{n} مادة موسومة خارج النطاق ومُستبعدة من هذا العرض. أدِرها من الإعدادات → إطار الامتثال.",
    "directive.compliance.gap.title": "فجوة المواد",
    "directive.compliance.gap.subtitle":
      "المواد التي لم تبلغ الهدف في الأعلى. اضغط اسم الجهة للانتقال إلى تبويب الإطار الخاص بها؛ اضغط خط أساسي للقفز إلى بطاقة الدفع المطابقة.",
    "directive.compliance.col.clause": "المادة",
    "directive.compliance.col.avgCoverage": "متوسط التغطية",
    "directive.compliance.col.entities": "الجهات",
    "directive.compliance.col.weakest": "الجهات الأضعف",
    "directive.compliance.col.suggestions": "خطوط الدفع المقترحة",
    "directive.compliance.failingN": "{n} غير ممتثلة",
    "directive.compliance.noSuggestions":
      "لا يوجد خط أساسي مطابق بعد — تُغطّى عبر أدلّة مخصّصة.",
    "directive.tab.overview.title": "مصفوفة القدرات",
    "directive.tab.overview.subtitle":
      "ما يستطيع محرك التوجيهات دفعه اليوم، وما هو قادم، والضوابط التي ترافق كل إجراء.",
    "directive.tab.roadmap.title": "في خارطة الطريق",
    "directive.tab.roadmap.subtitle":
      "هياكل تأليف للقدرات التي تنتظر واجهة كتابة في Microsoft Graph أو موافقة المركز. الدفع مُعطَّل حتى تُفعَّل كل قائمة.",

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
    "directive.threat.evidenceTitle": "أدلة التنبيهات",
    "directive.threat.noEvidence":
      "لا توجد أدلة قابلة للاستخراج (روابط أو رسائل أو ملفات) لهذه الحادثة. جرّب حادثة أخرى.",
    "directive.threat.useInForm": "استخدم في النموذج",
    "directive.threat.submitToMicrosoft": "إرسال إلى Microsoft",
    "directive.threat.evidenceHint":
      "كل عنصر دليل مُستخرَج من التنبيهات المرتبطة بهذه الحادثة. اضغط «استخدم في النموذج» لتعبئة نموذج الإرسال أدناه — دون الحاجة لمغادرة Mizan أو فتح بوابة Defender XDR الخاصة بالجهة.",

    "directive.baselines.title": "قواعد Conditional Access",
    "directive.baselines.subtitle":
      "سياسات Conditional Access يؤلّفها المركز ويدفعها إلى كل جهة موافقة على التوجيه في خطوة واحدة. كل دفعة تبدأ بوضع تقارير فقط افتراضيًا، وتُفعّل الجهة الإنفاذ من بوّابة Entra الخاصة بها بعد التحقق. التراجع بضغطة واحدة ويحذف السياسات المدفوعة.",
    "directive.baselines.target": "الأهداف",
    "directive.baselines.grant": "المنح",
    "directive.baselines.initialState": "الحالة الأولية",
    "directive.baselines.reportOnly": "تقارير فقط (غير مُنفَّذ)",
    "directive.baselines.pushCta": "دفع إلى الجهات",
    "directive.baselines.risk.low": "مخاطر منخفضة",
    "directive.baselines.risk.medium": "مخاطر متوسطة",
    "directive.baselines.risk.high": "مخاطر عالية",
    "directive.baselines.previewTitle": "معاينة — هذا ما سيُنشَأ",
    "directive.baselines.stateLabel": "الحالة",
    "directive.baselines.targetsTitle": "إلى أي جهات؟",
    "directive.baselines.selectAll": "تحديد الكل",
    "directive.baselines.selectNone": "إلغاء التحديد",
    "directive.baselines.cancel": "إلغاء",
    "directive.baselines.close": "إغلاق",
    "directive.baselines.executeCta": "دفع إلى {count} جهة",
    "directive.baselines.resultTitle": "اكتملت الدفعة #{pushId}",
    "directive.baselines.skippedObservation": "تخطّي (مراقبة)",
    "directive.baselines.historyTitle": "سجل الدفعات",
    "directive.baselines.historySubtitle":
      "كل دفعة قاعدة، الأحدث أولًا. التراجع يحذف السياسات المُنشأة من كل جهة مستهدفة — ويُسجَّل كإجراء توجيهي منفصل.",
    "directive.baselines.historyEmpty":
      "لا توجد دفعات بعد. اختر قاعدة أعلاه، حدّد الجهات، وادفع.",
    "directive.baselines.col.baseline": "القاعدة",
    "directive.baselines.col.targets": "الجهات",
    "directive.baselines.col.actions": "إجراءات",
    "directive.baselines.rollback": "تراجع",
    "directive.baselines.rollbackConfirm":
      "تراجع عن هذه الدفعة؟ ستُحذف سياسات Conditional Access التي أُنشئت من كل جهة مستهدفة. لا يمكن التراجع عن هذا من داخل Mizan — لإعادة التطبيق، ادفع القاعدة مرة أخرى.",
    "directive.baselines.rolledbackStatus": "تم التراجع",
    "directive.baselines.runningStatus": "قيد التنفيذ",
    "directive.baselines.details": "التفاصيل",
    "directive.baselines.hideDetails": "إخفاء التفاصيل",
    "directive.baselines.why": "لماذا يهمّ هذا",
    "directive.baselines.impact": "الأثر على المستخدمين",
    "directive.baselines.prerequisites": "المتطلبات المسبقة",
    "directive.baselines.rollout": "إرشادات التطبيق",
    "directive.baselines.docsLink": "مرجع Microsoft Learn",
    "directive.baselines.excludesOwnAdmins":
      "يستثني تلقائيًا مسؤولي الجهة العامّين (Global Admins)",
    "directive.baselines.selectedCount":
      "{count} من أصل {total} قاعدة محدَّدة",
    "directive.baselines.noneSelected":
      "اختر قاعدة أو أكثر للدفع.",

    "directive.baselines.reportOnlyChip": "يُشحَن بوضع التقارير",
    "directive.baselines.reportOnlySubtitle":
      "لا يُنفَّذ شيء حتى تُفعّل الجهة السياسة من مستأجر Entra لديها.",
    "directive.baselines.alreadyAppliedStatus": "مُطبَّق مسبقًا",
    "directive.baselines.alreadyAppliedExplain":
      "الجهة تمتلك هذه القاعدة مسبقًا (رُصدت عبر وسم Mizan). لم تُنشَأ سياسة جديدة — رصدها Mizan وجعل الدفع بلا أثر. عمود الحالة يُظهر الحالة داخل مستأجر الجهة الآن.",

    "directive.baselines.stateReportOnly": "تقارير فقط",
    "directive.baselines.stateEnabled": "مُفعَّلة (مُنفَّذة)",
    "directive.baselines.stateDisabled": "مُعطَّلة",
    "directive.baselines.stateUnknown": "غير معروفة",

    "directive.status.title": "حالة القواعد لكل جهة",
    "directive.status.subtitle":
      "للجهة المحدَّدة، يعرض أيٌّ من قواعد الكتالوج موجود في مستأجر Entra الخاص بالجهة حاليًا وما هي حالة كلٍّ منها — لترى إن حوّلت سياسةً من التقارير إلى مُفعَّلة بعد دفعك.",
    "directive.status.entityLabel": "الجهة",
    "directive.status.entityPlaceholder": "اختر جهة Directive…",
    "directive.status.refresh": "تحديث",
    "directive.status.refreshing": "جارٍ التحديث…",
    "directive.status.generatedAt": "تاريخ اللقطة",
    "directive.status.modeSimulated":
      "عرض محاكاة — مُعاد بناؤه من آخر دفعة إلى جهة العرض هذه",
    "directive.status.modeReal": "مباشر من مستأجر Entra للجهة",
    "directive.status.col.baseline": "القاعدة",
    "directive.status.col.present": "موجودة",
    "directive.status.col.state": "الحالة الحالية",
    "directive.status.col.observed": "وقت الرصد",
    "directive.status.presentYes": "نعم",
    "directive.status.presentNo": "غير موجودة",
    "directive.status.empty":
      "اختر جهة أعلاه — ستعرض المصفوفة كل القواعد الـ12 مع حالتها الحالية.",
    "directive.status.flippedWarn":
      "تختلف عن حالة التقارير التي دفعناها — الجهة فعّلت هذه السياسة",
    "directive.status.stillReportOnly":
      "لا تزال بوضع التقارير — لم تُفعّلها الجهة بعد",

    "custom.title": "سياسات CA مخصّصة",
    "custom.subtitle":
      "أنشئ سياسة Conditional Access لجهاتك — بدون كتابة JSON. تُحفَظ المسوّدات هنا؛ ادفعها عند الجاهزية. كل الدفعات مُوسَمة للتحقّق من التكرار والتراجع مثل القواعد.",
    "custom.newDraft": "سياسة مخصّصة جديدة",
    "custom.noDrafts":
      "لا توجد مسوّدات بعد. اضغط \"سياسة مخصّصة جديدة\" لفتح المعالج.",
    "custom.col.name": "الاسم",
    "custom.col.risk": "المخاطر",
    "custom.col.scope": "النطاق",
    "custom.col.state": "الحالة",
    "custom.col.updated": "آخر تحديث",
    "custom.col.actions": "الإجراءات",
    "custom.edit": "تعديل",
    "custom.delete": "حذف",
    "custom.confirmDelete":
      "هل تريد حذف هذه المسوّدة؟ لا يمكن التراجع.",
    "custom.clone": "نسخ",
    "custom.cloneFromBaseline": "نسخ كمسوّدة مخصّصة",
    "custom.scopeUsers.all": "كل المستخدمين",
    "custom.scopeUsers.none": "لا أحد",
    "custom.scopeUsers.roles": "أدوار دليل",
    "custom.scopeUsers.guests": "ضيوف وخارجيون",
    "custom.scopeApps.all": "كل التطبيقات",
    "custom.scopeApps.office365": "Office 365",
    "custom.scopeApps.adminPortals": "بوابات الإدارة",
    "custom.scopeApps.azureManagement": "إدارة Azure",
    "custom.scopeApps.specific": "تطبيقات محدّدة",
    "custom.grantKind.block": "حظر",
    "custom.grantKind.grantWithRequirements": "منح",

    "wizard.title": "معالج سياسة CA المخصّصة",
    "wizard.subtitle":
      "يُحفظ تلقائيًا. ادفع فقط بعد المراجعة.",
    "wizard.back": "العودة إلى /directive",
    "wizard.saving": "جارٍ الحفظ…",
    "wizard.saved": "تم الحفظ",
    "wizard.pushCta": "دفع إلى الجهات",
    "wizard.step.identify": "تعريف",
    "wizard.step.users": "المستخدمون",
    "wizard.step.apps": "التطبيقات",
    "wizard.step.conditions": "الشروط",
    "wizard.step.grant": "الوصول",
    "wizard.step.session": "الجلسة",
    "wizard.step.review": "المراجعة",

    "wizard.identify.name": "اسم السياسة",
    "wizard.identify.nameHint":
      "يظهر في Entra بالسابقة [Custom]. استخدم اسمًا واضحًا — \"حظر المصادقة القديمة للمالية\" أو \"MFA مقاومة للتصيد لمسؤولي الفواتير\" مثلًا.",
    "wizard.identify.description": "وصف داخلي (Mizan فقط)",
    "wizard.identify.state": "الحالة الأولية",
    "wizard.identify.stateReportOnly":
      "تقارير فقط — موصى به. تُسجَّل السياسة دون تنفيذها.",
    "wizard.identify.stateDisabled":
      "مُعطَّلة — تُنشأ السياسة ولكن لا تُطبَّق. مفيدة للمسوّدات.",
    "wizard.identify.stateEnabled":
      "مُفعَّلة — تُطبَّق السياسة فورًا على كل تسجيل دخول مطابق.",
    "wizard.identify.enabledWarn":
      "⚠ اخترتَ تنفيذ السياسة فورًا. تأكّد من محاكاتها ضد جهة عرض أولًا.",
    "wizard.identify.scope": "نطاق السياسة",
    "wizard.identify.scopeHint":
      "السياسات عبر المستأجرين تُبنى من قيم تعني الشيء نفسه في كل مستأجر Entra (كل المستخدمين، أدوار الدليل، الضيوف، تطبيقات Microsoft المنشورة، قوى المصادقة المدمجة). السياسات المُقيَّدة بمستأجر واحد يمكنها أيضًا الإشارة إلى مستخدمين ومجموعات ومواقع مسماة وTerms of Use وقوى مصادقة مخصّصة من جهة واحدة مختارة — مقابل أنها تُدفع إلى تلك الجهة فقط.",
    "wizard.identify.scopeCrossTenant": "عبر المستأجرين (الافتراضي)",
    "wizard.identify.scopeCrossTenantHint":
      "قابلة للدفع إلى عدّة جهات. تبقى منتقيات الخصائص المحلّية للمستأجر مخفيّة.",
    "wizard.identify.scopeTenantScoped": "مُقيَّدة بجهة واحدة",
    "wizard.identify.scopeTenantScopedHint":
      "تُفتح منتقيات المستخدمين والمجموعات والمواقع المسماة وToU وقوى المصادقة المخصّصة من المستأجر المرجعي المختار. الدفع مقصور على تلك الجهة.",

    "wizard.scope.crossTenant":
      "سياسة عبر المستأجرين — كل حقل يعمل في مستأجر Entra لأي جهة.",
    "wizard.scope.scopedTitle":
      "مُقيَّدة بـ {tenant}",
    "wizard.scope.scopedBody":
      "المعرّفات المحلّية (مستخدمون ومجموعات ومواقع مسماة وToU وقوى مصادقة مخصّصة) تُحلّ وفق هذه الجهة. الدفع مقصور عليها.",

    "wizard.users.includeTitle": "تطبيق على",
    "wizard.users.includeAll": "كل المستخدمين في المستأجر",
    "wizard.users.includeNone": "لا أحد (تعطيل)",
    "wizard.users.includeRoles": "أدوار دليل محدّدة",
    "wizard.users.includeGuests": "الضيوف والمستخدمون الخارجيون فقط",
    "wizard.users.rolesPickerLabel": "اختر دورًا أو أكثر",
    "wizard.users.rolesPickerHint":
      "معرّفات قوالب الأدوار واحدة في كل مستأجر، لذلك ستُطبَّق السياسة على الدور المطابق أينما دُفِعَت.",
    "wizard.users.guestTypesLabel": "اشمل هذه الأنواع من الضيوف",
    "wizard.users.externalTenantMembership":
      "طبّق على الضيوف من أي مستأجر خارجي",
    "wizard.users.excludeTitle": "استثناء",
    "wizard.users.excludeGaLabel":
      "استثنِ مسؤولي Global Administrators (قفل أمان)",
    "wizard.users.excludeGaHint":
      "يُبقي مسارًا للاسترداد في كل مستأجر. عطّلها فقط إن فهمتَ تمامًا خطر القفل.",
    "wizard.users.excludeRolesLabel":
      "واستثنِ أيضًا هذه الأدوار",
    "wizard.users.tenantLocalHint":
      "هذه الحقول تشير إلى مستخدمين ومجموعات محدّدين من المستأجر المرجعي. تُضاف فوق نوع \"التطبيق على\" المُختار أعلاه — \"كل المستخدمين + مستخدمين محدّدين مستثنين\" يعمل مثل Entra تمامًا.",
    "wizard.users.specificUsersLabel":
      "واشمل أيضًا هؤلاء المستخدمين (بحث حي على المستأجر المرجعي)",
    "wizard.users.specificGroupsLabel":
      "واشمل أيضًا هذه المجموعات",
    "wizard.users.excludeSpecificUsersLabel":
      "واستثنِ أيضًا هؤلاء المستخدمين",
    "wizard.users.excludeSpecificGroupsLabel":
      "واستثنِ أيضًا هذه المجموعات",

    "wizard.apps.targetTitle": "التطبيقات السحابية المستهدفة",
    "wizard.apps.targetAll": "كل التطبيقات السحابية",
    "wizard.apps.targetOffice365": "Office 365 (Exchange وSharePoint وTeams وOffice)",
    "wizard.apps.targetAdminPortals":
      "بوابات إدارة Microsoft (Entra وIntune وDefender وExchange وSharePoint وM365)",
    "wizard.apps.targetAzureManagement":
      "إدارة Azure (Azure portal وCLI وPowerShell وARM)",
    "wizard.apps.targetSpecific": "تطبيقات محدّدة",
    "wizard.apps.specificHint":
      "اختر من التطبيقات المنشورة من Microsoft أدناه، أو أضف تطبيقًا مخصّصًا بـ GUID. يجب أن تكون GUIDs المخصّصة موجودة في كل مستأجر مستهدَف.",
    "wizard.apps.excludeTitle": "استثنِ تطبيقات (اختياري)",
    "wizard.apps.addCustomGuid": "أضف تطبيقًا مخصّصًا بـ GUID",
    "wizard.apps.addCustomPlaceholder": "00000000-0000-0000-0000-000000000000",
    "wizard.apps.add": "إضافة",

    "wizard.conditions.title":
      "الشروط (كلها اختيارية — اتركها فارغة للمطابقة على أيّ قيمة)",
    "wizard.conditions.userRisk": "مستويات خطورة المستخدم",
    "wizard.conditions.signInRisk": "مستويات خطورة تسجيل الدخول",
    "wizard.conditions.platforms": "منصّات الجهاز",
    "wizard.conditions.clientAppTypes": "أنواع تطبيقات العميل",
    "wizard.conditions.locations": "المواقع",
    "wizard.conditions.locationsAny": "أي موقع",
    "wizard.conditions.locationsTrusted":
      "المواقع الموثوقة فقط (المواقع المسماة المحدَّدة كموثوقة)",
    "wizard.conditions.locationsSpecific":
      "مواقع مسماة محدّدة (من المستأجر المرجعي)",
    "wizard.conditions.namedLocationsHint":
      "المواقع المسماة مُعرَّفة لكل مستأجر. اختر واحدًا أو أكثر لإدراجه أو استثنائه. المواقع الموثوقة مُوسومة.",
    "wizard.conditions.namedLocationsEmpty":
      "لا توجد مواقع مسماة في هذا المستأجر.",
    "wizard.conditions.deviceFilter": "مُرشّح الجهاز",
    "wizard.conditions.deviceFilterHint":
      "ضيّق وفق خصائص الجهاز التي يُبلّغ بها تسجيل الدخول. تُربط القواعد بـ AND وتُترجم إلى نحو Entra عند الحفظ.",
    "wizard.conditions.deviceFilterEnable":
      "فعّل مُرشّح الجهاز",
    "wizard.conditions.deviceFilterAdd": "أضف قاعدة",

    "wizard.grant.title": "ماذا يحدث عند مطابقة الشروط؟",
    "wizard.grant.block": "حظر تسجيل الدخول",
    "wizard.grant.grantWithRequirements":
      "امنح تسجيل الدخول، ولكن اشترط التالي",
    "wizard.grant.operatorTitle": "ادمج المتطلبات بـ",
    "wizard.grant.operatorAnd": "كل المحدَّد (AND)",
    "wizard.grant.operatorOr": "أيّ المحدَّد (OR)",
    "wizard.grant.requireMfa": "اشترط مصادقة متعددة العوامل",
    "wizard.grant.authStrengthLabel":
      "اشترط قوة مصادقة محدَّدة (يتجاوز MFA العادية)",
    "wizard.grant.authStrengthNone": "(بلا — استخدم MFA عادية)",
    "wizard.grant.requireCompliantDevice": "اشترط جهازًا متوافقًا مع Intune",
    "wizard.grant.requireHybridJoined":
      "اشترط جهازًا هجين الانضمام",
    "wizard.grant.requireApprovedApp":
      "اشترط تطبيق عميل معتمد (iOS/Android)",
    "wizard.grant.requireCompliantApp":
      "اشترط سياسة حماية التطبيقات (Intune MAM)",
    "wizard.grant.requirePasswordChange":
      "افرض تغيير كلمة المرور (لسياسات معالجة المخاطر)",
    "wizard.grant.touLabel":
      "اتفاقيات Terms of Use (من المستأجر المرجعي)",
    "wizard.grant.touHint":
      "يجب أن يقبل المستخدم كل اتفاقية محدّدة لاستيفاء المنح. يجب أن تكون الاتفاقيات موجودة في المستأجر المرجعي مسبقًا.",
    "wizard.grant.touEmpty":
      "لا توجد اتفاقيات Terms of Use في هذا المستأجر.",

    "wizard.session.title":
      "ضوابط الجلسة (كلها اختيارية)",
    "wizard.session.signInFrequencyEnable":
      "افرض إعادة المصادقة بفاصل زمني",
    "wizard.session.signInFrequencyValue":
      "كل",
    "wizard.session.signInFrequencyTypeHours": "ساعات",
    "wizard.session.signInFrequencyTypeDays": "أيام",
    "wizard.session.persistentBrowser": "جلسات متصفّح دائمة",
    "wizard.session.persistentDefault": "اترك كما هو",
    "wizard.session.persistentNever": "لا تُديمها (تسجيل دخول عند كل إعادة فتح للمتصفّح)",
    "wizard.session.persistentAlways": "دائمة دائمًا",
    "wizard.session.appEnforced":
      "فعّل قيود فرضها التطبيق (وصول جزئي لـ SharePoint/OneDrive على الأجهزة غير المُدارة)",

    "wizard.review.title": "مراجعة ودفع",
    "wizard.review.riskTier": "درجة المخاطر المحسوبة",
    "wizard.review.grant": "ملخّص الوصول",
    "wizard.review.previewBody": "نص Graph الدقيق (معاينة)",
    "wizard.review.showBody": "إظهار نص Graph",
    "wizard.review.hideBody": "إخفاء نص Graph",
    "wizard.review.targetPickerTitle": "إلى أي جهات؟",
    "wizard.review.pushCta": "ادفع السياسة إلى {count} جهة",
    "wizard.review.cannotPushYet":
      "عالج أخطاء التحقّق في الخطوات السابقة قبل الدفع.",
    "wizard.review.scopedTargetOnly":
      "هذه السياسة مُقيَّدة بمستأجر واحد — الدفع مقصور على مستأجرها المرجعي. انسخ المسوّدة إن أردتَ الدفع إلى جهة أخرى.",

    "wizard.validation.nameRequired": "اسم السياسة مطلوب.",
    "wizard.validation.rolesRequired":
      "اختر دورًا واحدًا على الأقل عند استهداف الأدوار.",
    "wizard.validation.guestsRequired":
      "اختر نوع ضيف واحدًا على الأقل عند استهداف الضيوف.",
    "wizard.validation.specificAppsRequired":
      "أضف تطبيقًا واحدًا على الأقل عند استهداف تطبيقات محدّدة.",
    "wizard.validation.grantEmpty":
      "اختر متطلّبًا واحدًا على الأقل — أو اختر الحظر.",

    "rollback.preflightTitle": "قبل التراجع",
    "rollback.preflightIntro":
      "راجع ما الذي سيُحذَف. أي سياسة لا تزال بوضع التقارير يمكن حذفها بأمان. السياسات المُفعَّلة قامت الجهة بتفعيلها — حذفها يُزيل الضابط فورًا عنها.",
    "rollback.flipWarn":
      "الجهة حوّلتها إلى مُفعَّلة — التراجع سيُزيل الإنفاذ",
    "rollback.alreadyGone":
      "السياسة غير موجودة في الجهة — لا شيء لحذفه",
    "rollback.skipReason.already_rolledback": "تم التراجع مسبقًا",
    "rollback.skipReason.failed": "فشلت الدفعة — لا شيء للتراجع عنه",
    "rollback.skipReason.no_policy_id":
      "مطابقة عبر البصمة — هذه الدفعة لم تُنشئ السياسة",
    "rollback.col.tenant": "الجهة",
    "rollback.col.currentState": "الحالة الحالية",
    "rollback.col.action": "الإجراء",
    "rollback.actionWillDelete": "سيُحذَف",
    "rollback.actionSkip": "تخطٍّ",
    "rollback.perTenantCta": "تراجُع عن المحدَّد ({count})",
    "rollback.allCta": "تراجُع عن كل المؤهَّل",
    "rollback.cancel": "إلغاء",
    "rollback.confirmOne":
      "تراجَع من {tenant}؟ ستُحذَف سياسة CA من مستأجر Entra لديها.",

    "rollback.all.cta": "إزالة من كل الجهات",
    "rollback.all.confirmTitle":
      "إزالة هذه السياسة من كل جهة تمتلكها",
    "rollback.all.confirmBody":
      "سيحذف Mizan سياسة CA في كل مستأجر Entra دُفِعت إليه (عبر مطابقة الوسم، حتى لو أعادت الجهة تسميتها). لا يمكن التراجع — إعادة الدفع ستُنشئ سياسة جديدة بمعرّف Graph مختلف.",
    "rollback.all.confirmCta": "نعم، أزِل من كلها",
    "rollback.all.done":
      "أُزيلت من {count} جهة",

    // ---- Phase 5 Intune ----
    "intune.title": "قواعد وضع الأجهزة عبر Intune",
    "intune.subtitle":
      "ادفع سياسات توافق الأجهزة، وحماية التطبيقات (MAM)، وتهيئة النقاط الطرفية إلى الجهات الموافِقة. تُشحن السياسات بدون تخصيص افتراضيًا — ما يكافئ وضع التقارير في Intune. يقرّر مسؤول الجهة أي المستخدمين/الأجهزة تطبَّق عليهم. نفس نمط التحقّق والتراجع مثل Conditional Access.",
    "intune.platformFilter": "المنصّة",
    "intune.platformAll": "كل المنصّات",
    "intune.platform.iOS": "iOS",
    "intune.platform.Android": "Android",
    "intune.platform.Windows": "Windows",
    "intune.platform.macOS": "macOS",
    "intune.targets": "الأهداف",
    "intune.effect": "الأثر",
    "intune.pushCta": "دفع إلى الجهات",
    "intune.unassignedChip": "تُشحن بدون تخصيص",
    "intune.unassignedSubtitle":
      "تُنشأ السياسة لكنها لا تُطبّق على أي مستخدمين/أجهزة. يخصّصها مسؤول الجهة من بوابة Intune بعد المراجعة.",
    "intune.asrComingSoon.title": "قادم قريباً",
    "intune.asrComingSoon.body":
      "قواعد ASR مُعلَّقة حتى يُشحن إعادة كتابة المرحلة 14 إلى Settings Catalog. مخطط حماية النقاط الطرفية v1.0 في Microsoft Graph لا يكشف حقول ASR كمجموعة — تعيش على المورد التجريبي كخصائص فردية مُسمّاة. تبقى واجهة الكتالوج متاحة للمراجعة؛ يُفعَّل الدفع عند ترحيل Mizan الكاتب إلى Settings Catalog (`/deviceManagement/configurationPolicies`).",
    "intune.licenseNote":
      "تتطلّب ترخيص Intune في كل جهة مستهدفة (Microsoft 365 E3+ / A3+ / Intune P1 مستقل). الجهات غير المرخّصة تُرجع 403 عند الدفع.",

    "intune.baseline.iosCompliance.title": "توافق iOS — الحد الأدنى",
    "intune.baseline.iosCompliance.body":
      "أجهزة iOS / iPadOS تحتاج رمزًا رقميًا من 6 خانات، تقفل بعد 5 دقائق، غير مكسورة الحماية، وتعمل على iOS 16 أو أحدث. التشفير مفروض عبر اشتراط الرمز.",
    "intune.baseline.iosCompliance.why":
      "أجهزة iOS هي أكثر نقاط النهاية المحمولة شيوعًا في Microsoft 365 عند أغلب الجهات التنظيمية، وهي السطح الأكثر تعرّضًا للفقد والسرقة. الرمز + التشفير + حظر كسر الحماية أعلى عائد أمان لكل ضابط. يوافق CIS iOS L1 وNIST 800-124.",
    "intune.baseline.iosCompliance.impact":
      "الأجهزة غير المستوفية تُعلَّم 'غير متوافقة' في Intune. إن ارتبطت بقاعدة CA 'تتطلّب جهازًا متوافقًا' (المرحلة 3)، تُحظَر من Microsoft 365. العلاج: ضبط رمز، تحديث iOS، أو استبدال جهاز مكسور الحماية.",
    "intune.baseline.iosCompliance.prerequisites":
      "ترخيص Intune P1 لكل مستخدم. أجهزة iOS مسجّلة عبر Company Portal أو ADE أو User-affinity DEP. أجهزة قادرة على تشغيل iOS 16 (iPhone 8 أو أحدث).",
    "intune.baseline.iosCompliance.rollout":
      "أنشئ السياسة بدون تخصيص. اترك البيانات تتجمّع في Intune لـ 24 ساعة. ثم خصّصها لمجموعة تجريبية من 10 مستخدمين وراقب لوحة التوافق. وسّع التخصيص على 2–4 أسابيع.",

    "intune.baseline.androidCompliance.title": "توافق Android — الحد الأدنى",
    "intune.baseline.androidCompliance.body":
      "أجهزة Android بوضع العمل تحتاج رمزًا رقميًا من 6 خانات، وتشفير، واعتماد Google Play Protect (SafetyNet)، وأن لا تكون روت، وتعمل على Android 12 أو أحدث.",
    "intune.baseline.androidCompliance.why":
      "تجزّؤ Android يجعل حد الـ OS أهم من iOS. Android 12 يفرض التخزين المقصور، وإعادة ضبط الأذونات، ومؤشرات الخصوصية — تقليل ملموس لسطح التسرّب. مع اعتماد Play Protect، يُغلق نمط هجوم الجهاز المسروق/الروت.",
    "intune.baseline.androidCompliance.impact":
      "الأجهزة التي تعمل على Android < 12 أو بنُسخ غير معتمدة تصبح غير متوافقة. الأجهزة القديمة (قبل 2020؛ معظم الأجهزة الاقتصادية) قد تحتاج استبدال. إخفاقات SafetyNet غالبًا تشير إلى صورة مشغّل بدون Play Services.",
    "intune.baseline.androidCompliance.prerequisites":
      "ترخيص Intune P1. أجهزة مسجّلة عبر Android Enterprise (وضع العمل أو إدارة كاملة). Google Play Services متوفّرة.",
    "intune.baseline.androidCompliance.rollout":
      "جرد الأجهزة التي تعمل على Android < 12 قبل التخصيص. امنح المستخدمين 30–60 يومًا للتحديث أو الاستبدال. ابدأ بمجموعة تجريبية، راقب عدد غير المتوافقين، ثم وسّع.",

    "intune.baseline.windowsCompliance.title": "توافق Windows — الحد الأدنى",
    "intune.baseline.windowsCompliance.body":
      "أجهزة Windows 10/11 تحتاج BitLocker على قرص النظام، Secure Boot، TPM، حماية Defender الفورية + antivirus + antispyware، جدار الحماية، كلمة مرور أبجدية-رقمية 8 أحرف تقفل خلال 15 دقيقة، وعلى الأقل Windows 10.0.19045 (22H2).",
    "intune.baseline.windowsCompliance.why":
      "BitLocker + Secure Boot + TPM ثلاثية الدفاع ضد الهجوم المادي. Defender + Firewall ثلاثية الدفاع أثناء التشغيل. 22H2 آخر تحديث مدعوم لـ Win10 — أي أقدم خارج الدعم ويُراكم CVEs. هذا الحد الأدنى الذي لا يستطيع أي CISO الدفاع عن ما هو دونه.",
    "intune.baseline.windowsCompliance.impact":
      "الأجهزة بدون TPM 1.2+ / Secure Boot (معظم ما قبل 2018) تصبح غير متوافقة. الإنفاذ مع CA يحظرها من Microsoft 365. على المشغّل تحديد دورات تجديد الأجهزة قبل التخصيص الواسع.",
    "intune.baseline.windowsCompliance.prerequisites":
      "ترخيص Intune P1. أجهزة مسجّلة عبر Autopilot أو Hybrid Entra Join أو Entra Join. Windows 10 21H2+ أو Windows 11. TPM 1.2 أو أحدث؛ جهاز داعم لـ Secure Boot.",
    "intune.baseline.windowsCompliance.rollout":
      "أكبر تأثير على تجديد الأجهزة بين كل القواعد — جرد تغطية TPM / Secure Boot أولًا. ابدأ بأسطول IT المُدار. وسّع على ربع سنة متوافقًا مع خطط التجديد.",

    "intune.baseline.macosCompliance.title": "توافق macOS — الحد الأدنى",
    "intune.baseline.macosCompliance.body":
      "أجهزة macOS تحتاج رمزًا أبجديًا رقميًا من 8 أحرف يقفل خلال 15 دقيقة، FileVault، SIP، جدار حماية مع وضع التخفّي، Gatekeeper على App Store + مطوّرين معرّفين، وعلى الأقل macOS Ventura 13.0.",
    "intune.baseline.macosCompliance.why":
      "macOS يشحن بإعدادات افتراضية قوية لكن المستخدمين يعطّلونها. إيقاف FileVault يترك الأقراص مقروءة عند السرقة. إيقاف Gatekeeper يشغّل برامج غير موقّعة. فرض الافتراضيات عبر Intune يبقيها قائمة حتى عبر إعادة تنصيب المستخدمين.",
    "intune.baseline.macosCompliance.impact":
      "المستخدمون الذين عطّلوا FileVault يُطالبون بتفعيله (يتطلّب إعادة تشغيل). تتوقّف برامج المطوّرين غير الموقّعة عن العمل. احتكاك خفيف؛ لا أثر على الأجهزة من 2018+.",
    "intune.baseline.macosCompliance.prerequisites":
      "ترخيص Intune P1. أجهزة Mac مسجّلة عبر UAMDM أو ABM. macOS Monterey 12+ لكل الإعدادات؛ Ventura 13 الحد الأدنى للتكافؤ الكامل.",
    "intune.baseline.macosCompliance.rollout":
      "تفعيل FileVault مزعج — خطّطه مع المستخدمين بدل الدفع الصامت. ابدأ بأجهزة IT والمالية، ثم وسّع.",

    "intune.baseline.iosMam.title": "حماية تطبيقات iOS (MAM)",
    "intune.baseline.iosMam.body":
      "تحمي البيانات المؤسّسية داخل Outlook وTeams وWord وExcel وOneDrive وEdge وسائر تطبيقات Microsoft على iOS — بلا تسجيل جهاز. تحظر النسخ/اللصق من التطبيقات المُدارة إلى الشخصية، تحظر Save-As إلى السحب الشخصية، تشترط PIN من 6 خانات، تمسح البيانات المؤسسية عند كشف كسر الحماية، تفرض إعادة مصادقة بعد 30 دقيقة عدم اتّصال، تحظر الطباعة، تفرض Edge المُدار لفتح الروابط.",
    "intune.baseline.iosMam.why":
      "MAM تعمل على الأجهزة غير المسجّلة وBYOD — السطح الذي لا تغطّيه سياسات التوافق المبنيّة على التسجيل. حظر النسخ/اللصق + Save-As يُغلق مسار التسرّب العَرضي الشائع؛ مسح كسر الحماية يُغلق المسار الخبيث. ضابط عالي العائد بلا تكلفة أجهزة أو تسجيل.",
    "intune.baseline.iosMam.impact":
      "يرى المستخدمون PIN للتطبيقات عند أول تشغيل لأي تطبيق مؤسسي. النسخ من Outlook إلى WhatsApp يفشل صامتًا. Save-As من Word إلى iCloud الشخصي يفشل. روابط التطبيقات المؤسسية تُفتح في Edge لا Safari.",
    "intune.baseline.iosMam.prerequisites":
      "ترخيص Intune P1. مستخدمون مسجّلون الدخول في تطبيقات Microsoft بحساب العمل.",
    "intune.baseline.iosMam.rollout":
      "آمن للإنفاذ واسعًا — بلا تغييرات على مستوى الجهاز، بلا تبعية أجهزة. تواصل بتوقّع PIN قبل التخصيص.",

    "intune.baseline.androidMam.title": "حماية تطبيقات Android (MAM)",
    "intune.baseline.androidMam.body":
      "موازية لـ iOS MAM، للتطبيقات المؤسسية على Android — بلا تسجيل. حظر النسخ/اللصق وSave-As، PIN 6 خانات، مسح الروت، إعادة مصادقة بعد 30 دقيقة، حظر الطباعة، حظر التقاط الشاشة، Edge المُدار للروابط.",
    "intune.baseline.androidMam.why":
      "نفس منطق iOS MAM لكن Android غالبًا يكون به BYOD أوسع — MAM تملأ تلك الفجوة دون الحاجة إلى إدارة كاملة. حظر التقاط الشاشة تخفيف خاص بـ Android ضد التسرّب عبر لقطات الشاشة.",
    "intune.baseline.androidMam.impact":
      "نفس iOS MAM بالإضافة إلى: لا يستطيع المستخدمون التقاط شاشة التطبيقات المؤسّسية. شرط المتصفّح المُدار يعني أن Chrome يفتح الروابط غير المؤسّسية (حيثما ضُبط).",
    "intune.baseline.androidMam.prerequisites":
      "ترخيص Intune P1. تطبيقات مسجَّل الدخول إليها بحساب العمل. Google Play Services متوفّرة (أجهزة Android بدون GMS لا تدعم MAM).",
    "intune.baseline.androidMam.rollout":
      "كما iOS MAM — آمن للإنفاذ واسعًا.",

    "intune.baseline.windowsBitlocker.title": "فرض BitLocker على Windows",
    "intune.baseline.windowsBitlocker.body":
      "ملف تعريف حماية نقطة طرفية يُفعّل BitLocker مع تشفير XTS-AES 256-bit على قرص النظام وأقراص البيانات الثابتة، يشترط مصادقة تشغيل عبر TPM (بدون PIN)، يحتفظ بمفاتيح الاسترداد في Entra، ويحظر الكتابة على الأقراص القابلة للإزالة غير المشفَّرة.",
    "intune.baseline.windowsBitlocker.why":
      "قاعدة توافق Windows تفحص BitLocker؛ هذا الملف يفرضه. اشحنهما معًا: التوافق يُبلّغ عن الأجهزة غير المتوافقة، وهذا الملف يعيدها إلى التوافق بتفعيل التشفير. احتفاظ المفاتيح في Entra يعني أن نسيان PIN لا يجعل الجهاز غير قابل للاستخدام.",
    "intune.baseline.windowsBitlocker.impact":
      "الأجهزة بدون BitLocker تبدأ التشفير بصمت في الخلفية (~30 دقيقة إلى ساعتين). لا تغيير مرئي بعد الاكتمال، ما عدا الأقراص القابلة للإزالة — الكتابة على USB غير مشفَّر محظورة.",
    "intune.baseline.windowsBitlocker.prerequisites":
      "Intune P1. TPM 1.2+ متوفّر. Windows Pro / Enterprise / Education (BitLocker غير متوفّر في Home). Entra Join أو Hybrid Join (لحفظ المفاتيح).",
    "intune.baseline.windowsBitlocker.rollout":
      "اختبر على جهاز IT تجريبي أولًا — تحقّق من مسار استرداد المفتاح بتحفيز الاسترداد عمدًا. ثم خصّص لأسطول IT، ثم للعموم. حظر كتابة الأقراص القابلة للإزالة الاحتكاك الأكبر؛ تواصل قبل التخصيص.",

    // ---- Phase 14 ASR rules ----
    "intune.baseline.asrOfficeChildProcesses.title":
      "ASR — حظر العمليات الفرعية لـ Office (تدقيق)",
    "intune.baseline.asrOfficeChildProcesses.body":
      "حظر تطبيقات Office (Word/Excel/PowerPoint/Outlook) من إنشاء عمليات فرعية. يوقف تشغيل cmd.exe / powershell.exe المُحفَّز عبر الماكرو — ناقل وصول أوّل بارز عبر حملات التصيّد. يُشحَن بوضع التدقيق.",
    "intune.baseline.asrOfficeChildProcesses.why":
      "سلاسل تنفيذ ماكرو Office تبدأ غالبًا بـ winword.exe → cmd.exe أو excel.exe → powershell.exe. CISA + Microsoft توصي بهذه القاعدة كأعلى ضابط ASR ROI.",
    "intune.baseline.asrOfficeChildProcesses.impact":
      "وضع التدقيق: Defender يُسجّل الأحداث دون تدخّل. Block: ماكرو شرعي يُولّد عمليات خارجية (نادر) يحتاج استثناء عبر ASR exclusions قبل التحويل.",
    "intune.baseline.asrOfficeChildProcesses.prerequisites":
      "Defender for Endpoint P1 أو P2. أجهزة على Defender. تيليمتري التدقيق ظاهرة في Defender XDR.",
    "intune.baseline.asrOfficeChildProcesses.rollout":
      "تدقيق 14 يومًا. راجع Defender → Reports → ASR → Audit. استثنِ السلاسل الشرعية. حوّل إلى Block.",

    "intune.baseline.asrExecutableContentEmail.title":
      "ASR — حظر المحتوى التنفيذي من البريد (تدقيق)",
    "intune.baseline.asrExecutableContentEmail.body":
      "حظر المحتوى التنفيذي (.exe / .scr / .ps1 / .vbs / .js) من إطلاقه عبر مرفقات البريد والبريد الإلكتروني. وضع التدقيق.",
    "intune.baseline.asrExecutableContentEmail.why":
      "البريد ناقل البرمجيات الخبيثة الأول. حتى مع تصفية Defender for Office، تتسرّب أحيانًا تنفيذيات؛ هذه القاعدة شبكة أمان النقطة الطرفية.",
    "intune.baseline.asrExecutableContentEmail.impact":
      "Audit: تسجيل فقط. Block: المستخدمون الذين يفتحون مرفقات .exe شرعية (نادر) يُحظرون. تواصل قبل التحويل.",
    "intune.baseline.asrExecutableContentEmail.prerequisites":
      "Defender for Endpoint. أجهزة على Defender.",
    "intune.baseline.asrExecutableContentEmail.rollout":
      "تدقيق → مراجعة → Block.",

    "intune.baseline.asrCredentialTheft.title":
      "ASR — حظر سرقة الاعتمادات من LSASS (تدقيق)",
    "intune.baseline.asrCredentialTheft.body":
      "حظر سرقة الاعتمادات من Windows LSASS. يوقف أدوات Mimikatz من قراءة الاعتمادات المُجزّأة من ذاكرة lsass.exe. وضع التدقيق.",
    "intune.baseline.asrCredentialTheft.why":
      "تفريغ اعتمادات LSASS الخطوة المعيارية بعد الاستغلال في الحركة الجانبية. Mimikatz ومشتقّاته يعمل على المضيفين غير المُحدَّثين.",
    "intune.baseline.asrCredentialTheft.impact":
      "Audit: رؤية أي عملية تلمس LSASS. Block: أدوات الاعتماد الشرعية (وكلاء النسخ الاحتياطي مثلًا) تحتاج استثناء أولًا.",
    "intune.baseline.asrCredentialTheft.prerequisites":
      "Defender for Endpoint. LSA Protection (Credential Guard) مُفعَّل أيضًا للدفاع المتعدّد.",
    "intune.baseline.asrCredentialTheft.rollout":
      "تدقيق 30 يومًا. راجع. Block.",

    "intune.baseline.asrJsVbsLaunchExe.title":
      "ASR — حظر JS/VBS من تشغيل التنفيذيات المُنزَّلة (تدقيق)",
    "intune.baseline.asrJsVbsLaunchExe.body":
      "حظر JavaScript أو VBScript من تشغيل المحتوى التنفيذي الذي نزّلوه. يُغلق سلسلة 'تصيّد → JS dropper → برنامج فدية'. وضع التدقيق.",
    "intune.baseline.asrJsVbsLaunchExe.why":
      "JS droppers (.js متنكّر كمستندات) تكتيك متكرّر للوصول الأوّل. WSH الأصلي في Windows يُشغّلها افتراضيًا.",
    "intune.baseline.asrJsVbsLaunchExe.impact":
      "Audit: تسجيل فقط. Block: تطبيقات قديمة تستخدم WSH لتثبيت مكوّنات تحديث قد تُعطَب — استثنِ عبر Defender.",
    "intune.baseline.asrJsVbsLaunchExe.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrJsVbsLaunchExe.rollout":
      "تدقيق 14 يومًا، راجع، استثنِ، Block.",

    "intune.baseline.asrPsExecWmi.title":
      "ASR — حظر إنشاء العمليات عبر PSExec + WMI (تدقيق)",
    "intune.baseline.asrPsExecWmi.body":
      "حظر إنشاء العمليات الناشئ عن أوامر PSExec وWMI. يوقف تكتيك حركة جانبية شائع. وضع التدقيق.",
    "intune.baseline.asrPsExecWmi.why":
      "PSExec وWMI أدوات حركة جانبية موثَّقة لـ red-team وبرامج الفدية. كثير من المؤسسات لا تستخدمها شرعيًا على النقاط الطرفية.",
    "intune.baseline.asrPsExecWmi.impact":
      "Audit: شاهد من يستخدمها شرعيًا. إيجابيات خاطئة شائعة: SCCM، بعض وكلاء المراقبة. استثنِ قبل Block.",
    "intune.baseline.asrPsExecWmi.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrPsExecWmi.rollout":
      "تدقيق 21 يومًا. راجع. Block.",

    "intune.baseline.asrUntrustedUsb.title":
      "ASR — حظر العمليات غير الموثوقة/غير الموقّعة من USB (تدقيق)",
    "intune.baseline.asrUntrustedUsb.body":
      "حظر العمليات غير الموثوقة وغير الموقّعة التي تعمل من أقراص USB. يوقف سلسلة هجوم 'وصِّل USB خبيث'. وضع التدقيق.",
    "intune.baseline.asrUntrustedUsb.why":
      "البرمجيات الخبيثة عبر USB نادرة لكن عالية الأثر. فحص ASR للتوقيعات سريع وقليل الإيجابيات الخاطئة.",
    "intune.baseline.asrUntrustedUsb.impact":
      "Audit: شاهد نشاط تنفيذيات USB. Block: المثبّتات الموقّعة الشرعية تعمل. التنفيذيات غير الموقّعة (أدوات IT مخصّصة) تحتاج استثناء.",
    "intune.baseline.asrUntrustedUsb.prerequisites":
      "Defender for Endpoint.",
    "intune.baseline.asrUntrustedUsb.rollout":
      "تدقيق 14 يومًا، استثنِ، Block.",

    // ---- Phase 11a SharePoint ----
    "sharepoint.title": "إعدادات SharePoint للمشاركة الخارجية على مستوى المستأجر",
    "sharepoint.subtitle":
      "إعدادات SharePoint على مستوى المستأجر تتحكّم بكيفية مشاركة المستخدمين للملفات خارجيًا. PATCH على singleton `/admin/sharepoint/settings`. لا زرّ تراجع — الإعدادات تُعدَّل مباشرةً؛ سجل التدقيق يحتفظ بالفرق before/after للعودة اليدوية.",
    "sharepoint.licenseNote":
      "كل القواعد تستهدف إعدادات موجودة في كل مستأجر SharePoint Online — بلا ترخيص إضافي.",
    "sharepoint.singletonNote":
      "تنبيه: إعدادات SharePoint singleton لكل مستأجر، ليست سياسة منفصلة. دفع قاعدة يُعدّل إعدادات المستأجر مباشرةً. لا زرّ تراجع — السجل يلتقط before/after؛ التراجع يدوي عبر مركز إدارة SharePoint للجهة.",
    "sharepoint.effect": "الأثر",
    "sharepoint.pushCta": "دفع إلى الجهات",

    "sharepoint.baseline.strictExternalSharing.title":
      "مشاركة خارجية صارمة — ضيوف فقط، بلا روابط مجهولة",
    "sharepoint.baseline.strictExternalSharing.body":
      "حدّ المشاركة الخارجية بـ 'الضيوف الموثَّقون فقط' — بلا روابط مجهولة. انتهاء صلاحية الروابط المجهولة 30 يومًا.",
    "sharepoint.baseline.strictExternalSharing.why":
      "الروابط المجهولة ناقل تسرّب البيانات الأول في SharePoint. فرض الضيوف الموثَّقين يعني أن كل مستلم خارجي مُسجَّل ومرتبط بهوية حقيقية.",
    "sharepoint.baseline.strictExternalSharing.impact":
      "روابط 'anyone' الحالية تتوقّف. المستخدمون الذين يشاركون خارجيًا يرون شاشة تسجيل دخول للمستلم. تواصل قبل الدفع.",
    "sharepoint.baseline.strictExternalSharing.prerequisites":
      "SharePoint Online مُفعَّل. خطّط لأي روابط 'anyone' نشطة.",
    "sharepoint.baseline.strictExternalSharing.rollout":
      "شغّل استعلام تدقيق لاستخدام AnonymousLink في آخر 30 يومًا. تواصل مع المستخدمين النشطين. ادفع.",

    "sharepoint.baseline.defaultLinkInternal.title":
      "نوع الرابط الافتراضي 'داخلي' + 'View'",
    "sharepoint.baseline.defaultLinkInternal.body":
      "الافتراضي عند أول نقرة 'داخلي' (ضمن المؤسسة) بصلاحية 'View'. يستطيع المستخدمون اختيار خارجي + تعديل عمدًا، لكن الافتراضي الآمن داخلي للقراءة فقط.",
    "sharepoint.baseline.defaultLinkInternal.why":
      "معظم حوادث 'مشاركة خارجية بالخطأ' من الافتراضات الأولى. داخلي + View كافتراضي يُزيل الفخ الأشيع.",
    "sharepoint.baseline.defaultLinkInternal.impact":
      "يرى المستخدمون 'داخلي' محدَّدًا في كل حوار مشاركة. لا يزال بإمكانهم التغيير. احتكاك بسيط لمن يشاركون خارجيًا اعتياديًا؛ رفع أمان ملموس للبقية.",
    "sharepoint.baseline.defaultLinkInternal.prerequisites":
      "SharePoint Online مُفعَّل.",
    "sharepoint.baseline.defaultLinkInternal.rollout":
      "آمن للدفع مباشرة. تواصل مع المستخدمين القويّين.",

    "sharepoint.baseline.domainAllowList.title":
      "قائمة سماح بالنطاقات لمشاركة الضيوف (placeholder)",
    "sharepoint.baseline.domainAllowList.body":
      "حوّل وضع نطاقات المشاركة إلى قائمة سماح. تُشحن بقائمة فارغة — على المشغّل إضافة نطاقات شركاء الجهة قبل الدفع الواسع.",
    "sharepoint.baseline.domainAllowList.why":
      "إذا كنت تعرف أن الجهة تتعاون مع N شركاء محدّدين، قائمة السماح تقطع كل نطاق آخر — بما فيها نطاقات منتحلي التصيّد.",
    "sharepoint.baseline.domainAllowList.impact":
      "المشاركة لأي نطاق ليس على القائمة تفشل. مع قائمة فارغة، كل المشاركة الخارجية تفشل. اضبط القائمة قبل الدفع.",
    "sharepoint.baseline.domainAllowList.prerequisites":
      "جرد لنطاقات الشركاء الشرعيين. عدّل القائمة قبل الدفع.",
    "sharepoint.baseline.domainAllowList.rollout":
      "ادفع فقط بعد اكتمال قائمة نطاقات الشركاء.",

    "sharepoint.baseline.anonymousLinksOff.title":
      "تعطيل الروابط المجهولة كليًا",
    "sharepoint.baseline.anonymousLinksOff.body":
      "أصرم موقف: المستخدمون الخارجيون الموجودون فقط من سبق وأن صادقوا. لا مشاركة خارجية جديدة، لا روابط مجهولة.",
    "sharepoint.baseline.anonymousLinksOff.why":
      "للجهات عالية الحساسية (دفاع، قضائية، استخبارات)، الافتراضي الوحيد المقبول. لا مسار تسرّب عَرضي.",
    "sharepoint.baseline.anonymousLinksOff.impact":
      "تعاون خارجي صافي جديد عبر SharePoint يتوقّف. المتعاونون الخارجيون الحاليون يستمرّون. التعاون الخارجي الجديد يمرّ عبر دعوة B2B.",
    "sharepoint.baseline.anonymousLinksOff.prerequisites":
      "نضج تشغيلي للتعامل مع B2B كمسار التعاون الخارجي الوحيد.",
    "sharepoint.baseline.anonymousLinksOff.rollout":
      "تنسيق واسع قبل الدفع. ملف جهة محدّد فقط.",

    // ---- Phase 14b IOC push ----
    "ioc.title": "IOC — دفع مؤشّرات التهديد",
    "ioc.subtitle":
      "ادفع مؤشّرات (تجزئة ملف / URL / نطاق / IP) إلى Defender for Endpoint للجهة كقوائم حظر. كل IOC له صلاحية انتهاء؛ الدفعات idempotent (وسم Mizan في الوصف)؛ التراجع يحذف المؤشّر من كل مستأجر.",
    "ioc.licenseNote":
      "يتطلّب Defender for Endpoint في كل جهة مستهدَفة. المؤشّرات الموجودة (مطابقة بوسم Mizan) لا تُكرَّر.",
    "ioc.formTitle": "إضافة مؤشّر جديد",
    "ioc.field.type": "نوع المؤشّر",
    "ioc.field.value": "قيمة المؤشّر",
    "ioc.field.action": "الإجراء عند المطابقة",
    "ioc.field.severity": "الشدّة",
    "ioc.field.description": "الوصف (يظهر في Defender)",
    "ioc.field.internalNote": "ملاحظة داخلية (Mizan فقط)",
    "ioc.field.expirationDateTime": "ينتهي (افتراضي: 90 يومًا)",
    "ioc.field.targetTenants": "ادفع إلى الجهات",
    "ioc.action.allow": "السماح (قائمة بيضاء)",
    "ioc.action.alert": "تنبيه فقط",
    "ioc.action.alertAndBlock": "تنبيه + حظر (موصى به)",
    "ioc.action.block": "حظر بصمت",
    "ioc.severity.informational": "معلوماتي",
    "ioc.severity.low": "منخفض",
    "ioc.severity.medium": "متوسط",
    "ioc.severity.high": "عالٍ",
    "ioc.type.fileHashSha256": "تجزئة ملف (SHA-256)",
    "ioc.type.fileHashSha1": "تجزئة ملف (SHA-1)",
    "ioc.type.url": "URL",
    "ioc.type.domainName": "نطاق",
    "ioc.type.ipv4": "عنوان IPv4",
    "ioc.type.ipv6": "عنوان IPv6",
    "ioc.submit": "ادفع إلى {count} جهة",
    "ioc.recentTitle": "آخر IOCs",
    "ioc.recentEmpty": "لا توجد IOCs مدفوعة بعد.",
    "ioc.col.value": "القيمة",
    "ioc.col.action": "الإجراء",
    "ioc.col.severity": "الشدّة",
    "ioc.col.expires": "ينتهي",
    "ioc.col.created": "وقت الدفع",
    "ioc.descriptionHint":
      "وصف نصّي حر؛ Mizan يضع بادئة `[Mizan IOC <id>]` تلقائيًا للعثور عليه عند التراجع.",

    // ---- Phase 6 DLP (coming soon — waiting on Microsoft Graph) ----
    "dlp.title": "قواعد منع تسرّب البيانات (DLP)",
    "dlp.subtitle":
      "كتالوج DLP مُنسَّق. يُفتَح الدفع يوم تُتيح Microsoft واجهة تأليف DLP الكاملة على Graph — نقاط Beta الحالية تغطّي جزءًا صغيرًا فقط. الكتالوج أدناه جاهز: راجعه مع جهاتك حتى تعرف الاتجاه مسبقًا.",
    "dlp.previewBanner.title": "قريبًا",
    "dlp.previewBanner.body":
      "Microsoft Graph لا تُتيح بعد واجهة تأليف DLP الكاملة (استثناءات القواعد، وإشعارات المستخدمين، وتقارير الحوادث، وDLP النقطة الطرفية، وأغلب أنواع الشروط). حين تُغلق Microsoft تلك الفجوة، تُفتَح كل البطاقات هنا تلقائيًا — بلا إعادة نشر.",
    "dlp.surface": "السطح",
    "dlp.baseline.blockSensitiveExternal.title":
      "حظر المشاركة الخارجية للبيانات الحسّاسة",
    "dlp.baseline.blockSensitiveExternal.body":
      "عبر Exchange وSharePoint وOneDrive وTeams، احظر الإرسال/المشاركة الخارجية للمحتوى المطابق لأنواع المعلومات الحسّاسة المدمجة (بطاقات ائتمان، أرقام هوية، بيانات مالية، سجلات صحية). اسمح بمبرر عمل لاستثناءات مختارة.",
    "dlp.baseline.blockCredentialExfil.title":
      "حظر تسرّب الاعتمادات",
    "dlp.baseline.blockCredentialExfil.body":
      "اكتشاف أنماط الأسرار — مفاتيح Azure Service Principal، مفاتيح AWS، GitHub PAT، مفاتيح PEM الخاصة — في البريد والدردشة الصادرة. احظر الإرسال، نبّه المسؤول. أقوى قاعدة DLP إشارةً في معظم المستأجرين.",
    "dlp.baseline.blockBulkExfil.title":
      "رصد نقل البيانات بالجملة",
    "dlp.baseline.blockBulkExfil.body":
      "حذّر المستخدم وأبلغ المسؤول عندما يُحرّك إجراء واحد >100 ملف أو >500 ميجابايت إلى سحابة خارجية أو تخزين شخصي. إشارة سلوكية — تُمسك تسرّب الموظّف المغادر.",
    "dlp.baseline.regulatedDataLabels.title":
      "حظر المشاركة الخارجية للبيانات المُوسَّمة",
    "dlp.baseline.regulatedDataLabels.body":
      "احظر المشاركة الخارجية لأي محتوى مُوسَّم Confidential أو Highly Confidential في هرمية تصنيفات المرحلة 7. أبسط وأقوى قاعدة DLP، لكنها تعتمد على وجود التصنيفات أولًا.",

    // ---- Phase 7 Sensitivity Labels (coming soon — waiting on Microsoft Graph) ----
    "labels.title": "تصنيفات الحساسية",
    "labels.subtitle":
      "كتالوج هرمية تصنيفات + تصنيف تلقائي مُنسَّق. يُفتَح الدفع حين تُتيح Microsoft واجهة تأليف التصنيفات الكاملة على Graph — نقاط Beta الحالية تُنشئ تصنيفات أساسية لكن لا تُهيّئ التشفير ولا وضع العلامات ولا النشر ولا قواعد التصنيف التلقائي. الكتالوج أدناه جاهز للمراجعة.",
    "labels.previewBanner.title": "قريبًا",
    "labels.previewBanner.body":
      "Microsoft Graph تُنشئ تصنيفات أساسية اليوم لكنها لا تُهيّئ بعد الإعدادات المهمّة عمليًا — التشفير، علامات المحتوى، الحماية، سياسات نشر التصنيفات، قواعد التصنيف التلقائي. حين تُتيح Microsoft تلك، تُفتَح كل البطاقات هنا تلقائيًا.",
    "labels.baseline.hierarchy4.title":
      "هرمية تصنيفات من 4 مستويات",
    "labels.baseline.hierarchy4.body":
      "إنشاء تصنيفات Public / Internal / Confidential / Highly Confidential. هيكل أساسي ظاهر للمستخدم يستخدمه كل كيان بنفس الشكل. إعدادات التشفير ووضع العلامات (مطلوبة عمليًا) تحتاج طبقة PS.",
    "labels.baseline.autoLabelInternal.title":
      "تصنيف تلقائي للبريد الداخلي",
    "labels.baseline.autoLabelInternal.body":
      "كل بريد صادر من مستخدم داخلي إلى متلقٍ داخلي يُصنَّف تلقائيًا 'Internal'. يُزيل حالة 'بلا تصنيف' التي تُضعف كل قاعدة DLP لاحقة.",
    "labels.baseline.autoLabelSensitive.title":
      "تصنيف تلقائي للمحتوى الحسّاس",
    "labels.baseline.autoLabelSensitive.body":
      "المحتوى المطابق لأنواع المعلومات الحسّاسة المدمجة يُصنَّف تلقائيًا Confidential أو Highly Confidential حسب الشدّة. يربط كشف DLP بالإنفاذ المُستند إلى التصنيف.",

    // ---- Phase 9 Attack Simulation (قريبًا) ----
    "attackSim.title": "تدريب محاكاة الهجمات",
    "attackSim.subtitle":
      "جدولة محاكاة تصيّد + تدريبات وعي مُنسَّقة. يُفتَح الدفع حين تُتيح Microsoft واجهة إنشاء + جدولة المحاكاة على Graph بشكل عام — جانب القراءة موصول بالفعل.",
    "attackSim.previewBanner.title": "قريبًا",
    "attackSim.previewBanner.body":
      "Microsoft Graph تُتيح قراءة محاكاة الهجمات لكن واجهة الإنشاء + الجدولة في Beta فقط. حين تُعمَّم الواجهة، تُفتَح كل البطاقات هنا تلقائيًا.",
    "attackSim.baseline.quarterlyPhishing.title":
      "محاكاة تصيّد ربع سنوية",
    "attackSim.baseline.quarterlyPhishing.body":
      "جدولة محاكاة تصيّد ضد كل المستخدمين المرخّصين كل 90 يومًا. باستخدام مكتبة Microsoft المنسَّقة؛ توزيع عشوائي بين أنماط حصاد الاعتمادات والروابط في المرفقات والبرمجيات الخبيثة في المرفقات. اتجاهات معدّل النقر لكل جهة عبر الزمن.",
    "attackSim.baseline.newHireTraining.title":
      "تسجيل تلقائي للموظّفين الجدد في التدريب",
    "attackSim.baseline.newHireTraining.body":
      "كل مستخدم جديد مرخّص يُسجَّل تلقائيًا في دورة التوعية ضد التصيّد من Microsoft خلال 30 يومًا من تخصيص الترخيص. بلا توفير يدوي. يُغلق فجوة 'الموظّف الجديد هدف أسهل'.",
    "attackSim.baseline.repeatOffender.title":
      "إعادة تدريب من تكرّر وقوعه",
    "attackSim.baseline.repeatOffender.body":
      "المستخدمون الذين نقروا أو أدخلوا اعتمادات في المحاكاة الأخيرة يحصلون على تدريب متابعة خلال 7 أيام. يتراكم عبر المحاكاة — من يقع للمرة الثالثة يُحفّز إشعارًا للمدير المباشر.",

    // ---- Phase 12 PIM + الحوكمة (قريبًا) ----
    "pim.title": "PIM + حوكمة الهوية",
    "pim.subtitle":
      "سياسات تفعيل الأدوار ذات الامتياز + مراجعات الوصول + Terms of Use. أغلب مسارات الكتابة على Graph اليوم؛ تبقى قريبًا حتى يستقرّ عقد CRUD عبر المستأجرين.",
    "pim.previewBanner.title": "قريبًا",
    "pim.previewBanner.body":
      "كتابات PIM + حوكمة الهوية تنزل على Graph غالبًا اليوم، لكن إعدادات سياسة إدارة الأدوار + كتالوجات entitlement-management بها حوافّ خشنة في CRUD عبر المستأجرين. الكتالوج أدناه يُشحن الآن؛ تنفيذ المرحلة 12 الكامل ينزل حين يستقرّ العقد.",
    "pim.baseline.mfaOnActivation.title":
      "اشتراط MFA عند تفعيل PIM",
    "pim.baseline.mfaOnActivation.body":
      "كل تفعيل لدور ذي امتياز يشترط MFA لحظة التفعيل، حتى لو كانت جلسة المسؤول مُحقَّقة بـ MFA. أكثر ضوابط PIM ذكرًا في عمليات التدقيق.",
    "pim.baseline.maxActivation8h.title":
      "تحديد التفعيل بـ 8 ساعات",
    "pim.baseline.maxActivation8h.body":
      "أقصى مدة تفعيل 8 ساعات؛ تنتهي تلقائيًا. يستطيع المسؤولون طلب أقصر (مثلًا ساعة لتغيير محدّد) لكن ليس أطول. يُقلّل سطح الحركة الجانبية الناتج عن 'نسي إلغاء التفعيل في عطلة الأسبوع'.",
    "pim.baseline.justificationRequired.title":
      "تبرير مطلوب عند التفعيل",
    "pim.baseline.justificationRequired.body":
      "يشترط التفعيل تبريرًا نصّيًا لا يقلّ عن 20 حرفًا. يُحفظ على صفّ تدقيق role-assignment-schedule، ويظهر في سجل تدقيق Mizan بجوار حدث التفعيل.",
    "pim.baseline.notificationOnActivation.title":
      "إشعار عند التفعيل",
    "pim.baseline.notificationOnActivation.body":
      "بريد فريق الأمن + مدير المسؤول المباشر يُبلَّغان عند كل تفعيل لدور ذي امتياز. يَكشف سيناريو 'المسؤول المتمرّد' مبكرًا؛ مع سجل التدقيق للسياق الجنائي.",
    "pim.baseline.quarterlyAccessReview.title":
      "مراجعة وصول ربع سنوية للأدوار ذات الامتياز",
    "pim.baseline.quarterlyAccessReview.body":
      "مراجعة وصول ربع سنوية لكل تخصيص دور ذي امتياز (مؤهَّل + مُفعَّل). المراجِعون = سلسلة مدير الدور. الإزالة التلقائية للتخصيصات غير المُراجَعة عند الموعد النهائي تُغلق فجوة 'نسوا أن لديهم Global Admin من مشروع قبل سنتين'.",

    // ---- Phase 13 موافقة التطبيقات (قريبًا) ----
    "appConsent.title": "سياسات موافقة التطبيقات",
    "appConsent.subtitle":
      "ضوابط موافقة OAuth. تُقيّد أي تطبيقات طرف ثالث يمكن للمستخدمين الموافقة عليها بدون إذن مسؤول. تُغلق سطح تصيّد موافقة OAuth.",
    "appConsent.previewBanner.title": "قريبًا",
    "appConsent.previewBanner.body":
      "موافقة التطبيقات + سير عمل موافقة المسؤول على Graph اليوم. قوائم السماح بالناشرين المُتحقَّقين + مجموعات الأذونات المُوافَق عليها سلفًا تختلف بين المستأجرين. كتالوج قريبًا الآن؛ تنفيذ المرحلة 13 الفعلي بعد ذلك.",
    "appConsent.baseline.verifiedOnly.title":
      "تقييد الموافقة على ناشرين مُتحقَّقين فقط",
    "appConsent.baseline.verifiedOnly.body":
      "يستطيع المستخدمون الموافقة فقط على تطبيقات من ناشرين مُتحقَّقين من Microsoft. التطبيقات غير المُتحقَّقة تتطلّب موافقة مسؤول. تُغلق سطح تصيّد موافقة OAuth — أحد أبرز نواقل الهجوم الحالية.",
    "appConsent.baseline.adminWorkflow.title":
      "تفعيل سير عمل طلب موافقة المسؤول",
    "appConsent.baseline.adminWorkflow.body":
      "حين يصطدم المستخدمون بتطبيق محظور، يستطيعون تقديم طلب موافقة مسؤول عبر بوابة Microsoft 365. المراجعون المُعيَّنون (Cloud Application Administrators) يوافقون أو يرفضون في مركز إدارة Entra. يُزيل ضريبة 'فقط عطّلها للجميع'.",
    "appConsent.baseline.blockHighRisk.title":
      "إذن مسؤول دائمًا للأذونات عالية المخاطر",
    "appConsent.baseline.blockHighRisk.body":
      "حظر موافقة المستخدمين على التطبيقات التي تطلب أذونات عالية المخاطر: Mail.ReadWrite وFiles.ReadWrite.All وSites.FullControl.All وApplication.ReadWrite.All وDirectory.ReadWrite.All. هذه الأذونات تُمكّن أكثر مسارات استخراج البيانات شيوعًا.",
    "appConsent.baseline.preapproveLowRisk.title":
      "موافقة مُسبقة للأذونات منخفضة المخاطر",
    "appConsent.baseline.preapproveLowRisk.body":
      "موافقة مُسبقة على مجموعة الأذونات منخفضة المخاطر (User.Read وopenid وprofile وemail وoffline_access). يُحافظ على تسجيل دخول سلس للتطبيقات المشروعة؛ يُقلّل ضوضاء بريد موافقة المسؤول.",

    // ---- Phase 15 الإعدادات الافتراضية للهوية (قريبًا) ----
    "tenantIdentity.title": "إعدادات الهوية الافتراضية للمستأجر",
    "tenantIdentity.subtitle":
      "سياسة طرق المصادقة، صلاحيات المستخدم الافتراضية، ثقة الوصول عبر المستأجرين. تُكمل قصّة تقوية الهوية بجانب Conditional Access.",
    "tenantIdentity.previewBanner.title": "قريبًا",
    "tenantIdentity.previewBanner.body":
      "إعدادات الهوية الافتراضية على `/authenticationMethodsPolicy` و`/authorizationPolicy` ونقاط cross-tenant access. المخطّطات تتحرّك (إعادة تسمية FIDO2 → passkey، تنقيح B2B trust). كتالوج قريبًا الآن؛ التنفيذ الفعلي حين تستقرّ المخطّطات.",
    "tenantIdentity.baseline.fido2TenantWide.title":
      "FIDO2 / passkey مُفعَّل على مستوى المستأجر",
    "tenantIdentity.baseline.fido2TenantWide.body":
      "السماح + التوصية بـ FIDO2 / passkey لكل المستخدمين على مستوى المستأجر. يقترن مع قاعدة phishing-resistant MFA للمسؤولين في المرحلة 3 بضمان أن المستخدمين قادرون أصلًا على تسجيل مفتاح.",
    "tenantIdentity.baseline.blockUserAppRegistration.title":
      "تسجيل التطبيقات للمسؤولين فقط",
    "tenantIdentity.baseline.blockUserAppRegistration.body":
      "Application Administrators فقط (وما يكافئها) يستطيعون تسجيل تطبيقات Entra. صلاحية افتراضية `allowedToCreateApps: false`. تُزيل سلسلة هجوم 'مستخدم متمرّد ينشئ تطبيقًا، يوافق على نفسه، يُسرّب البيانات'.",
    "tenantIdentity.baseline.blockUserTenantCreation.title":
      "إنشاء المستأجرات للمسؤولين فقط",
    "tenantIdentity.baseline.blockUserTenantCreation.body":
      "حظر إنشاء مستأجرات Entra جديدة من قِبل المستخدمين العاديين. صلاحية افتراضية `allowedToCreateTenants: false`. تُغلق مسار تسرّب غريب ينقل البيانات إلى مستأجر جديد يتحكّم به المستخدم.",
    "tenantIdentity.baseline.restrictDefaultUserPerms.title":
      "تقييد صلاحيات المستخدم الافتراضية",
    "tenantIdentity.baseline.restrictDefaultUserPerms.body":
      "دور المستخدم الافتراضي لم يعد قادرًا على قراءة كل كائنات الدليل، أو إنشاء مجموعات Microsoft 365، أو دعوة الضيوف. دعوات الضيوف تُفوَّض إلى دور Guest Inviter.",
    "tenantIdentity.baseline.crossTenantTrustMfa.title":
      "ثقة بـ MFA + التوافق من مستأجرات شريكة",
    "tenantIdentity.baseline.crossTenantTrustMfa.body":
      "ثقة بادعاءات MFA + الجهاز المتوافق الواردة من مستأجرات شريكة مُحدَّدة (B2B collaboration). تتجنّب طلبات MFA المكرّرة في تعاون B2B المشروع دون خفض المعيار للمستأجرات غير المعروفة.",
    "tenantIdentity.baseline.blockPersonalLinking.title":
      "حظر ربط الحسابات الشخصية",
    "tenantIdentity.baseline.blockPersonalLinking.body":
      "تعطيل ربط حسابات LinkedIn وما يماثلها. تُزيل سطح 'ربط LinkedIn الشخصي بهويّتي المؤسسية' الذي استُغلّ في تصيّد ربط الاعتمادات.",

    "baseline.prohibitAdminDeactivation.title":
      "منع تعطيل حسابات المسؤولين",
    "baseline.prohibitAdminDeactivation.body":
      "اشتراط أن يستوفي أي مسؤول يدخل بوابات Microsoft Entra / Azure / M365 الإدارية: MFA + جهاز متوافق + تسجيل دخول حديث خلال الساعة الماضية. لا يستطيع الوصول المشروط اعتراض استدعاء واجهة Disable-account نفسه، لكنه يجعل كل سطح إداري مميّز عالي الاحتكاك؛ بالاقتران مع كشف Mizan لسجل التدقيق (الجهة ← الهوية)، تصبح حالات التعطيل غير المعتمدة مرئية ومحاطة بحواجز.",
    "baseline.prohibitAdminDeactivation.why":
      "تعطيل حساب مسؤول خطوة كلاسيكية لإزالة الاستمرارية في الهجمات المتقدمة. اشتراط MFA حديث من جهاز مُدار يرفع سقف هذه العملية الحساسة بشكل كبير.",
    "baseline.prohibitAdminDeactivation.impact":
      "يحتاج المسؤولون المميّزون إلى إعادة المصادقة بـ MFA + جهاز متوافق كل ساعة عند العمل في البوابات الإدارية. الجلسات الحالية تبقى نشطة خلال الساعة. لا تأثير على عمليات القراءة فقط أو المستخدمين غير المسؤولين.",
    "baseline.prohibitAdminDeactivation.prerequisites":
      "تحتاج الجهة إلى Entra ID P1 (أو أعلى) وسياسة امتثال Intune واحدة على الأقل ليتمكن شرط الجهاز المتوافق من المطابقة. مسؤول الجهة الحالي مُستثنى تلقائيًا حتى لا يحبس نفسه خارج البوابة.",
    "baseline.prohibitAdminDeactivation.rollout":
      "النشر في وضع التقرير-فقط أولاً (الافتراضي). راقب سجلات الدخول لمدة أسبوع كامل لرصد المسؤولين الذين قد يُتحدّون في أوقات حرجة (حسابات CI، نوافذ دعم الموردين). أضف الاستثناءات المسماة ثم فعّل الإنفاذ.",

    "baseline.requireMfaForAdmins.title": "طلب MFA لأدوار المسؤولين",
    "baseline.requireMfaForAdmins.body":
      "كل دور دليل ذي امتياز (Global Admin وSecurity Admin وExchange وSharePoint وUser وApp وCloud App وAuthentication وHelpdesk وIntune وBilling وPrivileged Role وConditional Access Administrator) يجب أن يُحقّق المصادقة متعددة العوامل. وضع التقارير فقط افتراضيًا.",
    "baseline.requireMfaForAdmins.why":
      "حسابات المسؤولين هي الهدف الأعلى قيمة في أي مستأجر. اختراق Global Admin يتيح تسريب البريد، وتدوير الأسرار، وزراعة أبواب خلفية، وتعطيل التدقيق. فرض MFA على أدوار المسؤولين هو التوصية الأولى لدى Microsoft ويوافق CIS 5.1 وNIST 800-63 AAL2 وNESA UAE-IAM-5.",
    "baseline.requireMfaForAdmins.impact":
      "كل مستخدم معيَّن في أحد الأدوار الـ13 ذات الامتياز سيُطالَب بعامل ثانٍ في كل تسجيل دخول جديد لم يُحقّق MFA مسبقًا. الجلسات القائمة لا تُقطع. يجب استثناء حسابات الكسر في حالات الطوارئ على مستوى المستأجر قبل الإنفاذ.",
    "baseline.requireMfaForAdmins.prerequisites":
      "Entra ID P1 أو أعلى لكل مسؤول مستهدَف. تسجيل أسلوب MFA واحد على الأقل لكل مسؤول (تطبيق Authenticator، مفتاح FIDO2، أو هاتف). وحساب طوارئ موثَّق يبقى مستثنى.",
    "baseline.requireMfaForAdmins.rollout":
      "شغّله بوضع التقارير لمدة 7–14 يومًا. راجع سجلات تسجيل الدخول ضمن Monitoring → Sign-ins مُرشَّحة بـ Conditional Access → Report-only: Success. تحقّق من تسجيل كل مسؤول لطريقة MFA. ثم حوّل إلى enabled.",
    "baseline.blockLegacyAuth.title": "حظر المصادقة القديمة",
    "baseline.blockLegacyAuth.body":
      "حظر تسجيلات الدخول باستخدام بروتوكولات المصادقة القديمة (IMAP وPOP وSMTP basic وExchange ActiveSync basic وعملاء آخرون). المصادقة الحديثة غير متأثرة. وضع التقارير فقط افتراضيًا؛ يُستثنى مسؤولو Global Admin تلقائيًا حتى لا يتسبب عميل قديم يعمل على جهاز مسؤول في قفله.",
    "baseline.blockLegacyAuth.why":
      "بروتوكولات المصادقة القديمة لا تدعم MFA، لذا تبقى كل سياسة MFA أخرى قابلة للتجاوز ما دامت مفتوحة. تُرجع بيانات Microsoft Threat Intelligence أكثر من 99% من نجاح هجمات رشّ كلمات المرور إلى المصادقة القديمة. تعطيلها أعلى تغيير عائدًا في Entra.",
    "baseline.blockLegacyAuth.impact":
      "أي عميل لا يزال يستخدم المصادقة الأساسية (Outlook قديم، أجهزة Scan-to-email، نصوص برمجية، تطبيقات مؤسسية تستخدم SMTP AUTH / IMAP / POP) سيفشل في تسجيل الدخول. المستخدمون على Outlook الحديث وTeams وOWA وOutlook للجوّال غير متأثرين.",
    "baseline.blockLegacyAuth.prerequisites":
      "جرد لأي حسابات خدمة / طابعات متعددة الوظائف / تطبيقات مؤسسية تستخدم SMTP AUTH أو IMAP أو POP. وخطة لترحيلها إلى Graph أو OAuth 2.0 قبل الإنفاذ.",
    "baseline.blockLegacyAuth.rollout":
      "وضع التقارير 14–30 يومًا. رشّح سجلات تسجيل الدخول بـ Client app = 'Other clients' / 'IMAP' / 'POP' / 'SMTP' — كل نتيجة هي محاولة مصادقة قديمة ستُحظر عند الإنفاذ. عالج كلًا منها قبل التحويل إلى enabled.",
    "baseline.requireCompliantDevice.title": "طلب جهاز متوافق لتطبيقات Office 365",
    "baseline.requireCompliantDevice.body":
      "تطبيقات Office 365 (Exchange Online وSharePoint وTeams وOffice web/desktop) تتطلب إما جهازًا متوافقًا مع Intune أو جهازًا هجينًا متصلًا بـ Entra. يمنع تسرّب البيانات إلى الأجهزة الشخصية / غير المُدارة. وضع التقارير فقط افتراضيًا؛ يُستثنى مسؤولو Global Admin تلقائيًا.",
    "baseline.requireCompliantDevice.why":
      "اعتماد صحيح + جهاز غير مُدار هو المسار المعياري لاختراق سلسلة التوريد / BYOD: يستخرج المهاجم رمز التحديث على حاسوب شخصي ويستعمله لتفريغ صناديق البريد. ربط الوصول بحالة الجهاز يجعل الاعتماد وحده غير كافٍ.",
    "baseline.requireCompliantDevice.impact":
      "يفقد المستخدمون على أجهزة شخصية أو BYOD الوصول إلى Exchange / SharePoint / Teams حتى يُسجَّل الجهاز في Intune (ويجتاز التوافق) أو يكون هجين الانضمام. النقاط الطرفية المؤسسية المُدارة غير متأثرة.",
    "baseline.requireCompliantDevice.prerequisites":
      "مستأجر Intune مع سياسات توافق مُعرَّفة، أو ضبط AD/Entra الهجين. ترخيص Intune للمستخدمين. وخطة تواصل مع مستخدمي BYOD الذين يحتاجون إلى التسجيل.",
    "baseline.requireCompliantDevice.rollout":
      "ابدأ بوضع التقارير. راجع فئة 'غير متوافق' في Intune device compliance — سجّل أو عالج كلًا منها. شغّل 7 أيام تنقُّص. ثم حوّل إلى enabled، ويفضَّل خارج ساعات العمل.",

    "baseline.requireMfaAllUsers.title": "طلب MFA لجميع المستخدمين",
    "baseline.requireMfaAllUsers.body":
      "يجب على كل مستخدم في المستأجر تحقيق MFA عند تسجيل الدخول لأي تطبيق سحابي. يُستثنى Global Administrators على مستوى السياسة لإبقاء مسار استرداد. وضع التقارير فقط افتراضيًا.",
    "baseline.requireMfaAllUsers.why":
      "المصادقة بكلمة مرور فقط يتجاوزها 99% من الهجمات الآلية وفق تقرير Microsoft Digital Defense. فرض MFA على مستوى المستأجر يغلق أكثر مسار اختراق شيوعًا وهو ضابط أساسي في CIS Level 1 وNESA.",
    "baseline.requireMfaAllUsers.impact":
      "كل مستخدم سيُطالَب بـ MFA في تسجيلات الدخول الجديدة التي لم تحقّقه (عادةً كل 90 يومًا لكل جهاز). المستخدمون بلا أسلوب MFA مسجَّل سيُرسَلون إلى التسجيل المدمج في تسجيل الدخول التالي.",
    "baseline.requireMfaAllUsers.prerequisites":
      "Entra ID P1 على مستوى المستأجر. تمكين التسجيل المدمج. خطة للمستخدمين بلا هاتف محمول (مفاتيح FIDO2 / Windows Hello كبديل).",
    "baseline.requireMfaAllUsers.rollout":
      "وضع التقارير لـ 14 يومًا على الأقل أثناء قيادة التسجيل. راقب Sign-in logs → Conditional Access → Report-only Failure للمستخدمين الذين كانوا سيُحظرون. عالج التسجيل، ثم فرّض.",

    "baseline.blockHighSignInRisk.title": "حظر تسجيلات الدخول عالية الخطورة",
    "baseline.blockHighSignInRisk.body":
      "يحسب Entra Identity Protection درجة خطورة لكل عملية تسجيل دخول بناءً على الموقع الشاذ والسفر المستحيل والاعتمادات المسرَّبة وشذوذ الرموز. هذه القاعدة تحظر أي تسجيل دخول مصنَّف 'عالٍ'. وضع التقارير فقط افتراضيًا.",
    "baseline.blockHighSignInRisk.why":
      "حكم 'خطورة عالية' لتسجيل الدخول من Identity Protection يرتبط باختراق حقيقي في أكثر من 85% من الحالات (قياسات Microsoft الداخلية). حظره يوقف الهجوم أثناء الجلسة لا بعدها.",
    "baseline.blockHighSignInRisk.impact":
      "المستخدمون المُعلَّمون بخطورة عالية سيُحظرون ويجب أن يتواصلوا مع Helpdesk لاستعادة الوصول. معدل الإيجابيات الخاطئة منخفض لكنه غير صفري في حالات VPN أو السفر المشروع — يلزم إجراء استجابة.",
    "baseline.blockHighSignInRisk.prerequisites":
      "Entra ID P2 (Identity Protection). كتيّب تشغيل Helpdesk لحالات القفل المُبلَّغ عنها. مسؤول معيَّن لمراجعة تنبيهات Identity Protection يوميًا.",
    "baseline.blockHighSignInRisk.rollout":
      "وضع التقارير لـ 14 يومًا. قارن بـ Identity Protection → Risky sign-ins المُرشَّحة بـ 'high'. تحقّق أن كلًا منها مشبوه فعلًا. ثم فرّض.",

    "baseline.requirePasswordChangeHighUserRisk.title":
      "طلب تغيير كلمة المرور عند خطورة مستخدم عالية",
    "baseline.requirePasswordChangeHighUserRisk.body":
      "عندما يرفع Entra Identity Protection خطورة مستخدم إلى 'عالٍ' (غالبًا من موجزات الاعتمادات المسرَّبة)، يُجبَر على تغيير كلمة المرور وإعادة تحقيق MFA في تسجيل الدخول التالي. الإصلاح الذاتي يقلّل زمن الاستجابة للحوادث بشكل كبير.",
    "baseline.requirePasswordChangeHighUserRisk.why":
      "الخطورة العالية للمستخدم تعني غالبًا أن الاعتماد يدور علنًا (مواقع اللصق، قواعد بيانات الاختراق). إجبار تغيير كلمة المرور تلقائيًا يغلق النافذة دون تدخل Helpdesk، مع الاحتفاظ بـ MFA حتى لا يستطيع مهاجم بالاعتماد المسرَّب وحده تدويرها.",
    "baseline.requirePasswordChangeHighUserRisk.impact":
      "يرى المستخدمون المتأثرون محث إعادة تعيين كلمة المرور ذاتيًا عند تسجيل الدخول التالي. يجب إتمام SSPR + MFA لاستعادة الوصول. الجلسات القائمة لا تُقطع لكنها ستُجبَر على إعادة المصادقة.",
    "baseline.requirePasswordChangeHighUserRisk.prerequisites":
      "Entra ID P2 لكل مستخدم مستهدَف. تمكين SSPR. تسجيل المستخدمين لـ SSPR (عبر التسجيل المدمج).",
    "baseline.requirePasswordChangeHighUserRisk.rollout":
      "وضع التقارير لـ 7 أيام للتحقق من معدل تسجيل SSPR. إن كان منخفضًا فادفع التسجيل أولًا. ثم فرّض.",

    "baseline.phishingResistantMfaAdmins.title":
      "MFA مقاوم للتصيد لأدوار المسؤولين",
    "baseline.phishingResistantMfaAdmins.body":
      "يجب أن يستخدم المسؤولون طرقًا مقاومة للتصيد فقط — مفاتيح FIDO2 أو Windows Hello for Business أو المصادقة القائمة على الشهادات. يُرفض الدفع بـ Authenticator العادي وSMS.",
    "baseline.phishingResistantMfaAdmins.why":
      "إرهاق الدفع ووسطاء التصيد الفوريون (Evilginx وEvilProxy) يتجاوزون MFA العادية روتينيًا. توجيهات CISA وNSA منذ 2023 تشترط صراحةً طرقًا مقاومة للتصيد للحسابات ذات الامتياز. هذه السياسة تُرسّخ تلك الحدود.",
    "baseline.phishingResistantMfaAdmins.impact":
      "المسؤولون دون تسجيل FIDO2 / Windows Hello / CBA يفقدون الوصول حتى يسجّلوا. دفع Authenticator العادي وSMS سيُرفضان للأدوار المدرَجة.",
    "baseline.phishingResistantMfaAdmins.prerequisites":
      "مفاتيح FIDO2 مُشتراة وموزَّعة، أو Windows Hello for Business مطروح، أو تهيئة CBA. يجب أن تسمح سياسة Authentication methods في Entra بالطريقة المختارة.",
    "baseline.phishingResistantMfaAdmins.rollout":
      "وضع التقارير أثناء توزيع المفاتيح. تابع التسجيل عبر تقرير Entra Authentication methods usage. حوّل إلى enabled فقط عندما يمتلك كل مسؤول طريقة مقاومة للتصيد مسجَّلة.",

    "baseline.requireMfaGuests.title":
      "طلب MFA للضيوف والمستخدمين الخارجيين",
    "baseline.requireMfaGuests.body":
      "يجب أن يُحقّق كل نوع هوية خارجية (B2B collaboration guests وB2B members وB2B direct-connect users وservice providers وinternal guests وother external users) مصادقة MFA. يغلق أشيع مسار اختراق سلسلة التوريد.",
    "baseline.requireMfaGuests.why":
      "حسابات الضيوف هي الناقل الأول لاختراق سلسلة التوريد في M365 — تسجيل دخول شريك مُخترَق يصبح حركة جانبية إلى مستأجرك. فرض MFA على الضيوف يُزيل مسار 'حساب شريك موثوق → داخل مستأجرك'.",
    "baseline.requireMfaGuests.impact":
      "كل متعاون خارجي سيُطالَب بـ MFA في أول تسجيل دخول لأي مورد في المستأجر. إن كان المستأجر الأصلي للضيف يفرض MFA وإعدادات الوصول عبر المستأجرين تثق بادعاءات MFA الواردة، فقد لا يُطالَب مجددًا.",
    "baseline.requireMfaGuests.prerequisites":
      "تهيئة Entra External Identities. مراجعة إعدادات الوصول عبر المستأجرين — قرر قبول ادعاءات MFA الواردة من مستأجرات الشركاء.",
    "baseline.requireMfaGuests.rollout":
      "آمن للإنفاذ مباشرة في معظم المستأجرات — الضيوف أقل حجمًا والسياسة وقائية بحتة. إن كان لديك شركاء قدماء بلا MFA فشغّل وضع التقارير أولًا واستخرجهم من Sign-in logs.",

    "baseline.adminSignInFrequency4h.title":
      "تردّد تسجيل دخول كل 4 ساعات للمسؤولين",
    "baseline.adminSignInFrequency4h.body":
      "تفرض جلسات المسؤولين إعادة المصادقة كل 4 ساعات. بلا هذه السياسة، يبقى رمز الجلسة الصادر لمسؤول صالحًا حتى 90 يومًا — نافذة كاملة في يد مهاجم إن سُرق.",
    "baseline.adminSignInFrequency4h.why":
      "سرقة رموز الجلسات (عبر التصيد الوسيط، والبرمجيات السارقة، وسرقة الكوكيز) تهزم MFA لأن الرمز يمثّل مصادقة مكتملة. تقصير تردّد تسجيل الدخول يحدّ من الزمن الذي يبقى فيه رمز مسؤول مسروق مفيدًا.",
    "baseline.adminSignInFrequency4h.impact":
      "يعيد المسؤولون المصادقة (كلمة مرور + MFA) كل 4 ساعات من الاستخدام الفعّال. ضبط جلسة فقط — لا يغيّر من يسجّل الدخول، بل فقط كم مرة يُثبت ذلك.",
    "baseline.adminSignInFrequency4h.prerequisites":
      "لا شيء إضافي بعد تعيينات الأدوار القائمة. يجب أن يقبل المسؤولون التراجع في الراحة.",
    "baseline.adminSignInFrequency4h.rollout":
      "وضع التقارير لـ 3–5 أيام لتأكيد أن الفاصل يناسب سير العمل. زد إلى 8 أو 12 ساعة إن كان 4 ساعات مزعجًا. فرّض بعد تكيّف المسؤولين.",

    "baseline.adminNoPersistentBrowser.title":
      "لا جلسات متصفّح دائمة للمسؤولين",
    "baseline.adminNoPersistentBrowser.body":
      "يُعطّل 'البقاء مسجّلًا؟' للحسابات ذات الامتياز. المسؤول الذي يغلق متصفّحه يجب أن يسجّل الدخول مجددًا في الجلسة التالية، حتى على جهازه الأساسي.",
    "baseline.adminNoPersistentBrowser.why":
      "كوكيز المتصفح الدائمة تبقى صالحة بعد ابتعاد المستخدم. على محطة مشتركة أو حاسوب مفقود، هذه الكوكي تكفي للدخول إلى مركز إدارة Entra. حظر الديمومة يُلغي مسار حركة جانبية رخيص.",
    "baseline.adminNoPersistentBrowser.impact":
      "يرى المسؤولون محث تسجيل دخول جديد في كل مرة يُعيدون فتح المتصفح بعد إغلاقه كليًا. يبقون يستفيدون من SSO داخل الجلسة نفسها.",
    "baseline.adminNoPersistentBrowser.prerequisites":
      "لا شيء. إنه ضبط جلسة على مستوى السياسة فقط.",
    "baseline.adminNoPersistentBrowser.rollout":
      "آمن للإنفاذ مباشرة. أثر UX بسيط والربح الأمني فوري.",

    "baseline.compliantDeviceAdminPortals.title":
      "جهاز متوافق لبوابات الإدارة",
    "baseline.compliantDeviceAdminPortals.body":
      "الوصول إلى بوابات إدارة Microsoft (Entra admin وAzure portal وDefender XDR وIntune وExchange admin وSharePoint admin وM365 admin) يتطلب جهازًا متوافقًا أو هجين الانضمام. يمنع مهام الإدارة من نقطة طرفية شخصية / غير مُدارة.",
    "baseline.compliantDeviceAdminPortals.why":
      "حتى MFA المقاومة للتصيد لا تحمي من اختطاف الجلسة من جهاز شخصي مُصاب ببرمجية خبيثة. ربط الوصول إلى بوابات الإدارة بتوافق الجهاز يرفع أرضية الهجوم إلى 'اختراق جهاز مُدار' — أصعب بكثير.",
    "baseline.compliantDeviceAdminPortals.impact":
      "المسؤولون على أجهزة شخصية / غير مُدارة لا يستطيعون الوصول إلى أي بوابة إدارة Microsoft. الحواسيب المُدارة، وWindows 365 Cloud PCs، وأجهزة هجين الانضمام غير متأثرة.",
    "baseline.compliantDeviceAdminPortals.prerequisites":
      "سياسات توافق Intune أو Entra hybrid join. كل مسؤول يمتلك جهازًا مُدارًا أو Cloud PC.",
    "baseline.compliantDeviceAdminPortals.rollout":
      "وضع التقارير لـ 7 أيام. تحقّق أن كل مسؤول يمتلك جهازًا متوافقًا ظاهرًا في Intune. ثم فرّض.",

    "baseline.requireMfaAzureManagement.title":
      "طلب MFA لإدارة Azure",
    "baseline.requireMfaAzureManagement.body":
      "MFA مطلوبة لكل تسجيل دخول إلى مستوى التحكم في Azure (Azure portal وAzure CLI وAzure PowerShell وARM REST). أعلى سطح نصف قطر تفجير في المستأجر. وضع التقارير فقط افتراضيًا؛ يُستثنى Global Admins تلقائيًا.",
    "baseline.requireMfaAzureManagement.why":
      "كل من يصل إلى ARM برمز صالح يستطيع جرد الاشتراكات وإعادة تهيئتها أو تدميرها بالكامل. حماية مستوى التحكم بـ MFA هي سياسة Azure المرجعية لدى Microsoft وتوافق NIST 800-53 AC-2(12) وISO 27001 A.9.4.2.",
    "baseline.requireMfaAzureManagement.impact":
      "تسجيلات دخول Azure portal / CLI / PowerShell / ARM تُطالَب بـ MFA. الـ Service principals والـ managed identities غير متأثرة (تسجّل الدخول بشهادات أو أسرار لا باعتمادات مستخدم).",
    "baseline.requireMfaAzureManagement.prerequisites":
      "Entra ID P1. مراجعة الـ Service principals المستخدمة في CI/CD وتحويلها إلى federated credentials حيثما أمكن.",
    "baseline.requireMfaAzureManagement.rollout":
      "وضع التقارير لـ 7–14 يومًا. تحقّق أن خطوط CI/CD لا تُطلق السياسة (لا ينبغي — تستخدم اعتمادات تطبيقات). ثم فرّض.",

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
    "vuln.kpi.zeroDay": "ثغرات يوم الصفر",
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
    "vuln.cols.fixPrefix": "الإصلاح",
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
    "nav.menu.open": "فتح القائمة",
    "nav.menu.close": "إغلاق القائمة",
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
    "ds.compliance.detail": "{framework}",
    "ds.compliance.detail.generic": "لا يوجد إطار محدد",
  },
} as const;

export type DictKey = keyof (typeof DICT)["en"];
