import "server-only";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { getAuthConfig, type Role } from "@/lib/config/auth-config";
import { resolveUserAuthRedirectUri } from "@/lib/config/base-url";

/**
 * User-auth MSAL client. Separate from the Graph-signals MSAL client in
 * lib/graph/msal.ts: that one uses client_credentials (app-only) to read
 * tenant posture. This one drives OpenID Connect + authorization code for
 * Council staff sign-in, and reads role claims out of the ID token.
 */

const SCOPES = ["openid", "profile", "email", "User.Read"];

let _cca: ConfidentialClientApplication | null = null;
let _signature = "";

function getClient(): ConfidentialClientApplication {
  const cfg = getAuthConfig();
  // Signature includes whichever credential is active so a switch from
  // secret to cert (or rotation of either) invalidates the cached client.
  const credSig =
    cfg.clientCertThumbprint && cfg.clientCertPrivateKeyPem
      ? `cert:${cfg.clientCertThumbprint}:${cfg.clientCertPrivateKeyPem.length}`
      : `secret:${cfg.clientSecret}`;
  const sig = `${cfg.clientId}|${credSig}|${cfg.tenantId}`;
  if (_cca && sig === _signature) return _cca;
  const authority = `https://login.microsoftonline.com/${cfg.tenantId || "common"}`;
  const useCert = Boolean(
    cfg.clientCertThumbprint && cfg.clientCertPrivateKeyPem,
  );
  _cca = new ConfidentialClientApplication({
    auth: useCert
      ? {
          clientId: cfg.clientId,
          clientCertificate: {
            thumbprint: cfg.clientCertThumbprint,
            privateKey: cfg.clientCertPrivateKeyPem,
            x5c: cfg.clientCertChainPem || undefined,
          },
          authority,
        }
      : {
          clientId: cfg.clientId,
          clientSecret: cfg.clientSecret,
          authority,
        },
  });
  _signature = sig;
  return _cca;
}

/** Invalidate the cached client — called after Settings → Authentication saves. */
export function invalidateAuthClient(): void {
  _cca = null;
  _signature = "";
}

export async function redirectUri(): Promise<string> {
  return resolveUserAuthRedirectUri();
}

export async function getLoginUrl(state: string): Promise<string> {
  const client = getClient();
  return client.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: await redirectUri(),
    state,
    prompt: "select_account",
  });
}

export type LoginTokenResult = {
  oid: string;
  tenantId: string;
  email: string;
  displayName: string;
  /** `roles` claim values from the ID token — mapped to our RBAC role by the caller. */
  roles: string[];
};

export async function exchangeCodeForToken(code: string): Promise<LoginTokenResult> {
  const client = getClient();
  const result = await client.acquireTokenByCode({
    scopes: SCOPES,
    redirectUri: await redirectUri(),
    code,
  });
  if (!result?.idTokenClaims) {
    throw new Error("no_id_token_claims");
  }
  const claims = result.idTokenClaims as Record<string, unknown>;
  const oid = typeof claims.oid === "string" ? claims.oid : undefined;
  const tid = typeof claims.tid === "string" ? claims.tid : undefined;
  const email =
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    (typeof claims.email === "string" && claims.email) ||
    (typeof claims.upn === "string" && claims.upn) ||
    "";
  const name = typeof claims.name === "string" ? claims.name : "";
  const rolesRaw = claims.roles;
  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw.filter((r): r is string => typeof r === "string")
    : [];
  if (!oid || !tid) throw new Error("missing_oid_or_tid");
  return { oid, tenantId: tid, email, displayName: name, roles };
}

/**
 * Map Entra app-roles (e.g. "Posture.Admin", "Posture.Analyst", "Posture.Viewer")
 * to our internal RBAC enum. Unknown roles get the auth-config default (which
 * is also what first-login auto-provisioning uses).
 */
export function resolveAppRole(entraRoles: string[]): Role {
  const normalized = entraRoles.map((r) => r.toLowerCase());
  if (normalized.some((r) => r.endsWith(".admin") || r === "admin")) return "admin";
  if (normalized.some((r) => r.endsWith(".analyst") || r === "analyst")) return "analyst";
  if (normalized.some((r) => r.endsWith(".viewer") || r === "viewer")) return "viewer";
  return getAuthConfig().defaultRole;
}
