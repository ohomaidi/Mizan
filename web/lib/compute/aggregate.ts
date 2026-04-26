import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { computeForTenant, type MaturityBreakdown } from "./maturity";
import { computeMaturityAsOf, deltaFromAsOf } from "./deltas";
import { getMaturityConfig } from "@/lib/config/maturity-config";
import {
  computeTenantFrameworkScore,
  computeClauseCoverageForTenant,
  getActiveComplianceMapping,
} from "@/lib/config/compliance-framework";
import { getComplianceConfig } from "@/lib/config/compliance-config";
import { getLatestSnapshotsForTenant } from "@/lib/db/signals";
import type { SecureScorePayload } from "@/lib/graph/signals";
import type { ClusterId } from "@/lib/data/clusters";
import type { FrameworkId } from "@/lib/config/branding";

/**
 * Per-entity Framework Compliance breakdown — sits alongside the
 * Maturity Index as a primary metric. Where Maturity Index is a
 * balanced 6-sub-score posture number, Framework Compliance is the
 * single-axis "% aligned with the active regulatory framework"
 * (Dubai ISR for DESC, NESA for SCSC). Council displays both: one
 * answers "how well-protected is this entity?", the other answers
 * "how aligned with our regulator's framework?".
 */
export type FrameworkComplianceSummary = {
  frameworkId: FrameworkId;
  frameworkVersion: string;
  /**
   * 0..100 weighted-average coverage across the active framework's
   * clauses. Null when the entity has no observable evidence (no
   * Secure Score data + no custom evidence yet) AND the unscored-
   * treatment is "skip". When unscored-treatment is "zero", clauses
   * with no evidence count as 0% — the score is never null in that
   * case.
   */
  percent: number | null;
  /** Clauses that contributed to the score (had at least one evidence sample). */
  clausesScored: number;
  /** Total clauses in the active framework's catalog. */
  clausesTotal: number;
};

export type EntityRow = {
  id: string;
  tenantId: string;
  nameEn: string;
  nameAr: string;
  cluster: ClusterId;
  domain: string;
  ciso: string;
  cisoEmail: string;
  consentStatus: string;
  /** Per-entity directive posture — "observation" or "directive". */
  consentMode: "observation" | "directive";
  lastSyncAt: string | null;
  lastSyncOk: boolean;
  isDemo: boolean;
  connection: "green" | "amber" | "red" | "pending";
  maturity: MaturityBreakdown;
  /** Active framework's per-entity compliance summary (separate primary metric). */
  frameworkCompliance: FrameworkComplianceSummary;
  /** Maturity Index delta vs ~7 days ago; null if we don't have history that far back. */
  delta7d: number | null;
  /** Same, vs 30 days ago. */
  delta30d: number | null;
  /** QTD ≈ 90 days ago (quarter-approximation). */
  delta90d: number | null;
  /** YTD ≈ 180 days ago (half-year approximation). */
  delta180d: number | null;
};

export type CouncilKpis = {
  entitiesCount: number;
  entitiesConsented: number;
  entitiesPending: number;
  maturityIndex: number;          // mean across consented entities with data
  maturityDelta7d: number | null;
  maturityDelta30d: number | null;
  maturityDelta90d: number | null;  // QTD proxy
  maturityDelta180d: number | null; // YTD proxy
  belowTargetCount: number;
  controlsPassingPct: number;     // mean
  target: number;
  /**
   * Framework Compliance KPIs — separate primary metric for DESC
   * (and any future framework-driven Council). Mean % across
   * scored entities; below-target uses the configurable
   * `compliance.target` (default 70).
   */
  frameworkCompliance: {
    frameworkId: FrameworkId;
    frameworkVersion: string;
    percent: number;
    belowTargetCount: number;
    target: number;
    /** Entities in this rollup whose framework score is null (no evidence). */
    unscoredEntities: number;
  };
};

export type ClusterSummary = {
  id: ClusterId;
  currentIndex: number;           // mean across entities in cluster that have data
  /** Mean Framework Compliance % across entities in the cluster that scored. */
  frameworkCompliancePercent: number;
  entitiesCount: number;
};

/**
 * Council cares about two dimensions of entity health, in this order:
 *   1. Is consent in place? (no → `pending`)
 *   2. How fresh is the most-recent sync? (>48h → `amber`, the scheduler
 *      missed a day — something external is wrong even if the last sync
 *      technically succeeded).
 *   3. Did the last sync's primary signals succeed? (no → `red`).
 *
 * The 48h threshold is 2× the default daily-sync cadence. Operators
 * running hourly syncs can set SCSC_STALE_HOURS in env to tighten it;
 * we intentionally default loose so a single missed sync doesn't alarm.
 */
const STALE_HOURS = Number(process.env.SCSC_STALE_HOURS ?? "48");

function connectionFor(row: {
  consent_status: string;
  last_sync_ok: 0 | 1;
  last_sync_at: string | null;
}): "green" | "amber" | "red" | "pending" {
  if (row.consent_status !== "consented") return "pending";
  if (!row.last_sync_at) return "amber";

  const ageHours =
    (Date.now() - new Date(row.last_sync_at).getTime()) / 3_600_000;
  if (Number.isFinite(ageHours) && ageHours > STALE_HOURS) return "amber";

  if (row.last_sync_ok === 1) return "green";
  return "red";
}

