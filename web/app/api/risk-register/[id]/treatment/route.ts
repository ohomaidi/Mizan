import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import {
  listTreatmentSteps,
  createTreatmentStep,
} from "@/lib/db/risk-treatment";

/**
 * Risk treatment-plan steps — list + create.
 *
 *   GET   /api/risk-register/{riskId}/treatment        → list steps
 *   POST  /api/risk-register/{riskId}/treatment        → add a step
 *   PATCH /api/risk-register/{riskId}/treatment/{id}   → update
 *   DEL   /api/risk-register/{riskId}/treatment/{id}   → delete
 *
 * v2.7.0.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  stepText: z.string().trim().min(1).max(2000),
  owner: z.string().trim().max(200).optional(),
  dueDate: z.string().trim().max(40).optional(),
  status: z.enum(["open", "in_progress", "done", "blocked"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireRole("viewer");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const riskId = Number(id);
  if (!Number.isFinite(riskId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  return NextResponse.json({ steps: listTreatmentSteps(riskId) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const riskId = Number(id);
  if (!Number.isFinite(riskId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
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
  const step = createTreatmentStep({ riskId, ...parsed.data });
  return NextResponse.json({ step });
}
