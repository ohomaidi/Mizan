import "server-only";
import { getDb } from "./client";
import type { CustomFormula } from "@/lib/scorecard/custom-formula";

/**
 * Custom CISO scorecard KPI formulas — operator-defined KPIs beyond
 * the v2.6.0 hardcoded 10-pin catalog. Each row is a custom KPI:
 *   - kpi_kind: stable identifier prefixed with "custom:" so it
 *     never collides with built-in catalog kinds. Generated server-
 *     side from the label by `slugifyKind()`.
 *   - formula_json: JSON-serialised CustomFormula (validated by
 *     parseFormula() before persist).
 *
 * Custom KPIs piggyback on the existing `ciso_scorecard_pins` table
 * for the pin/unpin mechanic — pinning a custom KPI just stamps a
 * row there with the same `custom:*` kpi_kind.
 *
 * v2.7.0.
 */

export type CustomKpiRow = {
  id: number;
  kpi_kind: string;
  label: string;
  description: string | null;
  unit: "percent" | "count" | "hours" | "boolean";
  direction: "higherBetter" | "lowerBetter";
  target: number;
  formula_json: string;
  created_at: string;
  updated_at: string;
};

export type CustomKpiDraft = {
  label: string;
  description?: string;
  unit: "percent" | "count" | "hours" | "boolean";
  direction: "higherBetter" | "lowerBetter";
  target: number;
  formula: CustomFormula;
};

export function listCustomKpis(): CustomKpiRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM custom_kpi_formulas ORDER BY created_at DESC, id DESC",
    )
    .all() as CustomKpiRow[];
}

export function getCustomKpiByKind(kind: string): CustomKpiRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM custom_kpi_formulas WHERE kpi_kind = ?")
      .get(kind) as CustomKpiRow | undefined) ?? null
  );
}

export function createCustomKpi(draft: CustomKpiDraft): CustomKpiRow {
  const kind = uniqueKpiKind(draft.label);
  const result = getDb()
    .prepare(
      `INSERT INTO custom_kpi_formulas
         (kpi_kind, label, description, unit, direction, target, formula_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      kind,
      draft.label.trim(),
      draft.description?.trim() ?? null,
      draft.unit,
      draft.direction,
      draft.target,
      JSON.stringify(draft.formula),
    );
  return getDb()
    .prepare("SELECT * FROM custom_kpi_formulas WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as CustomKpiRow;
}

export function deleteCustomKpi(id: number): void {
  // Cascade — also drop any pin that referenced the custom kind so
  // the scorecard page doesn't render a dangling tile.
  const tx = getDb().transaction(() => {
    const row = getDb()
      .prepare("SELECT kpi_kind FROM custom_kpi_formulas WHERE id = ?")
      .get(id) as { kpi_kind: string } | undefined;
    if (!row) return;
    getDb()
      .prepare("DELETE FROM ciso_scorecard_pins WHERE kpi_kind = ?")
      .run(row.kpi_kind);
    getDb()
      .prepare("DELETE FROM custom_kpi_formulas WHERE id = ?")
      .run(id);
  });
  tx();
}

/**
 * Generate a "custom:foo-bar" identifier from a human label, with a
 * numeric suffix appended if there's a collision.
 */
function uniqueKpiKind(label: string): string {
  const base =
    "custom:" +
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) +
    (label.replace(/[^a-z0-9]+/gi, "").length === 0 ? "kpi" : "");
  let candidate = base;
  let n = 1;
  while (getCustomKpiByKind(candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}
