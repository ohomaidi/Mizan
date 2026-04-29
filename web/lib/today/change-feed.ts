import "server-only";
import {
  getSnapshotAsOf,
  getLatestSnapshot,
  type SignalSnapshot,
} from "@/lib/db/signals";
import {
  listMaturitySnapshotsForTenant,
  type MaturitySnapshotRow,
} from "@/lib/db/maturity-snapshots";
import type {
  PimSprawlPayload,
  VulnerabilitiesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
} from "@/lib/graph/signals";

/**
 * Today page · 7-day change feed.
 *
 * Derived from existing snapshots — no new table. The CISO's daily
 * driver shouldn't ask "is something different today?", it should
 * answer that question for them at the top of the page. This module
 * compares the latest signal/maturity snapshots against ones from
 * roughly 7 days ago and emits typed events the page renders as a
 * timeline.
 *
 * Each emitted event has a severity (info / warn / alert) and a
 * direction (up / down / flat). Severity drives the chip colour;
 * direction drives the arrow icon. Events are sorted alert-first,
 * then by absolute magnitude of the change so the noisiest things
 * land at the top.
 *
 * v2.6.1 (Executive-mode polish).
 */

export type ChangeFeedSeverity = "info" | "warn" | "alert";
export type ChangeFeedDirection = "up" | "down" | "flat";

export type ChangeFeedEvent = {
  id: string;
  capturedAt: string; // ISO; "when" the change appears to have happened
  severity: ChangeFeedSeverity;
  direction: ChangeFeedDirection;
  /** i18n key for the headline. Interpolated server-side with `args`. */
  titleKey: string;
  args: Record<string, string | number>;
  /** Optional drill-link inside the dashboard. */
  href?: string;
  /** Magnitude — used for sorting; 0 means flat / no rank tie-break. */
  magnitude: number;
};

const ALERT_TIER = 3;
const WARN_TIER = 2;
const INFO_TIER = 1;

function tier(s: ChangeFeedSeverity): number {
  return s === "alert" ? ALERT_TIER : s === "warn" ? WARN_TIER : INFO_TIER;
}

function sevForDelta(
  delta: number,
  thresholds: { warn: number; alert: number },
  invert = false,
): ChangeFeedSeverity {
  const abs = Math.abs(delta);
  // "invert" means an increase is bad (e.g. CVE count up = bad).
  // Default is "down is bad" (e.g. maturity dropping = bad).
  const bad = invert ? delta > 0 : delta < 0;
  if (!bad) return "info";
  if (abs >= thresholds.alert) return "alert";
  if (abs >= thresholds.warn) return "warn";
  return "info";
}

function direction(delta: number): ChangeFeedDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

/**
 * Find a snapshot ~7 days ago. Falls back to the OLDEST snapshot in
 * the maturity series if there isn't a "≤7d ago" row yet, so a fresh
 * seed (where snapshots are minutes apart) still produces deltas.
 */
function maturityWeekAgo(
  snaps: MaturitySnapshotRow[],
): MaturitySnapshotRow | null {
  if (snaps.length === 0) return null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const olderThan7d = snaps.filter(
    (s) => new Date(s.captured_at).getTime() <= sevenDaysAgo,
  );
  if (olderThan7d.length > 0) {
    return olderThan7d[olderThan7d.length - 1]; // most-recent row that's ≥7d old
  }
  return snaps[0]; // oldest available
}

