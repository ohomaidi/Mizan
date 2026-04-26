import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshotsForTenant } from "@/lib/db/signals";
import {
  computeTenantClauseBreakdown,
  getActiveComplianceMapping,
  getActiveFramework,
} from "@/lib/config/compliance-framework";
import { getComplianceConfig } from "@/lib/config/compliance-config";
import { getOosSets } from "@/lib/db/compliance-oos";
import { BASELINES } from "@/lib/directive/baselines/registry";
import type { SecureScorePayload } from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/compliance-gap
 *
 * Per-clause coverage rolled up across the deployment, with concrete
 * baseline suggestions to push. Powers the Directive → Compliance tab,
 * answering "where is the deployment failing the active framework, and
 * which baselines should I push to fix it?".
 *
 * Two lookups happen here that are pure reads:
 *
 *   1. Per-clause coverage averaged across every consented tenant that
 *      reported Secure Score data, with the weakest entity for each
 *      clause surfaced so the operator can target the worst offender.
 *
 *   2. Heuristic baseline → clause mapping: any baseline whose
 *      idempotency key or display name contains a Secure Score control
 *      that maps to the clause is suggested. The match is deliberately
 *      loose — false positives are fine because the operator confirms
 *      before pushing; false NEGATIVES would hide real options.
 *
 * Response is intentionally compact — the UI renders ~13 rows and
 * needs everything in a single roundtrip to feel instant.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const mapping = getActiveComplianceMapping();
  const cfg = getComplianceConfig();
  const { frameworkId } = getActiveFramework();
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  // Cache global OOS once — applies to every tenant.
  const globalOos = getOosSets(frameworkId, null);

  type PerEntityClauseRow = {
    tenantId: string;
    nameEn: string;
    nameAr: string;
    coverage: number | null;
  };

  const perClause: Record<string, PerEntityClauseRow[]> = {};
  for (const c of mapping.clauses) perClause[c.id] = [];

  for (const t of tenants) {
    const ss = getLatestSnapshotsForTenant(t.id).secureScore?.payload as
      | SecureScorePayload
      | null
      | undefined;
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
    const oos = getOosSets(frameworkId, t.id);
    const breakdown = computeTenantClauseBreakdown(ssMap, oos);
    for (const r of breakdown) {
      // Skip rows the tenant has marked OOS — they shouldn't drag the
      // average. Global OOS is included in the breakdown's oosState
      // already; we treat it the same way (excluded from rollup).
      if (r.oosState !== "in-scope") continue;
      perClause[r.clauseId]?.push({
        tenantId: t.id,
        nameEn: t.name_en,
        nameAr: t.name_ar,
        coverage: r.coverage,
      });
    }
  }

  // Loose baseline → clause matcher. Each baseline has an `idempotencyKey`
  // and a `displayName` (derived from titleKey) we can string-match
  // against the SS control names + clause refs.
  function suggestBaselinesFor(
    secureScoreControls: string[],
    clauseRef: string,
  ): Array<{ id: string; titleKey: string; riskTier: string }> {
    const haystack =
      secureScoreControls.map((s) => s.toLowerCase()).join(" ") +
      " " +
      clauseRef.toLowerCase();
    const matches: Array<{ id: string; titleKey: string; riskTier: string }> =
      [];
    for (const b of BASELINES) {
      const idLower = b.descriptor.id.toLowerCase();
      const titleLower = b.descriptor.titleKey.toLowerCase();
      // crude signal — break id on dashes and look for any token in haystack
      const tokens = idLower.split(/[-_/]/).filter((s) => s.length > 2);
      const hits = tokens.filter((tok) => haystack.includes(tok)).length;
      if (
        hits >= 1 ||
        haystack.includes(idLower) ||
        haystack.includes(titleLower)
      ) {
        matches.push({
          id: b.descriptor.id,
          titleKey: b.descriptor.titleKey,
          riskTier: b.descriptor.riskTier,
        });
      }
    }
    return matches.slice(0, 4);
  }

  const target = cfg.target / 100;

  const clauses = mapping.clauses.map((c) => {
    const isGlobalOos = globalOos.globalClauses.has(c.id);
    const rows = perClause[c.id] ?? [];
    const scored = rows.filter(
      (r): r is PerEntityClauseRow & { coverage: number } =>
        r.coverage !== null,
    );
    const avg =
      scored.length === 0
        ? null
        : scored.reduce((a, b) => a + b.coverage, 0) / scored.length;
    const weakest =
      scored.length === 0
        ? null
        : scored
            .slice()
            .sort((a, b) => a.coverage - b.coverage)
            .slice(0, 3);
    const failingCount = scored.filter((r) => r.coverage < target).length;
    return {
      clauseId: c.id,
      ref: c.ref,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      classRefs: c.classRefs ?? [],
      weight: c.weight,
      averageCoverage: avg,
      entitiesScored: scored.length,
      entitiesFailing: failingCount,
      weakestEntities: weakest ?? [],
      secureScoreControls: c.secureScoreControls,
      customEvidenceCount: c.customEvidence?.length ?? 0,
      isGlobalOos,
      suggestedBaselines: isGlobalOos
        ? []
        : suggestBaselinesFor(c.secureScoreControls, c.ref),
    };
  });

  // Sort failing-first: lowest avg coverage among non-OOS clauses to
  // the top so the operator's eye lands on the highest-impact gap.
  const sorted = clauses.sort((a, b) => {
    if (a.isGlobalOos && !b.isGlobalOos) return 1;
    if (b.isGlobalOos && !a.isGlobalOos) return -1;
    const aCov = a.averageCoverage ?? 1;
    const bCov = b.averageCoverage ?? 1;
    return aCov - bCov;
  });

  return NextResponse.json({
    frameworkId: mapping.framework,
    frameworkVersion: mapping.frameworkVersion,
    target: cfg.target,
    consentedEntities: tenants.length,
    clauses: sorted,
  });
}
