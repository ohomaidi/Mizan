import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDiscoveryTemplate } from "@/lib/config/discovery-template";
import { DiscoveryLetter } from "@/lib/pdf/DiscoveryLetter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
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
}
