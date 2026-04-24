import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getLatestSnapshot } from "@/lib/db/signals";
import { getTenant } from "@/lib/db/tenants";
import type { IncidentsPayload } from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/tenant-incidents?tenantId=xxx
 *
 * Returns the selected tenant's most recent incidents + their individual
 * alerts, flattened for the threat-submission console dropdown. Powers
 * the "pick an incident to see its details" UX on /directive so an analyst
 * doesn't have to hop to Defender XDR to grab a message URI or URL they
 * want to submit.
 */
export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenantId" }, { status: 400 });
  }
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  const snap = getLatestSnapshot<IncidentsPayload>(tenantId, "incidents");
  const payload = snap?.payload;
  const incidents = payload?.incidents ?? [];

  // Trim down to the fields the submission console uses. Keep the web URL
  // so the console can show an "Open in Defender XDR" link for incidents
  // whose alert evidence the analyst still needs to inspect.
  return NextResponse.json({
    tenantId,
    tenantNameEn: tenant.name_en,
    incidents: incidents.slice(0, 50).map((inc) => ({
      id: inc.id,
      displayName: inc.displayName,
      severity: inc.severity,
      status: inc.status,
      classification: inc.classification ?? null,
      determination: inc.determination ?? null,
      createdDateTime: inc.createdDateTime,
      lastUpdateDateTime: inc.lastUpdateDateTime,
      alertCount: inc.alertCount ?? null,
      incidentWebUrl: inc.incidentWebUrl ?? null,
      tags: inc.tags ?? [],
    })),
  });
}
