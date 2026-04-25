import { Text, View } from "@react-pdf/renderer";
import {
  Bullet,
  Callout,
  buildDefaultMeta,
  HandoffDocument,
  H1,
  H2,
  P,
  SimpleTable,
  type DocLang,
  type DocumentMeta,
} from "./layout";
import { getBranding } from "@/lib/config/branding";

function buildMeta(): DocumentMeta {
  return {
    ...buildDefaultMeta(getBranding()),
    docTitleEn: "Security & Privacy Statement",
    docTitleAr: "بيان الأمن والخصوصية",
    subtitleEn:
      "Formal statement of what the Posture & Maturity Dashboard reads, what it does not read, where data is stored, who can access it, and how the platform aligns with sovereign-data requirements.",
    subtitleAr:
      "بيان رسمي لما تقرأه لوحة الوضع الأمني والنضج وما لا تقرأه، وأين تُخزَّن البيانات، ومن يستطيع الوصول إليها، وكيف تتوافق المنصة مع متطلبات سيادة البيانات.",
    audienceEn: "Organization leadership · entity CISOs · legal / compliance review",
    audienceAr: "قيادة الجهة · مسؤولو أمن المعلومات في الجهات · مراجعة قانونية/امتثال",
  };
}

const SECTIONS = [
  { titleEn: "Read-only posture", titleAr: "وضع القراءة فقط" },
  { titleEn: "What IS read", titleAr: "ما يُقرأ" },
  { titleEn: "What is NOT read", titleAr: "ما لا يُقرأ" },
  { titleEn: "Storage and residency", titleAr: "التخزين والسيادة" },
  { titleEn: "Access control", titleAr: "ضبط الوصول" },
  { titleEn: "Audit and retention", titleAr: "التدقيق والاحتفاظ" },
  { titleEn: "Revocation and exit", titleAr: "الإلغاء والخروج" },
  { titleEn: "Framework alignment", titleAr: "المواءمة مع الأطر" },
];

