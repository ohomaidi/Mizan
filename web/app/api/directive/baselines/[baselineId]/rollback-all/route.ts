import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getBaseline } from "@/lib/directive/baselines/registry";
import { rollbackAllForBaseline } from "@/lib/directive/rollback-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/directive/baselines/{baselineId}/rollback-all
 *
 * DELETE this baseline's CA policy from every entity that has it. Used
 * by "Remove from all entities" in the UI. Same auditing + demo-sim as
 * a push-scoped rollback; see rollbackAllForBaseline for details.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json({ error: "baseline_not_found" }, { status: 404 });
  }
  const result = await rollbackAllForBaseline(
    gate,
    baselineId,
    baseline.idempotencyKey,
  );
  return NextResponse.json({ ok: true, ...result });
}
