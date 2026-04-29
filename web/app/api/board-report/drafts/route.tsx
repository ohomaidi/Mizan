import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  createDraft,
  currentPeriod,
  listDrafts,
} from "@/lib/db/board-report";
import { buildBoardReportData } from "@/lib/board-report/data";
import { BoardReportPdf } from "@/lib/board-report/BoardReportPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Board report drafts API.
 *
 *   GET — list existing drafts (newest first), no PDF bytes.
 *   POST — generate a new draft for the current quarter (or a custom
 *          period) and persist the rendered PDF for re-download. v2.6.0.
 */

export async function GET() {
  return NextResponse.json({ drafts: listDrafts() });
}

export async function POST(req: NextRequest) {
  let body: { period?: string; plannedActions?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body OK */
  }
  const period = body.period ?? currentPeriod();
  const data = buildBoardReportData(period);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = await renderToBuffer(<BoardReportPdf data={data} /> as any);
  const draft = createDraft({
    period,
    pdfBlob: buf,
    plannedActions: body.plannedActions,
  });
  return NextResponse.json({ draft }, { status: 201 });
}
