import { NextResponse, type NextRequest } from "next/server";
import { getTenant } from "@/lib/db/tenants";
import { syncTenant } from "@/lib/sync/orchestrator";
import { assertAzureConfigured } from "@/lib/config";
import { invalidateTenantToken } from "@/lib/graph/msal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    assertAzureConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: "not_configured", message: (err as Error).message },
      { status: 412 },
    );
  }
  // Manual-sync request (operator clicked "Sync now"). Drop any cached MSAL
  // token first, so a stale token from before a recent re-consent doesn't
  // cause the sync to fire with the old scope set. Cheap (single map clear)
  // and bounds the effect of token caching to one extra MSAL round trip. v2.5.24.
  if (req.nextUrl.searchParams.get("invalidateToken") !== "false") {
    invalidateTenantToken(tenant.tenant_id);
  }
  const result = await syncTenant(tenant);
  return NextResponse.json(result);
}
