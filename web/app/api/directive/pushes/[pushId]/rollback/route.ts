import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import { deleteConditionalAccessPolicy } from "@/lib/directive/graph-writes";
import {
  getPushRequest,
  listActionsForPush,
  markActionRolledback,
  markPushRolledback,
} from "@/lib/directive/push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/directive/pushes/{id}/rollback — reverse a baseline push by
 * DELETE-ing each successfully-created CA policy. Per-tenant rollback
 * goes through the directive engine so every delete is audited the same
 * way the push was.
 *
 * Already-rolled-back or failed actions are skipped. Simulated (demo)
 * actions are flipped to 'rolledback' without any Graph call.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ pushId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { pushId } = await ctx.params;
  const pushIdNum = Number(pushId);
  const pushRequest = getPushRequest(pushIdNum);
  if (!pushRequest) {
    return NextResponse.json(
      { error: "push_not_found" },
      { status: 404 },
    );
  }
  if (pushRequest.status === "rolledback") {
    return NextResponse.json(
      { error: "already_rolledback" },
      { status: 409 },
    );
  }

  const actions = listActionsForPush(pushIdNum);
  const results: Array<{
    tenantId: string;
    status: "rolledback" | "skipped" | "failed";
    error?: string | null;
  }> = [];

  for (const action of actions) {
    if (action.status === "rolledback" || action.status === "failed") {
      results.push({ tenantId: action.tenant_id, status: "skipped" });
      continue;
    }
    if (!action.graph_policy_id) {
      results.push({
        tenantId: action.tenant_id,
        status: "skipped",
      });
      continue;
    }

    const policyId = action.graph_policy_id;
    const outcome = await executeDirective(gate, {
      tenantId: action.tenant_id,
      actionType: `baseline.rollback.${pushRequest.baseline_id}`,
      targetId: policyId,
      input: { policyId },
      simulatedResult: { deleted: true, policyId },
      run: async ({ tenant }) => {
        await deleteConditionalAccessPolicy(tenant, policyId);
        return { deleted: true, policyId };
      },
    });
    if (outcome.kind === "success") {
      markActionRolledback(action.id);
      results.push({ tenantId: action.tenant_id, status: "rolledback" });
    } else {
      results.push({
        tenantId: action.tenant_id,
        status: "failed",
        error: outcome.error,
      });
    }
  }

  markPushRolledback(pushIdNum);
  return NextResponse.json({ ok: true, pushId: pushIdNum, results });
}
