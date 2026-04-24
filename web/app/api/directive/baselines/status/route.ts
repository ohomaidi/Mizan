import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getBaselineStatusForTenant } from "@/lib/directive/baseline-status";
import { getTenant } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/baselines/status?tenantId=<id>
 *
 * Returns the current state of every Mizan baseline inside a specific
 * entity's tenant. Lets the Center answer "did they flip it from
 * report-only to enabled after we pushed?" without opening Entra.
 *
 * viewer role is sufficient — this is a read, and the underlying Graph
 * call uses the same delegated list permission all reads use.
 */
export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const tenantId = new URL(req.url).searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId_required" }, { status: 400 });
  }
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }
  if (tenant.consent_mode !== "directive") {
    return NextResponse.json(
      { error: "tenant_not_directive" },
      { status: 409 },
    );
  }

  try {
    const result = await getBaselineStatusForTenant(tenantId);
    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    return NextResponse.json(
      { error: "status_failed", message: message.slice(0, 500) },
      { status: 502 },
    );
  }
}
