import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_PDF_TEMPLATE,
  getPdfTemplate,
  resetPdfTemplate,
  setPdfTemplate,
  type PdfTemplate,
} from "@/lib/config/pdf-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    template: getPdfTemplate(),
    defaults: DEFAULT_PDF_TEMPLATE,
  });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    body &&
    typeof body === "object" &&
    "reset" in body &&
    (body as { reset?: boolean }).reset === true
  ) {
    return NextResponse.json({ template: resetPdfTemplate() });
  }

  const parsed = body as PdfTemplate;
  if (!parsed || !Array.isArray(parsed.sections)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const saved = setPdfTemplate(parsed);
  return NextResponse.json({ template: saved });
}
