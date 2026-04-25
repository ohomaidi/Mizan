import "server-only";
import { getDb } from "./client";
import type { ClusterId } from "@/lib/data/clusters";

export type ConsentStatus = "pending" | "consented" | "revoked" | "failed";

/**
 * Per-entity directive posture.
 *   observation — entity consented only to the read-only Graph Signals app.
 *                  This is the default, and is the ONLY value ever written in
 *                  observation-mode deployments (SCSC-style).
 *   directive    — entity additionally consented to the Directive app that
 *                  holds .ReadWrite scopes. Only meaningful in directive-mode
 *                  deployments (DESC-style regulators).
 */
export type ConsentMode = "observation" | "directive";

export type TenantRow = {
  id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  cluster: ClusterId;
  domain: string;
  ciso: string;
  ciso_email: string;
  consent_status: ConsentStatus;
  consented_at: string | null;
  consent_state: string | null;
  /** Per-entity directive posture. See ConsentMode. */
  consent_mode: ConsentMode;
  /** Timestamp the entity granted consent to the Directive write app, if ever. */
  directive_app_consented_at: string | null;
  /** OAuth `state` value stashed for the Directive-app consent round-trip. */
  directive_app_consent_state: string | null;
  /** Last error captured on the Directive-app consent round-trip, if any. */
  directive_app_consent_error: string | null;
  last_sync_at: string | null;
  last_sync_ok: 0 | 1;
  last_sync_error: string | null;
  is_demo: 0 | 1;
  suspended_at: string | null;
  scheduled_review_at: string | null;
  scheduled_review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantDraft = {
  id?: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  cluster: ClusterId;
  domain: string;
  ciso?: string;
  ciso_email?: string;
  /**
   * Chosen at onboarding time. Observation-mode deployments MUST leave this
   * unset (or explicitly pass "observation"); directive-mode deployments may
   * pass "directive" to request a Directive-app consent URL. Immutable at the
   * entity level past insert — upgrades and downgrades are a separate flow.
   */
  consent_mode?: ConsentMode;
  /**
   * Marks the tenant as a demo / simulated tenant. All directive writes are
   * simulated, the consent flow is bypassed (real Azure config not required),
   * and the row is gated by every demo-aware code path. Set true by the
   * onboarding API when `MIZAN_DEMO_MODE=true`, by the seed for SCSC/DESC
   * fixture entities, and explicitly by tests. Defaults to false.
   */
  is_demo?: boolean;
};

export type ConsentHistoryAction =
  | "onboarded"
  | "directive_consented"
  | "directive_revoked"
  | "upgraded"
  | "downgraded";

export type ConsentHistoryRow = {
  id: number;
  tenant_id: string;
  action: ConsentHistoryAction;
  from_mode: ConsentMode | null;
  to_mode: ConsentMode | null;
  actor_user_id: string | null;
  note: string | null;
  at: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function listTenants(): TenantRow[] {
  return getDb()
    .prepare("SELECT * FROM tenants ORDER BY name_en ASC")
    .all() as TenantRow[];
}

export function getTenant(id: string): TenantRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM tenants WHERE id = ?")
      .get(id) as TenantRow | undefined) ?? null
  );
}

export function getTenantByTenantId(tenantId: string): TenantRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM tenants WHERE tenant_id = ?")
      .get(tenantId) as TenantRow | undefined) ?? null
  );
}

export function getTenantByState(state: string): TenantRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM tenants WHERE consent_state = ?")
      .get(state) as TenantRow | undefined) ?? null
  );
}

export function insertTenant(
  d: TenantDraft,
  consentState: string,
): TenantRow {
  const id = d.id ?? (slugify(d.name_en) || `tenant-${Date.now()}`);
  const mode: ConsentMode = d.consent_mode === "directive" ? "directive" : "observation";
  getDb()
    .prepare(
      `INSERT INTO tenants (id, tenant_id, name_en, name_ar, cluster, domain, ciso, ciso_email, consent_state, consent_mode, is_demo)
       VALUES (@id, @tenant_id, @name_en, @name_ar, @cluster, @domain, @ciso, @ciso_email, @consent_state, @consent_mode, @is_demo)`,
    )
    .run({
      id,
      tenant_id: d.tenant_id,
      name_en: d.name_en,
      name_ar: d.name_ar,
      cluster: d.cluster,
      domain: d.domain,
      ciso: d.ciso ?? "",
      ciso_email: d.ciso_email ?? "",
      consent_state: consentState,
      consent_mode: mode,
      is_demo: d.is_demo ? 1 : 0,
    });
  // Audit the onboarding in consent_history so the tenant's mode lineage is
  // queryable from day one.
  getDb()
    .prepare(
      `INSERT INTO consent_history (tenant_id, action, from_mode, to_mode, note)
       VALUES (?, 'onboarded', NULL, ?, NULL)`,
    )
    .run(id, mode);
  return getTenant(id)!;
}

