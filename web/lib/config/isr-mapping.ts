import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import type { ComplianceMapping } from "./compliance-framework";

/**
 * Dubai Information Security Regulation (ISR) clause catalog.
 *
 * Published by Dubai Electronic Security Center (DESC). Mandatory for
 * all Dubai Government Entities, including their employees,
 * consultants, contractors, and visitors. Issued under Dubai Law
 * No. 11 of 2014 and Resolution No. 13 of 2012.
 *
 * ## Source of truth
 *
 * Catalog rebuilt 2026-04-26 against the **authoritative DESC ISR
 * Version 2.0 PDF** (Copyright © 2017 Dubai Electronic Security Center).
 * Domain titles, objectives, main control references, and class
 * memberships transcribed verbatim from the PDF. Microsoft 365
 * Secure Score control IDs hand-mapped to each domain from the
 * production Secure Score control catalog as evidence anchors.
 *
 * ## Structure
 *
 * 13 domains organized across 3 classes — **Governance, Operation,
 * Assurance**. Each domain may belong to MULTIPLE classes (per Table 1
 * of the PDF). For example Domain 11 (Compliance and Audit) is both
 * Governance + Assurance; Domain 7 (BCP) is Governance + Operation.
 *
 * The PDF defines the structure as:
 *   Domain → Objective → Main Controls → Sub Controls
 *
 * This catalog captures domain-level entries with the main-control
 * roster summarised in the description. Sub-controls (the X.Y.Z and
 * X.Y.Z.W layers, ~500 in total across the regulation) are not
 * surfaced here — Mizan's compliance sub-score is computed at the
 * domain level. Operators with deeper audit needs reference the PDF
 * directly for sub-control text.
 *
 * Stored in `app_config.key = 'isr.mapping'`. Council-editable at
 * runtime via Settings → Compliance framework.
 */

