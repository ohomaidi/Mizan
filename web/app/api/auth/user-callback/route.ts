import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, resolveAppRole } from "@/lib/auth/msal-user";
import {
  adoptPendingUser,
  countAdmins,
  getPendingUserByEmail,
  getUserByOid,
  upsertUser,
} from "@/lib/db/users";
import { openSession, writeSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OIDC callback. Exchanges `code` for an ID token, verifies the `state` value
 * we stashed on /user-login, upserts the user row, opens a session, and
 * redirects to the originally-requested page.
 *
 * Bootstrap: if no admin exists yet, the very first user to log in is
 * promoted to admin regardless of their Entra app-roles. This unblocks fresh
 * installs where the operator hasn't finished role assignments.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const jar = await cookies();
  const expectedState = jar.get("scsc_oauth_state")?.value;
  const nextPath = jar.get("scsc_oauth_next")?.value || "/";
  jar.delete("scsc_oauth_state");
  jar.delete("scsc_oauth_next");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error)}&reason=${encodeURIComponent(errorDesc ?? "")}`,
        url,
      ),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_params", url));
  }
  if (!expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", url));
  }

  let claims: Awaited<ReturnType<typeof exchangeCodeForToken>>;
  try {
    claims = await exchangeCodeForToken(code);
  } catch (err) {
    return NextResponse.redirect(
      new URL(
        `/login?error=token_exchange&reason=${encodeURIComponent((err as Error).message)}`,
        url,
      ),
    );
  }

  // Resolve the user row in priority order:
  //   1. Existing row keyed on this Entra OID → just bump last_login_at.
  //   2. Pending invite for this email (admin pre-seeded a role) → adopt it,
  //      keep the invited role, link to the real OID.
  //   3. Fresh user → provision with either the Entra app-role claim, the
  //      first-user-becomes-admin bootstrap, or the config defaultRole.
  let user = getUserByOid(claims.oid);
  if (!user) {
    const pending = getPendingUserByEmail(claims.email);
    if (pending) {
      user = adoptPendingUser(
        pending.id,
        claims.oid,
        claims.tenantId,
        claims.displayName,
      );
    } else {
      const hasEntraRole = claims.roles.length > 0;
      const needsBootstrapAdmin = !hasEntraRole && countAdmins() === 0;
      const role = hasEntraRole
        ? resolveAppRole(claims.roles)
        : needsBootstrapAdmin
          ? "admin"
          : resolveAppRole(claims.roles);
      user = upsertUser({
        entra_oid: claims.oid,
        tenant_id: claims.tenantId,
        email: claims.email,
        display_name: claims.displayName,
        role,
      });
    }
  } else {
    // Keep name/email fresh on repeat logins.
    user = upsertUser({
      entra_oid: claims.oid,
      tenant_id: claims.tenantId,
      email: claims.email,
      display_name: claims.displayName,
      role: user.role,
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  const session = await openSession(user.id, ip, ua);
  await writeSessionCookie(session.id, session.expires_at);

  return NextResponse.redirect(new URL(nextPath, url));
}
