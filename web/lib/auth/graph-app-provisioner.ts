import "server-only";
import { createHash } from "node:crypto";

/**
 * Provisions Entra app registrations on the customer's behalf using a
 * short-lived delegated token from the setup-wizard device-code flow.
 *
 * Two public entry points — one for each app Mizan needs:
 *
 *   - `provisionGraphSignalsApp()` creates the multi-tenant app that reads
 *     posture from each consented entity. Loads the 18 read-only Microsoft
 *     Graph application permissions that the sync orchestrator depends on.
 *
 *   - `provisionUserAuthApp()` creates the single-tenant app that operator
 *     staff sign into the dashboard with. Loads the standard OIDC delegated
 *     scopes plus User.Read.
 *
 * Both generate a client secret (2-year lifetime) and persist the result
 * into `app_config` so the rest of Mizan picks the new creds up immediately —
 * no manual copy-paste by the operator.
 */

import { setAzureConfig } from "@/lib/config/azure-config";
import { setAuthConfig } from "@/lib/config/auth-config";
import { invalidateAllTokens } from "@/lib/graph/msal";
import { invalidateAuthClient } from "@/lib/auth/msal-user";

// Microsoft Graph resource app ID — fixed.
const MS_GRAPH = "00000003-0000-0000-c000-000000000000";

/**
 * Microsoft Defender for Endpoint API service principal — well-known and
 * stable. Used by Phase 14b IOC push, which submits indicators directly
 * to Defender via `https://api.security.microsoft.com/api/indicators`.
 *
 * This is a SECOND resource on the same Mizan data app — the
 * `requiredResourceAccess` array on the Entra app object holds one block
 * per resource, so the entity admin grants Graph + Defender permissions
 * in a single consent click.
 *
 * Why not Microsoft Graph's `tiIndicator`? Microsoft has marked that
 * resource deprecated for removal "by April 2026" (this month). The
 * Defender API is GA, supports the same indicator types (file hashes,
 * URLs, domains, IPv4/IPv6), and has a cleaner body shape (string
 * severity instead of int 0-5; richer action enum including
 * BlockAndRemediate). Phase 14b migrated end-to-end in v2.0.5.
 */
const WIN_DEFENDER_ATP = "fc780465-2017-40d4-a0c5-307022471b92";

/**
 * Application-permission IDs on Microsoft Graph that correspond to each of
 * the read-only scopes our sync orchestrator depends on. IDs are stable +
 * documented under https://learn.microsoft.com/en-us/graph/permissions-reference.
 *
 * **Audited 2026-04-25 — every name + id pair below was cross-checked against
 * the canonical Microsoft Graph permissions reference.** Three latent ID bugs
 * were found and fixed in this audit:
 *   - `ThreatHunting.Read.All` previously held the GUID for
 *     `SecurityIdentitiesHealth.Read.All`. POST /security/runHuntingQuery
 *     would have 403'd against any real tenant.
 *   - `SecurityAlert.ReadWrite.All` had a typo (`...8fdd` → `...8fdb`) so
 *     the registration silently failed on Graph.
 *   - `User.RevokeSessions.All` previously held the GUID for
 *     `Group.ReadWrite.All`. That was a serious over-grant — the data app
 *     would have asked for full create/edit/delete access to every group in
 *     every entity tenant. Demo writes were simulated so this never blew up
 *     end-to-end, but it would have on first real-tenant onboarding.
 *
 * If you change any line below, double-check against the upstream reference.
 * One bad GUID = silent registration failure or unintended over-grant.
 */
