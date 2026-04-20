import "server-only";
import { getDb } from "./client";

export type AuditQueryKind = "labelAdoption";
export type AuditQueryStatus = "notStarted" | "running" | "succeeded" | "failed";

export type AuditQueryRow = {
  id: number;
  tenant_id: string;
  query_kind: AuditQueryKind;
  graph_query_id: string;
  status: AuditQueryStatus;
  submitted_at: string;
  completed_at: string | null;
  results_json: string | null;
  error_message: string | null;
};

export function getLatestAuditQuery(
  tenantId: string,
  kind: AuditQueryKind,
): AuditQueryRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM audit_log_queries
          WHERE tenant_id = ? AND query_kind = ?
          ORDER BY submitted_at DESC LIMIT 1`,
      )
      .get(tenantId, kind) as AuditQueryRow | undefined) ?? null
  );
}

export function insertAuditQuery(params: {
  tenantId: string;
  kind: AuditQueryKind;
  graphQueryId: string;
  status: AuditQueryStatus;
}): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log_queries (tenant_id, query_kind, graph_query_id, status)
       VALUES (@tenantId, @kind, @graphQueryId, @status)`,
    )
    .run(params);
}

export function updateAuditQueryStatus(
  id: number,
  status: AuditQueryStatus,
  opts?: { results?: unknown; errorMessage?: string },
): void {
  getDb()
    .prepare(
      `UPDATE audit_log_queries
          SET status = @status,
              completed_at = CASE WHEN @status IN ('succeeded','failed') THEN datetime('now') ELSE completed_at END,
              results_json = COALESCE(@results, results_json),
              error_message = COALESCE(@errorMessage, error_message)
        WHERE id = @id`,
    )
    .run({
      id,
      status,
      results: opts?.results !== undefined ? JSON.stringify(opts.results) : null,
      errorMessage: opts?.errorMessage ?? null,
    });
}

/** Latest completed results for this tenant/kind, parsed. Returns null if none or stale. */
export function getLatestAuditQueryResults<T>(
  tenantId: string,
  kind: AuditQueryKind,
  maxAgeDays: number = 14,
): T | null {
  const row = getLatestAuditQuery(tenantId, kind);
  if (!row || row.status !== "succeeded" || !row.results_json) return null;
  const completed = row.completed_at ? Date.parse(row.completed_at + "Z") : 0;
  if (Date.now() - completed > maxAgeDays * 86_400_000) return null;
  try {
    return JSON.parse(row.results_json) as T;
  } catch {
    return null;
  }
}
