import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type { SignalType } from "@/lib/db/signals";

/**
 * Custom CISO scorecard KPI formulas.
 *
 * v2.6.0 shipped a hardcoded 10-KPI catalog. v2.7.0 lets the
 * operator define their own beyond the catalog using one of two
 * formula shapes:
 *
 *   - `signalNumber` — pluck a numeric field from a signal payload.
 *     E.g. "active incidents" = signal: incidents, field: active.
 *
 *   - `ratio` — divide one signalNumber by another, optionally
 *     multiplied by 100 to express as a percentage.
 *     E.g. "MFA-on-admin coverage" = (mfa-on-admins / total-admins) * 100.
 *
 * Aggregation across tenants:
 *   - signalNumber sums (Council) or returns the single tenant's
 *     value (Executive).
 *   - ratio computes per-tenant then averages — handles
 *     denominator-zero cleanly.
 *
 * Stored as JSON in `custom_kpi_formulas.formula_json`. Validated
 * via `parseFormula()` before persist and at every eval. Tolerates
 * malformed payloads (returns null) so a bad formula doesn't break
 * the scorecard page.
 */

export type CustomFormula =
  | {
      kind: "signalNumber";
      signal: SignalType;
      /** Dot-path into the payload, e.g. "active" or "bySeverity.high". */
      field: string;
    }
  | {
      kind: "ratio";
      numerator: {
        signal: SignalType;
        field: string;
      };
      denominator: {
        signal: SignalType;
        field: string;
      };
      /** When true, the result is multiplied by 100 (output as percent). */
      asPercent?: boolean;
    };

const ALLOWED_SIGNALS: SignalType[] = [
  "secureScore",
  "conditionalAccess",
  "riskyUsers",
  "devices",
  "incidents",
  "dlpAlerts",
  "irmAlerts",
  "commCompAlerts",
  "subjectRightsRequests",
  "retentionLabels",
  "sensitivityLabels",
  "sharepointSettings",
  "pimSprawl",
  "dfiSensorHealth",
  "attackSimulations",
  "threatIntelligence",
  "advancedHunting",
  "labelAdoption",
  "vulnerabilities",
  "workloadCoverage",
];

function isSignalType(v: unknown): v is SignalType {
  return typeof v === "string" && (ALLOWED_SIGNALS as string[]).includes(v);
}

/**
 * Validate + parse a JSON formula. Returns the typed CustomFormula
 * or null if any field is invalid. Path strings are limited to
 * `[a-zA-Z0-9_.]` to keep the eval predictable.
 */
export function parseFormula(raw: unknown): CustomFormula | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "signalNumber") {
    if (!isSignalType(obj.signal)) return null;
    if (typeof obj.field !== "string" || !isSafePath(obj.field)) return null;
    return { kind: "signalNumber", signal: obj.signal, field: obj.field };
  }
  if (obj.kind === "ratio") {
    const num = obj.numerator as
      | { signal?: unknown; field?: unknown }
      | undefined;
    const den = obj.denominator as
      | { signal?: unknown; field?: unknown }
      | undefined;
    if (!num || !den) return null;
    if (!isSignalType(num.signal) || !isSignalType(den.signal)) return null;
    if (typeof num.field !== "string" || !isSafePath(num.field)) return null;
    if (typeof den.field !== "string" || !isSafePath(den.field)) return null;
    return {
      kind: "ratio",
      numerator: { signal: num.signal, field: num.field },
      denominator: { signal: den.signal, field: den.field },
      asPercent: !!obj.asPercent,
    };
  }
  return null;
}

function isSafePath(p: string): boolean {
  return /^[A-Za-z0-9_.]{1,80}$/.test(p);
}

/** Drill a dot-path into an arbitrary payload, returning a number or null. */
function pluckNumber(payload: unknown, path: string): number | null {
  if (!payload || typeof payload !== "object") return null;
  const segments = path.split(".");
  let cur: unknown = payload;
  for (const s of segments) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[s];
  }
  if (typeof cur === "number" && Number.isFinite(cur)) return cur;
  return null;
}

/**
 * Evaluate a parsed formula across all consented tenants. Returns
 * { current, hasData } — `hasData` is false when nothing
 * contributed (no tenant had the signal, or every payload missed
 * the field). UI should render "—" instead of 0 in that case.
 */
export function evaluateCustomFormula(formula: CustomFormula): {
  current: number | null;
} {
  const tenants = listTenants().filter(
    (t) => t.consent_status === "consented" || t.is_demo === 1,
  );
  if (tenants.length === 0) return { current: null };

  if (formula.kind === "signalNumber") {
    let total = 0;
    let contributed = 0;
    for (const t of tenants) {
      const snap = getLatestSnapshot<unknown>(t.id, formula.signal);
      const v = pluckNumber(snap?.payload, formula.field);
      if (v !== null) {
        total += v;
        contributed++;
      }
    }
    if (contributed === 0) return { current: null };
    return { current: total };
  }

  // ratio — per-tenant numerator/denominator, then average.
  const ratios: number[] = [];
  for (const t of tenants) {
    const numSnap = getLatestSnapshot<unknown>(t.id, formula.numerator.signal);
    const denSnap = getLatestSnapshot<unknown>(
      t.id,
      formula.denominator.signal,
    );
    const num = pluckNumber(numSnap?.payload, formula.numerator.field);
    const den = pluckNumber(denSnap?.payload, formula.denominator.field);
    if (num === null || den === null || den === 0) continue;
    ratios.push(num / den);
  }
  if (ratios.length === 0) return { current: null };
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const out = formula.asPercent ? mean * 100 : mean;
  return { current: Math.round(out * 10) / 10 };
}
