import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDiscoveryTemplate } from "@/lib/config/discovery-template";
import { DiscoveryLetter } from "@/lib/pdf/DiscoveryLetter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  try {
    const template = getDiscoveryTemplate();
    const doc = (
      <DiscoveryLetter
        lang={lang}
        template={template}
        issueDate={new Date().toISOString().slice(0, 10)}
      />
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="council-discovery-letter-${lang}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Common production failure: PDF font assets missing from the
    // runtime image (Dockerfile didn't copy `/app/assets/`). Surface the
    // actionable message from `ensureFontsRegistered` instead of letting
    // Next render an opaque 500 page. Logged server-side too.
    const message = (err as Error).message ?? String(err);
    console.error("[discovery-letter] PDF render failed:", message);
    return NextResponse.json(
      {
        error: "pdf_render_failed",
        message,
      },
      { status: 500 },
    );
  }
}
