import { isExecutiveDeployment } from "@/lib/config/deployment-kind";
import { SettingsClient } from "./SettingsClient";

/**
 * Server shim for the Settings UI. Resolves the deployment kind
 * server-side so the client renders the right tab IA on the very
 * first paint — Executive deployments led by the new Organization
 * tab, Council deployments led by Entities.
 *
 * Without this, the page would briefly flash the Council tabs on
 * an Executive boot before the client whoami() round-trip
 * completed. Cheap to resolve here; `getDeploymentKind()` is just
 * a single `app_config` lookup.
 *
 * v2.6.3.
 */
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const kind = isExecutiveDeployment() ? "executive" : "council";
  return <SettingsClient initialDeploymentKind={kind} />;
}
