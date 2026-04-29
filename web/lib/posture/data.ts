import "server-only";
import { resolveExecutiveTenant } from "@/lib/today/data";
import { computeForTenant } from "@/lib/compute/maturity";
import { getLatestSnapshot } from "@/lib/db/signals";
import { listMaturitySnapshotsForTenant } from "@/lib/db/maturity-snapshots";
import type {
  RiskyUsersPayload,
  PimSprawlPayload,
  DevicesPayload,
  IncidentsPayload,
  SensitivityLabelsPayload,
  PurviewAlertsPayload,
  VulnerabilitiesPayload,
} from "@/lib/graph/signals";
import type { TenantRow } from "@/lib/db/tenants";

/**
 * Posture page · server-side data shape.
 *
 * Posture is the Executive replacement for Council's flat list of
 * Identity / Devices / Data / Threats / Vulnerabilities entries.
 * It's a single tabbed page — radar at top (estate-wide breakdown),
 * five tabs below (one per domain). Each tab gets a compact summary
 * card + drill-link to the existing detailed page so the CISO can
 * scan the estate in 30 seconds without navigating away.
 *
 * v2.6.1 — Executive-mode polish.
 */

export type PostureTab =
  | "identity"
  | "devices"
  | "data"
  | "threats"
  | "vulnerabilities";

export const POSTURE_TABS: PostureTab[] = [
  "identity",
  "devices",
  "data",
  "threats",
  "vulnerabilities",
];

export type RadarScores = {
  secureScore: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
};

export type PostureRadar = {
  scores: RadarScores | null;
  /** Overall index (0–100). */
  index: number | null;
  /**
   * 90-day-ago sub-scores rendered as a faded reference polygon
   * behind today's solid polygon. Null when the maturity series
   * doesn't have a snapshot ≥ 60 days old yet — for fresh installs
   * the comparison would be misleading.
   * v2.6.2.
   */
  historical: {
    scores: RadarScores;
    capturedAt: string;
  } | null;
};

export type PostureKpi = {
  labelKey: string;
  value: string;
  /** Optional sub-label or evidence line. */
  hint?: string;
  tone?: "neutral" | "warn" | "neg" | "pos";
};

export type PostureTabContent = {
  tab: PostureTab;
  /** i18n key for tab pill label. */
  labelKey: string;
  /** i18n key for the tab's sub-headline below the pills. */
  subtitleKey: string;
  /** 3–4 headline KPIs. */
  kpis: PostureKpi[];
  /** Where "drill down" goes — existing detailed page. */
  drillHref: string;
  drillLabelKey: string;
};

