import "server-only";
import { getDb } from "@/lib/db/client";
import type { IocPushBody } from "./types";

export type IocRow = {
  id: number;
  owner_user_id: string | null;
  type: string;
  value: string;
  action: string;
  severity: string;
  description: string;
  internal_note: string | null;
  expiration_date: string;
  created_at: string;
};

export function createIocRow(input: {
  ownerUserId: string | null;
  body: IocPushBody;
  expirationIso: string;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO directive_iocs
        (owner_user_id, type, value, action, severity,
         description, internal_note, expiration_date)
       VALUES (@owner, @type, @value, @action, @severity,
               @description, @note, @expiration)`,
    )
    .run({
      owner: input.ownerUserId,
      type: input.body.type,
      value: input.body.value,
      action: input.body.action,
      severity: input.body.severity,
      description: input.body.description,
      note: input.body.internalNote ?? null,
      expiration: input.expirationIso,
    });
  return info.lastInsertRowid as number;
}

export function listIocs(limit = 100): IocRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM directive_iocs ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(Math.min(500, Math.max(1, limit))) as IocRow[];
}

export function getIoc(id: number): IocRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM directive_iocs WHERE id = ?")
      .get(id) as IocRow | undefined) ?? null
  );
}
