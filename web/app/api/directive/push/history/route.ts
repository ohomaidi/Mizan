import { type NextRequest, NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { listActionsForTenant } from "@/lib/directive/push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/push/history?tenantId=<id>&limit=N
 *
 * Per-tenant push history — every Directive push action that landed on
 * this entity, newest first. Powers the entity detail Framework tab
 * "Deployed via Directive" panel so an operator authoring new pushes
 * can see which baselines have already executed against this entity
 * before adding more.
 *
 * Response shape:
 *   { actions: Array<{ id, push_request_id, tenant_id, status,
 *                       graph_policy_id, error_message, at,
 *                       baseline_id }> }
 *
 * Returns 400 when tenantId is missing — this endpoint is intentionally
 * scoped (no global "all-tenant" listing here; that's `/pushes`).
 */
export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id" }, { status: 400 });
  }
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw
    ? Math.max(1, Math.min(200, Number(limitRaw) || 50))
    : 50;
  const actions = listActionsForTenant(tenantId, limit);
  return NextResponse.json({ actions });
}
