import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 7 Sensitivity Labels catalog — PLACEHOLDER.
 *
 * Graph can READ sensitivity labels (via
 * /security/informationProtection/sensitivityLabels) but CREATE is
 * limited: beta /policies/informationProtectionPolicy/labels accepts
 * basic label creation, but encryption settings, content marking,
 * protection settings, label publishing policies, and auto-labeling
 * rules all require Security & Compliance PowerShell (`New-Label`,
 * `New-LabelPolicy`, `New-AutoSensitivityLabelPolicy`).
 *
 * Same pattern as DLP: cards + Details render, push disabled, red
 * banner explains. Flips on when PS tier ships.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Microsoft Graph can only create bare sensitivity labels in beta (/policies/informationProtectionPolicy/labels). Encryption, content marking, protection, publishing policies, and auto-labeling rules all require Security & Compliance PowerShell (New-Label / New-LabelPolicy / New-AutoSensitivityLabelPolicy). This catalog is read-only pending a PowerShell automation tier decision — see project_sharjah_council_backlog.md.",
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
