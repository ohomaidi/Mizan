import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  DEFAULT_NESA_MAPPING,
  getNesaMapping,
  resetNesaMapping,
  setNesaMapping,
  type NesaMapping,
} from "@/lib/config/nesa-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ClauseSchema = z.object({
  id: z.string().trim().min(1).max(64),
  ref: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().max(1000).default(""),
  descriptionAr: z.string().trim().max(1000).default(""),
  secureScoreControls: z.array(z.string()).default([]),
  weight: z.number().min(0).max(100),
});

const Schema = z.union([
  z.object({ reset: z.literal(true) }),
  z.object({
    frameworkVersion: z.string().trim().min(1).max(120),
    clauses: z.array(ClauseSchema).min(1).max(40),
  }),
]);

export async function GET() {
  return NextResponse.json({
    mapping: getNesaMapping(),
    defaults: DEFAULT_NESA_MAPPING,
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
  if ("reset" in parsed.data) {
    return NextResponse.json({ mapping: resetNesaMapping() });
  }
  return NextResponse.json({
    mapping: setNesaMapping(parsed.data as NesaMapping),
  });
}
