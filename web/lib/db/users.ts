import "server-only";
import crypto from "node:crypto";
import { getDb } from "./client";
import type { Role } from "@/lib/config/auth-config";

export type UserRow = {
  id: string;
  entra_oid: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: Role;
  is_active: 0 | 1;
  created_at: string;
  last_login_at: string | null;
};

export type SessionRow = {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
};

export function getUserByOid(oid: string): UserRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM users WHERE entra_oid = ?")
      .get(oid) as UserRow | undefined) ?? null
  );
}

/**
 * Find a pending-invite row previously created by an admin (pre-seeded with
 * email + role before the user's first login). Used by the OIDC callback to
 * upgrade the row in place once the real Entra OID arrives.
 */
export function getPendingUserByEmail(email: string): UserRow | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND entra_oid LIKE 'pending:%' LIMIT 1",
      )
      .get(email) as UserRow | undefined) ?? null
  );
}

export function adoptPendingUser(
  pendingId: string,
  realOid: string,
  tenantId: string,
  displayName: string,
): UserRow {
  getDb()
    .prepare(
      `UPDATE users
         SET entra_oid = @realOid,
             tenant_id = @tenantId,
             display_name = @displayName,
             last_login_at = datetime('now')
       WHERE id = @pendingId`,
    )
    .run({ pendingId, realOid, tenantId, displayName });
  return getUser(pendingId)!;
}

export function getUser(id: string): UserRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as UserRow | undefined) ?? null
  );
}

export function listUsers(): UserRow[] {
  return getDb()
    .prepare("SELECT * FROM users ORDER BY display_name ASC")
    .all() as UserRow[];
}

export function countAdmins(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1")
    .get() as { n: number };
  return row.n;
}

export type UserUpsertInput = {
  entra_oid: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: Role;
};

/** Insert-or-update on entra_oid. Returns the stored row. */
export function upsertUser(input: UserUpsertInput): UserRow {
  const existing = getUserByOid(input.entra_oid);
  if (existing) {
    getDb()
      .prepare(
        `UPDATE users
           SET email = @email,
               display_name = @display_name,
               tenant_id = @tenant_id,
               last_login_at = datetime('now')
         WHERE entra_oid = @entra_oid`,
      )
      .run(input);
    return getUserByOid(input.entra_oid)!;
  }
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO users (id, entra_oid, tenant_id, email, display_name, role, last_login_at)
       VALUES (@id, @entra_oid, @tenant_id, @email, @display_name, @role, datetime('now'))`,
    )
    .run({ id, ...input });
  return getUser(id)!;
}

export function setUserRole(id: string, role: Role): void {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function setUserActive(id: string, active: boolean): void {
  getDb().prepare("UPDATE users SET is_active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function deleteUser(id: string): void {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

/** Create a pending invite: a user row with a sentinel entra_oid that the
 * OIDC callback will match on the real user's first login. */
export function inviteUser(email: string, role: Role, displayName: string): UserRow {
  const id = crypto.randomUUID();
  const sentinel = `pending:${crypto.randomUUID()}`;
  getDb()
    .prepare(
      `INSERT INTO users (id, entra_oid, tenant_id, email, display_name, role)
       VALUES (?, ?, '', ?, ?, ?)`,
    )
    .run(id, sentinel, email, displayName, role);
  return getUser(id)!;
}

export function isPending(u: UserRow): boolean {
  return u.entra_oid.startsWith("pending:");
}

export function createSession(
  userId: string,
  timeoutMinutes: number,
  ip: string | null,
  userAgent: string | null,
): SessionRow {
  const id = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60_000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, expiresAt, ip, userAgent);
  return {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    ip,
    user_agent: userAgent,
  };
}

export function getSession(id: string): SessionRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(id) as SessionRow | undefined) ?? null
  );
}

export function deleteSession(id: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function pruneExpiredSessions(): number {
  const info = getDb()
    .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
    .run();
  return info.changes as number;
}