export function markConsented(id: string): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET consent_status = 'consented',
             consented_at = datetime('now'),
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(id);
}

export function markConsentFailed(id: string, reason: string): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET consent_status = 'failed',
             last_sync_error = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(reason, id);
}

export function markSyncResult(
  id: string,
  ok: boolean,
  errorMessage?: string,
): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET last_sync_at = datetime('now'),
             last_sync_ok = ?,
             last_sync_error = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(ok ? 1 : 0, errorMessage ?? null, id);
}

export function deleteTenant(id: string): void {
  getDb().prepare("DELETE FROM tenants WHERE id = ?").run(id);
}

export function setSuspended(id: string, suspended: boolean): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET suspended_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(suspended ? 1 : 0, id);
}

export function setScheduledReview(
  id: string,
  scheduledFor: string | null,
  note: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET scheduled_review_at = ?,
             scheduled_review_note = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(scheduledFor, note, id);
}

export function markConsentRevoked(id: string, reason?: string): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET consent_status = 'revoked',
             last_sync_error = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(reason ?? null, id);
}

/**
 * Stamp a Directive-app `state` token for the OAuth round-trip. Called when
 * the Center generates a consent URL for this tenant to upgrade to directive
 * mode. The token is verified on the callback just like the Graph-signals
 * flow. Clears any previous error from a retry.
 */
export function setDirectiveConsentState(id: string, state: string): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET directive_app_consent_state = ?,
             directive_app_consent_error = NULL,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(state, id);
}

export function getTenantByDirectiveState(state: string): TenantRow | null {
  return (
    (getDb()
      .prepare("SELECT * FROM tenants WHERE directive_app_consent_state = ?")
      .get(state) as TenantRow | undefined) ?? null
  );
}

/**
 * Flip a tenant to directive mode on successful Directive-app consent. Writes
 * the consented-at timestamp, clears the state token, and appends a history
 * row so the upgrade is auditable.
 */
export function markDirectiveConsented(id: string, actorUserId?: string | null): void {
  const db = getDb();
  const row = db
    .prepare("SELECT consent_mode FROM tenants WHERE id = ?")
    .get(id) as { consent_mode: ConsentMode } | undefined;
  const fromMode: ConsentMode = row?.consent_mode ?? "observation";
  db.prepare(
    `UPDATE tenants
        SET consent_mode = 'directive',
            directive_app_consented_at = datetime('now'),
            directive_app_consent_state = NULL,
            directive_app_consent_error = NULL,
            updated_at = datetime('now')
      WHERE id = ?`,
  ).run(id);
  if (fromMode !== "directive") {
    db.prepare(
      `INSERT INTO consent_history (tenant_id, action, from_mode, to_mode, actor_user_id, note)
       VALUES (?, 'upgraded', ?, 'directive', ?, NULL)`,
    ).run(id, fromMode, actorUserId ?? null);
  }
}

export function markDirectiveConsentFailed(id: string, reason: string): void {
  getDb()
    .prepare(
      `UPDATE tenants
         SET directive_app_consent_error = ?,
             updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(reason, id);
}

/**
 * Downgrade: the entity revoked Directive-app consent in their own Entra
 * admin center, we detected it on the next sync, now we drop them back to
 * observation and audit the change. The Signals (read) consent is untouched.
 */
export function markDirectiveRevoked(id: string, reason?: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE tenants
        SET consent_mode = 'observation',
            directive_app_consented_at = NULL,
            directive_app_consent_error = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
  ).run(reason ?? null, id);
  db.prepare(
    `INSERT INTO consent_history (tenant_id, action, from_mode, to_mode, note)
     VALUES (?, 'downgraded', 'directive', 'observation', ?)`,
  ).run(id, reason ?? null);
}

export function listConsentHistory(tenantId: string): ConsentHistoryRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM consent_history WHERE tenant_id = ? ORDER BY at DESC, id DESC",
    )
    .all(tenantId) as ConsentHistoryRow[];
}
