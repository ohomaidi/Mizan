import "server-only";
import { getDb } from "@/lib/db/client";
import {
  CustomCaPolicySpecSchema,
  type CustomCaPolicySpec,
} from "./types";

export type CustomCaPolicyRow = {
  id: number;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  spec_json: string;
  status: "draft" | "archived";
  created_at: string;
  updated_at: string;
};

export function createCustomPolicy(input: {
  name: string;
  description?: string | null;
  spec: CustomCaPolicySpec;
  ownerUserId: string | null;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO custom_ca_policies
        (owner_user_id, name, description, spec_json, status)
       VALUES (@owner, @name, @description, @spec, 'draft')`,
    )
    .run({
      owner: input.ownerUserId,
      name: input.name,
      description: input.description ?? null,
      spec: JSON.stringify(input.spec),
    });
  return info.lastInsertRowid as number;
}

export function getCustomPolicy(id: number): CustomCaPolicyRow | null {
  const row = getDb()
    .prepare("SELECT * FROM custom_ca_policies WHERE id = ?")
    .get(id) as CustomCaPolicyRow | undefined;
  return row ?? null;
}

export function listCustomPolicies(
  opts: { status?: "draft" | "archived"; limit?: number } = {},
): CustomCaPolicyRow[] {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  if (opts.status) {
    return getDb()
      .prepare(
        `SELECT * FROM custom_ca_policies
          WHERE status = ?
          ORDER BY updated_at DESC, id DESC
          LIMIT ?`,
      )
      .all(opts.status, limit) as CustomCaPolicyRow[];
  }
  return getDb()
    .prepare(
      `SELECT * FROM custom_ca_policies
        ORDER BY updated_at DESC, id DESC
        LIMIT ?`,
    )
    .all(limit) as CustomCaPolicyRow[];
}

export function updateCustomPolicy(
  id: number,
  patch: {
    name?: string;
    description?: string | null;
    spec?: CustomCaPolicySpec;
    status?: "draft" | "archived";
  },
): CustomCaPolicyRow | null {
  const existing = getCustomPolicy(id);
  if (!existing) return null;
  const nextName = patch.name ?? existing.name;
  const nextDesc =
    patch.description === undefined ? existing.description : patch.description;
  const nextSpec = patch.spec
    ? JSON.stringify(patch.spec)
    : existing.spec_json;
  const nextStatus = patch.status ?? existing.status;
  getDb()
    .prepare(
      `UPDATE custom_ca_policies
         SET name = @name,
             description = @description,
             spec_json = @spec,
             status = @status,
             updated_at = datetime('now')
       WHERE id = @id`,
    )
    .run({
      id,
      name: nextName,
      description: nextDesc,
      spec: nextSpec,
      status: nextStatus,
    });
  return getCustomPolicy(id);
}

export function deleteCustomPolicy(id: number): boolean {
  const info = getDb()
    .prepare("DELETE FROM custom_ca_policies WHERE id = ?")
    .run(id);
  return info.changes > 0;
}

/** Parse the spec_json column into a validated spec. Throws on invalid. */
export function parseSpec(row: CustomCaPolicyRow): CustomCaPolicySpec {
  const raw = JSON.parse(row.spec_json) as unknown;
  return CustomCaPolicySpecSchema.parse(raw);
}

/** Idempotency key stamped into the displayName when the policy is pushed. */
export function idempotencyKeyForPolicy(id: number): string {
  return `mizan:custom:${id}:v1`;
}
