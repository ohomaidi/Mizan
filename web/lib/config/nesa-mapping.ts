import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import type { ComplianceClause, ComplianceMapping } from "./compliance-framework";

/**
 * UAE NESA (National Electronic Security Authority) clause mapping.
 *
 * The UAE NESA framework publishes a catalog of security controls that government entities
 * must adopt. Microsoft Compliance Manager exposes its own scores against that catalog but
 * does NOT expose the per-clause data via Graph (docs/04 §5 risk #1). So this mapping is
 * hand-curated: each NESA clause lists the Secure Score control names that best evidence
 * adoption. The Council's compliance sub-score synthesizes from those control pass rates.
 *
 * Stored in `app_config.key = 'nesa.mapping'`, Council-editable at runtime via Settings.
 * Defaults below are a starter set — Council standards leadership refines over time.
 *
 * Re-typed against the shared `ComplianceMapping` shape introduced in v2.2 so this catalog
 * sits side-by-side with the Dubai ISR catalog (and any future framework catalogs) under a
 * single registry. Existing storage key + persisted shape are preserved for backward
 * compatibility — only the static type narrows.
 */

/** @deprecated kept for callers still importing the old name. Prefer `ComplianceClause`. */
export type NesaClause = ComplianceClause;

/** @deprecated kept for callers still importing the old name. Prefer `ComplianceMapping`. */
export type NesaMapping = ComplianceMapping;

export const DEFAULT_NESA_MAPPING: ComplianceMapping = {
  framework: "nesa",
  frameworkVersion: "UAE NESA IAS 1.0",
  status: "official",
  clauses: [
    {
      id: "T.1",
      ref: "T.1 — Identification & Authentication",
      titleEn: "Strong multi-factor authentication for all users",
      titleAr: "مصادقة متعددة العوامل قوية لجميع المستخدمين",
      descriptionEn:
        "Enforce MFA across the workforce; phish-resistant for privileged roles.",
      descriptionAr:
        "فرض المصادقة متعددة العوامل على جميع الموظفين، ومقاومة للتصيد للأدوار المميّزة.",
      // Five evidence anchors — covers MFA registration coverage,
      // admin-grade MFA, phishing-resistant strength, password
      // protection, and the banned-passwords list. Each is an actual
      // Microsoft Secure Score control id observed in tenant snapshots.
      secureScoreControls: [
        "MFARegistrationV2",
        "AdminMFAV2",
        "aad_phishing_MFA_strength",
        "aad_password_protection",
        "aad_custom_banned_passwords",
      ],
      weight: 20,
    },
    {
      id: "T.2",
      ref: "T.2 — Access Control",
      titleEn: "Least-privilege access with just-in-time elevation",
      titleAr: "الوصول بأقل امتياز مع الترقية عند الحاجة",
      descriptionEn:
        "Use Conditional Access + PIM so standing access is rare and audited.",
      descriptionAr:
        "استخدام الوصول المشروط وPIM بحيث يكون الوصول الدائم نادرًا ومُدقَّقًا.",
      // Cloud-only admin separation, role minimisation, third-party
      // app review, and admin sign-in frequency / session timeout —
      // the four anchors Microsoft surfaces for least-privilege.
      secureScoreControls: [
        "aad_admin_accounts_separate_unassigned_cloud_only",
        "aad_limited_administrative_roles",
        "aad_third_party_apps",
        "aad_sign_in_freq_session_timeout",
      ],
      weight: 15,
    },
    {
      id: "T.3",
      ref: "T.3 — Information Classification",
      titleEn: "Sensitivity labels applied to Council-defined classification tiers",
      titleAr: "تطبيق تصنيفات الحساسية على فئات التصنيف المعتمدة من المجلس",
      descriptionEn:
        "Publish and adopt sensitivity labels; enforce protections by tier.",
      descriptionAr:
        "نشر وتبنّي تصنيفات الحساسية، وفرض الحماية بحسب الفئة.",
      secureScoreControls: [
        "mip_sensitivitylabelspolicies",
        "mip_autosensitivitylabelspolicies",
        "mip_purviewlabelconsent",
      ],
      weight: 12,
    },
    {
      id: "T.4",
      ref: "T.4 — Data Loss Prevention",
      titleEn: "DLP policies covering UAE regulated data types",
      titleAr: "سياسات منع فقدان البيانات تغطي أنواع البيانات المنظَّمة إماراتيًا",
      descriptionEn:
        "Deploy DLP rules for Emirates ID, passport numbers, PII, and payment data.",
      descriptionAr:
        "نشر قواعد DLP للهوية الإماراتية وأرقام الجوازات والبيانات الشخصية وبيانات الدفع.",
      // Core DLP policy + exfiltration choke-points: external mail
      // forwarding (both transport rule + admin-set), restricted
      // third-party storage providers, and safe-attachments scanning.
      secureScoreControls: [
        "dlp_datalossprevention",
        "exo_blockmailforward",
        "mdo_blockmailforward",
        "exo_storageproviderrestricted",
        "mdo_safeattachments",
      ],
      weight: 12,
    },
    {
      id: "T.5",
      ref: "T.5 — Endpoint Security",
      titleEn: "Managed devices with encryption, attestation, and AV baseline",
      titleAr: "أجهزة مُدارة مع تشفير وإثبات حالة وأساس لمكافحة الفيروسات",
      descriptionEn:
        "All seats managed via Intune with BitLocker, Secure Boot, and Defender baseline.",
      descriptionAr:
        "إدارة جميع المقاعد عبر Intune مع BitLocker وSecure Boot وأساس Defender.",
      // Intune compliance policies + BitLocker required, plus the MDE
      // sensor turn-on, Defender Antivirus baseline, and Defender
      // Firewall — all observed in seeded snapshots.
      secureScoreControls: [
        "BitLockerRequired",
        "IntuneCompliancePolicies",
        "scid_2000",
        "scid_2010",
        "scid_2070",
      ],
      weight: 12,
    },
    {
      id: "T.6",
      ref: "T.6 — Incident Detection & Response",
      titleEn: "24×7 monitoring with mean-time-to-acknowledge targets",
      titleAr: "مراقبة على مدار الساعة بأهداف لمتوسط زمن الاستجابة",
      descriptionEn:
        "Unified incidents across Defender XDR; MTTA < 30 min for high severity.",
      descriptionAr:
        "توحيد الحوادث عبر Defender XDR؛ متوسط زمن الاستجابة أقل من ٣٠ دقيقة للحدّة العالية.",
      // Defender for Identity (sensor + service), MDE sensor turn-on,
      // and Tamper Protection — the controls Microsoft scores against
      // for "can the tenant detect and respond to attacks?".
      secureScoreControls: [
        "AATP_DefenderForIdentity",
        "AATP_Sensor",
        "scid_2000",
        "scid_2003",
      ],
      weight: 11,
    },
    {
      id: "T.7",
      ref: "T.7 — Audit & Accountability",
      titleEn: "Audit log retention ≥ 2 years, tamper-resistant",
      titleAr: "حفظ سجلات التدقيق لمدة سنتين فأكثر، ومقاومة للتلاعب",
      descriptionEn:
        "Unified audit log retention configured at the tenant; immutable Council-side audit of access.",
      descriptionAr:
        "حفظ سجل التدقيق الموحّد مضبوطٌ على مستوى المستأجر؛ سجل وصول غير قابل للتعديل من جانب المجلس.",
      secureScoreControls: [
        "AuditLogSearch",
        "exo_mailboxaudit",
        "mip_search_auditlog",
      ],
      weight: 10,
    },
    {
      id: "T.8",
      ref: "T.8 — Data Residency",
      titleEn: "Data stored in UAE sovereign regions",
      titleAr: "تخزين البيانات في المناطق السيادية بالإمارات",
      descriptionEn:
        "Microsoft 365 + Azure workloads bound to UAE-North / UAE-Central.",
      descriptionAr:
        "أعباء Microsoft 365 و Azure مربوطة بـUAE-North / UAE-Central.",
      // Microsoft Graph has no Secure Score control for tenant-region
      // residency — the data is true at provisioning time and not
      // tracked as a daily score. Council records evidence manually
      // (region attestation letter from Microsoft + procurement
      // contract clause). Reviewed annually.
      secureScoreControls: [],
      customEvidence: [
        {
          id: "uae-region-attestation",
          label:
            "Microsoft tenant-region attestation letter (UAE-North / UAE-Central)",
          manualPassRate: 0,
          reviewedAt: "2026-01-01",
          reviewerNote:
            "Operator records the attestation letter date + procurement clause reference. Reviewed annually.",
        },
      ],
      weight: 8,
    },
  ],
};

