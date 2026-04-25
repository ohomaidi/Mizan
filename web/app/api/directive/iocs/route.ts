import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
} from "@/lib/directive/engine";
import {
  createTiIndicator,
  findTiIndicatorByMizanTag,
  type TiIndicatorBody,
} from "@/lib/directive/graph-writes";
import { getTenant } from "@/lib/db/tenants";
import {
  createPushRequest,
  finalizePushRequest,
  recordPushAction,
} from "@/lib/directive/push-store";
import { createIocRow, listIocs } from "@/lib/directive/iocs/store";
import {
  IocPushBodySchema,
  iocMizanTag,
  type IocPushBody,
} from "@/lib/directive/iocs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/iocs — list operator-authored IOCs (Mizan-side).
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const rows = listIocs(200);
  return NextResponse.json({
    iocs: rows.map((r) => ({
      id: r.id,
      ownerUserId: r.owner_user_id,
      type: r.type,
      value: r.value,
      action: r.action,
      severity: r.severity,
      description: r.description,
      internalNote: r.internal_note,
      expirationDate: r.expiration_date,
      createdAt: r.created_at,
    })),
  });
}

/**
 * POST /api/directive/iocs — create + push an IOC to selected entities.
 *
 * Mizan stores the operator-authored IOC server-side, then fans out to
 * every consented directive entity, creating one Defender for Endpoint
 * `tiIndicator` per tenant. The push lands on directive_push_requests
 * with baseline_id "ioc:<localId>" so rollback + audit work the same
 * way they do for CA / Intune.
 */
export async function POST(req: NextRequest) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = IocPushBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data: IocPushBody = parsed.data;

  // Default expiration to 90 days from now if the operator left it blank.
  const expirationIso =
    data.expirationDateTime ??
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const localId = createIocRow({
    ownerUserId: gate.user?.id ?? null,
    body: data,
    expirationIso,
  });
  const mizanTag = iocMizanTag(String(localId));

  const pushRequestId = createPushRequest({
    baselineId: `ioc:${localId}`,
    targetTenantIds: data.targetTenantIds,
    options: { type: data.type, action: data.action, severity: data.severity },
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
    indicatorId?: string | null;
    error?: string | null;
    auditId?: number;
  }> = [];

  // Build the Graph body once. Field assignment depends on indicator type.
  const indicatorPayload: TiIndicatorBody = {
    targetProduct: "Microsoft Defender ATP",
    threatType: "WatchList",
    action: data.action,
    severity: severityNumber(data.severity),
    description: `${mizanTag} ${data.description}`,
    expirationDateTime: expirationIso,
  };
  switch (data.type) {
    case "fileHashSha256":
      indicatorPayload.fileHashType = "sha256";
      indicatorPayload.fileHashValue = data.value;
      break;
    case "fileHashSha1":
      indicatorPayload.fileHashType = "sha1";
      indicatorPayload.fileHashValue = data.value;
      break;
    case "url":
      indicatorPayload.url = data.value;
      break;
    case "domainName":
      indicatorPayload.domainName = data.value;
      break;
    case "ipv4":
      indicatorPayload.networkDestinationIPv4 = data.value;
      break;
    case "ipv6":
      indicatorPayload.networkDestinationIPv6 = data.value;
      break;
  }

  for (const tenantId of data.targetTenantIds) {
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
      actionType: `baseline.push.ioc:${localId}`,
      targetId: mizanTag,
      input: { type: data.type, value: data.value, action: data.action },
      simulatedResult: {
        indicatorId: `sim-ioc-${localId}-${tenantId}`,
        idempotent: false as const,
      },
      run: async ({ tenant }) => {
        const existing = await findTiIndicatorByMizanTag(tenant, mizanTag);
        if (existing) {
          return {
            indicatorId: existing.id,
            idempotent: true,
          } as const;
        }
        const created = await createTiIndicator(tenant, indicatorPayload);
        return {
          indicatorId: created.id,
          idempotent: false,
        } as const;
      },
    });

    if (outcome.kind === "success") {
      const r = outcome.result as {
        indicatorId: string;
        idempotent: boolean;
      };
      const status = outcome.simulated
        ? "simulated"
        : r.idempotent
          ? "already_applied"
          : "success";
      perTenant.push({
        tenantId,
        status,
        indicatorId: r.indicatorId,
        auditId: outcome.auditId,
      });
      recordPushAction({
        pushRequestId,
        tenantId,
        status: outcome.simulated ? "simulated" : "success",
        // Same rollback-safety rule: only the push that CREATED the
        // indicator should be able to delete it on rollback.
        graphPolicyId: r.idempotent ? null : r.indicatorId,
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
    { perTenant, iocId: localId },
  );

  return NextResponse.json({
    ok: !anyFailure,
    iocId: localId,
    pushRequestId,
    perTenant,
  });
}

/** Map our enum to Microsoft's tiIndicator severity int (0..5 historically). */
function severityNumber(level: string): number {
  switch (level) {
    case "informational":
      return 1;
    case "low":
      return 2;
    case "medium":
      return 3;
    case "high":
      return 4;
    default:
      return 3;
  }
}
