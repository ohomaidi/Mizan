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