const GRAPH_APP_PERMISSIONS: Array<{ name: string; id: string }> = [
  { name: "SecurityEvents.Read.All", id: "bf394140-e372-4bf9-a898-299cfc7564e5" },
  { name: "SecurityActions.Read.All", id: "5e0edab9-c148-49d0-b423-ac253e121825" },
  { name: "SecurityAlert.Read.All", id: "472e4a4d-bb4a-4026-98d1-0b0d74cb74a5" },
  { name: "SecurityIncident.Read.All", id: "45cc0394-e837-488b-a098-1918f48d186c" },
  { name: "Directory.Read.All", id: "7ab1d382-f21e-4acd-a863-ba3e13f7da61" },
  { name: "User.Read.All", id: "df021288-bdef-4463-88db-98f22de89214" },
  { name: "Group.Read.All", id: "5b567255-7703-4780-807c-7be8301ae99b" },
  { name: "Policy.Read.All", id: "246dd0d5-5bd0-4def-940b-0421030a5b68" },
  { name: "Device.Read.All", id: "7438b122-aefc-4978-80ed-43db9fcc7715" },
  { name: "DeviceManagementManagedDevices.Read.All", id: "2f51be20-0bb4-4fed-bf7b-db946066c75e" },
  { name: "DeviceManagementConfiguration.Read.All", id: "dc377aa6-52d8-4e23-b271-2a7ae04cedf3" },
  { name: "IdentityRiskyUser.Read.All", id: "dc5007c0-2d7d-4c42-879c-2dab87571379" },
  { name: "IdentityRiskEvent.Read.All", id: "6e472fd1-ad78-48da-a0f0-97ab2c6b769e" },
  // AuditLog.Read.All covers /auditLogs/directoryAudits + /auditLogs/signIns
  // (the older endpoints). The newer unified /security/auditLog/queries
  // collection that signals.ts also calls needs AuditLogsQuery.Read.All
  // separately (added below).
  { name: "AuditLog.Read.All", id: "b0afded3-3588-46d8-8b3d-9842eff778da" },
  { name: "AuditLogsQuery.Read.All", id: "5e1e9171-754d-478c-812c-f1755a9a4c2d" },
  { name: "ThreatIndicators.Read.All", id: "197ee4e9-b993-4066-898f-d6aecc55125b" },
  // FIXED 2026-04-25 — was `f8dcd971-...` which is actually
  // SecurityIdentitiesHealth.Read.All. Real ThreatHunting.Read.All GUID:
  { name: "ThreatHunting.Read.All", id: "dd98c7f5-2d42-42d3-a0e4-633161547251" },
  // ADDED 2026-04-25 — covers /security/threatIntelligence/articles
  // (Threat Intelligence digest signal in signals.ts).
  { name: "ThreatIntelligence.Read.All", id: "e0b77adb-e790-44a3-b0a0-257d06303687" },
  // ADDED 2026-04-25 — covers /security/attackSimulation/simulations + report
  // overview (Attack Simulation read signal in signals.ts).
  { name: "AttackSimulation.Read.All", id: "93283d0a-6322-4fa8-966b-8c121624760d" },
  // ADDED 2026-04-25 — covers /security/identities/healthIssues
  // (Defender for Identity sensor health signal in signals.ts).
  { name: "SecurityIdentitiesHealth.Read.All", id: "f8dcd971-5d83-4e1e-aa95-ef44611ad351" },
  // ADDED 2026-04-25 — covers /security/labels/retentionLabels (beta)
  // (Records Management retention-label signal in signals.ts).
  { name: "RecordsManagement.Read.All", id: "ac3a2b8e-03a3-4da9-9ce0-cbe28bf1accd" },
  // ADDED 2026-04-25 — covers /admin/sharepoint/settings GET. Read scope
  // sits in the read set so Phase 1 SharePoint-defaults signal works in
  // observation mode; the matching ReadWrite scope sits in the write set
  // for Phase 11a directive PATCH.
  { name: "SharePointTenantSettings.Read.All", id: "83d4163d-a2d8-4d3b-9695-4ae3ca98f888" },
  { name: "InformationProtectionPolicy.Read.All", id: "19da66cb-0fb0-4390-b071-ebc76a349482" },
  { name: "SubjectRightsRequest.Read.All", id: "ee1460f0-368b-4153-870a-4e1ca7e72c42" },
  // ADDED 2026-04-25 — PIM sprawl signal in signals.ts queries
  // /roleManagement/directory/roleAssignmentSchedules (active assignments) +
  // /roleManagement/directory/roleEligibilitySchedules (eligible). Each
  // collection has its own scope.
  { name: "RoleManagement.Read.Directory", id: "483bed4a-2ad3-4361-a73b-c83ccdbdc53c" },
  { name: "RoleEligibilitySchedule.Read.Directory", id: "ff278e11-4a33-4d0c-83d2-d01dc58929a5" },
];

