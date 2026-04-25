import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 13 App Consent Policies catalog — COMING SOON.
 *
 * `/policies/adminConsentRequestPolicy` and
 * `/policies/permissionGrantPolicies` ARE writable on Graph today, but
 * the per-customer roll-out of "verified publisher" allowlists +
 * pre-approved permission sets still varies tenant-to-tenant. Held in
 * coming-soon until Mizan ships the real Phase 13 wizard.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "App consent policies + admin consent workflow are on Graph today (`/policies/adminConsentRequestPolicy`, `/policies/permissionGrantPolicies`). Verified-publisher allowlists + pre-approved permission sets vary by tenant. Coming-soon catalog now; real Phase 13 implementation lands next.",
    baselines: [
      {
        id: "app-consent-verified-only",
        titleKey: "appConsent.baseline.verifiedOnly.title",
        bodyKey: "appConsent.baseline.verifiedOnly.body",
        riskTier: "high" as const,
        effectSummary:
          "Users can only consent to apps from Microsoft-verified publishers. Unverified third-party apps require admin approval. Closes the OAuth consent phishing surface.",
      },
      {
        id: "app-consent-admin-workflow",
        titleKey: "appConsent.baseline.adminWorkflow.title",
        bodyKey: "appConsent.baseline.adminWorkflow.body",
        riskTier: "low" as const,
        effectSummary:
          "Enable the admin consent request workflow. When users hit a blocked app, they can submit a request; designated reviewers (Cloud Application Admins) approve or reject in the Entra admin center.",
      },
      {
        id: "app-consent-block-high-risk",
        titleKey: "appConsent.baseline.blockHighRisk.title",
        bodyKey: "appConsent.baseline.blockHighRisk.body",
        riskTier: "high" as const,
        effectSummary:
          "Block user consent to apps requesting high-risk permissions: Mail.ReadWrite, Files.ReadWrite.All, Sites.FullControl.All, Application.ReadWrite.All, Directory.ReadWrite.All. Always require admin approval.",
      },
      {
        id: "app-consent-preapprove-low-risk",
        titleKey: "appConsent.baseline.preapproveLowRisk.title",
        bodyKey: "appConsent.baseline.preapproveLowRisk.body",
        riskTier: "low" as const,
        effectSummary:
          "Pre-approve user consent for the low-risk permission set (User.Read, openid, profile, email, offline_access). Preserves frictionless sign-in for legitimate apps.",
      },
    ],
  });
}
