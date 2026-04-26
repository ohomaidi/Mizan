import "server-only";
import type {
  ConditionalAccessPayload,
  DevicesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
  SecureScorePayload,
} from "@/lib/graph/signals";
import { getLatestSnapshotsForTenant } from "@/lib/db/signals";
import { getMaturityConfig } from "@/lib/config/maturity-config";
import {
  computeTenantFrameworkScore,
  getActiveFramework,
} from "@/lib/config/compliance-framework";
import { getComplianceConfig } from "@/lib/config/compliance-config";
import { getOosSets } from "@/lib/db/compliance-oos";

/**
 * Per-entity Maturity Index breakdown.
 *
 * Sub-scores are 0–100 and weighted per the spec in `docs/01-feature-catalog.md §1`.
 *  - Secure Score        25%
 *  - Identity posture    20%
 *  - Device posture      15%
 *  - Data protection     15%  (stub in Phase 2; no Graph signal yet → neutral 70)
 *  - Threat response     15%
 *  - Compliance framework 10% (stub in Phase 2 → synthesized from Secure Score)
 */

export type SubScores = {
  secureScore: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
};

export type MaturityBreakdown = {
  index: number;                  // 0–100
  subScores: SubScores;
  controlsPassingPct: number;     // 0–100 — aggregate secure-score controls "implemented"
  openIncidents: number;
  riskyUsers: number;
  deviceCompliancePct: number;
  labelCoveragePct: number;       // stub (0) until Phase 3 pulls label telemetry
  hasData: boolean;
};

