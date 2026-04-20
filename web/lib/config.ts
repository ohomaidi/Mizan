import path from "node:path";

function opt(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v !== "" ? v : fallback;
}

/**
 * Runtime config — read from environment + DB-backed overrides.
 *
 * Azure credentials (clientId / clientSecret / authorityHost) have moved to a DB-backed
 * store so they can be edited via Settings → App Registration at runtime. Env vars remain
 * a valid source for fresh installs and backwards compatibility — DB wins when set.
 * See `lib/config/azure-config.ts`.
 */
export const config = {
  /**
   * Public base URL of the deployed app, when the operator has explicitly set
   * it via APP_BASE_URL. If empty, callers that run inside a request context
   * should use `resolveAppBaseUrl()` from `lib/config/base-url.ts` — it reads
   * the forwarded host header so one-click ACA deployments on the assigned
   * `*.azurecontainerapps.io` hostname work with no post-deploy config step.
   */
  appBaseUrl: opt("APP_BASE_URL", ""),

  /** Azure AD app registration — DB-backed with env fallback. Safe to call from server-only code. */
  get azure(): {
    clientId: string;
    clientSecret: string;
    authorityHost: string;
  } {
    // Lazy-require to keep this module usable in edge runtimes where `server-only` can't load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAzureConfig } = require("./config/azure-config");
    const cfg = getAzureConfig() as {
      clientId: string;
      clientSecret: string;
      authorityHost: string;
    };
    return cfg;
  },

  /** Where persistent data lives. Defaults to <project>/data; override in prod. */
  dataDir: opt("DATA_DIR", path.resolve(process.cwd(), "data")),

  /** SQLite file path (derived from DATA_DIR unless explicitly overridden). */
  get dbPath(): string {
    return opt("SCSC_DB_PATH", path.join(this.dataDir, "scsc.sqlite"));
  },

  /** Optional shared secret for triggering sync via API (prevents drive-by calls). */
  syncSecret: process.env.SCSC_SYNC_SECRET ?? "",

  /** Snapshot retention window in days. Default 90. Pruning runs after each sync. */
  retentionDays: (() => {
    const n = Number(process.env.SCSC_RETENTION_DAYS ?? 90);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 90;
  })(),

  /** True when the MSAL client is ready to issue tokens. */
  get isAzureConfigured(): boolean {
    const a = this.azure;
    return Boolean(a.clientId && a.clientSecret);
  },

  /** Redirect URI registered on the Entra app for admin consent callbacks. */
  get consentRedirectUri(): string {
    // DB-backed override takes precedence over the APP_BASE_URL-derived default.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAzureConfig } = require("./config/azure-config");
    const cfg = getAzureConfig() as { consentRedirectUri: string };
    if (cfg.consentRedirectUri) return cfg.consentRedirectUri;
    return `${this.appBaseUrl.replace(/\/+$/, "")}/api/auth/consent-callback`;
  },
};

/**
 * Assert config is valid for Azure-dependent operations.
 * Call this at the entry of any code path that needs a Graph token.
 */
export function assertAzureConfigured(): void {
  if (!config.isAzureConfigured) {
    throw new Error(
      "Azure app registration is not configured. Set credentials in Settings → App Registration (or AZURE_CLIENT_ID / AZURE_CLIENT_SECRET in .env.local) — see docs/08-phase2-setup.md.",
    );
  }
}
