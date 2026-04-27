import { NextResponse, type NextRequest } from "next/server";
import { deleteLogo, logoExists, readLogoBytes, writeLogo } from "@/lib/branding/logo-store";
import { normalizeLogo } from "@/lib/branding/logo-image";
import { setBranding, getBranding } from "@/lib/config/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Logo uploads can be a couple of MB once decoded, and sharp needs the
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

  // v2.5.8 — automatic background removal (U-2-Net + onnxruntime-node)
  // is gone. It was unreliable in production: the model file was
  // missing on some installs, the native binding crashed cold-starts on
  // others, and the alpha mask routinely chewed off real logo content.
  // Operators upload pre-cropped PNGs with transparency — `normalizeLogo`
  // just round-trips through PNG with alpha preserved. The
  // `keepBackground` form field is silently ignored for backward
  // compat; the stored `logoBgRemoved` flag is always false now.
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const processed = await normalizeLogo(buf);
    writeLogo(processed);
    setBranding({
      logoPath: "logo.png",
      logoBgRemoved: false,
    });
    return NextResponse.json({
      ok: true,
      logoBgRemoved: false,
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
