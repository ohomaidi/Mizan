import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getActiveComplianceMapping,
  getActiveComplianceDefaults,
  setActiveComplianceMapping,
  resetActiveComplianceMapping,
  type ComplianceMapping,
} from "@/lib/config/compliance-framework";

/**
 * Compliance-framework catalog API.
 *
 * Path stayed `/api/config/nesa` for backward compatibility — older
 * settings panels and any external integrations keep working — but the
 * route now delegates to the active-framework registry. Whichever
 * framework is selected via `branding.frameworkId` (NESA, Dubai ISR,
 * etc.) is the catalog this endpoint reads + writes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ClauseSchema = z.object({
  id: z.string().trim().min(1).max(64),
  ref: z.string().trim().min(1).max(200),
  classRef: z
    .enum(["Governance", "Operation", "Assurance"])
    .optional(),
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
    status: z.enum(["official", "draft"]).optional(),
    draftNote: z.string().trim().max(2000).optional(),
    clauses: z.array(ClauseSchema).min(1).max(40),
  }),
]);

export async function GET() {
  return NextResponse.json({
    mapping: getActiveComplianceMapping(),
    defaults: getActiveComplianceDefaults(),
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
    return NextResponse.json({ mapping: resetActiveComplianceMapping() });
  }
  // The framework field on the payload is whatever the active framework
  // is — we don't trust the client to switch frameworks via this
  // endpoint (that's `branding.frameworkId`'s job). We stamp it from
  // the active registry entry to prevent cross-framework write.
  const active = getActiveComplianceMapping();
  return NextResponse.json({
    mapping: setActiveComplianceMapping({
      ...parsed.data,
      framework: active.framework,
      status: parsed.data.status ?? active.status,
    } as ComplianceMapping),
  });
}
