import "server-only";
import type { Baseline } from "./types";

/**
 * MFA is required to reach the Azure control plane (Azure portal, Azure
 * CLI, Azure PowerShell, ARM REST). This is the highest-blast-radius surface
 * in the tenant: anyone who hits ARM with a stolen token can inventory,
 * reconfigure, or destroy subscription resources wholesale.
 *
 * `797f4846-ba00-4fd7-ba43-dac1f8f63013` is the Microsoft-published
 * "Windows Azure Service Management API" application ID. Targeting it
 * covers every Azure control-plane entry point — documented at
 * https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-azure-management.
 */

const AZURE_MANAGEMENT_APP_ID = "797f4846-ba00-4fd7-ba43-dac1f8f63013";

export const requireMfaAzureManagement: Baseline = {
  descriptor: {
    id: "require-mfa-azure-management",
    titleKey: "baseline.requireMfaAzureManagement.title",
    bodyKey: "baseline.requireMfaAzureManagement.body",
    riskTier: "medium",
    targetSummary:
      "All users (GA excluded). Windows Azure Service Management API — covers Azure portal, Azure CLI, Azure PowerShell, and ARM REST calls.",
    grantSummary: "Require multi-factor authentication",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.requireMfaAzureManagement.why",
    impactKey: "baseline.requireMfaAzureManagement.impact",
    prerequisitesKey: "baseline.requireMfaAzureManagement.prerequisites",
    rolloutAdviceKey: "baseline.requireMfaAzureManagement.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-azure-management",
  },
  idempotencyKey: "mizan:require-mfa-azure-management:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Require MFA for Azure management (mizan:require-mfa-azure-management:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: {
        includeApplications: [AZURE_MANAGEMENT_APP_ID],
      },
      users: {
        includeUsers: ["All"],
        // Global Administrator — kept reachable so a bad policy never
        // locks the entity out of their own Azure tenancy.
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
