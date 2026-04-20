import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import { sanitizeArabicDeep } from "@/lib/pdf/sanitize-ar";
import { getBranding } from "@/lib/config/branding";

/**
 * Discovery letter — the PRE-onboarding document.
 * Goes out to every entity before any tenant record exists. Tells the entity what information
 * to gather (tenant ID, primary domain, global admin, CISO, E5 licensing confirmation) and
 * exactly where in their Microsoft 365 tenant to find it. Entity replies with the info; the
 * Council then registers the entity in Settings and generates the per-tenant onboarding letter.
 *
 * Generic — not parameterized by any entity. One PDF, many recipients.
 */

export type DiscoveryStep = {
  titleEn: string;
  titleAr: string;
  whatEn: string;
  whatAr: string;
  whereEn: string; // "Azure portal → Microsoft Entra ID → Overview" style instructions
  whereAr: string;
};

export type DiscoveryTemplate = {
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
  contactPhone?: string;

  /** "Why we're reaching out" narrative, goes above the checklist. */
  overviewEn: string;
  overviewAr: string;

  /** What the entity is being asked to gather. Each item has a finder walk-through. */
  steps: DiscoveryStep[];

  /** Instructions for sending the information back to the Council. */
  sendBackEn: string;
  sendBackAr: string;

  /** Preview of what happens after the Council receives the info. */
  nextEn: string;
  nextAr: string;

  footerEn: string;
  footerAr: string;

  updatedAt?: string;
};

export const DEFAULT_DISCOVERY: DiscoveryTemplate = {
  councilEn: "Posture & Maturity Dashboard",
  councilAr: "لوحة الوضع الأمني والنضج",
  taglineEn: "Unified security oversight across your connected entities",
  taglineAr: "إشراف أمني موحّد عبر جهاتك المتصلة",

  titleEn: "Onboarding request — information we need from your entity",
  titleAr: "طلب تسجيل — المعلومات التي نحتاجها من جهتكم",

  subtitleEn:
    "Pre-onboarding checklist for the Posture Dashboard. Follow the steps below, then send the completed checklist back to the operator.",
  subtitleAr:
    "قائمة تحقق ما قبل التسجيل في لوحة الوضع الأمني. اتبع الخطوات أدناه ثم أرسل القائمة المكتملة إلى الجهة المشغِّلة.",

  contactName: "Technical Onboarding Lead",
  contactEmail: "onboarding@example.com",
  contactPhone: "",

  overviewEn:
    "The operating organization is establishing a unified security oversight platform across every connected entity, built on Microsoft 365 E5 — the licensing your entity already holds. The platform reads continuous, read-only posture signals from your Microsoft 365 tenant via Microsoft Graph. Before we can enable this for your entity, we need a small amount of information from your technical team.",
  overviewAr:
    "تعمل الجهة المشغِّلة على إنشاء منصة رقابة أمنية موحدة عبر كل الجهات المتصلة، مبنية على Microsoft 365 E5 — وهي الرخصة التي تملكها جهتكم مسبقاً. تقرأ المنصة إشارات الوضع الأمني المتواصلة للقراءة فقط من مستأجر Microsoft 365 الخاص بكم عبر Microsoft Graph. لتمكين ذلك، نحتاج إلى عدد قليل من المعلومات من فريقكم التقني.",

  steps: [
    {
      titleEn: "1. Microsoft Entra Tenant ID",
      titleAr: "١. معرّف مستأجر Microsoft Entra",
      whatEn:
        "A GUID (format 00000000-0000-0000-0000-000000000000) that uniquely identifies your Microsoft 365 organization.",
      whatAr:
        "معرّف GUID (بالصيغة 00000000-0000-0000-0000-000000000000) يُميّز مؤسسة Microsoft 365 الخاصة بكم.",
      whereEn:
        "Azure portal (portal.azure.com) → Microsoft Entra ID → Overview → Tenant ID. Click the copy button next to the value.",
      whereAr:
        "بوابة Azure (portal.azure.com) → Microsoft Entra ID → نظرة عامة → Tenant ID. اضغط زر النسخ بجانب القيمة.",
    },
    {
      titleEn: "2. Primary verified domain",
      titleAr: "٢. النطاق الرئيسي المُتحقَّق",
      whatEn:
        "The main domain users sign in with (e.g. entity.gov.ae). If you have multiple domains, send the one marked as Primary.",
      whatAr:
        "النطاق الرئيسي الذي يستخدمه الموظفون لتسجيل الدخول (مثل entity.gov.ae). إذا كان لديكم عدة نطاقات، أرسلوا المحدَّد بوصفه Primary.",
      whereEn:
        "Microsoft Entra admin center → Settings → Domain names. Look for the row flagged 'PRIMARY'.",
      whereAr:
        "مركز إدارة Microsoft Entra → الإعدادات → أسماء النطاقات. ابحث عن الصف المميَّز بكلمة 'PRIMARY'.",
    },
    {
      titleEn: "3. Microsoft 365 E5 licensing confirmation",
      titleAr: "٣. تأكيد رخصة Microsoft 365 E5",
      whatEn:
        "Confirm that Microsoft 365 E5 (or an equivalent bundle including Defender XDR + Entra ID P2 + Intune + Purview) is active on your tenant. No license number needed — just a yes/no confirmation.",
      whatAr:
        "أكّدوا أن Microsoft 365 E5 (أو حزمة مكافئة تشمل Defender XDR + Entra ID P2 + Intune + Purview) فعّالة على مستأجركم. لا نحتاج رقم الترخيص — يكفي تأكيد نعم/لا.",
      whereEn:
        "Microsoft 365 admin center (admin.microsoft.com) → Billing → Your products. Look for 'Microsoft 365 E5' or equivalent.",
      whereAr:
        "مركز إدارة Microsoft 365 (admin.microsoft.com) → الفواتير → منتجاتك. ابحث عن 'Microsoft 365 E5' أو ما يعادلها.",
    },
    {
      titleEn: "4. Global Administrator (consent approver)",
      titleAr: "٤. المسؤول العام (المعتمد للموافقة)",
      whatEn:
        "The name and email of a person who holds the Global Administrator role in your tenant. They will be the one who clicks the Council's admin-consent link in the next step.",
      whatAr:
        "اسم وبريد الشخص الذي يحمل دور Global Administrator في مستأجركم. هو الذي سيضغط على رابط موافقة المسؤول في الخطوة التالية.",
      whereEn:
        "Microsoft Entra admin center → Roles & admins → Global Administrator. Copy the name + UPN of one admin who can grant consent.",
      whereAr:
        "مركز إدارة Microsoft Entra → الأدوار والمسؤولون → Global Administrator. انسخ اسم و UPN لأحد المسؤولين القادرين على منح الموافقة.",
    },
    {
      titleEn: "5. Designated CISO contact",
      titleAr: "٥. جهة اتصال مسؤول أمن المعلومات",
      whatEn:
        "The name and email of your entity's Chief Information Security Officer (or equivalent). This person receives all future communications about the dashboard — role reviews, incidents the Council flags, quarterly summaries.",
      whatAr:
        "اسم وبريد مسؤول أمن المعلومات في جهتكم (أو من يعادله). هذا الشخص يتلقى كل المراسلات المستقبلية حول اللوحة — مراجعات الأدوار، الحوادث التي يشير إليها المجلس، الملخصات الربعية.",
      whereEn:
        "Internal — confirm with your entity's management or HR if unsure who the designated CISO is.",
      whereAr:
        "داخلياً — راجع إدارة الجهة أو الموارد البشرية إذا لم تكن متأكداً من هو مسؤول أمن المعلومات المعيَّن.",
    },
  ],

  sendBackEn:
    "Reply to the onboarding contact below with the five items above. A plain email is fine — no specific template required. Subject line: 'Onboarding info — [Entity name]'.",
  sendBackAr:
    "أرسل رداً إلى جهة الاتصال أدناه يتضمن العناصر الخمسة أعلاه. يكفي بريد إلكتروني عادي — لا يُشترط نموذج محدد. العنوان: 'معلومات التسجيل — [اسم الجهة]'.",

  nextEn:
    "The operator registers your entity in the dashboard within one business day and sends back a personalized onboarding letter. That letter contains a unique admin-consent URL and a verification step. Total time for your team: under 30 minutes.",
  nextAr:
    "تسجّل الجهة المشغِّلة جهتكم في اللوحة خلال يوم عمل واحد وترسل رسالة تسجيل مخصّصة. تحتوي الرسالة على رابط موافقة مسؤول فريد، وخطوة تحقق. الوقت الإجمالي لفريقكم: أقل من ٣٠ دقيقة.",

  footerEn: "Confidential · Microsoft Partnership",
  footerAr: "سري · بالشراكة مع Microsoft",
};

