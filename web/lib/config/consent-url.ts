import "server-only";
import { config } from "@/lib/config";
import { resolveConsentRedirectUri } from "./base-url";

/**
 * The consent URL is a pure function of (tenantGuid, consentState) + Azure
 * config. Returns null if Azure isn't configured or the tenant has no stored
 * state. Async because the redirect URI is derived from the current request's
 * host when `APP_BASE_URL` isn't explicitly set.
 *
 * Uses the v2.0 admin-consent endpoint with `scope=https://graph.microsoft
 * .com/.default`. The `.default` sentinel tells Entra to prompt the entity
 * admin for every permission registered on the app's `requiredResourceAccess`
 * — which is exactly the GRAPH_APP_PERMISSIONS (+ GRAPH_APP_WRITE_PERMISSIONS
 * in directive mode) set wired in graph-app-provisioner.ts. Single source of
 * truth, no drift between registered and prompted scopes.
 *
 * The older v1 endpoint (`/adminconsent` without `/v2.0/` and without the
 * `scope=` parameter) also reads requiredResourceAccess, but Microsoft is
 * steering all new flows to v2.0; using v2.0 + `.default` is the documented
 * 2024+ best practice.
 */
export async function buildConsentUrl(
  tenantGuid: string,
  state: string | null,
): Promise<string | null> {
  if (!config.isAzureConfigured || !state) return null;
  const u = new URL(
    `${config.azure.authorityHost.replace(/\/+$/, "")}/${tenantGuid}/v2.0/adminconsent`,
  );
  u.searchParams.set("client_id", config.azure.clientId);
  u.searchParams.set("scope", "https://graph.microsoft.com/.default");
  u.searchParams.set("redirect_uri", await resolveConsentRedirectUri());
  u.searchParams.set("state", state);
  return u.toString();
}
