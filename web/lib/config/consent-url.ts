import "server-only";
import { config } from "@/lib/config";

/**
 * The consent URL is a pure function of (tenantGuid, consentState) + Azure config.
 * Returns null if Azure isn't configured or the tenant has no stored state.
 */
export function buildConsentUrl(
  tenantGuid: string,
  state: string | null,
): string | null {
  if (!config.isAzureConfigured || !state) return null;
  const u = new URL(
    `${config.azure.authorityHost.replace(/\/+$/, "")}/${tenantGuid}/adminconsent`,
  );
  u.searchParams.set("client_id", config.azure.clientId);
  u.searchParams.set("redirect_uri", config.consentRedirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}
