import "server-only";

import {
  DefaultAzureCredential,
  ManagedIdentityCredential,
  type TokenCredential,
} from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

/**
 * Azure Key Vault integration. v2.7.15.
 *
 * SCSC and any Azure-hosted production deployment require every secret
 * (Graph client_secret, user-auth client_secret, cert PEMs, cert
 * thumbprints, cert chains, the sync trigger shared secret) to live in
 * Key Vault rather than the SQLite app_config table.
 *
 * The Bicep template provisions one vault per Container App and grants
 * the app's system-assigned managed identity the Key Vault Secrets
 * Officer role. Container App `configuration.secrets` resolve from KV
 * at revision start and surface as plain env vars to the runtime via
 * `secretRef`. The runtime never touches the vault for reads — it
 * reads env vars exactly the same way self-hosted Docker deployments
 * read DB-backed fallbacks. Writes are different: rotated secrets go
 * through `writeSecret()` below and trigger a revision restart so the
 * new env values reach a fresh pod.
 *
 * Activation: set `MIZAN_KEY_VAULT_URL` on the runtime (the Bicep
 * template does this automatically). When unset (self-hosted Docker,
 * dev machines), `isEnabled()` returns false and the rest of the
 * codebase falls back to the DB-backed secret store.
 */

/** Pre-seed placeholder written by Bicep. Treated as "not configured". */
export const KV_PLACEHOLDER = "unset";

/**
 * Read any env var that the Bicep template sources from a Key Vault
 * secretRef. Returns `""` when the variable is unset, empty, or still
 * holds the `KV_PLACEHOLDER` value (which the Bicep template writes
 * to every pre-seeded KV secret because Azure Key Vault rejects empty
 * secret bodies).
 *
 * Use this anywhere a secret-shaped env var is read. The contract is:
 * the placeholder MUST be treated identically to "not configured" so
 * downstream auth / sync / gate-checking code doesn't accidentally
 * trust the sentinel value as a real credential.
 *
 * v2.7.18: introduced after `SCSC_SYNC_SECRET` was read directly via
 * `process.env`, accepting `"unset"` as a real bearer requirement and
 * locking the "Sync now" UI behind a 401.
 */
export function readKvBackedEnv(name: string): string {
  const raw = (process.env[name] ?? "").trim();
  if (raw.length === 0 || raw === KV_PLACEHOLDER) return "";
  return raw;
}

const KV_URL = (process.env.MIZAN_KEY_VAULT_URL ?? "").trim();

let _client: SecretClient | null = null;

/**
 * True when the deployment routes secret storage through Azure Key
 * Vault. Decided at boot from the `MIZAN_KEY_VAULT_URL` env var. The
 * Bicep template sets this var to the vault's URI; everything else
 * (self-hosted Docker, dev) leaves it unset.
 */
export function isEnabled(): boolean {
  return KV_URL.length > 0;
}

function client(): SecretClient {
  if (_client) return _client;
  if (!isEnabled()) {
    throw new Error(
      "Key Vault not enabled. Set MIZAN_KEY_VAULT_URL or use the DB-backed secret path.",
    );
  }
  // v2.7.16: use ManagedIdentityCredential with an explicit clientId
  // when the Bicep template tells us which user-assigned identity to
  // pick (MIZAN_MANAGED_IDENTITY_CLIENT_ID). The Container App attaches
  // only the UAMI, so technically IMDS would pick it without a clientId
  // hint, but being explicit avoids ambiguity if a second identity is
  // ever added.
  //
  // Local development (no clientId env var) falls back to
  // DefaultAzureCredential which uses the az CLI session.
  const uamiClientId = (
    process.env.MIZAN_MANAGED_IDENTITY_CLIENT_ID ?? ""
  ).trim();
  const credential: TokenCredential =
    uamiClientId.length > 0
      ? new ManagedIdentityCredential({ clientId: uamiClientId })
      : new DefaultAzureCredential();
  _client = new SecretClient(KV_URL, credential);
  return _client;
}

/**
 * Read a secret from Key Vault. Returns `""` when the secret is the
 * placeholder or doesn't exist, so callers can treat the result the
 * same way they treat an empty env var (i.e. "not configured").
 *
 * In normal operation the runtime should NOT call this — it should
 * read the corresponding env var that the Container App populated from
 * the secretRef. This function exists for tooling, debugging, and the
 * one-off "show me what's in the vault" Settings panel.
 */
export async function readSecret(name: string): Promise<string> {
  try {
    const secret = await client().getSecret(name);
    const value = secret.value ?? "";
    return value === KV_PLACEHOLDER ? "" : value;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404) return "";
    throw err;
  }
}

/**
 * Write (or overwrite) a secret. Empty string becomes the placeholder
 * sentinel because Key Vault rejects empty bodies.
 *
 * Does NOT trigger a revision restart — call `restartContainerApp()`
 * separately after a successful write so the new value reaches the
 * next pod. The split lets callers batch multiple writes and restart
 * once at the end.
 *
 * v2.7.16: retries on 403 (Forbidden) with exponential backoff up to
 * 60 s total. The very first deploy can race RBAC propagation — the
 * Container App's system identity is granted Key Vault Secrets Officer
 * by the Bicep template, but Azure's RBAC plane can take 30-60 seconds
 * to actually let the identity write. Without this retry, a user who
 * runs the setup wizard within a minute of `az deployment group create`
 * hits a 403 and the wizard fails. Other status codes (400 validation,
 * 404 not found, 500 server) fail fast.
 */
