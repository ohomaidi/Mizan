import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { getAuthConfig, isDemoMode } from "@/lib/config/auth-config";
import { getDeploymentMode } from "@/lib/config/deployment-mode";
import { isDirectiveConfigured } from "@/lib/config/directive-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns who the current request is authenticated as, plus four booleans/enums
 * the UI uses to decide what CTA to show:
 *   - `configured`:      Entra user-auth app creds are stored — sign-in can work.
 *   - `demoMode`:        MIZAN_DEMO_MODE=true. UI shows a "Demo mode" pill.
 *   - `deploymentMode`:  "observation" (default) or "directive". Env-gated.
 *                        Drives conditional UI: /directive nav item, onboarding
 *                        wizard mode chooser, per-entity consent-mode badge.
 *   - `directiveReady`:  deployment is `directive` AND the Directive Graph app
 *                        has creds stored. If false in a directive deployment,
 *                        the Center admin still needs to provision the second
 *                        Entra app via Settings.
 */
export async function GET() {
  const cfg = getAuthConfig();
  const configured = cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
  const demoMode = isDemoMode();
  const deploymentMode = getDeploymentMode();
  const directiveReady = deploymentMode === "directive" && isDirectiveConfigured();
  const current = await currentUser();
  if (!current) {
    return NextResponse.json({
      authenticated: false,
      configured,
      demoMode,
      deploymentMode,
      directiveReady,
      user: null,
    });
  }
  return NextResponse.json({
    authenticated: true,
    configured,
    demoMode,
    deploymentMode,
    directiveReady,
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
