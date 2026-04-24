import "server-only";
import type { Baseline } from "./types";

/**
 * Classic Center baseline: require MFA for every privileged directory role.
 * Report-only by default. Entities toggle to enforce once they've
 * verified their Global Admins all have MFA methods registered.
 *
 * Role IDs below are the hard-coded Entra directory role template IDs —
 * stable across tenants, documented at
 * https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference.
 */

const ADMIN_ROLE_IDS = [
  // Global Administrator
  "62e90394-69f5-4237-9190-012177145e10",
  // Privileged Role Administrator
  "e8611ab8-c189-46e8-94e1-60213ab1f814",
  // Security Administrator
  "194ae4cb-b126-40b2-bd5b-6091b380977d",
  // Conditional Access Administrator
  "b1be1c3e-b65d-4f19-8427-f6fa0d97feb9",
  // Exchange Administrator
  "29232cdf-9323-42fd-ade2-1d097af3e4de",
  // SharePoint Administrator
  "f28a1f50-f6e7-4571-818b-6a12f2af6b6c",
  // User Administrator
  "fe930be7-5e62-47db-91af-98c3a49a38b1",
  // Application Administrator
  "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3",
  // Cloud Application Administrator
  "158c047a-c907-4556-b7ef-446551a6b5f7",
  // Authentication Administrator
  "c4e39bd9-1100-46d3-8c65-fb160da0071f",
  // Helpdesk Administrator
  "729827e3-9c14-49f7-bb1b-9608f156bbb8",
  // Intune Administrator
  "3a2c62db-5318-420d-8d74-23affee5d9d5",
  // Billing Administrator
  "b0f54661-2d74-4c50-afa3-1ec803f12efe",
];

export const requireMfaForAdmins: Baseline = {
  descriptor: {
    id: "require-mfa-for-admins",
    titleKey: "baseline.requireMfaForAdmins.title",
    bodyKey: "baseline.requireMfaForAdmins.body",
    riskTier: "low",
    targetSummary:
      "13 privileged directory roles (Global Admin, Security Admin, Conditional Access Admin, Exchange/SharePoint/User/App/Cloud App/Authentication/Helpdesk/Intune/Billing/Privileged Role Admin)",
    grantSummary: "Require multi-factor authentication",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: false,
    whyKey: "baseline.requireMfaForAdmins.why",
    impactKey: "baseline.requireMfaForAdmins.impact",
    prerequisitesKey: "baseline.requireMfaForAdmins.prerequisites",
    rolloutAdviceKey: "baseline.requireMfaForAdmins.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-admin-mfa",
  },
  idempotencyKey: "mizan:require-mfa-for-admins:v1",
  buildPolicyBody: (options) => ({
    displayName: "[Mizan] Require MFA for admin roles (mizan:require-mfa-for-admins:v1)",
    state:
      options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: {
        includeRoles: ADMIN_ROLE_IDS,
      },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["mfa"],
    },
  }),
};
