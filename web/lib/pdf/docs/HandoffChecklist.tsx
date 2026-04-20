import { Text, View } from "@react-pdf/renderer";
import {
  Bullet,
  Callout,
  buildDefaultMeta,
  HandoffDocument,
  H1,
  P,
  SimpleTable,
  type DocLang,
  type DocumentMeta,
} from "./layout";
import { getBranding } from "@/lib/config/branding";

function buildMeta(): DocumentMeta {
  const b = getBranding();
  return {
    ...buildDefaultMeta(b),
    docTitleEn: "Handoff Checklist",
    docTitleAr: "قائمة تسليم المنتج",
    subtitleEn: `Acceptance artifact for the delivery of the Posture & Maturity Dashboard to ${b.nameEn}. Lists what is delivered, what is pending, and how acceptance is signed off.`,
    subtitleAr: `وثيقة قبول تسليم لوحة الوضع الأمني والنضج إلى ${b.nameAr}. تُعدِّد ما تم تسليمه وما هو معلَّق وكيفية توقيع القبول.`,
    audienceEn: "Organization leadership · delivery PM · acceptance signatories",
    audienceAr: "قيادة الجهة · مدير التسليم · موقّعو القبول",
  };
}

const SECTIONS = [
  { titleEn: "Shipped deliverables", titleAr: "ما تم تسليمه" },
  { titleEn: "Functional acceptance criteria", titleAr: "معايير القبول الوظيفي" },
  { titleEn: "Pending operator actions", titleAr: "الإجراءات المعلَّقة من المشغّل" },
  { titleEn: "Deferred (next-year scope)", titleAr: "مؤجَّل (نطاق العام المقبل)" },
  { titleEn: "Documentation index", titleAr: "فهرس التوثيق" },
  { titleEn: "Acceptance sign-off", titleAr: "توقيع القبول" },
];

