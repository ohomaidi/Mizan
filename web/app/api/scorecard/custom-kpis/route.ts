import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import { listCustomKpis, createCustomKpi } from "@/lib/db/custom-kpi";
import { parseFormula } from "@/lib/scorecard/custom-formula";

/**
 * Custom CISO scorecard KPIs — list + create. v2.7.0.
 *
 *   GET   /api/scorecard/custom-kpis           → list
 *   POST  /api/scorecard/custom-kpis           → create
 *   DEL   /api/scorecard/custom-kpis/{id}      → delete (separate file)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FormulaSchema = z.union([
  z.object({
    kind: z.literal("signalNumber"),
    signal: z.string().min(1).max(60),
    field: z.string().min(1).max(80),
  }),
  z.object({
    kind: z.literal("ratio"),
    numerator: z.object({
      signal: z.string().min(1).max(60),
      field: z.string().min(1).max(80),
    }),
    denominator: z.object({
      signal: z.string().min(1).max(60),
      field: z.string().min(1).max(80),
    }),
    asPercent: z.boolean().optional(),
  }),
]);

const Schema = z.object({
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  unit: z.enum(["percent", "count", "hours", "boolean"]),
  direction: z.enum(["higherBetter", "lowerBetter"]),
  target: z.number().finite(),
  formula: FormulaSchema,
});

export async function GET() {
  const auth = await apiRequireRole("viewer");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ customKpis: listCustomKpis() });
}

export async function POST(req: NextRequest) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;

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

  // Stricter validation of the formula via the runtime parser —
  // catches things zod can't express (e.g. allowed signal types,
  // safe path regex).
  const validFormula = parseFormula(parsed.data.formula);
  if (!validFormula) {
    return NextResponse.json(
      { error: "invalid_formula" },
      { status: 400 },
    );
  }

  const created = createCustomKpi({
    ...parsed.data,
    formula: validFormula,
  });
  return NextResponse.json({ customKpi: created });
}