/**
 * Write-side permissions added to the Graph app ON TOP OF the read-only set
 * when the deployment is in `directive` (read+write) mode. Scoped to what
 * the directive engine actually calls:
 *   - Conditional Access policy baselines (Policy.ReadWrite.ConditionalAccess)
 *   - Intune device-config + endpoint protection (DeviceManagementConfiguration.ReadWrite.All)
 *   - Intune device-mgmt actions (DeviceManagementManagedDevices.{ReadWrite,PrivilegedOperations}.All)
 *   - Intune iOS/Android Managed App Protection (DeviceManagementApps.ReadWrite.All)
 *   - Incident / alert classify + comment (Security{Incident,Alert}.ReadWrite.All)
 *   - Risky user confirm/dismiss (IdentityRiskyUser.ReadWrite.All)
 *   - Force sign-out (User.RevokeSessions.All)
 *   - Threat submissions (ThreatSubmission.ReadWrite.All)
 *   - SharePoint tenant settings PATCH (SharePointTenantSettings.ReadWrite.All)
 *
 * IOC push (Phase 14b) does NOT live on Microsoft Graph — see the
 * `DEFENDER_APP_PERMISSIONS` block below. Microsoft deprecated
 * `/security/tiIndicators` for removal by April 2026 and the GA
 * replacement is the Defender for Endpoint direct API.
 *
 * Every name + id pair audited 2026-04-25 against the canonical Microsoft
 * Graph permissions reference.
 */
const GRAPH_APP_WRITE_PERMISSIONS: Array<{ name: string; id: string }> = [
  { name: "Policy.ReadWrite.ConditionalAccess", id: "01c0a623-fc9b-48e9-b794-0756f8e8f067" },
  // Application.Read.All — used by the Phase 4 custom CA wizard's "specific
  // applications" picker (lists service principals so the operator can pin
  // policies to specific OAuth apps). Kept on the write set rather than the
  // read set because the wizard is directive-mode-only.
  { name: "Application.Read.All", id: "9a5d68dd-52b0-4cc2-bd40-abcf44ac3a30" },
  { name: "DeviceManagementConfiguration.ReadWrite.All", id: "9241abd9-d0e6-425a-bd4f-47ba86e767a4" },
  { name: "DeviceManagementManagedDevices.ReadWrite.All", id: "243333ab-4d21-40cb-a475-36241daa0842" },
  { name: "DeviceManagementManagedDevices.PrivilegedOperations.All", id: "5b07b0dd-2377-4e44-a38d-703f09a0dc3c" },
  // ADDED 2026-04-25 — required by Phase 5 Intune MAM baselines (POST/DELETE
  // /deviceAppManagement/iosManagedAppProtections + androidManagedAppProtections).
  // DeviceManagementConfiguration.ReadWrite.All does NOT cover the MAM
  // endpoints; they live under deviceAppManagement, not deviceManagement.
  { name: "DeviceManagementApps.ReadWrite.All", id: "78145de6-330d-4800-a6ce-494ff2d33d07" },
  { name: "SecurityIncident.ReadWrite.All", id: "34bf0e97-1971-4929-b999-9e2442d941d7" },
  // FIXED 2026-04-25 — was `...8fdd`, a typo. Real GUID ends `...8fdb`.
  { name: "SecurityAlert.ReadWrite.All", id: "ed4fca05-be46-441f-9803-1873825f8fdb" },
  { name: "IdentityRiskyUser.ReadWrite.All", id: "656f6061-f9fe-4807-9708-6a2e0934df76" },
  // FIXED 2026-04-25 — was `62a82d76-...` which is Group.ReadWrite.All
  // (granted broad group create/edit/delete in entity tenants — over-grant).
  // Real User.RevokeSessions.All GUID:
  { name: "User.RevokeSessions.All", id: "77f3a031-c388-4f99-b373-dc68676a979e" },
  { name: "ThreatSubmission.ReadWrite.All", id: "d72bdbf4-a59b-405c-8b04-5995895819ac" },
  // ADDED 2026-04-25 — required by Phase 11a SharePoint baselines
  // (PATCH /admin/sharepoint/settings).
  { name: "SharePointTenantSettings.ReadWrite.All", id: "19b94e34-907c-4f43-bde9-38b1909ed408" },
];

