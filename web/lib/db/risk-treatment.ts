import "server-only";
import { getDb } from "./client";

/**
 * Risk treatment plans — per-risk mitigation steps.
 *
 * v2.6.0 stored mitigation as free-text on `risk_register.mitigation_notes`.
 * That's fine for "the team is patching this" but doesn't carry owner /
 * due / status per step, which is what the CISO needs to actually run
 * the mitigation as a project. v2.7.0 adds an ordered list of steps
 * underneath each risk. CASCADE deletes wipe steps with the parent risk.
 */

export type TreatmentStatus = "open" | "in_progress" | "done" | "blocked";

export type TreatmentStep = {
  id: number;
  risk_id: number;
  step_text: string;
  owner: string | null;
  due_date: string | null;
  status: TreatmentStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TreatmentStepDraft = {
  riskId: number;
  stepText: string;
  owner?: string;
  dueDate?: string;
  status?: TreatmentStatus;
  sortOrder?: number;
};

export function listTreatmentSteps(riskId: number): TreatmentStep[] {
  return getDb()
    .prepare(
      "SELECT * FROM risk_treatment_steps WHERE risk_id = ? ORDER BY sort_order ASC, id ASC",
    )
    .all(riskId) as TreatmentStep[];
}

export function getTreatmentStep(id: number): TreatmentStep | null {
  return (
    (getDb()
      .prepare("SELECT * FROM risk_treatment_steps WHERE id = ?")
      .get(id) as TreatmentStep | undefined) ?? null
  );
}

export function createTreatmentStep(
  draft: TreatmentStepDraft,
): TreatmentStep {
  // Auto-assign sort_order to the end of the existing list when the
  // caller doesn't specify — matches the obvious mental model
  // "added a new step, it lands at the bottom".
  let sortOrder = draft.sortOrder;
  if (sortOrder == null) {
    const row = getDb()
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM risk_treatment_steps WHERE risk_id = ?",
      )
      .get(draft.riskId) as { next: number };
    sortOrder = row.next;
  }
  const result = getDb()
    .prepare(
      `INSERT INTO risk_treatment_steps
         (risk_id, step_text, owner, due_date, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      draft.riskId,
      draft.stepText.trim(),
      draft.owner?.trim() ?? null,
      draft.dueDate ?? null,
      draft.status ?? "open",
      sortOrder,
    );
  return getTreatmentStep(Number(result.lastInsertRowid))!;
}

export function updateTreatmentStep(
  id: number,
  patch: Partial<Omit<TreatmentStepDraft, "riskId">>,
): TreatmentStep | null {
  const existing = getTreatmentStep(id);
  if (!existing) return null;
  getDb()
    .prepare(
      `UPDATE risk_treatment_steps SET
        step_text = COALESCE(?, step_text),
        owner = COALESCE(?, owner),
        due_date = COALESCE(?, due_date),
        status = COALESCE(?, status),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      patch.stepText?.trim() ?? null,
      patch.owner?.trim() ?? null,
      patch.dueDate ?? null,
      patch.status ?? null,
      patch.sortOrder ?? null,
      id,
    );
  return getTreatmentStep(id);
}

export function deleteTreatmentStep(id: number): void {
  getDb().prepare("DELETE FROM risk_treatment_steps WHERE id = ?").run(id);
}

/** Aggregate per-risk progress — used by the register table to show
 *  "3/5 done" inline next to mitigation. */
export function progressForRisk(riskId: number): {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
} {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done,
         SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS inProgress,
         SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) AS blocked
       FROM risk_treatment_steps
       WHERE risk_id = ?`,
    )
    .get(riskId) as {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
  };
  return row;
}
