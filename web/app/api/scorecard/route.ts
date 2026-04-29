import { NextResponse } from "next/server";
import { listPins } from "@/lib/db/scorecard";
import {
  KPI_CATALOG,
  computeKpiValue,
  getCatalogEntry,
} from "@/lib/scorecard/catalog";
import { listCustomKpis, getCustomKpiByKind } from "@/lib/db/custom-kpi";

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
    // Built-in catalog or custom-kpi row — both supported sources of
    // direction / unit metadata. Custom KPIs ride on the same pin
    // table so the existing pin/unpin endpoints work unchanged.
    const entry = getCatalogEntry(p.kpi_kind);
    const custom = entry
      ? null
      : p.kpi_kind.startsWith("custom:")
        ? getCustomKpiByKind(p.kpi_kind)
        : null;
    const v = computeKpiValue(p.kpi_kind);
    return {
      ...p,
      direction: entry?.direction ?? custom?.direction ?? "higherBetter",
      unit: entry?.unit ?? custom?.unit ?? "count",
      current: v.current,
      status: v.status,
    };
  });

  // Catalog = built-ins + every custom KPI the operator has authored.
  // The picker UI renders both lists; pinning a custom one stamps a
  // ciso_scorecard_pins row with the "custom:*" kind.
  const customCatalog = listCustomKpis().map((c) => ({
    kind: c.kpi_kind,
    labelKey: c.label, // already a human label, not a dict key
    descriptionKey: c.description ?? "",
    defaultTarget: c.target,
    unit: c.unit,
    direction: c.direction,
    isCustom: true as const,
  }));

  return NextResponse.json({
    catalog: [
      ...KPI_CATALOG.map((c) => ({
        kind: c.kind,
        labelKey: c.labelKey,
        descriptionKey: c.descriptionKey,
        defaultTarget: c.defaultTarget,
        unit: c.unit,
        direction: c.direction,
        isCustom: false as const,
      })),
      ...customCatalog,
    ],
    pins: enriched,
  });
}
