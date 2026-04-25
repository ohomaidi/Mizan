import "server-only";
import { defenderFetch } from "@/lib/graph/defender-fetch";

/**
 * Microsoft Defender for Endpoint custom indicator API client.
 *
 * Phase 14b IOC push moved off the deprecated Microsoft Graph
 * `/security/tiIndicators` endpoint (removal "by April 2026") onto the
 * Defender for Endpoint direct API at `https://api.security.microsoft
 * .com/api/indicators` in Mizan v2.0.5. Body shape, indicator-type enum,
 * action enum, and severity type all changed — this module wraps the
 * new contract end-to-end (create + delete + tag-lookup) and
 * `app/api/directive/iocs/route.ts` calls only the helpers exported here.
 *
 * Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/post-ti-indicator
 */

/** Type of indicator value as the Defender API expects it. */
export type DefenderIndicatorType =
  | "FileSha1"
  | "FileSha256"
  | "FileMd5"
  | "CertificateThumbprint"
  | "IpAddress"
  | "DomainName"
  | "Url";

/** Action taken on match. Defender accepts these enum values verbatim. */
export type DefenderIndicatorAction =
  | "Allowed"
  | "Audit"
  | "Warn"
  | "Block"
  | "BlockAndRemediate"
  | "Alert"
  | "AlertAndBlock";

/**
 * Severity is a string on the Defender API (was an int 0–5 on
 * tiIndicator). Matches Mizan's internal naming so no enum mapping
 * needed when the operator picks a level in the console.
 */
export type DefenderIndicatorSeverity =
  | "Informational"
  | "Low"
  | "Medium"
  | "High";

/** Identifier helpers for the local tenant (slug + Entra GUID). */
type TenantIds = { id: string; tenant_id: string };

export type DefenderIndicatorBody = {
  indicatorValue: string;
  indicatorType: DefenderIndicatorType;
  /** Required. Used as the alert title when an action fires. */
  title: string;
  /** Required. Microsoft caps at 100 chars; we trim defensively. */
  description: string;
  action: DefenderIndicatorAction;
  severity?: DefenderIndicatorSeverity;
  /** ISO 8601 with Z suffix (UTC). Optional; Microsoft caps at 90d default. */
  expirationTime?: string;
  /**
   * `true` to fire a Defender alert on match in addition to the action.
   * Required when `action: "Audit"`. Mizan defaults true for any
   * Block-style action so the entity SOC sees the hit.
   */
  generateAlert?: boolean;
  /** Comma-separated RBAC group names if the entity scopes by group. */
  rbacGroupNames?: string[];
  /** Optional friendly name shown in the block notification. */
  application?: string;
  /** Optional; what the user is told to do on a hit. */
  recommendedActions?: string;
};

/**
 * The Defender API's response shape on POST + GET. Numeric `id` is a
 * Defender-internal identifier (not a GUID), kept as a string in
 * Mizan's `directive_push_actions.graph_policy_id` column for parity
 * with Graph-side ids.
 */
type DefenderIndicatorResponse = {
  id: number | string;
  indicatorValue: string;
  indicatorType: DefenderIndicatorType;
  description?: string;
  title?: string;
  action?: DefenderIndicatorAction;
};

/**
 * Submit a new indicator to the entity's Defender for Endpoint tenant.
 * Returns `{ id }` for storage in directive_push_actions so rollback
 * can DELETE by id later.
 */
export async function createDefenderIndicator(
  tenant: TenantIds,
  body: DefenderIndicatorBody,
): Promise<{ id: string; description?: string }> {
  const r = await defenderFetch<DefenderIndicatorResponse>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/indicators`,
    body,
  });
  return { id: String(r.id), description: r.description };
}

/**
 * Delete an indicator by Defender id. Used by rollback. 404 from
 * Defender is treated as a soft success (the indicator is already
 * gone) so a partially-rolled-back batch can be re-rolled-back without
 * the second pass tripping over already-removed rows.
 */
export async function deleteDefenderIndicator(
  tenant: TenantIds,
  indicatorId: string,
): Promise<void> {
  await defenderFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "DELETE",
    path: `/indicators/${encodeURIComponent(indicatorId)}`,
  });
}

/**
 * Find an indicator the Mizan tag prefix points at. Used for
 * idempotency before create — same observable + same Mizan id should
 * never produce a duplicate row in the entity tenant.
 *
 * Defender's `/api/indicators` GET supports OData `$filter`. We pull
 * by `description starts with` rather than equals because the operator
 * may have edited their description on a re-push (unlikely but cheap
 * to handle).
 */
export async function findDefenderIndicatorByMizanTag(
  tenant: TenantIds,
  mizanTag: string,
): Promise<{ id: string; description: string } | null> {
  // Microsoft's OData implementation here doesn't support `startswith`
  // on description reliably across all tenants, so we list the first
  // 200 (Mizan-side cap on indicators per push) and match in JS. Cheap
  // enough — the page size matches what we'd ask for anyway.
  const r = await defenderFetch<{
    value: Array<{ id: number | string; description?: string }>;
  }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `/indicators?$top=200`,
  });
  const hit = r.value.find((p) => (p.description ?? "").includes(mizanTag));
  return hit ? { id: String(hit.id), description: hit.description ?? "" } : null;
}
