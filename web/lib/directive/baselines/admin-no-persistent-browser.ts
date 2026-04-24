import "server-only";
import type { Baseline } from "./types";

/**
 * Admin sessions do not persist across browser restarts. Effectively
 * disables "Stay signed in" for privileged accounts, reducing the
 * credential exposure window on shared or lost devices.
 *
 * Uses `sessionControls.persistentBrowser.mode = "never"`, documented at
 * https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime#persistent-browser-session.
 */

const ADMIN_ROLE_IDS = [
  "62e90394-69f5-4237-9190-012177145e10",
  "e8611ab8-c189-46e8-94e1-60213ab1f814",
  "194ae4cb-b126-40b2-bd5b-6091b380977d",
  "b1be1c3e-b65d-4f19-8427-f6fa0d97feb9",
  "29232cdf-9323-42fd-ade2-1d097af3e4de",
  "f28a1f50-f6e7-4571-818b-6a12f2af6b6c",
  "fe930be7-5e62-47db-91af-98c3a49a38b1",
  "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3",
  "158c047a-c907-4556-b7ef-446551a6b5f7",
  "c4e39bd9-1100-46d3-8c65-fb160da0071f",
  "729827e3-9c14-49f7-bb1b-9608f156bbb8",
  "3a2c62db-5318-420d-8d74-23affee5d9d5",
  "b0f54661-2d74-4c50-afa3-1ec803f12efe",
];

export const adminNoPersistentBrowser: Baseline = {
  descriptor: {
    id: "admin-no-persistent-browser",
    titleKey: "baseline.adminNoPersistentBrowser.title",
    bodyKey: "baseline.adminNoPersistentBrowser.body",
    riskTier: "low",
    targetSummary: "13 privileged directory roles. All apps.",
    grantSummary: "Session control: never persist browser sessions",
    initialState: "enabledForReportingButNotEnforced",
    excludesOwnAdmins: false,
    whyKey: "baseline.adminNoPersistentBrowser.why",
    impactKey: "baseline.adminNoPersistentBrowser.impact",
    prerequisitesKey: "baseline.adminNoPersistentBrowser.prerequisites",
    rolloutAdviceKey: "baseline.adminNoPersistentBrowser.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-session-lifetime",
  },
  idempotencyKey: "mizan:admin-no-persistent-browser:v1",
  buildPolicyBody: (options) => ({
    displayName:
      "[Mizan] No persistent browser for admins (mizan:admin-no-persistent-browser:v1)",
    state: options.overrideState ?? "enabledForReportingButNotEnforced",
    conditions: {
      applications: { includeApplications: ["All"] },
      users: { includeRoles: ADMIN_ROLE_IDS },
      clientAppTypes: ["all"],
    },
    sessionControls: {
      persistentBrowser: { isEnabled: true, mode: "never" },
    },
  }),
};
