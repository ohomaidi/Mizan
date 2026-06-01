import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";
import {
  isEnabled as kvEnabled,
  writeSecret as kvWriteSecret,
  restartContainerApp as kvRestartContainerApp,
  setOverride as kvSetOverride,
  getOverride as kvGetOverride,
  SECRET_NAMES,
} from "@/lib/secrets/keyvault";

const KEY = "azure.app";

/**
 * Two equivalent ways to authenticate to Microsoft Entra:
 *
 * - **Secret-based** — `clientSecret` is a Microsoft-generated string. Set it
 *   in Settings or the setup wizard. Easy to provision but rotates every 6–24
 *   months. v2.7.15: stored in Azure Key Vault when MIZAN_KEY_VAULT_URL is
 *   set; falls back to the SQLite config_store for self-hosted Docker.
 *
 * - **Certificate-based** (production hardening) — operator uploads a
 *   PFX-or-PEM private key + records the matching cert thumbprint. Used
 *   when the Council wants to satisfy "no shared secrets in app config"
 *   audit requirements. The cert lifetime is whatever they sign it with
 *   (years, typically) and the public cert is uploaded to the Entra app's
 *   "Certificates & secrets" blade. v2.7.15: cert PEM + thumbprint + chain
 *   all live in Key Vault on Azure deployments.
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
   * PEM-encoded private key matching the cert. Stored in Key Vault on
   * Azure deployments; in `app_config` for self-hosted Docker. Empty
   * string when unset.
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
 * Decide where a secret-shaped field's value comes from. Preference
 * order:
 *
 *   1. Pod-local override map — set when this process just wrote a new
 *      value to Key Vault. The Container App's env vars still hold the
 *      old value until the revision restarts; the override map closes
 *      that window so the active pod uses the fresh secret immediately.
 *   2. Environment variable — Container App secretRef populates this
 *      from Key Vault at revision start. Self-hosted Docker can set it
 *      directly via .env.local for bootstrap.
 *   3. DB-stored value — the legacy/self-hosted path. Used when Key
 *      Vault is not configured.
 */
function readSecretField(envVar: string, storedValue: string | undefined): string {
  const override = kvGetOverride(envVar);
  if (override !== undefined && override.length > 0) return override;
  const env = process.env[envVar];
  if (env && env.length > 0 && env !== "unset") return env;
  if (storedValue && storedValue.length > 0) return storedValue;
  return "";
}

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
    clientSecret: readSecretField("AZURE_CLIENT_SECRET", stored?.clientSecret),
    clientCertThumbprint: readSecretField(
      "AZURE_CLIENT_CERT_THUMBPRINT",
      stored?.clientCertThumbprint,
    ),
    clientCertPrivateKeyPem: readSecretField(
      "AZURE_CLIENT_CERT_PRIVATE_KEY_PEM",
      stored?.clientCertPrivateKeyPem,
    ),
    clientCertChainPem: readSecretField(
      "AZURE_CLIENT_CERT_CHAIN_PEM",
      stored?.clientCertChainPem,
    ),
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
 * v2.7.15 routing:
 *   - When Key Vault is enabled, secret-shaped fields are written to
 *     KV and the DB row holds only non-secret config (clientId,
 *     authorityHost, consentRedirectUri). The pod-local override map
 *     also gets set so the active pod sees the new value immediately,
 *     before the Container App revision restart catches up.
 *   - When Key Vault is not enabled (self-hosted Docker, dev), the
 *     legacy DB-backed path is used end-to-end.
 *
 * Caller is responsible for invoking `restartAfterSecretWrite()` to
 * trigger a Container App revision restart when KV is enabled. This
 * function returns synchronously without restarting so callers can
 * batch multiple credential changes and restart once.
 */
