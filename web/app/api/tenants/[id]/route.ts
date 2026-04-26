import { NextResponse } from "next/server";
import { deleteTenant, getTenant } from "@/lib/db/tenants";
import {
  getEndpointHealthForTenant,
  getLatestSnapshotsForTenant,
} from "@/lib/db/signals";
import { computeForTenant } from "@/lib/compute/maturity";
import {
  computeTenantFrameworkScore,
  computeTenantClauseBreakdown,
  getActiveComplianceMapping,
  getActiveFramework,
} from "@/lib/config/compliance-framework";
import { getComplianceConfig } from "@/lib/config/compliance-config";
import { getOosSets } from "@/lib/db/compliance-oos";
import type { SecureScorePayload } from "@/lib/graph/signals";

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

  const signals = getLatestSnapshotsForTenant(id);

  // Build the SS-control map once, reuse for both summary + breakdown.
  const ss = signals.secureScore?.payload as SecureScorePayload | null | undefined;
  const ssMap = new Map<
    string,
    { score: number | null; maxScore: number | null }
  >();
  if (ss && Array.isArray(ss.controls)) {
    for (const c of ss.controls) {
      ssMap.set(c.id, {
        score: c.score ?? null,
        maxScore: c.maxScore ?? null,
      });
    }
  }
  const fwCfg = getComplianceConfig();
  const fwMapping = getActiveComplianceMapping();
  // Resolve OOS sets for THIS tenant — global tier always; per-tenant
  // tier overlaid on top. Both the headline % and the breakdown rows
  // need to honor the same set so the panel UI stays internally
  // consistent (clauses with the OOS chip aren't counted in the score).
  const { frameworkId } = getActiveFramework();
  const oos = getOosSets(frameworkId, id);
  const fwScore = computeTenantFrameworkScore(
    ssMap,
    fwCfg.unscoredTreatment,
    oos,
  );
  const fwBreakdown = computeTenantClauseBreakdown(ssMap, oos);

  return NextResponse.json({
    tenant,
    signals,
    health: getEndpointHealthForTenant(id),
    maturity: computeForTenant(id),
    frameworkCompliance: {
      frameworkId: fwMapping.framework,
      frameworkVersion: fwMapping.frameworkVersion,
      target: fwCfg.target,
      unscoredTreatment: fwCfg.unscoredTreatment,
      percent:
        fwScore.percent === null
          ? null
          : Math.round(fwScore.percent * 10) / 10,
      clausesScored: fwScore.clausesScored,
      clausesTotal: fwScore.clausesTotal,
      clausesOos: fwScore.clausesOos,
      breakdown: fwBreakdown,
    },
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
