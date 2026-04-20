import { NextResponse, type NextRequest } from "next/server";
import { deleteLogo, logoExists, readLogoBytes, writeLogo } from "@/lib/branding/logo-store";
import { normalizeLogo, removeBackground } from "@/lib/branding/remove-bg";
import { setBranding, getBranding } from "@/lib/config/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Logo uploads can be a couple of MB once decoded, and sharp/onnx need the
// full bytes in memory. 6 MB cap is enough for every reasonable source PNG.
const MAX_BYTES = 6 * 1024 * 1024;

export async function GET() {
  const bytes = readLogoBytes();
  if (!bytes) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // No long-term cache — an operator may re-upload; the BrandingPanel
      // invalidates with a cache-busting query string on the <img> tags anyway.
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_logo_field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }

  const keepBackgroundRaw = form.get("keepBackground");
  const keepBackground =
    typeof keepBackgroundRaw === "string" && keepBackgroundRaw === "true";

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const processed = keepBackground
      ? await normalizeLogo(buf)
      : await removeBackground(buf);
    writeLogo(processed);
    setBranding({
      logoPath: "logo.png",
      logoBgRemoved: !keepBackground,
    });
    return NextResponse.json({
      ok: true,
      logoBgRemoved: !keepBackground,
      bytes: processed.byteLength,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "process_failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  if (!logoExists()) {
    return NextResponse.json({ ok: true, alreadyAbsent: true });
  }
  deleteLogo();
  const current = getBranding();
  setBranding({
    logoPath: null,
    logoBgRemoved: current.logoBgRemoved,
  });
  return NextResponse.json({ ok: true });
}
