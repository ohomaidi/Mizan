import "server-only";
import { getDb } from "./client";
import type { ClusterId } from "@/lib/data/clusters";

export type ConsentStatus = "pending" | "consented" | "revoked" | "failed";

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
  getDb()
    .prepare(
      `INSERT INTO tenants (id, tenant_id, name_en, name_ar, cluster, domain, ciso, ciso_email, consent_state)
       VALUES (@id, @tenant_id, @name_en, @name_ar, @cluster, @domain, @ciso, @ciso_email, @consent_state)`,
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
    });
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
