import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

const KEY = "azure.app";

export type AzureAppConfig = {
  clientId: string;
  clientSecret: string;
  authorityHost: string;
  /** Optional override — if set, replaces APP_BASE_URL-derived consent redirect URI. */
  consentRedirectUri: string;
  updatedAt?: string;
};

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

export function setAzureConfig(input: Partial<AzureAppConfig>): AzureAppConfig {
  const existing = readConfig<AzureAppConfig>(KEY) ?? ({} as AzureAppConfig);
  const next: AzureAppConfig = {
    clientId: input.clientId ?? existing.clientId ?? "",
    clientSecret: input.clientSecret ?? existing.clientSecret ?? "",
    authorityHost:
      input.authorityHost ?? existing.authorityHost ?? DEFAULT_AUTHORITY_HOST,
    consentRedirectUri:
      input.consentRedirectUri ?? existing.consentRedirectUri ?? "",
    updatedAt: new Date().toISOString(),
  };
  writeConfig(KEY, next);
  return next;
}

export function clearAzureConfig(): void {
  writeConfig(KEY, {
    clientId: "",
    clientSecret: "",
    authorityHost: DEFAULT_AUTHORITY_HOST,
    consentRedirectUri: "",
    updatedAt: new Date().toISOString(),
  });
}

/** Source annotation for the UI — where the current value actually came from. */
export function getAzureConfigSource(): {
  clientId: "db" | "env" | "none";
  clientSecret: "db" | "env" | "none";
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
  };
}