export function SecurityPrivacyStatement({ lang }: { lang: DocLang }) {
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
      <H1 lang="en" num={1}>Two deployment modes</H1>
      <P lang="en">
        The platform ships in one of two deployment modes, fixed at install
        time and visible to every connected entity in the Onboarding Letter:
      </P>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Observation mode</Text> — read-only
        posture observability. The platform never writes to, modifies, or
        deletes data, policies, or configuration in any connected entity's
        tenant. Every Microsoft Graph permission requested is an
        application-level <Text style={{ fontWeight: 700 }}>Read</Text>{" "}
        scope. This is the default, and the only mode for entities that
        consent to the read-only Onboarding Letter.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Directive mode</Text> — observation
        plus a curated write tier (Conditional Access baselines, Intune
        device-posture policies, SharePoint tenant external-sharing settings,
        Defender for Endpoint Threat Intelligence indicators, reactive
        incident / alert / user actions). Entities opt into directive mode
        with a separate admin-consent flow against a second Entra app
        carrying writable scopes; the directive Onboarding Letter PDF lists
        exactly which scopes that second app holds.
      </Bullet>
      <Callout lang="en" title="Entities retain full autonomy">
        Per-entity consent mode is mutable. An entity that consented in
        observation mode is never written to until its Global Administrator
        runs the directive consent flow. An entity that consented in
        directive mode can revoke the directive app at any time from their
        own Entra admin center, downgrading themselves to observation. Each
        entity's own IT + security team remains the sole authoritative
        authority over its own configuration.
      </Callout>

      <H1 lang="en" num={2}>What IS read</H1>
      <P lang="en">
        Eighteen signal families are read on a daily cadence. Only aggregated
        summary payloads and up to 2,000 individual records per signal type
        per tenant are persisted.
      </P>
      <SimpleTable
        lang="en"
        headers={["Category", "Signals"]}
        rows={[
          [
            "Identity",
            "Risky users, risk detections, Conditional Access policy list, PIM role assignments + eligibility, sign-in health",
          ],
          [
            "Endpoint",
            "Intune managed device inventory with OS + compliance state + encryption + last sync",
          ],
          [
            "Threat",
            "Unified incidents, unified alerts, Advanced Hunting KQL packs, Attack Simulation reports, Threat Intelligence articles, DFI sensor health",
          ],
          [
            "Data protection (Purview reads)",
            "DLP alerts, Insider Risk alerts, Communication Compliance alerts, Subject Rights Requests, sensitivity label catalog, retention label catalog, SharePoint external-sharing posture, sensitivity label adoption telemetry (async audit-log query)",
          ],
          [
            "Score",
            "Microsoft Secure Score (tenant + per-control)",
          ],
        ]}
      />

      <H1 lang="en" num={3}>What is NOT read</H1>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Email content</Text> — message bodies,
        attachments, headers. Never read.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>File content</Text> — contents of
        SharePoint, OneDrive, or Teams files. Never read.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Teams chat content</Text> — message
        text, channel conversations, private chats. Never read.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Personal device content</Text> —
        nothing below the device identity + compliance state is collected.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Cross-tenant correlation of user
        identities</Text> beyond what the Maturity Index mathematically
        requires — the dashboard never identifies an individual across
        entities.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Email message contents</Text>,{" "}
        <Text style={{ fontWeight: 700 }}>file contents</Text>, and{" "}
        <Text style={{ fontWeight: 700 }}>chat message contents</Text> are
        never read in either mode.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Observation-mode entities</Text> —
        no write-side configuration of any kind. DLP policies, retention
        labels, Conditional Access policies, Intune profiles, SharePoint
        settings: all entirely in entity hands.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Directive-mode entities</Text> —
        the Council platform may create / update / delete policy objects in
        the entity's tenant, scoped to the writable surfaces enumerated in
        the directive Onboarding Letter (Conditional Access, Intune device
        compliance + app protection + device config + ASR rules, SharePoint
        tenant settings, Defender for Endpoint Threat Intelligence
        indicators, reactive incident / alert / user actions). Every write
        is captured in `directive_actions` with actor + timestamp + Graph
        response.
      </Bullet>

      <H1 lang="en" num={4}>Storage and residency</H1>
      <P lang="en">
        Signal data is stored in the Council-hosted dashboard's own persistent
        storage. No data is transmitted to external analytics platforms,
        third-party SaaS, or AI inference services.
      </P>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Region</Text> — recommended
        deployment: Azure UAE-North primary, UAE-Central for disaster recovery.
        All data at rest stays within UAE sovereign regions.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Format</Text> — SQLite database on a
        Council-managed Azure Files mount. Snapshot records are JSON payloads
        keyed by tenant + signal type + timestamp.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Encryption</Text> — at rest via
        Azure Storage Service Encryption (Microsoft-managed keys by default;
        Council-managed keys available on request). In transit via TLS 1.2+
        to both Graph and the dashboard URL.
      </Bullet>

      <H1 lang="en" num={5}>Access control</H1>
      <P lang="en">
        Two distinct authentication paths, each with its own trust boundary:
      </P>
      <H2 lang="en">5.1 Graph paths (app-to-tenant)</H2>
      <P lang="en">
        Two multi-tenant Entra applications, one per direction:
      </P>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Graph-Signals app</Text> —{" "}
        application-level Read scopes only. Used by every deployment for
        the daily posture sync. Permissions enumerated in Section 2 of
        the observation Onboarding Letter.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Directive app</Text> — only
        provisioned in directive-mode deployments. Holds the writable
        scopes Mizan needs for Conditional Access push, Intune policy
        push, SharePoint tenant settings, IOC submission, and reactive
        actions. Permissions enumerated in Section 2 of the directive
        Onboarding Letter. Entities consent separately to this app; an
        observation-mode entity never has it consented in their tenant.
      </Bullet>
      <P lang="en">
        Both apps use confidential-client authentication. Production
        deployments should use{" "}
        <Text style={{ fontWeight: 700 }}>certificate-based MSAL</Text>{" "}
        (PEM private key + SHA-1 thumbprint via Settings → App
        Registration → Certificate, or via Key Vault env vars) instead of
        a shared client secret. Cert lifetime = whatever the operator
        signs with; no secret rotation tax.
      </P>
      <H2 lang="en">5.2 Dashboard access (user-to-Mizan)</H2>
      <P lang="en">
        Access to the dashboard itself is gated by Mizan's user-auth Entra
        application (OpenID Connect + authorization code) plus its built-in
        RBAC (Admin / Analyst / Viewer roles). The user-auth app supports
        the same secret-or-cert toggle as the Graph apps. For demo URLs,
        Cloudflare Zero Trust Access stays in front as a network-layer
        gate.
      </P>

      <H1 lang="en" num={6}>Audit and retention</H1>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Every Graph call</Text> is recorded
        in the Council-side endpoint_health log — endpoint path, last success,
        last error message, 24-hour call count, 24-hour throttle count.
        Surfaced in Settings → Audit log.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Signal retention</Text> — 90 days
        by default, tunable via SCSC_RETENTION_DAYS. Aggregated Maturity
        Index history is preserved indefinitely for trend analysis.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Audit-of-access retention</Text> —
        2 years minimum, aligned with UAE NESA audit requirements. Append-only
        store.
      </Bullet>

      <H1 lang="en" num={7}>Revocation and exit</H1>
      <P lang="en">
        Any entity may revoke the Council's read-only consent at any time
        from their own Entra admin center → Enterprise applications → find
        the Council app → Delete (or Review consent). The dashboard
        auto-detects revocation: when every Graph call against an entity
        fails with HTTP 401 or a known AADSTS revocation code (65001,
        700016, 50020, 500011), the entity's consent_status flips to{" "}
        <Text style={{ fontWeight: 700 }}>revoked</Text>, the MSAL token
        cache invalidates, and subsequent syncs skip that tenant until the
        entity re-consents.
      </P>
      <P lang="en">
        Entity offboarding (full data removal on the Council side) is a
        single operation: the Council opens Settings → Entities → row
        actions → Delete. This drops the entity's snapshots and tenant
        record atomically.
      </P>
      <Callout lang="en" title="Consent-callback isolation">
        After an entity admin grants consent, Entra redirects back to the
        Council dashboard. The redirect lands on a standalone
        {" "}<Text style={{ fontWeight: 700 }}>/consent-success</Text> page
        rendered outside the dashboard route group — no sidebar, no nav, no
        Council-wide posture data. The entity admin sees a confirmation
        screen and is asked to close the tab. This prevents cross-tenant
        data exposure that an entity admin might otherwise accidentally
        browse into.
      </Callout>

      <H1 lang="en" num={8}>Framework alignment</H1>
      <P lang="en">
        The Maturity Index includes a framework-alignment sub-score (10%
        weight by default) that synthesizes adoption of UAE NESA clauses from
        Microsoft Secure Score control pass states. The synthesis is explicit
        — the mapping table is Council-editable in Settings → NESA mapping —
        and is NOT a substitute for a formal Compliance Manager audit or
        UAE NESA certification.
      </P>
      <P lang="en">
        Microsoft Compliance Manager's own scores are not exposed via
        Microsoft Graph. This limitation is documented and visible to
        Council leadership; the dashboard does not misrepresent synthesized
        values as audited framework scores.
      </P>
    </View>
  );
}

