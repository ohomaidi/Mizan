import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { INTUNE_BASELINES } from "@/lib/directive/intune/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/intune/baselines — list the 7 Intune baselines.
 * Viewer role is sufficient; this is a catalog read.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    baselines: INTUNE_BASELINES.map((b) => ({
      id: b.descriptor.id,
      kind: b.descriptor.kind,
      titleKey: b.descriptor.titleKey,
      bodyKey: b.descriptor.bodyKey,
      riskTier: b.descriptor.riskTier,
      platform: b.descriptor.platform,
      targetSummary: b.descriptor.targetSummary,
      effectSummary: b.descriptor.effectSummary,
      whyKey: b.descriptor.whyKey,
      impactKey: b.descriptor.impactKey,
      prerequisitesKey: b.descriptor.prerequisitesKey,
      rolloutAdviceKey: b.descriptor.rolloutAdviceKey,
      docsUrl: b.descriptor.docsUrl,
      idempotencyKey: b.idempotencyKey,
    })),
  });
}
