import { Text, View } from "@react-pdf/renderer";
import {
  Bullet,
  Callout,
  buildDefaultMeta,
  HandoffDocument,
  H1,
  H2,
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
    docTitleEn: "Operator's Manual",
    docTitleAr: "دليل المستخدم التشغيلي",
    subtitleEn:
      "A practical guide for staff who use the Posture & Maturity Dashboard day-to-day — navigation, page-by-page explanation, common tasks, and how to read the numbers.",
    subtitleAr:
      "دليل عملي للموظفين الذين يستخدمون لوحة الوضع الأمني والنضج يوميًا — التنقّل، شرح كل صفحة، المهام الشائعة، وكيفية قراءة الأرقام.",
    audienceEn: "SOC analysts · compliance auditors · operations team",
    audienceAr: "محللو SOC · مدققو الامتثال · فريق العمليات",
  };
}

const SECTIONS = [
  { titleEn: "What the dashboard is (and isn't)", titleAr: "ما هي اللوحة وما ليست كذلك" },
  { titleEn: "Sign-in and navigation", titleAr: "الدخول والتنقّل" },
  { titleEn: "Maturity overview", titleAr: "نظرة النضج العامة" },
  { titleEn: "Entities list", titleAr: "قائمة الجهات" },
  { titleEn: "Entity Detail view", titleAr: "تفاصيل الجهة" },
  { titleEn: "Identity", titleAr: "الهوية" },
  { titleEn: "Threats", titleAr: "التهديدات" },
  { titleEn: "Data protection", titleAr: "حماية البيانات" },
  { titleEn: "Devices", titleAr: "الأجهزة" },
  { titleEn: "Governance (UAE NESA)", titleAr: "الحوكمة (NESA الإماراتي)" },
  { titleEn: "Settings", titleAr: "الإعدادات" },
  { titleEn: "Common tasks", titleAr: "المهام الشائعة" },
];

export function OperatorManual({ lang }: { lang: DocLang }) {
  return (
    <HandoffDocument
      lang={lang}
      meta={buildMeta()}
      sections={SECTIONS}
      Body={() => (lang === "en" ? <BodyEn /> : <BodyAr />)}
    />
  );
}

