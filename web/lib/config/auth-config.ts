import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

const KEY = "auth.user";

export type Role = "admin" | "analyst" | "viewer";
export const ROLES: Role[] = ["admin", "analyst", "viewer"];

export type UserAuthConfig = {
  /** Entra app registration used for user sign-in. Separate from the Graph-signals app. */
  clientId: string;
  /** Client secret for the confidential-client auth code flow. */
  clientSecret: string;
  /** Tenant GUID or "common" / "organizations". Operator tenant is the default. */
  tenantId: string;
  /** Absolute session timeout in minutes. A logged-in user must re-authenticate after this. */
  sessionTimeoutMinutes: number;
  /** Role auto-assigned to newly provisioned users on their first login. */
  defaultRole: Role;
  /**
   * If true, every dashboard route requires an authenticated session. When false
   * (or when clientId is empty), the dashboard is open — used for demos and
   * fresh installs before the operator has finished the auth configuration.
   */
  enforce: boolean;
  updatedAt?: string;
};

export const DEFAULT_AUTH_CONFIG: UserAuthConfig = {
  clientId: "",
  clientSecret: "",
  tenantId: "",
  sessionTimeoutMinutes: 480, // 8 hours — long enough for a full workday
  defaultRole: "viewer",
  enforce: false,
};

export function getAuthConfig(): UserAuthConfig {
  const stored = readConfig<Partial<UserAuthConfig>>(KEY);
  if (!stored) return DEFAULT_AUTH_CONFIG;
  return { ...DEFAULT_AUTH_CONFIG, ...stored };
}

/**
 * True when the operator has supplied a client_id + secret AND flipped on
 * enforcement. Until both are true the middleware leaves all routes open so
 * first-run installs can reach the Settings page to finish configuration.
 */
export function isAuthEnforced(): boolean {
  const cfg = getAuthConfig();
  return cfg.enforce && cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
}

/**
 * True when sign-in is technically possible — credentials are present. The
 * wizard's bootstrap flow needs this to be true with `enforce=false` so the
 * first admin can sign in before enforcement locks the dashboard down.
 */
export function isAuthConfigured(): boolean {
  const cfg = getAuthConfig();
  return cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
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
