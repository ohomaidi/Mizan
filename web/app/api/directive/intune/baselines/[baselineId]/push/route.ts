import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import { getIntuneBaseline } from "@/lib/directive/intune/registry";
import {
  createPolicyByKind,
  findPolicyByKindAndTag,
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
});

/**
 * POST /api/directive/intune/baselines/{id}/push — fan out the Intune
 * baseline to each selected tenant. Behaviour is deliberately parallel
 * to the CA baseline push route so rollback, idempotency, demo-sim, and
 * audit all work identically.
 *
 * The baseline_id column on push_requests is stamped as "intune:<id>"
 * so push history + rollback can distinguish kinds.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getIntuneBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json(
      { error: "baseline_not_found" },
      { status: 404 },
    );
  }

  // Phase 14 ASR baselines are gated until they're rewritten to use
  // Settings Catalog. The current `windows10EndpointProtectionConfiguration`
  // body would 400 against Graph because the v1.0 schema has no ASR field
  // collection — ASR is exposed on the BETA flavour of that resource as
  // discrete named fields (defenderOfficeAppsLaunchChildProcessType etc.),
  // not as an array. See backlog: project_sharjah_council_backlog.md
  // ("Phase 14 ASR rewrite to Settings Catalog").
  if (baselineId.startsWith("intune-asr-")) {
    return NextResponse.json(
      {
        error: "coming_soon",
        message:
          "ASR baselines are coming soon. Push is disabled until the Phase 14 Settings Catalog rewrite ships. The catalog UI remains available for review.",
      },
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
  const { targetTenantIds } = parsed.data;
  const policyBody = baseline.buildPolicyBody({});

  const pushRequestId = createPushRequest({
    baselineId: `intune:${baselineId}`,
    targetTenantIds,
    options: {},
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
      actionType: `baseline.push.intune:${baselineId}`,
      targetId: baseline.idempotencyKey,
      input: { kind: baseline.descriptor.kind, policyBody },
      simulatedResult: {
        policyId: `sim-${pushRequestId}-${tenantId}`,
        displayName: String(policyBody.displayName),
        idempotent: false as const,
      },
      run: async ({ tenant }) => {
        const existing = await findPolicyByKindAndTag(
          baseline.descriptor.kind,
          tenant,
          baseline.idempotencyKey,
        );
        if (existing) {
          return {
            policyId: existing.id,
            displayName: existing.displayName,
            idempotent: true,
          } as const;
        }
        const created = await createPolicyByKind(
          baseline.descriptor.kind,
          tenant,
          policyBody,
        );
        return {
          policyId: created.id,
          displayName: created.displayName,
          idempotent: false,
        } as const;
      },
    });

    if (outcome.kind === "success") {
      const r = outcome.result as {
        policyId: string;
        displayName: string;
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
        auditId: outcome.auditId,
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: outcome.simulated ? "simulated" : "success",
        // Same rollback-safety rule as CA: only store graph_policy_id
        // when this push actually CREATED the policy, not when it matched.
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
  finalizePushRequest(
    pushRequestId,
    anyFailure ? "failed" : "complete",
    { perTenant },
  );

  return NextResponse.json({
    ok: !anyFailure,
    pushRequestId,
    perTenant,
  });
}
