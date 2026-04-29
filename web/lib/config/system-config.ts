import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * System-level deployment config — currently just a stored base
 * URL override. v2.7.0 surfaces a domain-change wizard at
 * Settings → System → Domain & URL; the operator pastes a new
 * dashboard URL (e.g. moving from the Azure-issued
 * *.azurecontainerapps.io hostname to a custom domain) and the
 * stored override takes precedence over header-inferred URL on
 * every redirect-URI build.
 *
 * Falls back through the existing precedence chain when the
 * stored value is empty:
 *   1. (NEW) `app_config.system.baseUrl` — operator-set override
 *   2. `APP_BASE_URL` env var — preset by the deploy automation
 *   3. Forwarded `Host` header — auto-detect for one-click ACA
 *   4. `http://localhost:8787` — dev box
 */

export type SystemConfig = {
  /** Operator-set base URL override. Empty string = unset. */
  baseUrl: string;
};

const DEFAULTS: SystemConfig = { baseUrl: "" };

const KEY = "system.config";

export function getSystemConfig(): SystemConfig {
  return { ...DEFAULTS, ...(readConfig<Partial<SystemConfig>>(KEY) ?? {}) };
}

export function setSystemConfig(patch: Partial<SystemConfig>): SystemConfig {
  const current = getSystemConfig();
  const next: SystemConfig = {
    baseUrl:
      typeof patch.baseUrl === "string"
        ? sanitizeBaseUrl(patch.baseUrl)
        : current.baseUrl,
  };
  writeConfig(KEY, next);
  return next;
}

/** Strip trailing slashes and validate the protocol. Empty input = clear. */
function sanitizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}
