import "server-only";
import { NextResponse } from "next/server";
import { currentUser, type AuthenticatedUser } from "./session";
import { isAuthEnforced, type Role } from "@/lib/config/auth-config";
import { listUsers } from "@/lib/db/users";

const ROLE_RANK: Record<Role, number> = { viewer: 0, analyst: 1, admin: 2 };

export function satisfiesRole(have: Role, need: Role): boolean {
  return ROLE_RANK[have] >= ROLE_RANK[need];
}

/**
 * Bootstrap escape hatch. When auth is enforced but the users table is empty,
 * privileged endpoints stay open so the operator can recover if enforce=true
 * was flipped before login worked. The window closes the moment the first
 * user row lands (either from a successful OIDC callback, or a manual INSERT).
 */
function inBootstrapWindow(): boolean {
  return listUsers().length === 0;
}

/**
 * Page-level enforcement. Returns the authenticated user if everything is in
 * order; otherwise returns a `redirectTo` string that the calling server
 * component should pass to next/navigation.redirect(). When auth is NOT
 * enforced we return a synthetic "anonymous admin" so pages still render on
 * demos + fresh installs before auth is configured.
 */
export async function requireUser(
  minRole: Role = "viewer",
): Promise<
  | { kind: "ok"; user: AuthenticatedUser["user"] | null }
  | { kind: "redirect"; to: string }
> {
  if (!isAuthEnforced()) {
    return { kind: "ok", user: null };
  }
  if (inBootstrapWindow()) {
    return { kind: "ok", user: null };
  }
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
 * return as-is. When auth is NOT enforced we allow the call through with a
 * null user, mirroring the page-level behavior.
 */
export async function apiRequireRole(minRole: Role = "viewer"): Promise<
  | { ok: true; user: AuthenticatedUser["user"] | null }
  | { ok: false; response: NextResponse }
> {
  if (!isAuthEnforced()) {
    return { ok: true, user: null };
  }
  if (inBootstrapWindow()) {
    return { ok: true, user: null };
  }
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
