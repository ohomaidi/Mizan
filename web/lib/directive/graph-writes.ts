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

// ---------------------------------------------------------------------------
// Generic policy dispatcher — Phase 5+
// ---------------------------------------------------------------------------

/**
 * Policy kinds the directive engine can push. Each maps to a Graph
 * resource collection with its own create/list/delete URLs and idempotency
 * field (the displayName for every kind we currently support). Adding a
 * new regulatory domain = adding an entry here + a row in POLICY_RESOURCES.
 */
export type PolicyKind =
  | "ca" // Phase 3 / 4 — Conditional Access
  | "intune-compliance" // Phase 5
  | "intune-mam-ios" // Phase 5
  | "intune-mam-android" // Phase 5
  | "intune-config"; // Phase 5

type PolicyResourceSpec = {
  /** Graph collection URL, relative to /v1.0 or /beta. */
  collectionPath: string;
  /**
   * $select clause for list calls. Every kind we support exposes id +
   * displayName; Intune compliance also has @odata.type we may want to
   * surface. Keeping this minimal keeps token/throttle usage down.
   */
  listSelect: string;
};

const POLICY_RESOURCES: Record<PolicyKind, PolicyResourceSpec> = {
  ca: {
    collectionPath: "/identity/conditionalAccess/policies",
    listSelect: "id,displayName,state",
  },
  "intune-compliance": {
    collectionPath: "/deviceManagement/deviceCompliancePolicies",
    listSelect: "id,displayName",
  },
  "intune-mam-ios": {
    collectionPath: "/deviceAppManagement/iosManagedAppProtections",
    listSelect: "id,displayName",
  },
  "intune-mam-android": {
    collectionPath: "/deviceAppManagement/androidManagedAppProtections",
    listSelect: "id,displayName",
  },
  "intune-config": {
    collectionPath: "/deviceManagement/deviceConfigurations",
    listSelect: "id,displayName",
  },
};

/**
 * Create a policy of the given kind in the entity's tenant. The caller
 * supplies the already-validated body including the @odata.type discriminator
 * that Intune endpoints require on create. Returns the server-assigned id
 * which rollback + push-store rely on.
 */
export async function createPolicyByKind(
  kind: PolicyKind,
  tenant: Ids,
  body: unknown,
): Promise<{ id: string; displayName: string }> {
  const spec = POLICY_RESOURCES[kind];
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "POST",
    path: spec.collectionPath,
    body: body as Record<string, unknown>,
  });
}

/**
 * Delete a policy of the given kind by id. Rollback calls this.
 */
export async function deletePolicyByKind(
  kind: PolicyKind,
  tenant: Ids,
  policyId: string,
): Promise<void> {
  const spec = POLICY_RESOURCES[kind];
  await graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "DELETE",
    path: `${spec.collectionPath}/${encodeURIComponent(policyId)}`,
  });
}

/**
 * Tag-match lookup — kind-generic equivalent of findCaPolicyByIdempotencyTag.
 * List the kind's collection and find the policy whose displayName embeds
 * the idempotency tag. Every baseline + custom-policy push passes through
 * this so repeat pushes are no-ops.
 */
export async function findPolicyByKindAndTag(
  kind: PolicyKind,
  tenant: Ids,
  idempotencyKey: string,
): Promise<{ id: string; displayName: string } | null> {
  const spec = POLICY_RESOURCES[kind];
  const r = await graphFetch<{
    value: Array<{ id: string; displayName: string }>;
  }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `${spec.collectionPath}?$select=${encodeURIComponent(spec.listSelect)}`,
  });
  const hit = r.value.find((p) => p.displayName.includes(idempotencyKey));
  return hit ?? null;
}

/**
 * One-shot list of every Mizan-tagged policy of the given kind in a tenant.
 * Used by the baseline-status views so we only pay one round-trip per kind
 * per tenant.
 */
export async function listMizanPoliciesByKind(
  kind: PolicyKind,
  tenant: Ids,
): Promise<Array<{ id: string; displayName: string }>> {
  const spec = POLICY_RESOURCES[kind];
  const r = await graphFetch<{
    value: Array<{ id: string; displayName: string }>;
  }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `${spec.collectionPath}?$select=${encodeURIComponent(spec.listSelect)}`,
  });
  return r.value.filter((p) => p.displayName.includes("mizan:"));
}

// ---------------------------------------------------------------------------
// SharePoint tenant settings — Phase 11a
// ---------------------------------------------------------------------------

/**
 * SharePoint tenant settings are a SINGLETON per tenant. The push model
 * is GET → diff → PATCH (or skip if already at intended values), unlike
 * the create-by-collection model used for CA / Intune. No graph_policy_id
 * is stored; rollback is not supported (would require capturing the
 * before state, which the directive_push_actions schema doesn't have a
 * column for today). Operators wanting to revert manually inspect the
 * directive_actions audit trail and PATCH back from the SharePoint admin
 * centre.
 */
export type SharepointSettings = {
  sharingCapability?: string;
  defaultSharingLinkType?: string;
  defaultLinkPermission?: string;
  sharingDomainRestrictionMode?: string;
  sharingAllowedDomainList?: string[];
  sharingBlockedDomainList?: string[];
  requireAcceptingAccountMatchInvitedAccount?: boolean;
  isLoopEnabled?: boolean;
  anyoneLinkExpirationInDays?: number | null;
};

export async function getSharepointSettings(
  tenant: Ids,
): Promise<SharepointSettings> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path: `/admin/sharepoint/settings`,
  });
}

export async function patchSharepointSettings(
  tenant: Ids,
  patch: Partial<SharepointSettings>,
): Promise<SharepointSettings> {
  return graphFetch({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "PATCH",
    path: `/admin/sharepoint/settings`,
    body: patch as Record<string, unknown>,
  });
}

// ---------------------------------------------------------------------------
// Threat Intelligence Indicators (IOCs) — Phase 14b
// ---------------------------------------------------------------------------
//
// IOC create / delete / lookup moved off Microsoft Graph's deprecated
// `/security/tiIndicators` onto the Defender for Endpoint direct API in
// v2.0.5. Code lives in `web/lib/directive/iocs/defender-api.ts`. This
// section intentionally left blank to mark the removal — the previous
// helpers (createTiIndicator / deleteTiIndicator / findTiIndicatorByMizanTag)
// were deleted, not just deprecated, to fail-loud any stale call site.
