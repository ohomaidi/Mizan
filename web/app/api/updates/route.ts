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

type Runtime = "aca" | "mac" | "windows" | "docker" | "unknown";

type UpdateInfo = {
  current: string;
  latest: string | null;
  upToDate: boolean;
  /**
   * Set when the GitHub fetch failed (rate-limit, network, no releases
   * yet). The UI must treat this as "unknown" rather than "up to date"
   * so the operator isn't told they're current when we couldn't actually
   * check. Null when the fetch succeeded.
   */
  checkError: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
  notes: string | null;
  containerImage: string;
  fetchedAt: string;
  /**
   * Detected hosting environment (v2.5.6+, extended in v2.5.8). Drives
   * the upgrade UX:
   *   - "aca"     → ACA managed-identity auto-upgrade button is shown.
   *                 Detected via the `CONTAINER_APP_NAME` env var that
   *                 Azure injects on every container at runtime.
   *   - "mac"     → "Download Mizan-X.Y.Z.pkg" button. Detected via the
   *                 `MIZAN_RUNTIME=mac` env var the LaunchAgent
   *                 installed by mac-build.sh sets.
   *   - "windows" → "Download Mizan-X.Y.Z.msi" button. Detected via
   *                 `MIZAN_RUNTIME=windows` from the Windows Service
   *                 wrapper installed by windows-build.ps1.
   *   - "docker"  → manual `docker pull + recreate` snippet (one-click
   *                 can't work without exposing the docker socket).
   *   - "unknown" → fallback. Treated like "docker" by the UI.
   */
  runtime: Runtime;
  /**
   * Direct asset URL on the latest GitHub Release for the platform's
   * installer (.pkg on mac, .msi on windows). Null when the platform
   * doesn't ship a native installer (aca, docker, unknown) or when the
   * GitHub Release fetch failed.
   */
  installerUrl: string | null;
  /**
   * True when the dashboard has everything it needs to upgrade itself
   * in-place (managed identity enabled + resource id injected). Drives
   * whether the upgrade button is interactive vs a "configure auto-
   * upgrade" callout. Pre-conditions are documented in
   * docs/15-self-upgrade.md.
   */
  selfUpgradeReady: boolean;
};

function detectRuntime(): Runtime {
  // Explicit env override always wins. Both the Mac LaunchAgent and the
  // Windows Service wrapper set MIZAN_RUNTIME at install time, which is
  // more reliable than process.platform alone (a Mac laptop running the
  // image inside Docker would still report platform=darwin but is
  // really a Docker install). Only mac/windows are honoured here —
  // forcing "aca" via env would skip the safety checks below.
  const override = process.env.MIZAN_RUNTIME?.trim().toLowerCase();
  if (override === "mac" || override === "windows") return override;

  // ACA detection is independent — Azure injects CONTAINER_APP_NAME on
  // every container regardless of any operator-set env vars.
  if (process.env.CONTAINER_APP_NAME) return "aca";

  // Fallback: trust process.platform on installs that don't set the
  // explicit MIZAN_RUNTIME marker (older mac/windows installers). Linux
  // outside ACA is treated as Docker — the most common case.
  if (process.platform === "darwin") return "mac";
  if (process.platform === "win32") return "windows";
  return "docker";
}

function selfUpgradeReady(rt: Runtime): boolean {
  if (rt !== "aca") return false;
  // Resource ID must be injected at deploy time (Bicep template). System-
  // assigned identity must be enabled (IDENTITY_ENDPOINT set by ACA when
  // identity is on).
  return Boolean(
    process.env.MIZAN_AZURE_RESOURCE_ID && process.env.IDENTITY_ENDPOINT,
  );
}

/**
 * Build the direct download URL for the platform's native installer
 * asset on the matching GitHub Release. The release.yml workflow names
 * assets `mizan-<version>.pkg` and `mizan-<version>.msi`; we just
 * compute the URL — GitHub's release-asset endpoint is stable and
 * doesn't require a HEAD check before linking.
 *
 * Returns null when the platform doesn't have an installer (aca, docker,
 * unknown) or when we don't know what the latest version is.
 */
function buildInstallerUrl(
  rt: Runtime,
  latestVersion: string | null,
): string | null {
  if (!latestVersion) return null;
  const tag = `v${latestVersion}`;
  const base = `https://github.com/${GITHUB_REPO}/releases/download/${tag}`;
  if (rt === "mac") return `${base}/mizan-${latestVersion}.pkg`;
  if (rt === "windows") return `${base}/mizan-${latestVersion}.msi`;
  return null;
}

