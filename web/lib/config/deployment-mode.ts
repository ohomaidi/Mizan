import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

/**
 * Deployment mode — chosen once at /setup wizard time and immutable after.
 *
 *   observation  — read-only. The single Graph app registration is provisioned
 *                  with `.Read.All` scopes only. Directive UI surfaces
 *                  (the /directive page, onboarding-wizard mode chooser,
 *                  per-entity directive badge) are absent. This is the
 *                  SCSC-style posture.
 *   directive    — read + write. The Graph app is provisioned with both
 *                  `.Read.All` and `.ReadWrite.All` scopes. Per-entity
 *                  onboarding asks whether the entity is subject to
 *                  directive actions (yes/no); the flag is stored on
 *                  tenants.consent_mode and enforced at every Mizan write
 *                  call. This is the DESC-style posture.
 *
 * Storage:
 *   1. DB (app_config key "deployment.mode") — authoritative, written by the
 *      /setup wizard's deployment-mode step.
 *   2. MIZAN_DEPLOYMENT_MODE env var — bootstrap fallback before /setup
 *      completes, and used by the Mac Mini demo LaunchAgents to drop straight
 *      into a preset mode without running the wizard.
 *   3. Default: "observation" — safe for a fresh install.
 *
 * Not UI-editable after /setup completes. The product contract is "pick at
 * install time, stay there"; changing it means wiping the DB and redoing
 * onboarding.
 */

export type DeploymentMode = "observation" | "directive";

const KEY = "deployment.mode";

type Stored = { mode?: DeploymentMode; setAt?: string };

function readEnvFallback(): DeploymentMode {
  const raw = (process.env.MIZAN_DEPLOYMENT_MODE ?? "").toLowerCase().trim();
  return raw === "directive" ? "directive" : "observation";
}

export function getDeploymentMode(): DeploymentMode {
  const stored = readConfig<Stored>(KEY);
  if (stored?.mode === "directive" || stored?.mode === "observation") {
    return stored.mode;
  }
  return readEnvFallback();
}

export function isDirectiveDeployment(): boolean {
  return getDeploymentMode() === "directive";
}

export function isObservationDeployment(): boolean {
  return getDeploymentMode() === "observation";
}

/**
 * Write the deployment mode. Called exactly once, during the /setup wizard.
 * Idempotent on the first write; subsequent writes are rejected by
 * `isDeploymentModeLocked()` in the route handler so no UI path can flip it.
 */
export function setDeploymentMode(mode: DeploymentMode): void {
  writeConfig(KEY, {
    mode,
    setAt: new Date().toISOString(),
  });
}

export function isDeploymentModeLocked(): boolean {
  const stored = readConfig<Stored>(KEY);
  return stored?.mode === "directive" || stored?.mode === "observation";
}
