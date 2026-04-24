import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 7 Sensitivity Labels catalog — COMING SOON (waiting on Microsoft
 * Graph).
 *
 * Graph READS sensitivity labels fine (via
 * `/security/informationProtection/sensitivityLabels`). Graph CREATE is
 * limited — beta `/policies/informationProtectionPolicy/labels` creates
 * bare labels, but encryption settings, content marking, protection
 * settings, label publishing policies, and auto-labeling rules are all
 * missing from public preview.
 *
 * Same pattern as DLP: cards render, push disabled, banner explains.
 * Flips on when Microsoft exposes the full authoring API on Graph.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Microsoft Graph only creates bare sensitivity labels in public preview. Encryption, content marking, protection, label publishing policies, and auto-labeling rules are all missing. This catalog describes the baselines Mizan will ship the day Microsoft closes that gap on Graph; push unlocks automatically when it does.",
    baselines: [
      {
        id: "labels-hierarchy-4level",
        titleKey: "labels.baseline.hierarchy4.title",
        bodyKey: "labels.baseline.hierarchy4.body",
        riskTier: "medium" as const,
        effectSummary:
          "Create 4 labels: Public / Internal / Confidential / Highly Confidential. Encryption + marking + downgrade-justification settings require PS tier.",
      },
      {
        id: "labels-auto-label-internal",
        titleKey: "labels.baseline.autoLabelInternal.title",
        bodyKey: "labels.baseline.autoLabelInternal.body",
        riskTier: "low" as const,
        effectSummary:
          "Auto-label all internal email as 'Internal' by default. Publishing + auto-label rules require PS tier.",
      },
      {
        id: "labels-auto-label-sensitive",
        titleKey: "labels.baseline.autoLabelSensitive.title",
        bodyKey: "labels.baseline.autoLabelSensitive.body",
        riskTier: "medium" as const,
        effectSummary:
          "Auto-label content matching built-in sensitive-info types as 'Confidential' or 'Highly Confidential' per severity. Requires PS tier.",
      },
    ],
  });
}
