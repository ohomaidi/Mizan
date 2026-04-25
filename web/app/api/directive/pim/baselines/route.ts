import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 12 PIM + Identity Governance catalog — COMING SOON.
 *
 * Most PIM and Identity Governance write paths ARE on Graph today
 * (`/roleManagement/directory/roleAssignmentScheduleRequests`,
 * `/identityGovernance/accessReviews/definitions`,
 * `/identityGovernance/termsOfUse/agreements`). Some role-management
 * settings + entitlement-management catalogs still have rough edges in
 * cross-tenant CRUD. Held in coming-soon until Mizan can promise the
 * full set; will flip to a real Phase 12 build once the contract is
 * stable in the customer's tenant.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "PIM + Identity Governance writes mostly land on Graph today, but role-management policy settings + entitlement-management catalogs have rough edges in cross-tenant CRUD. Coming-soon catalog ships now; full push lands as Phase 12 implementation.",
    baselines: [
      {
        id: "pim-mfa-on-activation",
        titleKey: "pim.baseline.mfaOnActivation.title",
        bodyKey: "pim.baseline.mfaOnActivation.body",
        riskTier: "high" as const,
        effectSummary:
          "Every privileged role activation requires MFA at the moment of activation, even if the admin is already in an MFA'd session.",
      },
      {
        id: "pim-max-activation-8h",
        titleKey: "pim.baseline.maxActivation8h.title",
        bodyKey: "pim.baseline.maxActivation8h.body",
        riskTier: "medium" as const,
        effectSummary:
          "Maximum activation duration capped at 8 hours. Auto-expiration. Admins can request shorter (e.g. 1h for a specific change) but never longer.",
      },
      {
        id: "pim-justification-required",
        titleKey: "pim.baseline.justificationRequired.title",
        bodyKey: "pim.baseline.justificationRequired.body",
        riskTier: "low" as const,
        effectSummary:
          "Activation requires a free-text justification of at least 20 characters. Stored on the role-assignment-schedule audit row, surfaced in Mizan's audit log.",
      },
      {
        id: "pim-notification-on-activation",
        titleKey: "pim.baseline.notificationOnActivation.title",
        bodyKey: "pim.baseline.notificationOnActivation.body",
        riskTier: "low" as const,
        effectSummary:
          "Security team email + admin's manager notified on every privileged role activation. Same audit trail in Mizan + Entra.",
      },
      {
        id: "pim-quarterly-access-review",
        titleKey: "pim.baseline.quarterlyAccessReview.title",
        bodyKey: "pim.baseline.quarterlyAccessReview.body",
        riskTier: "medium" as const,
        effectSummary:
          "Quarterly access review of every privileged role assignment (eligible + active). Reviewers = role's manager chain. Auto-removal of un-reviewed assignments at deadline.",
      },
    ],
  });
}
