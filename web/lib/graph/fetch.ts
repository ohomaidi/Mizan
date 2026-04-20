import "server-only";
import { getAppTokenForTenant } from "./msal";
import { recordEndpointHealth } from "@/lib/db/signals";

const GRAPH_V1 = "https://graph.microsoft.com/v1.0";
const GRAPH_BETA = "https://graph.microsoft.com/beta";

export class GraphError extends Error {
  status: number;
  body: unknown;
  throttled: boolean;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    opts: {
      status: number;
      body: unknown;
      throttled?: boolean;
      retryAfterSeconds?: number | null;
    },
  ) {
    super(message);
    this.status = opts.status;
    this.body = opts.body;
    this.throttled = Boolean(opts.throttled);
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
  }
}

type FetchOptions = {
  /** Entra tenant GUID to scope the token. */
  tenantGuid: string;
  /** Local tenant row id (slug) for health attribution. */
  ourTenantId: string;
  /** Path relative to Graph root, e.g. `/security/secureScores?$top=1`. */
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  version?: "v1.0" | "beta";
  /** Max retry attempts on 429 / 5xx. Default 3. */
  retries?: number;
};

/**
 * Graph HTTP call with:
 *  - per-tenant app-only token
 *  - 429 Retry-After respect + exponential backoff
 *  - endpoint_health telemetry write
 */
export async function graphFetch<T>(opts: FetchOptions): Promise<T> {
  const base = opts.version === "beta" ? GRAPH_BETA : GRAPH_V1;
  const retries = opts.retries ?? 3;
  const endpoint = opts.path.split("?")[0];

  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt <= retries) {
    attempt++;
    let token: string;
    try {
      token = await getAppTokenForTenant(opts.tenantGuid);
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
      res = await fetch(`${base}${opts.path}`, {
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
      return (await res.json()) as T;
    }

    // Error response.
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
        retryAfterSeconds !== null ? retryAfterSeconds * 1000 : backoffMs(attempt);
      await sleep(waitMs);
      continue;
    }

    throw new GraphError(
      `Graph ${opts.method ?? "GET"} ${opts.path} failed with ${res.status}`,
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
    : new Error("graphFetch: retries exhausted");
}

/** Follow @odata.nextLink and concatenate `value` arrays. */
export async function graphFetchAll<T>(
  opts: Omit<FetchOptions, "body" | "method"> & { path: string },
  maxPages = 10,
): Promise<T[]> {
  const all: T[] = [];
  let nextPath: string | null = opts.path;
  let pages = 0;
  while (nextPath && pages < maxPages) {
    pages++;
    const pageRes: { value: T[]; "@odata.nextLink"?: string } = await graphFetch<{
      value: T[];
      "@odata.nextLink"?: string;
    }>({
      ...opts,
      path: nextPath,
    });
    if (Array.isArray(pageRes.value)) all.push(...pageRes.value);
    const next = pageRes["@odata.nextLink"];
    if (!next) break;
    nextPath = next.replace(/^https:\/\/graph\.microsoft\.com\/(v1\.0|beta)/, "");
  }
  return all;
}

function backoffMs(attempt: number): number {
  return Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function summarize(body: unknown, bodyText: string | undefined, status: number): string {
  const inner = (body as { error?: { message?: string } } | null)?.error?.message;
  if (inner) return inner;
  if (typeof bodyText === "string" && bodyText.length > 0 && bodyText.length < 500) {
    return bodyText;
  }
  return `HTTP ${status}`;
}