export function buildChangeFeed(tenantId: string): ChangeFeedEvent[] {
  const events: ChangeFeedEvent[] = [];

  // ── Maturity index delta ────────────────────────────────────────
  const maturitySeries = listMaturitySnapshotsForTenant(tenantId, {
    sinceDays: 30,
    granularity: "daily",
  });
  if (maturitySeries.length >= 2) {
    const latest = maturitySeries[maturitySeries.length - 1];
    const prior = maturityWeekAgo(maturitySeries);
    if (prior && prior.id !== latest.id) {
      const delta = Math.round((latest.overall - prior.overall) * 10) / 10;
      if (Math.abs(delta) >= 0.5) {
        events.push({
          id: `maturity-${latest.id}`,
          capturedAt: latest.captured_at,
          severity: sevForDelta(delta, { warn: 1.5, alert: 4 }),
          direction: direction(delta),
          titleKey:
            delta >= 0
              ? "today.feed.maturityUp"
              : "today.feed.maturityDown",
          args: {
            delta: Math.abs(delta).toFixed(1),
            current: latest.overall.toFixed(1),
          },
          href: "/posture",
          magnitude: Math.abs(delta),
        });
      }
    }
  }

  // ── Critical CVE delta ──────────────────────────────────────────
  const vulnLatest = getLatestSnapshot<VulnerabilitiesPayload>(
    tenantId,
    "vulnerabilities",
  );
  const vulnPrior = getSnapshotAsOf<VulnerabilitiesPayload>(
    tenantId,
    "vulnerabilities",
    7,
  );
  if (vulnLatest?.payload && vulnPrior?.payload) {
    const delta = vulnLatest.payload.critical - vulnPrior.payload.critical;
    if (delta !== 0) {
      events.push({
        id: `vuln-critical-${vulnLatest.id}`,
        capturedAt: vulnLatest.fetched_at,
        severity: sevForDelta(delta, { warn: 1, alert: 5 }, true),
        direction: direction(delta),
        titleKey:
          delta > 0
            ? "today.feed.cveAdded"
            : "today.feed.cveResolved",
        args: { count: Math.abs(delta), total: vulnLatest.payload.critical },
        href: "/posture?tab=vulnerabilities",
        magnitude: Math.abs(delta),
      });
    }
    // Zero-day specifically — always alert, no threshold.
    if (
      (vulnLatest.payload.zeroDay ?? 0) > (vulnPrior.payload.zeroDay ?? 0)
    ) {
      const zd = vulnLatest.payload.zeroDay - (vulnPrior.payload.zeroDay ?? 0);
      events.push({
        id: `vuln-zeroday-${vulnLatest.id}`,
        capturedAt: vulnLatest.fetched_at,
        severity: "alert",
        direction: "up",
        titleKey: "today.feed.zerodayAdded",
        args: { count: zd },
        href: "/posture?tab=vulnerabilities",
        magnitude: zd * 10, // weight zero-days heavily for sort order
      });
    }
  }

  // ── PIM admin deactivations (last 7d) ──────────────────────────
  const pimLatest = getLatestSnapshot<PimSprawlPayload>(tenantId, "pimSprawl");
  if (pimLatest?.payload?.recentAdminDeactivations?.length) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = pimLatest.payload.recentAdminDeactivations.filter(
      (e) => new Date(e.activityDateTime).getTime() >= cutoff,
    );
    if (recent.length > 0) {
      events.push({
        id: `pim-deact-${pimLatest.id}`,
        capturedAt: recent[0].activityDateTime,
        severity: recent.length >= 3 ? "alert" : "warn",
        direction: "up",
        titleKey: "today.feed.adminDeactivated",
        args: { count: recent.length },
        href: "/posture?tab=identity",
        magnitude: recent.length,
      });
    }

    // Privileged role count drift — admin-account sprawl is a CISO smell.
    const pimPrior = getSnapshotAsOf<PimSprawlPayload>(
      tenantId,
      "pimSprawl",
      7,
    );
    if (pimPrior?.payload) {
      const delta =
        pimLatest.payload.privilegedRoleAssignments -
        pimPrior.payload.privilegedRoleAssignments;
      if (Math.abs(delta) >= 1) {
        events.push({
          id: `pim-roles-${pimLatest.id}`,
          capturedAt: pimLatest.fetched_at,
          severity: sevForDelta(delta, { warn: 1, alert: 3 }, true),
          direction: direction(delta),
          titleKey:
            delta > 0
              ? "today.feed.adminRolesGrew"
              : "today.feed.adminRolesShrunk",
          args: {
            count: Math.abs(delta),
            total: pimLatest.payload.privilegedRoleAssignments,
          },
          href: "/posture?tab=identity",
          magnitude: Math.abs(delta),
        });
      }
    }
  }

  // ── Incidents — new active in last 7d ──────────────────────────
  const incLatest = getLatestSnapshot<IncidentsPayload>(tenantId, "incidents");
  const incPrior = getSnapshotAsOf<IncidentsPayload>(tenantId, "incidents", 7);
  if (incLatest?.payload && incPrior?.payload) {
    const delta = incLatest.payload.active - incPrior.payload.active;
    if (delta !== 0) {
      events.push({
        id: `incidents-${incLatest.id}`,
        capturedAt: incLatest.fetched_at,
        severity: sevForDelta(delta, { warn: 1, alert: 5 }, true),
        direction: direction(delta),
        titleKey:
          delta > 0
            ? "today.feed.incidentsOpened"
            : "today.feed.incidentsResolved",
        args: { count: Math.abs(delta), total: incLatest.payload.active },
        href: "/posture?tab=threats",
        magnitude: Math.abs(delta),
      });
    }
  }

  // ── Risky users delta ──────────────────────────────────────────
  const ruLatest = getLatestSnapshot<RiskyUsersPayload>(tenantId, "riskyUsers");
  const ruPrior = getSnapshotAsOf<RiskyUsersPayload>(tenantId, "riskyUsers", 7);
  if (ruLatest?.payload && ruPrior?.payload) {
    const delta = ruLatest.payload.highRisk - ruPrior.payload.highRisk;
    if (Math.abs(delta) >= 1) {
      events.push({
        id: `risky-${ruLatest.id}`,
        capturedAt: ruLatest.fetched_at,
        severity: sevForDelta(delta, { warn: 1, alert: 3 }, true),
        direction: direction(delta),
        titleKey:
          delta > 0
            ? "today.feed.riskyUsersGrew"
            : "today.feed.riskyUsersShrunk",
        args: { count: Math.abs(delta), total: ruLatest.payload.highRisk },
        href: "/posture?tab=identity",
        magnitude: Math.abs(delta),
      });
    }
  }

  // Sort: severity tier desc, then magnitude desc, then capturedAt desc
  events.sort((a, b) => {
    const t = tier(b.severity) - tier(a.severity);
    if (t !== 0) return t;
    const m = b.magnitude - a.magnitude;
    if (m !== 0) return m;
    return (
      new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    );
  });

  return events.slice(0, 8); // Today page caps at 8 — anything more belongs in Posture.
}

// suppress unused — defensive imports in case future events need them
void ({} as SignalSnapshot<unknown>);
