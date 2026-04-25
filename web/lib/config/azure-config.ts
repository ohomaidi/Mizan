import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

const KEY = "azure.app";

/**
 * Two equivalent ways to authenticate to Microsoft Entra:
 *
 * - **Secret-based** — `clientSecret` is a Microsoft-generated string. Set it
 *   in Settings or the setup wizard. Easy to provision but rotates every 6–24
 *   months and lives in the SQLite config_store as plaintext at rest.
 *
 * - **Certificate-based** (production hardening) — operator uploads a
 *   PFX-or-PEM private key + records the matching cert thumbprint. Used
 *   when the Council wants to satisfy "no shared secrets in app config"
 *   audit requirements. The cert lifetime is whatever they sign it with
 *   (years, typically) and the public cert is uploaded to the Entra app's
 *   "Certificates & secrets" blade.
 *
 * `getAzureAuthMethod()` reports which one is active so callers can render
 * the right Settings UI. The MSAL builder in `lib/graph/msal.ts` prefers
 * cert when both are present.
 */
export type AzureAppConfig = {
  clientId: string;
  clientSecret: string;
  /**
   * SHA-1 thumbprint of the public certificate uploaded to the Entra app,
   * upper-case hex without colons (e.g. "F5A6B0...").
   */
  clientCertThumbprint: string;
  /**
   * PEM-encoded private key matching the cert. Stored at rest in
   * `app_config`; treated as a secret. Empty string when unset.
   */
  clientCertPrivateKeyPem: string;
  /**
   * Optional PEM-encoded full certificate chain. When set, MSAL sends it
   * via x5c so Entra can validate without separately trusting the cert.
   * Helpful for tenants that scope cert acceptance by chain.
   */
  clientCertChainPem: string;
  authorityHost: string;
  /** Optional override — if set, replaces APP_BASE_URL-derived consent redirect URI. */
  consentRedirectUri: string;
  updatedAt?: string;
};

/** Active auth method, derived from the stored config. */
export type AzureAuthMethod = "certificate" | "secret" | "none";

const DEFAULT_AUTHORITY_HOST = "https://login.microsoftonline.com";

/**
 * DB-backed Azure app registration config (Settings → App Registration panel).
 * Falls back to env vars when no DB override is stored — so fresh installs still honor .env.local.
 * On write, invalidates the MSAL client + token caches so new creds take effect immediately.
 */
export function getAzureConfig(): AzureAppConfig {
  const stored = readConfig<AzureAppConfig>(KEY);
  return {
    clientId:
      stored?.clientId && stored.clientId.length > 0
        ? stored.clientId
        : (process.env.AZURE_CLIENT_ID ?? ""),
    clientSecret:
      stored?.clientSecret && stored.clientSecret.length > 0
        ? stored.clientSecret
        : (process.env.AZURE_CLIENT_SECRET ?? ""),
    clientCertThumbprint:
      stored?.clientCertThumbprint && stored.clientCertThumbprint.length > 0
        ? stored.clientCertThumbprint
        : (process.env.AZURE_CLIENT_CERT_THUMBPRINT ?? ""),
    clientCertPrivateKeyPem:
      stored?.clientCertPrivateKeyPem &&
      stored.clientCertPrivateKeyPem.length > 0
        ? stored.clientCertPrivateKeyPem
        : (process.env.AZURE_CLIENT_CERT_PRIVATE_KEY_PEM ?? ""),
    clientCertChainPem:
      stored?.clientCertChainPem && stored.clientCertChainPem.length > 0
        ? stored.clientCertChainPem
        : (process.env.AZURE_CLIENT_CERT_CHAIN_PEM ?? ""),
    authorityHost:
      stored?.authorityHost && stored.authorityHost.length > 0
        ? stored.authorityHost
        : (process.env.AZURE_AUTHORITY_HOST ?? DEFAULT_AUTHORITY_HOST),
    consentRedirectUri:
      stored?.consentRedirectUri && stored.consentRedirectUri.length > 0
        ? stored.consentRedirectUri
        : "",
    updatedAt: stored?.updatedAt,
  };
}

