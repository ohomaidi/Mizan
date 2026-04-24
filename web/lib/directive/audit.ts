import "server-only";
import { getDb } from "@/lib/db/client";

/**
 * Directive audit row — one per write attempt. Never deleted. Surfaces on
 * /directive → Audit and on each entity detail's directive history.
 */

export type DirectiveActionStatus = "success" | "failed" | "simulated";

export type DirectiveActionRow = {
  id: number;
  tenant_id: string;
  action_type: string;
  target_id: string | null;
  status: DirectiveActionStatus;
  input_json: string | null;
  result_json: string | null;
  error_message: string | null;
  actor_user_id: string | null;
  at: string;
};

export type DirectiveActionInput = {
  tenantId: string;
  actionType: string;
  targetId?: string | null;
  status: DirectiveActionStatus;
  input?: unknown;
  result?: unknown;
  errorMessage?: string | null;
  actorUserId?: string | null;
};

export function recordDirectiveAction(input: DirectiveActionInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO directive_actions
        (tenant_id, action_type, target_id, status, input_json, result_json, error_message, actor_user_id)
       VALUES (@tenant_id, @action_type, @target_id, @status, @input_json, @result_json, @error_message, @actor_user_id)`,
    )
    .run({
      tenant_id: input.tenantId,
      action_type: input.actionType,
      target_id: input.targetId ?? null,
      status: input.status,
      input_json: input.input === undefined ? null : JSON.stringify(input.input),
      result_json:
        input.result === undefined ? null : JSON.stringify(input.result),
      error_message: input.errorMessage ?? null,
      actor_user_id: input.actorUserId ?? null,
    });
  return info.lastInsertRowid as number;
}

export function listDirectiveActions(
  opts: { tenantId?: string; limit?: number } = {},
): DirectiveActionRow[] {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  if (opts.tenantId) {
    return getDb()
      .prepare(
        `SELECT * FROM directive_actions
          WHERE tenant_id = ?
          ORDER BY at DESC, id DESC
          LIMIT ?`,
      )
      .all(opts.tenantId, limit) as DirectiveActionRow[];
  }
  return getDb()
    .prepare(
      `SELECT * FROM directive_actions
        ORDER BY at DESC, id DESC
        LIMIT ?`,
    )
    .all(limit) as DirectiveActionRow[];
}

export function countDirectiveActions(tenantId?: string): number {
  if (tenantId) {
    const row = getDb()
      .prepare("SELECT COUNT(*) AS n FROM directive_actions WHERE tenant_id = ?")
      .get(tenantId) as { n: number };
    return row.n;
  }
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM directive_actions")
    .get() as { n: number };
  return row.n;
}
