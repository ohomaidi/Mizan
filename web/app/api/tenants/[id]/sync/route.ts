import { NextResponse } from "next/server";
import { getTenant } from "@/lib/db/tenants";
import { syncTenant } from "@/lib/sync/orchestrator";
import { assertAzureConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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
  const result = await syncTenant(tenant);
  return NextResponse.json(result);
}
