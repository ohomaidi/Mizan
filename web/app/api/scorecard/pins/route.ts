import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pinKpi } from "@/lib/db/scorecard";
import { getCatalogEntry, type KpiKind } from "@/lib/scorecard/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIND_VALUES: KpiKind[] = [
  "maturityIndex",
  "frameworkCompliance",
  "mfaAdminCoverage",
  "criticalCveAge",
  "privilegedRoleCount",
  "incidentMttr",
  "deviceCompliance",
  "highRiskUsers",
  "auditClosureSla",
  "boardReportDelivered",
];

const Schema = z.object({
  kpiKind: z.enum(KIND_VALUES as [KpiKind, ...KpiKind[]]),
  label: z.string().trim().min(1).max(120),
  target: z.number(),
  commitment: z.string().trim().max(500).optional(),
  dueDate: z.string().trim().max(40).optional(),
  owner: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  // Validate kind is in catalog (defense in depth — Schema enum already does this).
  if (!getCatalogEntry(parsed.data.kpiKind)) {
    return NextResponse.json({ error: "unknown_kpi" }, { status: 400 });
  }
  const pin = pinKpi(parsed.data);
  return NextResponse.json({ pin }, { status: 201 });
}