const KEY = "nesa.mapping";

export function getNesaMapping(): ComplianceMapping {
  const stored = readConfig<ComplianceMapping>(KEY);
  return stored ? mergeWithDefaults(stored) : DEFAULT_NESA_MAPPING;
}

export function setNesaMapping(input: ComplianceMapping): ComplianceMapping {
  const clean = mergeWithDefaults(input);
  const totalWeight = clean.clauses.reduce((s, c) => s + (c.weight || 0), 0);
  if (totalWeight > 0) {
    // Normalize to 100.
    clean.clauses = clean.clauses.map((c) => ({
      ...c,
      weight: Math.round(((c.weight || 0) / totalWeight) * 1000) / 10,
    }));
  }
  clean.updatedAt = new Date().toISOString();
  writeConfig(KEY, clean);
  return clean;
}

export function resetNesaMapping(): ComplianceMapping {
  const v = { ...DEFAULT_NESA_MAPPING, updatedAt: new Date().toISOString() };
  writeConfig(KEY, v);
  return v;
}

function mergeWithDefaults(input: Partial<ComplianceMapping>): ComplianceMapping {
  return {
    framework: "nesa",
    frameworkVersion: input.frameworkVersion ?? DEFAULT_NESA_MAPPING.frameworkVersion,
    status: input.status === "draft" ? "draft" : "official",
    draftNote: input.draftNote,
    clauses:
      Array.isArray(input.clauses) && input.clauses.length > 0
        ? input.clauses.map((c) => ({
            id: c.id,
            ref: c.ref,
            classRefs: Array.isArray(c.classRefs)
              ? c.classRefs.filter(
                  (r): r is "Governance" | "Operation" | "Assurance" =>
                    r === "Governance" ||
                    r === "Operation" ||
                    r === "Assurance",
                )
              : undefined,
            titleEn: c.titleEn,
            titleAr: c.titleAr,
            descriptionEn: c.descriptionEn,
            descriptionAr: c.descriptionAr,
            secureScoreControls: Array.isArray(c.secureScoreControls)
              ? c.secureScoreControls
              : [],
            customEvidence: Array.isArray(c.customEvidence)
              ? c.customEvidence
              : undefined,
            weight: typeof c.weight === "number" ? c.weight : 0,
          }))
        : DEFAULT_NESA_MAPPING.clauses,
    updatedAt: input.updatedAt,
  };
}
