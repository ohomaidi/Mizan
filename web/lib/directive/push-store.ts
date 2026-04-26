import "server-only";
import { getDb } from "@/lib/db/client";

/**
 * DB layer for Phase 3 baseline pushes. One push_request row per push
 * attempt; one push_action row per tenant within a push. Rollback uses
 * the stored graph_policy_id to DELETE on real tenants.
 */

export type PushStatus =
  | "preview"
  | "executing"
  | "complete"
  | "failed"
  | "rolledback";

export type ActionStatus = "success" | "failed" | "simulated" | "rolledback";

export type PushRequestRow = {
  id: number;
  baseline_id: string;
  status: PushStatus;
  pushed_by_user_id: string | null;
  target_tenant_ids_json: string;
  options_json: string | null;
  summary_json: string | null;
  created_at: string;
  executed_at: string | null;
  rolledback_at: string | null;
};

export type PushActionRow = {
  id: number;
  push_request_id: number;
  tenant_id: string;
  status: ActionStatus;
  graph_policy_id: string | null;
  error_message: string | null;
  at: string;
};

export function createPushRequest(input: {
  baselineId: string;
  targetTenantIds: string[];
  options: unknown;
  actorUserId: string | null;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO directive_push_requests
        (baseline_id, status, pushed_by_user_id, target_tenant_ids_json, options_json)
       VALUES (@baseline_id, 'executing', @actor, @targets, @options)`,
    )
    .run({
      baseline_id: input.baselineId,
      actor: input.actorUserId,
      targets: JSON.stringify(input.targetTenantIds),
      options: JSON.stringify(input.options ?? {}),
    });
  return info.lastInsertRowid as number;
}

export function finalizePushRequest(
  id: number,
  status: PushStatus,
  summary: unknown,
): void {
  getDb()
    .prepare(
      `UPDATE directive_push_requests
         SET status = ?,
             summary_json = ?,
             executed_at = datetime('now')
       WHERE id = ?`,
    )
    .run(status, JSON.stringify(summary ?? {}), id);
}

export function markPushRolledback(id: number): void {
  getDb()
    .prepare(
      `UPDATE directive_push_requests
         SET status = 'rolledback',
             rolledback_at = datetime('now')
       WHERE id = ?`,
    )
    .run(id);
}

export function recordPushAction(input: {
  pushRequestId: number;
  tenantId: string;
  status: ActionStatus;
  graphPolicyId?: string | null;
  errorMessage?: string | null;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO directive_push_actions
        (push_request_id, tenant_id, status, graph_policy_id, error_message)
       VALUES (@push_request_id, @tenant_id, @status, @graph_policy_id, @error_message)`,
    )
    .run({
      push_request_id: input.pushRequestId,
      tenant_id: input.tenantId,
      status: input.status,
      graph_policy_id: input.graphPolicyId ?? null,
      error_message: input.errorMessage ?? null,
    });
  return info.lastInsertRowid as number;
}

export function markActionRolledback(actionId: number): void {
  getDb()
    .prepare(
      `UPDATE directive_push_actions
         SET status = 'rolledback'
       WHERE id = ?`,
    )
    .run(actionId);
}

export function getPushRequest(id: number): PushRequestRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM directive_push_requests WHERE id = ?")
      .get(id) as PushRequestRow | undefined) ?? null
  );
}

export function listPushRequests(limit = 50): PushRequestRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM directive_push_requests
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
    )
    .all(Math.min(500, Math.max(1, limit))) as PushRequestRow[];
}

export function listActionsForPush(pushRequestId: number): PushActionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM directive_push_actions
        WHERE push_request_id = ?
        ORDER BY id ASC`,
    )
    .all(pushRequestId) as PushActionRow[];
}

/**
 * Every directive push that targeted ONE tenant — joined back to the
 * parent push_request so callers see which baseline drove each row.
 *
 * Powers the Entity Detail → Framework tab "Deployed via Directive"
 * recap so an operator authoring new pushes can see what's already
 * landed on this entity at a glance.
 */
export function listActionsForTenant(
  tenantId: string,
  limit = 50,
): Array<PushActionRow & { baseline_id: string }> {
  return getDb()
    .prepare(
      `SELECT a.*, r.baseline_id
         FROM directive_push_actions a
         JOIN directive_push_requests r ON r.id = a.push_request_id
        WHERE a.tenant_id = ?
        ORDER BY a.at DESC
        LIMIT ?`,
    )
    .all(tenantId, limit) as Array<PushActionRow & { baseline_id: string }>;
}
