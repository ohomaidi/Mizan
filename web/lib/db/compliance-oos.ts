import "server-only";
import { getDb } from "./client";

/**
 * Compliance Out-of-Scope (OOS) registry — v2.4.0.
 *
 * Two tiers of OOS marks live in `compliance_out_of_scope`:
 *
 *  1. GLOBAL  (tenant_id IS NULL)
 *     The clause is not applicable across the entire deployment because
 *     a 3rd-party product the Center accepts already covers it. Subtracted
 *     from the denominator on every tenant's framework-compliance %.
 *
 *  2. PER-ENTITY  (tenant_id = TEXT)
 *     The clause is not applicable to ONE entity (e.g. a federal entity
 *     that runs its own DLP stack). Subtracted from that tenant's
 *     denominator only.
 *
 * Per-clause OOS is the only kind currently wired through the UI; the
 * `scope_kind` column also accepts 'control' so a future expansion can
 * exclude individual Secure Score controls without reshaping the schema.
 *
 * The compute side reads global + per-tenant sets via {@link getOosSets}
 * and skips matching clauses in the framework rollup (see
 * `computeTenantFrameworkScore`).
 */

export type OosScopeKind = "clause" | "control";

export type OosMark = {
  id: number;
  tenantId: string | null;
  frameworkId: string;
  scopeKind: OosScopeKind;
  scopeId: string;
  reason: string | null;
  markedByUserId: string | null;
  markedAt: string;
};

type Row = {
  id: number;
  tenant_id: string | null;
  framework_id: string;
  scope_kind: OosScopeKind;
  scope_id: string;
  reason: string | null;
  marked_by_user_id: string | null;
  marked_at: string;
};

function rowToMark(r: Row): OosMark {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    frameworkId: r.framework_id,
    scopeKind: r.scope_kind,
    scopeId: r.scope_id,
    reason: r.reason,
    markedByUserId: r.marked_by_user_id,
    markedAt: r.marked_at,
  };
}

/**
 * Resolved OOS sets for a given tenant + framework.
 *
 * - `globalClauses` / `globalControls` : applies to every tenant.
 * - `tenantClauses` / `tenantControls` : applies to the requested tenant
 *   only (empty when tenantId is omitted).
 *
 * The compute layer treats a clause as OOS if it is in EITHER the global
 * set OR the per-tenant set — global wins by default; per-tenant adds
 * additional carve-outs on top.
 */
export type OosSets = {
  globalClauses: Set<string>;
  globalControls: Set<string>;
  tenantClauses: Set<string>;
  tenantControls: Set<string>;
};

/**
 * Resolve global + per-tenant OOS sets for a framework. Pass `tenantId =
 * null` to get global only (the per-tenant sets come back empty).
 *
 * Single round-trip; cheap enough to call inline during maturity compute.
 */
export function getOosSets(
  frameworkId: string,
  tenantId: string | null,
): OosSets {
  const rows = getDb()
    .prepare(
      `SELECT *
         FROM compliance_out_of_scope
        WHERE framework_id = ?
          AND (tenant_id IS NULL${tenantId ? " OR tenant_id = ?" : ""})`,
    )
    .all(
      ...(tenantId ? [frameworkId, tenantId] : [frameworkId]),
    ) as Row[];

  const sets: OosSets = {
    globalClauses: new Set(),
    globalControls: new Set(),
    tenantClauses: new Set(),
    tenantControls: new Set(),
  };
  for (const r of rows) {
    const isGlobal = r.tenant_id === null;
    if (r.scope_kind === "clause") {
      (isGlobal ? sets.globalClauses : sets.tenantClauses).add(r.scope_id);
    } else {
      (isGlobal ? sets.globalControls : sets.tenantControls).add(r.scope_id);
    }
  }
  return sets;
}

/** List every OOS mark for a framework (both global + every tenant). */
export function listOosMarks(frameworkId: string): OosMark[] {
  const rows = getDb()
    .prepare(
      `SELECT *
         FROM compliance_out_of_scope
        WHERE framework_id = ?
        ORDER BY tenant_id IS NULL DESC, marked_at DESC`,
    )
    .all(frameworkId) as Row[];
  return rows.map(rowToMark);
}

