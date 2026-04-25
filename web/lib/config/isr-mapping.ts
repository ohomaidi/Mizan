import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import type { ComplianceMapping } from "./compliance-framework";

/**
 * Dubai Information Security Regulation (ISR) clause catalog.
 *
 * Published by Dubai Electronic Security Center (DESC). Mandatory for
 * Dubai government entities, semi-government bodies, critical
 * infrastructure operators, cloud service providers serving Dubai
 * clients, and private-sector organizations processing sensitive
 * government / citizen data.
 *
 * ## Version + structure
 *
 * Latest published: **ISR v3.1** (English release; v3.0 launched Aug
 * 2023, builds on v2.0 from 2017). The regulation is organised into 13
 * domains across 3 classes:
 *
 *   - **Governance** (1–3): Information Security Management & Governance,
 *     Information & Asset Management, Information Security Risk Management.
 *   - **Operation** (4–8): Incident & Problem Management, Access Control,
 *     Operations / Systems / Communications Management, Business Continuity
 *     Planning, Information Systems Acquisition / Development / Management.
 *   - **Assurance** (9–13): Compliance Management, Human Resources Security,
 *     Physical & Environmental Security, Third Party Management, Monitoring
 *     / Audit / Review.
 *
 * The framework is anchored on **ISO/IEC 27001/27002**, with v3.0 layering
 * in Zero Trust language, synthetic-data protection, and risk-based
 * policy alignment (NIST SP 800-207 / NIST CSF concepts as supporting
 * references — but ISO is the spine).
 *
 * ## Why this catalog ships as draft
 *
 * The ISR document itself is **controlled distribution** — DESC does NOT
 * publish the official PDF on desc.gov.ae. The catalog below is
 * synthesized from authoritative public secondary sources (Microsoft
 * Azure compliance docs, Complyan, CyberArrow, SecurityScientist,
 * BeyondTrust, Kiteworks compliance guides) and aligns the 13 domains
 * to representative Microsoft 365 Secure Score control names.
 *
 * Several ISR specifics remain unverified in public sources and are
 * marked `_draft_` in this file's `draftNote`:
 *   1. The official names of all 13 v3.1 domains (2–3 wording
 *      inconsistencies between Complyan and SecurityScientist).
 *   2. The exact classification tier nomenclature (Public / Confidential /
 *      Secret / Top Secret is the working assumption; needs PDF verification).
 *   3. The total + per-tier control count.
 *
 * **Action item for DESC pilot**: when DESC hands over the official ISR
 * v3.1 PDF (or the DESC mapping spreadsheet), one seed-replace lands
 * the authoritative names and IDs without schema churn — the storage
 * key is `isr.mapping`, fully Council-editable through `/settings`.
 *
 * Stored in `app_config.key = 'isr.mapping'`. Override at runtime via
 * Settings → Compliance framework. Catalog fingerprints persist
 * separately from NESA so an operator switching between frameworks
 * keeps their per-framework customizations.
 */

