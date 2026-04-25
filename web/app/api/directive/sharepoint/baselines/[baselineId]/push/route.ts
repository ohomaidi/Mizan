import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import { getSharepointBaseline } from "@/lib/directive/sharepoint/baselines";
import {
  getSharepointSettings,
  patchSharepointSettings,
  type SharepointSettings,
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
 * POST /api/directive/sharepoint/baselines/{id}/push — fan a SharePoint
 * tenant-settings baseline out to selected entities. SharePoint settings
 * are a singleton per tenant; the push model is GET → diff → PATCH (or
 * skip when the current settings already match the intended values).
 *
 * Rollback isn't supported: the directive_push_actions schema doesn't
 * carry the BEFORE state. Operators wanting to revert read the directive
 * audit log (which captures the before + after diff) and PATCH manually.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getSharepointBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json(
      { error: "baseline_not_found" },
      { status: 404 },
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

  const pushRequestId = createPushRequest({
    baselineId: `sharepoint:${baselineId}`,
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
      actionType: `baseline.push.sharepoint:${baselineId}`,
      targetId: baseline.idempotencyKey,
      input: { intendedPatch: baseline.intendedPatch },
      simulatedResult: {
        idempotent: false as const,
        before: {} as SharepointSettings,
        after: {} as SharepointSettings,
      },
      run: async ({ tenant }) => {
        // GET → diff → PATCH or skip. The diff is the surface-level
        // comparison: every key in intendedPatch must already match the
        // current settings for this push to be a no-op.
        const current = (await getSharepointSettings(
          tenant,
        )) as Record<string, unknown>;
        const intended = baseline.intendedPatch as Record<string, unknown>;
        let allMatch = true;
        for (const key of Object.keys(intended)) {
          const want = intended[key];
          const have = current[key];
          if (Array.isArray(want) && Array.isArray(have)) {
            if (
              want.length !== have.length ||
              want.some((v, i) => v !== have[i])
            ) {
              allMatch = false;
              break;
            }
          } else if (want !== have) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) {
          return {
            idempotent: true,
            before: current as SharepointSettings,
            after: current as SharepointSettings,
          } as const;
        }
        const after = await patchSharepointSettings(
          tenant,
          baseline.intendedPatch,
        );
        return {
          idempotent: false,
          before: current as SharepointSettings,
          after,
        } as const;
      },
    });

    if (outcome.kind === "success") {
      const r = outcome.result as {
        idempotent: boolean;
        before: SharepointSettings;
        after: SharepointSettings;
      };
      const status = outcome.simulated
        ? "simulated"
        : r.idempotent
          ? "already_applied"
          : "success";
      perTenant.push({
        tenantId,
        status,
        auditId: outcome.auditId,
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: outcome.simulated ? "simulated" : "success",
        // SharePoint singletons have no graph_policy_id — rollback is
        // out of scope, the audit log carries the before/after diff.
        graphPolicyId: null,
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
