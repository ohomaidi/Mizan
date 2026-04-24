import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  getPushRequest,
  listActionsForPush,
} from "@/lib/directive/push-store";
import { getTenant } from "@/lib/db/tenants";
import {
  findCaPolicyByIdempotencyTag,
  findPolicyByKindAndTag,
  type PolicyKind,
} from "@/lib/directive/graph-writes";
import { getBaseline } from "@/lib/directive/baselines/registry";
import {
  getCustomPolicy,
  idempotencyKeyForPolicy,
} from "@/lib/directive/custom-policies/store";
import { getIntuneBaseline } from "@/lib/directive/intune/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/pushes/{id}/rollback-preview
 *
 * Returns the current state of every policy this push would roll back, so
 * the UI can warn the operator before they delete something that has
 * since been flipped from report-only to enforced. Per-tenant:
 *
 *   currentState: 'enabledForReportingButNotEnforced' | 'enabled' | 'disabled' | null
 *   wouldUnprotect: true when current state is 'enabled'
 *   alreadyGone: true when the policy has been deleted by someone else
 *   skipReason: set for rows that have no rollback target (failed, simulated
 *     with no real policy, or idempotent rows whose graph_policy_id is null)
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ pushId: string }> },
) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const { pushId } = await ctx.params;
  const pushIdNum = Number(pushId);
  const push = getPushRequest(pushIdNum);
  if (!push) {
    return NextResponse.json({ error: "push_not_found" }, { status: 404 });
  }
  const actions = listActionsForPush(pushIdNum);

  // Resolve the idempotency key + policy kind for this push. Three
  // tracks today: CA baselines, custom CA drafts, Intune baselines.
  // baseline_id encodes which track via prefix.
  let idempotencyKey: string | null = null;
  let policyKind: PolicyKind = "ca";
  if (push.baseline_id.startsWith("custom:")) {
    const policyId = Number(push.baseline_id.slice("custom:".length));
    const row = getCustomPolicy(policyId);
    if (row) idempotencyKey = idempotencyKeyForPolicy(policyId);
  } else if (push.baseline_id.startsWith("intune:")) {
    const intuneId = push.baseline_id.slice("intune:".length);
    const intune = getIntuneBaseline(intuneId);
    if (intune) {
      idempotencyKey = intune.idempotencyKey;
      policyKind = intune.descriptor.kind;
    }
  } else {
    const baseline = getBaseline(push.baseline_id);
    if (baseline) idempotencyKey = baseline.idempotencyKey;
  }

  type Entry = {
    actionId: number;
    tenantId: string;
    currentState: string | null;
    wouldUnprotect: boolean;
    alreadyGone: boolean;
    skipReason: "already_rolledback" | "failed" | "no_policy_id" | null;
  };

  const entries: Entry[] = [];
  for (const action of actions) {
    const base: Entry = {
      actionId: action.id,
      tenantId: action.tenant_id,
      currentState: null,
      wouldUnprotect: false,
      alreadyGone: false,
      skipReason: null,
    };
    if (action.status === "rolledback") {
      entries.push({ ...base, skipReason: "already_rolledback" });
      continue;
    }
    if (action.status === "failed") {
      entries.push({ ...base, skipReason: "failed" });
      continue;
    }
    if (!action.graph_policy_id) {
      entries.push({ ...base, skipReason: "no_policy_id" });
      continue;
    }

    const tenant = getTenant(action.tenant_id);
    if (!tenant) {
      entries.push({ ...base, skipReason: "failed" });
      continue;
    }

    // Demo tenants — we can't (and shouldn't) call Graph, so assume the
    // state stored at push time is still current.
    if (tenant.is_demo === 1) {
      entries.push({
        ...base,
        currentState: "enabledForReportingButNotEnforced",
        wouldUnprotect: false,
      });
      continue;
    }

    // Real tenants — look up the policy by tag. Don't fail the whole
    // preview if one tenant's lookup errors — report it as already_gone.
    if (!idempotencyKey) {
      entries.push({ ...base, alreadyGone: true });
      continue;
    }
    try {
      // CA policies carry a state; Intune policies don't — the
      // findPolicyByKindAndTag helper returns only { id, displayName }
      // for non-CA kinds, so wouldUnprotect stays false (Intune
      // enforcement is controlled by assignment, not state).
      const found =
        policyKind === "ca"
          ? await findCaPolicyByIdempotencyTag(tenant, idempotencyKey)
          : await findPolicyByKindAndTag(policyKind, tenant, idempotencyKey);
      if (!found) {
        entries.push({ ...base, alreadyGone: true });
      } else {
        const state =
          "state" in found && typeof found.state === "string"
            ? found.state
            : null;
        entries.push({
          ...base,
          currentState: state,
          wouldUnprotect: state === "enabled",
        });
      }
    } catch {
      entries.push({ ...base, alreadyGone: true });
    }
  }

  return NextResponse.json({
    pushId: pushIdNum,
    baselineId: push.baseline_id,
    entries,
  });
}
