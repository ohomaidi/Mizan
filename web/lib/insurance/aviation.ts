import "server-only";

/**
 * Aviation cyber-insurance readiness questionnaire — synthesized from
 * publicly published carrier forms (Beazley aviation, Coalition,
 * AIG aerospace) cross-referenced against IATA Cybersecurity Toolkit,
 * ICAO Doc 8973, and FAA AC 119-1A.
 *
 * Each question maps (where possible) to a Mizan signal so the
 * answer auto-populates from current posture data with a `signalSnapshot`
 * captured at answer time. Questions without a Graph-side signal stay
 * manual checkbox + free-text justification; v2.7 adds optional file-
 * upload evidence.
 *
 * Categories are board-readable groupings; insurers usually scan by
 * category before drilling into individual yes/no answers.
 *
 * v2.6.0 — first industry template. Engine takes JSON like this for
 * future industries (finance / healthcare / generic), so v2.7 just
 * drops new files into this directory.
 */

export type InsuranceQuestion = {
  id: string;
  category:
    | "Identity & access"
    | "Endpoint & device"
    | "Data protection"
    | "Email & web"
    | "Operational technology"
    | "Detection & response"
    | "Continuity"
    | "Governance & training"
    | "Aviation-specific";
  question: string;
  /**
   * If set, Mizan can auto-populate the answer from this signal kind.
   * The auto-evaluator (lib/insurance/auto-eval.ts) reads the latest
   * snapshot and decides yes/no based on the kind-specific predicate.
   */
  autoFromSignal?:
    | "mfaAdmins"
    | "mdeOnboarded"
    | "intuneCompliance"
    | "labelsActive"
    | "incidentResponseDataAvailable"
    | "vulnerabilityScanning"
    | "phishingTraining";
  /**
   * Manual text required when the operator answers (yes/no/na). Stored
   * alongside the answer so the broker / underwriter has context.
   */
  requiresEvidence?: boolean;
  /** Optional inline help text shown beneath the question. */
  hint?: string;
};