export type PostureData = {
  tenant: TenantRow | null;
  radar: PostureRadar;
  tabs: Record<PostureTab, PostureTabContent>;
};

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 10) / 10}%`;
}

function num(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

export function buildPostureData(): PostureData {
  const tenant = resolveExecutiveTenant();

  const empty = (): PostureData => ({
    tenant: null,
    radar: { scores: null, index: null, historical: null },
    tabs: POSTURE_TABS.reduce(
      (acc, tab) => {
        acc[tab] = emptyTabContent(tab);
        return acc;
      },
      {} as Record<PostureTab, PostureTabContent>,
    ),
  });

  if (!tenant) return empty();

  const breakdown = computeForTenant(tenant.id);
  const historical = resolveHistoricalRadar(tenant.id);
  const radar: PostureRadar = breakdown.hasData
    ? {
        scores: breakdown.subScores,
        index: breakdown.index,
        historical,
      }
    : { scores: null, index: null, historical: null };

  // ── Identity tab ────────────────────────────────────────────────
  const ru = getLatestSnapshot<RiskyUsersPayload>(tenant.id, "riskyUsers");
  const pim = getLatestSnapshot<PimSprawlPayload>(tenant.id, "pimSprawl");

  const identity: PostureTabContent = {
    tab: "identity",
    labelKey: "posture.tabs.identity",
    subtitleKey: "posture.identity.subtitle",
    drillHref: "/identity",
    drillLabelKey: "posture.drill",
    kpis: [
      {
        labelKey: "posture.identity.kpi.subscore",
        value: pct(breakdown.subScores.identity),
        hint: undefined,
        tone:
          breakdown.subScores.identity >= 80
            ? "pos"
            : breakdown.subScores.identity >= 60
              ? "warn"
              : "neg",
      },
      {
        labelKey: "posture.identity.kpi.privilegedRoles",
        value: num(pim?.payload?.privilegedRoleAssignments),
        hint:
          pim?.payload?.activeAssignments != null
            ? `${pim.payload.activeAssignments} active · ${pim.payload.eligibleAssignments} eligible`
            : undefined,
        tone:
          (pim?.payload?.privilegedRoleAssignments ?? 0) > 10
            ? "warn"
            : "neutral",
      },
      {
        labelKey: "posture.identity.kpi.highRisk",
        value: num(ru?.payload?.highRisk),
        hint:
          ru?.payload?.total != null
            ? `${ru.payload.total} total flagged`
            : undefined,
        tone:
          (ru?.payload?.highRisk ?? 0) > 0 ? "neg" : "pos",
      },
      {
        labelKey: "posture.identity.kpi.recentDeact",
        value: num(pim?.payload?.recentAdminDeactivations?.length),
        hint:
          pim?.payload?.recentAdminDeactivations?.length
            ? "last 30d"
            : undefined,
        tone:
          (pim?.payload?.recentAdminDeactivations?.length ?? 0) >= 3
            ? "neg"
            : (pim?.payload?.recentAdminDeactivations?.length ?? 0) >= 1
              ? "warn"
              : "neutral",
      },
    ],
  };

  // ── Devices tab ─────────────────────────────────────────────────
  const dv = getLatestSnapshot<DevicesPayload>(tenant.id, "devices");
  const devices: PostureTabContent = {
    tab: "devices",
    labelKey: "posture.tabs.devices",
    subtitleKey: "posture.devices.subtitle",
    drillHref: "/devices",
    drillLabelKey: "posture.drill",
    kpis: [
      {
        labelKey: "posture.devices.kpi.subscore",
        value: pct(breakdown.subScores.device),
        tone:
          breakdown.subScores.device >= 80
            ? "pos"
            : breakdown.subScores.device >= 60
              ? "warn"
              : "neg",
      },
      {
        labelKey: "posture.devices.kpi.compliancePct",
        value: pct(dv?.payload?.compliancePct),
        hint:
          dv?.payload?.total != null
            ? `${dv.payload.compliant}/${dv.payload.total} devices`
            : undefined,
        tone:
          (dv?.payload?.compliancePct ?? 0) >= 90
            ? "pos"
            : (dv?.payload?.compliancePct ?? 0) >= 70
              ? "warn"
              : "neg",
      },
      {
        labelKey: "posture.devices.kpi.nonCompliant",
        value: num(dv?.payload?.nonCompliant),
        hint:
          dv?.payload?.inGracePeriod != null
            ? `${dv.payload.inGracePeriod} in grace`
            : undefined,
        tone:
          (dv?.payload?.nonCompliant ?? 0) > 0 ? "warn" : "pos",
      },
      {
        labelKey: "posture.devices.kpi.unknown",
        value: num(dv?.payload?.unknown),
        tone: (dv?.payload?.unknown ?? 0) > 0 ? "warn" : "neutral",
      },
    ],
  };

  // ── Data tab ────────────────────────────────────────────────────
  const labels = getLatestSnapshot<SensitivityLabelsPayload>(
    tenant.id,
    "sensitivityLabels",
  );
  const dlp = getLatestSnapshot<PurviewAlertsPayload>(tenant.id, "dlpAlerts");
  const data: PostureTabContent = {
    tab: "data",
    labelKey: "posture.tabs.data",
    subtitleKey: "posture.data.subtitle",
    drillHref: "/data",
    drillLabelKey: "posture.drill",
    kpis: [
      {
        labelKey: "posture.data.kpi.subscore",
        value: pct(breakdown.subScores.data),
        tone:
          breakdown.subScores.data >= 80
            ? "pos"
            : breakdown.subScores.data >= 60
              ? "warn"
              : "neg",
      },
      {
        labelKey: "posture.data.kpi.labels",
        value: num(labels?.payload?.activeCount),
        hint:
          labels?.payload?.total != null
            ? `${labels.payload.total} defined`
            : undefined,
        tone:
          (labels?.payload?.activeCount ?? 0) >= 3 ? "pos" : "warn",
      },
      {
        labelKey: "posture.data.kpi.dlpAlerts",
        value: num(dlp?.payload?.total),
        hint:
          dlp?.payload?.active != null
            ? `${dlp.payload.active} active`
            : undefined,
        tone:
          (dlp?.payload?.active ?? 0) > 5
            ? "neg"
            : (dlp?.payload?.active ?? 0) > 0
              ? "warn"
              : "neutral",
      },
    ],
  };

  // ── Threats tab ─────────────────────────────────────────────────
  const inc = getLatestSnapshot<IncidentsPayload>(tenant.id, "incidents");
  const threats: PostureTabContent = {
    tab: "threats",
    labelKey: "posture.tabs.threats",
    subtitleKey: "posture.threats.subtitle",
    drillHref: "/threats",
    drillLabelKey: "posture.drill",
    kpis: [
      {
        labelKey: "posture.threats.kpi.subscore",
        value: pct(breakdown.subScores.threat),
        tone:
          breakdown.subScores.threat >= 80
            ? "pos"
            : breakdown.subScores.threat >= 60
              ? "warn"
              : "neg",
      },
      {
        labelKey: "posture.threats.kpi.active",
        value: num(inc?.payload?.active),
        tone:
          (inc?.payload?.active ?? 0) > 5
            ? "neg"
            : (inc?.payload?.active ?? 0) > 0
              ? "warn"
              : "pos",
      },
      {
        labelKey: "posture.threats.kpi.high",
        value: num(inc?.payload?.bySeverity?.high),
        tone: (inc?.payload?.bySeverity?.high ?? 0) > 0 ? "neg" : "pos",
      },
      {
        labelKey: "posture.threats.kpi.total",
        value: num(inc?.payload?.total),
        hint: inc?.payload?.resolved
          ? `${inc.payload.resolved} resolved`
          : undefined,
      },
    ],
  };

  // ── Vulnerabilities tab ─────────────────────────────────────────
  const vuln = getLatestSnapshot<VulnerabilitiesPayload>(
    tenant.id,
    "vulnerabilities",
  );
  const vulnerabilities: PostureTabContent = {
    tab: "vulnerabilities",
    labelKey: "posture.tabs.vulnerabilities",
    subtitleKey: "posture.vulnerabilities.subtitle",
    drillHref: "/vulnerabilities",
    drillLabelKey: "posture.drill",
    kpis: [
      {
        labelKey: "posture.vulnerabilities.kpi.critical",
        value: num(vuln?.payload?.critical),
        hint:
          vuln?.payload?.exploitable != null
            ? `${vuln.payload.exploitable} exploitable`
            : undefined,
        tone:
          (vuln?.payload?.critical ?? 0) > 0 ? "neg" : "pos",
      },
      {
        labelKey: "posture.vulnerabilities.kpi.high",
        value: num(vuln?.payload?.high),
        tone: (vuln?.payload?.high ?? 0) > 5 ? "warn" : "neutral",
      },
      {
        labelKey: "posture.vulnerabilities.kpi.zeroDay",
        value: num(vuln?.payload?.zeroDay),
        tone: (vuln?.payload?.zeroDay ?? 0) > 0 ? "neg" : "neutral",
      },
      {
        labelKey: "posture.vulnerabilities.kpi.affectedDevices",
        value: num(vuln?.payload?.affectedDevices),
        hint:
          vuln?.payload?.total != null
            ? `${vuln.payload.total} distinct CVEs`
            : undefined,
      },
    ],
  };

  return {
    tenant,
    radar,
    tabs: { identity, devices, data, threats, vulnerabilities },
  };
}

/**
 * Pick a maturity snapshot ~90 days ago. Looks for the most-recent
 * row that's ≥60 days old (so the comparison frame is genuinely
 * "last quarter" rather than "yesterday with rounding"). Returns
 * null when nothing that old exists — fresh installs shouldn't
 * pretend to have history.
 *
 * v2.6.2.
 */
function resolveHistoricalRadar(
  tenantId: string,
): PostureRadar["historical"] {
  const series = listMaturitySnapshotsForTenant(tenantId, {
    sinceDays: 120,
    granularity: "daily",
  });
  if (series.length === 0) return null;
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const candidates = series.filter(
    (s) => new Date(s.captured_at).getTime() <= sixtyDaysAgo,
  );
  if (candidates.length === 0) return null;
  // Most-recent row that's still ≥60d old — "early in the window".
  const row = candidates[candidates.length - 1];
  return {
    scores: {
      secureScore: row.secure_score,
      identity: row.identity,
      device: row.device,
      data: row.data,
      threat: row.threat,
      compliance: row.compliance,
    },
    capturedAt: row.captured_at,
  };
}

function emptyTabContent(tab: PostureTab): PostureTabContent {
  return {
    tab,
    labelKey: `posture.tabs.${tab}`,
    subtitleKey: `posture.${tab}.subtitle`,
    drillHref: `/${tab}`,
    drillLabelKey: "posture.drill",
    kpis: [],
  };
}
