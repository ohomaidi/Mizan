import "server-only";
import { listTenants, type TenantRow } from "@/lib/db/tenants";
import { computeForTenant } from "@/lib/compute/maturity";
import {
  listMaturitySnapshotsForTenant,
  type MaturitySnapshotRow,
} from "@/lib/db/maturity-snapshots";
import { listRisks, type RiskRow } from "@/lib/db/risk-register";
import { listPins, type ScorecardPin } from "@/lib/db/scorecard";
import { computeKpiValue, getCatalogEntry } from "@/lib/scorecard/catalog";
import { getLatestSnapshot } from "@/lib/db/signals";
import type { IncidentsPayload } from "@/lib/graph/signals";
import { buildChangeFeed, type ChangeFeedEvent } from "./change-feed";

/**
 * Today page · server-side data shape.
 *
 * One round-trip from page.tsx — composes everything Today needs from
 * the existing data layer. No new tables, no new endpoints. The page
 * is a server component so this just runs at request time.
 *
 * v2.6.1 — Executive-mode IA fix.
 */

export type TodayHero = {
  index: number | null;
  delta7d: number | null;
  /** Latest sub-scores for the inline mini-radar inside the hero. */
  subScores: {
    secureScore: number;
    identity: number;
    device: number;
    data: number;
    threat: number;
    compliance: number;
  } | null;
  /** When the latest data was captured. */
  capturedAt: string | null;
};

export type TodayPinnedKpi = {
  pin: ScorecardPin;
  current: number | null;
  status: "onTrack" | "atRisk" | "met" | "missed" | "unknown";
  unit: "percent" | "count" | "hours" | "boolean";
  direction: "higherBetter" | "lowerBetter";
  /** Translated label key (uses pin.label override if set, else catalog). */
  labelKey: string;
};

export type TodayData = {
  tenant: TenantRow | null;
  hero: TodayHero;
  topRisks: RiskRow[];
  openIncidents: { active: number; high: number; total: number };
  pinnedKpis: TodayPinnedKpi[];
  changeFeed: ChangeFeedEvent[];
};

/**
 * Resolve the tenant the Today page is "about". In Executive mode
 * there is exactly one consented entity — the deployment's own
 * organisation. Falls back to the demo tenant for showcase boots.
 */
export function resolveExecutiveTenant(): TenantRow | null {
  const all = listTenants();
  return (
    all.find((t) => t.consent_status === "consented") ??
    all.find((t) => t.is_demo === 1) ??
    all[0] ??
    null
  );
}

/**
 * Find the maturity snapshot ~7 days ago. Falls back to the OLDEST
 * snapshot in the series if there isn't a "≤7d ago" row yet so the
 * delta still renders sensibly on freshly-seeded demos.
 */
function maturityWeekAgo(
  series: MaturitySnapshotRow[],
): MaturitySnapshotRow | null {
  if (series.length === 0) return null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const olderThan7d = series.filter(
    (s) => new Date(s.captured_at).getTime() <= sevenDaysAgo,
  );
  if (olderThan7d.length > 0) return olderThan7d[olderThan7d.length - 1];
  // No row that's ≥7d old yet — use the oldest available so the page
  // can still tell a "vs first observation" story instead of going
  // empty.
  return series[0];
}

export function buildTodayData(): TodayData {
  const tenant = resolveExecutiveTenant();

  if (!tenant) {
    return {
      tenant: null,
      hero: { index: null, delta7d: null, subScores: null, capturedAt: null },
      topRisks: [],
      openIncidents: { active: 0, high: 0, total: 0 },
      pinnedKpis: [],
      changeFeed: [],
    };
  }

  // Hero — current maturity + 7d delta + sub-scores
  const breakdown = computeForTenant(tenant.id);
  const series = listMaturitySnapshotsForTenant(tenant.id, {
    sinceDays: 30,
    granularity: "daily",
  });
  const latest = series[series.length - 1] ?? null;
  const prior = maturityWeekAgo(series);
  const delta7d =
    latest && prior && prior.id !== latest.id
      ? Math.round((latest.overall - prior.overall) * 10) / 10
      : null;

  const hero: TodayHero = {
    index: breakdown.hasData ? breakdown.index : null,
    delta7d,
    subScores: breakdown.hasData ? breakdown.subScores : null,
    capturedAt: latest?.captured_at ?? null,
  };

  // Top risks — open + suggested, ordered by residual rating, top 5
  const topRisks = listRisks({ status: ["open", "suggested"] }).slice(0, 5);

  // Open incidents headline
  const inc = getLatestSnapshot<IncidentsPayload>(tenant.id, "incidents");
  const openIncidents = {
    active: inc?.payload?.active ?? 0,
    high: inc?.payload?.bySeverity?.high ?? 0,
    total: inc?.payload?.total ?? 0,
  };

  // Pinned KPIs (scorecard tiles for the home page)
  const pins = listPins();
  const pinnedKpis: TodayPinnedKpi[] = pins.map((pin) => {
    const value = computeKpiValue(pin.kpi_kind);
    const catalog = getCatalogEntry(pin.kpi_kind);
    return {
      pin,
      current: value.current,
      status: value.status,
      unit: catalog?.unit ?? "count",
      direction: catalog?.direction ?? "higherBetter",
      labelKey: catalog?.labelKey ?? "",
    };
  });

  // Change feed — derived from snapshot deltas
  const changeFeed = buildChangeFeed(tenant.id);

  return {
    tenant,
    hero,
    topRisks,
    openIncidents,
    pinnedKpis,
    changeFeed,
  };
}
