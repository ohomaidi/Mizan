import "server-only";

/**
 * Deployment mode — immutable, set once at install time via `MIZAN_DEPLOYMENT_MODE`.
 *
 *   observation  (default)  — read-only across every consented entity. The SCSC
 *                             pattern. No directive UI, no write-app provisioning
 *                             step, no /directive page in the sidebar.
 *   directive                — read + write. The DESC pattern. Two Entra apps
 *                             (Signals for reads, Directive for writes), per-entity
 *                             consent-mode chooser, /directive top-level page,
 *                             directive-variant onboarding letter PDF.
 *
 * Changing the mode means changing the env var and restarting the process.
 * There is deliberately NO DB toggle, NO UI switch, NO admin-click path — the
 * env var is the single source of truth so the deployment-mode story matches
 * what shows up in the Azure Container App / LaunchAgent environment. Matches
 * the `MIZAN_DEMO_MODE` pattern already in use.
 *
 * Read once at module load (cached) so the value does not mutate mid-request.
 */

export type DeploymentMode = "observation" | "directive";

const RAW = (process.env.MIZAN_DEPLOYMENT_MODE ?? "observation").toLowerCase().trim();
const RESOLVED: DeploymentMode = RAW === "directive" ? "directive" : "observation";

export function getDeploymentMode(): DeploymentMode {
  return RESOLVED;
}

export function isDirectiveDeployment(): boolean {
  return RESOLVED === "directive";
}

export function isObservationDeployment(): boolean {
  return RESOLVED === "observation";
}
