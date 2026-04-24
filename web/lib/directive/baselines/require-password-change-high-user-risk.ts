import "server-only";
import type { Baseline } from "./types";

/**
 * When Entra Identity Protection flags a user as high-risk (leaked
 * credentials, confirmed compromise history, etc.), require the user to
 * satisfy MFA AND perform a secure password change before the sign-in
 * succeeds. Automates the remediation step that would otherwise require
 * a manual admin call.
 *
 * Requires Entra ID P2.
 */

export const requirePasswordChangeHighUserRisk: Baseline = {
  descriptor: {
    id: "require-password-change-high-user-risk",
    titleKey: "baseline.requirePasswordChangeHighUserRisk.title",
    bodyKey: "baseline.requirePasswordChangeHighUserRisk.body",
    riskTier: "medium",
    targetSummary:
      "All users (GA excluded). All apps. Applies only when the user is scored high risk by Identity Protection.",
    grantSummary:
      "Require multi-factor authentication AND password change",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.requirePasswordChangeHighUserRisk.why",
    impactKey: "baseline.requirePasswordChangeHighUserRisk.impact",
    prerequisitesKey:
      "baseline.requirePasswordChangeHighUserRisk.prerequisites",
    rolloutAdviceKey: "baseline.requirePasswordChangeHighUserRisk.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies",
  },
  idempotencyKey: "mizan:require-password-change-high-user-risk:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Password change on high user risk (mizan:require-password-change-high-user-risk:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeUsers: ["All"],
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: ["all"],
      userRiskLevels: ["high"],
    },
    grantControls: {
      // AND — both MFA and a forced password change must be satisfied
      operator: "AND",
      builtInControls: ["mfa", "passwordChange"],
    },
  }),
};
