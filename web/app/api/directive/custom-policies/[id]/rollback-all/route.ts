import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  getCustomPolicy,
  idempotencyKeyForPolicy,
} from "@/lib/directive/custom-policies/store";
import { rollbackAllForBaseline } from "@/lib/directive/rollback-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/directive/custom-policies/{id}/rollback-all — remove this
 * wizard-authored policy from every entity that has it. Same mechanics
 * as the baseline variant (reuses rollbackAllForBaseline by matching the
 * stored baseline_id column = "custom:<id>").
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const numId = Number(id);
  const row = getCustomPolicy(numId);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await rollbackAllForBaseline(
    gate,
    `custom:${numId}`,
    idempotencyKeyForPolicy(numId),
  );
  return NextResponse.json({ ok: true, ...result });
}
