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

const KEY = "auth.user";

export type Role = "admin" | "analyst" | "viewer";
export const ROLES: Role[] = ["admin", "analyst", "viewer"];

/**
 * 30-day absolute cap on a single session row regardless of sliding extensions.
 * Anything beyond this forces a fresh Microsoft sign-in.
 */
export const MAX_SESSION_MINUTES = 60 * 24 * 30;

/**
 * Curated session-lifetime presets exposed in the Settings UI. Arbitrary
 * integer values still validate on the API — the presets are for the dropdown
 * only. Default = 7 days: invisible silent re-auth on expiry via Microsoft
 * SSO cookie, no password prompt in the common case.
 */
export const SESSION_PRESETS_MIN = [
  60 * 8, //   8 hours
  60 * 24, //  1 day
  60 * 24 * 7, //  7 days (default)
  60 * 24 * 30, // 30 days (absolute max)
] as const;

export type UserAuthConfig = {
  /** Entra app registration used for user sign-in. Separate from the Graph-signals app. */
  clientId: string;
  /** Client secret for the confidential-client auth code flow. Empty when using cert. */
  clientSecret: string;
  /**
   * SHA-1 thumbprint of the public certificate uploaded to the user-auth Entra
   * app. Empty when using secret-based auth. When both cert + secret are set,
   * cert wins.
   */
  clientCertThumbprint: string;
  /** PEM-encoded private key for the cert. Empty when using secret-based auth. */
  clientCertPrivateKeyPem: string;
  /** Optional PEM cert chain for x5c validation. */
  clientCertChainPem: string;
  /** Tenant GUID or "common" / "organizations". Operator tenant is the default. */
  tenantId: string;
  /**
   * Sliding session timeout in minutes. Each authenticated request within the
   * second half of the window pushes expiry forward by another full timeout,
   * capped at MAX_SESSION_MINUTES from session creation.
   */
  sessionTimeoutMinutes: number;
  /** Role auto-assigned to newly provisioned users on their first login. */
  defaultRole: Role;
  updatedAt?: string;
};

export type UserAuthMethod = "certificate" | "secret" | "none";

export const DEFAULT_AUTH_CONFIG: UserAuthConfig = {
  clientId: "",
  clientSecret: "",
  clientCertThumbprint: "",
  clientCertPrivateKeyPem: "",
  clientCertChainPem: "",
  tenantId: "",
  sessionTimeoutMinutes: 60 * 24 * 7, // 7 days — sliding window
  defaultRole: "viewer",
};

/**
 * Read a secret-shaped value with the v2.7.15 preference order:
 *
 *   1. Pod-local override (set just after a KV write so the active pod
 *      sees the new value before the revision restart catches up).
 *   2. Environment variable (Container App secretRef populates this
 *      from Key Vault; self-hosted Docker can set it in .env.local).
 *   3. DB-stored value (legacy / fallback path).
 */
function readSecretField(envVar: string, storedValue: string | undefined): string {
  const override = kvGetOverride(envVar);
  if (override !== undefined && override.length > 0) return override;
  const env = process.env[envVar];
  if (env && env.length > 0 && env !== "unset") return env;
  if (storedValue && storedValue.length > 0) return storedValue;
  return "";
}

export function getAuthConfig(): UserAuthConfig {
  const stored = readConfig<Partial<UserAuthConfig>>(KEY);
  // Drop any legacy `enforce` key that may still be on disk from v1.0 —
  // ignored rather than migrated. Callers treat auth as always-on now.
  const safe: Partial<UserAuthConfig> = stored
    ? (() => {
        const { enforce: _legacy, ...rest } = stored as Partial<UserAuthConfig> & {
          enforce?: boolean;
        };
        void _legacy;
        return rest;
      })()
    : {};

  // Layer env-var / KV-override secrets over the stored row. Non-secret
  // fields come straight from the DB.
  return {
    ...DEFAULT_AUTH_CONFIG,
    ...safe,
    clientSecret: readSecretField("MIZAN_AUTH_CLIENT_SECRET", safe.clientSecret),
    clientCertPrivateKeyPem: readSecretField(
      "MIZAN_AUTH_CERT_PRIVATE_KEY_PEM",
      safe.clientCertPrivateKeyPem,
    ),
    clientCertThumbprint: readSecretField(
      "MIZAN_AUTH_CERT_THUMBPRINT",
      safe.clientCertThumbprint,
    ),
    clientCertChainPem: readSecretField(
      "MIZAN_AUTH_CERT_CHAIN_PEM",
      safe.clientCertChainPem,
    ),
  };
}

