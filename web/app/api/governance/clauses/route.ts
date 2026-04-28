import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshotsForTenant } from "@/lib/db/signals";
import {
  computeClauseCoverageForTenant,
  getActiveComplianceMapping,
  getActiveFramework,
} from "@/lib/config/compliance-framework";
import { getOosSets } from "@/lib/db/compliance-oos";
import type {
  SecureScoreControl,
  SecureScorePayload,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Council-wide per-clause rollup for the active compliance framework.
 *
 * Drives the Governance page's domain-detail modal (v2.5.32). The
 * /governance summary table only renders one row per clause with a
 * synthesized coverage % — operators want to drill in and see exactly
 * which Microsoft Secure Score controls evidence each clause and which
 * entities are passing or failing each one.
 *
 * Per clause we return:
 *   - the static catalog metadata (title, description, weight, classRefs,
 *     custom evidence list)
 *   - the Microsoft Secure Score controls that map to it, with each
 *     control's per-entity pass-rate aggregated into a Council-wide
 *     mean
 *   - the per-entity coverage breakdown (which entities scored, which
 *     failed, which had no data) so operators can see WHO is dragging
 *     the score
 *   - the mean coverage across scored entities (the honest version of
 *     the synthesized number on the summary page)
 */
export async function GET() {
  const mapping = getActiveComplianceMapping();
  const { frameworkId } = getActiveFramework();
  const tenants = listTenants().filter(
    (t) => t.is_demo === 1 || t.consent_status === "consented",
  );

  // Pre-compute the per-tenant secure-score map once so we don't re-walk
  // the snapshot table for every clause.
  const tenantSsMaps = new Map<
    string,
    Map<string, { score: number | null; maxScore: number | null }>
  >();
  const tenantControlsByName = new Map<
    string,
    Map<string, SecureScoreControl>
  >();
  const tenantNamesById = new Map<
    string,
    { id: string; tenantId: string; nameEn: string; nameAr: string }
  >();
  for (const t of tenants) {
    tenantNamesById.set(t.id, {
      id: t.id,
      tenantId: t.tenant_id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
    });
    const ss = getLatestSnapshotsForTenant(t.id).secureScore?.payload as
      | SecureScorePayload
      | null
      | undefined;
    const m = new Map<string, { score: number | null; maxScore: number | null }>();
    const byName = new Map<string, SecureScoreControl>();
    if (ss && Array.isArray(ss.controls)) {
      for (const c of ss.controls) {
        m.set(c.id, { score: c.score ?? null, maxScore: c.maxScore ?? null });
        byName.set(c.id, c);
      }
    }
    tenantSsMaps.set(t.id, m);
    tenantControlsByName.set(t.id, byName);
  }

  const clauses = mapping.clauses.map((clause) => {
    const oosByTenant = new Map<
      string,
      "in-scope" | "global-oos" | "tenant-oos"
    >();
    const perEntity: Array<{
      entityId: string;
      entityNameEn: string;
      entityNameAr: string;
      coverage: number | null;
      samples: number;
      oosState: "in-scope" | "global-oos" | "tenant-oos";
    }> = [];

    for (const t of tenants) {
      const sets = getOosSets(frameworkId, t.id);
      const oosState: "in-scope" | "global-oos" | "tenant-oos" = sets
        .globalClauses.has(clause.id)
        ? "global-oos"
        : sets.tenantClauses.has(clause.id)
          ? "tenant-oos"
          : "in-scope";
      oosByTenant.set(t.id, oosState);
      const oosControls = new Set<string>([
        ...sets.globalControls,
        ...sets.tenantControls,
      ]);
      const ssMap = tenantSsMaps.get(t.id) ?? new Map();
      const r = computeClauseCoverageForTenant(clause, ssMap, {
        controls: oosControls,
      });
      const meta = tenantNamesById.get(t.id)!;
      perEntity.push({
        entityId: t.id,
        entityNameEn: meta.nameEn,
        entityNameAr: meta.nameAr,
        coverage: r.coverage,
        samples: r.samples,
        oosState,
      });
    }

    // Mean across entities that contributed evidence (samples > 0) AND
    // are not OOS. Mirrors the "skip when no data" mode of the headline
    // score — if half your tenants have no evidence on a clause, you
    // shouldn't drag the mean to zero.
    const scored = perEntity.filter(
      (r) => r.oosState === "in-scope" && r.coverage !== null,
    );
    const meanCoverage =
      scored.length === 0
        ? null
        : Math.round(
            (scored.reduce((n, r) => n + (r.coverage ?? 0), 0) /
              scored.length) *
              1000,
          ) / 10;

    // Council-wide pass-rate per Microsoft Secure Score control that
    // evidences this clause. For each control, walk every tenant's SS
    // payload, average score/maxScore where present.
    const controls = clause.secureScoreControls.map((controlId) => {
      const passRates: number[] = [];
      let entitiesPassing = 0;
      let entitiesFailing = 0;
      let entitiesUnscored = 0;
      let title: string | null = null;
      let category: string | null = null;
      let service: string | null = null;
      for (const t of tenants) {
        if (oosByTenant.get(t.id) !== "in-scope") continue;
        const c = tenantControlsByName.get(t.id)?.get(controlId);
        if (!c) {
          entitiesUnscored++;
          continue;
        }
        if (!title) title = c.title;
        if (!category) category = c.category;
        if (!service) service = c.service;
        if (
          c.score === null ||
          c.maxScore === null ||
          c.maxScore === 0
        ) {
          entitiesUnscored++;
          continue;
        }
        const rate = c.score / c.maxScore;
        passRates.push(rate);
        if (rate >= 0.999) entitiesPassing++;
        else entitiesFailing++;
      }
      const meanPassRate =
        passRates.length === 0
          ? null
          : Math.round(
              (passRates.reduce((n, r) => n + r, 0) / passRates.length) *
                1000,
            ) / 10;
      return {
        id: controlId,
        title,
        category,
        service,
        meanPassRate,
        entitiesPassing,
        entitiesFailing,
        entitiesUnscored,
      };
    });

    return {
      clauseId: clause.id,
      ref: clause.ref,
      classRefs: clause.classRefs ?? [],
      titleEn: clause.titleEn,
      titleAr: clause.titleAr,
      descriptionEn: clause.descriptionEn,
      descriptionAr: clause.descriptionAr,
      weight: clause.weight,
      meanCoverage,
      scoredEntities: scored.length,
      totalEntities: perEntity.filter((r) => r.oosState === "in-scope")
        .length,
      controls,
      customEvidence: clause.customEvidence ?? [],
      perEntity,
    };
  });

  return NextResponse.json({
    frameworkId: mapping.framework,
    frameworkVersion: mapping.frameworkVersion,
    status: mapping.status,
    clauses,
  });
}