export const DEFAULT_ISR_MAPPING: ComplianceMapping = {
  framework: "dubai-isr",
  frameworkVersion: "Dubai ISR Version 2.0 (2017)",
  status: "official",
  clauses: [
    // ============================================================
    // DOMAIN 1 — Pure Governance
    // ============================================================
    {
      id: "ISR-1",
      ref: "Domain 1 — Information Security Management and Governance",
      classRefs: ["Governance"],
      titleEn: "Information Security Management and Governance",
      titleAr: "إدارة وحوكمة أمن المعلومات",
      descriptionEn:
        "Establishes information security as part of enterprise governance: aligning security with strategic direction, ensuring security objectives are achieved, managing risks appropriately, using resources responsibly, and continuously monitoring the security program. Main controls: 1.1 Roles and Responsibilities of Information Security; 1.2 Information Security Policy.",
      descriptionAr:
        "ترسيخ أمن المعلومات ضمن حوكمة المؤسسة: مواءمة الأمن مع التوجه الاستراتيجي، ضمان تحقيق أهداف الأمن، إدارة المخاطر بشكل ملائم، استخدام الموارد بمسؤولية، والمراقبة المستمرة لبرنامج الأمن. الضوابط الرئيسية: 1.1 الأدوار والمسؤوليات؛ 1.2 سياسة أمن المعلومات.",
      secureScoreControls: ["AdminMFAV2", "AdminAccountReview"],
      weight: 8,
    },

    // ============================================================
    // DOMAIN 2 — Governance + Operation
    // ============================================================
    {
      id: "ISR-2",
      ref: "Domain 2 — Information and Information Assets Management",
      classRefs: ["Governance", "Operation"],
      titleEn: "Information and Information Assets Management",
      titleAr: "إدارة المعلومات وأصول المعلومات",
      descriptionEn:
        "Identify and classify information assets and define proper storage, handling, and secure-disposal measures to protect the entity from legal liabilities, losses, and attacks. Main controls: 2.1 Information Assets Management; 2.2 Information Assets Ownership/Custodianship; 2.3 Information Assets Classification; 2.4 Information Assets Labelling and Handling; 2.5 Disposal of Information and Assets; 2.6 Information Assets Responsibility.",
      descriptionAr:
        "تحديد وتصنيف أصول المعلومات وتعريف إجراءات التخزين والمعالجة والإتلاف الآمن لحماية الجهة من المسؤوليات القانونية والخسائر والهجمات. الضوابط الرئيسية: 2.1 إدارة الأصول؛ 2.2 ملكية/أمانة الأصول؛ 2.3 تصنيف الأصول؛ 2.4 وسم ومعالجة الأصول؛ 2.5 التخلّص من الأصول؛ 2.6 مسؤولية الأصول.",
      secureScoreControls: [
        "mip_sensitivitylabelspolicies",
        "mip_autosensitivitylabelspolicies",
      ],
      weight: 9,
    },

    // ============================================================
    // DOMAIN 3 — Governance + Operation
    // ============================================================
    {
      id: "ISR-3",
      ref: "Domain 3 — Information Security Risk Management",
      classRefs: ["Governance", "Operation"],
      titleEn: "Information Security Risk Management",
      titleAr: "إدارة مخاطر أمن المعلومات",
      descriptionEn:
        "Identify and treat risks associated with critical information and information assets through detailed study of business processes, determining threats and vulnerabilities, and applying appropriate risk-treatment plans and controls. Main controls: 3.1 Risk Assessment Methodology and Planning; 3.2 Risk Assessment; 3.3 Risk Treatment and Mitigation; 3.4 Risk Acceptance.",
      descriptionAr:
        "تحديد ومعالجة المخاطر المرتبطة بالمعلومات والأصول الحرجة عبر دراسة تفصيلية للعمليات وتحديد التهديدات ونقاط الضعف وتطبيق خطط معالجة وضوابط مناسبة. الضوابط الرئيسية: 3.1 منهجية وتخطيط تقييم المخاطر؛ 3.2 تقييم المخاطر؛ 3.3 معالجة وتخفيف المخاطر؛ 3.4 قبول المخاطر.",
      secureScoreControls: ["MFARegistrationV2"],
      weight: 7,
    },

    // ============================================================
    // DOMAIN 4 — Pure Operation
    // ============================================================
    {
      id: "ISR-4",
      ref: "Domain 4 — Incident and Problem Management",
      classRefs: ["Operation"],
      titleEn: "Incident and Problem Management",
      titleAr: "إدارة الحوادث والمشاكل",
      descriptionEn:
        "Outline a proper process for identification and effective handling of information security incidents to minimize adverse business impact. Main controls: 4.1 Incident Management Planning; 4.2 Information Security Incident Reporting and Escalation; 4.3 Evidence Gathering; 4.4 Information Security Incidents Knowledge Base.",
      descriptionAr:
        "تحديد عملية ملائمة لاكتشاف الحوادث الأمنية والتعامل معها بفعّالية للحدّ من الأثر السلبي على أعمال الجهة. الضوابط الرئيسية: 4.1 تخطيط إدارة الحوادث؛ 4.2 الإبلاغ عن الحوادث وتصعيدها؛ 4.3 جمع الأدلّة؛ 4.4 قاعدة معرفة الحوادث.",
      secureScoreControls: ["AuditLogSearch", "mip_search_auditlog"],
      weight: 9,
    },

    // ============================================================
    // DOMAIN 5 — Pure Operation
    // ============================================================
    {
      id: "ISR-5",
      ref: "Domain 5 — Access Control",
      classRefs: ["Operation"],
      titleEn: "Access Control",
      titleAr: "ضبط الوصول",
      descriptionEn:
        "Secure and protect logical and physical access to the entity's information, information processing facilities, and resources. Main controls: 5.1 Access Control Management Policy/Procedure; 5.2 Logical Access Control (users, system, application, network, OS, segregation, MFA, accountability); 5.3 Information and Documents Access Control; 5.4 Public and External Party Access Control; 5.5 Physical Access Control; 5.6 Access Control Audit and Review.",
      descriptionAr:
        "تأمين وحماية الوصول المنطقي والمادي لمعلومات الجهة ومرافق المعالجة والموارد. الضوابط الرئيسية: 5.1 سياسة/إجراء إدارة ضبط الوصول؛ 5.2 ضبط الوصول المنطقي (المستخدمون، النظام، التطبيق، الشبكة، نظام التشغيل، الفصل، MFA، المساءلة)؛ 5.3 ضبط الوصول للمعلومات والوثائق؛ 5.4 ضبط وصول الأطراف الخارجية؛ 5.5 ضبط الوصول المادي؛ 5.6 تدقيق ومراجعة ضبط الوصول.",
      secureScoreControls: [
        "MFARegistrationV2",
        "BlockLegacyAuthentication",
        "AdminMFAV2",
        "spo_legacy_auth",
      ],
      weight: 12,
    },

    // ============================================================
    // DOMAIN 6 — Pure Operation
    // ============================================================
    {
      id: "ISR-6",
      ref: "Domain 6 — Operations, Systems and Communication Management",
      classRefs: ["Operation"],
      titleEn: "Operations, Systems and Communication Management",
      titleAr: "إدارة العمليات والأنظمة والاتصالات",
      descriptionEn:
        "Mitigate risks associated with daily operations of information processing systems, applications, networks, and communication tools used internally and with external parties. Main controls: 6.1 Operations Management (capacity, ops procedures, change management, separation of dev/test/ops, segregation of duties, malicious-code protection, backup, logging and monitoring); 6.2 Communication Management (network controls, mobile devices, teleworking); 6.3 Cryptographic Controls; 6.4 Information Exchange.",
      descriptionAr:
        "تخفيف المخاطر المرتبطة بالعمليات اليومية لأنظمة معالجة المعلومات والتطبيقات والشبكات وأدوات الاتصال داخلياً ومع الأطراف الخارجية. الضوابط الرئيسية: 6.1 إدارة العمليات (السعة، الإجراءات، إدارة التغيير، فصل البيئات، فصل المهام، الحماية من البرمجيات الخبيثة، النسخ الاحتياطي، السجلات والمراقبة)؛ 6.2 إدارة الاتصالات؛ 6.3 ضوابط التشفير؛ 6.4 تبادل المعلومات.",
      secureScoreControls: [
        "IntuneCompliancePolicies",
        "mdo_safelinksforemail",
        "mdo_safeattachments",
        "mdo_atpprotection",
      ],
      weight: 11,
    },

    // ============================================================
    // DOMAIN 7 — Governance + Operation
    // ============================================================
    {
      id: "ISR-7",
      ref: "Domain 7 — Business Continuity Planning",
      classRefs: ["Governance", "Operation"],
      titleEn: "Business Continuity Planning",
      titleAr: "تخطيط استمرارية الأعمال",
      descriptionEn:
        "Ensure critical services and business processes within the entity are available; minimize business impact in the event of service disruption; ensure IT services and infrastructure can resist and recover from failures due to errors, planned attacks, or disasters. Main controls: 7.1 Business Impact Analysis; 7.2 Business Continuity Plan; 7.3 Business Continuity Plan Test and Review; 7.4 Backup and Storage Strategies; 7.5 Disaster Recovery.",
      descriptionAr:
        "ضمان توافر الخدمات والعمليات الحرجة في الجهة؛ تقليل الأثر التشغيلي عند انقطاع الخدمة؛ ضمان قدرة الخدمات والبنية التحتية على المقاومة والتعافي من الأخطاء أو الهجمات أو الكوارث. الضوابط الرئيسية: 7.1 تحليل أثر الأعمال؛ 7.2 خطة استمرارية الأعمال؛ 7.3 اختبار ومراجعة الخطة؛ 7.4 استراتيجيات النسخ الاحتياطي والتخزين؛ 7.5 التعافي من الكوارث.",
      secureScoreControls: [],
      weight: 6,
    },

    // ============================================================
    // DOMAIN 8 — Pure Operation
    // ============================================================
    {
      id: "ISR-8",
      ref: "Domain 8 — Information Systems Acquisition, Development and Management",
      classRefs: ["Operation"],
      titleEn: "Information Systems Acquisition, Development and Management",
      titleAr: "اقتناء وتطوير وإدارة أنظمة المعلومات",
      descriptionEn:
        "Protect information from unauthorized modification or misuse through integration of information security into the systems acquisition / development life cycle. Main controls: 8.1 Information Systems Acquisition, Development and Management Policy and Procedure (incl. SDLC); 8.2 Information Systems Security Requirements and Specifications; 8.3 Securing Information Systems Files, Source Codes, and Data; 8.4 Managing Changes in Software Development; 8.5 Secure and Correct Processing of Information Systems; 8.6 Security Testing; 8.7 Deployment of Information Systems / Applications; 8.8 Cryptography Controls.",
      descriptionAr:
        "حماية المعلومات من التعديل أو الاستخدام غير المصرّح به عبر دمج أمن المعلومات في دورة حياة اقتناء/تطوير الأنظمة. الضوابط الرئيسية: 8.1 السياسة والإجراء (يشمل SDLC)؛ 8.2 المتطلبات والمواصفات الأمنية؛ 8.3 تأمين الملفات وأكواد المصدر والبيانات؛ 8.4 إدارة التغييرات في التطوير؛ 8.5 المعالجة الآمنة والصحيحة؛ 8.6 الاختبار الأمني؛ 8.7 النشر؛ 8.8 ضوابط التشفير.",
      secureScoreControls: ["exo_oauth2clientprofileenabled"],
      weight: 6,
    },

    // ============================================================
    // DOMAIN 9 — Pure Operation
    // ============================================================
    {
      id: "ISR-9",
      ref: "Domain 9 — Environmental and Physical Security",
      classRefs: ["Operation"],
      titleEn: "Environmental and Physical Security",
      titleAr: "الأمن البيئي والمادي",
      descriptionEn:
        "Protect organisation premises, information processing facilities, and resources from physical or environmental damages. Main controls: 9.1 Environmental/Physical Threats Protection Policy and Procedure; 9.2 Protection from Environmental Threats (fire, flood, earthquake, humidity/temperature, water leakage); 9.3 Securing Equipment; 9.4 Secure Working Areas; 9.5 Periodic Testing.",
      descriptionAr:
        "حماية مقرات الجهة ومرافق معالجة المعلومات والموارد من الأضرار المادية أو البيئية. الضوابط الرئيسية: 9.1 سياسة وإجراء الحماية من التهديدات البيئية/المادية؛ 9.2 الحماية من التهديدات البيئية؛ 9.3 تأمين المعدّات؛ 9.4 مناطق العمل الآمنة؛ 9.5 الاختبار الدوري.",
      secureScoreControls: [],
      weight: 5,
    },

    // ============================================================
    // DOMAIN 10 — Governance + Operation
    // ============================================================
    {
      id: "ISR-10",
      ref: "Domain 10 — Roles and Responsibilities of Human Resources",
      classRefs: ["Governance", "Operation"],
      titleEn: "Roles and Responsibilities of Human Resources",
      titleAr: "أدوار ومسؤوليات الموارد البشرية",
      descriptionEn:
        "Ensure all employees, contractors, and outsourced employees are aware of their information security obligations and that their roles and responsibilities are defined to secure the entity's information and processing facilities. Main controls: 10.1 Prior to Employment Security Controls (screening, contract clauses, awareness in induction); 10.2 During Employment Security Controls (compliance enforcement, disciplinary action, ongoing awareness); 10.3 Termination/Change of Employment Security Controls (asset return, access revocation).",
      descriptionAr:
        "ضمان وعي جميع الموظفين والمتعاقدين والموظفين الخارجيين بالتزاماتهم تجاه أمن المعلومات وتحديد أدوارهم ومسؤولياتهم لحماية معلومات الجهة ومرافقها. الضوابط الرئيسية: 10.1 ضوابط ما قبل التوظيف؛ 10.2 ضوابط أثناء التوظيف؛ 10.3 ضوابط إنهاء/تغيير التوظيف.",
      secureScoreControls: [],
      weight: 5,
    },

    // ============================================================
    // DOMAIN 11 — Governance + Assurance
    // ============================================================
    {
      id: "ISR-11",
      ref: "Domain 11 — Compliance and Audit",
      classRefs: ["Governance", "Assurance"],
      titleEn: "Compliance and Audit",
      titleAr: "الامتثال والتدقيق",
      descriptionEn:
        "Define compliance and audit requirements to ensure effectiveness of implemented security controls and avoid violations of laws, policies, or controls. Main controls: 11.1 Compliance with Federal and Local Government Legal Requirements (UAE federal laws and Dubai resolutions enumerated in the regulation); 11.2 Compliance Controls (IPR policy, applicable laws); 11.3 Compliance with Information Security Policies and Standards; 11.4 Audit of Information Security Regulation Implementation; 11.5 Protection of Private Information of Individuals and Corporates.",
      descriptionAr:
        "تحديد متطلبات الامتثال والتدقيق لضمان فعّالية الضوابط الأمنية وتجنّب أي مخالفات للقوانين والسياسات. الضوابط الرئيسية: 11.1 الامتثال للقوانين الاتحادية والمحلية؛ 11.2 ضوابط الامتثال (سياسة الملكية الفكرية، القوانين المعمول بها)؛ 11.3 الامتثال لسياسات ومعايير أمن المعلومات؛ 11.4 تدقيق تنفيذ لائحة أمن المعلومات؛ 11.5 حماية المعلومات الخاصة للأفراد والمؤسسات.",
      secureScoreControls: ["AuditLogSearch"],
      weight: 8,
    },

    // ============================================================
    // DOMAIN 12 — Governance + Assurance
    // ============================================================
    {
      id: "ISR-12",
      ref: "Domain 12 — Information Security Assurance and Performance Assessment",
      classRefs: ["Governance", "Assurance"],
      titleEn: "Information Security Assurance and Performance Assessment",
      titleAr: "ضمان أمن المعلومات وتقييم الأداء",
      descriptionEn:
        "Develop, select, and implement information security measures that facilitate decision-making and improve performance — increasing accountability, improving effectiveness, demonstrating compliance, and providing quantifiable inputs for resource-allocation decisions. Main controls: 12.1 Information Security Key Performance Indicators (KPIs aligned to entity strategy, integrated into annual reporting, used to monitor ISR compliance, regularly reviewed, used for corrective action); 12.2 Information Security Assurance Activities (independent reviews, vulnerability assessments, penetration tests).",
      descriptionAr:
        "تطوير واختيار وتنفيذ مقاييس أمن المعلومات لتسهيل اتخاذ القرار وتحسين الأداء — زيادة المساءلة، تحسين الفعّالية، إثبات الامتثال، وتقديم مدخلات قابلة للقياس لتخصيص الموارد. الضوابط الرئيسية: 12.1 مؤشرات الأداء الرئيسية لأمن المعلومات؛ 12.2 أنشطة ضمان الأمن (المراجعات المستقلة، تقييمات الثغرات، اختبار الاختراق).",
      secureScoreControls: [
        "AuditLogSearch",
        "exo_mailboxaudit",
        "mip_search_auditlog",
      ],
      weight: 8,
    },

    // ============================================================
    // DOMAIN 13 — Operation + Assurance
    // ============================================================
    {
      id: "ISR-13",
      ref: "Domain 13 — Cloud Security",
      classRefs: ["Operation", "Assurance"],
      titleEn: "Cloud Security",
      titleAr: "أمن الحوسبة السحابية",
      descriptionEn:
        "Mitigate risks associated with cloud computing and use of cloud services. Main controls: 13.1 Cloud Security Policy / Procedure; 13.2 Cloud Security Principles (data location — UAE legal jurisdiction required for classified data including CSP backup/DR; data classification and handling; architecture and deployment model; CSP security assessment; isolation of resources; identity and access management; encryption; logging and monitoring; incident management; business continuity; compliance; exit strategy).",
      descriptionAr:
        "تخفيف المخاطر المرتبطة بالحوسبة السحابية واستخدام الخدمات السحابية. الضوابط الرئيسية: 13.1 سياسة/إجراء أمن الحوسبة السحابية؛ 13.2 مبادئ أمن السحابة (موقع البيانات — يشترط الاختصاص القانوني لدولة الإمارات للبيانات المُصنَّفة بما في ذلك النسخ الاحتياطي والتعافي من الكوارث؛ تصنيف البيانات والمعالجة؛ نموذج البنية والنشر؛ تقييم أمن مزوّد الخدمة؛ عزل الموارد؛ إدارة الهوية والوصول؛ التشفير؛ السجلات والمراقبة؛ إدارة الحوادث؛ استمرارية الأعمال؛ الامتثال؛ استراتيجية الخروج).",
      secureScoreControls: ["exo_storageproviderrestricted"],
      weight: 6,
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
            weight: typeof c.weight === "number" ? c.weight : 0,
          }))
        : DEFAULT_ISR_MAPPING.clauses,
    updatedAt: input.updatedAt,
  };
}
