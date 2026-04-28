import "server-only";
import type { Baseline } from "./types";

/**
 * Make admin-account deactivation a high-friction action by forcing
 * privileged-role holders to satisfy stronger conditions before they can
 * reach the Microsoft Entra admin center (where Disable account /
 * delete user / role-membership edits happen).
 *
 * The policy itself can't intercept the specific "Disable account"
 * mutation — Conditional Access operates at sign-in time, not per-API-
 * call. What it CAN do, however, is gate access to the management
 * surfaces from which deactivation happens, with MFA + a compliant or
 * hybrid-joined device + a fresh sign-in. Combined with the audit-log
 * detection (`PimSprawlPayload.recentAdminDeactivations` — surfaced on
 * Entity → Identity tab), the result is:
 *   - any admin attempting to disable a privileged account must
 *     re-authenticate with MFA from a managed device
 *   - if the action lands anyway, Mizan picks it up within minutes via
 *     /auditLogs/directoryAudits and surfaces it for review
 *
 * v2.5.34 — DESC ask: "Implement prohibition policy on admin-account
 * deactivation".
 *
 * Implementation references:
 *   - Microsoft Entra admin center app id: c44b4083-3bb0-49c1-b47d-974e53cbdf3c
 *   - Azure portal app id (parallel surface): c44b4083-3bb0-49c1-b47d-974e53cbdf3c
 *   - Office 365 management apps app id: 00000005-0000-0ff1-ce00-000000000000 (incl. Microsoft 365 admin center)
 */

const ADMIN_ROLE_IDS = [
  "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
  "e8611ab8-c189-46e8-94e1-60213ab1f814", // Privileged Role Administrator
  "194ae4cb-b126-40b2-bd5b-6091b380977d", // Security Administrator
  "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3", // Application Administrator
  "fe930be7-5e62-47db-91af-98c3a49a38b1", // User Administrator
];

const ADMIN_PORTAL_APP_IDS = [
  "c44b4083-3bb0-49c1-b47d-974e53cbdf3c", // Microsoft Entra admin center
  "797f4846-ba00-4fd7-ba43-dac1f8f63013", // Windows Azure Service Management API (Azure portal back-end)
  "00000005-0000-0ff1-ce00-000000000000", // Office 365 / Microsoft 365 admin center
];

export const prohibitAdminDeactivation: Baseline = {
  descriptor: {
    id: "prohibit-admin-deactivation",
    titleKey: "baseline.prohibitAdminDeactivation.title",
    bodyKey: "baseline.prohibitAdminDeactivation.body",
    riskTier: "high",
    targetSummary: "5 privileged roles · Entra admin center + Azure portal + M365 admin center",
    grantSummary: "MFA + compliant-or-hybrid device + 1h sign-in frequency · pairs with Mizan audit-log detection",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.prohibitAdminDeactivation.why",
    impactKey: "baseline.prohibitAdminDeactivation.impact",
    prerequisitesKey: "baseline.prohibitAdminDeactivation.prerequisites",
    rolloutAdviceKey: "baseline.prohibitAdminDeactivation.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps#microsoft-admin-portals",
  },
  idempotencyKey: "mizan:prohibit-admin-deactivation:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Prohibit admin-account deactivation (mizan:prohibit-admin-deactivation:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ADMIN_PORTAL_APP_IDS },
      users: { includeRoles: ADMIN_ROLE_IDS },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "AND",
      builtInControls: ["mfa", "compliantDevice"],
    },
    sessionControls: {
      signInFrequency: {
        value: 1,
        type: "hours",
        authenticationType: "primaryAndSecondaryAuthentication",
        isEnabled: true,
      },
    },
  }),
};