/**
 * True when sign-in is technically possible — credentials are present. Used
 * by the login page + whoami to decide whether to surface a Sign-in button.
 * Either secret OR cert is enough.
 */
export function isAuthConfigured(): boolean {
  const cfg = getAuthConfig();
  if (cfg.clientId.length === 0) return false;
  const hasSecret = cfg.clientSecret.length > 0;
  const hasCert =
    cfg.clientCertThumbprint.length > 0 &&
    cfg.clientCertPrivateKeyPem.length > 0;
  return hasSecret || hasCert;
}

/** Active user-auth method, derived from the stored config. Cert wins. */
export function getUserAuthMethod(): UserAuthMethod {
  const cfg = getAuthConfig();
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
 * Demo/showcase deployments set `MIZAN_DEMO_MODE=true` in the container env.
 * When true, every RBAC check short-circuits to "open" so prospects can browse
 * without signing in. Deliberately an env var (not a DB toggle) so it's
 * controlled by whoever owns the deployment, not by an operator clicking in
 * the UI — that was the footgun in the old `enforce` flag.
 */
export function isDemoMode(): boolean {
  return process.env.MIZAN_DEMO_MODE === "true";
}

/**
 * Persist a partial UserAuthConfig.
 *
 * v2.7.15: when Key Vault is enabled, secret-shaped fields are written
 * to KV (mizan-auth-client-secret, mizan-auth-cert-pem,
 * mizan-auth-cert-thumbprint, mizan-auth-cert-chain) and the DB row
 * keeps only non-secret config (clientId, tenantId, session, role).
 * The pod-local override map mirrors the new value so the active pod
 * uses it immediately, before the Container App revision restarts.
 *
 * Caller should invoke `restartAuthAfterSecretWrite()` after this
 * function returns when a secret-shaped field was touched.
 */
export async function setAuthConfig(
  patch: Partial<UserAuthConfig>,
): Promise<UserAuthConfig> {
  const existing = getAuthConfig();
  const next: UserAuthConfig = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (kvEnabled()) {
    if (patch.clientSecret !== undefined) {
      await kvWriteSecret(SECRET_NAMES.authClientSecret, next.clientSecret);
      kvSetOverride("MIZAN_AUTH_CLIENT_SECRET", next.clientSecret);
    }
    if (patch.clientCertPrivateKeyPem !== undefined) {
      await kvWriteSecret(
        SECRET_NAMES.authCertPem,
        next.clientCertPrivateKeyPem,
      );
      kvSetOverride(
        "MIZAN_AUTH_CERT_PRIVATE_KEY_PEM",
        next.clientCertPrivateKeyPem,
      );
    }
    if (patch.clientCertThumbprint !== undefined) {
      await kvWriteSecret(
        SECRET_NAMES.authCertThumbprint,
        next.clientCertThumbprint,
      );
      kvSetOverride("MIZAN_AUTH_CERT_THUMBPRINT", next.clientCertThumbprint);
    }
    if (patch.clientCertChainPem !== undefined) {
      await kvWriteSecret(SECRET_NAMES.authCertChain, next.clientCertChainPem);
      kvSetOverride("MIZAN_AUTH_CERT_CHAIN_PEM", next.clientCertChainPem);
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

export async function clearAuthConfig(): Promise<void> {
  if (kvEnabled()) {
    await Promise.all([
      kvWriteSecret(SECRET_NAMES.authClientSecret, ""),
      kvWriteSecret(SECRET_NAMES.authCertPem, ""),
      kvWriteSecret(SECRET_NAMES.authCertThumbprint, ""),
      kvWriteSecret(SECRET_NAMES.authCertChain, ""),
    ]);
    kvSetOverride("MIZAN_AUTH_CLIENT_SECRET", "");
    kvSetOverride("MIZAN_AUTH_CERT_PRIVATE_KEY_PEM", "");
    kvSetOverride("MIZAN_AUTH_CERT_THUMBPRINT", "");
    kvSetOverride("MIZAN_AUTH_CERT_CHAIN_PEM", "");
  }
  writeConfig(KEY, {
    ...DEFAULT_AUTH_CONFIG,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Fire-and-forget restart so the next pod's env vars are dereferenced
 * fresh from Key Vault. No-op outside KV-backed deployments.
 */
export function restartAuthAfterSecretWrite(): void {
  if (!kvEnabled()) return;
  kvRestartContainerApp().catch((err) => {
    console.error("[auth-config] Container App restart failed:", err);
  });
}
