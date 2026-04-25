import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { SHAREPOINT_BASELINES } from "@/lib/directive/sharepoint/baselines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/sharepoint/baselines — list the SharePoint
 * tenant-settings baselines.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    baselines: SHAREPOINT_BASELINES.map((b) => ({
      id: b.descriptor.id,
      titleKey: b.descriptor.titleKey,
      bodyKey: b.descriptor.bodyKey,
      riskTier: b.descriptor.riskTier,
      effectSummary: b.descriptor.effectSummary,
      whyKey: b.descriptor.whyKey,
      impactKey: b.descriptor.impactKey,
      prerequisitesKey: b.descriptor.prerequisitesKey,
      rolloutAdviceKey: b.descriptor.rolloutAdviceKey,
      docsUrl: b.descriptor.docsUrl,
      idempotencyKey: b.idempotencyKey,
      intendedPatch: b.intendedPatch,
    })),
  });
}
