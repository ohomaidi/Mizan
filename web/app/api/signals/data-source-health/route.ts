import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-data-source health indicator for the sidebar. Replaces the
 * hardcoded traffic-light stubs that used to mislabel Purview and
 * Compliance Manager as "Degraded" even on tenants that had full data.
 *
 * Methodology: for each of the six data sources Mizan draws from, we
 * count the consented tenants that have at least one successful
 * snapshot for any of the source's component signal types within the
 * last 48h. Then:
 *
 *   coverage >= 66%  → green   (most of the fleet is flowing data)
 *   coverage >= 33%  → amber   (partial — license gaps or throttles)
 *   coverage >  0%   → amber
 *   coverage == 0    → red     (source is dark across the whole fleet)
 *   no consented tenants → amber (no data to judge from yet)
 */

export type DataSourceKey =
  | "secureScore"
  | "defender"
  | "purview"
  | "entra"
  | "intune"
  | "compliance";

type Health = "green" | "amber" | "red";

/**
 * Mapping from each UI "data source" to the underlying signal_types it
 * depends on. A source is considered alive if *any* of its component
 * signals returned ok for the tenant in the lookback window.
 */
const SOURCE_TO_SIGNALS: Record<DataSourceKey, readonly string[]> = {
  secureScore: ["secureScore"],
  defender: [
    "incidents",
    "threatIntelligence",
    "attackSimulations",
    "advancedHunting",
    "dfiSensorHealth",
  ],
  purview: [
    "dlpAlerts",
    "irmAlerts",
    "commCompAlerts",
    "retentionLabels",
    "sensitivityLabels",
    "sharepointSettings",
    "labelAdoption",
  ],
  entra: ["conditionalAccess", "riskyUsers", "pimSprawl"],
  intune: ["devices"],
  compliance: ["subjectRightsRequests", "sensitivityLabels", "retentionLabels"],
};

// 72h tolerates one missed daily sync (cron skips, container restart) before
// dropping a data-source dot from green to amber. Tighter than the UX
// complaint threshold but loose enough not to cry wolf on a single blip.
// Override with env for operators on hourly-sync cadences.
const LOOKBACK_HOURS = Number(process.env.SCSC_DATA_SOURCE_LOOKBACK_HOURS ?? "72");

type CoverageRow = { tenant_id: string };

function healthFor(
  consentedTenants: number,
  tenantsWithData: number,
): Health {
  if (consentedTenants === 0) return "amber";
  const pct = tenantsWithData / consentedTenants;
  if (pct >= 0.66) return "green";
  if (pct > 0) return "amber";
  return "red";
}

export async function GET() {
  const db = getDb();

  // Count consented tenants once — denominator for every source.
  const consentedTenants = (
    db
      .prepare("SELECT COUNT(*) AS n FROM tenants WHERE consent_status = 'consented'")
      .get() as { n: number }
  ).n;

  const cutoff = new Date(
    Date.now() - LOOKBACK_HOURS * 3_600_000,
  ).toISOString();

  const result: Record<DataSourceKey, { status: Health; coverage: number }> = {
    secureScore: { status: "amber", coverage: 0 },
    defender: { status: "amber", coverage: 0 },
    purview: { status: "amber", coverage: 0 },
    entra: { status: "amber", coverage: 0 },
    intune: { status: "amber", coverage: 0 },
    compliance: { status: "amber", coverage: 0 },
  };

  for (const [source, signals] of Object.entries(SOURCE_TO_SIGNALS) as Array<
    [DataSourceKey, readonly string[]]
  >) {
    if (signals.length === 0) continue;
    const placeholders = signals.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT DISTINCT ss.tenant_id
           FROM signal_snapshots ss
           JOIN tenants t ON t.id = ss.tenant_id
          WHERE ss.signal_type IN (${placeholders})
            AND ss.ok = 1
            AND ss.fetched_at >= ?
            AND t.consent_status = 'consented'`,
      )
      .all(...signals, cutoff) as CoverageRow[];

    const tenantsWithData = rows.length;
    result[source] = {
      status: healthFor(consentedTenants, tenantsWithData),
      coverage:
        consentedTenants > 0
          ? Math.round((tenantsWithData / consentedTenants) * 100)
          : 0,
    };
  }

  return NextResponse.json({
    lookbackHours: LOOKBACK_HOURS,
    consentedTenants,
    sources: result,
  });
}