export function HandoffChecklist({ lang }: { lang: DocLang }) {
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
      <H1 lang="en" num={1}>Shipped deliverables</H1>
      <SimpleTable
        lang="en"
        headers={["Item", "Form", "Status"]}
        rows={[
          ["Dashboard application source", "Git repository + lockfile + Dockerfile + docker-compose.yml", "✓ Delivered"],
          ["18 Microsoft Graph read signals wired", "lib/graph/signals.ts (Secure Score + SSCP · CA · Risky Users · Devices · Incidents · DLP / IRM / CommComp alerts · SRRs · Retention + Sensitivity labels · SharePoint settings · PIM sprawl · DFI health · Attack Simulation · Threat Intel · Advanced Hunting · async Label Adoption)", "✓ Delivered"],
          ["Daily sync orchestrator + bounded worker pool", "lib/sync/orchestrator.ts (5 workers default, SCSC_SYNC_CONCURRENCY 1–20). Product-unavailable tolerance: 400/403/404 return empty payloads.", "✓ Delivered"],
          ["Revocation auto-detection", "consent_status flips to 'revoked' when all signals fail with 401 or AADSTS 65001/700016/50020/500011. MSAL token cache invalidated.", "✓ Delivered"],
          ["Real-tenant pilot completed", "mixox test tenant onboarded end-to-end 2026-04-20, real Secure Score + Intune + CA populating the dashboard.", "✓ Delivered"],
          ["Settings → App Registration", "DB-backed Entra creds with masked secret display, source pill per field, 6-step inline walkthrough, MSAL cache invalidated on save.", "✓ Delivered"],
          ["Settings → Maturity Index", "Six weight sliders + target, weight-sum guard (Save disabled until 100%), Normalize button.", "✓ Delivered"],
          ["Settings → NESA mapping", "8 UAE NESA clauses (T.1–T.8) with bilingual titles, per-clause weight, Secure Score control lists. Auto-normalized on save.", "✓ Delivered"],
          ["Settings → Discovery / Onboarding PDF", "Full bilingual EN+AR template editors for the two letters.", "✓ Delivered"],
          ["Settings → Audit log", "Council-wide endpoint_health view with free-text search + All/Healthy/Errors/Throttled filters.", "✓ Delivered"],
          ["Settings → Documentation", "One-click EN / AR download for all 5 handoff PDFs.", "✓ Delivered"],
          ["5-step Onboarding Wizard", "Identify → Tenant+domain (OIDC auto-resolve) → Generate → Await consent (5 s live poll) → First-sync verify (single Secure Score call).", "✓ Delivered"],
          ["Entity detail actions", "Defender portal deep-link · Export card JSON · Schedule review (date+note, banner) · Suspend/Resume (sync skips suspended tenants).", "✓ Delivered"],
          ["Consent-callback isolation", "/consent-success and /consent-error standalone pages outside the (dashboard) route group. Prevents cross-tenant data exposure to entity admins.", "✓ Delivered"],
          ["Maturity overview", "Entity-level bar chart (horizontally scrollable, sort pills by Name/Maturity, click to drill). Time range pills (7D/30D/QTD/YTD) control the Maturity Index Δ. Biggest movers + Controls dragging cards populated from live data.", "✓ Delivered"],
          ["Controls sub-tab (Entity Detail)", "Real Microsoft control titles from /security/secureScoreControlProfiles, score/maxScore ratio, HTML-sanitized status, passing/partial/failing classification, failing-first sort.", "✓ Delivered"],
          ["Purview read surface (/data)", "Live DLP/IRM/CommComp/SRR/retention/sensitivity/external-sharing totals + per-entity breakdown.", "✓ Delivered"],
          ["Governance page (/governance)", "UAE NESA tile + Council-baseline tile + target tile + per-clause coverage bars.", "✓ Delivered"],
          ["Bilingual PDF pipeline (EN + AR)", "7 documents × 2 languages = 14 PDF endpoints. AR Tatweel bidi-safety sanitizer at template getters + layout components.", "✓ Delivered"],
          ["Demo seed (12 sample entities)", "Deterministic per-entity pattern. Secure Score catalog of 30 real controls with titles, maxScore, userImpact, threats. Historical snapshots at 7/30/90/180 days for real Δ deltas. SCSC_SEED_DEMO=true opt-in. npm run purge-demo + npm run reseed-demo.", "✓ Delivered"],
          ["Data residency: UAE-sovereign path documented", "docs/08 §5 · Security & Privacy Statement · Architecture Overview", "✓ Delivered"],
          ["Customer handoff PDFs", "Installation Guide · Operator's Manual · Security & Privacy Statement · Architecture & Data Flow Overview · Handoff Checklist. All EN + AR.", "✓ Delivered"],
          ["Docker + docker-compose", "Ships with the repo for single-command boot.", "✓ Delivered"],
          ["Schema migrations", "v1 base · v2 is_demo column · v3 suspended_at + scheduled_review columns · v4 audit_log_queries table for async Label Adoption.", "✓ Delivered"],
        ]}
      />

      <H1 lang="en" num={2}>Functional acceptance criteria</H1>
      <P lang="en">
        To accept delivery, the Council confirms the following work in the
        environment it is taking over:
      </P>
      <Bullet lang="en">
        Dashboard loads at the designated public URL; sign-in via Cloudflare
        Access (or successor gate) completes without error.
      </Bullet>
      <Bullet lang="en">
        Settings → App Registration accepts valid Entra Client ID + Secret;
        status pill flips to "Ready — Graph token acquisition should work".
      </Bullet>
      <Bullet lang="en">
        At least one real (non-demo) entity has been onboarded end-to-end:
        Discovery Letter → Onboarding Letter → admin consent → first sync →
        Maturity Index computed.
      </Bullet>
      <Bullet lang="en">
        All 18 signals return HTTP 200 for the onboarded real tenant (visible
        in Settings → Audit log).
      </Bullet>
      <Bullet lang="en">
        All six dashboard pages (Maturity / Entities / Identity / Threats /
        Data / Devices / Governance) render live data for the onboarded tenant.
      </Bullet>
      <Bullet lang="en">
        Council can edit Maturity Index weights and NESA clause mapping;
        changes take effect immediately.
      </Bullet>
      <Bullet lang="en">
        Onboarding Letter and Discovery Letter PDFs render correctly in
        English AND Arabic.
      </Bullet>
      <Bullet lang="en">
        Daily scheduled sync executes (verified from logs at 03:00 UAE
        for three consecutive days).
      </Bullet>

      <H1 lang="en" num={3}>Pending operator actions</H1>
      <P lang="en">
        These are one-time tasks the Council (or Microsoft delivery) must
        complete in its own environment. They are NOT code changes; the
        product ships complete.
      </P>
      <SimpleTable
        lang="en"
        headers={["Action", "Owner", "Blocker?"]}
        rows={[
          ["Create multi-tenant Entra app registration in Council tenant", "Council IT", "Yes — precondition for any real-tenant sync"],
          ["Grant admin consent for 20 Graph read permissions on that app", "Council Global Admin", "Yes"],
          ["Create and securely store client secret (or cert in prod)", "Council IT", "Yes"],
          ["Paste credentials into Settings → App Registration", "Council operator", "Yes"],
          ["Register Cloudflare Zero Trust Access on the dashboard URL", "Council IT / cloud ops", "Recommended before go-live"],
          ["Configure Azure Timer Function (prod) or cron (dev) to POST /api/sync daily", "Council cloud ops", "Required for hands-free daily refresh"],
          ["Send Discovery Letter to the first pilot entity", "Council onboarding lead", "Drives the rollout timeline"],
        ]}
      />

      <H1 lang="en" num={4}>Deferred (next-year scope)</H1>
      <P lang="en">
        The following capabilities were discussed in earlier scope drafts and
        are explicitly <Text style={{ fontWeight: 700 }}>not</Text> delivered
        in this engagement. They are candidates for a follow-on engagement.
      </P>
      <Bullet lang="en">
        Policy Deployment Service (Council-authored Conditional Access,
        retention labels, custom detections pushed to every entity). Requires
        write-scoped Graph permissions.
      </Bullet>
      <Bullet lang="en">
        PowerShell automation tier (DLP / IRM / Communication Compliance /
        Information Barriers / Auto-labeling / Retention-policy CRUD via
        Azure Automation runbooks).
      </Bullet>
      <Bullet lang="en">
        Multi-framework mapping (NCA and ISR). UAE NESA is in scope; the
        mapping infrastructure supports additional frameworks with
        configuration changes only.
      </Bullet>
      <Bullet lang="en">
        Microsoft Graph change notifications / webhooks for near-real-time
        alerts. Current cadence is daily, which suits a read-only posture
        report.
      </Bullet>
      <Bullet lang="en">
        Named-user MSAL authentication for Council staff with Admin / Analyst
        / Auditor role scopes. Current access gate is Cloudflare Zero Trust.
      </Bullet>
      <Bullet lang="en">
        Azure deployment runbook (docs/10-deployment.md). Installation Guide
        §5 covers the Azure topology at summary level; a full step-by-step
        cloud deployment runbook is a production-readiness follow-up.
      </Bullet>

      <H1 lang="en" num={5}>Documentation index</H1>
      <P lang="en">
        All customer-facing documentation is downloadable from Settings →
        Documentation in both English and Arabic.
      </P>
      <SimpleTable
        lang="en"
        headers={["Document", "Audience", "Length"]}
        rows={[
          ["Installation & Deployment Guide", "Council IT, Microsoft delivery", "8 sections"],
          ["Operator's Manual", "Council SOC, auditors, operations", "12 sections"],
          ["Security & Privacy Statement", "Council leadership, entity CISOs, legal", "8 sections"],
          ["Architecture & Data Flow Overview", "Architects, delivery engineers", "8 sections"],
          ["Handoff Checklist (this document)", "Leadership, acceptance signatories", "6 sections"],
        ]}
      />
      <P lang="en">
        Developer-facing design documents remain in the repo under docs/
        (01-feature-catalog, 02-graph-api-reference-defender, etc.) for
        engineering continuity.
      </P>

      <H1 lang="en" num={6}>Acceptance sign-off</H1>
      <Callout lang="en" title="Signatory block">
        Three signatures complete acceptance: (1) Organization Executive
        Sponsor; (2) Delivery Program Manager; (3) Technical Acceptance
        Lead. Sign-off dated and attached
        to this document constitutes delivery acceptance. The engagement
        closes on countersign.
      </Callout>
      <P lang="en">
        Any post-acceptance issues that surface within 30 days are handled
        under standard warranty; bugs are remediated, scope changes are
        referred to change control. Beyond 30 days, new engagement terms
        apply.
      </P>
    </View>
  );
}

