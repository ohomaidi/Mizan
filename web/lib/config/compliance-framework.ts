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