function BodyAr() {
  return (
    <View>
      <H1 lang="ar" num={1}>وضعا النشر</H1>
      <P lang="ar">
        تُنشر المنصة في أحد وضعين، يُحدَّد عند التثبيت ويظهر لكل جهة في
        خطاب الإعداد:
      </P>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>وضع المراقبة</Text> — قراءة الوضع
        الأمني فقط. لا تكتب ولا تعدّل ولا تحذف أي بيانات أو سياسات أو
        إعدادات في مستأجر أي جهة. كل إذن Microsoft Graph مطلوب هو نطاق
        <Text style={{ fontWeight: 700 }}> Read</Text> على مستوى التطبيق.
        وهذا هو الافتراضي والوضع الوحيد للجهات التي توافق على خطاب الإعداد
        للقراءة فقط.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>وضع التوجيه</Text> — المراقبة مع
        طبقة كتابة منسَّقة (قواعد Conditional Access، سياسات وضع الأجهزة في
        Intune، إعدادات SharePoint للمشاركة الخارجية، مؤشّرات Defender
        التهديدية، إجراءات تفاعلية على الحوادث/التنبيهات/المستخدمين). تختار
        الجهة الانضمام إلى وضع التوجيه عبر تدفّق موافقة منفصل لتطبيق Entra
        ثانٍ يحمل نطاقات قابلة للكتابة؛ يسرد خطاب إعداد التوجيه بالضبط أي
        نطاقات يحملها هذا التطبيق الثاني.
      </Bullet>
      <Callout lang="ar" title="الجهات تحتفظ بالاستقلالية الكاملة">
        وضع موافقة الجهة قابل للتعديل. الجهة التي وافقت في وضع المراقبة لا
        يُكتب إليها حتى يُشغّل مسؤولها العام تدفّق موافقة التوجيه. الجهة التي
        وافقت في وضع التوجيه يمكنها سحب تطبيق التوجيه في أي وقت من مركز
        إدارة Entra لديها، فتعود إلى وضع المراقبة. يبقى فريق تقنية المعلومات
        والأمن لكل جهة السلطة الوحيدة المخوّلة بإعداداتها.
      </Callout>

      <H1 lang="ar" num={2}>ما يُقرأ</H1>
      <P lang="ar">
        تُقرأ ثماني عشرة فئة إشارات بوتيرة يومية. لا يُحفظ سوى ملخصات مجمَّعة
        وحتى ٢٠٠٠ سجل فردي لكل نوع إشارة ولكل مستأجر.
      </P>
      <SimpleTable
        lang="ar"
        headers={["الفئة", "الإشارات"]}
        rows={[
          [
            "الهوية",
            "ذوو المخاطر، كشف المخاطر، قائمة سياسات Conditional Access، تعيينات PIM والمؤهَّلات، صحة تسجيل الدخول",
          ],
          [
            "نقاط النهاية",
            "جرد أجهزة Intune المُدارة مع نظام التشغيل وحالة الامتثال والتشفير وآخر مزامنة",
          ],
          [
            "التهديدات",
            "حوادث موحّدة، تنبيهات موحّدة، حزم استعلام KQL المتقدم، تقارير Attack Simulation، مقالات استخبارات التهديدات، صحة مستشعرات DFI",
          ],
          [
            "حماية البيانات (قراءات Purview)",
            "تنبيهات DLP، مخاطر الداخل، امتثال الاتصالات، طلبات حقوق الأفراد، فهرس تصنيفات الحساسية، فهرس تصنيفات الاحتفاظ، وضع المشاركة الخارجية في SharePoint، قياسات تبنّي التصنيفات (استعلام غير متزامن)",
          ],
          [
            "الدرجة",
            "Microsoft Secure Score (مستوى المستأجر ومستوى الضوابط)",
          ],
        ]}
      />

      <H1 lang="ar" num={3}>ما لا يُقرأ</H1>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>محتوى البريد الإلكتروني</Text> — نص
        الرسالة، المرفقات، الترويسات. لا يُقرأ أبدًا.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>محتوى الملفات</Text> — محتوى
        SharePoint و OneDrive وملفات Teams. لا يُقرأ أبدًا.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>محتوى محادثات Teams</Text> — نص
        الرسائل، قنوات المحادثة، المحادثات الخاصة. لا يُقرأ أبدًا.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>محتوى الأجهزة الشخصية</Text> — لا
        يُجمع أي شيء تحت هوية الجهاز وحالة امتثاله.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>ربط هويات المستخدمين بين
        المستأجرات</Text> بما يتجاوز ما يتطلبه احتساب مؤشر النضج رياضيًا —
        لا تحدد اللوحة أبدًا فردًا عبر الجهات.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>إعدادات جانب الكتابة</Text> —
        تأليف سياسات DLP، نشر تصنيفات الاحتفاظ، إنشاء سياسات Conditional
        Access، إعداد Information Barriers. خارج النطاق صراحة؛ كل جهة تؤلّف
        سياساتها الخاصة.
      </Bullet>

      <H1 lang="ar" num={4}>التخزين والسيادة</H1>
      <P lang="ar">
        تُخزَّن بيانات الإشارات في التخزين الدائم للوحة المُستضافة من المجلس
        نفسه. لا تُرسل أي بيانات إلى منصات تحليلات خارجية أو خدمات SaaS أو
        خدمات استدلال ذكاء اصطناعي تابعة لجهات خارجية.
      </P>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>المنطقة</Text> — النشر الموصى به:
        Azure UAE-North رئيسي، UAE-Central للكوارث. تبقى جميع البيانات في
        حالة السكون داخل المناطق السيادية الإماراتية.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>الصيغة</Text> — قاعدة SQLite على
        Azure Files مُركَّب ومُدار من المجلس. سجلات اللقطات حمولات JSON
        مُفَهْرسة بالمستأجر ونوع الإشارة والطابع الزمني.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>التشفير</Text> — في حالة السكون
        عبر Azure Storage Service Encryption (مفاتيح Microsoft افتراضيًا؛
        مفاتيح مُدارة من المجلس متوفرة عند الطلب). في النقل عبر TLS 1.2+
        إلى Graph ورابط اللوحة.
      </Bullet>

      <H1 lang="ar" num={5}>ضبط الوصول</H1>
      <P lang="ar">
        مساران مميَّزان للمصادقة، لكلٍ منهما حدود ثقة خاصة:
      </P>
      <H2 lang="ar">٥.١ مسار قراءة Graph (من التطبيق إلى المستأجر)</H2>
      <P lang="ar">
        يستخدم تطبيق Entra متعدد المستأجرين الخاص بالمجلس بيانات اعتماد
        العميل (أو شهادة في الإنتاج) للحصول على رمز مميَّز على مستوى التطبيق
        لكل مستأجر. وقد وافق المسؤول العام للجهة صراحة على مجموعة أذونات
        القراءة فقط المذكورة في القسم الثاني من خطاب الإعداد. يمكن للجهة
        فحص أو تقييد أو سحب هذه الموافقة في أي وقت من مركز إدارة Entra
        الخاص بها.
      </P>
      <H2 lang="ar">٥.٢ الوصول إلى اللوحة (من المستخدم إلى المجلس)</H2>
      <P lang="ar">
        يُغلَّف الوصول إلى اللوحة ببوابة Cloudflare Zero Trust Access أمام
        التطبيق. يصادق موظفو المجلس بحسابات Entra الخاصة بالمجلس. تسجيل
        الدخول بالمستخدم المُسَمَّى عبر MSAL مع نطاقات الأدوار (مسؤول /
        محلل / مدقق) تحسين لاحق في خارطة الطريق.
      </P>

      <H1 lang="ar" num={6}>التدقيق والاحتفاظ</H1>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>كل استدعاء Graph</Text> يُسجَّل في
        سجل endpoint_health من جانب المجلس — مسار نقطة النهاية، آخر نجاح،
        آخر رسالة خطأ، عدد الاستدعاءات خلال ٢٤ ساعة، عدد التقييدات خلال ٢٤
        ساعة. يظهر في الإعدادات ← سجل التدقيق.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>الاحتفاظ بالإشارات</Text> — ٩٠ يومًا
        افتراضيًا، قابل للضبط عبر SCSC_RETENTION_DAYS. يُحفظ تاريخ مؤشر
        النضج المجمَّع بلا حد لتحليل الاتجاهات.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>الاحتفاظ بسجل الوصول</Text> — سنتان
        على الأقل، متوافق مع متطلبات تدقيق NESA الإماراتي. مخزن للإضافة فقط.
      </Bullet>

      <H1 lang="ar" num={7}>الإلغاء والخروج</H1>
      <P lang="ar">
        يجوز لأي جهة سحب موافقة القراءة فقط للمجلس في أي وقت من مركز
        إدارة Entra الخاص بها ← Enterprise applications ← البحث عن تطبيق
        المجلس ← حذف (أو مراجعة الموافقة). تكتشف اللوحة السحب تلقائيًا:
        عندما يفشل كل استدعاء Graph مقابل جهة بخطأ HTTP 401 أو رمز AADSTS
        سحب معروف (65001، 700016، 50020، 500011)، يتحول consent_status
        للجهة إلى <Text style={{ fontWeight: 700 }}>revoked</Text>،
        وتُفرَّغ ذاكرة MSAL، وتتخطى المزامنات التالية هذه الجهة حتى تعيد
        الموافقة.
      </P>
      <P lang="ar">
        إلغاء تسجيل الجهة (إزالة كاملة للبيانات من جانب المجلس) عملية
        واحدة: يفتح المجلس الإعدادات ← الجهات ← إجراءات الصف ← حذف. يزيل
        هذا لقطات الجهة وسجل المستأجر بشكل ذرّي.
      </P>
      <Callout lang="ar" title="عزل استدعاء الموافقة">
        بعد منح مسؤول الجهة الموافقة، يعيد Entra توجيه المتصفح إلى لوحة
        المجلس. يهبط التوجيه على صفحة مستقلة
        {" "}<Text style={{ fontWeight: 700 }}>/consent-success</Text>
        معروضة خارج مجموعة مسارات اللوحة — بدون شريط جانبي وبدون تنقّل
        وبدون بيانات الوضع الأمني على مستوى المجلس. يرى مسؤول الجهة شاشة
        تأكيد ويُطلب منه إغلاق التبويب. يمنع هذا كشف بيانات ما بين
        المستأجرات التي قد يتصفحها مسؤول الجهة بطريق الخطأ.
      </Callout>

      <H1 lang="ar" num={8}>المواءمة مع الأطر</H1>
      <P lang="ar">
        يتضمن مؤشر النضج مؤشرًا فرعيًا للمواءمة مع الإطار (وزن ١٠٪ افتراضيًا)
        يستخلص تبنّي بنود NESA الإماراتي من حالات ضوابط Microsoft Secure
        Score. الاستخلاص صريح — جدول المواءمة قابل للتحرير من المجلس في
        الإعدادات ← مواءمة NESA — وليس بديلاً عن تدقيق Compliance Manager
        رسمي أو اعتماد NESA إماراتي رسمي.
      </P>
      <P lang="ar">
        لا تُعرض درجات Microsoft Compliance Manager عبر Microsoft Graph.
        هذا القيد موثَّق وظاهر لقيادة المجلس؛ ولا تقدّم اللوحة القيم
        المستخلصة على أنها درجات أطر مُدقَّقة.
      </P>
    </View>
  );
}
