import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import {
  getAutoSuggestConfig,
  setAutoSuggestConfig,
  AUTO_SUGGEST_RANGES,
  AUTO_SUGGEST_DEFAULTS,
} from "@/lib/config/auto-suggest-config";

/**
 * Risk-register auto-suggest threshold config — the four slider
 * values + the auto-promote toggle. v2.7.0.
 *
 * GET — current config + range metadata. Used by the Settings UI
 *       to render sliders with the right min/max/step.
 * POST — patch the config. Returns the saved (clamped) value.
 *
 * Admin-only on real installs; bootstrap window short-circuits to
 * `ok` so first-run setup can wire the defaults without a user
 * seat existing yet (matches every other Settings endpoint).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    cveAgeDays: z.number().optional(),
    cveMinDevices: z.number().optional(),
    deactivationWindowDays: z.number().optional(),
    incidentOpenHours: z.number().optional(),
    autoPromote: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  const auth = await apiRequireRole("viewer");
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    config: getAutoSuggestConfig(),
    defaults: AUTO_SUGGEST_DEFAULTS,
    ranges: AUTO_SUGGEST_RANGES,
  });
}

export async function POST(req: NextRequest) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const next = setAutoSuggestConfig(parsed.data);
  return NextResponse.json({ config: next });
}
