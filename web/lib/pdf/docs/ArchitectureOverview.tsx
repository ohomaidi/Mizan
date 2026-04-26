import { Text, View } from "@react-pdf/renderer";
import {
  Bullet,
  Callout,
  Code,
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
    docTitleEn: "Architecture & Data Flow Overview",
    docTitleAr: "البنية وتدفق البيانات — نظرة عامة",
    subtitleEn:
      "Systems-level view of how the Posture Dashboard reaches connected entity tenants, the components it depends on, the throttling envelope it lives inside, and the scoping decisions that shape the design.",
    subtitleAr:
      "نظرة على مستوى الأنظمة لكيفية وصول لوحة الوضع الأمني إلى مستأجرات الجهات المتصلة، والمكونات التي تعتمد عليها، وإطار التقييد الذي تعمل ضمنه، وقرارات النطاق التي تشكّل التصميم.",
    audienceEn: "Delivery engineers · IT architects",
    audienceAr: "مهندسو التسليم · معماريو تقنية المعلومات",
  };
}

const SECTIONS = [
  { titleEn: "System topology", titleAr: "بنية النظام" },
  { titleEn: "Multi-tenant auth model", titleAr: "نموذج المصادقة متعدد المستأجرين" },
  { titleEn: "Sync orchestrator + worker pool", titleAr: "منسق المزامنة ومجموعة العمال" },
  { titleEn: "Data model", titleAr: "نموذج البيانات" },
  { titleEn: "Runtime configuration", titleAr: "إعدادات وقت التشغيل" },
  { titleEn: "Throttling envelope", titleAr: "إطار التقييد" },
  { titleEn: "Failure modes + resilience", titleAr: "أوضاع الفشل والمرونة" },
  { titleEn: "Scoping decisions", titleAr: "قرارات النطاق" },
];

