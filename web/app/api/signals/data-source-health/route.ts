import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-data-source health indicator for the sidebar. Replaces the
 * hardcoded traffic-light stubs that used to mislabel Purview and
 * Compliance Manager as "Degraded" even on tenants that had full data.
 *
 * v2.5.11+ — adds an "unavailable" status to distinguish two cases the
 * v2.5.0 logic conflated:
 *   - **Source is genuinely broken** — primary signals returning 5xx,
 *     auth errors, or no data at all from tenants that should have the
 *     SKU. Real operational concern, dot goes red.
 *   - **Source isn't licensed** — every consented tenant returned 4xx
 *     (403 / 404 = "this tenant doesn't have Defender XDR / Purview /
 *     etc."). Not a problem. Dot is grey, label says "not provisioned".
 *
 * Methodology: for each of the six data sources Mizan draws from, we
 * compute three counts within the last 72h:
 *   - `withData`        : tenants with ≥1 successful snapshot for any
 *                         signal in the source.
 *   - `licenseGated`    : tenants whose every attempted signal in the
 *                         source returned 4xx (and no successes).
 *   - `effective`       : consented − licenseGated. The denominator we
 *                         actually grade against.
 *
 * Then:
 *   no consented tenants            → amber (no data to judge from yet)
 *   effective == 0 but consented > 0 → unavailable (grey — every tenant
 *                                      lacks the SKU; this isn't a Mizan
 *                                      problem)
 *   withData / effective >= 66%     → green
 *   withData / effective >  0%      → amber
 *   withData / effective == 0       → red (source is dark across every
 *                                      tenant that *should* have data)
 */

export type DataSourceKey =
  | "secureScore"
  | "defender"
  | "purview"
  | "entra"
  | "intune"
  | "compliance";

type Health = "green" | "amber" | "red" | "unavailable";

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
type FailureRow = { tenant_id: string; http_status: number | null };

function healthFor(
  consentedTenants: number,
  withData: number,
  licenseGated: number,
): Health {
  if (consentedTenants === 0) return "amber";
  // If every consented tenant is license-gated, the source is fine —
  // the customer just doesn't own the SKU. Don't alarm.
  if (licenseGated === consentedTenants) return "unavailable";
  const effective = consentedTenants - licenseGated;
  if (effective === 0) return "unavailable";
  const pct = withData / effective;
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

  const result: Record<
    DataSourceKey,
    { status: Health; coverage: number; licenseGated: number }
  > = {
    secureScore: { status: "amber", coverage: 0, licenseGated: 0 },
    defender: { status: "amber", coverage: 0, licenseGated: 0 },
    purview: { status: "amber", coverage: 0, licenseGated: 0 },
    entra: { status: "amber", coverage: 0, licenseGated: 0 },
    intune: { status: "amber", coverage: 0, licenseGated: 0 },
    compliance: { status: "amber", coverage: 0, licenseGated: 0 },
  };

  for (const [source, signals] of Object.entries(SOURCE_TO_SIGNALS) as Array<
    [DataSourceKey, readonly string[]]
  >) {
    if (signals.length === 0) continue;
    const placeholders = signals.map(() => "?").join(",");

    // Tenants with ≥1 successful snapshot for ANY signal in the source.
    const okRows = db
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
    const withData = new Set(okRows.map((r) => r.tenant_id)).size;

    // Tenants whose latest attempt for ANY signal in the source was a
    // 4xx error AND that have no successful attempts. These are
    // "license-gated" — Microsoft Graph returns 401/403/404 when the
    // tenant doesn't have the SKU (Defender XDR P2, Purview, etc.).
    // We only count them when they have ZERO successes for the source —
    // otherwise the source is partially working and shouldn't be
    // flagged as unavailable.
    const failRows = db
      .prepare(
        `SELECT ss.tenant_id, ss.http_status
           FROM signal_snapshots ss
           JOIN tenants t ON t.id = ss.tenant_id
          WHERE ss.signal_type IN (${placeholders})
            AND ss.ok = 0
            AND ss.http_status IS NOT NULL
            AND ss.fetched_at >= ?
            AND t.consent_status = 'consented'`,
      )
      .all(...signals, cutoff) as FailureRow[];

    // Group failure status codes by tenant; "license-gated" = tenant
    // had only 4xx errors and no successes. 5xx or 401 from Mizan's
    // own perspective (token issues) does NOT count as license-gated —
    // those are operational concerns the operator should see as red.
    const failuresByTenant = new Map<string, Set<number>>();
    for (const r of failRows) {
      if (r.http_status === null) continue;
      const set = failuresByTenant.get(r.tenant_id) ?? new Set<number>();
      set.add(r.http_status);
      failuresByTenant.set(r.tenant_id, set);
    }
    let licenseGated = 0;
    for (const [tenantId, codes] of failuresByTenant) {
      if (okRows.some((r) => r.tenant_id === tenantId)) continue;
      // 403 = "Authorization_RequestDenied" (no SKU)
      // 404 = "Resource not found" (product not provisioned in tenant)
      // 400 with InvalidAuthenticationToken would be 401 (real auth
      //     issue, not license-gated — excluded).
      const allFourXx = Array.from(codes).every(
        (c) => c >= 400 && c < 500 && c !== 401 && c !== 429,
      );
      if (allFourXx) licenseGated += 1;
    }

    const effective = consentedTenants - licenseGated;
    result[source] = {
      status: healthFor(consentedTenants, withData, licenseGated),
      coverage:
        effective > 0 ? Math.round((withData / effective) * 100) : 0,
      licenseGated,
    };
  }

  return NextResponse.json({
    lookbackHours: LOOKBACK_HOURS,
    consentedTenants,
    sources: result,
  });
}
