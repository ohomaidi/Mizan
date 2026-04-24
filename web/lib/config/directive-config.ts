import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * Directive app config — stored at app_config key `azure.directive`. Separate
 * from `azure.app` (the Graph Signals read-only app) because the Directive
 * app holds `.ReadWrite` scopes and is a DIFFERENT Entra app registration.
 *
 * Only meaningful in directive-mode deployments (MIZAN_DEPLOYMENT_MODE=directive).
 * Observation-mode deployments never read, write, or provision this.
 *
 * See lib/config/deployment-mode.ts for the env gate.
 */

const KEY = "azure.directive";

export type DirectiveAppConfig = {
  /** Entra app client ID for the Directive / writes app. */
  clientId: string;
  /** Client secret (confidential client credential grant for app-only writes,
   *  auth-code grant for delegated writes with a Center admin identity). */
  clientSecret: string;
  /** Authority host — typically the same as the Signals app but overridable. */
  authorityHost: string;
  /** Optional override for the consent redirect URI. Defaults to
   *  `${APP_BASE_URL}/api/auth/directive-callback` at runtime. */
  consentRedirectUri: string;
  /** When the config was last saved. */
  updatedAt?: string;
};

const DEFAULT_AUTHORITY_HOST = "https://login.microsoftonline.com";

export function getDirectiveConfig(): DirectiveAppConfig {
  const stored = readConfig<DirectiveAppConfig>(KEY);
  return {
    clientId:
      stored?.clientId && stored.clientId.length > 0
        ? stored.clientId
        : (process.env.DIRECTIVE_CLIENT_ID ?? ""),
    clientSecret:
      stored?.clientSecret && stored.clientSecret.length > 0
        ? stored.clientSecret
        : (process.env.DIRECTIVE_CLIENT_SECRET ?? ""),
    authorityHost:
      stored?.authorityHost && stored.authorityHost.length > 0
        ? stored.authorityHost
        : (process.env.DIRECTIVE_AUTHORITY_HOST ?? DEFAULT_AUTHORITY_HOST),
    consentRedirectUri:
      stored?.consentRedirectUri && stored.consentRedirectUri.length > 0
        ? stored.consentRedirectUri
        : "",
    updatedAt: stored?.updatedAt,
  };
}

export function setDirectiveConfig(
  input: Partial<DirectiveAppConfig>,
): DirectiveAppConfig {
  const existing = readConfig<DirectiveAppConfig>(KEY) ?? ({} as DirectiveAppConfig);
  const next: DirectiveAppConfig = {
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

export function clearDirectiveConfig(): void {
  writeConfig(KEY, {
    clientId: "",
    clientSecret: "",
    authorityHost: DEFAULT_AUTHORITY_HOST,
    consentRedirectUri: "",
    updatedAt: new Date().toISOString(),
  });
}

/**
 * True when the Directive app has usable credentials stored. Used by the UI
 * to decide whether the "onboard entity in Directive mode" option is available.
 * False on fresh directive-mode deployments before the Center admin has
 * provisioned the second Entra app via the Settings panel.
 */
export function isDirectiveConfigured(): boolean {
  const cfg = getDirectiveConfig();
  return cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
}

export function getDirectiveConfigSource(): {
  clientId: "db" | "env" | "none";
  clientSecret: "db" | "env" | "none";
} {
  const stored = readConfig<DirectiveAppConfig>(KEY);
  return {
    clientId: stored?.clientId
      ? "db"
      : process.env.DIRECTIVE_CLIENT_ID
        ? "env"
        : "none",
    clientSecret: stored?.clientSecret
      ? "db"
      : process.env.DIRECTIVE_CLIENT_SECRET
        ? "env"
        : "none",
  };
}
