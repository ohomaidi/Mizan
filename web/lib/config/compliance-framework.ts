import "server-only";
import { getBranding, type FrameworkId } from "./branding";
import {
  getNesaMapping,
  setNesaMapping,
  resetNesaMapping,
  DEFAULT_NESA_MAPPING,
} from "./nesa-mapping";
import {
  getIsrMapping,
  setIsrMapping,
  resetIsrMapping,
  DEFAULT_ISR_MAPPING,
} from "./isr-mapping";
import { getOosSets, type OosSets } from "@/lib/db/compliance-oos";

/**
 * Unified compliance-framework registry.
 *
 * The dashboard supports multiple regulatory catalogs (NESA, Dubai ISR,
 * KSA NCA, generic ISR/ISO 27001) selected per-deployment via
 * `branding.frameworkId`. Each framework's catalog is independently
 * editable and stored under its own `app_config` key, so an operator
 * who switches framework keeps their previous customizations on the
 * other one ready to flip back to.
 *
 * Adding a new framework = (a) define a `<framework>-mapping.ts`
 * module exporting get/set/reset + a default catalog of the same
 * `FrameworkMapping` shape, (b) register it in FRAMEWORK_REGISTRY
 * below, (c) add the option to the BrandingPanel selector + the
 * setup wizard. No other call site changes — the governance page,
 * settings panel, and PDF docs all read through this registry.
 */

/** Common shape every framework's catalog conforms to. */
export type ComplianceClass = "Governance" | "Operation" | "Assurance";

/**
 * Operator-managed evidence anchor for a clause that Microsoft cannot
 * see. ISR has three domains where Microsoft has no native visibility:
 * Domain 7 (BCP), Domain 9 (Physical & Environmental), Domain 10 (HR).
 * For those — and for any future ISR sub-control whose evidence lives
 * outside the Microsoft 365 estate — the operator records evidence
 * with a manually-set pass rate that the Council reviews periodically.
 *
 * Carried alongside `secureScoreControls` (the Microsoft-managed
 * anchors), they're combined in the clause's coverage calculation as
 * an unweighted average of pass rates. The `reviewedAt` timestamp
 * powers a stale-review badge — if older than 90 days, the UI hints
 * that the Council should re-verify.
 */
export type CustomEvidence = {
  /** Operator-assigned id, kept stable across edits (e.g. "phys-audit-2026q1"). */
  id: string;
  /** Human-readable name (e.g. "Annual physical access audit — Q1 2026"). */
  label: string;
  /** Operator's review verdict — 0 (none) to 100 (fully implemented). */
  manualPassRate: number;
  /** ISO date of the operator's last review. Drives the stale badge. */
  reviewedAt: string;
  /** Optional free-text justification (max ~500 chars). */
  reviewerNote?: string;
};

export type ComplianceClause = {
  id: string;
  ref: string;
  /**
   * For ISR-style frameworks that group domains into classes
   * ("Governance" / "Operation" / "Assurance"). Optional — NESA-style
   * flat catalogs leave this empty.
   *
   * Per ISR v2.0 Table 1 a single domain can belong to MULTIPLE classes
   * simultaneously (e.g. Domain 11 — Compliance and Audit — is both
   * Governance and Assurance). The UI renders one chip per class so
   * the multi-class nature is visible without flattening.
   */
  classRefs?: ComplianceClass[];
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  /** Microsoft 365 Secure Score control names that evidence this clause. */
  secureScoreControls: string[];
  /**
   * Operator-managed evidence the Council reviews periodically — used
   * for ISR domains Microsoft can't see (BCP, Physical, HR) and for
   * any future ISR sub-control whose evidence lives outside the
   * Microsoft estate. Optional; absent on most NESA clauses.
   */
  customEvidence?: CustomEvidence[];
  /** 0..100, normalized to sum to 100 across the catalog on save. */
  weight: number;
};