/**
 * Decide which auth method is active based on what's configured. Cert wins
 * when both are present — that's the production-hardening default. If only
 * `clientSecret` is set, fall back to it. If neither, "none" (the app is
 * unconfigured and `assertAzureConfigured()` will throw).
 */
export function getAzureAuthMethod(): AzureAuthMethod {
  const cfg = getAzureConfig();
  if (
    cfg.clientCertThumbprint.length > 0 &&
    cfg.clientCertPrivateKeyPem.length > 0
  ) {
    return "certificate";
  }
  if (cfg.clientSecret.length > 0) return "secret";
  return "none";
}

/**
 * Merge a partial input over the existing Azure config and persist the
 * result. **Explicit-empty wins over fallback** — passing an empty string
 * for any credential field clears it. This is the auth-method switch's
 * primary lever: when the operator switches Secret → Certificate the UI
 * sends `{clientSecret: ""}` and we must NOT preserve the prior secret.
 *
 * Plain `??` fallback would keep stale credentials in the DB even after the
 * operator switched methods (`"" ?? "abc"` evaluates to `"abc"`). The MSAL
 * builder prefers cert when both are present, so the stale secret would
 * never be USED, but it would still sit in the row indefinitely — which
 * defeats the "switching clears the other" guarantee surfaced in the UI.
 */
export function setAzureConfig(input: Partial<AzureAppConfig>): AzureAppConfig {
  const existing = readConfig<AzureAppConfig>(KEY) ?? ({} as AzureAppConfig);
  const pick = <K extends keyof AzureAppConfig>(
    field: K,
    fallback: string,
  ): string =>
    (input[field] !== undefined
      ? (input[field] as string)
      : ((existing[field] as string | undefined) ?? fallback));
  const next: AzureAppConfig = {
    clientId: pick("clientId", ""),
    clientSecret: pick("clientSecret", ""),
    clientCertThumbprint: pick("clientCertThumbprint", ""),
    clientCertPrivateKeyPem: pick("clientCertPrivateKeyPem", ""),
    clientCertChainPem: pick("clientCertChainPem", ""),
    authorityHost: pick("authorityHost", DEFAULT_AUTHORITY_HOST),
    consentRedirectUri: pick("consentRedirectUri", ""),
    updatedAt: new Date().toISOString(),
  };
  writeConfig(KEY, next);
  return next;
}

export function clearAzureConfig(): void {
  writeConfig(KEY, {
    clientId: "",
    clientSecret: "",
    clientCertThumbprint: "",
    clientCertPrivateKeyPem: "",
    clientCertChainPem: "",
    authorityHost: DEFAULT_AUTHORITY_HOST,
    consentRedirectUri: "",
    updatedAt: new Date().toISOString(),
  });
}

/** Source annotation for the UI — where the current value actually came from. */
export function getAzureConfigSource(): {
  clientId: "db" | "env" | "none";
  clientSecret: "db" | "env" | "none";
  clientCert: "db" | "env" | "none";
} {
  const stored = readConfig<AzureAppConfig>(KEY);
  return {
    clientId: stored?.clientId
      ? "db"
      : process.env.AZURE_CLIENT_ID
        ? "env"
        : "none",
    clientSecret: stored?.clientSecret
      ? "db"
      : process.env.AZURE_CLIENT_SECRET
        ? "env"
        : "none",
    clientCert:
      stored?.clientCertThumbprint && stored?.clientCertPrivateKeyPem
        ? "db"
        : process.env.AZURE_CLIENT_CERT_THUMBPRINT &&
            process.env.AZURE_CLIENT_CERT_PRIVATE_KEY_PEM
          ? "env"
          : "none",
  };
}