export async function writeSecret(name: string, value: string): Promise<void> {
  const payload = value.length > 0 ? value : KV_PLACEHOLDER;
  const delaysMs = [0, 2_000, 5_000, 10_000, 20_000];
  let lastErr: unknown = null;
  for (const wait of delaysMs) {
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      await client().setSecret(name, payload);
      return;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      lastErr = err;
      if (status !== 403) throw err;
      // 403 → RBAC propagation race. Retry.
    }
  }
  throw lastErr;
}

/**
 * Restart the Container App's active revision so the secretRefs
 * declared in the Bicep template are re-resolved from Key Vault. Use
 * after any sequence of writeSecret() calls that the runtime needs to
 * see immediately.
 *
 * Uses the same IMDS-minted ARM token pattern as
 * `/api/updates/apply` — pulls the bearer token from the ACA-injected
 * IDENTITY_ENDPOINT / IDENTITY_HEADER, hits ARM to list revisions,
 * then POSTs a restart against the active one. Throws on any failure
 * so the caller can surface "secret saved, restart pending — refresh
 * in 30 seconds" in the UI.
 */
export async function restartContainerApp(): Promise<void> {
  const resourceId = process.env.MIZAN_AZURE_RESOURCE_ID;
  if (!resourceId) {
    throw new Error(
      "MIZAN_AZURE_RESOURCE_ID is not set. Cannot restart the Container App revision.",
    );
  }
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;
  if (!identityEndpoint || !identityHeader) {
    throw new Error(
      "Managed identity not available (IDENTITY_ENDPOINT / IDENTITY_HEADER missing). Cannot restart the Container App revision.",
    );
  }

  // 1. Acquire an ARM bearer token. v2.7.16: pass the UAMI's clientId
  // (the same identity that the Container App attaches and that holds
  // Container Apps Contributor on the resource group). Without this,
  // IMDS could pick a different default identity or fail because no
  // system identity is present.
  const tokenUrl = new URL(identityEndpoint);
  tokenUrl.searchParams.set("resource", "https://management.azure.com");
  tokenUrl.searchParams.set("api-version", "2019-08-01");
  const uamiClientId = (
    process.env.MIZAN_MANAGED_IDENTITY_CLIENT_ID ?? ""
  ).trim();
  if (uamiClientId.length > 0) {
    tokenUrl.searchParams.set("client_id", uamiClientId);
  }
  const tokenRes = await fetch(tokenUrl.toString(), {
    headers: { "X-IDENTITY-HEADER": identityHeader },
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    throw new Error(
      `Failed to mint ARM token (HTTP ${tokenRes.status}): ${text.slice(0, 200)}`,
    );
  }
  const { access_token } = (await tokenRes.json()) as {
    access_token?: string;
  };
  if (!access_token) {
    throw new Error("ARM token response missing access_token.");
  }

  // 2. Find the active revision.
  const apiVersion = "2024-10-02-preview";
  const listUrl = `https://management.azure.com${resourceId}/revisions?api-version=${apiVersion}`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!listRes.ok) {
    const text = await listRes.text().catch(() => "");
    throw new Error(
      `Failed to list revisions (HTTP ${listRes.status}): ${text.slice(0, 200)}`,
    );
  }
  const revisions = (await listRes.json()) as {
    value?: Array<{ name: string; properties?: { active?: boolean } }>;
  };
  const active = (revisions.value ?? []).find((r) => r.properties?.active);
  if (!active) {
    throw new Error(
      "No active revision found on the Container App. Cannot restart.",
    );
  }

  // 3. Restart it.
  const restartUrl = `https://management.azure.com${resourceId}/revisions/${active.name}/restart?api-version=${apiVersion}`;
  const restartRes = await fetch(restartUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });
  // ARM returns 204 No Content on success.
  if (!restartRes.ok && restartRes.status !== 204) {
    const text = await restartRes.text().catch(() => "");
    throw new Error(
      `Revision restart failed (HTTP ${restartRes.status}): ${text.slice(0, 200)}`,
    );
  }
}

/**
 * Canonical secret name → Container App env var mapping. Mirrors the
 * Bicep template so the runtime and the deploy template can never
 * drift. Anything that writes to Key Vault uses these constants.
 */
export const SECRET_NAMES = {
  graphClientSecret: "mizan-graph-client-secret",
  graphCertPem: "mizan-graph-cert-pem",
  graphCertThumbprint: "mizan-graph-cert-thumbprint",
  graphCertChain: "mizan-graph-cert-chain",
  authClientSecret: "mizan-auth-client-secret",
  authCertPem: "mizan-auth-cert-pem",
  authCertThumbprint: "mizan-auth-cert-thumbprint",
  authCertChain: "mizan-auth-cert-chain",
  syncSecret: "mizan-sync-secret",
} as const;

/**
 * Pod-local override map. When the runtime writes a secret to Key
 * Vault, the env var that the Container App injected at boot still
 * holds the OLD value until the revision restarts. To stop the active
 * pod from making MSAL calls with the dead credential between "save"
 * and "new revision ready", the writer stashes the fresh value here
 * and getOverride() is consulted by the secret reader in
 * azure-config.ts / auth-config.ts before falling through to env.
 *
 * Cleared automatically on process exit. Mizan runs single-replica
 * (minReplicas=maxReplicas=1) so there's only ever one pod to align.
 */
const overrides = new Map<string, string>();

export function setOverride(envVarName: string, value: string): void {
  if (value.length === 0) {
    overrides.delete(envVarName);
    return;
  }
  overrides.set(envVarName, value);
}

export function getOverride(envVarName: string): string | undefined {
  return overrides.get(envVarName);
}

/** Wipe an override after a confirmed revision swap. */
export function clearOverride(envVarName: string): void {
  overrides.delete(envVarName);
}
