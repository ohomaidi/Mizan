import "server-only";
import { cookies } from "next/headers";
import {
  createSession,
  deleteSession,
  getSession,
  getUser,
  pruneExpiredSessions,
  touchSession,
  type SessionRow,
  type UserRow,
} from "@/lib/db/users";
import {
  getAuthConfig,
  MAX_SESSION_MINUTES,
} from "@/lib/config/auth-config";

const COOKIE_NAME = "scsc_session";

export async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function writeSessionCookie(
  sessionId: string,
  expiresAt: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export type AuthenticatedUser = {
  user: UserRow;
  session: SessionRow;
};

/**
 * Resolve the current session from the request cookie. Returns null if there
 * is no session, if it has expired, or if the backing user has been disabled.
 * Deletes stale rows on the fly.
 *
 * Also implements the sliding-window extension: whenever the caller is in the
 * second half of their current window, push `expires_at` forward by a fresh
 * `sessionTimeoutMinutes` — capped at `created_at + MAX_SESSION_MINUTES` so
 * we never issue a session that lives longer than the absolute cap. The
 * cookie is re-set with the new expiry so the browser stays in sync.
 */
export async function currentUser(): Promise<AuthenticatedUser | null> {
  const sid = await readSessionCookie();
  if (!sid) return null;
  let session = getSession(sid);
  if (!session) return null;
  const now = Date.now();
  if (new Date(session.expires_at).getTime() < now) {
    deleteSession(sid);
    return null;
  }
  const user = getUser(session.user_id);
  if (!user || user.is_active !== 1) {
    deleteSession(sid);
    return null;
  }

  // Sliding extension — only extend past the midpoint to avoid writing on
  // every single request. `created_at` is written by SQLite as a naive
  // timestamp string; coerce carefully.
  const createdAtMs = new Date(session.created_at.replace(" ", "T") + "Z").getTime();
  const expiresAtMs = new Date(session.expires_at).getTime();
  const elapsedMs = now - createdAtMs;
  const windowMs = expiresAtMs - createdAtMs;
  if (windowMs > 0 && elapsedMs > windowMs / 2) {
    const { sessionTimeoutMinutes } = getAuthConfig();
    const absoluteCapMs = createdAtMs + MAX_SESSION_MINUTES * 60_000;
    const proposedMs = now + sessionTimeoutMinutes * 60_000;
    const newExpiresMs = Math.min(proposedMs, absoluteCapMs);
    if (newExpiresMs > expiresAtMs) {
      const newExpiresAt = new Date(newExpiresMs).toISOString();
      touchSession(sid, newExpiresAt);
      await writeSessionCookie(sid, newExpiresAt);
      session = { ...session, expires_at: newExpiresAt };
    }
  }

  return { user, session };
}

export async function openSession(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<SessionRow> {
  // Cheap housekeeping: roll up expired rows so sessions table doesn't grow forever.
  pruneExpiredSessions();
  const { sessionTimeoutMinutes } = getAuthConfig();
  return createSession(userId, sessionTimeoutMinutes, ip, userAgent);
}

export async function closeCurrentSession(): Promise<void> {
  const sid = await readSessionCookie();
  if (sid) deleteSession(sid);
  await clearSessionCookie();
}
