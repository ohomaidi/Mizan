import { NextResponse } from "next/server";
import { getTenant } from "@/lib/db/tenants";
import {
  getEndpointHealthForTenant,
  getLatestSnapshotsForTenant,
} from "@/lib/db/signals";
import { computeForTenant } from "@/lib/compute/maturity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Entity "card" export: a single JSON document snapshotting posture + connection health.
// Useful for archival, for sharing with the entity's CISO, or for offline review.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payload = {
    generatedAt: new Date().toISOString(),
    tenant,
    maturity: computeForTenant(id),
    signals: getLatestSnapshotsForTenant(id),
    endpointHealth: getEndpointHealthForTenant(id),
  };

  const filename = `scsc-entity-${id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
