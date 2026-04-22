import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type { VulnerabilitiesPayload } from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-CVE drill-down for the /vulnerabilities correlation + top-CVE tables.
 *
 * Walks every consented tenant's latest vulnerabilities snapshot and returns
 * the subset of devices whose cveIds array contains the requested CVE,
 * grouped by entity. Lazy-loaded on expand so the main rollup stays light.
 *
 * Response shape:
 *   {
 *     cveId,
 *     severity, cvssScore, hasExploit, publishedDateTime,
 *     totalExposedDevices, totalRemediatedDevices,
 *     byEntity: [{
 *       entityId, entityName,
 *       exposedDevices,   // count
 *       remediatedDevices,
 *       devices: [{ deviceName, osPlatform, cveCount, critical, high, maxCvss }]
 *     }]
 *   }
 */

type DeviceRow = {
  deviceName: string;
  osPlatform: string | null;
  cveCount: number;
  critical: number;
  high: number;
  maxCvss: number | null;
};

type EntityRow = {
  entityId: string;
  entityName: string;
  exposedDevices: number;
  remediatedDevices: number;
  devices: DeviceRow[];
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cveId: string }> },
) {
  const role = await apiRequireRole("viewer");
  if (!role.ok) return role.response;

  const { cveId } = await ctx.params;
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  const byEntity: EntityRow[] = [];
  let totalExposed = 0;
  let totalRemediated = 0;
  let severity: string | null = null;
  let cvssScore: number | null = null;
  let hasExploit = false;
  let publishedDateTime: string | null = null;

  for (const t of tenants) {
    const snap = getLatestSnapshot<VulnerabilitiesPayload>(
      t.id,
      "vulnerabilities",
    );
    const payload = snap?.payload;
    if (!payload || payload.error) continue;

    // Does this tenant report the CVE at all?
    const cveMeta = payload.topCves.find((c) => c.cveId === cveId);
    if (!cveMeta) continue;

    // Capture CVE metadata once (all tenants should agree since CVEs are
    // globally unique — but we take the highest severity/CVSS just in case).
    if (
      !severity ||
      severityRank(cveMeta.severity) > severityRank(severity as string)
    ) {
      severity = cveMeta.severity;
    }
    if ((cveMeta.cvssScore ?? 0) > (cvssScore ?? 0)) {
      cvssScore = cveMeta.cvssScore;
    }
    if (cveMeta.hasExploit) hasExploit = true;
    if (!publishedDateTime) publishedDateTime = cveMeta.publishedDateTime;

    // Per-device hits inside this tenant.
    const devices: DeviceRow[] = payload.byDevice
      .filter((d) => d.cveIds.includes(cveId))
      .map((d) => ({
        deviceName: d.deviceName,
        osPlatform: d.osPlatform,
        cveCount: d.cveCount,
        critical: d.critical,
        high: d.high,
        maxCvss: d.maxCvss,
      }))
      .sort((a, b) => b.critical - a.critical || b.cveCount - a.cveCount);

    byEntity.push({
      entityId: t.id,
      entityName: t.name_en,
      exposedDevices: cveMeta.affectedDevices,
      remediatedDevices: cveMeta.remediatedDevices,
      devices,
    });
    totalExposed += cveMeta.affectedDevices;
    totalRemediated += cveMeta.remediatedDevices;
  }

  // Sort entities by exposed devices descending.
  byEntity.sort((a, b) => b.exposedDevices - a.exposedDevices);

  return NextResponse.json({
    cveId,
    severity: severity ?? "Unknown",
    cvssScore,
    hasExploit,
    publishedDateTime,
    totalExposedDevices: totalExposed,
    totalRemediatedDevices: totalRemediated,
    byEntity,
  });
}

function severityRank(s: string): number {
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
