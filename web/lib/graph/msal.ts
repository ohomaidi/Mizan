import "server-only";
import {
  ConfidentialClientApplication,
  type AuthenticationResult,
  type Configuration as MsalConfiguration,
} from "@azure/msal-node";
import { assertAzureConfigured, config } from "@/lib/config";

/** Lazily-built MSAL client per customer tenant, keyed by Entra tenant GUID. */
const clientCache = new Map<string, ConfidentialClientApplication>();

/**
 * Cached tokens per (tenant, audience) pair; refreshed ~5 min before expiry.
 * The audience is part of the key because we issue tokens for two different
 * Microsoft resources from the same Mizan data app:
 *   - Microsoft Graph (default): `https://graph.microsoft.com/.default`
 *   - Defender for Endpoint API (Phase 14b IOC push): `https://api.securitycenter.microsoft.com/.default`
 * Tokens are NOT interchangeable across resources — Defender rejects a Graph
 * token (and vice versa) with 401, so we must cache per audience.
 */
type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

/** Microsoft Graph application audience. */
const GRAPH_AUDIENCE = "https://graph.microsoft.com/.default";

/**
 * Microsoft Defender for Endpoint API audience. The `api.securitycenter…`
 * hostname is the long-standing audience identifier (Microsoft kept it as
 * the audience even after launching the new `api.security.microsoft.com`
 * unified hostname — both API hosts authenticate with the same token).
 */
const DEFENDER_AUDIENCE = "https://api.securitycenter.microsoft.com/.default";

/**
 * Microsoft Threat Protection (Defender XDR) audience. Needed for
 * `/api/advancedhunting/run` because Microsoft converged the role check
 * across both legacy and unified Defender hostnames — the WindowsDefenderATP
 * token's `AdvancedQuery.Read.All` claim is no longer accepted; the API
 * requires `AdvancedHunting.Read.All` on the MTP service principal
 * (`8ee8fdad-f234-4243-8f3b-15c294843740`). Mizan acquires this token
 * separately for hunting-only paths; all other Defender calls keep using
 * the WindowsDefenderATP token (DEFENDER_AUDIENCE above). v2.5.27.
 */
const MTP_AUDIENCE = "https://api.security.microsoft.com/.default";

/**
 * Build the MSAL `auth` block from the active config. Prefers cert when both
 * cert + secret are configured (production-hardening default). Public so the
 * user-auth client builder can reuse exactly the same logic.
 */
export function buildMsalAuthBlock(
  authority: string,
): MsalConfiguration["auth"] {
  const a = config.azure;
  const hasCert = Boolean(
    a.clientCertThumbprint && a.clientCertPrivateKeyPem,
  );
  if (hasCert) {
    return {
      clientId: a.clientId,
      clientCertificate: {
        thumbprint: a.clientCertThumbprint,
        privateKey: a.clientCertPrivateKeyPem,
        // x5c is optional but helps Entra validate the cert chain when set.
        x5c: a.clientCertChainPem || undefined,
      },
      authority,
    };
  }
  return {
    clientId: a.clientId,
    clientSecret: a.clientSecret,
    authority,
  };
}

function getClientForTenant(tenantGuid: string): ConfidentialClientApplication {
  assertAzureConfigured();
  const existing = clientCache.get(tenantGuid);
  if (existing) return existing;
  const authority = `${config.azure.authorityHost.replace(/\/+$/, "")}/${tenantGuid}`;
  const cca = new ConfidentialClientApplication({
    auth: buildMsalAuthBlock(authority),
  });
  clientCache.set(tenantGuid, cca);
  return cca;
}

/**
 * Acquire an app-only token for a customer tenant against the named
 * Microsoft resource. Uses in-memory cache with a safety margin on
 * expiry; tokens are scoped per (tenant, audience) so the Graph cache
 * doesn't collide with the Defender cache.
 */
async function acquireToken(
  tenantGuid: string,
  audience: string,
  resourceLabel: string,
): Promise<string> {
  const cacheKey = `${tenantGuid}::${audience}`;
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt - now > 5 * 60_000) {
    return cached.token;
  }

  const client = getClientForTenant(tenantGuid);
  const result: AuthenticationResult | null = await client.acquireTokenByClientCredential({
    scopes: [audience],
  });
  if (!result?.accessToken) {
    throw new Error(
      `Failed to acquire ${resourceLabel} token for tenant ${tenantGuid} (no token in MSAL response).`,
    );
  }

  const expiresAt = result.expiresOn?.getTime() ?? now + 55 * 60_000;
  tokenCache.set(cacheKey, { token: result.accessToken, expiresAt });
  return result.accessToken;
}

/**
 * Acquire an app-only Microsoft Graph token for a specific customer tenant.
 * Used by every read signal + every directive write that lands on Graph.
 */
export async function getAppTokenForTenant(tenantGuid: string): Promise<string> {
  return acquireToken(tenantGuid, GRAPH_AUDIENCE, "Graph");
}

/**
 * Acquire an app-only Defender for Endpoint API token for a customer
 * tenant. Used by Phase 14b IOC push (POST/DELETE
 * https://api.security.microsoft.com/api/indicators). Requires
 * `Ti.ReadWrite.All` on the WindowsDefenderATP service principal —
 * registered as a second `requiredResourceAccess` block on the Mizan
 * data app in `graph-app-provisioner.ts`.
 */
export async function getDefenderTokenForTenant(
  tenantGuid: string,
): Promise<string> {
  return acquireToken(tenantGuid, DEFENDER_AUDIENCE, "Defender");
}

/**
 * Acquire an app-only Microsoft Threat Protection (Defender XDR) token
 * for a customer tenant. Used specifically for `/api/advancedhunting/run`,
 * which Microsoft routes through the MTP role check. Requires
 * `AdvancedHunting.Read.All` on the Microsoft Threat Protection service
 * principal (`8ee8fdad-f234-4243-8f3b-15c294843740`). v2.5.27.
 */
export async function getMtpTokenForTenant(
  tenantGuid: string,
): Promise<string> {
  return acquireToken(tenantGuid, MTP_AUDIENCE, "MTP");
}

/**
 * Clear cache for a tenant (e.g. after consent revocation, or after a fresh
 * consent grant introduces new app role assignments that aren't yet in the
 * cached token's claims).
 *
 * v2.5.24 — was buggy: tokenCache keys are `${tenantGuid}::${audience}`
 * (per-audience), but the previous `tokenCache.delete(tenantGuid)` deleted
 * a key literally named `tenantGuid` — i.e. nothing. Result: after consent
 * was re-granted with a new scope (the v2.5.22 `AdvancedQuery.Read.All`
 * situation), the stale Defender token without that role claim stayed
 * cached for ~55 min, the next vulnerability hunt fired with the stale
 * token, and Microsoft returned `Forbidden — application is missing
 * role(s): AdvancedQuery.Read.All` even though consent was actually live
 * on the SP. Now iterates and deletes every cache entry whose key
 * starts with `${tenantGuid}::`, so both Graph and Defender tokens for
 * the tenant are evicted in one call.
 */
export function invalidateTenantToken(tenantGuid: string): void {
  const prefix = `${tenantGuid}::`;
  for (const k of Array.from(tokenCache.keys())) {
    if (k.startsWith(prefix)) tokenCache.delete(k);
  }
  clientCache.delete(tenantGuid);
}

/** Clear ALL MSAL caches — called when Azure app credentials change via Settings panel. */
export function invalidateAllTokens(): void {
  tokenCache.clear();
  clientCache.clear();
}
