import { NextResponse } from "next/server";
import { deleteTenant, getTenant } from "@/lib/db/tenants";
import {
  getEndpointHealthForTenant,
  getLatestSnapshotsForTenant,
} from "@/lib/db/signals";
import { computeForTenant } from "@/lib/compute/maturity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    tenant,
    signals: getLatestSnapshotsForTenant(id),
    health: getEndpointHealthForTenant(id),
    maturity: computeForTenant(id),
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const existing = getTenant(id);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  deleteTenant(id);
  return NextResponse.json({ ok: true });
}
