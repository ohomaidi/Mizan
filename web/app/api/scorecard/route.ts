import { NextResponse } from "next/server";
import { listPins } from "@/lib/db/scorecard";
import {
  KPI_CATALOG,
  computeKpiValue,
  getCatalogEntry,
} from "@/lib/scorecard/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/scorecard — returns:
 *   - The full KPI catalog (so the operator can pick from it).
 *   - The currently pinned KPIs, each with computed current value +
 *     status against the target.
 *
 * v2.6.0.
 */
export async function GET() {
  const pins = listPins();
  const enriched = pins.map((p) => {
    const entry = getCatalogEntry(p.kpi_kind);
    const v = computeKpiValue(p.kpi_kind);
    return {
      ...p,
      direction: entry?.direction ?? "higherBetter",
      unit: entry?.unit ?? "count",
      current: v.current,
      status: v.status,
    };
  });
  return NextResponse.json({
    catalog: KPI_CATALOG.map((c) => ({
      kind: c.kind,
      labelKey: c.labelKey,
      descriptionKey: c.descriptionKey,
      defaultTarget: c.defaultTarget,
      unit: c.unit,
      direction: c.direction,
    })),
    pins: enriched,
  });
}