// Weights pulled from Council-editable config (see lib/config/maturity-config.ts).
// Defaults match the slide-6 spec: SS 25 · ID 20 · DV 15 · DATA 15 · THREAT 15 · COMPL 10.

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeFromSnapshots(
  snapshots: {
    secureScore?: SecureScorePayload | null;
    conditionalAccess?: ConditionalAccessPayload | null;
    riskyUsers?: RiskyUsersPayload | null;
    devices?: DevicesPayload | null;
    incidents?: IncidentsPayload | null;
  },
  options?: { tenantId?: string | null },
): MaturityBreakdown {
  const ss = snapshots.secureScore ?? null;
  const ca = snapshots.conditionalAccess ?? null;
  const ru = snapshots.riskyUsers ?? null;
  const dv = snapshots.devices ?? null;
  const inc = snapshots.incidents ?? null;

  const hasData = Boolean(ss || ca || ru || dv || inc);

  // When we have no data at all for this tenant, return an explicit zero-state breakdown.
  // UI reads `hasData` and shows a placeholder instead of the number.
  if (!hasData) {
    return {
      index: 0,
      subScores: {
        secureScore: 0,
        identity: 0,
        device: 0,
        data: 0,
        threat: 0,
        compliance: 0,
      },
      controlsPassingPct: 0,
      openIncidents: 0,
      riskyUsers: 0,
      deviceCompliancePct: 0,
      labelCoveragePct: 0,
      hasData: false,
    };
  }

  // Secure score sub-score: percent of max.
  const secureScoreSub = ss ? clamp(ss.percent) : 0;

  // Identity sub-score — weighted CA signals + risky user rate.
  let identitySub = 70; // neutral default when we have no CA data
  if (ca) {
    const enabledRatio = ca.total > 0 ? ca.enabledCount / ca.total : 0;
    const mfaRatio = ca.total > 0 ? ca.requiresMfaCount / ca.total : 0;
    const legacyBlocked = ca.blocksLegacyAuthCount > 0 ? 1 : 0;
    identitySub = clamp(
      100 * (0.5 * enabledRatio + 0.35 * mfaRatio + 0.15 * legacyBlocked),
    );
  }
  if (ru && ru.total > 0) {
    const atRiskRatio = ru.atRisk / ru.total;
    identitySub = clamp(identitySub * (1 - Math.min(0.4, atRiskRatio)));
  }

  // Device sub-score — straight compliance %.
  const deviceSub = dv ? clamp(dv.compliancePct) : 70;

  // Threat response sub-score — based on ratio of unresolved to total.
  let threatSub = 70;
  if (inc && inc.total > 0) {
    const resolvedRatio = inc.resolved / inc.total;
    threatSub = clamp(100 * resolvedRatio);
  }

  // Data protection — placeholder until Phase 3 (Purview signals).
  // Synthesize from secure score to at least move with real data.
  const dataSub = ss ? clamp(ss.percent * 0.9) : 65;

  // Compliance sub-score (v2.2.4+) — driven by the active compliance
  // framework (NESA / Dubai ISR / etc.) selected via `branding
  // .frameworkId`. Each clause's coverage is the average of its
  // mapped Microsoft Secure Score pass-rates + operator-managed
  // custom evidence (manualPassRate). The clause-level coverages
  // are weighted by `clause.weight` to produce a 0–100 score.
  // Clauses with no observable evidence on this tenant are excluded
  // from both numerator and denominator (a tenant with no on-prem AD
  // shouldn't be penalised on MDI clauses where Microsoft has
  // nothing to report). Falls back to the legacy
  // `secureScore × 0.95` heuristic only when the framework returns
  // null (no clauses scored at all — typically a brand-new entity
  // with zero data).
  let complianceSub = 65;
  if (ss) {
    const ssMap = new Map<
      string,
      { score: number | null; maxScore: number | null }
    >();
    for (const c of ss.controls) {
      ssMap.set(c.id, { score: c.score ?? null, maxScore: c.maxScore ?? null });
    }
    // Resolve OOS sets for this tenant (global tier always; per-entity tier
    // when tenantId was passed). Clauses & controls marked OOS are skipped
    // entirely from the score so 3rd-party-covered domains don't drag a
    // tenant's framework % down.
    const { frameworkId } = getActiveFramework();
    const oos = getOosSets(frameworkId, options?.tenantId ?? null);
    const fw = computeTenantFrameworkScore(
      ssMap,
      getComplianceConfig().unscoredTreatment,
      oos,
    );
    complianceSub =
      fw.percent !== null ? clamp(fw.percent) : clamp(ss.percent * 0.95);
  }

  const subScores: SubScores = {
    secureScore: round1(secureScoreSub),
    identity: round1(identitySub),
    device: round1(deviceSub),
    data: round1(dataSub),
    threat: round1(threatSub),
    compliance: round1(complianceSub),
  };

  const { weights } = getMaturityConfig();
  const index = round1(
    subScores.secureScore * weights.secureScore +
      subScores.identity * weights.identity +
      subScores.device * weights.device +
      subScores.data * weights.data +
      subScores.threat * weights.threat +
      subScores.compliance * weights.compliance,
  );

  // A control "passes" when it earned the full maxScore. Falls back to the legacy
  // implementationStatus=="Implemented" string match for snapshots that predate the
  // enriched profile-catalog merge.
  const controlsPassingPct = ss
    ? (() => {
        if (!ss.controls.length) return 0;
        const passing = ss.controls.filter((c) => {
          if (c.score == null) return false;
          if (c.maxScore != null) return c.score === c.maxScore;
          return c.implementationStatus === "Implemented";
        }).length;
        return round1((passing / ss.controls.length) * 100);
      })()
    : 0;

  return {
    index,
    subScores,
    controlsPassingPct,
    openIncidents: inc?.active ?? 0,
    riskyUsers: ru?.atRisk ?? 0,
    deviceCompliancePct: dv?.compliancePct ?? 0,
    labelCoveragePct: 0,
    hasData,
  };
}

/** Load latest snapshots for a tenant and compute breakdown. */
export function computeForTenant(tenantId: string): MaturityBreakdown {
  const snaps = getLatestSnapshotsForTenant(tenantId);
  return computeFromSnapshots(
    {
      secureScore: (snaps.secureScore?.payload as SecureScorePayload | undefined) ?? null,
      conditionalAccess:
        (snaps.conditionalAccess?.payload as ConditionalAccessPayload | undefined) ?? null,
      riskyUsers: (snaps.riskyUsers?.payload as RiskyUsersPayload | undefined) ?? null,
      devices: (snaps.devices?.payload as DevicesPayload | undefined) ?? null,
      incidents: (snaps.incidents?.payload as IncidentsPayload | undefined) ?? null,
    },
    { tenantId },
  );
}
