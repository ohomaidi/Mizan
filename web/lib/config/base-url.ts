import "server-only";
import { headers } from "next/headers";
import { config } from "@/lib/config";

/**
 * Resolve the dashboard's public base URL for this request.
 *
 * Priority:
 *   1. `APP_BASE_URL` env var / runtime config. This is authoritative when the
 *      operator has told the app what URL it's reachable at (Azure custom
 *      domain, Cloudflare tunnel, on-prem hostname, etc.).
 *   2. The current request's forwarded host. Lets a fresh one-click Azure
 *      Container Apps deployment "just work" on its assigned *.azurecontainerapps.io
 *      hostname without the operator having to paste it anywhere.
 *   3. `http://localhost:8787` — last-resort for the dev box.
 *
 * Use this anywhere we need to build an OIDC redirect URI or print a dashboard
 * URL at render time.
 */
export async function resolveAppBaseUrl(): Promise<string> {
  const envBase = (config.appBaseUrl ?? "").trim();
  if (envBase.length > 0) return envBase.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    }
  } catch {
    /* not in a request context (e.g. during build) — fall through */
  }
  return "http://localhost:8787";
}

/** Consent-callback URL for the Graph-signals app. Honors the explicit DB override if set. */
export async function resolveConsentRedirectUri(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAzureConfig } = require("@/lib/config/azure-config") as {
    getAzureConfig: () => { consentRedirectUri: string };
  };
  const stored = getAzureConfig().consentRedirectUri.trim();
  if (stored.length > 0) return stored;
  return `${await resolveAppBaseUrl()}/api/auth/consent-callback`;
}

/** User sign-in callback URL for the user-auth app. */
export async function resolveUserAuthRedirectUri(): Promise<string> {
  return `${await resolveAppBaseUrl()}/api/auth/user-callback`;
}
