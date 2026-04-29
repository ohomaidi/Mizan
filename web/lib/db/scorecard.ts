import "server-only";
import { getDb } from "./client";
import type { KpiKind } from "@/lib/scorecard/catalog";

/**
 * CISO scorecard pin storage. Operator selects KPIs from the catalog
 * (see `lib/scorecard/catalog.ts`) and pins each onto the home page
 * with a target value + optional commitment + due date + owner.
 *
 * Unique on `kpi_kind` so the same KPI can't be pinned twice. v2.6.0.
 */

export type ScorecardPin = {
  id: number;
  kpi_kind: KpiKind;
  label: string;
  target: number;
  commitment: string | null;
  due_date: string | null;
  owner: string | null;
  pinned_at: string;
};

export type PinDraft = {
  kpiKind: KpiKind;
  label: string;
  target: number;
  commitment?: string;
  dueDate?: string;
  owner?: string;
};

export function listPins(): ScorecardPin[] {
  return getDb()
    .prepare("SELECT * FROM ciso_scorecard_pins ORDER BY pinned_at ASC")
    .all() as ScorecardPin[];
}

export function getPin(id: number): ScorecardPin | null {
  return (
    (getDb()
      .prepare("SELECT * FROM ciso_scorecard_pins WHERE id = ?")
      .get(id) as ScorecardPin | undefined) ?? null
  );
}

export function getPinByKind(kind: KpiKind): ScorecardPin | null {
  return (
    (getDb()
      .prepare("SELECT * FROM ciso_scorecard_pins WHERE kpi_kind = ?")
      .get(kind) as ScorecardPin | undefined) ?? null
  );
}

export function pinKpi(draft: PinDraft): ScorecardPin {
  const existing = getPinByKind(draft.kpiKind);
  if (existing) {
    // Idempotent — update target/commitment instead of creating duplicate.
    getDb()
      .prepare(
        `UPDATE ciso_scorecard_pins SET
          label = ?, target = ?, commitment = ?, due_date = ?, owner = ?
          WHERE id = ?`,
      )
      .run(
        draft.label,
        draft.target,
        draft.commitment?.trim() ?? null,
        draft.dueDate ?? null,
        draft.owner?.trim() ?? null,
        existing.id,
      );
    return getPin(existing.id)!;
  }
  const result = getDb()
    .prepare(
      `INSERT INTO ciso_scorecard_pins
        (kpi_kind, label, target, commitment, due_date, owner)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      draft.kpiKind,
      draft.label,
      draft.target,
      draft.commitment?.trim() ?? null,
      draft.dueDate ?? null,
      draft.owner?.trim() ?? null,
    );
  return getPin(Number(result.lastInsertRowid))!;
}

export function unpinKpi(id: number): void {
  getDb().prepare("DELETE FROM ciso_scorecard_pins WHERE id = ?").run(id);
}
