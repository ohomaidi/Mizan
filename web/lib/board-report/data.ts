import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { computeForTenant } from "@/lib/compute/maturity";
import { getLatestSnapshot } from "@/lib/db/signals";
import { listRisks } from "@/lib/db/risk-register";
import { listPins } from "@/lib/db/scorecard";
import { listAnswers } from "@/lib/db/insurance";
import { computeKpiValue } from "@/lib/scorecard/catalog";
import { AVIATION_QUESTIONNAIRE } from "@/lib/insurance/aviation";
import { getBranding } from "@/lib/config/branding";
import type {
  IncidentsPayload,
  VulnerabilitiesPayload,
} from "@/lib/graph/signals";

/**
 * Aggregate every data point a board PDF needs into one flat object.
 * Keeps the PDF render component pure (no DB calls) so it stays
 * testable + servers can hand-build sample data for previews.
 *
 * v2.6.0.
 */

export type BoardReportData = {
  generatedAt: string;
  period: string;
  branding: ReturnType<typeof getBranding>;
  org: {
    nameEn: string;
    nameAr: string;
  };
  posture: {
    maturityIndex: number | null;
    deltaQoQ: number | null;
    target: number | null;
    subScores: Record<string, number> | null;
  };
  incidents: {
    activeHigh: number;
    resolvedLast30d: number;
    topRecent: Array<{ id: string; title: string; severity: string; createdAt: string }>;
  };
  vulnerabilities: {
    totalCves: number;
    critical: number;
    high: number;
    zeroDay: number;
    topCves: Array<{ cveId: string; severity: string; affectedDevices: number; recommendedFix: string | null }>;
  };
  risks: {
    open: number;
    mitigated: number;
    accepted: number;
    suggested: number;
    topByRating: Array<{ id: number; title: string; rating: number; status: string; owner: string | null }>;
  };
  scorecard: Array<{
    label: string;
    target: number;
    current: number | null;
    status: string;
    commitment: string | null;
  }>;
  insurance: {
    answered: number;
    total: number;
    yes: number;
    no: number;
    completionPct: number;
    gaps: Array<{ category: string; question: string }>;
  };
};

export function buildBoardReportData(period: string): BoardReportData {
  const tenants = listTenants().filter(
    (t) => t.consent_status === "consented" || t.is_demo === 1,
  );
  const primary = tenants[0];
  const branding = getBranding();

  // ── Posture ──
  let maturityIndex: number | null = null;
  let subScores: Record<string, number> | null = null;
  if (primary) {
    const m = computeForTenant(primary.id);
    if (m.hasData) {
      maturityIndex = Math.round(m.index * 10) / 10;
      subScores = {
        "Secure Score": m.subScores.secureScore,
        Identity: m.subScores.identity,
        Device: m.subScores.device,
        Data: m.subScores.data,
        Threat: m.subScores.threat,
        Compliance: m.subScores.compliance,
      };
    }
  }

  // ── Incidents ──
  let activeHigh = 0;
  let resolvedLast30d = 0;
  const topRecent: BoardReportData["incidents"]["topRecent"] = [];
  const incCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const t of tenants) {
    const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents");
    if (!inc?.payload?.incidents) continue;
    for (const i of inc.payload.incidents) {
      if (i.status === "active" && (i.severity === "high" || i.severity === "medium"))
        activeHigh++;
      if (i.status === "resolved" && new Date(i.lastUpdateDateTime).getTime() > incCutoff)
        resolvedLast30d++;
    }
    for (const i of inc.payload.incidents.slice(0, 3)) {
      topRecent.push({
        id: i.id,
        title: i.displayName,
        severity: i.severity,
        createdAt: i.createdDateTime,
      });
    }
  }

  // ── Vulnerabilities ──
  let totalCves = 0;
  let critical = 0;
  let high = 0;
  let zeroDay = 0;
  const topCves: BoardReportData["vulnerabilities"]["topCves"] = [];
  for (const t of tenants) {
    const v = getLatestSnapshot<VulnerabilitiesPayload>(t.id, "vulnerabilities");
    if (!v?.payload || v.payload.error) continue;
    totalCves += v.payload.total;
    critical += v.payload.critical;
    high += v.payload.high;
    zeroDay += v.payload.zeroDay ?? 0;
    for (const c of v.payload.topCves.slice(0, 5)) {
      topCves.push({
        cveId: c.cveId,
        severity: c.severity,
        affectedDevices: c.affectedDevices,
        recommendedFix: c.recommendedFix ?? null,
      });
    }
  }

  // ── Risks ──
  const allRisks = listRisks();
  const risks = {
    open: allRisks.filter((r) => r.status === "open").length,
    mitigated: allRisks.filter((r) => r.status === "mitigated").length,
    accepted: allRisks.filter((r) => r.status === "accepted").length,
    suggested: allRisks.filter((r) => r.status === "suggested").length,
    topByRating: allRisks
      .filter((r) => ["open", "mitigated"].includes(r.status))
      .sort((a, b) => b.residual_rating - a.residual_rating)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        title: r.title,
        rating: r.residual_rating,
        status: r.status,
        owner: r.owner,
      })),
  };

  // ── Scorecard ──
  const scorecard = listPins().map((p) => {
    const v = computeKpiValue(p.kpi_kind);
    return {
      label: p.label,
      target: p.target,
      current: v.current,
      status: v.status,
      commitment: p.commitment,
    };
  });

  // ── Insurance ──
  const answers = listAnswers();
  const total = AVIATION_QUESTIONNAIRE.questions.length;
  const answered = answers.length;
  const yes = answers.filter((a) => a.value === "yes").length;
  const no = answers.filter((a) => a.value === "no").length;
  const completionPct = Math.round((answered / total) * 1000) / 10;
  const answeredIds = new Set(answers.map((a) => a.question_id));
  const gaps = AVIATION_QUESTIONNAIRE.questions
    .filter((q) => !answeredIds.has(q.id))
    .slice(0, 8)
    .map((q) => ({ category: q.category, question: q.question }));

  return {
    generatedAt: new Date().toISOString(),
    period,
    branding,
    org: {
      nameEn: primary?.name_en ?? branding.nameEn,
      nameAr: primary?.name_ar ?? branding.nameAr,
    },
    posture: {
      maturityIndex,
      deltaQoQ: null, // computed in v2.6.1 from maturity_snapshots history
      target: 80,
      subScores,
    },
    incidents: { activeHigh, resolvedLast30d, topRecent: topRecent.slice(0, 5) },
    vulnerabilities: {
      totalCves,
      critical,
      high,
      zeroDay,
      topCves: topCves.slice(0, 5),
    },
    risks,
    scorecard,
    insurance: { answered, total, yes, no, completionPct, gaps },
  };
}
