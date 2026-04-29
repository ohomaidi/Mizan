import { NextResponse, type NextRequest } from "next/server";
import { unpinKpi } from "@/lib/db/scorecard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  unpinKpi(id);
  return NextResponse.json({ ok: true });
}
