import "server-only";
import { config } from "@/lib/config";
import { resolveConsentRedirectUri } from "./base-url";

/**
 * The consent URL is a pure function of (tenantGuid, consentState) + Azure
 * config. Returns null if Azure isn't configured or the tenant has no stored
 * state. Async because the redirect URI is derived from the current request's
 * host when `APP_BASE_URL` isn't explicitly set.
 */
export async function buildConsentUrl(
  tenantGuid: string,
  state: string | null,
): Promise<string | null> {
  if (!config.isAzureConfigured || !state) return null;
  const u = new URL(
    `${config.azure.authorityHost.replace(/\/+$/, "")}/${tenantGuid}/adminconsent`,
  );
  u.searchParams.set("client_id", config.azure.clientId);
  u.searchParams.set("redirect_uri", await resolveConsentRedirectUri());
  u.searchParams.set("state", state);
  return u.toString();
}