let cache: { at: number; value: UpdateInfo } | null = null;
// Successful fetches stay cached for 1 hour; failures (rate-limit,
// network) only stay cached for 5 minutes so a transient block doesn't
// lock the dashboard out of seeing real updates for an hour.
const CACHE_TTL_OK_MS = 60 * 60 * 1000;
const CACHE_TTL_ERR_MS = 5 * 60 * 1000;

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
  // Optional auth — operators on a tight rate-limit (shared NAT, etc.)
  // can set GITHUB_TOKEN to a personal access token with public_repo
  // scope. Authenticated requests get 5,000/hour vs 60/hour
  // unauthenticated, which is plenty for a small operator team that
  // pokes the About panel a handful of times per day.
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": `Mizan/${APP_VERSION}`,
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    {
      headers,
      // Next fetch cache is not what we want here — we manage freshness ourselves.
      cache: "no-store",
    },
  );

  const runtime = detectRuntime();
  const ready = selfUpgradeReady(runtime);

  if (!res.ok) {
    // Non-200 (403 rate-limited, 404 no releases, network issue): the UI
    // shows the current version + a "couldn't check" pill. We do NOT
    // claim upToDate because we genuinely don't know — that misled
    // operators on rate-limited boxes into thinking they were current
    // when in fact a real release was available.
    const reason =
      res.status === 403
        ? "GitHub API rate limit reached. The dashboard will retry shortly. Set GITHUB_TOKEN env var on the server for higher limits."
        : res.status === 404
          ? "No GitHub Releases published yet."
          : `GitHub returned HTTP ${res.status}.`;
    return {
      current: APP_VERSION,
      latest: null,
      upToDate: false,
      checkError: reason,
      publishedAt: null,
      releaseUrl: null,
      notes: null,
      containerImage: CONTAINER_IMAGE,
      fetchedAt: new Date().toISOString(),
      runtime,
      selfUpgradeReady: ready,
      installerUrl: null,
    };
  }

  const body = (await res.json()) as GithubRelease;
  const latest = (body.tag_name ?? "").replace(/^v/i, "") || null;
  const upToDate = latest ? compareSemver(APP_VERSION, latest) >= 0 : true;

  return {
    current: APP_VERSION,
    latest,
    upToDate,
    checkError: null,
    publishedAt: body.published_at ?? null,
    releaseUrl: body.html_url ?? null,
    notes: body.body ?? null,
    containerImage: CONTAINER_IMAGE,
    fetchedAt: new Date().toISOString(),
    runtime,
    selfUpgradeReady: ready,
    installerUrl: buildInstallerUrl(runtime, latest),
  };
}

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = Date.now();

  // Pick the right TTL based on whether the cached value was a success
  // or a failure: success-1h, failure-5min. This stops a transient
  // rate-limit from masking a real release for a full hour.
  if (!force && cache) {
    const ttl =
      cache.value.checkError === null ? CACHE_TTL_OK_MS : CACHE_TTL_ERR_MS;
    if (now - cache.at < ttl) {
      return NextResponse.json(cache.value, {
        headers: { "X-Updates-Cache": "hit" },
      });
    }
  }

  try {
    const value = await fetchLatest();
    cache = { at: now, value };
    return NextResponse.json(value, {
      headers: { "X-Updates-Cache": force ? "forced" : "miss" },
    });
  } catch (err) {
    // Network error, DNS failure, fetch threw. Same graceful degradation
    // as a non-200, with `checkError` populated so the UI doesn't claim
    // up-to-date and the operator can see *why* the check failed.
    const runtime = detectRuntime();
    const fallback: UpdateInfo = {
      current: APP_VERSION,
      latest: null,
      upToDate: false,
      checkError: `Could not reach GitHub: ${(err as Error).message}`,
      publishedAt: null,
      releaseUrl: null,
      notes: null,
      containerImage: CONTAINER_IMAGE,
      fetchedAt: new Date().toISOString(),
      runtime,
      selfUpgradeReady: selfUpgradeReady(runtime),
      installerUrl: null,
    };
    cache = { at: now, value: fallback };
    return NextResponse.json(fallback, {
      status: 200,
      headers: { "X-Updates-Cache": "error" },
    });
  }
}
