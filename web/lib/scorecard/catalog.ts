import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import { computeForTenant } from "@/lib/compute/maturity";
import { getMaturityConfig } from "@/lib/config/maturity-config";
import {
  computeTenantFrameworkScoreWithOos,
  getActiveComplianceMapping,
} from "@/lib/config/compliance-framework";
import type {
  PimSprawlPayload,
  RiskyUsersPayload,
  IncidentsPayload,
  DevicesPayload,
  VulnerabilitiesPayload,
  SecureScorePayload,
} from "@/lib/graph/signals";

/**
 * CISO scorecard — catalog of 10 board-grade KPIs the operator can pin
 * onto the Executive home page. Each entry knows how to compute its
 * own current value from the federation's signals (or, in Executive
 * mode, the single tenant's signals — the math is identical).
 *
 * Adding a new KPI is one entry here + one dict key for the label
 * (Settings → Scorecard handles the pin/unpin UX).
 *
 * v2.6.0.
 */

export type KpiKind =
  | "maturityIndex"
  | "frameworkCompliance"
  | "mfaAdminCoverage"
  | "criticalCveAge"
  | "privilegedRoleCount"
  | "incidentMttr"
  | "deviceCompliance"
  | "highRiskUsers"
  | "auditClosureSla"
  | "boardReportDelivered";

export type KpiStatus = "onTrack" | "atRisk" | "met" | "missed" | "unknown";

export type KpiValue = {
  /** Current measured value, with unit semantics defined per-kind. */
  current: number | null;
  /** Higher-is-better or lower-is-better? Drives status comparison
   *  against `target`. */
  direction: "higherBetter" | "lowerBetter";
  /** Optional unit suffix for display (% or count or h or "delivered"). */
  unit: "percent" | "count" | "hours" | "boolean";
  /** Compute helper to evaluate `current vs target` and return a status. */
  evaluate: (target: number) => KpiStatus;
};

export type KpiCatalogEntry = {
  kind: KpiKind;
  /** i18n key for the human-readable label. */
  labelKey: string;
  /** i18n key for a short description shown when picking from the catalog. */
  descriptionKey: string;
  /** Default target value when the operator pins. Editable on the
   *  scorecard page. */
  defaultTarget: number;
  unit: KpiValue["unit"];
  direction: KpiValue["direction"];
};

export const KPI_CATALOG: KpiCatalogEntry[] = [
  {
    kind: "maturityIndex",
    labelKey: "scorecard.kpi.maturityIndex",
    descriptionKey: "scorecard.kpi.maturityIndex.desc",
    defaultTarget: 80,
    unit: "percent",
    direction: "higherBetter",
  },
  {
    kind: "frameworkCompliance",
    labelKey: "scorecard.kpi.frameworkCompliance",
    descriptionKey: "scorecard.kpi.frameworkCompliance.desc",
    defaultTarget: 80,
    unit: "percent",
    direction: "higherBetter",
  },
  {
    kind: "mfaAdminCoverage",
    labelKey: "scorecard.kpi.mfaAdminCoverage",
    descriptionKey: "scorecard.kpi.mfaAdminCoverage.desc",
    defaultTarget: 100,
    unit: "percent",
    direction: "higherBetter",
  },
  {
    kind: "criticalCveAge",
    labelKey: "scorecard.kpi.criticalCveAge",
    descriptionKey: "scorecard.kpi.criticalCveAge.desc",
    defaultTarget: 0,
    unit: "count",
    direction: "lowerBetter",
  },
  {
    kind: "privilegedRoleCount",
    labelKey: "scorecard.kpi.privilegedRoleCount",
    descriptionKey: "scorecard.kpi.privilegedRoleCount.desc",
    defaultTarget: 5,
    unit: "count",
    direction: "lowerBetter",
  },
  {
    kind: "incidentMttr",
    labelKey: "scorecard.kpi.incidentMttr",
    descriptionKey: "scorecard.kpi.incidentMttr.desc",
    defaultTarget: 24,
    unit: "hours",
    direction: "lowerBetter",
  },
  {
    kind: "deviceCompliance",
    labelKey: "scorecard.kpi.deviceCompliance",
    descriptionKey: "scorecard.kpi.deviceCompliance.desc",
    defaultTarget: 90,
    unit: "percent",
    direction: "higherBetter",
  },
  {
    kind: "highRiskUsers",
    labelKey: "scorecard.kpi.highRiskUsers",
    descriptionKey: "scorecard.kpi.highRiskUsers.desc",
    defaultTarget: 0,
    unit: "count",
    direction: "lowerBetter",
  },
  {
    kind: "auditClosureSla",
    labelKey: "scorecard.kpi.auditClosureSla",
    descriptionKey: "scorecard.kpi.auditClosureSla.desc",
    defaultTarget: 100,
    unit: "percent",
    direction: "higherBetter",
  },
  {
    kind: "boardReportDelivered",
    labelKey: "scorecard.kpi.boardReportDelivered",
    descriptionKey: "scorecard.kpi.boardReportDelivered.desc",
    defaultTarget: 1,
    unit: "boolean",
    direction: "higherBetter",
  },
];

export function getCatalogEntry(kind: KpiKind): KpiCatalogEntry | null {
  return KPI_CATALOG.find((e) => e.kind === kind) ?? null;
}

/**
 * Compute the current value for a KPI across the federation. In
 * Executive mode there's only one tenant so it's effectively the
 * single-tenant value; in Council mode the values aggregate across
 * all consented entities (mean for percentages, sum for counts).
 */
