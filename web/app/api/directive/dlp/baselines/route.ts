import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 6 DLP catalog — PLACEHOLDER.
 *
 * DLP policy CRUD has very limited Graph coverage: beta
 * /security/dataLossPreventionPolicies + /dataLossPreventionRules accept
 * a minimal schema, but most of the actually-useful surface (rule
 * exceptions, user notifications, incident reports, endpoint DLP,
 * specific sensitive-info-type conditions) is only reachable through
 * Security & Compliance PowerShell (`New-DlpCompliancePolicy`).
 *
 * Until the user approves a PowerShell automation tier, this endpoint
 * returns the planned baseline catalog with `pushEnabled: false` so the
 * UI can render the same cards + Details as Phase 5, but with the push
 * button disabled and a clear red "Graph coverage insufficient" banner.
 *
 * When the PS tier lands, this route flips to real baselines and the UI
 * unlocks the push button automatically.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Microsoft Graph exposes only a minimal subset of DLP policy authoring. Full control (endpoint DLP, rule exceptions, user notifications, incident reports, most condition types) requires Security & Compliance PowerShell (New-DlpCompliancePolicy / New-DlpComplianceRule). This catalog is read-only pending a PowerShell automation tier decision — see project_sharjah_council_backlog.md.",
    baselines: [
      {
        id: "dlp-block-sensitive-external-share",
        titleKey: "dlp.baseline.blockSensitiveExternal.title",
        bodyKey: "dlp.baseline.blockSensitiveExternal.body",
        riskTier: "high" as const,
        surface: "Exchange / SharePoint / OneDrive / Teams",
        effectSummary:
          "Block external sharing of content matching built-in sensitive-info types (credit cards, ID numbers, financial data, health records) + require business justification.",
      },
      {
        id: "dlp-block-credential-exfiltration",
        titleKey: "dlp.baseline.blockCredentialExfil.title",
        bodyKey: "dlp.baseline.blockCredentialExfil.body",
        riskTier: "high" as const,
        surface: "Exchange / Teams / endpoint",
        effectSummary:
          "Detect secret patterns (Azure keys, AWS keys, GitHub tokens, private keys) in outbound email + chat; block transmission; alert admin.",
      },
      {
        id: "dlp-block-bulk-data-exfil",
        titleKey: "dlp.baseline.blockBulkExfil.title",
        bodyKey: "dlp.baseline.blockBulkExfil.body",
        riskTier: "medium" as const,
        surface: "SharePoint / OneDrive / endpoint",
        effectSummary:
          "Flag unusually large file transfers (>100 files / >500 MB) to external or personal storage; warn user, notify admin.",
      },
      {
        id: "dlp-regulated-data-labels",
        titleKey: "dlp.baseline.regulatedDataLabels.title",
        bodyKey: "dlp.baseline.regulatedDataLabels.body",
        riskTier: "medium" as const,
        surface: "Exchange / SharePoint / OneDrive",
        effectSummary:
          "Block external sharing of content labelled Confidential or Highly Confidential (Phase 7 labels must be in place).",
      },
    ],
  });
}
