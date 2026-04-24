import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  DEFAULT_BRANDING,
  getBranding,
  resetBranding,
  setBranding,
  type FrameworkId,
} from "@/lib/config/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX = /^#[0-9a-fA-F]{6}$/;
const FRAMEWORKS: FrameworkId[] = ["nesa", "dubai-isr", "nca", "isr", "generic"];

const Schema = z
  .object({
    nameEn: z.string().trim().min(2).max(120).optional(),
    nameAr: z.string().trim().min(2).max(120).optional(),
    shortEn: z.string().trim().min(1).max(32).optional(),
    shortAr: z.string().trim().min(1).max(32).optional(),
    taglineEn: z.string().trim().max(200).optional(),
    taglineAr: z.string().trim().max(200).optional(),
    accentColor: z.string().trim().regex(HEX, "expected #RRGGBB").optional(),
    accentColorStrong: z.string().trim().regex(HEX, "expected #RRGGBB").optional(),
    frameworkId: z.enum(FRAMEWORKS as [FrameworkId, ...FrameworkId[]]).optional(),
    reset: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.reset ||
      Object.keys(v).some((k) => k !== "reset" && v[k as keyof typeof v] !== undefined),
    { message: "at least one field required" },
  );

export async function GET() {
  return NextResponse.json({
    branding: getBranding(),
    defaults: DEFAULT_BRANDING,
  });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.reset) {
    resetBranding();
  } else {
    const { reset: _reset, ...patch } = parsed.data;
    void _reset;
    setBranding(patch);
  }
  return NextResponse.json({ branding: getBranding() });
}
