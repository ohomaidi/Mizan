import "server-only";
import type { Baseline } from "./types";

/**
 * Require MFA for every user sign-in. The broadest possible MFA policy;
 * report-only is critical here because enforcement against users who do
 * not have MFA methods registered causes lockouts.
 *
 * Excludes Global Administrator role as a break-glass safety. Entities
 * may want to additionally exclude their own dedicated break-glass
 * accounts post-push; that's an entity-side edit.
 */

export const requireMfaAllUsers: Baseline = {
  descriptor: {
    id: "require-mfa-all-users",
    titleKey: "baseline.requireMfaAllUsers.title",
    bodyKey: "baseline.requireMfaAllUsers.body",
    riskTier: "medium",
    targetSummary:
      "All users, all applications, every client app type.",
    grantSummary: "Require multi-factor authentication",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.requireMfaAllUsers.why",
    impactKey: "baseline.requireMfaAllUsers.impact",
    prerequisitesKey: "baseline.requireMfaAllUsers.prerequisites",
    rolloutAdviceKey: "baseline.requireMfaAllUsers.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-mfa",
  },
  idempotencyKey: "mizan:require-mfa-all-users:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Require MFA for all users (mizan:require-mfa-all-users:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeUsers: ["All"],
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["mfa"],
    },
  }),
};
