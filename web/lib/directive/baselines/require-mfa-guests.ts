import "server-only";
import type { Baseline } from "./types";

/**
 * External / guest identities must MFA. Guests are the most common
 * supply-chain compromise vector; enforcing MFA on them closes the common
 * "trusted partner account → lateral move into tenant" path.
 *
 * Targets every guest / external identity type via the
 * `includeGuestsOrExternalUsers` condition, documented at
 * https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessguestsorexternalusers.
 */

export const requireMfaGuests: Baseline = {
  descriptor: {
    id: "require-mfa-guests",
    titleKey: "baseline.requireMfaGuests.title",
    bodyKey: "baseline.requireMfaGuests.body",
    riskTier: "low",
    targetSummary:
      "Every external identity type: B2B collaboration guests, B2B collaboration members, B2B direct-connect users, internal guests, other external users, service providers.",
    grantSummary: "Require multi-factor authentication",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: false,
    whyKey: "baseline.requireMfaGuests.why",
    impactKey: "baseline.requireMfaGuests.impact",
    prerequisitesKey: "baseline.requireMfaGuests.prerequisites",
    rolloutAdviceKey: "baseline.requireMfaGuests.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/external-id/authentication-conditional-access",
  },
  idempotencyKey: "mizan:require-mfa-guests:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Require MFA for guests and external users (mizan:require-mfa-guests:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeGuestsOrExternalUsers: {
          // Comma-separated bitmask per Graph schema.
          guestOrExternalUserTypes:
            "internalGuest,b2bCollaborationGuest,b2bCollaborationMember,b2bDirectConnectUser,otherExternalUser,serviceProvider",
          externalTenants: { membershipKind: "all" },
        },
      },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["mfa"],
    },
  }),
};
