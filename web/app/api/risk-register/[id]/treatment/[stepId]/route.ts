import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import {
  updateTreatmentStep,
  deleteTreatmentStep,
} from "@/lib/db/risk-treatment";

/**
 * Risk treatment-plan step — update / delete by id.
 * v2.7.0.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z
  .object({
    stepText: z.string().trim().min(1).max(2000).optional(),
    owner: z.string().trim().max(200).optional(),
    dueDate: z.string().trim().max(40).optional(),
    status: z.enum(["open", "in_progress", "done", "blocked"]).optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;
  const { stepId } = await params;
  const id = Number(stepId);
  if (!Number.isFinite(id)) {
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
  const step = updateTreatmentStep(id, parsed.data);
  if (!step) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ step });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;
  const { stepId } = await params;
  const id = Number(stepId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  deleteTreatmentStep(id);
  return NextResponse.json({ ok: true });
}
