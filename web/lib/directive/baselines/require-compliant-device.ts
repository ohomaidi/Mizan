import "server-only";
import type { Baseline } from "./types";

/**
 * Require Intune-compliant devices for access to Office 365 apps. The
 * single most effective policy for preventing data exfiltration from
 * personal / unmanaged endpoints. Report-only by default because
 * enforcement on this one needs tenant-side device enrollment to actually
 * be in place first.
 *
 * `Office365` is a Microsoft-published app group GUID that includes
 * Exchange Online, SharePoint Online, Teams, Office web, Office desktop.
 */

const OFFICE365_APP_GROUP = "Office365";

export const requireCompliantDevice: Baseline = {
  descriptor: {
    id: "require-compliant-device",
    titleKey: "baseline.requireCompliantDevice.title",
    bodyKey: "baseline.requireCompliantDevice.body",
    riskTier: "medium",
    targetSummary:
      "All users accessing Office 365 apps (Exchange Online, SharePoint, Teams, Office web/desktop).",
    grantSummary:
      "Require device marked as compliant by Intune, OR Microsoft Entra hybrid-joined.",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: true,
  },
  idempotencyKey: "mizan:require-compliant-device:v1",
  buildPolicyBody: (options) => ({
    displayName: "[Mizan] Require compliant device for Office 365 (mizan:require-compliant-device:v1)",
    state:
      options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: {
        includeApplications: [OFFICE365_APP_GROUP],
      },
      users: {
        includeUsers: ["All"],
        // Exclude the Global Administrator role — if Intune enrollment
        // hasn't completed for admin devices yet, this would lock them out.
        excludeRoles: ["62e90394-69f5-4237-9190-012177145e10"],
      },
      clientAppTypes: ["all"],
    },
    grantControls: {
      operator: "OR",
      // Either Intune-compliant OR hybrid-joined satisfies the grant;
      // covers both pure-cloud + hybrid tenants.
      builtInControls: ["compliantDevice", "domainJoinedDevice"],
    },
  }),
};
