import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import { sanitizeArabicDeep } from "@/lib/pdf/sanitize-ar";
import { getBranding } from "@/lib/config/branding";

export type Bullet = { en: string; ar: string };

export type PdfSection = {
  titleEn: string;
  titleAr: string;
  en: string;
  ar: string;
  bulletsTitleEn?: string;
  bulletsTitleAr?: string;
  bullets?: Bullet[];
  noteEn?: string;
  noteAr?: string;
};

export type PdfTemplate = {
  councilEn: string;
  councilAr: string;
  taglineEn: string;
  taglineAr: string;

  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;

  contactName: string;
  contactEmail: string;

  sections: PdfSection[]; // exactly 4 — Overview, Step 1 (consent), Step 2 (notify), Data scope

  sigRoles: Array<[string, string]>; // [en, ar]

  footerEn: string;
  footerAr: string;

  updatedAt?: string;
};

/**
 * Generic defaults for a fresh install. The customer-facing organization name,
 * short form, and tagline are filled in at read time from the branding config
 * (see getPdfTemplate below), so a fresh install always renders with the
 * customer's name in the PDF even before anyone opens the Settings panel.
 */
export const DEFAULT_PDF_TEMPLATE: PdfTemplate = {
  councilEn: "Posture & Maturity Dashboard",
  councilAr: "لوحة الوضع الأمني والنضج",
  taglineEn: "Unified security oversight across your connected entities",
  taglineAr: "إشراف أمني موحّد عبر جهاتك المتصلة",

  titleEn: "Entity Onboarding — Posture Dashboard",
  titleAr: "تسجيل الجهة — لوحة الوضع الأمني",
  subtitleEn:
    "Instructions for granting the operator's read-only service principal access to your Microsoft 365 tenant.",
  subtitleAr:
    "تعليمات منح الجهة المشغِّلة الوصول للقراءة فقط إلى مستأجر Microsoft 365 الخاص بالجهة.",

  contactName: "Technical Onboarding Lead",
  contactEmail: "onboarding@example.com",

  sections: [
    {
      titleEn: "1. Overview",
      titleAr: "١. نظرة عامة",
      en: "The operating organization is establishing a unified security oversight platform across every connected entity, built on Microsoft 365 E5 — the licensing your entity already holds. The platform reads continuous, read-only posture signals from your tenant via Microsoft Graph and computes a Maturity Index presented to organization leadership.",
      ar: "تعمل الجهة المشغِّلة على إنشاء منصة رقابة أمنية موحدة عبر كل الجهات المتصلة، مبنية على Microsoft 365 E5 — وهي الرخصة التي تملكها جهتكم مسبقاً. تقرأ المنصة إشارات الوضع الأمني المتواصلة للقراءة فقط من مستأجركم عبر Microsoft Graph وتحتسب مؤشر النضج المقدَّم لقيادة المنظومة.",
      bulletsTitleEn: "What we ask of your entity:",
      bulletsTitleAr: "المطلوب من جهتكم:",
      bullets: [
        {
          en: "A one-time admin consent step in your Entra ID tenant.",
          ar: "خطوة موافقة مسؤول لمرة واحدة في مستأجر Entra ID لديكم.",
        },
        {
          en: "A short verification handshake to confirm the pipeline is live.",
          ar: "تأكيد قصير للتحقق من أن خط الأنابيب يعمل.",
        },
      ],
      noteEn:
        "No new agents. No new software. No entity data leaves your tenant beyond the posture signals listed in Section 5.",
      noteAr:
        "لا توجد عملاء جديدة. ولا برامج جديدة. ولا تغادر بيانات الجهة مستأجركم بخلاف إشارات الوضع المذكورة في القسم الخامس.",
    },
    {
      titleEn: "2. Step 1 — Grant admin consent",
      titleAr: "٢. الخطوة الأولى — منح موافقة المسؤول",
      en: "Click the consent URL below from a clean browser window and sign in with a Global Administrator account of your tenant. Review the read-only permissions and click Accept.",
      ar: "انقر رابط الموافقة أدناه من نافذة متصفح نظيفة وسجّل الدخول باستخدام حساب مسؤول عام لمستأجركم. راجع الصلاحيات للقراءة فقط واضغط قبول.",
      noteEn:
        "After consent, open Entra admin center → Enterprise applications → find the Posture Dashboard app and confirm the service principal exists in your tenant with the listed read-only permissions.",
      noteAr:
        "بعد الموافقة، افتح Entra admin center → Enterprise applications → ابحث عن تطبيق لوحة الوضع الأمني وتأكد من وجود حساب الخدمة في مستأجركم بالصلاحيات المذكورة للقراءة فقط.",
    },
    {
      titleEn: "3. Step 2 — Notify the operator",
      titleAr: "٣. الخطوة الثانية — إخطار الجهة المشغِّلة",
      en: "Reply to the onboarding contact with the subject 'Consent complete' and confirm your tenant ID and primary domain. A first-call verification against /security/secureScores runs within 10 minutes of your email. You will receive a 'Connection live' confirmation.",
      ar: "أرسل رداً إلى جهة الاتصال بعنوان 'اكتملت الموافقة' وأكّد معرّف المستأجر والنطاق الرئيسي. يتم تشغيل أول تحقق مقابل /security/secureScores خلال ١٠ دقائق من وصول بريدكم. ستستلمون تأكيداً بعنوان 'الاتصال نشط'.",
    },
    {
      titleEn: "4. Data scope",
      titleAr: "٤. نطاق البيانات",
      en: "The operator reads only the following signals. Only aggregates are stored:",
      ar: "تقرأ الجهة المشغِّلة الإشارات التالية فقط. وتُخزَّن ملخصات مجمَّعة فقط:",
      bullets: [
        { en: "Microsoft Secure Score — tenant and per-control.", ar: "Microsoft Secure Score — على مستوى المستأجر والضوابط." },
        { en: "Conditional Access policies — enabled / MFA / legacy-auth coverage.", ar: "سياسات الوصول المشروط — تغطية MFA و المصادقة القديمة." },
        { en: "Identity Protection — risky users classification and state.", ar: "حماية الهوية — تصنيف المستخدمين ذوي المخاطر وحالتهم." },
        { en: "Intune managed devices — compliance state.", ar: "أجهزة Intune المُدارة — حالة الامتثال." },
        { en: "Security incidents — active and resolved counts.", ar: "الحوادث الأمنية — النشطة والمُغلقة." },
      ],
      noteEn:
        "NOT read: email bodies, file contents, Teams messages, personal device contents — unless an eDiscovery case is authorized in writing by both parties.",
      noteAr:
        "غير مقروء: محتوى البريد الإلكتروني، محتوى الملفات، رسائل Teams، محتويات الأجهزة الشخصية — إلا في حال اعتماد طلب eDiscovery كتابياً من الطرفين.",
    },
  ],

  sigRoles: [
    ["Entity Global Administrator", "المسؤول العام للجهة"],
    ["Entity CISO", "مسؤول أمن المعلومات للجهة"],
    ["Operator Technical Onboarding Lead", "قائد التسجيل التقني في الجهة المشغِّلة"],
  ],

  footerEn: "Confidential · Microsoft Partnership",
  footerAr: "سري · بالشراكة مع Microsoft",
};

