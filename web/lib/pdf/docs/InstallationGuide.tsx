import { Text, View } from "@react-pdf/renderer";
import {
  Bullet,
  Callout,
  Code,
  buildDefaultMeta,
  HandoffDocument,
  H1,
  H2,
  Note,
  NumBullet,
  P,
  SimpleTable,
  type DocLang,
  type DocumentMeta,
} from "./layout";
import { getBranding } from "@/lib/config/branding";

function buildMeta(): DocumentMeta {
  return {
    ...buildDefaultMeta(getBranding()),
    docTitleEn: "Installation & Deployment Guide",
    docTitleAr: "دليل التثبيت والنشر",
    subtitleEn:
      "Zero-to-live runbook for IT and delivery teams to stand up the Posture & Maturity Dashboard in the organization's environment.",
    subtitleAr:
      "دليل عمل شامل لفرق تقنية المعلومات والتسليم لإعداد لوحة الوضع الأمني والنضج في بيئة الجهة.",
    audienceEn: "IT operations · delivery engineers",
    audienceAr: "تقنية المعلومات · مهندسو التسليم",
  };
}

const SECTIONS_EN = [
  { titleEn: "Prerequisites", titleAr: "المتطلبات الأولية" },
  { titleEn: "Entra App Registration", titleAr: "تسجيل تطبيق Entra" },
  { titleEn: "Environment configuration", titleAr: "إعداد البيئة" },
  { titleEn: "Running the demo environment", titleAr: "تشغيل بيئة العرض التجريبي" },
  { titleEn: "Production deployment (Azure)", titleAr: "النشر في الإنتاج (Azure)" },
  { titleEn: "First real-tenant onboarding", titleAr: "تسجيل أول مستأجر حقيقي" },
  { titleEn: "Operational tasks", titleAr: "المهام التشغيلية" },
  { titleEn: "Troubleshooting", titleAr: "استكشاف الأخطاء" },
];

export function InstallationGuide({ lang }: { lang: DocLang }) {
  return (
    <HandoffDocument
      lang={lang}
      meta={buildMeta()}
      sections={SECTIONS_EN}
      Body={() => (lang === "en" ? <BodyEn /> : <BodyAr />)}
    />
  );
}

