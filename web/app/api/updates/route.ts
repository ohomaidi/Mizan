import { NextResponse } from "next/server";
import { APP_VERSION, GITHUB_REPO, CONTAINER_IMAGE } from "@/lib/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Expose the currently-running version + the latest release published on
 * GitHub so Settings → About can show an operator whether an upgrade is
 * available without requiring them to poll the repo themselves.
 *
 * GitHub's unauthenticated API allows 60 requests/hour per IP, which is
 * plenty for a handful of operators — but every container replica shares
 * that budget. Cache the release payload in-process for an hour so a busy
 * tab that re-checks every few seconds doesn't burn through the limit.
 *
 * `?force=1` bypasses the cache (manual "Check now" button in the UI).
 */

type GithubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
};

type UpdateInfo = {
  current: string;
  latest: string | null;
  upToDate: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  notes: string | null;
  containerImage: string;
  fetchedAt: string;
};

let cache: { at: number; value: UpdateInfo } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function compareSemver(a: string, b: string): number {
  const clean = (v: string) => v.replace(/^v/i, "").split("-")[0];
  const pa = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = clean(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

async function fetchLatest(): Promise<UpdateInfo> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `Mizan/${APP_VERSION}`,
      },
      // Next fetch cache is not what we want here — we manage freshness ourselves.
      cache: "no-store",
    },
  );

  if (!res.ok) {
    // Non-200 (403 rate-limited, 404 no releases, network issue): return a
    // degraded payload rather than 500. UI shows the current version and
    // a soft "couldn't check" note.
    return {
      current: APP_VERSION,
      latest: null,
      upToDate: true, // treat as up-to-date so we don't nag
      publishedAt: null,
      releaseUrl: null,
      notes: null,
      containerImage: CONTAINER_IMAGE,
      fetchedAt: new Date().toISOString(),
    };
  }

  const body = (await res.json()) as GithubRelease;
  const latest = (body.tag_name ?? "").replace(/^v/i, "") || null;
  const upToDate = latest ? compareSemver(APP_VERSION, latest) >= 0 : true;

  return {
    current: APP_VERSION,
    latest,
    upToDate,
    publishedAt: body.published_at ?? null,
    releaseUrl: body.html_url ?? null,
    notes: body.body ?? null,
    containerImage: CONTAINER_IMAGE,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = Date.now();

  if (!force && cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.value, {
      headers: { "X-Updates-Cache": "hit" },
    });
  }

  try {
    const value = await fetchLatest();
    cache = { at: now, value };
    return NextResponse.json(value, {
      headers: { "X-Updates-Cache": force ? "forced" : "miss" },
    });
  } catch (err) {
    // Network error, DNS failure, etc. — same graceful degradation.
    const fallback: UpdateInfo = {
      current: APP_VERSION,
      latest: null,
      upToDate: true,
      publishedAt: null,
      releaseUrl: null,
      notes: null,
      containerImage: CONTAINER_IMAGE,
      fetchedAt: new Date().toISOString(),
    };
    cache = { at: now, value: fallback };
    return NextResponse.json(
      { ...fallback, error: (err as Error).message },
      { status: 200, headers: { "X-Updates-Cache": "error" } },
    );
  }
}
