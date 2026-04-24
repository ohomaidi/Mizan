import "server-only";
import type { Baseline } from "./types";

/**
 * Access to Microsoft admin portals (Entra admin center, Azure portal,
 * Defender XDR portal, Intune portal, Exchange admin, SharePoint admin,
 * Microsoft 365 admin center) requires a compliant or hybrid-joined
 * device. Prevents admin tasks from personal / unmanaged endpoints.
 *
 * `MicrosoftAdminPortals` is a Microsoft-published application group
 * that covers every admin portal. Documented at
 * https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps#microsoft-admin-portals.
 */

export const compliantDeviceAdminPortals: Baseline = {
  descriptor: {
    id: "compliant-device-admin-portals",
    titleKey: "baseline.compliantDeviceAdminPortals.title",
    bodyKey: "baseline.compliantDeviceAdminPortals.body",
    riskTier: "medium",
    targetSummary:
      "All users (GA excluded). Microsoft admin portals application group (Entra admin, Azure portal, Defender XDR, Intune, Exchange admin, SharePoint admin, M365 admin).",
    grantSummary:
      "Require device marked compliant by Intune OR Microsoft Entra hybrid-joined.",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
    whyKey: "baseline.compliantDeviceAdminPortals.why",
    impactKey: "baseline.compliantDeviceAdminPortals.impact",
    prerequisitesKey: "baseline.compliantDeviceAdminPortals.prerequisites",
    rolloutAdviceKey: "baseline.compliantDeviceAdminPortals.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps",
  },
  idempotencyKey: "mizan:compliant-device-admin-portals:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] Compliant device for admin portals (mizan:compliant-device-admin-portals:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: {
        // Microsoft-published app group covering every admin portal.
        includeApplications: ["MicrosoftAdminPortals"],
      },
      users: {
        includeUsers: ["All"],
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      builtInControls: ["compliantDevice", "domainJoinedDevice"],
    },
  }),
};