export type ComplianceMapping = {
  /** Which framework this catalog belongs to. */
  framework: FrameworkId;
  /** Human-readable version label (e.g. "Dubai ISR v3.1 (draft)"). */
  frameworkVersion: string;
  /**
   * "official" = catalog stamped against the published authoritative
   * catalog. "draft" = catalog is a working approximation pending
   * verification against the official document. UI shows a banner
   * when status="draft".
   */
  status: "official" | "draft";
  /** Optional explanatory note rendered with the status banner. */
  draftNote?: string;
  clauses: ComplianceClause[];
  updatedAt?: string;
};

type FrameworkRegistryEntry = {
  /** The frameworkId values that route to this catalog. Each must be unique. */
  ids: FrameworkId[];
  /** Lazy fetch of the active catalog (or default if unset). */
  get: () => ComplianceMapping;
  /** Persist a customized catalog. */
  set: (m: ComplianceMapping) => ComplianceMapping;
  /** Reset to the default catalog. */
  reset: () => ComplianceMapping;
  /** Hard-coded default — used as starting point + fallback in tests. */
  default: ComplianceMapping;
};

/**
 * Registry of every framework catalog the dashboard ships with. New
 * frameworks (KSA NCA, ISO 27001 generic, NIST CSF) get added here.
 */
const FRAMEWORK_REGISTRY: FrameworkRegistryEntry[] = [
  {
    ids: ["nesa"],
    get: getNesaMapping,
    set: setNesaMapping,
    reset: resetNesaMapping,
    default: DEFAULT_NESA_MAPPING,
  },
  {
    ids: ["dubai-isr"],
    get: getIsrMapping,
    set: setIsrMapping,
    reset: resetIsrMapping,
    default: DEFAULT_ISR_MAPPING,
  },
  // "isr" (ISO 27001 generic) and "nca" (KSA NCA) and "generic" fall back
  // to the NESA catalog for now — they're framework labels without a
  // dedicated clause catalog yet. Switching one of these in becomes
  // additive: drop a new <id>-mapping.ts module + register it here.
];

/**
 * Resolve which framework catalog is active for the current install,
 * based on `branding.frameworkId`. Falls back to NESA if the configured
 * frameworkId has no dedicated catalog (graceful degradation rather
 * than throw — the operator may have selected "generic" knowing the
 * catalog isn't ready yet).
 */
export function getActiveFramework(): {
  frameworkId: FrameworkId;
  entry: FrameworkRegistryEntry;
} {
  const frameworkId = getBranding().frameworkId;
  const entry =
    FRAMEWORK_REGISTRY.find((e) => e.ids.includes(frameworkId)) ??
    // Fall-through: NESA is the historical default, kept for any unmapped id.
    FRAMEWORK_REGISTRY.find((e) => e.ids.includes("nesa"))!;
  return { frameworkId, entry };
}

/** Convenience: return just the active mapping (most callers only need this). */
export function getActiveComplianceMapping(): ComplianceMapping {
  return getActiveFramework().entry.get();
}

/** Save a catalog edit, scoped to the currently-active framework. */
export function setActiveComplianceMapping(
  mapping: ComplianceMapping,
): ComplianceMapping {
  return getActiveFramework().entry.set(mapping);
}

/** Reset the currently-active framework's catalog to its shipped default. */
export function resetActiveComplianceMapping(): ComplianceMapping {
  return getActiveFramework().entry.reset();
}

/** Catalog defaults for the currently-active framework. */
export function getActiveComplianceDefaults(): ComplianceMapping {
  return getActiveFramework().entry.default;
}

/**
 * Per-clause coverage for one tenant — averages Microsoft Secure Score
 * pass-rates of mapped controls + custom-evidence manual ratings into
 * a single 0..1 number per clause. Used by the framework-driven
 * compliance sub-score in `lib/compute/maturity.ts`.
 *
 * Each evidence anchor (Microsoft control or custom anchor) contributes
 * one equal-weight sample to the average. Microsoft controls without a
 * maxScore (informational) are skipped; custom anchors always count.
 * If a clause has no observable evidence on this tenant the function
 * returns null, signalling "data gap" — the caller decides whether to
 * treat that as a clause skip or a 0%.
 *
 * `oos` (optional) carries control-level OOS marks the operator has set
 * — those control IDs are filtered out before the average is taken,
 * preserving the clause if other anchors still report. Clause-level OOS
 * is enforced higher up in {@link computeTenantFrameworkScore} since it
 * needs to remove the whole clause from the rollup, not just dampen it.
 */