/** List OOS marks scoped to one tier — `tenantId = null` returns globals. */
export function listOosMarksScoped(
  frameworkId: string,
  tenantId: string | null,
): OosMark[] {
  const rows = getDb()
    .prepare(
      tenantId === null
        ? `SELECT * FROM compliance_out_of_scope
            WHERE framework_id = ? AND tenant_id IS NULL
            ORDER BY scope_kind, scope_id`
        : `SELECT * FROM compliance_out_of_scope
            WHERE framework_id = ? AND tenant_id = ?
            ORDER BY scope_kind, scope_id`,
    )
    .all(
      ...(tenantId === null ? [frameworkId] : [frameworkId, tenantId]),
    ) as Row[];
  return rows.map(rowToMark);
}

/**
 * Mark a clause/control as out-of-scope. Idempotent — a duplicate
 * (tenant, framework, kind, id) is upserted on the existing row, refreshing
 * the reason + actor + timestamp without inflating the table.
 */
export function markOutOfScope(input: {
  tenantId: string | null;
  frameworkId: string;
  scopeKind: OosScopeKind;
  scopeId: string;
  reason?: string | null;
  markedByUserId?: string | null;
}): OosMark {
  const db = getDb();
  // Find existing first — UNIQUE indexes are partial (tenant_id IS NULL vs
  // IS NOT NULL) so a single ON CONFLICT clause can't cover both branches.
  const existing = db
    .prepare(
      input.tenantId === null
        ? `SELECT * FROM compliance_out_of_scope
            WHERE tenant_id IS NULL AND framework_id = ?
              AND scope_kind = ? AND scope_id = ?`
        : `SELECT * FROM compliance_out_of_scope
            WHERE tenant_id = ? AND framework_id = ?
              AND scope_kind = ? AND scope_id = ?`,
    )
    .get(
      ...(input.tenantId === null
        ? [input.frameworkId, input.scopeKind, input.scopeId]
        : [
            input.tenantId,
            input.frameworkId,
            input.scopeKind,
            input.scopeId,
          ]),
    ) as Row | undefined;

  if (existing) {
    db.prepare(
      `UPDATE compliance_out_of_scope
          SET reason = ?, marked_by_user_id = ?, marked_at = datetime('now')
        WHERE id = ?`,
    ).run(input.reason ?? null, input.markedByUserId ?? null, existing.id);
    const r = db
      .prepare("SELECT * FROM compliance_out_of_scope WHERE id = ?")
      .get(existing.id) as Row;
    return rowToMark(r);
  }

  const result = db
    .prepare(
      `INSERT INTO compliance_out_of_scope
        (tenant_id, framework_id, scope_kind, scope_id, reason, marked_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.tenantId,
      input.frameworkId,
      input.scopeKind,
      input.scopeId,
      input.reason ?? null,
      input.markedByUserId ?? null,
    );
  const r = db
    .prepare("SELECT * FROM compliance_out_of_scope WHERE id = ?")
    .get(result.lastInsertRowid as number) as Row;
  return rowToMark(r);
}

/**
 * Remove an OOS mark. Returns true when a row was deleted, false when the
 * mark didn't exist (idempotent unmark — no error).
 */
export function unmarkOutOfScope(input: {
  tenantId: string | null;
  frameworkId: string;
  scopeKind: OosScopeKind;
  scopeId: string;
}): boolean {
  const result = getDb()
    .prepare(
      input.tenantId === null
        ? `DELETE FROM compliance_out_of_scope
            WHERE tenant_id IS NULL AND framework_id = ?
              AND scope_kind = ? AND scope_id = ?`
        : `DELETE FROM compliance_out_of_scope
            WHERE tenant_id = ? AND framework_id = ?
              AND scope_kind = ? AND scope_id = ?`,
    )
    .run(
      ...(input.tenantId === null
        ? [input.frameworkId, input.scopeKind, input.scopeId]
        : [
            input.tenantId,
            input.frameworkId,
            input.scopeKind,
            input.scopeId,
          ]),
    );
  return result.changes > 0;
}

/**
 * Remove every OOS mark for a framework. Used when the operator switches
 * the active framework — old marks no longer apply because clause IDs
 * don't carry across catalogs (Dubai ISR's "ISR-7" ≠ NESA's "T1.1").
 *
 * Skipped automatically by the framework switch path; the user can also
 * trigger it explicitly from settings if marks accumulate stale.
 */
export function clearOosForFramework(frameworkId: string): number {
  const result = getDb()
    .prepare("DELETE FROM compliance_out_of_scope WHERE framework_id = ?")
    .run(frameworkId);
  return result.changes;
}
