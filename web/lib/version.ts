import pkg from "../package.json";

/**
 * Single source of truth for the currently-running Mizan version.
 *
 * Bumped in lockstep with the git tag on every release. CI (release.yml)
 * verifies that the tag matches this value so the dashboard never surfaces
 * a stale version after a release.
 *
 * Used by:
 *   - `/api/updates` — compared against the latest GitHub release
 *   - Settings → About panel — displayed to operators
 *   - Anywhere else that needs the build identity for diagnostics
 */
export const APP_VERSION: string = pkg.version;

/** GitHub org/repo we pull release metadata from. */
export const GITHUB_REPO = "ohomaidi/Mizan";

/** Container image name used in Azure upgrade commands. */
export const CONTAINER_IMAGE = "ghcr.io/ohomaidi/mizan";