function BodyEn() {
  return (
    <View>
      <H1 lang="en" num={1}>Prerequisites</H1>
      <P lang="en">
        Before you begin, confirm that the following are available. Every item is
        a hard prerequisite — the dashboard cannot operate without them.
      </P>
      <Bullet lang="en">
        A Microsoft 365 E5 tenant belonging to the organization hosting the
        dashboard (the "operator tenant"). Global Administrator access required
        for app registration steps.
      </Bullet>
      <Bullet lang="en">
        Host environment: 2 vCPU / 4 GB RAM / 20 GB disk minimum. Supports
        Node.js 20 LTS and a persistent filesystem for SQLite + PDF fonts.
      </Bullet>
      <Bullet lang="en">
        Outbound HTTPS to graph.microsoft.com and login.microsoftonline.com.
        No inbound open ports required unless exposing the dashboard URL.
      </Bullet>
      <Bullet lang="en">
        A public hostname the Council staff will use to access the dashboard
        (e.g. posture.shj-csc.gov.ae). For demo we use a Cloudflare tunnel.
      </Bullet>
      <Bullet lang="en">
        For production: Azure subscription in UAE-North with Entra connectivity.
        Recommended services: App Service, Azure Files, Azure Key Vault.
      </Bullet>

      <H1 lang="en" num={2}>Entra App Registration</H1>
      <P lang="en">
        The operator registers one multi-tenant application in its own Entra
        tenant. Every connected entity later grants this same app read-only
        consent in their own tenant.
      </P>

      <H2 lang="en">2.1 Create the app registration</H2>
      <NumBullet lang="en" n={1}>
        Sign in to entra.microsoft.com as a Council Global Administrator.
      </NumBullet>
      <NumBullet lang="en" n={2}>
        Go to App registrations → New registration.
      </NumBullet>
      <NumBullet lang="en" n={3}>
        Name: "Posture Dashboard" (or your organization's preferred name).
      </NumBullet>
      <NumBullet lang="en" n={4}>
        Supported account types: "Accounts in any organizational directory
        (Any Microsoft Entra ID tenant - Multitenant)". This is critical — the
        app must be multi-tenant to be consentable in entity tenants.
      </NumBullet>
      <NumBullet lang="en" n={5}>
        Redirect URI (Web): set to your dashboard's consent callback URL. For
        example https://posture.shj-csc.gov.ae/api/auth/consent-callback.
      </NumBullet>
      <NumBullet lang="en" n={6}>
        Register. Copy the Application (client) ID from the Overview tab —
        you'll need it later.
      </NumBullet>

      <H2 lang="en">2.2 Grant API permissions</H2>
      <P lang="en">
        Under API permissions, add the following Microsoft Graph application
        permissions. All are read-only.
      </P>
      <SimpleTable
        lang="en"
        headers={["Permission", "Purpose"]}
        rows={[
          ["SecurityEvents.Read.All", "Secure Score"],
          ["SecurityIncident.Read.All", "Incidents"],
          ["SecurityAlert.Read.All", "Alerts (DLP / IRM / CommComp via serviceSource filter)"],
          ["ThreatHunting.Read.All", "Advanced Hunting KQL packs"],
          ["SecurityIdentitiesHealth.Read.All", "Defender for Identity sensor health"],
          ["AttackSimulation.Read.All", "Attack Simulation rollup"],
          ["ThreatIntelligence.Read.All", "Threat Intel overlays"],
          ["IdentityRiskyUser.Read.All", "Risky users"],
          ["IdentityRiskEvent.Read.All", "Risk detections"],
          ["Policy.Read.All", "Conditional Access"],
          ["RoleManagement.Read.Directory", "PIM sprawl (active)"],
          ["RoleEligibilitySchedule.Read.Directory", "PIM sprawl (eligible)"],
          ["AuditLog.Read.All", "Sign-in / directory audits"],
          ["AuditLogsQuery.Read.All", "Label adoption telemetry (async)"],
          ["DeviceManagementManagedDevices.Read.All", "Intune compliance"],
          ["DeviceManagementConfiguration.Read.All", "Intune policies"],
          ["InformationProtectionPolicy.Read.All", "Sensitivity labels"],
          ["RecordsManagement.Read.All", "Retention labels"],
          ["SubjectRightsRequest.Read.All", "Privacy requests"],
          ["SharePointTenantSettings.Read.All", "External sharing posture"],
        ]}
      />
      <P lang="en">
        Click <Text style={{ fontWeight: 700 }}>Grant admin consent for
        (Council tenant)</Text> so the app's own tenant is pre-consented.
      </P>

      <H2 lang="en">2.3 Create a client secret</H2>
      <P lang="en">
        Under Certificates & secrets → Client secrets → New client secret.
        Set expiry to 24 months. Copy the Value (not the ID) immediately —
        Entra will not show it again.
      </P>
      <Callout lang="en" title="Production note">
        For production, prefer certificate-based authentication over a client
        secret. Upload the .pfx to Azure Key Vault and reference it from the
        dashboard host. The demo environment accepts a client secret; the
        production hardening guide is at Section 5.
      </Callout>

      <H1 lang="en" num={3}>Environment configuration</H1>
      <P lang="en">
        Two paths — pick one. The recommended path is Settings → App
        Registration in the dashboard; env-var editing remains as a fallback.
      </P>

      <H2 lang="en">3.1 Recommended — Settings → App Registration</H2>
      <P lang="en">
        Boot the dashboard once with minimum config (see §3.3 below), sign in,
        then open Settings → App Registration. Paste the Client ID and Client
        secret from §2. The panel has a 6-step inline walkthrough + a
        one-click Copy for the exact redirect URI you must register in Entra.
      </P>
      <P lang="en">
        <Text style={{ fontWeight: 700 }}>Why it's preferred:</Text> Values
        persist in the SQLite database (not a plaintext file on disk), saves
        invalidate the MSAL token cache immediately (no restart), and the
        panel shows a source pill per field so operators can see whether a
        value came from the DB or env fallback. Secret rotation is a 10-second
        operation — paste the new value, click Save.
      </P>

      <H2 lang="en">3.2 Fallback — .env.local</H2>
      <P lang="en">
        For fresh installs where the dashboard isn't running yet, or when
        shipping a pre-configured container image, env vars still work.
      </P>
      <Code lang="en">{`APP_BASE_URL=https://posture.your-org.example
DATA_DIR=/var/lib/mizan
AZURE_CLIENT_ID=<from step 2.1>
AZURE_CLIENT_SECRET=<from step 2.3>
SCSC_SEED_DEMO=false`}</Code>
      <Note lang="en">
        Once a DB value is set via the Settings panel, it takes precedence
        over the env var for that field. The Settings panel shows "from DB" /
        "from env" badges so you know which source each value came from.
      </Note>

      <H2 lang="en">3.3 Minimum bootable config</H2>
      <P lang="en">
        Only <Text style={{ fontWeight: 700 }}>APP_BASE_URL</Text> and{" "}
        <Text style={{ fontWeight: 700 }}>DATA_DIR</Text> are hard requirements
        to boot. Azure credentials can be empty at first boot — the dashboard
        surfaces "Azure app not configured" warnings but all other UI works.
        Signals gracefully degrade: every Graph fetcher treats missing auth as
        "product not available" and returns empty payloads rather than
        crashing the sync.
      </P>

      <H2 lang="en">3.4 Optional tunables</H2>
      <SimpleTable
        lang="en"
        headers={["Variable", "Default", "Purpose"]}
        rows={[
          ["SCSC_SYNC_CONCURRENCY", "5", "Parallel tenant workers (clamped 1–20)"],
          ["SCSC_RETENTION_DAYS", "90", "Snapshot retention window"],
          ["SCSC_SYNC_SECRET", "(none)", "Shared secret for POST /api/sync"],
          ["SCSC_SEED_DEMO", "false", "Seed 12 demo entities on first boot (dev only)"],
          ["SCSC_DB_PATH", "$DATA_DIR/mizan.sqlite", "Override SQLite file path"],
        ]}
      />
      <Note lang="en">
        The SCSC_ prefix on these variable names is historical — Mizan was
        first built for the Sharjah Cybersecurity Council. The names are kept
        for backward compatibility with existing deployments. New code may use
        MIZAN_ aliases over time, but SCSC_ remains the canonical set.
      </Note>

      <H1 lang="en" num={4}>Running the demo environment</H1>
      <H2 lang="en">4.1 Local boot</H2>
      <Code lang="en">{`git clone <repo-url> mizan
cd mizan/web
npm install
cp .env.example .env.local    # edit as per section 3
npm run build
npm run start                 # serves on http://127.0.0.1:8787`}</Code>

      <H2 lang="en">4.2 Docker</H2>
      <Code lang="en">{`docker compose up -d`}</Code>
      <P lang="en">
        The bundled docker-compose.yml binds a data volume and exposes port
        8787. Pair with a reverse proxy (Cloudflare tunnel / Nginx / Azure
        Front Door) to expose the dashboard over HTTPS.
      </P>

      <H2 lang="en">4.3 Cloudflare tunnel (demo)</H2>
      <P lang="en">
        The reference demos use a cloudflared tunnel that maps a public
        hostname → 127.0.0.1:8787. This is a development convenience;
        production deployments do not use LaunchAgent plists or personal
        cloudflared configs.
      </P>
      <Callout lang="en" title="Required Zero Trust gate">
        Any Cloudflare-tunneled exposure must be gated with Cloudflare Access
        (Zero Trust application). Do not leave the URL publicly resolvable
        without a sign-in gate.
      </Callout>

      <H1 lang="en" num={5}>Production deployment (Azure)</H1>
      <P lang="en">
        For production, deploy to Azure App Service or Azure Container Apps in
        the UAE-North region. The summary below covers the minimum viable
        topology; a full deployment runbook will be delivered as
        docs/10-deployment.md.
      </P>

      <H2 lang="en">5.1 Recommended Azure topology</H2>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>App Service</Text> — runs the Next.js
        dashboard. Choose UAE-North region. Enable managed identity. Scale:
        Premium v3 P1v3 is sufficient for 200 entities.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Azure Files</Text> — mounted into the
        App Service as the persistent DATA_DIR. Holds the SQLite database and
        any Council-uploaded assets.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Azure Key Vault</Text> — stores the
        Entra client certificate (production) or client secret (transitional).
        App Service reads it via managed identity.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Azure Timer Function (or Logic
        App)</Text> — fires daily at 03:00 UAE time and POSTs to /api/sync. This
        replaces the dev Mac's LaunchAgent.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Azure Front Door</Text> (or
        Application Gateway) — terminates TLS and gates access via Entra.
      </Bullet>

      <H2 lang="en">5.2 Certificate-based Entra auth</H2>
      <P lang="en">
        In production, swap the client secret for a certificate. Upload a .pfx
        to Key Vault, grant the App Service's managed identity the
        "Key Vault Certificate User" role, and configure the MSAL client
        accordingly. A migration helper ships in lib/graph/msal.ts.
      </P>

      <H1 lang="en" num={6}>First real-tenant onboarding</H1>
      <P lang="en">
        This is the end-to-end flow for registering the first entity after
        the dashboard is running. The same flow applies to every subsequent
        entity.
      </P>

      <NumBullet lang="en" n={1}>
        In the dashboard, open Settings → Entities tab. Click
        "Download Discovery Letter" (the gold banner at the top).
      </NumBullet>
      <NumBullet lang="en" n={2}>
        Email the Discovery Letter to the entity's CISO. They reply with
        Tenant ID, primary domain, E5 confirmation, Global Admin name, and
        CISO contact details.
      </NumBullet>
      <NumBullet lang="en" n={3}>
        In the dashboard, open the Onboarding Wizard (guided mode). Walk
        through the 5 steps: identify → tenant/domain (with OIDC
        auto-resolve) → generate → await consent → first-sync verify.
      </NumBullet>
      <NumBullet lang="en" n={4}>
        The Onboarding Letter PDF is generated automatically. Email it to
        the entity's Global Administrator.
      </NumBullet>
      <NumBullet lang="en" n={5}>
        The entity admin clicks the consent URL, signs in with their Global
        Admin account, reviews the read-only permissions, and clicks Accept.
      </NumBullet>
      <NumBullet lang="en" n={6}>
        Entra redirects back; the dashboard flips the tenant to consented and
        kicks off an initial sync. Within 10 minutes the entity appears live
        in the Maturity overview.
      </NumBullet>

      <Callout lang="en" title="Demo data">
        If SCSC_SEED_DEMO=true, 12 demo entities are seeded with realistic
        synthetic signals. Demo entities are flagged and skipped by real
        Graph syncs. Run "npm run purge-demo" to remove them.
      </Callout>

      <H1 lang="en" num={7}>Operational tasks</H1>
      <H2 lang="en">7.1 Manual sync</H2>
      <Code lang="en">{`curl -X POST https://posture.example.gov.ae/api/sync \\
  -H "Authorization: Bearer $SCSC_SYNC_SECRET"`}</Code>

      <H2 lang="en">7.2 Secret rotation</H2>
      <P lang="en">
        To rotate the Entra client secret: open Settings → App Registration,
        paste the new secret value, click Save. The MSAL cache invalidates on
        save; the next sync uses the new credential.
      </P>

      <H2 lang="en">7.3 Demo reset</H2>
      <Code lang="en">{`rm -rf <DATA_DIR>/     # wipes the DB; next boot reseeds if SCSC_SEED_DEMO=true`}</Code>

      <H2 lang="en">7.4 Backup</H2>
      <P lang="en">
        The SQLite database at $DATA_DIR/mizan.sqlite is the only persistent
        state. Nightly snapshot to Azure Blob storage is sufficient for full
        recovery. Fonts and static assets are reproducible from the repo.
      </P>

      <H1 lang="en" num={8}>Troubleshooting</H1>
      <SimpleTable
        lang="en"
        headers={["Symptom", "Likely cause", "Fix"]}
        rows={[
          [
            "Settings shows 'Azure app not configured'",
            "Client ID / Secret empty",
            "Set in Settings → App Registration or .env.local",
          ],
          [
            "Consent callback returns 404",
            "Redirect URI mismatch",
            "Ensure Entra redirect URI = APP_BASE_URL + /api/auth/consent-callback",
          ],
          [
            "Entity consent flips to 'revoked'",
            "Admin revoked the app in entity tenant, or 401 persisted",
            "Re-consent the Council app in the entity tenant",
          ],
          [
            "Sync takes too long",
            "Concurrency too low",
            "Raise SCSC_SYNC_CONCURRENCY (max 20)",
          ],
          [
            "PDF fails with bidi errors",
            "Arabic + Latin mixed in one document",
            "Render EN and AR as separate monolingual PDFs (already enforced)",
          ],
          [
            "DFI / Attack Sim returns 0 everywhere",
            "Those products not licensed / not rolled out in tenant",
            "Expected — the dashboard tolerates missing Purview / DFI gracefully",
          ],
          [
            "Consent URL fails with AADSTS50097",
            "Entity tenant's Conditional Access requires a compliant device for admin sign-in",
            "Entity admin must sign in from a managed device, or CA admin temporarily excludes the admin from the policy for the consent session. NOT a Council-side issue.",
          ],
          [
            "Consent URL fails with AADSTS65001",
            "Not consented yet / entity admin hasn't accepted",
            "Have the entity admin open the URL and click Accept. Verify they are a Global Administrator in the entity tenant.",
          ],
          [
            "Consent URL fails with AADSTS700016",
            "Council app no longer exists in entity tenant",
            "Regenerate consent URL from the wizard. If intentionally uninstalled, entity must re-consent.",
          ],
        ]}
      />
    </View>
  );
}

