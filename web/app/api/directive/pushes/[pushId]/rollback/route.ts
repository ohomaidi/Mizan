import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import {
  deleteConditionalAccessPolicy,
  deletePolicyByKind,
  type PolicyKind,
} from "@/lib/directive/graph-writes";
import {
  getPushRequest,
  listActionsForPush,
  markActionRolledback,
  markPushRolledback,
} from "@/lib/directive/push-store";
import { getIntuneBaseline } from "@/lib/directive/intune/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z
  .object({
    /**
     * Optional per-tenant scoping — if provided, only these push_action
     * ids are rolled back. The push_request is only flipped to
     * 'rolledback' when every non-skip action has been rolled back.
     * If omitted, every rollback-eligible action in the push is reversed
     * (matches the Phase 3 behaviour).
     */
    actionIds: z.array(z.number().int().positive()).optional(),
  })
  .optional();

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
  req: NextRequest,
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

  let parsedBody: z.infer<typeof Body> = undefined;
  try {
    const raw = req.headers.get("content-length") === "0" ? null : await req.json().catch(() => null);
    if (raw !== null) {
      const p = Body.safeParse(raw);
      if (!p.success) {
        return NextResponse.json(
          { error: "validation", issues: p.error.issues },
          { status: 400 },
        );
      }
      parsedBody = p.data;
    }
  } catch {
    // tolerate empty body — default to "roll back everything"
  }
  const scopeIds = parsedBody?.actionIds
    ? new Set(parsedBody.actionIds)
    : null;

  const actions = listActionsForPush(pushIdNum);

  // Resolve the policy kind once based on the push's baseline_id prefix.
  // Intune pushes delete via the kind-generic helper; CA (default + custom)
  // keeps the legacy CA call for clarity + Phase-3 parity.
  let policyKind: Exclude<PolicyKind, "ca"> | null = null;
  if (pushRequest.baseline_id.startsWith("intune:")) {
    const intuneId = pushRequest.baseline_id.slice("intune:".length);
    const intune = getIntuneBaseline(intuneId);
    if (intune) policyKind = intune.descriptor.kind;
  }
  const results: Array<{
    tenantId: string;
    status: "rolledback" | "skipped" | "failed";
    error?: string | null;
  }> = [];

  for (const action of actions) {
    if (scopeIds && !scopeIds.has(action.id)) {
      // Out of scope for this partial rollback — leave untouched.
      continue;
    }
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
      input: { policyId, policyKind: policyKind ?? ("ca" as const) },
      simulatedResult: { deleted: true, policyId },
      run: async ({ tenant }) => {
        if (policyKind) {
          // Intune kinds route through the kind-generic helper.
          await deletePolicyByKind(policyKind, tenant, policyId);
        } else {
          await deleteConditionalAccessPolicy(tenant, policyId);
        }
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

  // Only mark the push_request as 'rolledback' when every eligible action
  // in the push has actually been rolled back. Partial rollbacks leave the
  // request in its prior status so the operator can continue later.
  const remaining = actions.filter(
    (a) =>
      a.status !== "rolledback" &&
      a.status !== "failed" &&
      !!a.graph_policy_id,
  );
  const allDone = remaining.length === 0;
  if (allDone) {
    markPushRolledback(pushIdNum);
  }
  return NextResponse.json({
    ok: true,
    pushId: pushIdNum,
    fullyRolledback: allDone,
    results,
  });
}