export function computeKpiValue(kind: KpiKind): {
  current: number | null;
  status: KpiStatus;
} {
  const tenants = listTenants().filter(
    (t) => t.consent_status === "consented" || t.is_demo === 1,
  );
  if (tenants.length === 0)
    return { current: null, status: "unknown" };
  const entry = getCatalogEntry(kind);
  if (!entry) return { current: null, status: "unknown" };
  const target = entry.defaultTarget;

  let current: number | null = null;

  switch (kind) {
    case "maturityIndex": {
      const indices = tenants
        .map((t) => computeForTenant(t.id))
        .filter((m) => m.hasData)
        .map((m) => m.index);
      current =
        indices.length === 0
          ? null
          : Math.round(
              (indices.reduce((a, b) => a + b, 0) / indices.length) * 10,
            ) / 10;
      break;
    }
    case "frameworkCompliance": {
      const cfg = getMaturityConfig();
      // Use compliance scoring helpers — same as governance page.
      const scores: number[] = [];
      for (const t of tenants) {
        const ss = getLatestSnapshot<SecureScorePayload>(t.id, "secureScore");
        if (!ss?.payload?.controls) continue;
        const m = new Map<
          string,
          { score: number | null; maxScore: number | null }
        >();
        for (const c of ss.payload.controls) {
          m.set(c.id, { score: c.score ?? null, maxScore: c.maxScore ?? null });
        }
        const fw = computeTenantFrameworkScoreWithOos(m, "skip", t.id);
        if (fw.percent !== null) scores.push(fw.percent * 100);
      }
      current =
        scores.length === 0
          ? null
          : Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
            ) / 10;
      // suppress unused
      void cfg;
      break;
    }
    case "mfaAdminCoverage": {
      // Use Maturity identity sub-score as a proxy — it's heavily
      // weighted on MFA admin coverage in the existing maturity calc.
      const ids = tenants
        .map((t) => computeForTenant(t.id))
        .filter((m) => m.hasData)
        .map((m) => m.subScores.identity);
      current =
        ids.length === 0
          ? null
          : Math.round((ids.reduce((a, b) => a + b, 0) / ids.length) * 10) /
            10;
      break;
    }
    case "criticalCveAge": {
      // Count of critical CVEs across all tenants whose published date is
      // > 30 days ago. Demo seed will contribute realistic numbers.
      let count = 0;
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const t of tenants) {
        const v = getLatestSnapshot<VulnerabilitiesPayload>(
          t.id,
          "vulnerabilities",
        );
        if (!v?.payload?.topCves) continue;
        for (const c of v.payload.topCves) {
          if (c.severity !== "Critical") continue;
          if (!c.publishedDateTime) continue;
          if (new Date(c.publishedDateTime).getTime() < cutoff) count++;
        }
      }
      current = count;
      break;
    }
    case "privilegedRoleCount": {
      // Max privileged-role count across tenants — Executive: just the
      // single tenant; Council: the worst-case entity. CISO cares
      // about peak exposure, not average.
      let max = 0;
      for (const t of tenants) {
        const p = getLatestSnapshot<PimSprawlPayload>(t.id, "pimSprawl");
        max = Math.max(max, p?.payload?.privilegedRoleAssignments ?? 0);
      }
      current = max;
      break;
    }
    case "incidentMttr": {
      // Approximate MTTR — average (now - createdDateTime) for resolved
      // incidents in the last 30 days. Crude but board-acceptable.
      let total = 0;
      let n = 0;
      for (const t of tenants) {
        const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents");
        if (!inc?.payload?.incidents) continue;
        for (const i of inc.payload.incidents) {
          if (i.status !== "resolved") continue;
          const created = new Date(i.createdDateTime).getTime();
          const updated = new Date(i.lastUpdateDateTime).getTime();
          if (!Number.isFinite(created) || !Number.isFinite(updated)) continue;
          total += (updated - created) / 3600_000;
          n++;
        }
      }
      current = n === 0 ? null : Math.round((total / n) * 10) / 10;
      break;
    }
    case "deviceCompliance": {
      // Aggregate compliance % across tenants.
      let comp = 0;
      let total = 0;
      for (const t of tenants) {
        const d = getLatestSnapshot<DevicesPayload>(t.id, "devices");
        if (!d?.payload) continue;
        comp += d.payload.compliant;
        total += d.payload.total;
      }
      current = total === 0 ? null : Math.round((comp / total) * 1000) / 10;
      break;
    }
    case "highRiskUsers": {
      let count = 0;
      for (const t of tenants) {
        const r = getLatestSnapshot<RiskyUsersPayload>(t.id, "riskyUsers");
        count += r?.payload?.highRisk ?? 0;
      }
      current = count;
      break;
    }
    case "auditClosureSla":
      // Stub — no audit-closure data source yet. Returns null + unknown
      // status. Operators can still pin the KPI to declare the
      // commitment; the actual value lights up in v2.7 when audit
      // findings table lands.
      current = null;
      break;
    case "boardReportDelivered":
      // 1 if a draft has been generated this quarter, 0 otherwise.
      // Hooked up by Phase 8 (board-report drafts table).
      current = null;
      break;
  }

  let status: KpiStatus = "unknown";
  if (current !== null) {
    const ok =
      entry.direction === "higherBetter"
        ? current >= target
        : current <= target;
    if (entry.direction === "higherBetter") {
      status = ok
        ? "met"
        : current >= target * 0.85
          ? "atRisk"
          : "missed";
    } else {
      // lowerBetter — within 1.15× target = atRisk, beyond = missed.
      status = ok
        ? "met"
        : current <= target * 1.15
          ? "atRisk"
          : "missed";
    }
  }
  // suppress unused
  void getActiveComplianceMapping;
  return { current, status };
}
