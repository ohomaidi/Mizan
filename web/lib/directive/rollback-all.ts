import "server-only";
import { getDb } from "@/lib/db/client";
import { getTenant } from "@/lib/db/tenants";
import {
  deleteConditionalAccessPolicy,
  findCaPolicyByIdempotencyTag,
} from "./graph-writes";
import { executeDirective } from "./engine";

/**
 * "Remove this baseline / custom policy from every entity that has it."
 *
 * Finds every tenant where a push_action row has a graph_policy_id for
 * this baseline (i.e. we actually created something in that tenant), and
 * issues DELETE on each. Used by the /directive UI's baseline-wide
 * rollback action. Runs through the directive engine so each delete is
 * audited identically to a push-scoped rollback.
 */
export async function rollbackAllForBaseline(
  gate: {
    ok: true;
    user: { id: string; role: "admin" | "analyst" | "viewer" } | null;
  },
  baselineId: string,
  idempotencyKey: string,
): Promise<{
  affectedTenants: number;
  results: Array<{
    tenantId: string;
    status: "rolledback" | "skipped" | "failed";
    error?: string | null;
  }>;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pa.id AS id,
              pa.tenant_id AS tenant_id,
              pa.graph_policy_id AS graph_policy_id,
              pa.status AS status
         FROM directive_push_actions pa
         JOIN directive_push_requests pr ON pr.id = pa.push_request_id
        WHERE pr.baseline_id = ?
          AND pa.graph_policy_id IS NOT NULL
          AND pa.status != 'rolledback'`,
    )
    .all(baselineId) as Array<{
    id: number;
    tenant_id: string;
    graph_policy_id: string;
    status: string;
  }>;

  // De-duplicate per tenant — if we've pushed the same baseline multiple
  // times, one DELETE covers all rows (Graph only has one policy per tag).
  const byTenant = new Map<string, Array<typeof rows[number]>>();
  for (const row of rows) {
    const list = byTenant.get(row.tenant_id) ?? [];
    list.push(row);
    byTenant.set(row.tenant_id, list);
  }

  const results: Array<{
    tenantId: string;
    status: "rolledback" | "skipped" | "failed";
    error?: string | null;
  }> = [];

  const markRolledback = db.prepare(
    "UPDATE directive_push_actions SET status = 'rolledback' WHERE id = ?",
  );

  for (const [tenantId, actions] of byTenant.entries()) {
    const tenant = getTenant(tenantId);
    if (!tenant) {
      results.push({ tenantId, status: "failed", error: "tenant_not_found" });
      continue;
    }

    type RollbackAllOutcome = {
      deleted: boolean;
      policyId: string | null;
      reason: "already_gone" | null;
    };
    const outcome = await executeDirective<RollbackAllOutcome>(gate, {
      tenantId,
      actionType: `baseline.rollback-all.${baselineId}`,
      targetId: idempotencyKey,
      input: { idempotencyKey },
      simulatedResult: {
        deleted: true,
        policyId: null,
        reason: null,
      },
      run: async ({ tenant: realTenant }) => {
        // Re-resolve the current policy id — the one stored on
        // push_actions may be stale if the policy was rotated, and we
        // want to delete the currently-installed policy for this tag.
        const found = await findCaPolicyByIdempotencyTag(
          realTenant,
          idempotencyKey,
        );
        if (!found) {
          return {
            deleted: false,
            policyId: null,
            reason: "already_gone",
          };
        }
        await deleteConditionalAccessPolicy(realTenant, found.id);
        return {
          deleted: true,
          policyId: found.id,
          reason: null,
        };
      },
    });

    if (outcome.kind === "success") {
      for (const a of actions) markRolledback.run(a.id);
      results.push({ tenantId, status: "rolledback" });
    } else {
      results.push({
        tenantId,
        status: "failed",
        error: outcome.error,
      });
    }
  }

  return { affectedTenants: byTenant.size, results };
}
