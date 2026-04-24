import "server-only";
import type { CaPolicyBody } from "../baselines/types";
import type { CustomCaPolicySpec } from "./types";
import { CustomCaPolicySpecSchema } from "./types";

const GLOBAL_ADMIN_ROLE_ID = "62e90394-69f5-4237-9190-012177145e10";

/**
 * Best-effort reverse mapping: Graph CA body → wizard spec. Used by the
 * "Clone as custom draft" action on baselines — every baseline's
 * buildPolicyBody gets fed through here to produce a spec the wizard
 * can load + edit + push as a custom policy.
 *
 * Any field the spec can't represent (named locations, specific user/
 * group IDs, ToU, auth contexts, device filters) is dropped. The caller
 * sees a safe default instead, and a UI note reminds them what was lost.
 * The returned spec is always parseable by CustomCaPolicySpecSchema.
 */
export function bodyToSpec(
  body: CaPolicyBody,
  name: string,
): CustomCaPolicySpec {
  // ----- Users ----- //
  const u = body.conditions.users ?? {};
  let includeKind: CustomCaPolicySpec["users"]["include"]["kind"] = "all";
  const roleIds: string[] = [];
  const guestTypes: string[] = [];
  let externalTenantMembershipKind: "all" | "enumerated" = "all";

  if (u.includeGuestsOrExternalUsers) {
    includeKind = "guestsOrExternalUsers";
    const csv =
      u.includeGuestsOrExternalUsers.guestOrExternalUserTypes ?? "";
    for (const t of csv.split(",").map((s) => s.trim()).filter(Boolean)) {
      guestTypes.push(t);
    }
    externalTenantMembershipKind =
      u.includeGuestsOrExternalUsers.externalTenants?.membershipKind ?? "all";
  } else if (u.includeRoles && u.includeRoles.length > 0) {
    includeKind = "roles";
    for (const id of u.includeRoles) roleIds.push(id);
  } else if (u.includeUsers?.includes("None")) {
    includeKind = "none";
  } else {
    includeKind = "all";
  }

  const excludeRoleIds = (u.excludeRoles ?? []).filter(
    (id) => id !== GLOBAL_ADMIN_ROLE_ID,
  );
  const excludeGlobalAdmins = (u.excludeRoles ?? []).includes(
    GLOBAL_ADMIN_ROLE_ID,
  );

  // ----- Apps ----- //
  const apps = body.conditions.applications ?? {};
  const inc = apps.includeApplications ?? ["All"];
  let target: CustomCaPolicySpec["apps"]["target"] = "all";
  let includeAppIds: string[] = [];
  if (inc.length === 1 && inc[0] === "All") target = "all";
  else if (inc.length === 1 && inc[0] === "Office365") target = "office365";
  else if (inc.length === 1 && inc[0] === "MicrosoftAdminPortals")
    target = "adminPortals";
  else if (
    inc.length === 1 &&
    inc[0] === "797f4846-ba00-4fd7-ba43-dac1f8f63013"
  )
    target = "azureManagement";
  else {
    target = "specific";
    includeAppIds = inc;
  }
  const excludeAppIds = apps.excludeApplications ?? [];

  // ----- Conditions ----- //
  const signInRisk = (body.conditions.signInRiskLevels ?? []).filter(
    (v): v is "low" | "medium" | "high" =>
      v === "low" || v === "medium" || v === "high",
  );
  const userRisk = (body.conditions.userRiskLevels ?? []).filter(
    (v): v is "low" | "medium" | "high" =>
      v === "low" || v === "medium" || v === "high",
  );
  const platforms = (body.conditions.platforms?.includePlatforms ?? []).filter(
    (v): v is CustomCaPolicySpec["conditions"]["platforms"][number] =>
      [
        "android",
        "iOS",
        "windows",
        "macOS",
        "linux",
        "windowsPhone",
      ].includes(v),
  );
  const clientAppTypes = (body.conditions.clientAppTypes ?? []).filter(
    (v): v is CustomCaPolicySpec["conditions"]["clientAppTypes"][number] =>
      ["browser", "mobileAppsAndDesktopClients", "exchangeActiveSync", "other"].includes(v),
  );
  const locations: "any" | "trustedOnly" =
    body.conditions.locations?.includeLocations?.includes("AllTrusted") &&
    !body.conditions.locations?.includeLocations?.includes("All")
      ? "trustedOnly"
      : "any";

  // ----- Grant ----- //
  const g = body.grantControls ?? {
    operator: "OR",
    builtInControls: [],
  };
  const kind: CustomCaPolicySpec["grant"]["kind"] = g.builtInControls.includes(
    "block",
  )
    ? "block"
    : "grantWithRequirements";

  const grant: CustomCaPolicySpec["grant"] = {
    kind,
    operator: g.operator,
    requireMfa: g.builtInControls.includes("mfa"),
    requireCompliantDevice: g.builtInControls.includes("compliantDevice"),
    requireHybridJoinedDevice: g.builtInControls.includes("domainJoinedDevice"),
    requireApprovedClientApp: g.builtInControls.includes("approvedApplication"),
    requireCompliantApplication: g.builtInControls.includes("compliantApplication"),
    requirePasswordChange: g.builtInControls.includes("passwordChange"),
    authenticationStrengthId: g.authenticationStrength?.id,
  };

  // ----- Session ----- //
  const s = body.sessionControls ?? {};
  const session: CustomCaPolicySpec["session"] = {
    signInFrequency: s.signInFrequency
      ? {
          enabled: true,
          type: s.signInFrequency.type,
          value: s.signInFrequency.value,
        }
      : { enabled: false, type: "hours", value: 4 },
    persistentBrowser: s.persistentBrowser
      ? s.persistentBrowser.mode
      : "default",
    applicationEnforcedRestrictions: !!s.applicationEnforcedRestrictions,
  };

  const spec = {
    name,
    state: body.state,
    users: {
      include: {
        kind: includeKind,
        roleIds,
        guestTypes,
        externalTenantMembershipKind,
      },
      exclude: {
        roleIds: excludeRoleIds,
        excludeGlobalAdmins,
      },
    },
    apps: {
      target,
      includeAppIds,
      excludeAppIds,
    },
    conditions: {
      userRiskLevels: userRisk,
      signInRiskLevels: signInRisk,
      platforms,
      clientAppTypes,
      locations,
    },
    grant,
    session,
  };

  // Re-parse so we get a fully-defaulted value the wizard is guaranteed
  // to be able to load without tripping on a missing nested field.
  return CustomCaPolicySpecSchema.parse(spec);
}
