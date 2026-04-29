import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  acceptSuggestion,
  deleteRisk,
  dismissSuggestion,
  getRisk,
  updateRisk,
} from "@/lib/db/risk-register";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  owner: z.string().trim().max(200).optional(),
  dueDate: z.string().trim().max(40).optional(),
  status: z
    .enum(["open", "mitigated", "accepted", "dismissed"])
    .optional(),
  mitigationNotes: z.string().trim().max(2000).optional(),
  // Action verbs (treated specially server-side):
  action: z.enum(["accept", "dismiss"]).optional(),
});

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const risk = getRisk(id);
  if (!risk) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ risk });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.action === "accept") {
    return NextResponse.json({ risk: acceptSuggestion(id) });
  }
  if (parsed.data.action === "dismiss") {
    return NextResponse.json({ risk: dismissSuggestion(id) });
  }
  const { action: _, ...patch } = parsed.data;
  return NextResponse.json({ risk: updateRisk(id, patch) });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  deleteRisk(id);
  return NextResponse.json({ ok: true });
}