function BodyAr() {
  return (
    <View>
      <H1 lang="ar" num={1}>المتطلبات الأولية</H1>
      <P lang="ar">
        قبل البدء، تأكد من توفر كل البنود التالية. كل بند متطلب إلزامي —
        لا يمكن تشغيل اللوحة بدون أي منها.
      </P>
      <Bullet lang="ar">
        مستأجر Microsoft 365 E5 يعود لجهة التشغيل ("المستأجر التشغيلي").
        يلزم امتلاك صلاحية Global Administrator لخطوات تسجيل التطبيق.
      </Bullet>
      <Bullet lang="ar">
        بيئة استضافة: وحدة معالجة افتراضية ٢ × ذاكرة ٤ جيجابايت × قرص ٢٠ جيجابايت
        كحد أدنى. تدعم Node.js 20 LTS ونظام ملفات دائم لقاعدة SQLite وخطوط PDF.
      </Bullet>
      <Bullet lang="ar">
        اتصال HTTPS صادر إلى graph.microsoft.com و login.microsoftonline.com.
        لا حاجة لفتح أي منفذ وارد إلا عند كشف رابط اللوحة.
      </Bullet>
      <Bullet lang="ar">
        اسم مضيف عام يستخدمه موظفو الجهة للوصول إلى اللوحة (مثل
        posture.your-org.example). تستخدم بيئات العرض التجريبي نفق Cloudflare.
      </Bullet>
      <Bullet lang="ar">
        للإنتاج: اشتراك Azure في UAE-North مع اتصال Entra. الخدمات الموصى بها:
        App Service و Azure Files و Azure Key Vault.
      </Bullet>

      <H1 lang="ar" num={2}>تسجيل تطبيق Entra</H1>
      <P lang="ar">
        تسجّل الجهة التشغيلية تطبيقًا واحدًا متعدد المستأجرين في مستأجرها الخاص.
        تمنح كل جهة فرعية لاحقًا موافقة للقراءة فقط لهذا التطبيق ذاته في
        مستأجرها.
      </P>

      <H2 lang="ar">٢.١ إنشاء تسجيل التطبيق</H2>
      <NumBullet lang="ar" n={1}>
        سجّل الدخول إلى entra.microsoft.com بحساب Global Administrator في
        المستأجر التشغيلي.
      </NumBullet>
      <NumBullet lang="ar" n={2}>
        انتقل إلى App registrations ← New registration.
      </NumBullet>
      <NumBullet lang="ar" n={3}>
        الاسم: "Posture Dashboard" (أو الاسم المفضَّل للجهة).
      </NumBullet>
      <NumBullet lang="ar" n={4}>
        أنواع الحسابات المدعومة: "Accounts in any organizational directory
        (Any Microsoft Entra ID tenant - Multitenant)". هذا حاسم — يجب أن
        يكون التطبيق متعدد المستأجرين ليقبل الموافقة في مستأجرات الجهات.
      </NumBullet>
      <NumBullet lang="ar" n={5}>
        رابط إعادة التوجيه (Web): اضبطه على رابط استدعاء الموافقة لللوحة،
        مثال: https://posture.shj-csc.gov.ae/api/auth/consent-callback.
      </NumBullet>
      <NumBullet lang="ar" n={6}>
        سجّل. انسخ Application (client) ID من تبويب Overview — ستحتاجه لاحقًا.
      </NumBullet>

      <H2 lang="ar">٢.٢ منح أذونات واجهة Graph</H2>
      <P lang="ar">
        ضمن API permissions، أضف أذونات تطبيقات Microsoft Graph التالية.
        جميعها للقراءة فقط.
      </P>
      <SimpleTable
        lang="ar"
        headers={["الإذن", "الغرض"]}
        rows={[
          ["SecurityEvents.Read.All", "Secure Score"],
          ["SecurityIncident.Read.All", "الحوادث"],
          ["SecurityAlert.Read.All", "التنبيهات (DLP / IRM / الامتثال عبر serviceSource)"],
          ["ThreatHunting.Read.All", "حزم استعلام KQL المتقدمة"],
          ["SecurityIdentitiesHealth.Read.All", "صحة مستشعرات Defender for Identity"],
          ["AttackSimulation.Read.All", "تجميع محاكاة الهجمات"],
          ["ThreatIntelligence.Read.All", "طبقات استخبارات التهديدات"],
          ["IdentityRiskyUser.Read.All", "المستخدمون ذوو المخاطر"],
          ["IdentityRiskEvent.Read.All", "كشف المخاطر"],
          ["Policy.Read.All", "Conditional Access"],
          ["RoleManagement.Read.Directory", "تتبع PIM (النشط)"],
          ["RoleEligibilitySchedule.Read.Directory", "تتبع PIM (المؤهَّل)"],
          ["AuditLog.Read.All", "سجلات الدخول والدليل"],
          ["AuditLogsQuery.Read.All", "قياسات تبنّي التصنيفات (غير متزامن)"],
          ["DeviceManagementManagedDevices.Read.All", "امتثال Intune"],
          ["DeviceManagementConfiguration.Read.All", "سياسات Intune"],
          ["InformationProtectionPolicy.Read.All", "تصنيفات الحساسية"],
          ["RecordsManagement.Read.All", "تصنيفات الاحتفاظ"],
          ["SubjectRightsRequest.Read.All", "طلبات الخصوصية"],
          ["SharePointTenantSettings.Read.All", "وضع المشاركة الخارجية"],
        ]}
      />
      <P lang="ar">
        اضغط "Grant admin consent for (Council tenant)" لتقبل موافقة مسبقة
        على مستأجر المجلس نفسه.
      </P>

      <H2 lang="ar">٢.٣ إنشاء سر عميل</H2>
      <P lang="ar">
        ضمن Certificates & secrets ← Client secrets ← New client secret.
        اضبط الصلاحية على ٢٤ شهرًا. انسخ قيمة (Value) السر فورًا وليس
        المعرّف — لن يُظهرها Entra مرة أخرى.
      </P>
      <Callout lang="ar" title="ملاحظة الإنتاج">
        في الإنتاج، يُفضَّل استخدام مصادقة قائمة على الشهادة بدلاً من سر
        العميل. ارفع ملف .pfx إلى Azure Key Vault وأشر إليه من مضيف اللوحة.
        تقبل بيئة العرض التجريبي سر العميل؛ يوجد دليل تصلب الإنتاج في
        القسم الخامس.
      </Callout>

      <H1 lang="ar" num={3}>إعداد البيئة</H1>
      <P lang="ar">
        مساران — اختر أحدهما. المسار الموصى به هو الإعدادات ← تسجيل التطبيق
        في اللوحة؛ يبقى تحرير متغيرات البيئة بديلًا احتياطيًا.
      </P>

      <H2 lang="ar">٣.١ الموصى به — الإعدادات ← تسجيل التطبيق</H2>
      <P lang="ar">
        شغّل اللوحة مرة واحدة بالحد الأدنى من الإعدادات (انظر ٣.٣)، سجّل
        الدخول، ثم افتح الإعدادات ← تسجيل التطبيق. الصق Client ID و Client
        secret من القسم ٢. تحتوي اللوحة على دليل مرحلي من ٦ خطوات + نسخ بضغطة
        واحدة لرابط إعادة التوجيه الدقيق الذي يجب تسجيله في Entra.
      </P>
      <P lang="ar">
        <Text style={{ fontWeight: 700 }}>لماذا يُفضَّل:</Text> تُحفظ القيم
        في قاعدة SQLite (ليست ملفًا نصيًا على القرص)، وتُفرَّغ ذاكرة MSAL
        فور الحفظ (بدون إعادة تشغيل)، وتعرض كل حقل شارة مصدر بحيث يرى
        المشغّل ما إذا كانت القيمة من قاعدة البيانات أو البديل البيئي.
        تدوير الأسرار يستغرق ١٠ ثوانٍ — الصق القيمة الجديدة واضغط حفظ.
      </P>

      <H2 lang="ar">٣.٢ البديل — .env.local</H2>
      <P lang="ar">
        للتثبيتات الجديدة التي لم تعمل فيها اللوحة بعد، أو عند شحن صورة
        حاوية مُعدَّة مسبقًا، ما زالت متغيرات البيئة تعمل.
      </P>
      <Code lang="ar">{`APP_BASE_URL=https://posture.your-org.example
DATA_DIR=/var/lib/mizan
AZURE_CLIENT_ID=<من الخطوة ٢.١>
AZURE_CLIENT_SECRET=<من الخطوة ٢.٣>
SCSC_SEED_DEMO=false`}</Code>
      <Note lang="ar">
        بمجرد ضبط قيمة في قاعدة البيانات عبر لوحة الإعدادات، تأخذ الأسبقية
        على متغير البيئة لذلك الحقل. تعرض اللوحة شارات "من قاعدة البيانات"
        و"من البيئة" لمعرفة مصدر كل قيمة.
      </Note>

      <H2 lang="ar">٣.٣ الحد الأدنى للتشغيل</H2>
      <P lang="ar">
        فقط <Text style={{ fontWeight: 700 }}>APP_BASE_URL</Text> و{" "}
        <Text style={{ fontWeight: 700 }}>DATA_DIR</Text> إلزاميان للتشغيل.
        يمكن أن تكون بيانات اعتماد Azure فارغة عند أول تشغيل — تعرض اللوحة
        تحذيرات "Azure غير مضبوط" ولكن تعمل بقية الواجهة. تتحمّل الإشارات
        غياب البيانات: كل جالب Graph يعامل غياب المصادقة أو المنتج كحالة
        "غير متاح" ويعيد حمولة فارغة بدلًا من إسقاط المزامنة.
      </P>

      <H2 lang="ar">٣.٤ إعدادات اختيارية</H2>
      <SimpleTable
        lang="ar"
        headers={["المتغير", "الافتراضي", "الغرض"]}
        rows={[
          ["SCSC_SYNC_CONCURRENCY", "5", "عدد العمال المتوازين للمستأجرين (من ١ إلى ٢٠)"],
          ["SCSC_RETENTION_DAYS", "90", "نافذة الاحتفاظ باللقطات"],
          ["SCSC_SYNC_SECRET", "(لا يوجد)", "سر مشترك لاستدعاء POST /api/sync"],
          ["SCSC_SEED_DEMO", "false", "بذر ١٢ جهة تجريبية عند أول تشغيل (للتطوير فقط)"],
          ["SCSC_DB_PATH", "$DATA_DIR/mizan.sqlite", "تجاوز مسار ملف SQLite"],
        ]}
      />
      <Note lang="ar">
        بادئة SCSC_ في أسماء هذه المتغيرات تاريخية — بُنيت Mizan أول مرة
        لمجلس الشارقة للأمن السيبراني. تُحفظ الأسماء كما هي حفاظًا على توافق
        النشرات القائمة. قد تظهر مرادفات MIZAN_ في المستقبل، لكن SCSC_ يبقى
        المرجع المعتمد.
      </Note>

      <H1 lang="ar" num={4}>تشغيل بيئة العرض التجريبي</H1>
      <H2 lang="ar">٤.١ التشغيل المحلي</H2>
      <Code lang="ar">{`git clone <repo-url> mizan
cd mizan/web
npm install
cp .env.example .env.local    # حرّر حسب القسم ٣
npm run build
npm run start                 # يخدم على http://127.0.0.1:8787`}</Code>

      <H2 lang="ar">٤.٢ Docker</H2>
      <Code lang="ar">{`docker compose up -d`}</Code>
      <P lang="ar">
        يربط ملف docker-compose.yml المرفق وحدة تخزين للبيانات ويفتح المنفذ
        ٨٧٨٧. قرنه بخادم عكسي (نفق Cloudflare / Nginx / Azure Front Door)
        لكشف اللوحة عبر HTTPS.
      </P>

      <H2 lang="ar">٤.٣ نفق Cloudflare (العرض التجريبي)</H2>
      <P lang="ar">
        تستخدم بيئات العرض التجريبي نفق cloudflared يربط اسمًا مضيفًا
        عامًا ← 127.0.0.1:8787. هذه راحة للتطوير فقط؛ لا
        تستخدم عمليات النشر الإنتاجية LaunchAgent plist أو إعدادات
        cloudflared شخصية.
      </P>
      <Callout lang="ar" title="بوابة Zero Trust إلزامية">
        أي كشف عبر نفق Cloudflare يجب أن يكون محميًا ببوابة Cloudflare Access
        (تطبيق Zero Trust). لا تترك الرابط قابلاً للوصول علنًا بدون بوابة
        تسجيل دخول.
      </Callout>

      <H1 lang="ar" num={5}>النشر في الإنتاج (Azure)</H1>
      <P lang="ar">
        للإنتاج، انشر على Azure App Service أو Azure Container Apps في منطقة
        UAE-North. يغطي الملخص أدناه أبسط بنية قابلة للتشغيل؛ سيُسلَّم دليل
        نشر كامل باسم docs/10-deployment.md.
      </P>
      <H2 lang="ar">٥.١ البنية الموصى بها في Azure</H2>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>App Service</Text> — يشغّل لوحة
        Next.js. اختر منطقة UAE-North. فعّل الهوية المُدارة. المقياس:
        Premium v3 P1v3 يكفي لعدد ٢٠٠ جهة.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>Azure Files</Text> — مركَّب في
        App Service كقيمة DATA_DIR الدائمة. يحمل قاعدة SQLite وأي أصول
        مرفوعة من المجلس.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>Azure Key Vault</Text> — يخزّن
        شهادة Entra (إنتاج) أو سر العميل (انتقاليًا). يقرأها App Service
        عبر الهوية المُدارة.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>Azure Timer Function (أو Logic
        App)</Text> — يعمل يوميًا الساعة ٣:٠٠ بتوقيت الإمارات ويستدعي
        POST /api/sync. يحل محل LaunchAgent في بيئة التطوير.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>Azure Front Door</Text> (أو
        Application Gateway) — ينهي TLS ويحمي الوصول عبر Entra.
      </Bullet>

      <H2 lang="ar">٥.٢ مصادقة Entra عبر الشهادة</H2>
      <P lang="ar">
        في الإنتاج، استبدل سر العميل بشهادة. ارفع ملف .pfx إلى Key Vault،
        امنح الهوية المُدارة في App Service دور "Key Vault Certificate User"،
        وهيّئ عميل MSAL وفق ذلك. يوجد مساعد نقل في lib/graph/msal.ts.
      </P>

      <H1 lang="ar" num={6}>تسجيل أول مستأجر حقيقي</H1>
      <P lang="ar">
        هذا هو التدفق الكامل لتسجيل أول جهة شارقة بعد تشغيل اللوحة. ينطبق
        نفس التدفق على كل جهة لاحقة.
      </P>
      <NumBullet lang="ar" n={1}>
        افتح الإعدادات ← تبويب الجهات في اللوحة. اضغط "تنزيل خطاب الاكتشاف"
        (الشريط الذهبي في الأعلى).
      </NumBullet>
      <NumBullet lang="ar" n={2}>
        أرسل خطاب الاكتشاف إلى مسؤول أمن المعلومات في الجهة. سيرد بمعرّف
        المستأجر، النطاق الرئيسي، تأكيد ترخيص E5، اسم المسؤول العام،
        ومعلومات التواصل مع مسؤول أمن المعلومات.
      </NumBullet>
      <NumBullet lang="ar" n={3}>
        افتح معالج التسجيل الموجَّه في اللوحة. تنقّل عبر الخطوات الخمس:
        تعريف ← مستأجر/نطاق (باستخراج تلقائي عبر OIDC) ← إنشاء ← انتظار
        الموافقة ← تحقق المزامنة الأولى.
      </NumBullet>
      <NumBullet lang="ar" n={4}>
        يتم توليد ملف PDF لخطاب الإعداد آليًا. أرسله إلى المسؤول العام في الجهة.
      </NumBullet>
      <NumBullet lang="ar" n={5}>
        ينقر مسؤول الجهة على رابط الموافقة، يسجّل الدخول بحساب المسؤول
        العام، يراجع الأذونات للقراءة فقط، ويضغط Accept.
      </NumBullet>
      <NumBullet lang="ar" n={6}>
        يعيد Entra التوجيه؛ تُحوِّل اللوحة المستأجر إلى "تمت الموافقة"
        وتُشغّل مزامنة أولية. خلال ١٠ دقائق تظهر الجهة مباشرة في نظرة النضج.
      </NumBullet>

      <Callout lang="ar" title="البيانات التجريبية">
        إذا كان SCSC_SEED_DEMO=true، يتم بذر ١٢ جهة تجريبية بإشارات مركبة
        واقعية. تُعلَّم الجهات التجريبية وتتخطاها المزامنات الحقيقية.
        شغّل "npm run purge-demo" لإزالتها.
      </Callout>

      <H1 lang="ar" num={7}>المهام التشغيلية</H1>
      <H2 lang="ar">٧.١ مزامنة يدوية</H2>
      <Code lang="ar">{`curl -X POST https://posture.example.gov.ae/api/sync \\
  -H "Authorization: Bearer $SCSC_SYNC_SECRET"`}</Code>

      <H2 lang="ar">٧.٢ تدوير الأسرار</H2>
      <P lang="ar">
        لتدوير سر عميل Entra: افتح الإعدادات ← تسجيل التطبيق، الصق قيمة
        السر الجديدة، اضغط حفظ. تُفرَّغ ذاكرة MSAL فور الحفظ؛ تستخدم
        المزامنة التالية البيانات الجديدة.
      </P>

      <H2 lang="ar">٧.٣ إعادة ضبط العرض التجريبي</H2>
      <Code lang="ar">{`rm -rf <DATA_DIR>/     # يمسح قاعدة البيانات؛ يعاد البذر عند التشغيل إذا SCSC_SEED_DEMO=true`}</Code>

      <H2 lang="ar">٧.٤ النسخ الاحتياطي</H2>
      <P lang="ar">
        قاعدة SQLite في $DATA_DIR/mizan.sqlite هي الحالة الدائمة الوحيدة.
        تكفي لقطة ليلية إلى Azure Blob Storage للاسترداد الكامل. الخطوط
        والأصول الثابتة قابلة للاستنساخ من المستودع.
      </P>

      <H1 lang="ar" num={8}>استكشاف الأخطاء</H1>
      <SimpleTable
        lang="ar"
        headers={["الأعراض", "السبب المحتمل", "الحل"]}
        rows={[
          [
            "الإعدادات تظهر 'تطبيق Azure غير مضبوط'",
            "معرّف العميل أو سر العميل فارغ",
            "اضبطه في الإعدادات ← تسجيل التطبيق أو .env.local",
          ],
          [
            "استدعاء الموافقة يرجع 404",
            "عدم تطابق Redirect URI",
            "تأكد أن Entra redirect URI = APP_BASE_URL + /api/auth/consent-callback",
          ],
          [
            "موافقة جهة تتحول إلى 'revoked'",
            "أُلغِي التطبيق في مستأجر الجهة، أو استمر خطأ 401",
            "أعد الموافقة على تطبيق المجلس في مستأجر الجهة",
          ],
          [
            "المزامنة تستغرق وقتًا طويلاً",
            "التزامن منخفض",
            "ارفع SCSC_SYNC_CONCURRENCY (بحد ٢٠)",
          ],
          [
            "PDF يفشل بأخطاء bidi",
            "مزج عربي ولاتيني في مستند واحد",
            "قدّم EN و AR كملفين منفصلين (مُلزَم في اللوحة)",
          ],
          [
            "DFI / محاكاة الهجمات تعيد ٠",
            "هذه المنتجات غير مرخّصة / غير منتشرة في المستأجر",
            "متوقع — تتحمّل اللوحة غياب Purview / DFI دون مشاكل",
          ],
          [
            "رابط الموافقة يفشل بخطأ AADSTS50097",
            "يتطلب Conditional Access في مستأجر الجهة جهازًا متوافقًا لتسجيل دخول المسؤول",
            "يجب على مسؤول الجهة تسجيل الدخول من جهاز مُدار، أو يستثني مسؤول CA الحساب مؤقتًا من السياسة لجلسة الموافقة. ليست مشكلة من جانب المجلس.",
          ],
          [
            "رابط الموافقة يفشل بخطأ AADSTS65001",
            "لم يتم الموافقة بعد / لم يقبل مسؤول الجهة",
            "اطلب من مسؤول الجهة فتح الرابط والضغط على Accept. تأكد أنه Global Administrator في مستأجر الجهة.",
          ],
          [
            "رابط الموافقة يفشل بخطأ AADSTS700016",
            "تطبيق المجلس لم يعد موجودًا في مستأجر الجهة",
            "أعد توليد رابط الموافقة من المعالج. إذا أُزيل عمدًا، يجب على الجهة إعادة الموافقة.",
          ],
        ]}
      />
    </View>
  );
}

