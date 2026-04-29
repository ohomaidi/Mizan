import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteDraft,
  getDraft,
  signDraft,
} from "@/lib/db/board-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  action: z.enum(["sign"]).optional(),
  signedBy: z.string().trim().max(200).optional(),
});

function parseId(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ draft });
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
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  if (parsed.data.action === "sign") {
    const draft = signDraft(id, parsed.data.signedBy ?? "operator");
    return NextResponse.json({ draft });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  deleteDraft(id);
  return NextResponse.json({ ok: true });
}
