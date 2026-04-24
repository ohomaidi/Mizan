import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import {
  createConditionalAccessPolicy,
  findCaPolicyByIdempotencyTag,
} from "@/lib/directive/graph-writes";
import {
  getCustomPolicy,
  idempotencyKeyForPolicy,
  parseSpec,
} from "@/lib/directive/custom-policies/store";
import { buildCaBodyFromSpec } from "@/lib/directive/custom-policies/builder";
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
 * POST /api/directive/custom-policies/{id}/push — push a wizard-authored
 * draft to the selected tenants. Flow is deliberately identical to the
 * baseline push route so rollback, idempotency, demo-sim, and audit all
 * work out of the box. The baseline_id column on directive_push_requests
 * is stamped as "custom:<id>" for tracing.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const numId = Number(id);
  const row = getCustomPolicy(numId);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "draft") {
    return NextResponse.json(
      { error: "policy_not_draft" },
      { status: 409 },
    );
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

  let spec: ReturnType<typeof parseSpec>;
  try {
    spec = parseSpec(row);
  } catch (e) {
    return NextResponse.json(
      { error: "spec_invalid", message: (e as Error).message.slice(0, 500) },
      { status: 409 },
    );
  }

  const idempotencyKey = idempotencyKeyForPolicy(numId);
  const policyBody = buildCaBodyFromSpec(
    overrideState ? { ...spec, state: overrideState } : spec,
    idempotencyKey,
  );

  const pushRequestId = createPushRequest({
    baselineId: `custom:${numId}`,
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
    currentState?: string | null;
    error?: string | null;
    auditId?: number;
  }> = [];

  for (const tenantId of targetTenantIds) {
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
      perTenant.push({ tenantId, status: "skipped_observation" });
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
      actionType: `baseline.push.custom:${numId}`,
      targetId: idempotencyKey,
      input: { policyBody, overrideState },
      simulatedResult: {
        policyId: `sim-${pushRequestId}-${tenantId}`,
        displayName: policyBody.displayName,
        state: policyBody.state,
        idempotent: false as const,
      },
      run: async ({ tenant }) => {
        const existing = await findCaPolicyByIdempotencyTag(
          tenant,
          idempotencyKey,
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
        status: outcome.simulated ? "simulated" : "success",
        // Same rollback-safety rule as baselines: only store graph_policy_id
        // for policies this push actually CREATED (not idempotent matches).
        graphPolicyId: r.idempotent ? null : r.policyId,
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
