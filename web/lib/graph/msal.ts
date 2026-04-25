import "server-only";
import {
  ConfidentialClientApplication,
  type AuthenticationResult,
  type Configuration as MsalConfiguration,
} from "@azure/msal-node";
import { assertAzureConfigured, config } from "@/lib/config";

/** Lazily-built MSAL client per customer tenant, keyed by Entra tenant GUID. */
const clientCache = new Map<string, ConfidentialClientApplication>();

/** Cached tokens per tenant; refreshed ~5 min before expiry. */
type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

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
 * Acquire an app-only Graph token for a specific customer tenant.
 * Uses in-memory cache with a safety margin on expiry.
 */
export async function getAppTokenForTenant(tenantGuid: string): Promise<string> {
  const cached = tokenCache.get(tenantGuid);
  const now = Date.now();
  if (cached && cached.expiresAt - now > 5 * 60_000) {
    return cached.token;
  }

  const client = getClientForTenant(tenantGuid);
  const result: AuthenticationResult | null = await client.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) {
    throw new Error(
      `Failed to acquire Graph token for tenant ${tenantGuid} (no token in MSAL response).`,
    );
  }

  const expiresAt = result.expiresOn?.getTime() ?? now + 55 * 60_000;
  tokenCache.set(tenantGuid, { token: result.accessToken, expiresAt });
  return result.accessToken;
}

/** Clear cache for a tenant (e.g. after consent revocation). */
export function invalidateTenantToken(tenantGuid: string): void {
  tokenCache.delete(tenantGuid);
  clientCache.delete(tenantGuid);
}

/** Clear ALL MSAL caches — called when Azure app credentials change via Settings panel. */
export function invalidateAllTokens(): void {
  tokenCache.clear();
  clientCache.clear();
}
