import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * Council-editable settings for the Framework Compliance score.
 *
 * Sits alongside `maturity-config.ts` (which controls the Maturity
 * Index sub-score weights + target). This module governs the
 * separate, framework-driven primary metric introduced in v2.3.0.
 *
 * Stored in `app_config.key = 'compliance.config'`. Surface in
 * Settings → Compliance score so DESC can tune target + treatment
 * without code changes.
 */

export type ComplianceConfig = {
  /**
   * Pass-mark target, 0–100. Entities below this in the active
   * framework's compliance % are flagged in the Council KPI panel
   * and the entity grid. Defaults to 70 — same level the maturity
   * index uses by default. DESC can raise this to 80+ for stricter
   * evaluation.
   */
  target: number;
  /**
   * How to handle clauses with no observable evidence on a given
   * tenant.
   *
   *   "skip"  — exclude the clause from numerator AND denominator,
   *             so weights stay meaningful only for clauses that
   *             actually scored. Default. Best for partial-data
   *             tenants (entity with no on-prem AD shouldn't be
   *             penalised on MDI clauses).
   *
   *   "zero"  — count unscored clauses as 0%. Stricter — implies
   *             "if you can't prove you have it, you don't have it."
   *             Some regulators prefer this stance.
   */
  unscoredTreatment: "skip" | "zero";
  updatedAt?: string;
};

const KEY = "compliance.config";

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  target: 70,
  unscoredTreatment: "skip",
};

export function getComplianceConfig(): ComplianceConfig {
  const stored = readConfig<Partial<ComplianceConfig>>(KEY);
  if (!stored) return DEFAULT_COMPLIANCE_CONFIG;
  return {
    target:
      typeof stored.target === "number"
        ? Math.max(0, Math.min(100, stored.target))
        : DEFAULT_COMPLIANCE_CONFIG.target,
    unscoredTreatment:
      stored.unscoredTreatment === "zero" ? "zero" : "skip",
    updatedAt: stored.updatedAt,
  };
}

export function setComplianceConfig(
  patch: Partial<ComplianceConfig>,
): ComplianceConfig {
  const existing = getComplianceConfig();
  const next: ComplianceConfig = {
    target:
      typeof patch.target === "number"
        ? Math.max(0, Math.min(100, patch.target))
        : existing.target,
    unscoredTreatment:
      patch.unscoredTreatment === "skip" || patch.unscoredTreatment === "zero"
        ? patch.unscoredTreatment
        : existing.unscoredTreatment,
    updatedAt: new Date().toISOString(),
  };
  writeConfig(KEY, next);
  return next;
}

export function resetComplianceConfig(): ComplianceConfig {
  writeConfig(KEY, {
    ...DEFAULT_COMPLIANCE_CONFIG,
    updatedAt: new Date().toISOString(),
  });
  return getComplianceConfig();
}
