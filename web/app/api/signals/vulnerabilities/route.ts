import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  VulnerabilitiesPayload,
  VulnCve,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fleet-wide vulnerability roll-up for the top-level /vulnerabilities page.
 *
 * Aggregates the latest per-tenant `vulnerabilities` signal snapshots into:
 *  - totals by severity across the federation
 *  - per-entity summary (total, critical, high, affected device count)
 *  - cross-tenant CVE correlation — which CVEs affect >1 entity, ranked
 *
 * Cross-tenant correlation is the unique value of doing this at Council
 * scope: a single entity's CISO can't see "CVE-2024-xxxx is in 8 tenants"
 * because each tenant only has visibility into its own devices.
 */

type EntitySummary = {
  id: string;
  nameEn: string;
  nameAr: string;
  cluster: string;
  hasData: boolean;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  exploitable: number;
  /** v2.5.32 — zero-day count surfaced from MTP CveTags. */
  zeroDay: number;
  affectedDevices: number;
  remediatedDevices: number;
  remediationTracked: boolean;
  error: string | null;
};

type CorrelatedCve = {
  cveId: string;
  severity: VulnCve["severity"];
  cvssScore: number | null;
  hasExploit: boolean;
  publishedDateTime: string | null;
  /** v2.5.32 — MTP `RecommendedSecurityUpdate` (KB id / advisory). */
  recommendedFix: string | null;
  /** v2.5.32 — MTP `CveTags` (ZeroDay / NoSecurityUpdate / Exploit / etc.). */
  tags: string[];
  /** Distinct entities where this CVE appears in top-50 list. */
  entityCount: number;
  /** Sum of currently-exposed devices across those entities. */
  totalAffectedDevices: number;
  /** Sum of remediated devices across those entities — patching progress so far. */
  totalRemediatedDevices: number;
  entities: Array<{
    id: string;
    nameEn: string;
    affectedDevices: number;
    remediatedDevices: number;
  }>;
};

export async function GET() {
  const role = await apiRequireRole("viewer");
  if (!role.ok) return role.response;

  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  // Aggregate totals across the fleet.
  const totals = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    exploitable: 0,
    zeroDay: 0,
    affectedDevices: 0,
    remediatedDevices: 0,
    entitiesWithData: 0,
    entitiesWithCritical: 0,
  };

  const entities: EntitySummary[] = [];

  // Per-CVE correlation map — key is CveId.
  const cveMap = new Map<string, CorrelatedCve>();

  for (const t of tenants) {
    const snap = getLatestSnapshot<VulnerabilitiesPayload>(t.id, "vulnerabilities");
    const payload = snap?.payload ?? null;
    const hasData = !!payload && payload.error == null && payload.total > 0;

    const entityRemediated =
      payload?.topCves.reduce((s, c) => s + (c.remediatedDevices ?? 0), 0) ?? 0;
    entities.push({
      id: t.id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      hasData,
      total: payload?.total ?? 0,
      critical: payload?.critical ?? 0,
      high: payload?.high ?? 0,
      medium: payload?.medium ?? 0,
      low: payload?.low ?? 0,
      exploitable: payload?.exploitable ?? 0,
      zeroDay: payload?.zeroDay ?? 0,
      affectedDevices: payload?.affectedDevices ?? 0,
      remediatedDevices: entityRemediated,
      remediationTracked: payload?.remediationTracked === true,
      error: payload?.error ?? null,
    });

    if (hasData) {
      totals.entitiesWithData++;
      if ((payload?.critical ?? 0) > 0) totals.entitiesWithCritical++;
      totals.total += payload!.total;
      totals.critical += payload!.critical;
      totals.high += payload!.high;
      totals.medium += payload!.medium;
      totals.low += payload!.low;
      totals.exploitable += payload!.exploitable;
      totals.zeroDay += payload!.zeroDay ?? 0;
      totals.affectedDevices += payload!.affectedDevices;
      // Sum remediated across this tenant's top CVEs.
      totals.remediatedDevices += payload!.topCves.reduce(
        (s, c) => s + (c.remediatedDevices ?? 0),
        0,
      );

      // Populate cross-tenant CVE map.
      for (const c of payload!.topCves) {
        if (!c.cveId) continue;
        const remediated = c.remediatedDevices ?? 0;
        const existing = cveMap.get(c.cveId);
        if (existing) {
          existing.entityCount++;
          existing.totalAffectedDevices += c.affectedDevices;
          existing.totalRemediatedDevices += remediated;
          existing.entities.push({
            id: t.id,
            nameEn: t.name_en,
            affectedDevices: c.affectedDevices,
            remediatedDevices: remediated,
          });
          // Promote severity up the ladder if any entity reports it higher.
          if (severityRank(c.severity) > severityRank(existing.severity)) {
            existing.severity = c.severity;
          }
          if ((c.cvssScore ?? 0) > (existing.cvssScore ?? 0)) {
            existing.cvssScore = c.cvssScore;
          }
          if (c.hasExploit) existing.hasExploit = true;
          // v2.5.32 — merge tags + prefer the longer recommendedFix string
          // (KB ids tend to be longer than fallback null).
          if (c.recommendedFix && !existing.recommendedFix) {
            existing.recommendedFix = c.recommendedFix;
          }
          if (Array.isArray(c.tags)) {
            for (const tag of c.tags) {
              if (!existing.tags.includes(tag)) existing.tags.push(tag);
            }
          }
        } else {
          cveMap.set(c.cveId, {
            cveId: c.cveId,
            severity: c.severity,
            cvssScore: c.cvssScore,
            hasExploit: c.hasExploit,
            publishedDateTime: c.publishedDateTime,
            recommendedFix: c.recommendedFix ?? null,
            tags: Array.isArray(c.tags) ? [...c.tags] : [],
            entityCount: 1,
            totalAffectedDevices: c.affectedDevices,
            totalRemediatedDevices: remediated,
            entities: [
              {
                id: t.id,
                nameEn: t.name_en,
                affectedDevices: c.affectedDevices,
                remediatedDevices: remediated,
              },
            ],
          });
        }
      }
    }
  }

  // Sort entities by critical desc then total desc.
  entities.sort((a, b) => b.critical - a.critical || b.total - a.total);

  // Correlated CVEs: ones affecting >= 2 entities, ranked by (entityCount,
  // severity, CVSS). Top 50.
  const correlated = Array.from(cveMap.values())
    .filter((c) => c.entityCount >= 2)
    .sort(
      (a, b) =>
        b.entityCount - a.entityCount ||
        severityRank(b.severity) - severityRank(a.severity) ||
        (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
    )
    .slice(0, 50);

  // Top overall CVEs (ignoring correlation), ranked by severity + CVSS.
  const topOverall = Array.from(cveMap.values())
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        (b.cvssScore ?? 0) - (a.cvssScore ?? 0) ||
        b.totalAffectedDevices - a.totalAffectedDevices,
    )
    .slice(0, 50);

  return NextResponse.json({
    totals,
    entities,
    correlated,
    topOverall,
  });
}

function severityRank(s: VulnCve["severity"]): number {
  switch (s) {
    case "Critical":
      return 4;
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
    default:
      return 0;
  }
}