/**
 * Defender for Endpoint API permissions — registered on the same Mizan data
 * app under a separate `requiredResourceAccess` block (resourceAppId =
 * WIN_DEFENDER_ATP). The entity admin consents to Graph + Defender in one
 * click; tokens for each resource are requested separately by audience
 * (`https://api.securitycenter.microsoft.com/.default` for Defender vs
 * `https://graph.microsoft.com/.default` for Graph).
 *
 * Phase 14b IOC push lives here (v2.0.5+). The previous Graph-side
 * `ThreatIndicators.ReadWrite.OwnedBy` scope was used against
 * `/security/tiIndicators` which Microsoft deprecated for removal by
 * April 2026; we replaced both the endpoint and the scope.
 */
/** Defender API read-only scopes — needed in both observation + directive. */
const DEFENDER_APP_READ_PERMISSIONS: Array<{ name: string; id: string }> = [
  // GET https://api.security.microsoft.com/api/machines (Phase 16
  // Workload Coverage card — MDE onboarded device inventory). Read-only.
  { name: "Machine.Read.All", id: "ea8291d3-4b9a-44b5-bc3a-6cea3026dc79" },
  // POST https://api.security.microsoft.com/api/advancedhunting/run —
  // powers the Vulnerabilities tab (DeviceTvmSoftwareVulnerabilities table).
  // v2.5.25 — corrected GUID. v2.5.22 introduced this with id
  // `dd98c7f5-2d42-42d3-a0e4-633161547251`, which is actually
  // `ThreatHunting.Read.All` on **Microsoft Graph** — registering it on the
  // WindowsDefenderATP resource block accomplished nothing: Microsoft
  // accepted the registration but issued no role claim because the GUID
  // doesn't correspond to any role on the Defender resource. Result: every
  // /advancedhunting/run call returned 403 "Missing application roles.
  // Required: AdvancedQuery.Read.All" even after consent was re-granted.
  // Real `AdvancedQuery.Read.All` GUID on WindowsDefenderATP service
  // principal (`fc780465-2017-40d4-a0c5-307022471b92`):
  //   `93489bf5-0fbc-4f2d-b901-33f2fe08ff05`
  // Verified via `az ad sp show --id fc780465... --query "appRoles[?value=='AdvancedQuery.Read.All']"`.
  // Tenants onboarded under v2.5.22..v2.5.24 need the entity admin to
  // re-grant admin consent in Enterprise Apps so the new GUID lands on
  // the SP's appRoleAssignments. The dashboard's scope-stale banner
  // (v2.5.24) flags affected tenants automatically.
  { name: "AdvancedQuery.Read.All", id: "93489bf5-0fbc-4f2d-b901-33f2fe08ff05" },
];

/** Defender API write-side scopes — directive deployments only. */
const DEFENDER_APP_WRITE_PERMISSIONS: Array<{ name: string; id: string }> = [
  // POST/PUT/DELETE https://api.security.microsoft.com/api/indicators
  // 15,000-indicator-per-tenant ceiling, 100 calls/minute, 1500/hour.
  { name: "Ti.ReadWrite.All", id: "bc2dd901-9ae8-4d0a-a3a6-bbd4ddf25fa6" },
];

/**
 * Pick the permission set to register on the Graph app based on deployment
 * mode. Read-only deployments get the classic 18-scope read set. Read+write
 * deployments get that set PLUS the directive write scopes above. The choice
 * is baked into the app at creation time and cannot be narrowed later without
 * re-consenting every entity — admin consent is scope-wide, tenant-wide.
 */
function graphPermissionsForMode(
  mode: "observation" | "directive",
): Array<{ name: string; id: string }> {
  if (mode === "directive") {
    return [...GRAPH_APP_PERMISSIONS, ...GRAPH_APP_WRITE_PERMISSIONS];
  }
  return GRAPH_APP_PERMISSIONS;
}

/**
 * Return the full multi-resource `requiredResourceAccess` array for the
 * Mizan data app. In observation mode it's a single block on Microsoft
 * Graph; in directive mode it adds a second block on the Defender for
 * Endpoint API resource (for Phase 14b IOC push).
 *
 * Anyone reading the app object in Entra sees the same shape Mizan
 * registered — one entry per resource, scopes listed by id+Role tuple.
 */
