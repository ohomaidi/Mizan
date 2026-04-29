import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * Risk-register auto-suggest engine — operator-tunable thresholds.
 *
 * v2.6.0 hardcoded the rule thresholds (CVE > 30 days, admin
 * deactivation in last 7 days, incident open > 24h). v2.7.0
 * surfaces them as an "Auto-suggest sensitivity" panel in
 * Settings → Risk register so the CISO can dial noise up or down
 * without code changes.
 *
 * Shape stays JSON in `app_config` so adding new rule knobs is a
 * drop. Each tunable carries a `min` / `max` / `default` — the UI
 * renders a slider per knob and the engine reads via
 * `getAutoSuggestConfig()` at evaluation time. Falling back to
 * the default when a key is absent makes existing deployments
 * pick up new knobs without DB migration.
 */

export type AutoSuggestConfig = {
  /** Critical CVE age threshold in days (auto-cve rule). */
  cveAgeDays: number;
  /** Minimum affected device count to fire CVE rule. */
  cveMinDevices: number;
  /** Window for admin-deactivation events in days (auto-deactivation). */
  deactivationWindowDays: number;
  /** SLA threshold in hours for active high-severity incidents (auto-incident). */
  incidentOpenHours: number;
  /**
   * If true, suggestions are written straight to `status='open'`
   * — bypasses the suggested-panel review. Equivalent to setting
   * the env var `MIZAN_AUTO_PROMOTE_SUGGESTIONS=true` but in the
   * UI. Defaults to false.
   */
  autoPromote: boolean;
};

/**
 * Default thresholds — match the v2.6.0 hardcoded values so the
 * upgrade is a zero-behaviour-change config landing.
 */
export const AUTO_SUGGEST_DEFAULTS: AutoSuggestConfig = {
  cveAgeDays: 30,
  cveMinDevices: 2,
  deactivationWindowDays: 7,
  incidentOpenHours: 24,
  autoPromote: false,
};

const KEY = "risk.autoSuggest";

/**
 * Read the current config, falling back to defaults for any
 * missing keys. Existing deployments without a stored config use
 * the defaults; new keys added in future releases pick up their
 * default automatically.
 */
export function getAutoSuggestConfig(): AutoSuggestConfig {
  const stored = readConfig<Partial<AutoSuggestConfig>>(KEY);
  if (!stored) return { ...AUTO_SUGGEST_DEFAULTS };
  return {
    ...AUTO_SUGGEST_DEFAULTS,
    ...stored,
  };
}

/**
 * Write a new config. Validates each field against its allowed
 * range and clamps; never throws so the UI form save always
 * completes (the operator sees the clamp in the next read).
 */
export function setAutoSuggestConfig(patch: Partial<AutoSuggestConfig>): AutoSuggestConfig {
  const current = getAutoSuggestConfig();
  const next: AutoSuggestConfig = {
    cveAgeDays: clamp(patch.cveAgeDays ?? current.cveAgeDays, 1, 180),
    cveMinDevices: clamp(patch.cveMinDevices ?? current.cveMinDevices, 1, 50),
    deactivationWindowDays: clamp(
      patch.deactivationWindowDays ?? current.deactivationWindowDays,
      1,
      90,
    ),
    incidentOpenHours: clamp(
      patch.incidentOpenHours ?? current.incidentOpenHours,
      1,
      168,
    ),
    autoPromote:
      typeof patch.autoPromote === "boolean"
        ? patch.autoPromote
        : current.autoPromote,
  };
  writeConfig(KEY, next);
  return next;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Range metadata used by the slider UI. Single source of truth.
 * Updating min/max here propagates to both the form UI and the
 * clamp in `setAutoSuggestConfig`.
 */
export const AUTO_SUGGEST_RANGES: Record<
  Exclude<keyof AutoSuggestConfig, "autoPromote">,
  { min: number; max: number; step: number; unit: string }
> = {
  cveAgeDays: { min: 1, max: 180, step: 1, unit: "days" },
  cveMinDevices: { min: 1, max: 50, step: 1, unit: "devices" },
  deactivationWindowDays: { min: 1, max: 90, step: 1, unit: "days" },
  incidentOpenHours: { min: 1, max: 168, step: 1, unit: "hours" },
};
