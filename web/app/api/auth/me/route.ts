import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { getAuthConfig, isDemoMode } from "@/lib/config/auth-config";
import { getDeploymentMode } from "@/lib/config/deployment-mode";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns who the current request is authenticated as, plus three flags the
 * UI uses to decide what to show:
 *
 *   - `configured`:      Entra user-auth app creds are stored — sign-in works.
 *   - `demoMode`:        MIZAN_DEMO_MODE=true. Auth is bypassed; UI shows a
 *                        "Demo mode" pill.
 *   - `deploymentMode`:  "observation" (read-only deployment) or "directive"
 *                        (read + write). Set once at /setup, stored in DB,
 *                        immutable after. Env var MIZAN_DEPLOYMENT_MODE is a
 *                        bootstrap fallback before setup completes.
 *   - `graphAppReady`:   the Graph app registration (Signals / observation
 *                        reads on both deployment modes; Signals + writes
 *                        on directive) has credentials stored. False before
 *                        the /setup wizard's Graph-app step finishes.
 */
export async function GET() {
  const cfg = getAuthConfig();
  const configured = cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
  const demoMode = isDemoMode();
  const deploymentMode = getDeploymentMode();
  const graphAppReady = config.isAzureConfigured;
  const current = await currentUser();
  if (!current) {
    return NextResponse.json({
      authenticated: false,
      configured,
      demoMode,
      deploymentMode,
      graphAppReady,
      user: null,
    });
  }
  return NextResponse.json({
    authenticated: true,
    configured,
    demoMode,
    deploymentMode,
    graphAppReady,
    user: {
      id: current.user.id,
      email: current.user.email,
      displayName: current.user.display_name,
      role: current.user.role,
      tenantId: current.user.tenant_id,
    },
    session: {
      expiresAt: current.session.expires_at,
    },
  });
}
