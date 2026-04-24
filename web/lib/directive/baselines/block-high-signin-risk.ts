import "server-only";
import type { Baseline } from "./types";

/**
 * Block sign-ins flagged high-risk by Entra Identity Protection. Catches
 * brute-force, credential-stuffing, and token-replay signals at the moment
 * of authentication. Requires Entra ID P2 on the target tenant.
 */

export const blockHighSignInRisk: Baseline = {
  descriptor: {
    id: "block-high-signin-risk",
    titleKey: "baseline.blockHighSignInRisk.title",
    bodyKey: "baseline.blockHighSignInRisk.body",
    riskTier: "high",
    targetSummary:
      "All users (GA excluded). All apps. Applies only when the sign-in itself is scored high risk by Identity Protection.",
    grantSummary: "Block access",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.blockHighSignInRisk.why",
    impactKey: "baseline.blockHighSignInRisk.impact",
    prerequisitesKey: "baseline.blockHighSignInRisk.prerequisites",
    rolloutAdviceKey: "baseline.blockHighSignInRisk.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies",
  },
  idempotencyKey: "mizan:block-high-signin-risk:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Block high sign-in risk (mizan:block-high-signin-risk:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeUsers: ["All"],
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: ["all"],
      signInRiskLevels: ["high"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["block"],
    },
  }),
};
