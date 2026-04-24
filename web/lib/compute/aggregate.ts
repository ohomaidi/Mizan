import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { computeForTenant, type MaturityBreakdown } from "./maturity";
import { computeMaturityAsOf, deltaFromAsOf } from "./deltas";
import { getMaturityConfig } from "@/lib/config/maturity-config";
import type { ClusterId } from "@/lib/data/clusters";

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
};

export type ClusterSummary = {
  id: ClusterId;
  currentIndex: number;           // mean across entities in cluster that have data
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

export function loadEntities(): EntityRow[] {
  return listTenants().map((t) => {
    const maturity = computeForTenant(t.id);
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
  };

  const clusters: ClusterSummary[] = (
    ["police", "health", "edu", "municipality", "utilities", "transport"] as const
  ).map((id) => {
    const inCluster = withData.filter((r) => r.cluster === id);
    return {
      id,
      currentIndex: mean(inCluster.map((r) => r.maturity.index)),
      entitiesCount: inCluster.length,
    };
  });

  return { kpis, clusters };
}