function BodyAr() {
  return (
    <View>
      <H1 lang="ar" num={1}>ما تم تسليمه</H1>
      <SimpleTable
        lang="ar"
        headers={["البند", "الصيغة", "الحالة"]}
        rows={[
          ["المصدر البرمجي للوحة", "مستودع Git + lockfile + Dockerfile + docker-compose.yml", "✓ مُسلَّم"],
          ["١٨ إشارة قراءة Microsoft Graph موصّلة", "lib/graph/signals.ts (Secure Score + SSCP · CA · المستخدمون ذوو المخاطر · الأجهزة · الحوادث · تنبيهات DLP/IRM/CommComp · طلبات حقوق الأفراد · تصنيفات الاحتفاظ والحساسية · إعدادات SharePoint · تتبع PIM · صحة DFI · محاكاة الهجمات · استخبارات التهديدات · الاستعلام المتقدم · تبنّي التصنيفات غير المتزامن)", "✓ مُسلَّم"],
          ["منسق المزامنة + مجموعة عمال محدودة", "lib/sync/orchestrator.ts (٥ عمال افتراضي، SCSC_SYNC_CONCURRENCY 1–20). تسامح المنتج غير المتاح: 400/403/404 حمولة فارغة.", "✓ مُسلَّم"],
          ["الاكتشاف التلقائي للسحب", "يتحول consent_status إلى revoked عند فشل كل الإشارات بخطأ 401 أو رموز AADSTS 65001/700016/50020/500011. تُفرَّغ ذاكرة MSAL.", "✓ مُسلَّم"],
          ["تجربة تسجيل مستأجر حقيقي مكتملة", "تم تسجيل mixox بتاريخ ٢٠٢٦-٠٤-٢٠ من البداية إلى النهاية، بيانات Secure Score + Intune + CA حقيقية تملأ اللوحة.", "✓ مُسلَّم"],
          ["الإعدادات ← تسجيل التطبيق", "بيانات اعتماد Entra من قاعدة البيانات مع إخفاء السر، شارة مصدر لكل حقل، دليل مرحلي من ٦ خطوات، تفريغ ذاكرة MSAL عند الحفظ.", "✓ مُسلَّم"],
          ["الإعدادات ← مؤشر النضج", "ستة أشرطة للأوزان + الهدف، حارس مجموع الأوزان (زر الحفظ معطّل حتى ١٠٠٪)، زر التطبيع.", "✓ مُسلَّم"],
          ["الإعدادات ← مواءمة NESA", "٨ بنود لإطار NESA الإماراتي (T.1–T.8) بعناوين ثنائية اللغة، وزن لكل بند، قوائم ضوابط Secure Score. تطبيع تلقائي عند الحفظ.", "✓ مُسلَّم"],
          ["الإعدادات ← خطاب الاكتشاف / الإعداد", "محررات قوالب ثنائية اللغة كاملة EN+AR للخطابين.", "✓ مُسلَّم"],
          ["الإعدادات ← سجل التدقيق", "عرض endpoint_health على مستوى المجلس مع بحث نصي + مرشحات الكل/سليم/أخطاء/مقيّدة.", "✓ مُسلَّم"],
          ["الإعدادات ← التوثيق", "تنزيل EN / AR بضغطة واحدة لجميع ملفات التسليم الخمسة.", "✓ مُسلَّم"],
          ["معالج التسجيل بخمس خطوات", "تعريف ← مستأجر/نطاق (استخراج OIDC تلقائي) ← إنشاء ← انتظار الموافقة (استطلاع كل ٥ ثوانٍ) ← تحقق المزامنة الأولى (استدعاء Secure Score واحد).", "✓ مُسلَّم"],
          ["إجراءات تفاصيل الجهة", "رابط بوابة Defender · تصدير بطاقة JSON · جدولة مراجعة (تاريخ+ملاحظة، شريط) · إيقاف/استئناف (المزامنة تتخطى الموقوفين).", "✓ مُسلَّم"],
          ["عزل استدعاء الموافقة", "صفحات /consent-success و /consent-error مستقلة خارج مجموعة مسارات اللوحة. تمنع كشف البيانات بين المستأجرات لمسؤولي الجهات.", "✓ مُسلَّم"],
          ["لوحة نظرة النضج العامة", "رسم بياني على مستوى الجهات (تمرير أفقي، شرائح ترتيب بالاسم/النضج، نقر للتعمق). شرائح النطاق الزمني (٧ أيام/٣٠/منذ الربع/منذ السنة) تتحكم في Δ مؤشر النضج.", "✓ مُسلَّم"],
          ["تبويب الضوابط الفرعي", "عناوين Microsoft الحقيقية من /security/secureScoreControlProfiles، نسبة score/maxScore، حالة مُنظَّفة من HTML، تصنيف ناجح/جزئي/فاشل، ترتيب بالفاشل أولًا.", "✓ مُسلَّم"],
          ["سطح قراءة Purview (/data)", "إجماليات حية DLP/IRM/CommComp/SRR/الاحتفاظ/الحساسية/المشاركة الخارجية + تفصيل لكل جهة.", "✓ مُسلَّم"],
          ["صفحة الحوكمة (/governance)", "بلاطة NESA الإماراتي + بلاطة خط أساس المجلس + بلاطة الهدف + أشرطة تغطية لكل بند.", "✓ مُسلَّم"],
          ["خط أنابيب PDF ثنائي اللغة", "٧ مستندات × لغتان = ١٤ نقطة نهاية PDF. معالج سلامة bidi للتطويل العربي في كل getter قالب.", "✓ مُسلَّم"],
          ["بذر تجريبي (١٢ جهة شارقة اصطناعية)", "نمط محدَّد لكل جهة. كتالوج Secure Score من ٣٠ ضابطًا حقيقيًا مع العناوين و maxScore و تأثير المستخدم والتهديدات. لقطات تاريخية عند ٧/٣٠/٩٠/١٨٠ يومًا.", "✓ مُسلَّم"],
          ["سيادة البيانات: مسار سيادي إماراتي موثَّق", "docs/08 §5 · بيان الأمن والخصوصية · نظرة البنية", "✓ مُسلَّم"],
          ["ملفات PDF للتسليم للعميل", "دليل التثبيت · دليل المستخدم · الأمن والخصوصية · البنية · هذه القائمة. جميعها EN + AR.", "✓ مُسلَّم"],
          ["Docker + docker-compose", "مشحون مع المستودع لإقلاع بأمر واحد.", "✓ مُسلَّم"],
          ["ترحيلات المخطط", "v1 الأساس · v2 عمود is_demo · v3 أعمدة suspended_at + scheduled_review · v4 جدول audit_log_queries لتبنّي التصنيفات غير المتزامن.", "✓ مُسلَّم"],
        ]}
      />

      <H1 lang="ar" num={2}>معايير القبول الوظيفي</H1>
      <P lang="ar">
        لقبول التسليم، يؤكد المجلس أن البنود التالية تعمل في البيئة التي
        يتسلّمها:
      </P>
      <Bullet lang="ar">
        تُحمَّل اللوحة على الرابط العام المحدد؛ تسجيل الدخول عبر Cloudflare
        Access (أو بديلها) يتم دون خطأ.
      </Bullet>
      <Bullet lang="ar">
        الإعدادات ← تسجيل التطبيق يقبل معرّف عميل Entra وسر صحيحين؛ تتحول
        الحالة إلى "جاهز — يجب أن يعمل طلب رموز Graph".
      </Bullet>
      <Bullet lang="ar">
        تم تسجيل جهة حقيقية (غير تجريبية) واحدة على الأقل من البداية إلى
        النهاية: خطاب الاكتشاف ← خطاب الإعداد ← موافقة المسؤول ← المزامنة
        الأولى ← احتساب مؤشر النضج.
      </Bullet>
      <Bullet lang="ar">
        كل الإشارات الثماني عشرة ترجع HTTP 200 للجهة الحقيقية المُسجَّلة
        (ظاهرة في الإعدادات ← سجل التدقيق).
      </Bullet>
      <Bullet lang="ar">
        كل صفحات اللوحة الست (النضج / الجهات / الهوية / التهديدات / البيانات /
        الأجهزة / الحوكمة) تعرض بيانات حيّة للجهة المُسجَّلة.
      </Bullet>
      <Bullet lang="ar">
        يستطيع المجلس تحرير أوزان مؤشر النضج ومواءمة بنود NESA؛ تُطبَّق
        التغييرات فورًا.
      </Bullet>
      <Bullet lang="ar">
        ملفات PDF لخطاب الإعداد وخطاب الاكتشاف تُعرَض صحيحة بالإنجليزية
        والعربية.
      </Bullet>
      <Bullet lang="ar">
        المزامنة اليومية المجدولة تعمل (موثَّقة من السجلات الساعة ٣:٠٠
        بتوقيت الإمارات ثلاثة أيام متتالية).
      </Bullet>

      <H1 lang="ar" num={3}>الإجراءات المعلَّقة من المشغّل</H1>
      <P lang="ar">
        هذه مهام لمرة واحدة يجب أن يكملها المجلس (أو تسليم Microsoft) في
        بيئته. ليست تغييرات شيفرة؛ المنتج مُسلَّم كاملاً.
      </P>
      <SimpleTable
        lang="ar"
        headers={["الإجراء", "المالك", "حاجز؟"]}
        rows={[
          ["إنشاء تسجيل تطبيق Entra متعدد المستأجرين في مستأجر المجلس", "تقنية المعلومات في المجلس", "نعم — شرط سابق لأي مزامنة حقيقية"],
          ["منح موافقة المسؤول على ٢٠ إذن قراءة Graph لذلك التطبيق", "المسؤول العام للمجلس", "نعم"],
          ["إنشاء وتخزين سر العميل بأمان (أو شهادة في الإنتاج)", "تقنية المعلومات في المجلس", "نعم"],
          ["الصق بيانات الاعتماد في الإعدادات ← تسجيل التطبيق", "مشغّل المجلس", "نعم"],
          ["تسجيل Cloudflare Zero Trust Access على رابط اللوحة", "تقنية المعلومات/عمليات السحابة", "موصى به قبل الإطلاق"],
          ["إعداد Azure Timer Function (إنتاج) أو cron (تطوير) لاستدعاء POST /api/sync يوميًا", "عمليات سحابة المجلس", "مطلوب للتحديث اليومي التلقائي"],
          ["إرسال خطاب الاكتشاف إلى أول جهة تجريبية", "مسؤول تسجيل المجلس", "يُحدد جدول النشر"],
        ]}
      />

      <H1 lang="ar" num={4}>مؤجَّل (نطاق العام المقبل)</H1>
      <P lang="ar">
        البنود التالية نُوقشت في مسوّدات النطاق السابقة ولم تُسلَّم صراحة
        في هذا الارتباط. هي مرشّحة لارتباط لاحق.
      </P>
      <Bullet lang="ar">
        خدمة نشر السياسات (سياسات Conditional Access وتصنيفات الاحتفاظ
        وكشوف مخصصة من تأليف المجلس تُدفع إلى كل جهة). تتطلب أذونات Graph
        بنطاق كتابة.
      </Bullet>
      <Bullet lang="ar">
        طبقة أتمتة PowerShell (إدارة سياسات DLP / IRM / الامتثال في
        الاتصالات / Information Barriers / التصنيف التلقائي / الاحتفاظ عبر
        Azure Automation runbooks).
      </Bullet>
      <Bullet lang="ar">
        مواءمة متعددة الأطر (NCA و ISR). NESA الإماراتي ضمن النطاق؛
        البنية التحتية للمواءمة تدعم إضافة أطر أخرى بتغييرات إعدادات فقط.
      </Bullet>
      <Bullet lang="ar">
        إشعارات تغيير Microsoft Graph / webhooks للتنبيهات شبه الحيّة.
        الوتيرة الحالية يومية، وتناسب تقرير وضع للقراءة فقط.
      </Bullet>
      <Bullet lang="ar">
        مصادقة MSAL بالمستخدم المُسَمَّى لموظفي المجلس مع نطاقات الأدوار
        (مسؤول / محلل / مدقق). بوابة الوصول الحالية هي Cloudflare Zero Trust.
      </Bullet>
      <Bullet lang="ar">
        دليل نشر Azure (docs/10-deployment.md). يغطي دليل التثبيت §5 بنية
        Azure على مستوى الملخص؛ دليل نشر سحابي خطوة بخطوة متابعة ضمن
        جاهزية الإنتاج.
      </Bullet>

      <H1 lang="ar" num={5}>فهرس التوثيق</H1>
      <P lang="ar">
        جميع وثائق العميل قابلة للتنزيل من الإعدادات ← التوثيق بالإنجليزية
        والعربية.
      </P>
      <SimpleTable
        lang="ar"
        headers={["المستند", "الجمهور", "الحجم"]}
        rows={[
          ["دليل التثبيت والنشر", "تقنية المعلومات في المجلس، تسليم Microsoft", "٨ أقسام"],
          ["دليل المستخدم التشغيلي", "SOC المجلس، المدققون، العمليات", "١٢ قسمًا"],
          ["بيان الأمن والخصوصية", "قيادة المجلس، مسؤولو أمن المعلومات في الجهات، القانوني", "٨ أقسام"],
          ["البنية وتدفق البيانات", "المعماريون، مهندسو التسليم", "٨ أقسام"],
          ["قائمة تسليم المنتج (هذا المستند)", "القيادة، موقّعو القبول", "٦ أقسام"],
        ]}
      />
      <P lang="ar">
        تبقى وثائق التصميم الموجَّهة للمطوِّرين في المستودع ضمن docs/
        (01-feature-catalog و 02-graph-api-reference-defender، وما إلى ذلك)
        للاستمرارية الهندسية.
      </P>

      <H1 lang="ar" num={6}>توقيع القبول</H1>
      <Callout lang="ar" title="خانة التوقيع">
        يكتمل القبول بثلاثة توقيعات: (١) الراعي التنفيذي لمجلس الشارقة
        للأمن السيبراني؛ (٢) مدير برنامج تسليم Microsoft؛ (٣) قائد القبول
        الفني في المجلس. توقيع مؤرَّخ ومُرفق بهذا المستند يعادل قبول التسليم.
        يُغلَق الارتباط عند التوقيع المقابل.
      </Callout>
      <P lang="ar">
        أي مشكلات ما بعد القبول تظهر خلال ٣٠ يومًا تعالَج ضمن الضمان
        القياسي؛ تُصلَّح الأخطاء، وتُحال تغييرات النطاق إلى ضابط التغييرات.
        بعد ٣٠ يومًا، تنطبق شروط ارتباط جديد.
      </P>
    </View>
  );
}