export async function setAzureConfig(
  input: Partial<AzureAppConfig>,
): Promise<AzureAppConfig> {
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

  if (kvEnabled()) {
    // Push secrets to Key Vault when the operator actually touched
    // them (input.X !== undefined). Untouched fields stay in KV with
    // their existing value, no rewrite.
    if (input.clientSecret !== undefined) {
      await kvWriteSecret(SECRET_NAMES.graphClientSecret, next.clientSecret);
      kvSetOverride("AZURE_CLIENT_SECRET", next.clientSecret);
    }
    if (input.clientCertPrivateKeyPem !== undefined) {
      await kvWriteSecret(SECRET_NAMES.graphCertPem, next.clientCertPrivateKeyPem);
      kvSetOverride(
        "AZURE_CLIENT_CERT_PRIVATE_KEY_PEM",
        next.clientCertPrivateKeyPem,
      );
    }
    if (input.clientCertThumbprint !== undefined) {
      await kvWriteSecret(
        SECRET_NAMES.graphCertThumbprint,
        next.clientCertThumbprint,
      );
      kvSetOverride("AZURE_CLIENT_CERT_THUMBPRINT", next.clientCertThumbprint);
    }
    if (input.clientCertChainPem !== undefined) {
      await kvWriteSecret(SECRET_NAMES.graphCertChain, next.clientCertChainPem);
      kvSetOverride("AZURE_CLIENT_CERT_CHAIN_PEM", next.clientCertChainPem);
    }
    // Strip secrets from the DB row so the only at-rest copy lives in
    // Key Vault.
    writeConfig(KEY, {
      ...next,
      clientSecret: "",
      clientCertPrivateKeyPem: "",
      clientCertThumbprint: "",
      clientCertChainPem: "",
    });
  } else {
    writeConfig(KEY, next);
  }

  return next;
}

export async function clearAzureConfig(): Promise<void> {
  if (kvEnabled()) {
    await Promise.all([
      kvWriteSecret(SECRET_NAMES.graphClientSecret, ""),
      kvWriteSecret(SECRET_NAMES.graphCertPem, ""),
      kvWriteSecret(SECRET_NAMES.graphCertThumbprint, ""),
      kvWriteSecret(SECRET_NAMES.graphCertChain, ""),
    ]);
    kvSetOverride("AZURE_CLIENT_SECRET", "");
    kvSetOverride("AZURE_CLIENT_CERT_PRIVATE_KEY_PEM", "");
    kvSetOverride("AZURE_CLIENT_CERT_THUMBPRINT", "");
    kvSetOverride("AZURE_CLIENT_CERT_CHAIN_PEM", "");
  }
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

/**
 * Trigger a Container App revision restart after a setAzureConfig()
 * call so the secretRefs re-resolve from Key Vault and the next pod
 * gets the fresh values from env vars (not just the pod-local override
 * map).
 *
 * No-op when Key Vault is not enabled — DB-backed deployments don't
 * need a restart, the new value is already visible to the next read.
 *
 * Fire-and-forget by design: the request that triggers this call is
 * being served BY the revision we're about to restart, so we can't
 * await its completion without ending our own response prematurely.
 */
export function restartAfterSecretWrite(): void {
  if (!kvEnabled()) return;
  // Background the restart. Errors are logged but don't surface — the
  // operator can manually restart from Azure portal if this fails.
  kvRestartContainerApp().catch((err) => {
    console.error("[azure-config] Container App restart failed:", err);
  });
}

/** Source annotation for the UI — where the current value actually came from. */
export function getAzureConfigSource(): {
  clientId: "db" | "env" | "none";
  clientSecret: "kv" | "db" | "env" | "none";
  clientCert: "kv" | "db" | "env" | "none";
} {
  const stored = readConfig<AzureAppConfig>(KEY);
  const secretSource: "kv" | "db" | "env" | "none" = kvEnabled()
    ? "kv"
    : stored?.clientSecret
      ? "db"
      : process.env.AZURE_CLIENT_SECRET
        ? "env"
        : "none";
  const certSource: "kv" | "db" | "env" | "none" = kvEnabled()
    ? "kv"
    : stored?.clientCertThumbprint && stored?.clientCertPrivateKeyPem
      ? "db"
      : process.env.AZURE_CLIENT_CERT_THUMBPRINT &&
          process.env.AZURE_CLIENT_CERT_PRIVATE_KEY_PEM
        ? "env"
        : "none";
  return {
    clientId: stored?.clientId
      ? "db"
      : process.env.AZURE_CLIENT_ID
        ? "env"
        : "none",
    clientSecret: secretSource,
    clientCert: certSource,
  };
}