/**
 * Compute a tenant's Framework Compliance summary from the latest
 * Secure Score snapshot. Pulled out so the entity-detail page +
 * grid + KPI rollup all use the same calculation. The active
 * framework is read at the catalog layer — switching from NESA to
 * Dubai ISR via Branding flips this rollup automatically.
 */
function frameworkComplianceForTenant(
  tenantId: string,
): FrameworkComplianceSummary {
  const mapping = getActiveComplianceMapping();
  const cfg = getComplianceConfig();
  const ss = getLatestSnapshotsForTenant(tenantId).secureScore?.payload as
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
  const fw = computeTenantFrameworkScore(ssMap, cfg.unscoredTreatment);
  return {
    frameworkId: mapping.framework,
    frameworkVersion: mapping.frameworkVersion,
    percent:
      fw.percent === null ? null : Math.round(fw.percent * 10) / 10,
    clausesScored: fw.clausesScored,
    clausesTotal: fw.clausesTotal,
  };
}

export function loadEntities(): EntityRow[] {
  return listTenants().map((t) => {
    const maturity = computeForTenant(t.id);
    const frameworkCompliance = frameworkComplianceForTenant(t.id);
    const asOf7 = computeMaturityAsOf(t.id, 7);
    const asOf30 = computeMaturityAsOf(t.id, 30);
    const asOf90 = computeMaturityAsOf(t.id, 90);
    const asOf180 = computeMaturityAsOf(t.id, 180);
    return {
      id: t.id,
      tenantId: t.tenant_id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      domain: t.domain,
      ciso: t.ciso,
      cisoEmail: t.ciso_email,
      consentStatus: t.consent_status,
      consentMode: t.consent_mode,
      lastSyncAt: t.last_sync_at,
      lastSyncOk: t.last_sync_ok === 1,
      isDemo: t.is_demo === 1,
      connection: connectionFor(t),
      maturity,
      frameworkCompliance,
      delta7d: deltaFromAsOf(maturity.index, asOf7),
      delta30d: deltaFromAsOf(maturity.index, asOf30),
      delta90d: deltaFromAsOf(maturity.index, asOf90),
      delta180d: deltaFromAsOf(maturity.index, asOf180),
    };
  });
}

export function loadCouncilKpis(): {
  kpis: CouncilKpis;
  clusters: ClusterSummary[];
} {
  const rows = loadEntities();
  const withData = rows.filter((r) => r.maturity.hasData);
  const COUNCIL_TARGET = getMaturityConfig().target;

  const mean = (ns: number[]) =>
    ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : 0;

  const deltasMean = (vals: Array<number | null>): number | null => {
    const nums = vals.filter((v): v is number => typeof v === "number");
    return nums.length ? mean(nums) : null;
  };

  // Framework Compliance rollups — computed independently of the
  // maturity index so DESC sees both numbers side by side.
  const fwCfg = getComplianceConfig();
  const fwMapping = getActiveComplianceMapping();
  const scoredFw = withData.filter(
    (r): r is EntityRow & { frameworkCompliance: { percent: number } } =>
      r.frameworkCompliance.percent !== null,
  );

  const kpis: CouncilKpis = {
    entitiesCount: rows.length,
    entitiesConsented: rows.filter((r) => r.consentStatus === "consented").length,
    entitiesPending: rows.filter((r) => r.consentStatus === "pending").length,
    maturityIndex: mean(withData.map((r) => r.maturity.index)),
    maturityDelta7d: deltasMean(withData.map((r) => r.delta7d)),
    maturityDelta30d: deltasMean(withData.map((r) => r.delta30d)),
    maturityDelta90d: deltasMean(withData.map((r) => r.delta90d)),
    maturityDelta180d: deltasMean(withData.map((r) => r.delta180d)),
    belowTargetCount: withData.filter((r) => r.maturity.index < COUNCIL_TARGET).length,
    controlsPassingPct: mean(withData.map((r) => r.maturity.controlsPassingPct)),
    target: COUNCIL_TARGET,
    frameworkCompliance: {
      frameworkId: fwMapping.framework,
      frameworkVersion: fwMapping.frameworkVersion,
      percent: mean(scoredFw.map((r) => r.frameworkCompliance.percent)),
      belowTargetCount: scoredFw.filter(
        (r) => r.frameworkCompliance.percent < fwCfg.target,
      ).length,
      target: fwCfg.target,
      unscoredEntities: withData.length - scoredFw.length,
    },
  };

  const clusters: ClusterSummary[] = (
    ["police", "health", "edu", "municipality", "utilities", "transport"] as const
  ).map((id) => {
    const inCluster = withData.filter((r) => r.cluster === id);
    const inClusterScored = inCluster.filter(
      (r): r is EntityRow & { frameworkCompliance: { percent: number } } =>
        r.frameworkCompliance.percent !== null,
    );
    return {
      id,
      currentIndex: mean(inCluster.map((r) => r.maturity.index)),
      frameworkCompliancePercent: mean(
        inClusterScored.map((r) => r.frameworkCompliance.percent),
      ),
      entitiesCount: inCluster.length,
    };
  });

  return { kpis, clusters };
}