export const DEFAULT_ISR_MAPPING: ComplianceMapping = {
  framework: "dubai-isr",
  frameworkVersion: "Dubai ISR v3.1 (draft mapping)",
  status: "draft",
  draftNote:
    "Catalog synthesised from public secondary sources pending DESC delivery of the official ISR v3.1 PDF. Domain names and clause text approximate Complyan / CyberArrow / Microsoft Azure compliance reference. Clause IDs prefixed `ISR-` and grouped by class (Governance / Operation / Assurance). Replace this catalog in-place once the authoritative PDF is loaded — storage key is `isr.mapping`.",
  clauses: [
    // ============================================================
    // CLASS: GOVERNANCE  (Domains 1–3)
    // ============================================================
    {
      id: "ISR-1",
      ref: "ISR-1 — Information Security Management & Governance",
      classRef: "Governance",
      titleEn: "Information security management system and governance roles",
      titleAr: "نظام إدارة أمن المعلومات وأدوار الحوكمة",
      descriptionEn:
        "Documented ISMS, accountable Information Security Manager, board-level oversight, formal policies reviewed annually.",
      descriptionAr:
        "نظام موثَّق لإدارة أمن المعلومات، مسؤول أمن معلومات معتمد، إشراف على مستوى الإدارة العليا، سياسات رسمية تُراجَع سنوياً.",
      secureScoreControls: ["AdminMFAV2", "AdminAccountReview"],
      weight: 8,
    },
    {
      id: "ISR-2",
      ref: "ISR-2 — Information & Asset Management",
      classRef: "Governance",
      titleEn: "Information classification and asset register with owners",
      titleAr: "تصنيف المعلومات وسجل الأصول مع تحديد المالكين",
      descriptionEn:
        "Living asset register with assigned owners + custodians; classification labels applied to drive access, retention, and disposal.",
      descriptionAr:
        "سجل أصول حيّ بمالكين وأمناء مُعيَّنين؛ تصنيفات تُطبَّق لقيادة الوصول والاحتفاظ والتخلّص.",
      secureScoreControls: [
        "mip_sensitivitylabelspolicies",
        "mip_autosensitivitylabelspolicies",
      ],
      weight: 9,
    },
    {
      id: "ISR-3",
      ref: "ISR-3 — Information Security Risk Management",
      classRef: "Governance",
      titleEn: "Risk-based security with documented risk register and treatment plan",
      titleAr: "أمن قائم على المخاطر مع سجل مخاطر موثَّق وخطة معالجة",
      descriptionEn:
        "Documented risk methodology, risk register kept current, treatment plan tracking residual risk acceptance.",
      descriptionAr:
        "منهجية مخاطر موثَّقة، سجل مخاطر مُحدَّث، خطة معالجة تتابع قبول المخاطر المتبقّية.",
      secureScoreControls: ["MFARegistrationV2"],
      weight: 7,
    },

    // ============================================================
    // CLASS: OPERATION  (Domains 4–8)
    // ============================================================
    {
      id: "ISR-4",
      ref: "ISR-4 — Incident & Problem Management",
      classRef: "Operation",
      titleEn: "Detection, triage, and response with mean-time-to-acknowledge targets",
      titleAr: "الاكتشاف والتصنيف والاستجابة مع أهداف لمتوسط زمن الإقرار",
      descriptionEn:
        "Unified incidents across Defender XDR; documented triage workflow; MTTA tracking; post-incident review for high severity.",
      descriptionAr:
        "حوادث موحَّدة عبر Defender XDR؛ سير عمل تصنيف موثَّق؛ تتبّع متوسط زمن الإقرار؛ مراجعة لاحقة للحوادث عالية الخطورة.",
      secureScoreControls: ["AuditLogSearch", "mip_search_auditlog"],
      weight: 9,
    },
    {
      id: "ISR-5",
      ref: "ISR-5 — Access Control",
      classRef: "Operation",
      titleEn: "Identity-first access with MFA, conditional access, and privileged-access management",
      titleAr: "وصول قائم على الهوية مع MFA والوصول المشروط وإدارة الوصول المميَّز",
      descriptionEn:
        "Phish-resistant MFA for privileged users, Conditional Access policies covering legacy auth + risk-based sign-in, PIM for standing admin assignments.",
      descriptionAr:
        "MFA مقاوِم للتصيّد للمستخدمين المميَّزين، سياسات الوصول المشروط تغطّي المصادقة القديمة وتسجيل الدخول القائم على المخاطر، PIM لتعيينات المسؤولين الدائمة.",
      secureScoreControls: [
        "MFARegistrationV2",
        "BlockLegacyAuthentication",
        "AdminMFAV2",
        "spo_legacy_auth",
      ],
      weight: 12,
    },
    {
      id: "ISR-6",
      ref: "ISR-6 — Operations, Systems & Communications Management",
      classRef: "Operation",
      titleEn: "Endpoint hardening, secure communications, and cryptography baselines",
      titleAr: "تقوية النقاط الطرفية، اتصالات آمنة، أُسس التشفير",
      descriptionEn:
        "All seats managed via Intune with BitLocker, Secure Boot, Defender baseline; mail flow encrypted in transit; cryptographic standards aligned to FIPS / NIST.",
      descriptionAr:
        "إدارة جميع المقاعد عبر Intune مع BitLocker وSecure Boot وأُسس Defender؛ تشفير تدفّق البريد أثناء النقل؛ معايير تشفير متوافقة مع FIPS / NIST.",
      secureScoreControls: [
        "IntuneCompliancePolicies",
        "mdo_safelinksforemail",
        "mdo_safeattachments",
        "mdo_atpprotection",
      ],
      weight: 10,
    },
    {
      id: "ISR-7",
      ref: "ISR-7 — Business Continuity Planning",
      classRef: "Operation",
      titleEn: "Documented BCP with tested recovery objectives",
      titleAr: "خطة استمرارية أعمال موثَّقة مع أهداف استرداد مُختبَرة",
      descriptionEn:
        "Recovery time / point objectives documented per system tier, annual exercise, alternate-site capability for critical services.",
      descriptionAr:
        "أهداف زمن الاسترداد ونقطة الاسترداد موثَّقة لكل طبقة نظام، تمرين سنوي، قدرة موقع بديل للخدمات الحرجة.",
      secureScoreControls: [],
      weight: 6,
    },
    {
      id: "ISR-8",
      ref: "ISR-8 — Information Systems Acquisition, Development & Management",
      classRef: "Operation",
      titleEn: "Secure-by-design development lifecycle and supplier-supplied system reviews",
      titleAr: "دورة حياة تطوير آمنة بحكم التصميم ومراجعات أنظمة الموردين",
      descriptionEn:
        "Documented SDLC with security gates, threat modelling for new systems, security review before production rollout, OAuth app consent governance.",
      descriptionAr:
        "دورة حياة تطوير موثَّقة بمراحل أمنية، نمذجة تهديدات للأنظمة الجديدة، مراجعة أمنية قبل النشر للإنتاج، حوكمة موافقة تطبيقات OAuth.",
      secureScoreControls: ["exo_oauth2clientprofileenabled"],
      weight: 6,
    },

    // ============================================================
    // CLASS: ASSURANCE  (Domains 9–13)
    // ============================================================
    {
      id: "ISR-9",
      ref: "ISR-9 — Compliance Management",
      classRef: "Assurance",
      titleEn: "Continuous compliance against ISR + applicable regulations",
      titleAr: "امتثال مستمر للائحة ISR واللوائح المعمول بها",
      descriptionEn:
        "Compliance evidence repository, mapping ISR clauses to deployed controls, quarterly self-assessment, gap remediation tracking.",
      descriptionAr:
        "مستودع أدلّة الامتثال، تطابق بنود ISR مع الضوابط المنشورة، تقييم ذاتي ربعي، تتبّع معالجة الفجوات.",
      secureScoreControls: ["AuditLogSearch"],
      weight: 8,
    },
    {
      id: "ISR-10",
      ref: "ISR-10 — Human Resources Security",
      classRef: "Assurance",
      titleEn: "Joiners-movers-leavers controls with awareness training and screening",
      titleAr: "ضوابط دخول وانتقال ومغادرة الموظفين مع التوعية والفحص",
      descriptionEn:
        "Pre-employment screening, security awareness training (annual + role-specific), prompt revocation of access on termination, attestations of acceptable-use policy.",
      descriptionAr:
        "فحص ما قبل التوظيف، تدريب توعية أمنية (سنوي + خاص بالدور)، إلغاء فوري للوصول عند انتهاء الخدمة، إقرارات سياسة الاستخدام المقبول.",
      secureScoreControls: [],
      weight: 5,
    },
    {
      id: "ISR-11",
      ref: "ISR-11 — Physical & Environmental Security",
      classRef: "Assurance",
      titleEn: "Physical access controls and environmental safeguards for critical facilities",
      titleAr: "ضوابط الوصول الفعلي والضمانات البيئية للمنشآت الحرجة",
      descriptionEn:
        "Multi-factor physical access, CCTV with retention, environmental monitoring (power, cooling, fire) for data-bearing facilities.",
      descriptionAr:
        "وصول فعلي متعدد العوامل، كاميرات مراقبة مع احتفاظ، رصد بيئي (طاقة، تبريد، حريق) للمنشآت الحاوية للبيانات.",
      secureScoreControls: [],
      weight: 5,
    },
    {
      id: "ISR-12",
      ref: "ISR-12 — Third Party Management",
      classRef: "Assurance",
      titleEn: "Supplier security clauses, periodic review, and right-to-audit",
      titleAr: "بنود أمنية للموردين، مراجعة دورية، وحق التدقيق",
      descriptionEn:
        "Security clauses in supplier contracts, periodic supplier security review (annual or higher for criticals), right-to-audit clause exercised on critical suppliers.",
      descriptionAr:
        "بنود أمنية في عقود الموردين، مراجعة أمنية دورية للموردين (سنوية أو أكثر للحرجين)، ممارسة حق التدقيق على الموردين الحرجين.",
      secureScoreControls: ["exo_storageproviderrestricted"],
      weight: 5,
    },
    {
      id: "ISR-13",
      ref: "ISR-13 — Monitoring, Audit & Review",
      classRef: "Assurance",
      titleEn: "Continuous monitoring, audit log retention, and independent review",
      titleAr: "مراقبة مستمرة، احتفاظ بسجل التدقيق، ومراجعة مستقلة",
      descriptionEn:
        "Centralized log collection (SIEM), retention ≥ 2 years for security-relevant logs, independent annual security audit, regular penetration testing.",
      descriptionAr:
        "جمع سجلات مركزي (SIEM)، احتفاظ ≥ سنتين للسجلات الأمنية، تدقيق أمني سنوي مستقل، اختبار اختراق دوري.",
      secureScoreControls: [
        "AuditLogSearch",
        "exo_mailboxaudit",
        "mip_search_auditlog",
      ],
      weight: 10,
    },
  ],
};

