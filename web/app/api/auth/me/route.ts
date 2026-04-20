import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { getAuthConfig, isAuthEnforced } from "@/lib/config/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns who the current request is authenticated as, plus two booleans the
 * UI uses to decide what CTA to show:
 *   - `configured`: Entra app creds are stored (Sign-in should work) but the
 *                   admin may still be keeping the dashboard open by leaving
 *                   enforcement off. UserMenu surfaces a "Sign in" button.
 *   - `enforced`:   unauthenticated requests are being bounced to /login. UI
 *                   switches from "SA demo avatar" to the real user menu.
 */
export async function GET() {
  const cfg = getAuthConfig();
  const configured = cfg.clientId.length > 0 && cfg.clientSecret.length > 0;
  const enforced = isAuthEnforced();
  const current = await currentUser();
  if (!current) {
    return NextResponse.json({
      authenticated: false,
      configured,
      enforced,
      user: null,
    });
  }
  return NextResponse.json({
    authenticated: true,
    configured,
    enforced,
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
