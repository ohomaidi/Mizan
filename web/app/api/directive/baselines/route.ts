import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { BASELINES } from "@/lib/directive/baselines/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/baselines — list available baselines. Powers the
 * "Baselines" section on /directive. viewer role is sufficient since this
 * is a read of the catalog, not a push.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    baselines: BASELINES.map((b) => ({
      id: b.descriptor.id,
      titleKey: b.descriptor.titleKey,
      bodyKey: b.descriptor.bodyKey,
      riskTier: b.descriptor.riskTier,
      targetSummary: b.descriptor.targetSummary,
      grantSummary: b.descriptor.grantSummary,
      initialState: b.descriptor.initialState,
      excludesOwnAdmins: b.descriptor.excludesOwnAdmins,
      idempotencyKey: b.idempotencyKey,
    })),
  });
}
