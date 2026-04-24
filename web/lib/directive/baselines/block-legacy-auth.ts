import "server-only";
import type { Baseline } from "./types";

/**
 * Block legacy authentication protocols (POP, IMAP, SMTP basic, Exchange
 * ActiveSync basic) that predate modern auth and can't do MFA. Targets all
 * users by `clientAppTypes` rather than by role — legacy auth is used by
 * service accounts and unattended applications more than by admins.
 *
 * Report-only by default; a block-all policy needs careful tenant-side
 * verification before enforcement.
 */

export const blockLegacyAuth: Baseline = {
  descriptor: {
    id: "block-legacy-auth",
    titleKey: "baseline.blockLegacyAuth.title",
    bodyKey: "baseline.blockLegacyAuth.body",
    riskTier: "medium",
    targetSummary:
      "All users, all applications. Scope narrowed by client app type to legacy auth only (exchangeActiveSync, IMAP, POP, SMTP auth, other clients).",
    grantSummary: "Block access",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
  },
  idempotencyKey: "mizan:block-legacy-auth:v1",
  buildPolicyBody: (options) => ({
    displayName: "[Mizan] Block legacy authentication (mizan:block-legacy-auth:v1)",
    state:
      options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeUsers: ["All"],
        // Exclude the Global Administrator role unconditionally so a
        // misconfigured legacy-auth client used by an admin cannot lock
        // them out of their own tenant during rollout.
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: [
        "exchangeActiveSync",
        "other",
      ],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["block"],
    },
  }),
};