export function computeClauseCoverageForTenant(
  clause: ComplianceClause,
  ssControls: Map<string, { score: number | null; maxScore: number | null }>,
  oos?: { controls: Set<string> },
): { coverage: number | null; samples: number } {
  let weighted = 0;
  let samples = 0;

  for (const id of clause.secureScoreControls) {
    if (oos?.controls.has(id)) continue;
    const c = ssControls.get(id);
    if (!c) continue;
    if (c.score === null || c.maxScore === null || c.maxScore === 0) continue;
    weighted += c.score / c.maxScore;
    samples += 1;
  }

  for (const ev of clause.customEvidence ?? []) {
    weighted += Math.max(0, Math.min(100, ev.manualPassRate ?? 0)) / 100;
    samples += 1;
  }

  if (samples === 0) return { coverage: null, samples: 0 };
  return { coverage: weighted / samples, samples };
}

/**
 * Build a single Set of effective OOS control ids from the global +
 * per-tenant tiers. Helper so call sites that want to apply OOS once
 * (e.g. a single-tenant rollup) don't need to merge the sets twice.
 */
function effectiveOosControls(sets: OosSets | null | undefined): Set<string> {
  if (!sets) return new Set();
  return new Set([...sets.globalControls, ...sets.tenantControls]);
}

function isClauseOos(
  clauseId: string,
  sets: OosSets | null | undefined,
): boolean {
  if (!sets) return false;
  return sets.globalClauses.has(clauseId) || sets.tenantClauses.has(clauseId);
}

/**
 * Tenant-level compliance score against the active framework.
 *
 * Sums (clause coverage × clause weight) across every clause that has
 * evidence on the tenant. Two behaviours for clauses with no evidence:
 *
 *   - **skip** (default): excludes from BOTH numerator and denominator.
 *     An entity that genuinely doesn't have on-prem AD shouldn't be
 *     penalised on MDI-related clauses where Microsoft has nothing
 *     to report. Denominator is the sum of weights of clauses that
 *     DID contribute. Returns null when nothing scored.
 *
 *   - **zero**: counts unscored clauses as 0%. Stricter — "if you
 *     can't prove you have it, you don't have it." Denominator
 *     becomes the sum of all clause weights. Never returns null.
 *
 * Mode is read from `compliance.config.unscoredTreatment` (Council-
 * editable via Settings → Compliance score). Default: "skip".
 */
export function computeTenantFrameworkScore(
  ssControls: Map<string, { score: number | null; maxScore: number | null }>,
  unscoredTreatment: "skip" | "zero" = "skip",
  oos?: OosSets | null,
): {
  percent: number | null;
  clausesScored: number;
  clausesTotal: number;
  clausesOos: number;
} {
  const mapping = getActiveComplianceMapping();
  const oosControls = effectiveOosControls(oos);
  let weightedSum = 0;
  let weightTotal = 0;
  let clausesScored = 0;
  let clausesOos = 0;

  for (const clause of mapping.clauses) {
    // Clause-level OOS removes the clause from BOTH numerator and
    // denominator entirely — the whole point of OOS is "doesn't count
    // against this entity's score." This applies regardless of
    // unscoredTreatment.
    if (isClauseOos(clause.id, oos)) {
      clausesOos += 1;
      continue;
    }
    const r = computeClauseCoverageForTenant(clause, ssControls, {
      controls: oosControls,
    });
    const w = Math.max(0, clause.weight || 0);
    if (r.coverage === null) {
      if (unscoredTreatment === "zero") {
        // Count as 0% — adds nothing to numerator, but full weight to denominator.
        weightTotal += w;
      }
      // Otherwise skip: contributes to neither side.
      continue;
    }
    weightedSum += r.coverage * w;
    weightTotal += w;
    clausesScored += 1;
  }

  if (weightTotal === 0) {
    return {
      percent: null,
      clausesScored: 0,
      clausesTotal: mapping.clauses.length,
      clausesOos,
    };
  }
  return {
    percent: (weightedSum / weightTotal) * 100,
    clausesScored,
    clausesTotal: mapping.clauses.length,
    clausesOos,
  };
}

