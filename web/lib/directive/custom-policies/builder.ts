import "server-only";
import type { CaPolicyBody } from "../baselines/types";
import type { CustomCaPolicySpec } from "./types";

const GLOBAL_ADMIN_ROLE_ID = "62e90394-69f5-4237-9190-012177145e10";

/**
 * Build the Graph CA body from a wizard spec. Idempotency key + displayName
 * are injected by the push route based on the draft id. This function is
 * deterministic: same spec in → same body out, which makes preview + push
 * trivially correct.
 */
export function buildCaBodyFromSpec(
  spec: CustomCaPolicySpec,
  idempotencyKey: string,
): CaPolicyBody {
  const body: CaPolicyBody = {
    displayName: `[Custom] ${spec.name} (${idempotencyKey})`,
    state: spec.state,
    conditions: {
      clientAppTypes:
        spec.conditions.clientAppTypes.length > 0
          ? spec.conditions.clientAppTypes
          : ["all"],
    },
  };

  // ----- Users ----- //
  const users: NonNullable<CaPolicyBody["conditions"]["users"]> = {};
  const include = spec.users.include;
  if (include.kind === "all") {
    users.includeUsers = ["All"];
  } else if (include.kind === "none") {
    users.includeUsers = ["None"];
  } else if (include.kind === "roles") {
    users.includeRoles = include.roleIds;
  } else if (include.kind === "guestsOrExternalUsers") {
    users.includeGuestsOrExternalUsers = {
      guestOrExternalUserTypes: include.guestTypes.join(","),
      externalTenants: { membershipKind: include.externalTenantMembershipKind },
    };
  }
  const excludeRoles = [...spec.users.exclude.roleIds];
  if (
    spec.users.exclude.excludeGlobalAdmins &&
    !excludeRoles.includes(GLOBAL_ADMIN_ROLE_ID)
  ) {
    excludeRoles.push(GLOBAL_ADMIN_ROLE_ID);
  }
  if (excludeRoles.length > 0) {
    users.excludeRoles = excludeRoles;
  }
  body.conditions.users = users;

  // ----- Apps ----- //
  const apps: NonNullable<CaPolicyBody["conditions"]["applications"]> = {};
  switch (spec.apps.target) {
    case "all":
      apps.includeApplications = ["All"];
      break;
    case "office365":
      apps.includeApplications = ["Office365"];
      break;
    case "adminPortals":
      apps.includeApplications = ["MicrosoftAdminPortals"];
      break;
    case "azureManagement":
      apps.includeApplications = ["797f4846-ba00-4fd7-ba43-dac1f8f63013"];
      break;
    case "specific":
      apps.includeApplications =
        spec.apps.includeAppIds.length > 0 ? spec.apps.includeAppIds : ["All"];
      break;
  }
  if (spec.apps.excludeAppIds.length > 0) {
    apps.excludeApplications = spec.apps.excludeAppIds;
  }
  body.conditions.applications = apps;

  // ----- Conditions ----- //
  if (spec.conditions.userRiskLevels.length > 0) {
    body.conditions.userRiskLevels = spec.conditions.userRiskLevels;
  }
  if (spec.conditions.signInRiskLevels.length > 0) {
    body.conditions.signInRiskLevels = spec.conditions.signInRiskLevels;
  }
  if (spec.conditions.platforms.length > 0) {
    body.conditions.platforms = { includePlatforms: spec.conditions.platforms };
  }
  if (spec.conditions.locations === "trustedOnly") {
    body.conditions.locations = { includeLocations: ["AllTrusted"] };
  }

  // ----- Grant ----- //
  if (spec.grant.kind === "block") {
    body.grantControls = {
      operator: "OR",
      builtInControls: ["block"],
    };
  } else {
    const controls: string[] = [];
    if (!spec.grant.authenticationStrengthId && spec.grant.requireMfa)
      controls.push("mfa");
    if (spec.grant.requireCompliantDevice) controls.push("compliantDevice");
    if (spec.grant.requireHybridJoinedDevice) controls.push("domainJoinedDevice");
    if (spec.grant.requireApprovedClientApp) controls.push("approvedApplication");
    if (spec.grant.requireCompliantApplication) controls.push("compliantApplication");
    if (spec.grant.requirePasswordChange) controls.push("passwordChange");
    // If no controls AND no auth strength AND not block, Graph rejects the
    // policy (must have at least one grant control). The spec validator
    // above catches empty-grant at form submit so this shouldn't fire —
    // fallback to mfa so the preview is at least shippable.
    if (controls.length === 0 && !spec.grant.authenticationStrengthId) {
      controls.push("mfa");
    }
    body.grantControls = {
      operator: spec.grant.operator,
      builtInControls: controls,
    };
    if (spec.grant.authenticationStrengthId) {
      body.grantControls.authenticationStrength = {
        id: spec.grant.authenticationStrengthId,
      };
    }
  }

  // ----- Session ----- //
  const session: NonNullable<CaPolicyBody["sessionControls"]> = {};
  if (spec.session.signInFrequency.enabled) {
    session.signInFrequency = {
      isEnabled: true,
      type: spec.session.signInFrequency.type,
      value: spec.session.signInFrequency.value,
      authenticationType: "primaryAndSecondaryAuthentication",
    };
  }
  if (spec.session.persistentBrowser !== "default") {
    session.persistentBrowser = {
      isEnabled: true,
      mode: spec.session.persistentBrowser,
    };
  }
  if (spec.session.applicationEnforcedRestrictions) {
    session.applicationEnforcedRestrictions = { isEnabled: true };
  }
  if (Object.keys(session).length > 0) {
    body.sessionControls = session;
  }

  return body;
}