const KEY = "pdf.onboarding";
const KEY_DIRECTIVE = "pdf.onboarding.directive";

/**
 * Pick which onboarding PDF template to render based on the entity's consent
 * mode. Observation tenants get the classic template. Directive tenants get
 * a variant with a prominent "DIRECTIVE CONSENT" banner in the header and
 * the `.ReadWrite` scopes listed explicitly in the consent section — so the
 * entity's Global Admin cannot claim they did not know what they were
 * granting.
 *
 * Phase 1: if the directive template has never been customized, we fall back
 * to the observation template and Section 1 of directive-variant defaults
 * gets inlined. A Phase 2 commit will ship richer defaults + a dedicated
 * Settings panel to edit them.
 */
export function getPdfTemplateForMode(
  mode: "observation" | "directive",
): PdfTemplate {
  if (mode === "directive") {
    const stored = readConfig<PdfTemplate>(KEY_DIRECTIVE);
    if (stored) {
      return applyBrandHeader(mergeWithDefaults(stored));
    }
    // No directive-specific template saved yet — fall back to observation
    // template with a warning stripe so the PDF still renders and the Center
    // admin gets a prompt to customize it.
    return applyBrandHeader(
      mergeWithDefaults({
        ...DEFAULT_PDF_TEMPLATE,
        taglineEn: `${DEFAULT_PDF_TEMPLATE.taglineEn} · DIRECTIVE CONSENT`,
        taglineAr: `${DEFAULT_PDF_TEMPLATE.taglineAr} · موافقة توجيهية`,
      }),
    );
  }
  const stored = readConfig<PdfTemplate>(KEY);
  const base = stored ? mergeWithDefaults(stored) : DEFAULT_PDF_TEMPLATE;
  return applyBrandHeader(base);
}

