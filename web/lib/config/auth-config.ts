import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

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

export function getAuthConfig(): UserAuthConfig {
  const stored = readConfig<Partial<UserAuthConfig>>(KEY);
  if (!stored) return DEFAULT_AUTH_CONFIG;
  // Drop any legacy `enforce` key that may still be on disk from v1.0 —
  // ignored rather than migrated. Callers treat auth as always-on now.
  const { enforce: _legacy, ...rest } = stored as Partial<UserAuthConfig> & {
    enforce?: boolean;
  };
  void _legacy;
  return { ...DEFAULT_AUTH_CONFIG, ...rest };
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

export function setAuthConfig(patch: Partial<UserAuthConfig>): UserAuthConfig {
  const existing = getAuthConfig();
  const next: UserAuthConfig = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeConfig(KEY, next);
  return next;
}

export function clearAuthConfig(): void {
  writeConfig(KEY, { ...DEFAULT_AUTH_CONFIG, updatedAt: new Date().toISOString() });
}