function requiredResourceAccessForMode(
  mode: "observation" | "directive",
): Array<{
  resourceAppId: string;
  resourceAccess: Array<{ id: string; type: "Role" }>;
}> {
  const defenderPerms =
    mode === "directive"
      ? [...DEFENDER_APP_READ_PERMISSIONS, ...DEFENDER_APP_WRITE_PERMISSIONS]
      : DEFENDER_APP_READ_PERMISSIONS;
  const blocks: Array<{
    resourceAppId: string;
    resourceAccess: Array<{ id: string; type: "Role" }>;
  }> = [
    {
      resourceAppId: MS_GRAPH,
      resourceAccess: graphPermissionsForMode(mode).map((p) => ({
        id: p.id,
        type: "Role",
      })),
    },
    {
      resourceAppId: WIN_DEFENDER_ATP,
      resourceAccess: defenderPerms.map((p) => ({
        id: p.id,
        type: "Role",
      })),
    },
  ];
  return blocks;
}

/** Delegated OIDC scopes the user-auth app needs. */
const USER_AUTH_DELEGATED_SCOPES: Array<{ name: string; id: string }> = [
  { name: "User.Read", id: "e1fe6dd8-ba31-4d61-89e7-88639da4683d" },
  { name: "openid", id: "37f7f235-527c-4136-accd-4a02d197296e" },
  { name: "profile", id: "14dad69e-099b-42c9-810b-d002981feec1" },
  { name: "email", id: "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0" },
];

type GraphApiError = { error?: { code?: string; message?: string } };