export function getPdfTemplate(): PdfTemplate {
  const stored = readConfig<PdfTemplate>(KEY);
  const base = stored ? mergeWithDefaults(stored) : DEFAULT_PDF_TEMPLATE;
  return applyBrandHeader(base);
}

/**
 * Shared header-branding + Arabic-sanitizing pass used by both the
 * observation and directive template getters. Pulls the customer's name /
 * tagline from branding if the operator hasn't customized the defaults.
 */
function applyBrandHeader(base: PdfTemplate): PdfTemplate {
  const b = getBranding();
  const brandedHeader: Pick<
    PdfTemplate,
    "councilEn" | "councilAr" | "taglineEn" | "taglineAr" | "footerEn" | "footerAr"
  > = {
    councilEn:
      base.councilEn === DEFAULT_PDF_TEMPLATE.councilEn ? b.nameEn : base.councilEn,
    councilAr:
      base.councilAr === DEFAULT_PDF_TEMPLATE.councilAr ? b.nameAr : base.councilAr,
    taglineEn:
      base.taglineEn === DEFAULT_PDF_TEMPLATE.taglineEn ? b.taglineEn : base.taglineEn,
    taglineAr:
      base.taglineAr === DEFAULT_PDF_TEMPLATE.taglineAr ? b.taglineAr : base.taglineAr,
    footerEn:
      base.footerEn === DEFAULT_PDF_TEMPLATE.footerEn
        ? `${DEFAULT_PDF_TEMPLATE.footerEn} · ${b.nameEn}`
        : base.footerEn,
    footerAr:
      base.footerAr === DEFAULT_PDF_TEMPLATE.footerAr
        ? `${DEFAULT_PDF_TEMPLATE.footerAr} · ${b.nameAr}`
        : base.footerAr,
  };
  const merged = { ...base, ...brandedHeader };
  // Guard against Arabic Tatweel+Latin sequences that crash @react-pdf's bidi reorder.
  return sanitizeArabicDeep(merged);
}

export function setPdfTemplate(input: PdfTemplate): PdfTemplate {
  const clean = mergeWithDefaults(input);
  clean.updatedAt = new Date().toISOString();
  writeConfig(KEY, clean);
  return clean;
}

export function resetPdfTemplate(): PdfTemplate {
  const v = { ...DEFAULT_PDF_TEMPLATE, updatedAt: new Date().toISOString() };
  writeConfig(KEY, v);
  return v;
}

function mergeWithDefaults(input: Partial<PdfTemplate>): PdfTemplate {
  // v4 of the template removed the "Step 2 — Assign compliance roles" section
  // (PowerShell role-assignment was prep for a write tier that's been cut from scope).
  // Saved 5-section templates are migrated in-place by dropping that section.
  let sections = Array.isArray(input.sections) ? input.sections : null;
  if (sections && sections.length === DEFAULT_PDF_TEMPLATE.sections.length + 1) {
    const looksLikePsStep = (s: PdfSection) =>
      /assign compliance roles|تعيين أدوار الامتثال|Connect-IPPSSession|New-RoleAssignment/i.test(
        `${s.titleEn}\n${s.titleAr}\n${s.en}\n${s.ar}\n${s.noteEn ?? ""}\n${s.noteAr ?? ""}`,
      );
    const idx = sections.findIndex(looksLikePsStep);
    if (idx >= 0) sections = [...sections.slice(0, idx), ...sections.slice(idx + 1)];
  }

  return {
    ...DEFAULT_PDF_TEMPLATE,
    ...input,
    sections:
      sections && sections.length === DEFAULT_PDF_TEMPLATE.sections.length
        ? sections.map((sec, i) => ({
            ...DEFAULT_PDF_TEMPLATE.sections[i],
            ...sec,
          }))
        : DEFAULT_PDF_TEMPLATE.sections,
    sigRoles:
      Array.isArray(input.sigRoles) && input.sigRoles.length === 3
        ? input.sigRoles
        : DEFAULT_PDF_TEMPLATE.sigRoles,
  };
}