/**
 * Convenience wrapper: load OOS sets for the active framework + tenant
 * and call {@link computeTenantFrameworkScore}. Pass `tenantId = null`
 * for an "all-global-OOS-only" view (e.g. when previewing what global
 * marks do without picking a specific entity).
 */
export function computeTenantFrameworkScoreWithOos(
  ssControls: Map<string, { score: number | null; maxScore: number | null }>,
  unscoredTreatment: "skip" | "zero",
  tenantId: string | null,
): {
  percent: number | null;
  clausesScored: number;
  clausesTotal: number;
  clausesOos: number;
} {
  const { frameworkId } = getActiveFramework();
  const sets = getOosSets(frameworkId, tenantId);
  return computeTenantFrameworkScore(ssControls, unscoredTreatment, sets);
}

/**
 * Per-clause breakdown for one tenant — used by the entity-detail
 * "ISR Compliance breakdown" panel so operators can drill into which
 * specific domains are failing. Returns an array aligned 1:1 with the
 * active framework's clauses.
 */
export type ClauseBreakdownRow = {
  clauseId: string;
  ref: string;
  classRefs?: ComplianceClass[];
  titleEn: string;
  titleAr: string;
  weight: number;
  /** 0..1 coverage; null when no evidence sample. */
  coverage: number | null;
  /** Number of evidence samples that contributed (Microsoft + custom). */
  samples: number;
  /** Microsoft Secure Score control IDs that the clause maps to (for drill-down). */
  secureScoreControls: string[];
  /** Number of operator-managed custom evidence anchors on the clause. */
  customEvidenceCount: number;
  /**
   * Out-of-Scope state. "in-scope" = clause counts toward the score.
   * "global-oos" = clause is OOS at the deployment level (every entity
   * skips it). "tenant-oos" = clause is OOS for THIS entity only.
   * The breakdown UI surfaces an OOS chip + dims the row when set.
   */
  oosState: "in-scope" | "global-oos" | "tenant-oos";
};

export function computeTenantClauseBreakdown(
  ssControls: Map<string, { score: number | null; maxScore: number | null }>,
  oos?: OosSets | null,
): ClauseBreakdownRow[] {
  const mapping = getActiveComplianceMapping();
  const oosControls = effectiveOosControls(oos);
  return mapping.clauses.map((clause) => {
    const oosState: "in-scope" | "global-oos" | "tenant-oos" = oos
      ? oos.globalClauses.has(clause.id)
        ? "global-oos"
        : oos.tenantClauses.has(clause.id)
          ? "tenant-oos"
          : "in-scope"
      : "in-scope";
    const r = computeClauseCoverageForTenant(clause, ssControls, {
      controls: oosControls,
    });
    return {
      clauseId: clause.id,
      ref: clause.ref,
      classRefs: clause.classRefs,
      titleEn: clause.titleEn,
      titleAr: clause.titleAr,
      weight: clause.weight,
      coverage: r.coverage,
      samples: r.samples,
      secureScoreControls: clause.secureScoreControls,
      customEvidenceCount: clause.customEvidence?.length ?? 0,
      oosState,
    };
  });
}

/** Convenience wrapper that resolves OOS sets for the active framework + tenant. */
export function computeTenantClauseBreakdownWithOos(
  ssControls: Map<string, { score: number | null; maxScore: number | null }>,
  tenantId: string | null,
): ClauseBreakdownRow[] {
  const { frameworkId } = getActiveFramework();
  const sets = getOosSets(frameworkId, tenantId);
  return computeTenantClauseBreakdown(ssControls, sets);
}
