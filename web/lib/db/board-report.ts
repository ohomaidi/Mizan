import "server-only";
import { getDb } from "./client";

/**
 * Board PDF report drafts. v2.6.0.
 *
 * `pdf_blob` stores the rendered bytes so a draft can be re-downloaded
 * even if the underlying source data shifts. Auto-drafts (weekly cron)
 * and on-demand drafts both land here.
 *
 * `period` is a YYYY-Q string ("2026-Q2") so quarter-grouping queries
 * and "last quarter's draft" lookups stay simple.
 */

export type DraftStatus = "draft" | "signed" | "superseded";

export type BoardReportDraft = {
  id: number;
  period: string;
  generated_at: string;
  status: DraftStatus;
  signed_by: string | null;
  signed_at: string | null;
  planned_actions: string | null;
  // pdf_blob omitted from default reads — fetch separately via /pdf route.
};

export function listDrafts(): BoardReportDraft[] {
  return getDb()
    .prepare(
      `SELECT id, period, generated_at, status, signed_by, signed_at, planned_actions
       FROM board_report_drafts
       ORDER BY generated_at DESC LIMIT 100`,
    )
    .all() as BoardReportDraft[];
}

export function getDraft(id: number): BoardReportDraft | null {
  return (
    (getDb()
      .prepare(
        `SELECT id, period, generated_at, status, signed_by, signed_at, planned_actions
         FROM board_report_drafts WHERE id = ?`,
      )
      .get(id) as BoardReportDraft | undefined) ?? null
  );
}

export function getDraftPdf(id: number): Buffer | null {
  const row = getDb()
    .prepare("SELECT pdf_blob FROM board_report_drafts WHERE id = ?")
    .get(id) as { pdf_blob: Buffer | null } | undefined;
  return row?.pdf_blob ?? null;
}

export function createDraft(opts: {
  period: string;
  pdfBlob: Buffer;
  plannedActions?: string;
}): BoardReportDraft {
  const result = getDb()
    .prepare(
      `INSERT INTO board_report_drafts (period, pdf_blob, planned_actions)
       VALUES (?, ?, ?)`,
    )
    .run(opts.period, opts.pdfBlob, opts.plannedActions ?? null);
  return getDraft(Number(result.lastInsertRowid))!;
}

export function signDraft(id: number, signedBy: string): BoardReportDraft | null {
  getDb()
    .prepare(
      `UPDATE board_report_drafts SET status='signed', signed_by=?, signed_at=datetime('now') WHERE id = ?`,
    )
    .run(signedBy, id);
  return getDraft(id);
}

export function deleteDraft(id: number): void {
  getDb()
    .prepare("DELETE FROM board_report_drafts WHERE id = ?")
    .run(id);
}

/** Compute the current period (e.g. "2026-Q2") for stamping new drafts. */
export function currentPeriod(): string {
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}
