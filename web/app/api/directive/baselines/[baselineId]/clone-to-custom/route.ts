import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getBaseline } from "@/lib/directive/baselines/registry";
import { createCustomPolicy } from "@/lib/directive/custom-policies/store";
import { bodyToSpec } from "@/lib/directive/custom-policies/body-to-spec";
import { DICT, type DictKey } from "@/lib/i18n/dict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/directive/baselines/{baselineId}/clone-to-custom
 *
 * Create a wizard-editable custom policy draft pre-populated with the
 * baseline's spec. The caller lands on the wizard for the new draft; any
 * field the wizard can't represent (named locations, specific user IDs,
 * ToU etc — baselines don't use these today, but the mapping is
 * best-effort) is dropped. See lib/directive/custom-policies/body-to-spec.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ baselineId: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { baselineId } = await ctx.params;
  const baseline = getBaseline(baselineId);
  if (!baseline) {
    return NextResponse.json({ error: "baseline_not_found" }, { status: 404 });
  }

  const body = baseline.buildPolicyBody({});
  const enDict = DICT.en as Record<string, string>;
  const baselineTitle =
    enDict[baseline.descriptor.titleKey as DictKey] ??
    baseline.descriptor.titleKey
      .replace(/^baseline\./, "")
      .replace(/\..*$/, "");
  const name = `Custom of: ${baselineTitle}`;
  const spec = bodyToSpec(body, name);
  const id = createCustomPolicy({
    name,
    description: `Cloned from baseline ${baseline.descriptor.id}.`,
    spec,
    ownerUserId: gate.user?.id ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