const KEY = "pdf.discovery";

export function getDiscoveryTemplate(): DiscoveryTemplate {
  const stored = readConfig<DiscoveryTemplate>(KEY);
  const base = stored ? mergeWithDefaults(stored) : DEFAULT_DISCOVERY;
  const b = getBranding();
  const brandedHeader: Pick<
    DiscoveryTemplate,
    "councilEn" | "councilAr" | "taglineEn" | "taglineAr" | "footerEn" | "footerAr"
  > = {
    councilEn:
      base.councilEn === DEFAULT_DISCOVERY.councilEn ? b.nameEn : base.councilEn,
    councilAr:
      base.councilAr === DEFAULT_DISCOVERY.councilAr ? b.nameAr : base.councilAr,
    taglineEn:
      base.taglineEn === DEFAULT_DISCOVERY.taglineEn ? b.taglineEn : base.taglineEn,
    taglineAr:
      base.taglineAr === DEFAULT_DISCOVERY.taglineAr ? b.taglineAr : base.taglineAr,
    footerEn:
      base.footerEn === DEFAULT_DISCOVERY.footerEn
        ? `${DEFAULT_DISCOVERY.footerEn} · ${b.nameEn}`
        : base.footerEn,
    footerAr:
      base.footerAr === DEFAULT_DISCOVERY.footerAr
        ? `${DEFAULT_DISCOVERY.footerAr} · ${b.nameAr}`
        : base.footerAr,
  };
  const merged = { ...base, ...brandedHeader };
  // Guard: strip Tatweel-next-to-Latin sequences that crash @react-pdf's bidi reorder.
  return sanitizeArabicDeep(merged);
}

export function setDiscoveryTemplate(input: DiscoveryTemplate): DiscoveryTemplate {
  const clean = mergeWithDefaults(input);
  clean.updatedAt = new Date().toISOString();
  writeConfig(KEY, clean);
  return clean;
}

export function resetDiscoveryTemplate(): DiscoveryTemplate {
  const v = { ...DEFAULT_DISCOVERY, updatedAt: new Date().toISOString() };
  writeConfig(KEY, v);
  return v;
}

function mergeWithDefaults(input: Partial<DiscoveryTemplate>): DiscoveryTemplate {
  return {
    ...DEFAULT_DISCOVERY,
    ...input,
    steps:
      Array.isArray(input.steps) && input.steps.length === DEFAULT_DISCOVERY.steps.length
        ? input.steps.map((step, i) => ({
            ...DEFAULT_DISCOVERY.steps[i],
            ...step,
          }))
        : DEFAULT_DISCOVERY.steps,
  };
}
