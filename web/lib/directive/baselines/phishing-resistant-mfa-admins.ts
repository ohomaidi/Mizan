import "server-only";
import type { Baseline } from "./types";

/**
 * Admins must authenticate with phishing-resistant methods (FIDO2 security
 * keys, Windows Hello for Business, certificate-based auth). SMS and
 * standard authenticator-app push are NOT sufficient.
 *
 * Uses Entra's built-in authentication strength ID
 * `00000000-0000-0000-0000-000000000003` (phishing-resistant MFA) rather
 * than the grant-control `mfa` switch, which would allow any MFA method.
 */

const ADMIN_ROLE_IDS = [
  "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
  "e8611ab8-c189-46e8-94e1-60213ab1f814", // Privileged Role Administrator
  "194ae4cb-b126-40b2-bd5b-6091b380977d", // Security Administrator
  "b1be1c3e-b65d-4f19-8427-f6fa0d97feb9", // Conditional Access Administrator
  "29232cdf-9323-42fd-ade2-1d097af3e4de", // Exchange Administrator
  "f28a1f50-f6e7-4571-818b-6a12f2af6b6c", // SharePoint Administrator
  "fe930be7-5e62-47db-91af-98c3a49a38b1", // User Administrator
  "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3", // Application Administrator
  "158c047a-c907-4556-b7ef-446551a6b5f7", // Cloud Application Administrator
  "c4e39bd9-1100-46d3-8c65-fb160da0071f", // Authentication Administrator
  "729827e3-9c14-49f7-bb1b-9608f156bbb8", // Helpdesk Administrator
  "3a2c62db-5318-420d-8d74-23affee5d9d5", // Intune Administrator
  "b0f54661-2d74-4c50-afa3-1ec803f12efe", // Billing Administrator
];

export const phishingResistantMfaAdmins: Baseline = {
  descriptor: {
    id: "phishing-resistant-mfa-admins",
    titleKey: "baseline.phishingResistantMfaAdmins.title",
    bodyKey: "baseline.phishingResistantMfaAdmins.body",
    riskTier: "high",
    targetSummary: "13 privileged directory roles.",
    grantSummary:
      "Satisfy the 'phishing-resistant MFA' built-in authentication strength (FIDO2 keys, Windows Hello for Business, or certificate-based auth).",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: false,
    whyKey: "baseline.phishingResistantMfaAdmins.why",
    impactKey: "baseline.phishingResistantMfaAdmins.impact",
    prerequisitesKey: "baseline.phishingResistantMfaAdmins.prerequisites",
    rolloutAdviceKey: "baseline.phishingResistantMfaAdmins.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths",
  },
  idempotencyKey: "mizan:phishing-resistant-mfa-admins:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Phishing-resistant MFA for admins (mizan:phishing-resistant-mfa-admins:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: { includeRoles: ADMIN_ROLE_IDS },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: [],
      // Built-in ID documented at Microsoft Learn — phishing-resistant MFA.
      authenticationStrength: {
        id: "00000000-0000-0000-0000-000000000003",
      },
    },
  }),
};
