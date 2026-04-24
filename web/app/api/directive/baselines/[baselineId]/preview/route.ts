import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getBaseline } from "@/lib/directive/baselines/registry";
import { previewBaseline } from "@/lib/directive/baselines/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  overrideState: z
    .enum(["enabled", "disabled", "enabledForReportingButNotEnforced"])
    .optional(),
});

/**
 * POST /api/directive/baselines/{id}/preview — compute the CA policy body
 * the baseline would push, with the requested options applied. No Graph
 * call, no writes. Shown in the UI before the operator confirms.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("analyst");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json({ error: "baseline_not_found" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* body is optional on this endpoint */
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const preview = previewBaseline(baseline, parsed.data);
  return NextResponse.json({
    baselineId,
    preview: {
      displayName: preview.body.displayName,
      state: preview.effectiveState,
      descriptor: preview.descriptor,
      body: preview.body,
    },
  });
}
