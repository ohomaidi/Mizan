import { NextResponse } from "next/server";
import { listSecureScoreControlRegistry } from "@/lib/db/secure-score-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/config/secure-score-controls
 *
 * Returns the union of every Secure Score control observed across
 * every consented tenant's latest snapshot, with metadata + average
 * pass-rate. Backs the multi-select picker on the compliance-framework
 * settings panel: replaces the old comma-separated text input that
 * required operators to remember 200+ Microsoft control IDs from
 * memory.
 *
 * No filtering / pagination — the catalog is small enough (~250
 * controls in the heaviest E5 tenants) to ship in one call. Client-side
 * search handles narrowing.
 */
export async function GET() {
  const controls = listSecureScoreControlRegistry();
  return NextResponse.json({
    controls,
    total: controls.length,
  });
}
