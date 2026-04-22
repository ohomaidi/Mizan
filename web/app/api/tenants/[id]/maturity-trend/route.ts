import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenant } from "@/lib/db/tenants";
import {
  listMaturitySnapshotsForTenant,
  type Granularity,
  type MaturitySnapshotRow,
} from "@/lib/db/maturity-snapshots";
import { apiRequireRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Time-series of a single tenant's Maturity Index + sub-scores.
 *
 * Query:
 *   range       = 7d | 30d | 90d | all    (default 30d)
 *   granularity = daily | weekly | monthly (default = auto by range:
 *                 7d → daily, 30d → daily, 90d → weekly, all → monthly)
 *
 * Response:
 *   {
 *     tenantId, range, granularity,
 *     series: [ { date, overall, secureScore, identity, device, data, threat, compliance, delta? } ],
 *     summary: { deltaOverall, direction: "up" | "down" | "flat", first, last }
 *   }
 *
 * `delta` on each point is vs the immediately previous point in the series.
 * `summary.deltaOverall` is first→last across the whole window — the number
 * the Entity Detail header reads as "+3.2 over 30d".
 */

const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  granularity: z.enum(["daily", "weekly", "monthly"]).optional(),
});

const RANGE_DAYS: Record<"7d" | "30d" | "90d" | "all", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 365 * 10, // "all" clamped to 10y — retention caps it lower anyway
};

function autoGranularity(range: "7d" | "30d" | "90d" | "all"): Granularity {
  if (range === "7d" || range === "30d") return "daily";
  if (range === "90d") return "weekly";
  return "monthly";
}

type SeriesPoint = {
  date: string;
  overall: number;
  secureScore: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
  delta: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function rowToPoint(
  row: MaturitySnapshotRow,
  prev: MaturitySnapshotRow | null,
): SeriesPoint {
  return {
    date: row.captured_at,
    overall: round1(row.overall),
    secureScore: round1(row.secure_score),
    identity: round1(row.identity),
    device: round1(row.device),
    data: round1(row.data),
    threat: round1(row.threat),
    compliance: round1(row.compliance),
    delta: prev ? round1(row.overall - prev.overall) : 0,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const role = await apiRequireRole("viewer");
  if (!role.ok) return role.response;

  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    range: url.searchParams.get("range") ?? undefined,
    granularity: url.searchParams.get("granularity") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const range = parsed.data.range;
  const granularity = parsed.data.granularity ?? autoGranularity(range);
  const sinceDays = RANGE_DAYS[range];

  const rows = listMaturitySnapshotsForTenant(id, {
    sinceDays,
    granularity,
  });

  const series: SeriesPoint[] = [];
  let prev: MaturitySnapshotRow | null = null;
  for (const r of rows) {
    series.push(rowToPoint(r, prev));
    prev = r;
  }

  const first = series[0] ?? null;
  const last = series[series.length - 1] ?? null;
  const deltaOverall =
    first && last ? round1(last.overall - first.overall) : 0;
  const direction: "up" | "down" | "flat" =
    deltaOverall > 0.05 ? "up" : deltaOverall < -0.05 ? "down" : "flat";

  return NextResponse.json({
    tenantId: id,
    range,
    granularity,
    series,
    summary: {
      deltaOverall,
      direction,
      first,
      last,
    },
  });
}
