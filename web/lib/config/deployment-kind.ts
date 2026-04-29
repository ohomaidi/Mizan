import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * Deployment kind — picks WHO this dashboard is for. Set once at /setup
 * wizard time and immutable after, mirroring `deploymentMode`. Two
 * independent dimensions:
 *
 *   - `deploymentKind` (this file) decides cardinality: regulator
 *     watching N entities (council) vs single-org CISO dashboard
 *     (executive).
 *   - `deploymentMode` (deployment-mode.ts) decides read vs read+write:
 *     observation (read-only) vs directive (read + push policies).
 *
 * Valid combinations:
 *   council + observation   — SCSC: regulator, read-only
 *   council + directive     — DESC: regulator, push policies
 *   executive + observation — Single-org CISO, read-only
 *   executive + directive   — Single-org CISO, push policies (e.g. DA)
 *
 * Storage:
 *   1. DB (app_config key "deployment.kind") — authoritative.
 *   2. MIZAN_DEPLOYMENT_KIND env var — bootstrap fallback before /setup
 *      completes, used by Mac Mini demo LaunchAgents to drop straight
 *      into a preset kind without running the wizard.
 *   3. Default: "council" — preserves backward compat for every
 *      existing deployment.
 *
 * Locked after first write. The product contract is "pick at install
 * time, stay there"; changing it would require wiping the DB and
 * redoing onboarding.
 *
 * Decided 2026-04-29; see docs/16-executive-mode-roadmap.md.
 */

export type DeploymentKind = "council" | "executive";

const KEY = "deployment.kind";

type Stored = { kind?: DeploymentKind; setAt?: string };

function readEnvFallback(): DeploymentKind {
  const raw = (process.env.MIZAN_DEPLOYMENT_KIND ?? "").toLowerCase().trim();
  return raw === "executive" ? "executive" : "council";
}

export function getDeploymentKind(): DeploymentKind {
  const stored = readConfig<Stored>(KEY);
  if (stored?.kind === "executive" || stored?.kind === "council") {
    return stored.kind;
  }
  return readEnvFallback();
}

export function isExecutiveDeployment(): boolean {
  return getDeploymentKind() === "executive";
}

export function isCouncilDeployment(): boolean {
  return getDeploymentKind() === "council";
}

/**
 * Write the deployment kind. Called exactly once, during the /setup
 * wizard. Idempotent on the first write; subsequent writes are
 * rejected by `isDeploymentKindLocked()` in the route handler so no UI
 * path can flip it.
 */
export function setDeploymentKind(kind: DeploymentKind): void {
  writeConfig(KEY, {
    kind,
    setAt: new Date().toISOString(),
  });
}

export function isDeploymentKindLocked(): boolean {
  const stored = readConfig<Stored>(KEY);
  return stored?.kind === "executive" || stored?.kind === "council";
}
