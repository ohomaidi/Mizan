import "server-only";
import { getDb } from "./client";

/**
 * Secure Score control registry.
 *
 * Microsoft Graph's Secure Score returns ~150–250 controls per tenant
 * depending on licensing. The compliance-framework catalog (NESA, Dubai
 * ISR, etc.) maps clauses to specific Secure Score control IDs as
 * evidence anchors. Operators can't reasonably remember those IDs from
 * memory, so this module aggregates the union of all observed controls
 * across every consented tenant and exposes them to the settings panel
 * as a searchable picker.
 *
 * Implementation: scan the latest `signal_snapshots` per tenant where
 * `signal_type = 'secureScore'`, expand the JSON `controls[]` array,
 * dedupe by control id, and roll up per-id metadata (title, category,
 * service) and a current pass-rate (controls['score'] / controls
 * ['maxScore'] averaged across tenants where the control was observed).
 *
 * The registry is computed on-demand from the latest signal snapshots
 * — no separate caching layer. Costs roughly one DB query that fans
 * out via SQLite's json_each across every tenant's latest snapshot.
 * For ~50 tenants × ~200 controls that's ~10,000 rows scanned, which
 * SQLite handles in single-digit milliseconds.
 */

export type SecureScoreControlEntry = {
  /** Control id as Microsoft returns it (e.g. "MFARegistrationV2", "scid_2000"). */
  id: string;
  /** Human-readable title from Microsoft. Falls back to id when title is missing. */
  title: string;
  /** Microsoft's top-level grouping: "Identity" | "Device" | "Apps" | "Data". */
  category: string | null;
  /** Microsoft's product attribution: "AzureAD" | "MDATP" | "MDO" | "Azure ATP" | etc. */
  service: string | null;
  /**
   * Number of consented tenants where this control has been observed in
   * the latest secureScore snapshot. Higher = more universally
   * applicable (e.g. MFARegistrationV2 appears on every tenant);
   * lower = license-gated or product-specific (e.g. Azure ATP controls
   * only show up on tenants with Defender for Identity).
   */
  observedOnTenants: number;
  /**
   * Average pass-rate across the observed tenants, scored as
   * sum(score) / sum(maxScore) over the latest snapshots. 1 means
   * fully implemented everywhere; 0 means not implemented anywhere.
   * null when no tenant reported a non-zero maxScore (some controls
   * are informational and don't contribute to the score).
   */
  averagePassRate: number | null;
};

/**
 * Return the union of every Secure Score control observed in the
 * latest snapshot of every tenant. Each row carries roll-up metadata
 * (observedOnTenants, averagePassRate) the picker UI uses to surface
 * the most-relevant controls first.
 *
 * Sort: averagePassRate ascending (least-implemented first — those
 * are usually the ones operators care about), then observedOnTenants
 * descending (more-universal controls before niche ones).
 */
export function listSecureScoreControlRegistry(): SecureScoreControlEntry[] {
  const rows = getDb()
    .prepare(
      `WITH latest AS (
        SELECT tenant_id, MAX(fetched_at) AS fetched_at
          FROM signal_snapshots
         WHERE signal_type = 'secureScore'
         GROUP BY tenant_id
      )
      SELECT
        json_extract(c.value, '$.id')         AS id,
        json_extract(c.value, '$.title')      AS title,
        json_extract(c.value, '$.category')   AS category,
        json_extract(c.value, '$.service')    AS service,
        json_extract(c.value, '$.score')      AS score,
        json_extract(c.value, '$.maxScore')   AS max_score,
        s.tenant_id                            AS tenant_id
        FROM signal_snapshots s
        JOIN latest l
          ON l.tenant_id = s.tenant_id
         AND l.fetched_at = s.fetched_at
        JOIN json_each(json_extract(s.payload, '$.controls')) c
       WHERE s.signal_type = 'secureScore'
         AND json_extract(c.value, '$.id') IS NOT NULL`,
    )
    .all() as Array<{
    id: string;
    title: string | null;
    category: string | null;
    service: string | null;
    score: number | null;
    max_score: number | null;
    tenant_id: string;
  }>;

  // Roll up per id.
  type Acc = {
    id: string;
    title: string | null;
    category: string | null;
    service: string | null;
    tenants: Set<string>;
    sumScore: number;
    sumMax: number;
  };
  const byId = new Map<string, Acc>();
  for (const r of rows) {
    let a = byId.get(r.id);
    if (!a) {
      a = {
        id: r.id,
        title: r.title,
        category: r.category,
        service: r.service,
        tenants: new Set(),
        sumScore: 0,
        sumMax: 0,
      };
      byId.set(r.id, a);
    }
    // Prefer non-null metadata if a later tenant has it — Microsoft
    // sometimes returns the title on one tenant but null on another.
    a.title = a.title ?? r.title;
    a.category = a.category ?? r.category;
    a.service = a.service ?? r.service;
    a.tenants.add(r.tenant_id);
    if (typeof r.score === "number") a.sumScore += r.score;
    if (typeof r.max_score === "number") a.sumMax += r.max_score;
  }

  const out: SecureScoreControlEntry[] = [];
  for (const a of byId.values()) {
    out.push({
      id: a.id,
      title: a.title ?? a.id,
      category: a.category,
      service: a.service,
      observedOnTenants: a.tenants.size,
      averagePassRate: a.sumMax > 0 ? a.sumScore / a.sumMax : null,
    });
  }

  out.sort((x, y) => {
    // Lowest pass-rate first (controls that need attention most).
    const xr = x.averagePassRate ?? 0.5;
    const yr = y.averagePassRate ?? 0.5;
    if (xr !== yr) return xr - yr;
    // Then more-universal controls before niche ones.
    if (x.observedOnTenants !== y.observedOnTenants) {
      return y.observedOnTenants - x.observedOnTenants;
    }
    return x.id.localeCompare(y.id);
  });
  return out;
}

/**
 * Per-clause coverage roll-up: given a set of control IDs, return the
 * average pass-rate across the latest snapshots of every consented
 * tenant. Used by the governance page to render "% coverage" per ISR
 * domain. Returns null when none of the controls are observed
 * anywhere — distinguishes "not implemented" from "no data".
 */
export function computeClauseCoverage(
  controlIds: string[],
): { coverage: number | null; observedOn: number } {
  if (controlIds.length === 0) {
    return { coverage: null, observedOn: 0 };
  }
  const placeholders = controlIds.map(() => "?").join(",");
  const r = getDb()
    .prepare(
      `WITH latest AS (
        SELECT tenant_id, MAX(fetched_at) AS fetched_at
          FROM signal_snapshots
         WHERE signal_type = 'secureScore'
         GROUP BY tenant_id
      )
      SELECT
        SUM(json_extract(c.value, '$.score'))    AS s,
        SUM(json_extract(c.value, '$.maxScore')) AS m,
        COUNT(DISTINCT s.tenant_id)              AS n
        FROM signal_snapshots s
        JOIN latest l
          ON l.tenant_id = s.tenant_id
         AND l.fetched_at = s.fetched_at
        JOIN json_each(json_extract(s.payload, '$.controls')) c
       WHERE s.signal_type = 'secureScore'
         AND json_extract(c.value, '$.id') IN (${placeholders})`,
    )
    .get(...controlIds) as { s: number | null; m: number | null; n: number };
  if (!r.m || r.m === 0) return { coverage: null, observedOn: r.n ?? 0 };
  return {
    coverage: (r.s ?? 0) / r.m,
    observedOn: r.n ?? 0,
  };
}
