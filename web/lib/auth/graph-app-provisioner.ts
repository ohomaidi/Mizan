import "server-only";

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
 * Application-permission IDs on Microsoft Graph that correspond to each of
 * the read-only scopes our sync orchestrator depends on. IDs are stable +
 * documented under https://learn.microsoft.com/en-us/graph/permissions-reference.
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
  { name: "AuditLog.Read.All", id: "b0afded3-3588-46d8-8b3d-9842eff778da" },
  { name: "ThreatIndicators.Read.All", id: "197ee4e9-b993-4066-898f-d6aecc55125b" },
  { name: "ThreatHunting.Read.All", id: "f8dcd971-5d83-4e1e-aa95-ef44611ad351" },
  { name: "InformationProtectionPolicy.Read.All", id: "19da66cb-0fb0-4390-b071-ebc76a349482" },
  { name: "SubjectRightsRequest.Read.All", id: "ee1460f0-368b-4153-870a-4e1ca7e72c42" },
];

/**
 * Write-side permissions added to the Graph app ON TOP OF the read-only set
 * when the deployment is in `directive` (read+write) mode. Scoped to what
 * Phase 2+ directive work will actually call:
 *   - Conditional Access policy baselines
 *   - Intune compliance policy baselines
 *   - Incident / alert operations
 *   - Risky user dispositions + force sign-out
 *   - Threat submissions
 *
 * Permission IDs are stable + documented under
 * https://learn.microsoft.com/en-us/graph/permissions-reference.
 */
const GRAPH_APP_WRITE_PERMISSIONS: Array<{ name: string; id: string }> = [
  { name: "Policy.ReadWrite.ConditionalAccess", id: "01c0a623-fc9b-48e9-b794-0756f8e8f067" },
  { name: "Application.Read.All", id: "9a5d68dd-52b0-4cc2-bd40-abcf44ac3a30" },
  { name: "DeviceManagementConfiguration.ReadWrite.All", id: "9241abd9-d0e6-425a-bd4f-47ba86e767a4" },
  { name: "DeviceManagementManagedDevices.ReadWrite.All", id: "243333ab-4d21-40cb-a475-36241daa0842" },
  { name: "DeviceManagementManagedDevices.PrivilegedOperations.All", id: "5b07b0dd-2377-4e44-a38d-703f09a0dc3c" },
  { name: "SecurityIncident.ReadWrite.All", id: "34bf0e97-1971-4929-b999-9e2442d941d7" },
  { name: "SecurityAlert.ReadWrite.All", id: "ed4fca05-be46-441f-9803-1873825f8fdd" },
  { name: "IdentityRiskyUser.ReadWrite.All", id: "656f6061-f9fe-4807-9708-6a2e0934df76" },
  { name: "User.RevokeSessions.All", id: "62a82d76-70ea-41e2-9197-370581804d09" },
  { name: "ThreatSubmission.ReadWrite.All", id: "d72bdbf4-a59b-405c-8b04-5995895819ac" },
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
  const permissions = graphPermissionsForMode(opts.deploymentMode ?? "observation");

  const app = await createApp(accessToken, {
    displayName: opts.displayName,
    signInAudience: "AzureADMultipleOrgs",
    web: {
      redirectUris: [redirectUri],
    },
    requiredResourceAccess: [
      {
        resourceAppId: MS_GRAPH,
        resourceAccess: permissions.map((p) => ({
          id: p.id,
          type: "Role", // application-level, not delegated
        })),
      },
    ],
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
