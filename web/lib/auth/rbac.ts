import "server-only";
import { NextResponse } from "next/server";
import { currentUser, type AuthenticatedUser } from "./session";
import { isDemoMode, type Role } from "@/lib/config/auth-config";
import { countRealAdmins } from "@/lib/db/users";

const ROLE_RANK: Record<Role, number> = { viewer: 0, analyst: 1, admin: 2 };

export function satisfiesRole(have: Role, need: Role): boolean {
  return ROLE_RANK[have] >= ROLE_RANK[need];
}

/**
 * Bootstrap escape hatch. Before the first real admin has signed in, leave
 * the dashboard open so the operator can reach /setup + finish the wizard.
 * "Real" here excludes pending-invite rows (entra_oid starts with "pending:")
 * so an admin pre-seeding invites doesn't accidentally slam the door before
 * anyone has actually authenticated.
 *
 * Closes permanently the moment the first real admin lands in the users table.
 */
function inBootstrapWindow(): boolean {
  return countRealAdmins() === 0;
}

/**
 * Page-level enforcement. Returns the authenticated user if everything is in
 * order; otherwise returns a `redirectTo` string that the calling server
 * component should pass to next/navigation.redirect(). In demo mode or during
 * the bootstrap window we return `{ kind: "ok", user: null }` so pages still
 * render without a real session.
 */
export async function requireUser(
  minRole: Role = "viewer",
): Promise<
  | { kind: "ok"; user: AuthenticatedUser["user"] | null }
  | { kind: "redirect"; to: string }
> {
  if (isDemoMode()) return { kind: "ok", user: null };
  if (inBootstrapWindow()) return { kind: "ok", user: null };
  const current = await currentUser();
  if (!current) return { kind: "redirect", to: "/login" };
  if (!satisfiesRole(current.user.role, minRole)) {
    return { kind: "redirect", to: "/login?error=forbidden" };
  }
  return { kind: "ok", user: current.user };
}

/**
 * API-route enforcement. Returns either `{ ok: true, user }` (proceed with the
 * request) or `{ ok: false, response }` — a NextResponse the route should
 * return as-is. Same bypasses as requireUser: demo mode + empty-admins
 * bootstrap window return `{ ok: true, user: null }`.
 */
export async function apiRequireRole(minRole: Role = "viewer"): Promise<
  | { ok: true; user: AuthenticatedUser["user"] | null }
  | { ok: false; response: NextResponse }
> {
  if (isDemoMode()) return { ok: true, user: null };
  if (inBootstrapWindow()) return { ok: true, user: null };
  const current = await currentUser();
  if (!current) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  if (!satisfiesRole(current.user.role, minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "forbidden", need: minRole, have: current.user.role },
        { status: 403 },
      ),
    };
  }
  return { ok: true, user: current.user };
}