function BodyEn() {
  return (
    <View>
      <H1 lang="en" num={1}>What the dashboard is (and isn't)</H1>
      <P lang="en">
        The Posture & Maturity Dashboard is a central observability layer
        that reads security posture from every connected entity's Microsoft 365
        tenant and ranks it against an organization-defined target.
      </P>
      <Callout lang="en" title="Two deployment modes (v2.0+)">
        The platform runs in either{" "}
        <Text style={{ fontWeight: 700 }}>observation mode</Text> (read-only
        across every entity — no Graph writes ever) or{" "}
        <Text style={{ fontWeight: 700 }}>directive mode</Text> (observation
        plus a curated write tier for entities that explicitly opt in). Mode
        is fixed at install time via the <Text style={{ fontWeight: 700 }}>
        MIZAN_DEPLOYMENT_MODE</Text> environment variable. Observation-mode
        entities are never written to, regardless of deployment. The
        directive write tier covers Conditional Access, Intune device
        posture, SharePoint tenant external-sharing, Defender for Endpoint
        Threat Intelligence indicators, and reactive incident / alert /
        user actions — see the dedicated <Text style={{ fontWeight: 700 }}>
        /directive</Text> page in the dashboard for the full operator flow.
      </Callout>
      <P lang="en">
        Every number you see is computed from live Microsoft Graph reads on a
        daily refresh cycle. Values are tenant-partitioned — no cross-tenant
        data correlation happens except through the Council-authored roll-ups
        described in this manual.
      </P>

      <H1 lang="en" num={2}>Sign-in and navigation</H1>
      <P lang="en">
        The dashboard is reached at the operator-hosted URL (e.g.
        posture.your-org.example). Access is typically gated by Cloudflare
        Zero Trust or an equivalent identity-aware proxy in front of the app;
        operator staff sign in with their organization's Entra account.
      </P>
      <H2 lang="en">2.1 Chrome</H2>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>TopBar</Text> — left lockup shows the
        Council identity; right side holds a language toggle (EN / AR), theme
        toggle (light / dark), notifications, and a "Sync all" button for
        operators who want to trigger a manual refresh.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Sidebar</Text> — nine top-level tabs
        plus a Data Sources panel at the bottom that shows the Graph APIs
        feeding the dashboard and their live health.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Main content</Text> — per-route.
        Every page renders loading, error, empty, and populated states
        consistently.
      </Bullet>
      <H2 lang="en">2.2 Bilingual + RTL</H2>
      <P lang="en">
        Toggle EN / AR from the TopBar. All UI strings, column headers, and
        callouts translate; Arabic numerals display as Arabic-Indic digits
        (٠ – ٩). Product names stay in English in both locales (Microsoft
        Secure Score, Defender, Purview, Entra ID, Intune) — a deliberate
        choice to avoid translation ambiguity for technical teams.
      </P>

      <H1 lang="en" num={3}>Maturity overview (/maturity)</H1>
      <P lang="en">
        The headline page. Shows Council-wide Maturity Index, how many entities
        are above / below target, the cluster-average chart, and the top
        movers over the last 7 days.
      </P>
      <H2 lang="en">3.1 Reading the Maturity Index</H2>
      <P lang="en">
        A single 0-100 score per entity, computed as a weighted average of six
        sub-scores: Secure Score (25%), Identity posture (20%), Device posture
        (15%), Data protection (15%), Threat response (15%), Framework
        alignment (10%). Weights are Council-editable in Settings → Maturity
        Index.
      </P>
      <Bullet lang="en">
        Dark green: at or above the Council target (default 75).
      </Bullet>
      <Bullet lang="en">
        Amber: within 10 points below target.
      </Bullet>
      <Bullet lang="en">
        Red: more than 10 points below target.
      </Bullet>
      <H2 lang="en">3.2 "Why is this calculated?"</H2>
      <P lang="en">
        The formula is transparent and rendered dynamically from whatever
        weights the Council has set. Click the "How is this calculated?" link
        below the index to open the FAQ page which walks through every input
        and every weight.
      </P>

      <H1 lang="en" num={4}>Entities list (/entities)</H1>
      <P lang="en">
        The operational heart of the dashboard. One row per onboarded entity,
        ranked by Maturity Index.
      </P>
      <H2 lang="en">4.1 Columns</H2>
      <SimpleTable
        lang="en"
        headers={["Column", "What it shows"]}
        rows={[
          ["Entity", "EN + AR name, domain, Demo badge if applicable"],
          ["Cluster", "Police / Health / Edu / Municipality / Utilities / Transport"],
          ["Maturity", "0-100 with progress bar tinted by target proximity"],
          ["Controls", "% of Secure Score controls passing"],
          ["Incidents", "Open security incidents from Defender XDR"],
          ["Risky users", "Users classified as at-risk by Identity Protection"],
          ["Device compl.", "% of Intune-managed devices reporting compliant"],
          ["Connection", "Green / amber / red dot based on last sync health"],
          ["Last sync", "Relative timestamp of most recent sync"],
        ]}
      />
      <H2 lang="en">4.2 Filtering and sorting</H2>
      <P lang="en">
        Type in the search box to filter by name, domain, CISO name, or CISO
        email (case-insensitive, matches both EN and AR). Cluster chips filter
        to one sector. Click any column header to sort; click again to reverse.
        Rows without data (pending consent) sink to the bottom of numeric
        sorts regardless of direction.
      </P>
      <H2 lang="en">4.3 Export CSV</H2>
      <P lang="en">
        The button top-right exports the currently filtered and sorted view
        to CSV with a UTF-8 BOM so Excel opens Arabic correctly in both
        languages. Useful for executive reports.
      </P>

      <H1 lang="en" num={5}>Entity Detail view</H1>
      <P lang="en">
        Click any entity in the list to drill into its per-tenant page. The
        header shows the entity identity, consent status, last-sync chip, and
        four action buttons.
      </P>
      <H2 lang="en">5.1 Action buttons</H2>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Defender portal</Text> — opens
        security.microsoft.com scoped to this entity's tenant (new tab).
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Export card</Text> — downloads a
        JSON snapshot of the entity's tenant record, maturity, all signal
        payloads, and connection health. Useful for sharing with the entity's
        CISO or for archival.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Schedule review</Text> — sets an
        informational review date + optional note on the entity. Surfaces as
        a banner on the detail page. No automated action fires.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Suspend / Resume</Text> — pauses
        background sync for this entity. Consent is NOT revoked; existing
        snapshots are preserved. Resume re-enables daily sync.
      </Bullet>
      <H2 lang="en">5.2 Sub-tabs</H2>
      <P lang="en">
        Overview (index + sub-score bars) · Controls (Secure Score control
        list) · Incidents · Identity (risky users) · Data · Devices ·
        Governance · Connection (per-endpoint call health).
      </P>

      <H1 lang="en" num={6}>Identity (/identity)</H1>
      <P lang="en">
        Council-wide roll-up of identity posture: total users, at-risk users,
        Conditional Access MFA coverage, PIM sprawl (standing vs eligible
        admin assignments), and Defender for Identity sensor health.
      </P>
      <Callout lang="en" title="What to look for">
        High "standing admin" counts combined with low eligible counts mean
        the entity is not using PIM for just-in-time elevation — a common
        Council audit finding worth following up.
      </Callout>

      <H1 lang="en" num={7}>Threats (/threats)</H1>
      <P lang="en">
        Unified incidents + advanced hunting + threat intelligence + attack
        simulation rollup. This is the security-operations-shaped page.
      </P>
      <H2 lang="en">7.1 Advanced Hunting KQL packs</H2>
      <P lang="en">
        Three Council-curated queries run against every entity on each sync
        cycle, respecting the 45 calls/min/tenant Graph rate limit: "Failed
        admin sign-ins (last 24h)", "Conditional Access policies not modified
        in 180 days", "OAuth consent grants (last 7 days)". The results table
        shows row counts per entity per pack; a high count is a conversation
        starter, not an alert.
      </P>
      <H2 lang="en">7.2 Attack Simulation</H2>
      <P lang="en">
        Ranked table of entities by phish click-rate from Microsoft's Attack
        Simulation runs. Lower is better. Entities without Attack Simulation
        enabled simply don't appear.
      </P>

      <H1 lang="en" num={8}>Data protection (/data)</H1>
      <P lang="en">
        Microsoft Purview read surface: DLP alerts, Insider Risk alerts,
        Communication Compliance alerts, Subject Rights Requests, sensitivity
        label catalog, retention label catalog, and SharePoint external
        sharing posture.
      </P>
      <SimpleTable
        lang="en"
        headers={["Tile / column", "Signal"]}
        rows={[
          ["DLP alerts", "/security/alerts_v2, DLP service source"],
          ["IRM alerts", "/security/alerts_v2, Insider Risk service source"],
          ["Comm Compliance alerts", "/security/alerts_v2, CommComp service source"],
          ["Subject Rights Requests", "/security/subjectRightsRequests"],
          ["Sensitivity / retention labels", "Catalog counts per entity"],
          ["External sharing", "/admin/sharepoint/settings — capability tier"],
        ]}
      />

      <H1 lang="en" num={9}>Devices (/devices)</H1>
      <P lang="en">
        Intune rollup: total managed devices, compliance %, breakdown by OS,
        entity ranking by non-compliant count. Drill into any entity for the
        per-device list (encrypted / compliant state / OS version / last sync).
      </P>

      <H1 lang="en" num={10}>Governance (UAE NESA)</H1>
      <P lang="en">
        The compliance view. Shows Council-wide UAE NESA alignment %,
        Council-baseline (% of entities above target), and per-clause coverage
        bars for the eight NESA clauses (T.1 – T.8). Clauses and their
        Secure Score control mappings are Council-editable in Settings →
        NESA mapping.
      </P>
      <Callout lang="en" title="Framework scope">
        This project's mapping covers UAE NESA only. NCA and ISR were
        discussed in earlier scope drafts but are not in the current project's
        framework set; they can be added in a future engagement.
      </Callout>

      <H1 lang="en" num={11}>Settings</H1>
      <P lang="en">
        Eight tabs, each covering one configuration surface. All tabs save to
        the SQLite app_config table and take effect without a server restart.
      </P>
      <SimpleTable
        lang="en"
        headers={["Tab", "What it does"]}
        rows={[
          ["Entities", "Discovery Letter download + Onboarding Wizard (5 steps) + entity list with Suspend/Schedule-review/Export-card/Defender-portal actions + per-row Sync now"],
          ["App Registration", "Entra client ID + secret (DB-backed, masked, MSAL cache invalidated on save). 6-step inline walkthrough for setting up the multi-tenant app in Entra, with a one-click Copy for the exact redirect URI."],
          ["Maturity Index", "Six sub-score weight sliders + Council target. Weight-sum guard — Save disabled until 100%, Normalize button proportionally scales."],
          ["NESA mapping", "8 default UAE NESA clauses (T.1–T.8). Per-clause bilingual title, weight (auto-normalized), list of Secure Score controls that evidence the clause."],
          ["Discovery PDF", "Template for the pre-onboarding Discovery Letter. EN + AR strings edited together, bilingual preview available."],
          ["Onboarding PDF", "Template for the post-discovery Onboarding Letter. EN + AR strings, section body editors, signature-role editors."],
          ["Audit log", "Council-wide endpoint health. Every Graph call recorded; filter by healthy / errors / throttled. Free-text search over entity, endpoint, error message."],
          ["Documentation", "Download these 5 handoff PDFs + the 2 letter templates in EN and AR."],
        ]}
      />

      <H1 lang="en" num={12}>Common tasks</H1>
      <H2 lang="en">12.1 Onboard a new entity</H2>
      <NumBullet lang="en" n={1}>
        Download and email the Discovery Letter (Settings → Entities).
      </NumBullet>
      <NumBullet lang="en" n={2}>
        On reply, open the Onboarding Wizard and walk the five steps.
      </NumBullet>
      <NumBullet lang="en" n={3}>
        Email the generated Onboarding Letter PDF to the entity's Global Admin.
      </NumBullet>
      <NumBullet lang="en" n={4}>
        Wait for consent; the entity appears live within 10 minutes.
      </NumBullet>

      <H2 lang="en">12.2 Adjust the Maturity Index formula</H2>
      <P lang="en">
        Settings → Maturity Index. Move sliders. Weights normalize to 100% on
        save. Change the target with the second slider. Changes apply on the
        next page render.
      </P>

      <H2 lang="en">12.3 Investigate a "red" entity</H2>
      <NumBullet lang="en" n={1}>
        Click the entity in the list. Check the sub-score bars on the overview.
      </NumBullet>
      <NumBullet lang="en" n={2}>
        Click the weakest bar's tab to drill down (e.g., Controls for Secure
        Score, Identity for risky users).
      </NumBullet>
      <NumBullet lang="en" n={3}>
        Use the Defender portal deep-link to take action in Microsoft's native
        tooling — the Council dashboard does not perform remediation itself.
      </NumBullet>

      <H2 lang="en">12.4 Export executive reporting</H2>
      <P lang="en">
        Entities → Export CSV for a flat view. For per-entity archival,
        Entity Detail → Export card. For cross-Council narrative, pair with
        the Maturity overview screenshots.
      </P>

      <Callout lang="en" title="When numbers look wrong">
        First check Settings → Audit log. If a specific endpoint shows recent
        failures, that's the cause. If the tenant's Connection column is red
        in the Entities list, the sync failed — click Sync now in Entity
        Detail to retry. If consent flipped to 'revoked', the entity admin
        needs to re-consent.
      </Callout>
    </View>
  );
}

