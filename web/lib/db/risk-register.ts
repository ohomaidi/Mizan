import "server-only";
import { getDb } from "./client";

/**
 * Risk register — board-grade risk list. v2.6.0 (Executive mode).
 *
 * Two ways risks land in the register:
 *   1. Manual operator entry (CISO types it in)
 *   2. Auto-suggested from posture signals (a critical CVE that's been
 *      unpatched too long, repeated admin deactivations, MFA coverage
 *      slipping). Suggestions arrive with `status = 'suggested'` and
 *      sit in a separate panel until the operator accepts (→ `open`)
 *      or dismisses (→ `dismissed` with a 30-day cooldown so the same
 *      auto-rule doesn't immediately re-suggest).
 *
 * Residual rating is the impact × likelihood product, clamped to
 * 1..25. Stored explicitly so SQL ranking + heat-map rendering stay
 * fast (no aggregation cost).
 */

export type RiskStatus =
  | "suggested"
  | "open"
  | "mitigated"
  | "accepted"
  | "dismissed";

export type RiskSource =
  | "manual"
  | "auto-cve"
  | "auto-deactivation"
  | "auto-mfa-coverage"
  | "auto-maturity-drop"
  | "auto-incident";

export type RiskRow = {
  id: number;
  title: string;
  description: string | null;
  impact: number;
  likelihood: number;
  residual_rating: number;
  owner: string | null;
  due_date: string | null;
  status: RiskStatus;
  mitigation_notes: string | null;
  source: RiskSource;
  related_signal: string | null;
  suggested_at: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
};

export type RiskDraft = {
  title: string;
  description?: string;
  impact: number;
  likelihood: number;
  owner?: string;
  dueDate?: string;
  mitigationNotes?: string;
  source?: RiskSource;
  relatedSignal?: string;
  status?: RiskStatus;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function listRisks(opts?: {
  status?: RiskStatus | RiskStatus[];
}): RiskRow[] {
  const db = getDb();
  if (!opts?.status) {
    return db
      .prepare(
        "SELECT * FROM risk_register ORDER BY residual_rating DESC, id DESC",
      )
      .all() as RiskRow[];
  }
  const arr = Array.isArray(opts.status) ? opts.status : [opts.status];
  const placeholders = arr.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM risk_register WHERE status IN (${placeholders}) ORDER BY residual_rating DESC, id DESC`,
    )
    .all(...arr) as RiskRow[];
}

export function getRisk(id: number): RiskRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM risk_register WHERE id = ?")
      .get(id) as RiskRow | undefined) ?? null
  );
}

export function createRisk(draft: RiskDraft): RiskRow {
  const impact = clamp(draft.impact, 1, 5);
  const likelihood = clamp(draft.likelihood, 1, 5);
  const residual = impact * likelihood;
  const status = draft.status ?? (draft.source?.startsWith("auto-") ? "suggested" : "open");
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      `INSERT INTO risk_register
        (title, description, impact, likelihood, residual_rating, owner, due_date,
         status, mitigation_notes, source, related_signal, suggested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      draft.title.trim(),
      draft.description?.trim() ?? null,
      impact,
      likelihood,
      residual,
      draft.owner?.trim() ?? null,
      draft.dueDate ?? null,
      status,
      draft.mitigationNotes?.trim() ?? null,
      draft.source ?? "manual",
      draft.relatedSignal ?? null,
      status === "suggested" ? now : null,
      now,
      now,
    );
  return getRisk(Number(result.lastInsertRowid))!;
}

export function updateRisk(
  id: number,
  patch: Partial<RiskDraft>,
): RiskRow | null {
  const existing = getRisk(id);
  if (!existing) return null;
  const impact = clamp(patch.impact ?? existing.impact, 1, 5);
  const likelihood = clamp(patch.likelihood ?? existing.likelihood, 1, 5);
  const residual = impact * likelihood;
  getDb()
    .prepare(
      `UPDATE risk_register SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        impact = ?,
        likelihood = ?,
        residual_rating = ?,
        owner = COALESCE(?, owner),
        due_date = COALESCE(?, due_date),
        status = COALESCE(?, status),
        mitigation_notes = COALESCE(?, mitigation_notes),
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      patch.title?.trim() ?? null,
      patch.description?.trim() ?? null,
      impact,
      likelihood,
      residual,
      patch.owner?.trim() ?? null,
      patch.dueDate ?? null,
      patch.status ?? null,
      patch.mitigationNotes?.trim() ?? null,
      id,
    );
  return getRisk(id);
}

export function deleteRisk(id: number): void {
  getDb().prepare("DELETE FROM risk_register WHERE id = ?").run(id);
}

export function acceptSuggestion(id: number): RiskRow | null {
  const r = getRisk(id);
  if (!r || r.status !== "suggested") return r;
  getDb()
    .prepare(
      `UPDATE risk_register SET status='open', accepted_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
    )
    .run(id);
  return getRisk(id);
}

export function dismissSuggestion(id: number): RiskRow | null {
  const r = getRisk(id);
  if (!r) return null;
  // 30-day cooldown — auto-rules check this before re-creating.
  const cooldown = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString();
  getDb()
    .prepare(
      `UPDATE risk_register SET status='dismissed', dismissed_at=datetime('now'),
                                  cooldown_until=?, updated_at=datetime('now')
       WHERE id=?`,
    )
    .run(cooldown, id);
  return getRisk(id);
}

/**
 * Has this signal generated a suggestion within the cooldown window?
 * Auto-rules call before creating a new row to avoid re-suggesting a
 * dismissed risk every sync. Cooldown defaults to 30 days; rule
 * matches on `source` + the `relatedSignal` discriminator (e.g. the
 * CVE id, the user UPN of the deactivated admin).
 */
export function hasActiveSuggestion(
  source: RiskSource,
  relatedSignal: string | null,
): boolean {
  const row = getDb()
    .prepare(
      `SELECT id FROM risk_register
        WHERE source = ?
          AND (related_signal IS ? OR related_signal = ?)
          AND (
            status IN ('suggested', 'open', 'mitigated')
            OR (status = 'dismissed' AND cooldown_until > datetime('now'))
          )
        LIMIT 1`,
    )
    .get(source, relatedSignal, relatedSignal) as { id: number } | undefined;
  return !!row;
}