const KEY = "isr.mapping";

export function getIsrMapping(): ComplianceMapping {
  const stored = readConfig<ComplianceMapping>(KEY);
  return stored ? mergeWithDefaults(stored) : DEFAULT_ISR_MAPPING;
}

export function setIsrMapping(input: ComplianceMapping): ComplianceMapping {
  const clean = mergeWithDefaults(input);
  const totalWeight = clean.clauses.reduce((s, c) => s + (c.weight || 0), 0);
  if (totalWeight > 0) {
    clean.clauses = clean.clauses.map((c) => ({
      ...c,
      weight: Math.round(((c.weight || 0) / totalWeight) * 1000) / 10,
    }));
  }
  clean.updatedAt = new Date().toISOString();
  writeConfig(KEY, clean);
  return clean;
}

export function resetIsrMapping(): ComplianceMapping {
  const v = { ...DEFAULT_ISR_MAPPING, updatedAt: new Date().toISOString() };
  writeConfig(KEY, v);
  return v;
}

function mergeWithDefaults(input: Partial<ComplianceMapping>): ComplianceMapping {
  return {
    framework: "dubai-isr",
    frameworkVersion:
      input.frameworkVersion ?? DEFAULT_ISR_MAPPING.frameworkVersion,
    status: input.status === "official" ? "official" : "draft",
    draftNote: input.draftNote ?? DEFAULT_ISR_MAPPING.draftNote,
    clauses:
      Array.isArray(input.clauses) && input.clauses.length > 0
        ? input.clauses.map((c) => ({
            id: c.id,
            ref: c.ref,
            classRef: c.classRef,
            titleEn: c.titleEn,
            titleAr: c.titleAr,
            descriptionEn: c.descriptionEn,
            descriptionAr: c.descriptionAr,
            secureScoreControls: Array.isArray(c.secureScoreControls)
              ? c.secureScoreControls
              : [],
            weight: typeof c.weight === "number" ? c.weight : 0,
          }))
        : DEFAULT_ISR_MAPPING.clauses,
    updatedAt: input.updatedAt,
  };
}
