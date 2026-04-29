import { NextResponse, type NextRequest } from "next/server";
import { getDraft, getDraftPdf } from "@/lib/db/board-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream the persisted PDF bytes for a board-report draft. Separate
 * route from /api/board-report/drafts/[id] so the JSON metadata is
 * cheap to fetch when listing drafts; only this endpoint returns the
 * (potentially multi-MB) blob.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const draft = getDraft(id);
  if (!draft) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const blob = getDraftPdf(id);
  if (!blob) {
    return NextResponse.json({ error: "missing_pdf" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(blob), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="board-report-${draft.period}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