export function ArchitectureOverview({ lang }: { lang: DocLang }) {
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
      <H1 lang="en" num={1}>System topology</H1>
      <P lang="en">
        Three tiers, one-way data flow: entity tenants → Council dashboard →
        Council operators. No data ever flows back from Council to entity.
      </P>
      <Code lang="en">{`Entity tenant A  ┐
Entity tenant B  │  Microsoft Graph  ┐
Entity tenant C  │  (graph.microsoft.com)
         …       │                   │
Entity tenant N  ┘                   ▼
                              ┌─────────────────┐
                              │  Sync           │
                              │  orchestrator   │  Worker pool (5 parallel)
                              │  (Next.js API)  │  Signals serial per tenant
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │  SQLite         │  Persistent snapshots
                              │  + JSON blobs   │  + endpoint_health
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │  Next.js UI     │  Dashboard pages
                              │  (App Router)   │  Council operators browse
                              └─────────────────┘`}</Code>

      <H1 lang="en" num={2}>Multi-tenant auth model</H1>
      <P lang="en">
        One multi-tenant Entra app registration in the operator's tenant.
        Each connected entity's Global Administrator consents to that app in
        their own tenant, which creates a service principal copy of the app
        in the entity tenant with the read-only permission set.
      </P>
      <P lang="en">
        At sync time, the orchestrator acquires a per-tenant app-only token
        via MSAL client credentials (or cert in production). Tokens are
        cached in-process per tenant GUID with a 5-minute safety margin
        before expiry.
      </P>
      <Callout lang="en" title="Why not GDAP / Lighthouse?">
        GDAP requires Microsoft Partner / CSP status — not applicable to a
        government Council. Azure Lighthouse is an ARM-plane feature and
        does not cover Microsoft Graph reads. The multi-tenant app with
        per-tenant admin consent is the only scalable pattern that matches
        the legal and operational model here.
      </Callout>

      <H1 lang="en" num={3}>Sync orchestrator + worker pool</H1>
      <P lang="en">
        Daily at 03:00 UAE time (configurable via Azure Timer Function or
        cron), the orchestrator iterates consented tenants and fans them out
        across a bounded worker pool (default 5 workers, env-tunable via
        SCSC_SYNC_CONCURRENCY, clamped 1–20).
      </P>
      <P lang="en">
        Per tenant, signals run serially (18 signals, ~2 seconds each ≈ 36s
        per tenant). Across tenants, the pool parallelizes. 200 consented
        tenants complete in ≈ 24 minutes at concurrency 5, vs ≈ 2 hours
        fully serial.
      </P>
      <H2 lang="en">3.1 Signal order</H2>
      <P lang="en">
        Defender / Entra / Intune basics first (Secure Score → Conditional
        Access → Risky Users → Devices → Incidents), then Purview reads, then
        Defender-depth (PIM / DFI / Attack Sim / TI), then Advanced Hunting
        (respects 45 calls/min/tenant), then the async audit-log query
        (label adoption).
      </P>
      <H2 lang="en">3.2 Resilience — product-unavailable tolerance</H2>
      <P lang="en">
        Every signal fetcher treats HTTP 400/403/404 as "product not
        available in this tenant" and returns an empty payload rather than
        crashing the sync. Entity tenants with partial Microsoft rollouts
        (no Defender XDR, no Intune, no Purview, no Entra ID P2) don't break
        first-sync — they simply show zeros for the unavailable signals
        while fully-licensed signals still populate. This was shipped after
        the real-tenant pilot on 2026-04-20 revealed that a bare test tenant
        returned 400 on /security/incidents because Defender XDR wasn't
        initialized.
      </P>
      <H2 lang="en">3.3 Lightweight verify path</H2>
      <P lang="en">
        The Onboarding Wizard Step 5 ("Run first sync") does NOT trigger the
        full 18-signal sync — that takes 30–60 seconds and tripped browser
        fetch timeouts with "Load failed". Instead, it calls a dedicated
        endpoint at /api/tenants/{"{id}"}/verify which performs a single
        Secure Score call (~2 s) to prove the pipeline is live. The full
        sync still runs, fire-and-forget, from the consent-callback.
      </P>

      <H1 lang="en" num={4}>Data model</H1>
      <SimpleTable
        lang="en"
        headers={["Table", "Purpose"]}
        rows={[
          ["tenants", "One row per onboarded entity. Holds consent state, last-sync metadata, CISO contact."],
          ["signal_snapshots", "Per-tenant × per-signal × per-time snapshot. Payload is JSON."],
          ["endpoint_health", "Per-tenant × per-endpoint call health: last success, last error, 24h counts."],
          ["app_config", "Key-value JSON store for Council-editable runtime config (maturity weights, NESA mapping, PDF templates, Azure app credentials)."],
          ["audit_log_queries", "Async Graph audit queries in flight. Submitted one sync tick, polled and stored the next."],
        ]}
      />
      <P lang="en">
        SQLite was chosen for operational simplicity. At 200 tenants × 18
        signals × 90 days retention, the database stays under ~2 GB. If the
        Council later wants a Postgres or Azure SQL backend, the schema and
        query helpers in lib/db/ are the only layer that would change.
      </P>

      <H1 lang="en" num={5}>Runtime configuration</H1>
      <P lang="en">
        Four pieces of Council-editable state, all persisted in the
        app_config table and editable via Settings panels at runtime (no
        code changes, no restart):
      </P>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Maturity Index</Text> — six
        sub-score weights + Council target.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>NESA mapping</Text> — eight clauses
        with per-clause weight + Secure Score control list.
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>PDF templates</Text> — Discovery
        Letter + Onboarding Letter, all strings bilingual (EN + AR).
      </Bullet>
      <Bullet lang="en">
        <Text style={{ fontWeight: 700 }}>Entra app registration</Text> —
        Client ID + Secret + authority + consent redirect URI.
      </Bullet>
      <P lang="en">
        Defaults live in lib/config/*.ts as a single source of truth for
        fresh installs and resets. Every read site (compute engine, PDF
        renderer, MSAL bootstrap) reads through the getter helpers, never
        directly from code constants.
      </P>

      <H1 lang="en" num={6}>Throttling envelope</H1>
      <SimpleTable
        lang="en"
        headers={["Namespace", "Limit", "Handling"]}
        rows={[
          ["Global Graph", "130,000 req / 10s per app across all tenants", "Not approached at current scale"],
          ["alerts_v2 / incidents", "~150 req/min/tenant", "Retry-After respected"],
          ["runHuntingQuery", "45 calls/min/tenant", "Serialized per tenant, throttled by worker pool"],
          ["Identity Protection", "1 req/sec/tenant (no Retry-After)", "Exponential backoff in lib/graph/fetch.ts"],
          ["Intune deviceManagement", "2000 req / 20s / tenant (all apps)", "Retry-After respected"],
          ["Audit log query", "100 req / 5 min / tenant", "Async — submitted once per day"],
        ]}
      />

      <H1 lang="en" num={7}>Failure modes + resilience</H1>
      <H2 lang="en">7.1 Throttling (429)</H2>
      <P lang="en">
        Every Graph call respects Retry-After. On exhaustion, the orchestrator
        records the failure in endpoint_health and moves on to the next
        signal without killing the whole tenant's sync.
      </P>
      <H2 lang="en">7.2 Permission drift</H2>
      <P lang="en">
        403 responses on a subset of signals are tolerated — the missing
        signal is flagged in endpoint_health and the Maturity Index adapts
        via its "data present" filter. 401 on every signal flips
        consent_status to revoked (per auto-detection in the orchestrator).
      </P>
      <H2 lang="en">7.3 Tenant-level failures</H2>
      <P lang="en">
        A tenant that fails completely (MSAL token error, network unreachable)
        does not block other tenants — the worker pool picks up the next
        available tenant. Partial results from the failed tenant are NOT
        persisted; the last good snapshot remains authoritative until the
        next successful sync.
      </P>
      <H2 lang="en">7.4 Revocation auto-detection</H2>
      <P lang="en">
        When every signal in a single tenant's sync fails with a
        revocation-class error (HTTP 401 or AADSTS codes 65001 / 700016 /
        50020 / 500011), the orchestrator flips that tenant's consent_status
        to "revoked", invalidates its MSAL token cache, and skips it on the
        next sync. Surfaced in Settings → Entities. Re-consent from the
        entity admin un-revokes it on the next callback.
      </P>
      <H2 lang="en">7.5 Arabic PDF bidi safety</H2>
      <P lang="en">
        @react-pdf/textkit (v4.5.x) crashes in reorderLine when an Arabic
        Tatweel character (U+0640) appears immediately before whitespace
        and a Latin character — a common typographic pattern in Arabic text
        that mentions Microsoft product names. A defensive sanitizer in
        lib/pdf/sanitize-ar.ts strips any Tatweel that is NOT sandwiched
        between two Arabic letters. It's applied at every runtime template
        getter and inside every shared PDF layout component, so the Council
        can edit AR strings freely in the Settings UI without triggering the
        bug.
      </P>

      <H1 lang="en" num={8}>Scoping decisions</H1>
      <H2 lang="en">8.1 Two deployment modes (v2.0+)</H2>
      <P lang="en">
        The product reverses an earlier read-only-forever decision. Mizan
        v2.0 ships in either{" "}
        <Text style={{ fontWeight: 700 }}>observation mode</Text> (the
        original read-only profile, suitable for visibility-only customers
        — boards, central oversight bodies that score posture but don't
        write to entity tenants) or{" "}
        <Text style={{ fontWeight: 700 }}>directive mode</Text> (the
        write-tier profile, suitable for regulators that push baseline
        policies to consented entities). Mode is fixed at install time via{" "}
        <Text style={{ fontWeight: 700 }}>MIZAN_DEPLOYMENT_MODE</Text>;
        switching is a redeploy. The directive write tier covers
        Conditional Access (Phase 3 — 12 baselines + custom wizard),
        Intune device posture (Phase 5 — 13 baselines including ASR
        rules), SharePoint tenant external-sharing (Phase 11a — 4
        baselines, singleton settings model), Defender for Endpoint
        Threat Intelligence indicators (Phase 14b — operator console),
        and reactive incident / alert / user actions (Phase 2). DLP,
        Sensitivity Labels, Retention, Defender for Office, Exchange
        transport, OneDrive/Teams policies ship as coming-soon catalog
        UIs that flip on per-phase as Microsoft moves the relevant Graph
        authoring API to GA. No PowerShell automation tier — the
        coming-soon pattern replaces it.
      </P>
      <H2 lang="en">8.2 Framework: per-customer config</H2>
      <P lang="en">
        UAE NESA / Dubai ISR — chosen at install time per customer,
        editable at runtime via Settings → Branding (framework selector)
        and Settings → Compliance framework. The framework drives the
        per-clause coverage rollup and the dashboard's named compliance
        score (e.g. "Dubai ISR compliance" instead of generic "framework
        compliance"). Out-of-Scope marks (v2.4.0+) and the Directive
        Compliance push tab read from the active framework.
      </P>
      <H2 lang="en">8.3 Daily cadence, not near-real-time</H2>
      <P lang="en">
        Graph change notifications (webhooks) were evaluated and deferred —
        a daily report doesn't need webhook renewal scheduling or an
        inbound receiver URL. The 3 am scheduled sync covers the use case.
      </P>
      <H2 lang="en">8.4 Mizan-native auth + RBAC</H2>
      <P lang="en">
        Dashboard access uses Mizan's user-auth Entra application (OpenID
        Connect + authorization code flow) plus internal RBAC (Admin /
        Analyst / Viewer roles). Sliding 7-day session window with silent
        Microsoft SSO re-auth on expiry. Both the Graph-Signals app and
        the user-auth app support cert-based MSAL (PEM private key + SHA-1
        thumbprint via Settings → App Registration → Certificate, or via{" "}
        <Text style={{ fontWeight: 700 }}>AZURE_CLIENT_CERT_THUMBPRINT</Text>
        {" "}+ <Text style={{ fontWeight: 700 }}>
        AZURE_CLIENT_CERT_PRIVATE_KEY_PEM</Text> env vars for Key Vault
        deployments). Cloudflare Zero Trust Access remains a recommended
        network-layer gate for demo URLs.
      </P>
      <H2 lang="en">8.5 Production hardening (v2.0+)</H2>
      <P lang="en">
        Shipped:{" "}
        <Text style={{ fontWeight: 700 }}>/api/health</Text> liveness probe
        endpoint (DB ping + deployment-mode + tenant count, 503 on DB
        error); cert-based MSAL on both Entra apps; accessibility v1
        (skip-to-content, modal focus trap + restore +{" "}
        <Text style={{ fontWeight: 700 }}>aria-labelledby</Text>, sidebar{" "}
        <Text style={{ fontWeight: 700 }}>aria-current</Text>, autosave{" "}
        <Text style={{ fontWeight: 700 }}>aria-live</Text> regions).
        Pending: directive-engine unit tests, formal WCAG 2.2 axe-core CI
        pass, certificate auto-rotation from Key Vault.
      </P>
    </View>
  );
}

function BodyAr() {
  return (
    <View>
      <H1 lang="ar" num={1}>بنية النظام</H1>
      <P lang="ar">
        ثلاث طبقات، تدفق بيانات باتجاه واحد: مستأجرات الجهات ← لوحة المجلس
        ← مشغّلو المجلس. لا تتدفق أي بيانات أبدًا من المجلس إلى الجهة.
      </P>
      <Code lang="ar">{`مستأجر جهة A   ┐
مستأجر جهة B   │  Microsoft Graph  ┐
مستأجر جهة C   │  (graph.microsoft.com)
      …        │                   │
مستأجر جهة N   ┘                   ▼
                              ┌─────────────────┐
                              │  منسق المزامنة    │  مجموعة العمال (٥ متوازٍ)
                              │  (Next.js API)  │  إشارات متتالية لكل مستأجر
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │  SQLite         │  لقطات دائمة
                              │  + JSON blobs   │  + endpoint_health
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │  Next.js UI     │  صفحات اللوحة
                              │  (App Router)   │  يتصفحها مشغّلو المجلس
                              └─────────────────┘`}</Code>

      <H1 lang="ar" num={2}>نموذج المصادقة متعدد المستأجرين</H1>
      <P lang="ar">
        تسجيل تطبيق Entra واحد متعدد المستأجرين في مستأجر المجلس. يوافق
        المسؤول العام في كل جهة شارقة على هذا التطبيق في مستأجره الخاص،
        فيُنشأ حساب خدمة نسخة من التطبيق داخل مستأجر الجهة بمجموعة أذونات
        للقراءة فقط.
      </P>
      <P lang="ar">
        عند المزامنة، يحصل المنسق على رمز مميَّز على مستوى التطبيق لكل
        مستأجر عبر MSAL ببيانات اعتماد العميل (أو شهادة في الإنتاج). تُخزَّن
        الرموز في الذاكرة حسب GUID المستأجر مع هامش أمان ٥ دقائق قبل انتهاء الصلاحية.
      </P>
      <Callout lang="ar" title="لماذا ليس GDAP / Lighthouse؟">
        يتطلب GDAP حالة Microsoft Partner / CSP — لا ينطبق على مجلس حكومي.
        Azure Lighthouse ميزة على مستوى ARM ولا تغطي قراءات Microsoft Graph.
        التطبيق متعدد المستأجرين مع موافقة مسؤول لكل مستأجر هو النمط الوحيد
        القابل للتوسع الذي يتوافق مع النموذج القانوني والتشغيلي هنا.
      </Callout>

      <H1 lang="ar" num={3}>منسق المزامنة ومجموعة العمال</H1>
      <P lang="ar">
        يوميًا الساعة ٣:٠٠ بتوقيت الإمارات (قابل للضبط عبر Azure Timer Function
        أو cron)، يتنقّل المنسق عبر المستأجرات الموافِقة ويوزعها على مجموعة
        عمال محدودة (افتراضي ٥، قابل للضبط عبر SCSC_SYNC_CONCURRENCY من ١ إلى ٢٠).
      </P>
      <P lang="ar">
        لكل مستأجر، تُنفَّذ الإشارات بالتتابع (١٨ إشارة، ~٢ ثانية لكل إشارة
        ≈ ٣٦ ثانية للمستأجر). تُوزَّع المجموعة بين المستأجرات بالتوازي. تكتمل
        ٢٠٠ مستأجر موافِق في ≈ ٢٤ دقيقة بتزامن ٥، مقابل ≈ ساعتين بالكامل
        بشكل تسلسلي.
      </P>
      <H2 lang="ar">٣.١ ترتيب الإشارات</H2>
      <P lang="ar">
        أساسيات Defender / Entra / Intune أولاً (Secure Score ← Conditional
        Access ← ذوو المخاطر ← الأجهزة ← الحوادث)، ثم قراءات Purview، ثم
        عمق Defender (PIM / DFI / Attack Sim / TI)، ثم Advanced Hunting
        (يحترم ٤٥ استدعاءً/دقيقة/مستأجر)، ثم استعلام سجل التدقيق غير المتزامن
        (تبنّي التصنيفات).
      </P>
      <H2 lang="ar">٣.٢ المرونة — تسامح المنتج غير المتاح</H2>
      <P lang="ar">
        كل جالب إشارة يعامل HTTP 400/403/404 على أنه "المنتج غير متاح في هذا
        المستأجر" ويعيد حمولة فارغة بدلًا من إسقاط المزامنة. المستأجرات
        الجزئية الطرح (بلا Defender XDR أو Intune أو Purview أو Entra ID P2)
        لا تُكسر المزامنة الأولى — تُظهر أصفارًا للإشارات غير المتاحة بينما
        تعمل الإشارات المرخّصة بشكل طبيعي.
      </P>
      <H2 lang="ar">٣.٣ مسار تحقق خفيف</H2>
      <P lang="ar">
        الخطوة ٥ في معالج التسجيل ("تشغيل المزامنة الأولى") لا تشغّل المزامنة
        الكاملة للإشارات الـ١٨ — تلك تستغرق ٣٠–٦٠ ثانية وكانت تسبب فشل
        انتظار المتصفح. بدلًا من ذلك تستدعي /api/tenants/{"{id}"}/verify وهي
        استدعاء Secure Score واحد (~٢ ثوانٍ) لإثبات جاهزية خط الأنابيب.
        المزامنة الكاملة تعمل في الخلفية عبر استدعاء الموافقة.
      </P>

      <H1 lang="ar" num={4}>نموذج البيانات</H1>
      <SimpleTable
        lang="ar"
        headers={["الجدول", "الغرض"]}
        rows={[
          ["tenants", "صف لكل جهة مُسجَّلة. يحمل حالة الموافقة، بيانات آخر مزامنة، جهة اتصال CISO."],
          ["signal_snapshots", "لقطة لكل مستأجر × إشارة × طابع زمني. الحمولة JSON."],
          ["endpoint_health", "صحة الاستدعاءات لكل مستأجر × نقطة نهاية: آخر نجاح، آخر خطأ، أعداد ٢٤ ساعة."],
          ["app_config", "مخزن مفاتيح/قيم JSON لإعدادات وقت التشغيل القابلة للتحرير (أوزان النضج، مواءمة NESA، قوالب PDF، بيانات Entra)."],
          ["audit_log_queries", "استعلامات Graph غير متزامنة قيد التنفيذ. تُرسل في دورة مزامنة، يتم استطلاعها وحفظها في التالية."],
        ]}
      />
      <P lang="ar">
        اختير SQLite للبساطة التشغيلية. عند ٢٠٠ مستأجر × ١٨ إشارة × احتفاظ
        ٩٠ يومًا، تبقى قاعدة البيانات تحت ~٢ جيجابايت. إذا أراد المجلس لاحقًا
        خلفية Postgres أو Azure SQL، فإن المخطط ومساعدات الاستعلام في
        lib/db/ هي الطبقة الوحيدة التي تتغيّر.
      </P>

      <H1 lang="ar" num={5}>إعدادات وقت التشغيل</H1>
      <P lang="ar">
        أربع قطع من الحالة القابلة للتحرير من المجلس، جميعها مُخزَّنة في جدول
        app_config وقابلة للتحرير عبر لوحات الإعدادات في وقت التشغيل (بدون
        تغييرات شيفرة، بدون إعادة تشغيل):
      </P>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>مؤشر النضج</Text> — ستة أوزان
        للمؤشرات الفرعية + هدف المجلس.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>مواءمة NESA</Text> — ثمانية بنود
        بوزن لكل بند + قائمة ضوابط Secure Score.
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>قوالب PDF</Text> — خطاب الاكتشاف
        وخطاب الإعداد، جميع النصوص ثنائية اللغة (إنجليزي + عربي).
      </Bullet>
      <Bullet lang="ar">
        <Text style={{ fontWeight: 700 }}>تسجيل تطبيق Entra</Text> — معرّف
        العميل + السر + المضيف + رابط إعادة التوجيه.
      </Bullet>
      <P lang="ar">
        تعيش الافتراضات في lib/config/*.ts كمصدر واحد للحقيقة للتثبيتات
        الجديدة وإعادة الضبط. كل موقع قراءة (محرك الحساب، مُحوِّل PDF،
        تمهيد MSAL) يقرأ عبر دوال الحصول (getters)، لا مباشرة من الثوابت.
      </P>

      <H1 lang="ar" num={6}>إطار التقييد</H1>
      <SimpleTable
        lang="ar"
        headers={["النطاق", "الحد", "المعالجة"]}
        rows={[
          ["Graph عام", "١٣٠٬٠٠٠ طلب / ١٠ ثوانٍ لكل تطبيق عبر جميع المستأجرات", "لا يُقترب منه بالمقياس الحالي"],
          ["alerts_v2 / incidents", "~١٥٠ طلبًا/دقيقة/مستأجر", "يُحترم Retry-After"],
          ["runHuntingQuery", "٤٥ استدعاءً/دقيقة/مستأجر", "تسلسلي لكل مستأجر، مقيَّد بمجموعة العمال"],
          ["Identity Protection", "١ طلب/ثانية/مستأجر (بدون Retry-After)", "تراجع أُسّي في lib/graph/fetch.ts"],
          ["Intune deviceManagement", "٢٠٠٠ طلب / ٢٠ ثانية / مستأجر (جميع التطبيقات)", "يُحترم Retry-After"],
          ["استعلام سجل التدقيق", "١٠٠ طلب / ٥ دقائق / مستأجر", "غير متزامن — يُرسل مرة يوميًا"],
        ]}
      />

      <H1 lang="ar" num={7}>أوضاع الفشل والمرونة</H1>
      <H2 lang="ar">٧.١ التقييد (429)</H2>
      <P lang="ar">
        كل استدعاء Graph يحترم Retry-After. عند الاستنزاف، يسجّل المنسق
        الفشل في endpoint_health وينتقل إلى الإشارة التالية دون قتل مزامنة
        المستأجر بالكامل.
      </P>
      <H2 lang="ar">٧.٢ انحراف الأذونات</H2>
      <P lang="ar">
        استجابات 403 على مجموعة فرعية من الإشارات مقبولة — تُعلَّم الإشارة
        الناقصة في endpoint_health ويتكيّف مؤشر النضج عبر فلتر "وجود
        البيانات". 401 على كل إشارة يقلب consent_status إلى revoked (وفق
        الاكتشاف التلقائي في المنسق).
      </P>
      <H2 lang="ar">٧.٣ الإخفاقات على مستوى المستأجر</H2>
      <P lang="ar">
        مستأجر يفشل بالكامل (خطأ رمز MSAL، شبكة غير قابلة للوصول) لا يحجب
        المستأجرات الأخرى — تلتقط مجموعة العمال المستأجر التالي. النتائج
        الجزئية من المستأجر الفاشل لا تُحفظ؛ تبقى آخر لقطة جيدة هي المرجع
        حتى المزامنة الناجحة التالية.
      </P>
      <H2 lang="ar">٧.٤ الاكتشاف التلقائي للسحب</H2>
      <P lang="ar">
        عندما تفشل كل إشارات مزامنة مستأجر واحد بخطأ من فئة السحب (HTTP 401
        أو رموز AADSTS 65001 / 700016 / 50020 / 500011)، يقلب المنسق
        consent_status لتلك الجهة إلى "revoked"، ويُفرِّغ ذاكرة MSAL الخاصة
        بها، ويتخطاها في المزامنة التالية. يظهر ذلك في الإعدادات ← الجهات.
        إعادة الموافقة من مسؤول الجهة تزيل حالة السحب عند استدعاء التوجيه
        التالي.
      </P>
      <H2 lang="ar">٧.٥ سلامة bidi في ملفات PDF العربية</H2>
      <P lang="ar">
        يتعطل @react-pdf/textkit (إصدار ٤.٥.x) في reorderLine عندما يظهر
        حرف التطويل العربي (الرمز U+0640) مباشرة قبل فراغ وحرف لاتيني — وهذا
        نمط طباعي شائع في النصوص العربية التي تذكر أسماء منتجات Microsoft.
        يوجد معالج دفاعي في lib/pdf/sanitize-ar.ts يحذف أي تطويل غير محصور
        بين حرفين عربيين. يُطبَّق في كل getter قالب وقت التشغيل وداخل كل
        مكوِّن تخطيط PDF مشترك، بحيث يستطيع المجلس تحرير نصوص AR بحرية في
        واجهة الإعدادات دون تفعيل الخلل.
      </P>

      <H1 lang="ar" num={8}>قرارات النطاق</H1>
      <H2 lang="ar">٨.١ وضعا النشر (v2.0+)</H2>
      <P lang="ar">
        يعكس المنتج قرار "للقراءة فقط طوال العمر" السابق. Mizan v2.0 يُشحن
        إما في{" "}
        <Text style={{ fontWeight: 700 }}>وضع المراقبة</Text> (للقراءة
        فقط — يناسب جهات الإشراف التي تحسب الوضع الأمني دون كتابة في
        مستأجرات الجهات) أو في{" "}
        <Text style={{ fontWeight: 700 }}>وضع التوجيه</Text> (طبقة
        الكتابة — يناسب الجهات التنظيمية التي تدفع سياسات أساسية إلى
        الجهات الموافقة). يُحدَّد الوضع عند التثبيت عبر{" "}
        <Text style={{ fontWeight: 700 }}>MIZAN_DEPLOYMENT_MODE</Text>؛
        التغيير = إعادة نشر. تغطّي طبقة الكتابة Conditional Access و
        Intune و SharePoint و IOC للـDefender والإجراءات التفاعلية. DLP
        والتصنيفات والاحتفاظ وغيرها تُشحن ككتالوجات "قريبًا" تُفعَّل عند
        نقل Microsoft واجهات تأليفها إلى Graph GA. لا توجد طبقة PowerShell.
      </P>
      <H2 lang="ar">٨.٢ الإطار: تكوين لكل عميل</H2>
      <P lang="ar">
        UAE NESA / Dubai ISR — يُختار عند التثبيت لكل عميل، قابل
        للتعديل في وقت التشغيل من الإعدادات ← العلامة التجارية
        (محدِّد الإطار) وSettings ← إطار الامتثال. يُسيّر الإطار حساب
        تغطية المواد ويسمّي درجة الامتثال على لوحة المعلومات (مثلًا
        "امتثال Dubai ISR" بدل العبارة العامة). يقرأ نظام الاستثناء من
        النطاق (v2.4.0+) وتبويب الامتثال في Directive من الإطار النشط.
      </P>
      <H2 lang="ar">٨.٣ وتيرة يومية وليست قريبة من الحقيقي</H2>
      <P lang="ar">
        تم تقييم إشعارات تغيير Graph (webhooks) وتأجيلها — التقرير اليومي
        لا يحتاج جدولة تجديد webhook أو رابط مستقبل وارد. تغطي المزامنة
        المجدولة عند الثالثة صباحًا حالة الاستخدام.
      </P>
      <H2 lang="ar">٨.٤ مصادقة Mizan الأصلية + RBAC</H2>
      <P lang="ar">
        يستخدم الوصول إلى اللوحة تطبيق Entra لمصادقة المستخدم الخاصّ بـ
        Mizan (OpenID Connect + authorization code) مع RBAC داخلي
        (Admin / Analyst / Viewer). نافذة جلسة منزلقة لـ 7 أيام مع إعادة
        مصادقة SSO صامتة عند الانتهاء. كلا تطبيقَي Entra (Graph-Signals
        و user-auth) يدعمان MSAL القائم على الشهادة (مفتاح خاصّ PEM +
        بصمة SHA-1 عبر الإعدادات ← App Registration ← Certificate، أو
        عبر متغيري بيئة لـ Key Vault). يبقى Cloudflare Zero Trust Access
        موصى به كبوّابة شبكة للـURLs التجريبية.
      </P>
      <H2 lang="ar">٨.٥ تشديد الإنتاج (v2.0+)</H2>
      <P lang="ar">
        تم شحنه:{" "}
        <Text style={{ fontWeight: 700 }}>/api/health</Text> (فحص حياة
        قاعدة البيانات + وضع النشر + عدد المستأجرين)؛ MSAL قائم على
        الشهادة على كلا تطبيقَي Entra؛ إمكانية وصول v1 (تخطٍّ إلى
        المحتوى، فخّ تركيز للنوافذ المنبثقة، aria-labelledby، sidebar
        aria-current، مناطق aria-live للحفظ التلقائي). معلَّق: اختبارات
        وحدة لمحرك التوجيه، WCAG 2.2 axe-core في CI، تدوير شهادات تلقائي
        من Key Vault.
      </P>
    </View>
  );
}