/**
 * Infer a risk tier from a spec so the UI + push confirmation can warn
 * appropriately. Rules are deliberately conservative:
 *   - block + All users + All apps → high
 *   - block with any smaller scope → high
 *   - grant with phishing-resistant MFA only, scoped to admin roles → medium
 *   - everything else → low or medium depending on scope
 */
export function inferRiskTier(
  spec: CustomCaPolicySpec,
): "low" | "medium" | "high" {
  const includeKind = spec.users.include.kind;
  const isAllUsers = includeKind === "all";
  const isBlock = spec.grant.kind === "block";

  if (isBlock) return "high";

  // Phishing-resistant MFA on admins is a standard hardening — medium.
  const phishingResistant =
    spec.grant.authenticationStrengthId ===
    "00000000-0000-0000-0000-000000000003";
  if (phishingResistant && includeKind === "roles") return "medium";

  // Require-compliant-device across all users = cuts off BYOD = medium-high.
  if (
    (spec.grant.requireCompliantDevice ||
      spec.grant.requireHybridJoinedDevice) &&
    isAllUsers &&
    spec.apps.target !== "adminPortals"
  ) {
    return "high";
  }

  // MFA on all users = standard.
  if (spec.grant.requireMfa && isAllUsers) return "medium";

  // Narrowly-scoped policies default to low.
  return "low";
}

/** Lightweight human sentence describing the grant for a review screen. */
export function describeGrant(spec: CustomCaPolicySpec): string {
  if (spec.grant.kind === "block") return "Block access";
  const parts: string[] = [];
  if (spec.grant.authenticationStrengthId) {
    parts.push(
      spec.grant.authenticationStrengthId ===
        "00000000-0000-0000-0000-000000000003"
        ? "phishing-resistant MFA"
        : spec.grant.authenticationStrengthId ===
            "00000000-0000-0000-0000-000000000002"
          ? "passwordless MFA"
          : "MFA",
    );
  } else if (spec.grant.requireMfa) {
    parts.push("MFA");
  }
  if (spec.grant.requireCompliantDevice) parts.push("compliant device");
  if (spec.grant.requireHybridJoinedDevice) parts.push("hybrid-joined device");
  if (spec.grant.requireApprovedClientApp) parts.push("approved app");
  if (spec.grant.requireCompliantApplication)
    parts.push("app protection policy");
  if (spec.grant.requirePasswordChange) parts.push("password change");
  if (parts.length === 0) return "Grant (no requirements)";
  const op = spec.grant.operator === "AND" ? " AND " : " OR ";
  return `Grant — require ${parts.join(op)}`;
}