function BodyAr() {
  return (
    <View>
      <H1 lang="ar" num={1}>ما هي اللوحة وما ليست كذلك</H1>
      <P lang="ar">
        لوحة الوضع الأمني والنضج هي طبقة مراقبة من جانب جهة الإشراف
        تقرأ الوضع الأمني من كل مستأجر Microsoft 365 لكل جهة فرعية موافِقة
        وترتّبه مقابل الهدف الذي تحدده الجهة المُشرفة.
      </P>
      <Callout lang="ar" title="وضعا النشر (v2.0+)">
        تعمل المنصة إما في{" "}
        <Text style={{ fontWeight: 700 }}>وضع المراقبة</Text> (قراءة فقط عبر
        كل جهة — لا كتابات Graph أبدًا) أو{" "}
        <Text style={{ fontWeight: 700 }}>وضع التوجيه</Text> (المراقبة مع
        طبقة كتابة منسَّقة للجهات التي توافق صراحةً). يُحدَّد الوضع عند
        التثبيت عبر متغير البيئة{" "}
        <Text style={{ fontWeight: 700 }}>MIZAN_DEPLOYMENT_MODE</Text>. لا
        يُكتب أبدًا في الجهات بوضع المراقبة بصرف النظر عن وضع النشر. تغطّي
        طبقة الكتابة Conditional Access، ووضع الأجهزة في Intune، وإعدادات
        SharePoint للمشاركة الخارجية، ومؤشّرات Defender التهديدية،
        والإجراءات التفاعلية على الحوادث/التنبيهات/المستخدمين — راجع صفحة{" "}
        <Text style={{ fontWeight: 700 }}>/directive</Text> المخصّصة في
        اللوحة لتدفّق المشغّل الكامل.
      </Callout>
      <P lang="ar">
        كل رقم تراه محسوب من قراءات حيّة عبر Microsoft Graph بدورة تحديث يومية.
        القيم مقسّمة حسب المستأجر — لا يحدث أي ربط بين بيانات المستأجرين إلا
        عبر تجميعات المجلس الموضحة في هذا الدليل.
      </P>

      <H1 lang="ar" num={2}>الدخول والتنقّل</H1>
      <P lang="ar">
        يمكن الوصول إلى اللوحة عبر الرابط الذي تستضيفه جهة التشغيل (مثل
        posture.your-org.example). يُغلَّف الوصول عادةً ببوابة Cloudflare Zero
        Trust أو ما يعادلها أمام التطبيق؛ يدخل الموظفون بحسابات Entra الخاصة
        بجهتهم.
      </P>
      <H2 lang="ar">٢.١ الهيكل</H2>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>الشريط العلوي</Text> — يسار هوية
        المجلس؛ يمين زر تبديل اللغة، تبديل الثيم، التنبيهات، وزر "مزامنة الكل"
        للتحديث اليدوي.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>الشريط الجانبي</Text> — تسع
        علامات تبويب رئيسية بالإضافة إلى لوحة مصادر البيانات أسفلها تظهر
        واجهات Graph المغذّية للوحة وصحتها الحيّة.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>المحتوى الرئيسي</Text> — يختلف بحسب
        المسار. كل صفحة تعرض حالات التحميل والخطأ والفراغ والامتلاء بتناسق.
      </Bullet>
      <H2 lang="ar">٢.٢ ثنائي اللغة + RTL</H2>
      <P lang="ar">
        بدّل بين EN / AR من الشريط العلوي. تُترجم كل نصوص الواجهة ورؤوس
        الأعمدة؛ تُعرض الأرقام بأرقام هندية-عربية (٠ - ٩). تبقى أسماء
        المنتجات باللغة الإنجليزية في كلا اللغتين (Microsoft Secure Score و
        Defender و Purview و Entra ID و Intune) — اختيار مقصود لتجنّب اللبس
        التقني.
      </P>

      <H1 lang="ar" num={3}>نظرة النضج العامة (/maturity)</H1>
      <P lang="ar">
        الصفحة الرئيسية. تعرض مؤشر النضج على مستوى المجلس، عدد الجهات فوق/دون
        الهدف، متوسط كل قطاع، وأكبر التحولات خلال آخر ٧ أيام.
      </P>
      <H2 lang="ar">٣.١ قراءة مؤشر النضج</H2>
      <P lang="ar">
        درجة واحدة من ٠ إلى ١٠٠ لكل جهة، محسوبة كمعدل موزون لستة مؤشرات فرعية:
        Secure Score (٢٥٪)، وضع الهوية (٢٠٪)، وضع الأجهزة (١٥٪)، حماية البيانات
        (١٥٪)، الاستجابة للتهديدات (١٥٪)، المواءمة مع الإطار (١٠٪). الأوزان
        قابلة للتحرير من المجلس في الإعدادات ← مؤشر النضج.
      </P>
      <Bullet lang="ar">الأخضر الداكن: عند الهدف أو فوقه (الافتراضي ٧٥).</Bullet>
      <Bullet lang="ar">الكهرماني: ضمن ١٠ نقاط تحت الهدف.</Bullet>
      <Bullet lang="ar">الأحمر: أكثر من ١٠ نقاط تحت الهدف.</Bullet>
      <H2 lang="ar">٣.٢ "كيف يُحتسب هذا؟"</H2>
      <P lang="ar">
        الصيغة شفّافة وتُعرض ديناميكيًا وفق أوزان المجلس المُعدّة. اضغط
        "كيف يُحتسب؟" أسفل المؤشر لفتح صفحة الأسئلة الشائعة الشارحة لكل
        المدخلات والأوزان.
      </P>

      <H1 lang="ar" num={4}>قائمة الجهات (/entities)</H1>
      <P lang="ar">
        قلب اللوحة التشغيلي. صف لكل جهة مُسجّلة، مرتَّب بمؤشر النضج.
      </P>
      <H2 lang="ar">٤.١ الأعمدة</H2>
      <SimpleTable
        lang="ar"
        headers={["العمود", "ما يظهره"]}
        rows={[
          ["الجهة", "الاسم بالعربية والإنجليزية، النطاق، شارة Demo إن وجدت"],
          ["القطاع", "شرطة / صحة / تعليم / بلدية / مرافق / نقل"],
          ["النضج", "٠-١٠٠ مع شريط تقدّم ملوَّن حسب قرب الهدف"],
          ["الضوابط", "نسبة ضوابط Secure Score الناجحة"],
          ["الحوادث", "الحوادث الأمنية المفتوحة من Defender XDR"],
          ["ذوو المخاطر", "المستخدمون ذوو المخاطر من Identity Protection"],
          ["امتثال الأجهزة", "نسبة أجهزة Intune المبلِّغة بالامتثال"],
          ["الاتصال", "نقطة خضراء/كهرمانية/حمراء حسب صحة آخر مزامنة"],
          ["آخر مزامنة", "طابع زمني نسبي لأحدث مزامنة"],
        ]}
      />
      <H2 lang="ar">٤.٢ التصفية والترتيب</H2>
      <P lang="ar">
        اكتب في صندوق البحث للتصفية بالاسم والنطاق واسم/بريد مسؤول أمن
        المعلومات (غير حساس لحالة الأحرف، يطابق العربية والإنجليزية). شرائح
        القطاعات تصفّي قطاعًا واحدًا. اضغط على أي رأس عمود للترتيب؛ اضغط
        مرة أخرى لعكس الاتجاه. الصفوف الخالية من البيانات (الجهات في انتظار
        الموافقة) تنزل إلى الأسفل في الترتيبات الرقمية بغض النظر عن الاتجاه.
      </P>
      <H2 lang="ar">٤.٣ تصدير CSV</H2>
      <P lang="ar">
        الزر في أعلى اليمين يصدّر العرض المصفّى والمرتّب حاليًا إلى CSV بعلامة
        BOM لترميز UTF-8 بحيث يفتح Excel العربية صحيحًا في كلا اللغتين. مفيد
        للتقارير التنفيذية.
      </P>

      <H1 lang="ar" num={5}>تفاصيل الجهة</H1>
      <P lang="ar">
        اضغط على أي جهة في القائمة للتعمق في صفحتها الخاصة. الرأس يعرض هوية
        الجهة، حالة الموافقة، شريحة آخر مزامنة، وأربعة أزرار إجراءات.
      </P>
      <H2 lang="ar">٥.١ أزرار الإجراءات</H2>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>بوابة Defender</Text> — تفتح
        security.microsoft.com مركَّزة على مستأجر هذه الجهة (تبويب جديد).
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>تصدير البطاقة</Text> — يحمّل لقطة
        JSON لسجل مستأجر الجهة، النضج، جميع حمولات الإشارات، وصحة الاتصال.
        مفيد للمشاركة مع مسؤول أمن المعلومات في الجهة أو للأرشفة.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>جدولة مراجعة</Text> — يضبط تاريخ
        مراجعة معلوماتي + ملاحظة اختيارية على الجهة. يظهر كشريط على صفحة
        التفاصيل. لا ينطلق أي إجراء آلي.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>إيقاف/استئناف</Text> — يوقف مؤقتًا
        المزامنة الخلفية لهذه الجهة. لا يتم إلغاء الموافقة؛ تبقى اللقطات
        السابقة. الاستئناف يعيد تشغيل المزامنة اليومية.
      </Bullet>
      <H2 lang="ar">٥.٢ التبويبات الفرعية</H2>
      <P lang="ar">
        نظرة عامة (المؤشر وأشرطة المؤشرات الفرعية) · الضوابط (قائمة ضوابط
        Secure Score) · الحوادث · الهوية (ذوو المخاطر) · البيانات · الأجهزة ·
        الحوكمة · الاتصال (صحة كل نقطة نهاية).
      </P>

      <H1 lang="ar" num={6}>الهوية (/identity)</H1>
      <P lang="ar">
        تجميع على مستوى المجلس لوضع الهوية: إجمالي المستخدمين، ذوو المخاطر،
        تغطية MFA بواسطة Conditional Access، تضخم PIM (التعيينات الدائمة مقابل
        المؤهَّلة للمسؤولين)، وصحة مستشعرات Defender for Identity.
      </P>
      <Callout lang="ar" title="ما الذي يستحق الانتباه">
        ارتفاع عدد "المسؤولين الدائمين" مع انخفاض المؤهَّلين يعني أن الجهة
        لا تستخدم PIM للترقية عند الحاجة — نتيجة تدقيق شائعة تستحق المتابعة.
      </Callout>

      <H1 lang="ar" num={7}>التهديدات (/threats)</H1>
      <P lang="ar">
        حوادث موحّدة + استعلام متقدم + استخبارات تهديدات + تجميع محاكاة
        الهجمات. هذه صفحة العمليات الأمنية.
      </P>
      <H2 lang="ar">٧.١ حزم استعلام KQL المتقدم</H2>
      <P lang="ar">
        ثلاثة استعلامات مُنسَّقة من المجلس تعمل ضد كل جهة في كل دورة مزامنة،
        مع احترام حد Graph البالغ ٤٥ استدعاءً/دقيقة/مستأجر: "محاولات دخول
        المسؤولين الفاشلة (آخر ٢٤ ساعة)"، "سياسات Conditional Access التي لم
        تُعدَّل خلال ١٨٠ يومًا"، "منح موافقات OAuth (آخر ٧ أيام)". يعرض الجدول
        أعداد الصفوف لكل جهة ولكل حزمة؛ العدد المرتفع يبدأ محادثة، لا تنبيهًا.
      </P>
      <H2 lang="ar">٧.٢ محاكاة الهجمات</H2>
      <P lang="ar">
        جدول مرتَّب للجهات حسب معدل الضغط على روابط التصيد من تشغيلات Attack
        Simulation في Microsoft. الأقل أفضل. الجهات التي لا تُفعِّل Attack
        Simulation لا تظهر.
      </P>

      <H1 lang="ar" num={8}>حماية البيانات (/data)</H1>
      <P lang="ar">
        سطح قراءة Microsoft Purview: تنبيهات DLP، مخاطر الداخل، الامتثال في
        الاتصالات، طلبات حقوق الأفراد، فهرس تصنيفات الحساسية، فهرس تصنيفات
        الاحتفاظ، ووضع المشاركة الخارجية في SharePoint.
      </P>
      <SimpleTable
        lang="ar"
        headers={["البلاطة / العمود", "الإشارة"]}
        rows={[
          ["تنبيهات DLP", "/security/alerts_v2 بفلتر DLP"],
          ["تنبيهات مخاطر الداخل", "/security/alerts_v2 بفلتر Insider Risk"],
          ["تنبيهات امتثال الاتصالات", "/security/alerts_v2 بفلتر CommComp"],
          ["طلبات حقوق الأفراد", "/security/subjectRightsRequests"],
          ["تصنيفات الحساسية / الاحتفاظ", "أعداد الفهرس لكل جهة"],
          ["المشاركة الخارجية", "/admin/sharepoint/settings — مستوى القدرة"],
        ]}
      />

      <H1 lang="ar" num={9}>الأجهزة (/devices)</H1>
      <P lang="ar">
        تجميع Intune: إجمالي الأجهزة المُدارة، نسبة الامتثال، التقسيم حسب
        نظام التشغيل، ترتيب الجهات حسب عدد غير الممتثلة. اضغط على أي جهة
        للاطّلاع على قائمة الأجهزة (مشفّرة / حالة الامتثال / إصدار النظام /
        آخر مزامنة).
      </P>

      <H1 lang="ar" num={10}>الحوكمة (NESA الإماراتي)</H1>
      <P lang="ar">
        عرض الامتثال. يعرض نسبة مواءمة NESA الإماراتي على مستوى المجلس، خط
        أساس المجلس (نسبة الجهات فوق الهدف)، وأشرطة تغطية لكل بند من البنود
        الثمانية (T.1 – T.8). البنود وارتباطاتها بضوابط Secure Score قابلة
        للتحرير من المجلس في الإعدادات ← مواءمة NESA.
      </P>
      <Callout lang="ar" title="نطاق الإطار">
        تغطي مواءمة هذا المشروع NESA الإماراتي فقط. وقد نوقشت أُطر NCA و
        ISR في مسوّدات النطاق السابقة لكنها ليست ضمن مجموعة أطر المشروع
        الحالي؛ يمكن إضافتها في تعاون مستقبلي.
      </Callout>

      <H1 lang="ar" num={11}>الإعدادات</H1>
      <P lang="ar">
        ثمانية تبويبات، كل منها يغطي سطح إعداد واحد. جميع التبويبات تحفظ
        إلى جدول SQLite app_config وتأخذ مفعولها دون إعادة تشغيل الخادم.
      </P>
      <SimpleTable
        lang="ar"
        headers={["التبويب", "ما يفعله"]}
        rows={[
          ["الجهات", "تنزيل خطاب الاكتشاف + معالج التسجيل (٥ خطوات) + قائمة الجهات مع إجراءات إيقاف/جدولة مراجعة/تصدير بطاقة/بوابة Defender + مزامنة فورية لكل صف"],
          ["تسجيل التطبيق", "معرّف وسر عميل Entra (مُخزَّن في قاعدة البيانات، مُقنَّع، تفريغ ذاكرة MSAL عند الحفظ). دليل مرحلي من ٦ خطوات لإعداد التطبيق متعدد المستأجرين في Entra، مع نسخ بضغطة واحدة لرابط إعادة التوجيه الدقيق."],
          ["مؤشر النضج", "ستة أشرطة للمؤشرات الفرعية + هدف المجلس. حارس مجموع الأوزان — زر الحفظ معطّل حتى ١٠٠٪، زر التطبيع يعيد التوزيع نسبيًا."],
          ["مواءمة NESA", "٨ بنود افتراضية لإطار NESA الإماراتي (T.1–T.8). عنوان ثنائي اللغة لكل بند، وزن (مع تطبيع تلقائي)، قائمة ضوابط Secure Score التي تُثبت البند."],
          ["خطاب الاكتشاف", "قالب خطاب الاكتشاف ما قبل التسجيل. تحرير نصوص EN و AR معًا، ومعاينة ثنائية اللغة متاحة."],
          ["خطاب الإعداد", "قالب خطاب الإعداد ما بعد الاكتشاف. نصوص EN و AR، محررات نصوص الأقسام، محررات أدوار التوقيع."],
          ["سجل التدقيق", "صحة نقاط النهاية على مستوى المجلس. كل استدعاء Graph مُسجَّل؛ تصفية حسب سليم / بها أخطاء / مقيّدة. بحث نصي عبر الجهة ونقطة النهاية ورسالة الخطأ."],
          ["التوثيق", "تنزيل هذه الملفات الخمسة للتسليم + قالبَي الخطابين بالإنجليزية والعربية."],
        ]}
      />

      <H1 lang="ar" num={12}>المهام الشائعة</H1>
      <H2 lang="ar">١٢.١ تسجيل جهة جديدة</H2>
      <NumBullet lang="ar" n={1}>
        نزّل خطاب الاكتشاف وأرسله (الإعدادات ← الجهات).
      </NumBullet>
      <NumBullet lang="ar" n={2}>
        عند الرد، افتح معالج التسجيل واتبع الخطوات الخمس.
      </NumBullet>
      <NumBullet lang="ar" n={3}>
        أرسل ملف PDF لخطاب الإعداد المُنشأ إلى المسؤول العام في الجهة.
      </NumBullet>
      <NumBullet lang="ar" n={4}>
        انتظر الموافقة؛ تظهر الجهة مباشرة خلال ١٠ دقائق.
      </NumBullet>

      <H2 lang="ar">١٢.٢ تعديل صيغة مؤشر النضج</H2>
      <P lang="ar">
        الإعدادات ← مؤشر النضج. حرّك الأشرطة. تُطبَّع الأوزان إلى ١٠٠٪ عند
        الحفظ. غيّر الهدف بالشريط الثاني. تُطبَّق التغييرات في عرض الصفحة التالي.
      </P>

      <H2 lang="ar">١٢.٣ التحقيق في جهة "حمراء"</H2>
      <NumBullet lang="ar" n={1}>
        اضغط على الجهة في القائمة. تحقق من أشرطة المؤشرات الفرعية في النظرة العامة.
      </NumBullet>
      <NumBullet lang="ar" n={2}>
        اضغط على تبويب أضعف شريط للتعمق (مثلاً الضوابط لخدمة Secure Score،
        الهوية لذوي المخاطر).
      </NumBullet>
      <NumBullet lang="ar" n={3}>
        استخدم رابط بوابة Defender لاتخاذ إجراء في أدوات Microsoft الأصلية —
        لا تُجري لوحة المجلس أي معالجة بنفسها.
      </NumBullet>

      <H2 lang="ar">١٢.٤ تصدير التقارير التنفيذية</H2>
      <P lang="ar">
        الجهات ← تصدير CSV لرؤية مسطّحة. للأرشفة لكل جهة، تفاصيل الجهة ←
        تصدير البطاقة. للسرد على مستوى المجلس، اقرنها مع لقطات نظرة النضج.
      </P>

      <Callout lang="ar" title="عندما تبدو الأرقام خاطئة">
        تحقق أولاً من الإعدادات ← سجل التدقيق. إذا أظهرت نقطة نهاية معينة
        أخطاءً حديثة، فهذا هو السبب. إذا كان عمود الاتصال أحمر في قائمة
        الجهات، فشلت المزامنة — اضغط "مزامنة الآن" في تفاصيل الجهة للمحاولة
        مرة أخرى. إذا تحولت الموافقة إلى 'revoked'، يحتاج مسؤول الجهة لإعادة
        الموافقة.
      </Callout>
    </View>
  );
}
