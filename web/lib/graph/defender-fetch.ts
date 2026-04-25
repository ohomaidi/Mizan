import "server-only";
import { getDefenderTokenForTenant } from "./msal";
import { recordEndpointHealth } from "@/lib/db/signals";
import { GraphError } from "./fetch";

/**
 * Microsoft Defender for Endpoint API root. The legacy hostname
 * `api.securitycenter.microsoft.com` and the unified Defender XDR
 * hostname `api.security.microsoft.com` are both live and accept the
 * same OAuth token (audience stays `api.securitycenter.microsoft.com`).
 * Microsoft is steering all new traffic to the unified hostname so we
 * use that here.
 *
 * Why a separate fetch helper instead of reusing `graphFetch`?
 *  - Different host, different audience, different error shape (Defender
 *    returns `{error: {code, message, target}}` rather than Graph's
 *    `{error: {code, message}}` shape — close enough that we can share
 *    `GraphError` for the error class but not the helper).
 *  - The token cache has to be keyed per audience (see msal.ts) so a
 *    Graph token never gets sent to Defender (and vice versa, both
 *    return 401).
 */
const DEFENDER_API_ROOT = "https://api.security.microsoft.com/api";

type DefenderFetchOptions = {
  /** Entra tenant GUID to scope the token. */
  tenantGuid: string;
  /** Local tenant row id (slug) for health attribution. */
  ourTenantId: string;
  /** Path relative to API root, e.g. `/indicators` or `/indicators/{id}`. */
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Max retry attempts on 429 / 5xx. Default 3. */
  retries?: number;
};

/**
 * Call the Defender for Endpoint API for a given customer tenant.
 * Behavioural parity with `graphFetch`: per-tenant token via MSAL,
 * 429 + 5xx retry with Retry-After respect, endpoint_health telemetry.
 *
 * Defender's rate limits are stricter than Graph's: 100 calls/minute
 * and 1500/hour for indicator endpoints. The exponential backoff is
 * tuned for that — first retry at ~1s, second at ~2s, third at ~4s.
 */
export async function defenderFetch<T>(
  opts: DefenderFetchOptions,
): Promise<T> {
  const retries = opts.retries ?? 3;
  const endpoint = `defender:${opts.path.split("?")[0]}`;

  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt <= retries) {
    attempt++;
    let token: string;
    try {
      token = await getDefenderTokenForTenant(opts.tenantGuid);
    } catch (err) {
      recordEndpointHealth({
        tenantId: opts.ourTenantId,
        endpoint,
        ok: false,
        throttled: false,
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    let res: Response;
    try {
      res = await fetch(`${DEFENDER_API_ROOT}${opts.path}`, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
    } catch (err) {
      lastErr = err;
      recordEndpointHealth({
        tenantId: opts.ourTenantId,
        endpoint,
        ok: false,
        throttled: false,
        errorMessage: (err as Error).message,
      });
      await sleep(backoffMs(attempt));
      continue;
    }

    if (res.ok) {
      recordEndpointHealth({
        tenantId: opts.ourTenantId,
        endpoint,
        ok: true,
        throttled: false,
      });
      if (res.status === 204) return undefined as unknown as T;
      // Some endpoints (DELETE) return empty 200 / 202. Guard the parse.
      const text = await res.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    }

    const throttled = res.status === 429;
    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : null;
    let bodyText: string | undefined;
    let body: unknown = null;
    try {
      bodyText = await res.text();
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText ?? null;
    }

    recordEndpointHealth({
      tenantId: opts.ourTenantId,
      endpoint,
      ok: false,
      throttled,
      errorMessage: summarize(body, bodyText, res.status),
    });

    const retryable = throttled || (res.status >= 500 && res.status < 600);
    if (retryable && attempt <= retries) {
      const waitMs =
        retryAfterSeconds !== null
          ? retryAfterSeconds * 1000
          : backoffMs(attempt);
      await sleep(waitMs);
      continue;
    }

    throw new GraphError(
      `Defender ${opts.method ?? "GET"} ${opts.path} failed with ${res.status}`,
      {
        status: res.status,
        body,
        throttled,
        retryAfterSeconds,
      },
    );
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("defenderFetch: retries exhausted");
}

function backoffMs(attempt: number): number {
  return Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function summarize(
  body: unknown,
  bodyText: string | undefined,
  status: number,
): string {
  // Defender errors come in two shapes depending on the endpoint:
  //   { error: { code, message, target } }            (newer)
  //   { Code: "...", Message: "..." }                 (legacy)
  // Try both before falling back to raw body.
  const newer = (body as { error?: { message?: string } } | null)?.error
    ?.message;
  if (newer) return newer;
  const legacy = (body as { Message?: string } | null)?.Message;
  if (legacy) return legacy;
  if (
    typeof bodyText === "string" &&
    bodyText.length > 0 &&
    bodyText.length < 500
  ) {
    return bodyText;
  }
  return `HTTP ${status}`;
}
