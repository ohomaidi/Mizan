import "server-only";
import { graphFetch } from "@/lib/graph/fetch";
import type { TenantRow } from "@/lib/db/tenants";

/**
 * Graph WRITE helpers. One function per directive action. Each takes the
 * Mizan tenant row (for the target Entra tenant GUID + our tenant id for
 * health telemetry) and action-specific input; returns the Graph response
 * summary the directive engine will stamp into the audit row.
 *
 * These are ONLY called from the directive engine's real-path branch. The
 * demo-tenant path in engine.ts short-circuits before reaching here.
 */

type Ids = Pick<TenantRow, "tenant_id" | "id">;

export type IncidentClassification =
  | "truePositive"
  | "falsePositive"
  | "informationalExpectedActivity";

export type IncidentDetermination =
  | "apt"
  | "malware"
  | "phishing"
  | "compromisedAccount"
  | "maliciousUserActivity"
  | "unwantedSoftware"
  | "insufficientInformation"
  | "other";

export async function classifyIncident(
  tenant: Ids,
  incidentId: string,
  body: {
    classification?: IncidentClassification;
    determination?: IncidentDetermination;
    status?: "active" | "resolved" | "inProgress" | "redirected";
    customTags?: string[];
    assignedTo?: string; // upn of the analyst it gets assigned to
  },
): Promise<{ id: string; classification?: string; status?: string }> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "PATCH",
    path: `/security/incidents/${encodeURIComponent(incidentId)}`,
    body,
  });
}

export async function commentOnIncident(
  tenant: Ids,
  incidentId: string,
  comment: string,
): Promise<{ comments: Array<{ comment: string; createdDateTime: string }> }> {
  // Graph merges comments into the incident resource via a dedicated
  // collection. PATCH with { comments: [ { comment } ] } appends one.
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "PATCH",
    path: `/security/incidents/${encodeURIComponent(incidentId)}`,
    body: { comments: [{ comment }] },
  });
}

export async function classifyAlert(
  tenant: Ids,
  alertId: string,
  body: {
    classification?: IncidentClassification;
    determination?: IncidentDetermination;
    status?: "new" | "inProgress" | "resolved";
    assignedTo?: string;
  },
): Promise<{ id: string }> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "PATCH",
    path: `/security/alerts_v2/${encodeURIComponent(alertId)}`,
    body,
  });
}

export async function commentOnAlert(
  tenant: Ids,
  alertId: string,
  comment: string,
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/security/alerts_v2/${encodeURIComponent(alertId)}/comments`,
    body: [{ comment }],
  });
}

export async function confirmCompromisedUsers(
  tenant: Ids,
  userIds: string[],
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/identityProtection/riskyUsers/confirmCompromised`,
    body: { userIds },
  });
}

export async function dismissRiskyUsers(
  tenant: Ids,
  userIds: string[],
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/identityProtection/riskyUsers/dismiss`,
    body: { userIds },
  });
}

export async function revokeSignInSessions(
  tenant: Ids,
  userId: string,
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/users/${encodeURIComponent(userId)}/revokeSignInSessions`,
  });
}

export type EmailThreatSubmission = {
  category: "phishing" | "malware" | "spam" | "notSpam";
  recipientEmailAddress: string;
  messageUri: string;
};

export async function submitEmailThreat(
  tenant: Ids,
  body: EmailThreatSubmission,
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/security/threatSubmission/emailThreats`,
    body: {
      category: body.category,
      recipientEmailAddress: body.recipientEmailAddress,
      messageUri: body.messageUri,
    },
  });
}

export type UrlThreatSubmission = {
  category: "phishing" | "malware" | "spam" | "notSpam";
  url: string;
};

export async function submitUrlThreat(
  tenant: Ids,
  body: UrlThreatSubmission,
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/security/threatSubmission/urlThreats`,
    body,
  });
}

export type FileThreatSubmission = {
  category: "malware" | "notMalware";
  fileName: string;
  fileContent: string; // base64
};

export async function submitFileThreat(
  tenant: Ids,
  body: FileThreatSubmission,
): Promise<unknown> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/security/threatSubmission/fileThreats`,
    body,
  });
}

// ---------------------------------------------------------------------------
// Conditional Access — Phase 3
// ---------------------------------------------------------------------------

/**
 * Create a CA policy in the entity's tenant. Graph returns the policy
 * with its server-assigned id, which we store on the push_action row so
 * rollback knows what to DELETE.
 */
export async function createConditionalAccessPolicy(
  tenant: Ids,
  body: unknown,
): Promise<{ id: string; displayName: string; state: string }> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: `/identity/conditionalAccess/policies`,
    body: body as Record<string, unknown>,
  });
}

/** Delete a CA policy by id. Used by rollback. */
export async function deleteConditionalAccessPolicy(
  tenant: Ids,
  policyId: string,
): Promise<void> {
  await graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "DELETE",
    path: `/identity/conditionalAccess/policies/${encodeURIComponent(policyId)}`,
  });
}

/**
 * Check whether the entity already has a CA policy whose displayName
 * carries our idempotency tag. Used to make a repeat push a no-op rather
 * than a duplicate. Reads via the Signals Graph app's delegated list
 * permission (same token cache as every other read).
 */
export async function findCaPolicyByIdempotencyTag(
  tenant: Ids,
  idempotencyKey: string,
): Promise<{ id: string; displayName: string; state: string } | null> {
  const r = await graphFetch<{
    value: Array<{ id: string; displayName: string; state: string }>;
  }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `/identity/conditionalAccess/policies?$select=id,displayName,state`,
  });
  const hit = r.value.find((p) => p.displayName.includes(idempotencyKey));
  return hit ?? null;
}

/**
 * One-shot list of every Mizan-tagged CA policy in a tenant. Used by the
 * baseline-status view so we only pay one Graph round-trip per tenant even
 * though we resolve twelve baselines. Matches policies whose displayName
 * contains the "mizan:" prefix.
 */
export async function listMizanCaPolicies(
  tenant: Ids,
): Promise<Array<{ id: string; displayName: string; state: string }>> {
  const r = await graphFetch<{
    value: Array<{ id: string; displayName: string; state: string }>;
  }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `/identity/conditionalAccess/policies?$select=id,displayName,state`,
  });
  return r.value.filter((p) => p.displayName.includes("mizan:"));
}