export const AVIATION_QUESTIONNAIRE: {
  id: "aviation";
  version: string;
  source: string;
  questions: InsuranceQuestion[];
} = {
  id: "aviation",
  version: "1.0",
  source:
    "Synthesized from Beazley aviation, Coalition, AIG aerospace public forms · IATA Cybersecurity Toolkit · ICAO Doc 8973 · FAA AC 119-1A",
  questions: [
    // ── Identity & access ──
    {
      id: "ia-mfa-admins",
      category: "Identity & access",
      question:
        "Is multi-factor authentication enforced on ALL administrative accounts (Global Admin, Privileged Role Admin, Security Admin)?",
      autoFromSignal: "mfaAdmins",
      hint: "Auto-checked from Mizan's Identity sub-score. Coverage < 100% means at least one admin can sign in with password only.",
    },
    {
      id: "ia-mfa-all",
      category: "Identity & access",
      question:
        "Is MFA required for all users (not just admins)?",
      requiresEvidence: true,
    },
    {
      id: "ia-pim",
      category: "Identity & access",
      question:
        "Are privileged roles managed through Privileged Identity Management (PIM) with just-in-time activation?",
      requiresEvidence: true,
    },
    {
      id: "ia-byod",
      category: "Identity & access",
      question:
        "Is BYOD (employee-owned device) access to corporate resources gated by Conditional Access + compliance policies?",
      requiresEvidence: true,
    },

    // ── Endpoint & device ──
    {
      id: "ed-edr",
      category: "Endpoint & device",
      question:
        "Is an EDR (Endpoint Detection & Response) solution deployed on 100% of corporate endpoints?",
      autoFromSignal: "mdeOnboarded",
      hint: "Auto-checked from Mizan's Workload Coverage card → MDE tile. Looks at onboarded vs total devices.",
    },
    {
      id: "ed-compliance",
      category: "Endpoint & device",
      question:
        "Are device-compliance policies (encryption, OS patching, password requirements) enforced through MDM?",
      autoFromSignal: "intuneCompliance",
      hint: "Auto-checked — Mizan reads Intune compliance counters.",
    },
    {
      id: "ed-encryption",
      category: "Endpoint & device",
      question:
        "Is full-disk encryption (BitLocker / FileVault / equivalent) enforced on all corporate laptops?",
      requiresEvidence: true,
    },
    {
      id: "ed-byod-isolation",
      category: "Endpoint & device",
      question:
        "Are BYOD devices isolated from corporate data via Mobile Application Management (MAM)?",
      requiresEvidence: true,
    },

    // ── Data protection ──
    {
      id: "dp-classification",
      category: "Data protection",
      question:
        "Is corporate data classified using sensitivity labels (Confidential / Restricted / Public)?",
      autoFromSignal: "labelsActive",
      hint: "Auto-checked — Mizan reads Microsoft Purview sensitivity-label catalog.",
    },
    {
      id: "dp-dlp",
      category: "Data protection",
      question:
        "Is DLP (Data Loss Prevention) enforced for sensitive data leaving the organization via email or cloud?",
      requiresEvidence: true,
    },
    {
      id: "dp-passenger-data",
      category: "Aviation-specific",
      question:
        "Is passenger data (PNR records, manifest data, payment information) stored in encrypted form at rest and in transit?",
      requiresEvidence: true,
      hint: "ICAO Annex 9, IATA Resolution 753 — passenger data has stricter handling requirements than general PII.",
    },
    {
      id: "dp-backup",
      category: "Data protection",
      question:
        "Are critical systems backed up at least daily, with at least one offline / immutable copy stored separately from production?",
      requiresEvidence: true,
    },
    {
      id: "dp-backup-tested",
      category: "Data protection",
      question:
        "Have you successfully restored from backup in the last 12 months (tested, not just configured)?",
      requiresEvidence: true,
    },

    // ── Email & web ──
    {
      id: "ew-phishing-protection",
      category: "Email & web",
      question:
        "Is anti-phishing protection deployed (Defender for Office 365 / Mimecast / Proofpoint / equivalent)?",
      requiresEvidence: true,
    },
    {
      id: "ew-dmarc",
      category: "Email & web",
      question:
        "Is DMARC enforcement set to 'reject' on your primary email domain?",
      requiresEvidence: true,
      hint: "DMARC reject (p=reject) blocks spoofed mail; quarantine (p=quarantine) only flags it. Insurers usually require reject for full credit.",
    },
    {
      id: "ew-domain-spoofing",
      category: "Email & web",
      question:
        "Have you registered known typo-squatted variants of your domain (e.g. dubaiairports[.]com vs dubaiairports[.]ae)?",
      requiresEvidence: true,
    },

    // ── Operational technology (aviation-specific) ──
    {
      id: "ot-segmentation",
      category: "Operational technology",
      question:
        "Are operational-technology (OT) systems — baggage handling, jet bridges, BMS, runway lighting, security x-ray — network-segmented from the corporate IT estate?",
      requiresEvidence: true,
      hint: "ICAO Doc 8973 §6.4: OT segmentation is a baseline expectation for cat. I-IV airports.",
    },
    {
      id: "ot-vendor-access",
      category: "Operational technology",
      question:
        "Is third-party vendor access to OT systems gated by jump-host + MFA + session recording?",
      requiresEvidence: true,
    },
    {
      id: "ot-patching",
      category: "Operational technology",
      question:
        "Do OT vendors meet a documented patching SLA (e.g. critical patches within 30 days of vendor release)?",
      requiresEvidence: true,
    },

    // ── Detection & response ──
    {
      id: "dr-soc-coverage",
      category: "Detection & response",
      question:
        "Is your SOC (in-house or MSSP) covering critical alerts 24/7?",
      requiresEvidence: true,
    },
    {
      id: "dr-incident-runbook",
      category: "Detection & response",
      question:
        "Do you have a documented incident-response runbook reviewed within the last 12 months?",
      requiresEvidence: true,
    },
    {
      id: "dr-tabletop",
      category: "Detection & response",
      question:
        "Have you executed a tabletop exercise simulating a major cyber incident in the last 12 months?",
      requiresEvidence: true,
    },
    {
      id: "dr-vulnerability-scanning",
      category: "Detection & response",
      question:
        "Are critical systems scanned for vulnerabilities at least weekly?",
      autoFromSignal: "vulnerabilityScanning",
      hint: "Auto-checked from Defender Vulnerability Management coverage.",
    },

    // ── Continuity ──
    {
      id: "co-bcp",
      category: "Continuity",
      question:
        "Do you have a documented Business Continuity Plan reviewed within the last 12 months?",
      requiresEvidence: true,
    },
    {
      id: "co-rto",
      category: "Continuity",
      question:
        "Have you established formal Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for critical systems?",
      requiresEvidence: true,
    },
    {
      id: "co-flight-ops-failover",
      category: "Aviation-specific",
      question:
        "Do flight-ops systems (DCS, baggage, AODB) have documented failover procedures with tested SLAs?",
      requiresEvidence: true,
      hint: "IATA SGHA Annex A standard — most airports' SLAs commit to < 30 min DCS failover.",
    },

    // ── Governance & training ──
    {
      id: "gt-ciso",
      category: "Governance & training",
      question:
        "Is there a designated CISO (or equivalent senior security executive) reporting to the board at least quarterly?",
      requiresEvidence: true,
    },
    {
      id: "gt-phishing-training",
      category: "Governance & training",
      question:
        "Are all employees enrolled in phishing-simulation training, with measured results?",
      autoFromSignal: "phishingTraining",
      hint: "Auto-checked from Microsoft Defender Attack Simulation Training data.",
    },
    {
      id: "gt-board-cybersecurity",
      category: "Governance & training",
      question:
        "Does the board have at least one director with documented cybersecurity expertise (or an external advisor)?",
      requiresEvidence: true,
    },

    // ── Aviation-specific ──
    {
      id: "av-iso-27001",
      category: "Aviation-specific",
      question:
        "Are your information-security practices certified to ISO 27001 (or NIST CSF aligned)?",
      requiresEvidence: true,
    },
    {
      id: "av-iata-compliance",
      category: "Aviation-specific",
      question:
        "Are you a member of IATA's Cybersecurity Information Sharing platform?",
      requiresEvidence: true,
    },
  ],
};
