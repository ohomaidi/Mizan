import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { getAuthConfig, isDemoMode } from "@/lib/config/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns who the current request is authenticated as, plus two booleans the
 * UI uses to decide what CTA to show:
 *   - `configured`: Entra app creds are stored — Sign-in button can work.
 *   - `demoMode`:   deployment is running with MIZAN_DEMO_MODE=true. UI shows
 *                   a "Demo mode" pill instead of the user menu, and the
 *                   dashboard is open to everyone regardless of auth state.
 */
export async function GET() {
  const cfg = getAuthConfig();
  const configured = cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
  const demoMode = isDemoMode();
  const current = await currentUser();
  if (!current) {
    return NextResponse.json({
      authenticated: false,
      configured,
      demoMode,
      user: null,
    });
  }
  return NextResponse.json({
    authenticated: true,
    configured,
    demoMode,
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
