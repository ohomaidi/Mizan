import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 6 DLP catalog — COMING SOON (waiting on Microsoft Graph).
 *
 * Microsoft Graph does not yet expose the full DLP authoring API. The
 * beta `/security/dataLossPreventionPolicies` + `/dataLossPreventionRules`
 * endpoints accept a minimal schema only — rule exceptions, user
 * notifications, incident reports, endpoint DLP, and most condition
 * types are missing from public preview. Push stays disabled until
 * Microsoft closes that gap.
 *
 * The catalog below is ready: it describes the baselines Mizan will ship
 * the day Graph coverage reaches production quality. UI renders every
 * card as a disabled preview; flipping `pushEnabled` to true later is
 * the only change needed to unlock push.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Microsoft Graph does not yet expose the full DLP authoring API. Public preview covers a minimal subset only — rule exceptions, user notifications, incident reports, endpoint DLP, and most condition types are missing. This catalog describes the baselines Mizan will ship the day Microsoft closes that gap; push unlocks automatically when it does.",
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
