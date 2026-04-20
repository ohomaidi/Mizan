import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InstallationGuide } from "@/lib/pdf/docs/InstallationGuide";
import { OperatorManual } from "@/lib/pdf/docs/OperatorManual";
import { SecurityPrivacyStatement } from "@/lib/pdf/docs/SecurityPrivacy";
import { ArchitectureOverview } from "@/lib/pdf/docs/ArchitectureOverview";
import { HandoffChecklist } from "@/lib/pdf/docs/HandoffChecklist";
import type { DocLang } from "@/lib/pdf/docs/layout";
import { getBranding } from "@/lib/config/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCS = {
  "installation-guide": {
    Component: InstallationGuide,
    slug: "installation-guide",
  },
  "operator-manual": {
    Component: OperatorManual,
    slug: "operator-manual",
  },
  "security-privacy": {
    Component: SecurityPrivacyStatement,
    slug: "security-privacy",
  },
  "architecture-overview": {
    Component: ArchitectureOverview,
    slug: "architecture-overview",
  },
  "handoff-checklist": {
    Component: HandoffChecklist,
    slug: "handoff-checklist",
  },
} as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "posture";
}

type DocId = keyof typeof DOCS;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!(id in DOCS)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const langRaw = req.nextUrl.searchParams.get("lang");
  const lang: DocLang = langRaw === "ar" ? "ar" : "en";

  const { Component, slug } = DOCS[id as DocId];
  const prefix = slugify(getBranding().shortEn);
  const buf = await renderToBuffer(<Component lang={lang} />);
  const body = new Uint8Array(buf);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prefix}-${slug}-${lang}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