async function graphFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: GraphApiError | string;
    try {
      body = (await res.json()) as GraphApiError;
    } catch {
      body = await res.text();
    }
    const msg =
      typeof body === "string"
        ? body
        : (body.error?.message ?? `HTTP ${res.status}`);
    throw new Error(`Graph ${init.method ?? "GET"} ${path} failed: ${msg}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type ProvisionResult = {
  appId: string; // Entra object ID of the new app
  clientId: string; // the application/client GUID used for auth
  clientSecret: string; // plaintext — only returned once by Graph
  displayName: string;
};

async function createApp(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ id: string; appId: string; displayName: string }> {
  return graphFetch<{ id: string; appId: string; displayName: string }>(
    accessToken,
    "/applications",
    { method: "POST", body: JSON.stringify(body) },
  );
}

async function addSecret(
  accessToken: string,
  objectId: string,
  displayName: string,
  yearsValid = 2,
): Promise<string> {
  const end = new Date();
  end.setFullYear(end.getFullYear() + yearsValid);
  const result = await graphFetch<{ secretText: string }>(
    accessToken,
    `/applications/${objectId}/addPassword`,
    {
      method: "POST",
      body: JSON.stringify({
        passwordCredential: {
          displayName,
          endDateTime: end.toISOString(),
        },
      }),
    },
  );
  return result.secretText;
}

/**
 * Create the multi-tenant Graph-signals app in the caller's tenant.
 * Wires all 18 Graph application permissions + the consent-callback redirect.
 * Persists the client_id + secret into Mizan's Azure app config row.
 */
export async function provisionGraphSignalsApp(
  accessToken: string,
  opts: {
    displayName: string;
    dashboardBaseUrl: string;
    /**
     * `observation` gets the classic read-only scope set. `directive` gets
     * the read set PLUS the directive write scopes. Baked into the Entra app
     * at creation time — admin consent is scope-wide, so entities cannot
     * partially consent afterward.
     */
    deploymentMode?: "observation" | "directive";
  },
): Promise<ProvisionResult> {
  const redirectUri = `${opts.dashboardBaseUrl.replace(/\/+$/, "")}/api/auth/consent-callback`;
  const mode = opts.deploymentMode ?? "observation";

  const app = await createApp(accessToken, {
    displayName: opts.displayName,
    signInAudience: "AzureADMultipleOrgs",
    web: {
      redirectUris: [redirectUri],
    },
    requiredResourceAccess: requiredResourceAccessForMode(mode),
  });

  const secret = await addSecret(accessToken, app.id, "mizan-auto-provisioned");

  // Store in Mizan's config. `setAzureConfig` only accepts the fields it knows
  // about; the `clientSecret` empty-string means "keep existing" so we always
  // pass the new one explicitly.
  setAzureConfig({
    clientId: app.appId,
    clientSecret: secret,
  });
  invalidateAllTokens();

  return {
    appId: app.id,
    clientId: app.appId,
    clientSecret: secret,
    displayName: app.displayName,
  };
}

/**
 * Create the single-tenant user-auth app in the caller's tenant. Wires
 * standard OIDC delegated scopes + the user-callback redirect. Persists the
 * client_id, secret, and tenant_id into Mizan's auth config.
 */
export async function provisionUserAuthApp(
  accessToken: string,
  opts: { displayName: string; dashboardBaseUrl: string; tenantId: string },
): Promise<ProvisionResult> {
  const redirectUri = `${opts.dashboardBaseUrl.replace(/\/+$/, "")}/api/auth/user-callback`;

  const app = await createApp(accessToken, {
    displayName: opts.displayName,
    signInAudience: "AzureADMyOrg",
    web: {
      redirectUris: [redirectUri],
      implicitGrantSettings: {
        enableIdTokenIssuance: false,
        enableAccessTokenIssuance: false,
      },
    },
    requiredResourceAccess: [
      {
        resourceAppId: MS_GRAPH,
        resourceAccess: USER_AUTH_DELEGATED_SCOPES.map((p) => ({
          id: p.id,
          type: "Scope",
        })),
      },
    ],
  });

  const secret = await addSecret(accessToken, app.id, "mizan-auto-provisioned");

  setAuthConfig({
    clientId: app.appId,
    clientSecret: secret,
    tenantId: opts.tenantId,
  });
  invalidateAuthClient();

  return {
    appId: app.id,
    clientId: app.appId,
    clientSecret: secret,
    displayName: app.displayName,
  };
}

/**
 * Extract the signed-in user's home tenant from the ID/access token.
 * The device-code flow populates Authorization: Bearer <jwt>; we decode the
 * `tid` claim to know which tenant the new apps should go into.
 */
export function extractTenantFromToken(accessToken: string): string | null {
  const claims = decodeJwtClaims(accessToken);
  return (typeof claims?.tid === "string" && claims.tid) || null;
}

export type TokenIdentity = {
  oid: string;
  tenantId: string;
  email: string;
  displayName: string;
};

/**
 * Decode the minimal identity claims Mizan needs to seed its own user row
 * out of the bootstrap access token. The operator has already signed into
 * Microsoft via the device-code flow to provision the apps — we carry that
 * identity straight into a Mizan session instead of making them do a second
 * OIDC round-trip that can fail on redirect URIs, missing consent, MFA etc.
 */
export function extractUserFromToken(accessToken: string): TokenIdentity | null {
  const claims = decodeJwtClaims(accessToken);
  if (!claims) return null;
  const oid = typeof claims.oid === "string" ? claims.oid : undefined;
  const tid = typeof claims.tid === "string" ? claims.tid : undefined;
  if (!oid || !tid) return null;
  const email =
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    (typeof claims.upn === "string" && claims.upn) ||
    (typeof claims.email === "string" && claims.email) ||
    (typeof claims.unique_name === "string" && claims.unique_name) ||
    "";
  const displayName =
    (typeof claims.name === "string" && claims.name) ||
    (typeof claims.given_name === "string" && claims.given_name) ||
    email ||
    "Administrator";
  return { oid, tenantId: tid, email, displayName };
}

/**
 * Compute a stable, mode-aware hash of the data app's required scope set.
 * Each entity tenant's `consented_scope_hash` row carries the hash that was
 * current at the time their admin granted consent (or last re-verified).
 * Comparing live `currentScopeHash(mode)` against the stored value tells the
 * dashboard which tenants need to be re-prompted to grant consent on newly
 * added scopes. v2.5.24.
 *
 * Hashed over scope NAMES (sorted), not GUIDs — adding a new scope changes
 * the hash; fixing a typo in an existing GUID does not. The 12-hex-char
 * truncation is plenty for collision-resistance across the small set of
 * scope-set versions a deployment will see in its lifetime.
 */
export function currentScopeHash(
  mode: "observation" | "directive",
): string {
  const graphScopes = graphPermissionsForMode(mode).map((p) => p.name);
  const defenderScopes = (
    mode === "directive"
      ? [...DEFENDER_APP_READ_PERMISSIONS, ...DEFENDER_APP_WRITE_PERMISSIONS]
      : DEFENDER_APP_READ_PERMISSIONS
  ).map((p) => p.name);
  const combined = [...graphScopes, ...defenderScopes].sort().join("|");
  return createHash("sha256").update(combined).digest("hex").slice(0, 12);
}

function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}
