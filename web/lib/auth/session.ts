import "server-only";
import { cookies } from "next/headers";
import {
  createSession,
  deleteSession,
  getSession,
  getUser,
  pruneExpiredSessions,
  type SessionRow,
  type UserRow,
} from "@/lib/db/users";
import { getAuthConfig } from "@/lib/config/auth-config";

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
 */
export async function currentUser(): Promise<AuthenticatedUser | null> {
  const sid = await readSessionCookie();
  if (!sid) return null;
  const session = getSession(sid);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    deleteSession(sid);
    return null;
  }
  const user = getUser(session.user_id);
  if (!user || user.is_active !== 1) {
    deleteSession(sid);
    return null;
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
