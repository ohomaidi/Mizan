import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getComplianceConfig,
  setComplianceConfig,
  resetComplianceConfig,
} from "@/lib/config/compliance-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Council-editable settings for the Framework Compliance score.
 * Sits alongside `/api/config/maturity` (which controls the Maturity
 * Index sub-score weights). This endpoint is the source of truth for
 * the target % flag + the unscored-treatment toggle.
 */

const Schema = z.union([
  z.object({ reset: z.literal(true) }),
  z.object({
    target: z.number().min(0).max(100).optional(),
    unscoredTreatment: z.enum(["skip", "zero"]).optional(),
  }),
]);

export async function GET() {
  return NextResponse.json({ config: getComplianceConfig() });
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
    return NextResponse.json({ config: resetComplianceConfig() });
  }
  return NextResponse.json({ config: setComplianceConfig(parsed.data) });
}
