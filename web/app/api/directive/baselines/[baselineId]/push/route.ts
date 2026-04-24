import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import { getBaseline } from "@/lib/directive/baselines/registry";
import {
  createConditionalAccessPolicy,
  findCaPolicyByIdempotencyTag,
} from "@/lib/directive/graph-writes";
import { getTenant } from "@/lib/db/tenants";
import {
  createPushRequest,
  finalizePushRequest,
  recordPushAction,
} from "@/lib/directive/push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  targetTenantIds: z.array(z.string().min(1)).min(1).max(100),
  overrideState: z
    .enum(["enabled", "disabled", "enabledForReportingButNotEnforced"])
    .optional(),
});

/**
 * POST /api/directive/baselines/{id}/push — fan-out the baseline to every
 * selected tenant. Each tenant goes through the directive engine (deployment
 * gate + per-tenant consent gate + demo-sim gate + audit). A push_request
 * row captures the batch; each per-tenant attempt lands as both a
 * directive_actions row (individual audit) AND a push_action row (for
 * rollback).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json({ error: "baseline_not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { targetTenantIds, overrideState } = parsed.data;
  const policyBody = baseline.buildPolicyBody({ overrideState });

  // Open a push_request row so the audit log shows "push in flight" even
  // if the server crashes mid-fan-out.
  const pushRequestId = createPushRequest({
    baselineId,
    targetTenantIds,
    options: { overrideState },
    actorUserId: gate.user?.id ?? null,
  });

  const perTenant: Array<{
    tenantId: string;
    status:
      | "success"
      | "already_applied"
      | "failed"
      | "simulated"
      | "skipped_observation";
    policyId?: string | null;
    /**
     * For `already_applied` — the state the existing policy is currently in
     * inside the tenant. Lets the operator see whether the entity has left
     * it in report-only or moved it to enabled since the original push.
     */
    currentState?: string | null;
    error?: string | null;
    auditId?: number;
  }> = [];

  for (const tenantId of targetTenantIds) {
    // Skip tenants that aren't in directive mode up front. Saves an engine
    // round-trip for the common mixed-selection case.
    const tenant = getTenant(tenantId);
    if (!tenant) {
      perTenant.push({ tenantId, status: "failed", error: "tenant_not_found" });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: "failed",
        errorMessage: "tenant_not_found",
      });
      continue;
    }
    if (tenant.consent_mode !== "directive") {
      perTenant.push({
        tenantId,
        status: "skipped_observation",
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: "failed",
        errorMessage: "skipped_observation",
      });
      continue;
    }

    const outcome = await executeDirective(gate, {
      tenantId,
      actionType: `baseline.push.${baselineId}`,
      targetId: baseline.idempotencyKey,
      input: { policyBody, overrideState },
      simulatedResult: {
        policyId: `sim-${pushRequestId}-${tenantId}`,
        displayName: policyBody.displayName,
        state: policyBody.state,
        idempotent: false as const,
      },
      run: async ({ tenant }) => {
        // Idempotency check: if this tenant already has a policy with the
        // baseline's tag, don't create a duplicate. Return the existing one.
        const existing = await findCaPolicyByIdempotencyTag(
          tenant,
          baseline.idempotencyKey,
        );
        if (existing) {
          return {
            policyId: existing.id,
            displayName: existing.displayName,
            state: existing.state,
            idempotent: true,
          } as const;
        }
        const created = await createConditionalAccessPolicy(tenant, policyBody);
        return {
          policyId: created.id,
          displayName: created.displayName,
          state: created.state,
          idempotent: false,
        } as const;
      },
    });

    if (outcome.kind === "success") {
      const r = outcome.result as {
        policyId: string;
        displayName: string;
        state: string;
        idempotent: boolean;
      };
      // Distinguish idempotent no-op from a genuine new push. This is the
      // signal the UI surfaces back to the operator so they know the entity
      // already had this baseline — and what state they left it in.
      const resolvedStatus = outcome.simulated
        ? "simulated"
        : r.idempotent
          ? "already_applied"
          : "success";
      perTenant.push({
        tenantId,
        status: resolvedStatus,
        policyId: r.policyId,
        currentState: r.idempotent ? r.state : null,
        auditId: outcome.auditId,
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        // DB still only accepts success / simulated / failed / rolledback —
        // collapse already_applied to success there; the distinction lives
        // in the per-request summary and the immediate response.
        status: outcome.simulated ? "simulated" : "success",
        graphPolicyId: r.policyId,
      });
    } else {
      perTenant.push({
        tenantId,
        status: "failed",
        error: outcome.error,
        auditId: outcome.auditId,
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: "failed",
        errorMessage: outcome.error,
      });
    }
  }

  const anyFailure = perTenant.some((p) => p.status === "failed");
  const summary = { perTenant };
  finalizePushRequest(pushRequestId, anyFailure ? "failed" : "complete", summary);

  return NextResponse.json({
    ok: !anyFailure,
    pushRequestId,
    perTenant,
  });
}
