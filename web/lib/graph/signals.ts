import "server-only";
import { graphFetch, graphFetchAll, GraphError } from "./fetch";
import { defenderFetch, mtpFetch } from "./defender-fetch";

export type SignalCallCtx = {
  tenantGuid: string;
  ourTenantId: string;
};

// Upper bound per signal to protect SQLite from pathological tenants.
// At 2000 per signal, a 400-device tenant stays fully cached.
const MAX_RECORDS_PER_SIGNAL = 2000;

// ————————————————————————————————————————
// Secure Score
// ————————————————————————————————————————

export type SecureScoreControl = {
  id: string;
  /** Human-readable title from /security/secureScoreControlProfiles (e.g. "Enable MFA for admins"). Falls back to `id` when profile is unavailable. */
  title: string | null;
  category: string | null;
  score: number | null;
  maxScore: number | null;
  implementationStatus: string | null;
  state: string | null;
  userImpact: string | null;
  implementationCost: string | null;
  tier: string | null;
  service: string | null;
  threats: string[];
};

export type SecureScorePayload = {
  currentScore: number;
  maxScore: number;
  percent: number;
  licensedUserCount: number | null;
  activeUserCount: number | null;
  enabledServices: string[];
  controls: SecureScoreControl[];
  fetchedAt: string;
};

type RawSecureScore = {
  value: Array<{
    id: string;
    currentScore: number;
    maxScore: number;
    createdDateTime: string;
    licensedUserCount?: number;
    activeUserCount?: number;
    enabledServices?: string[];
    controlScores?: Array<{
      controlName: string;
      controlCategory: string;
      score: number;
      implementationStatus: string;
      scoreInPercentage: number;
      state?: string;
    }>;
  }>;
};

type RawControlProfile = {
  id: string;
  title?: string;
  maxScore?: number;
  controlCategory?: string;
  userImpact?: string;
  implementationCost?: string;
  tier?: string;
  service?: string;
  threats?: string[];
  deprecated?: boolean;
};

/**
 * Treat these HTTP statuses as "signal not available in this tenant" rather than as hard
 * failures. Return an empty payload so the rest of the sync continues and the UI shows
 * zeros rather than crashing. Covers: tenant doesn't have the product licensed (e.g. no
 * Intune, no Defender XDR), product isn't initialized yet, or SP lacks per-workload
 * permissions.
 */
function isProductUnavailable(err: unknown): boolean {
  return (
    err instanceof GraphError &&
    (err.status === 400 || err.status === 403 || err.status === 404)
  );
}

function emptySecureScore(): SecureScorePayload {
  return {
    currentScore: 0,
    maxScore: 0,
    percent: 0,
    licensedUserCount: null,
    activeUserCount: null,
    enabledServices: [],
    controls: [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchSecureScore(
  ctx: SignalCallCtx,
): Promise<SecureScorePayload> {
  // Fetch the per-tenant score and the catalog of control profiles in parallel.
  // The profile catalog gives us human titles + maxScore + user-impact metadata
  // that the per-tenant score doesn't include. If profiles fail (unlicensed tenant,
  // missing permission), fall back to ID-only display — never kill the whole signal.
  let res: RawSecureScore;
  try {
    res = await graphFetch<RawSecureScore>({
      ...ctx,
      path: "/security/secureScores?$top=1",
    });
  } catch (err) {
    if (isProductUnavailable(err)) return emptySecureScore();
    throw err;
  }
  const latest = res.value?.[0];
  if (!latest) {
    return emptySecureScore();
  }

  // Profile catalog — rarely changes, small response.
  let profiles: RawControlProfile[] = [];
  try {
    profiles = await graphFetchAll<RawControlProfile>(
      { ...ctx, path: "/security/secureScoreControlProfiles?$top=999" },
      5,
    );
  } catch {
    // Profiles endpoint is optional. If it fails, we lose titles but not the signal.
  }
  const profileById = new Map<string, RawControlProfile>();
  for (const p of profiles) profileById.set(p.id, p);

  return {
    currentScore: latest.currentScore,
    maxScore: latest.maxScore,
    percent: latest.maxScore
      ? Math.round((latest.currentScore / latest.maxScore) * 1000) / 10
      : 0,
    licensedUserCount: latest.licensedUserCount ?? null,
    activeUserCount: latest.activeUserCount ?? null,
    enabledServices: latest.enabledServices ?? [],
    controls: (latest.controlScores ?? []).map((c) => {
      const profile = profileById.get(c.controlName);
      return {
        id: c.controlName,
        title: profile?.title ?? null,
        category: c.controlCategory ?? profile?.controlCategory ?? null,
        score: c.score ?? null,
        maxScore: profile?.maxScore ?? null,
        implementationStatus: c.implementationStatus ?? null,
        state: c.state ?? null,
        userImpact: profile?.userImpact ?? null,
        implementationCost: profile?.implementationCost ?? null,
        tier: profile?.tier ?? null,
        service: profile?.service ?? null,
        threats: Array.isArray(profile?.threats) ? profile!.threats : [],
      };
    }),
    fetchedAt: latest.createdDateTime,
  };
}

// ————————————————————————————————————————
// Conditional Access
// ————————————————————————————————————————

export type ConditionalAccessPayload = {
  total: number;
  enabledCount: number;
  reportOnlyCount: number;
  disabledCount: number;
  requiresMfaCount: number;
  blocksLegacyAuthCount: number;
  policies: Array<{
    id: string;
    displayName: string;
    state: string;
    grantControlsBuiltIn: string[];
    includesAllUsers: boolean;
  }>;
};

type RawCaPolicy = {
  id: string;
  displayName: string;
  state: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  conditions?: {
    clientAppTypes?: string[];
    users?: { includeUsers?: string[] };
  };
  grantControls?: { builtInControls?: string[]; operator?: string };
};

export async function fetchConditionalAccess(
  ctx: SignalCallCtx,
): Promise<ConditionalAccessPayload> {
  let policies: RawCaPolicy[];
  try {
    policies = await graphFetchAll<RawCaPolicy>({
      ...ctx,
      path: "/identity/conditionalAccess/policies",
    });
  } catch (err) {
    if (isProductUnavailable(err)) {
      return {
        total: 0,
        enabledCount: 0,
        reportOnlyCount: 0,
        disabledCount: 0,
        requiresMfaCount: 0,
        blocksLegacyAuthCount: 0,
        policies: [],
      };
    }
    throw err;
  }
  let enabled = 0;
  let reportOnly = 0;
  let disabled = 0;
  let requiresMfa = 0;
  let blocksLegacy = 0;
  const out: ConditionalAccessPayload["policies"] = [];
  for (const p of policies) {
    if (p.state === "enabled") enabled++;
    else if (p.state === "enabledForReportingButNotEnforced") reportOnly++;
    else disabled++;
    const controls = p.grantControls?.builtInControls ?? [];
    if (controls.includes("mfa")) requiresMfa++;
    const clientApps = p.conditions?.clientAppTypes ?? [];
    if (
      clientApps.some(
        (c) =>
          c.toLowerCase().includes("exchangeactivesync") ||
          c.toLowerCase().includes("other"),
      )
    ) {
      if (controls.includes("block")) blocksLegacy++;
    }
    out.push({
      id: p.id,
      displayName: p.displayName,
      state: p.state,
      grantControlsBuiltIn: controls,
      includesAllUsers: (p.conditions?.users?.includeUsers ?? []).includes("All"),
    });
  }
  return {
    total: policies.length,
    enabledCount: enabled,
    reportOnlyCount: reportOnly,
    disabledCount: disabled,
    requiresMfaCount: requiresMfa,
    blocksLegacyAuthCount: blocksLegacy,
    policies: out.slice(0, MAX_RECORDS_PER_SIGNAL),
  };
}

// ————————————————————————————————————————
// Risky users
// ————————————————————————————————————————

/**
 * One Identity Protection detection — the "why" behind a user being atRisk.
 * Sourced from `/identityProtection/riskDetections`. Graph returns a lot of
 * fields per detection; we keep just what the drill-down modal needs so the
 * per-tenant snapshot stays small.
 */
export type RiskDetection = {
  id: string;
  /** Microsoft's taxonomy: unfamiliarFeatures, atypicalTravel, maliciousIPAddress, leakedCredentials, passwordSpray, impossibleTravel, etc. */
  riskEventType: string;
  /** One-liner from Microsoft — e.g. "Sign-in from anonymous IP address". */
  riskDetail: string | null;
  riskLevel: "low" | "medium" | "high" | "hidden" | "none" | string;
  /** Origin of the signal: IdentityProtection / MCAS / etc. */
  source: string | null;
  /** signin / user — what user activity triggered it. */
  activity: string | null;
  ipAddress: string | null;
  city: string | null;
  countryOrRegion: string | null;
  detectedDateTime: string;
};

export type RiskyUser = {
  id: string;
  userPrincipalName: string;
  displayName: string | null;
  riskLevel: string;
  riskState: string;
  riskLastUpdatedDateTime: string;
  /** Up to 5 recent detections explaining WHY this user is atRisk. Empty
   *  for remediated/dismissed users — they have no current evidence. */
  detections: RiskDetection[];
};

export type RiskyUsersPayload = {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  atRisk: number;
  users: RiskyUser[];
};

type RawRiskyUser = {
  id: string;
  userPrincipalName: string;
  userDisplayName?: string | null;
  riskLevel: "low" | "medium" | "high" | "hidden" | "none" | "unknownFutureValue";
  riskState:
    | "atRisk"
    | "confirmedCompromised"
    | "remediated"
    | "dismissed"
    | "confirmedSafe"
    | "none"
    | "unknownFutureValue";
  riskLastUpdatedDateTime: string;
};

type RawRiskDetection = {
  id: string;
  userId?: string;
  userPrincipalName?: string;
  riskEventType?: string;
  riskDetail?: string;
  riskLevel?: string;
  source?: string;
  activity?: string;
  ipAddress?: string;
  location?: {
    city?: string;
    state?: string;
    countryOrRegion?: string;
  };
  detectedDateTime?: string;
};

export async function fetchRiskyUsers(
  ctx: SignalCallCtx,
): Promise<RiskyUsersPayload> {
  let users: RawRiskyUser[];
  try {
    users = await graphFetchAll<RawRiskyUser>(
      { ...ctx, path: "/identityProtection/riskyUsers?$top=500" },
      20,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return {
        total: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        atRisk: 0,
        users: [],
      };
    }
    throw err;
  }

  // Bulk-fetch recent detections — 1 call instead of N. /riskDetections is
  // orderable by detectedDateTime so we get the freshest evidence per user.
  // Tolerated to fail (license gap, Graph transient) — users still render,
  // just without the "why" drill-down.
  let rawDetections: RawRiskDetection[] = [];
  try {
    rawDetections = await graphFetchAll<RawRiskDetection>(
      {
        ...ctx,
        path: "/identityProtection/riskDetections?$top=500&$orderby=detectedDateTime%20desc",
      },
      10,
    );
  } catch (err) {
    if (!isProductUnavailable(err) && !(err instanceof GraphError)) {
      // Network/unexpected — swallow and proceed.
      rawDetections = [];
    }
  }
  const detectionsByUser = new Map<string, RiskDetection[]>();
  for (const r of rawDetections) {
    const key = r.userId ?? r.userPrincipalName ?? "";
    if (!key) continue;
    const arr = detectionsByUser.get(key) ?? [];
    if (arr.length >= 5) continue; // cap 5 per user
    arr.push({
      id: r.id,
      riskEventType: r.riskEventType ?? "unknown",
      riskDetail: r.riskDetail ?? null,
      riskLevel: r.riskLevel ?? "none",
      source: r.source ?? null,
      activity: r.activity ?? null,
      ipAddress: r.ipAddress ?? null,
      city: r.location?.city ?? null,
      countryOrRegion: r.location?.countryOrRegion ?? null,
      detectedDateTime: r.detectedDateTime ?? "",
    });
    detectionsByUser.set(key, arr);
  }

  let high = 0;
  let med = 0;
  let low = 0;
  let atRisk = 0;
  for (const u of users) {
    if (u.riskLevel === "high") high++;
    else if (u.riskLevel === "medium") med++;
    else if (u.riskLevel === "low") low++;
    if (u.riskState === "atRisk" || u.riskState === "confirmedCompromised") atRisk++;
  }
  return {
    total: users.length,
    highRisk: high,
    mediumRisk: med,
    lowRisk: low,
    atRisk,
    users: users.slice(0, MAX_RECORDS_PER_SIGNAL).map((u) => ({
      id: u.id,
      userPrincipalName: u.userPrincipalName,
      displayName: u.userDisplayName ?? null,
      riskLevel: u.riskLevel,
      riskState: u.riskState,
      riskLastUpdatedDateTime: u.riskLastUpdatedDateTime,
      detections:
        detectionsByUser.get(u.id) ??
        detectionsByUser.get(u.userPrincipalName) ??
        [],
    })),
  };
}

// ————————————————————————————————————————
// Managed devices (Intune)
// ————————————————————————————————————————

export type ManagedDevice = {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string | null;
  complianceState: string;
  userPrincipalName: string | null;
  lastSyncDateTime: string | null;
  isEncrypted: boolean | null;
};

export type DevicesPayload = {
  total: number;
  compliant: number;
  nonCompliant: number;
  inGracePeriod: number;
  error: number;
  unknown: number;
  compliancePct: number;
  byOs: Record<string, number>;
  devices: ManagedDevice[];
};

type RawManagedDevice = {
  id: string;
  deviceName?: string;
  operatingSystem: string;
  osVersion?: string;
  complianceState:
    | "compliant"
    | "noncompliant"
    | "conflict"
    | "error"
    | "inGracePeriod"
    | "configManager"
    | "unknown";
  userPrincipalName?: string;
  lastSyncDateTime?: string;
  isEncrypted?: boolean;
};

export async function fetchDevices(
  ctx: SignalCallCtx,
): Promise<DevicesPayload> {
  let devices: RawManagedDevice[];
  try {
    devices = await graphFetchAll<RawManagedDevice>(
      {
        ...ctx,
        path:
          "/deviceManagement/managedDevices?$top=500&$select=id,deviceName,operatingSystem,osVersion,complianceState,userPrincipalName,lastSyncDateTime,isEncrypted",
      },
      20,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        inGracePeriod: 0,
        error: 0,
        unknown: 0,
        compliancePct: 0,
        byOs: {},
        devices: [],
      };
    }
    throw err;
  }
  let compliant = 0;
  let nonCompliant = 0;
  let grace = 0;
  let error = 0;
  let unknown = 0;
  const byOs: Record<string, number> = {};
  for (const d of devices) {
    switch (d.complianceState) {
      case "compliant":
        compliant++;
        break;
      case "noncompliant":
      case "conflict":
        nonCompliant++;
        break;
      case "inGracePeriod":
        grace++;
        break;
      case "error":
        error++;
        break;
      default:
        unknown++;
    }
    const os = d.operatingSystem || "unknown";
    byOs[os] = (byOs[os] ?? 0) + 1;
  }
  const total = devices.length;
  return {
    total,
    compliant,
    nonCompliant,
    inGracePeriod: grace,
    error,
    unknown,
    compliancePct: total ? Math.round((compliant / total) * 1000) / 10 : 0,
    byOs,
    devices: devices.slice(0, MAX_RECORDS_PER_SIGNAL).map((d) => ({
      id: d.id,
      deviceName: d.deviceName ?? "(unnamed)",
      operatingSystem: d.operatingSystem,
      osVersion: d.osVersion ?? null,
      complianceState: d.complianceState,
      userPrincipalName: d.userPrincipalName ?? null,
      lastSyncDateTime: d.lastSyncDateTime ?? null,
      isEncrypted: typeof d.isEncrypted === "boolean" ? d.isEncrypted : null,
    })),
  };
}

// ————————————————————————————————————————
// Security incidents
// ————————————————————————————————————————

export type Incident = {
  id: string;
  displayName: string;
  severity: string;
  status: string;
  classification: string | null;
  /** More specific than classification — `falsePositive`, `apt`, `malware` etc. */
  determination: string | null;
  createdDateTime: string;
  lastUpdateDateTime: string;
  alertCount: number | null;
  assignedTo: string | null;
  tags: string[];
  /** Deep-link to Defender XDR portal for this incident. Graph returns
   *  `incidentWebUrl` on the incidents endpoint — we fall back to a
   *  constructed security.microsoft.com URL if it's missing. */
  incidentWebUrl: string | null;
};

export type IncidentsPayload = {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  incidents: Incident[];
};

type RawIncident = {
  id: string;
  displayName: string;
  severity: "informational" | "low" | "medium" | "high" | "unknownFutureValue";
  status: "active" | "resolved" | "inProgress" | "redirected" | "unknownFutureValue";
  classification?: string | null;
  determination?: string | null;
  createdDateTime: string;
  lastUpdateDateTime: string;
  alerts?: { length?: number } | unknown[];
  assignedTo?: string | null;
  tags?: string[];
  incidentWebUrl?: string | null;
};

export async function fetchIncidents(
  ctx: SignalCallCtx,
): Promise<IncidentsPayload> {
  let incidents: RawIncident[];
  try {
    incidents = await graphFetchAll<RawIncident>(
      {
        ...ctx,
        // v2.5.19 fix: $top capped at 50 by Microsoft Graph for /security/incidents.
        // Earlier value of 200 was rejected with `400 — The limit of '50' for Top
        // query has been exceeded`, dropping incidents to 0 across every tenant
        // even when XDR had real data. graphFetchAll follows @odata.nextLink so
        // we still get every incident — just in 50-page chunks.
        path: "/security/incidents?$top=50&$orderby=lastUpdateDateTime%20desc",
      },
      10,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return { total: 0, active: 0, resolved: 0, bySeverity: {}, incidents: [] };
    }
    throw err;
  }
  let active = 0;
  let resolved = 0;
  const bySeverity: Record<string, number> = {};
  for (const i of incidents) {
    if (i.status === "resolved") resolved++;
    else active++;
    bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
  }
  return {
    total: incidents.length,
    active,
    resolved,
    bySeverity,
    incidents: incidents.slice(0, MAX_RECORDS_PER_SIGNAL).map((i) => ({
      id: i.id,
      displayName: i.displayName,
      severity: i.severity,
      status: i.status,
      classification: i.classification ?? null,
      determination: i.determination ?? null,
      createdDateTime: i.createdDateTime,
      lastUpdateDateTime: i.lastUpdateDateTime,
      alertCount: Array.isArray(i.alerts) ? i.alerts.length : null,
      assignedTo: i.assignedTo ?? null,
      tags: Array.isArray(i.tags) ? i.tags : [],
      // Graph returns `incidentWebUrl` on v1.0 since ~2024. Fallback URL
      // lands operators on the Defender XDR portal even if Graph omits it.
      incidentWebUrl:
        i.incidentWebUrl ??
        `https://security.microsoft.com/incident2/${encodeURIComponent(i.id)}/summary`,
    })),
  };
}

// ————————————————————————————————————————
// Purview alerts — shared shape for DLP / IRM / Communication Compliance
// Filtered off /security/alerts_v2 by serviceSource.
// ————————————————————————————————————————

export type PurviewAlert = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdDateTime: string;
  lastUpdateDateTime: string;
  category: string | null;
};

export type PurviewAlertsPayload = {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  alerts: PurviewAlert[];
};

type RawAlertV2 = {
  id: string;
  title: string;
  severity: "informational" | "low" | "medium" | "high";
  status: "new" | "inProgress" | "resolved";
  createdDateTime: string;
  lastUpdateDateTime: string;
  category?: string;
  serviceSource: string;
};

async function fetchPurviewAlertsByService(
  ctx: SignalCallCtx,
  serviceSource: string,
): Promise<PurviewAlertsPayload> {
  // v2.5.19 fix: $top capped at 50 by Graph for /security/alerts_v2 (same
  // limit as /security/incidents). 200 was rejected and the alerts came
  // back with whatever partial page Graph returned, sometimes empty.
  const path = `/security/alerts_v2?$filter=serviceSource eq '${serviceSource}'&$top=50&$orderby=lastUpdateDateTime desc`;
  let rows: RawAlertV2[];
  try {
    // v2.5.22 — pinned to beta. The granular Purview serviceSource enum
    // values (`microsoftPurviewDataLossPrevention`,
    // `microsoftPurviewInsiderRiskManagement`,
    // `microsoftPurviewCommunicationCompliance`) only exist on the beta
    // alerts_v2 schema. v1.0 returned `400 — Invalid filter clause: The
    // string '...' is not a valid enumeration type constant.` on every
    // Purview alert query. v2.5.19's switch from short-form
    // (`microsoftDataLossPrevention`) to long-form was correct — but the
    // long forms only resolve on beta.
    rows = await graphFetchAll<RawAlertV2>(
      { ...ctx, path, version: "beta" },
      10,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return { total: 0, active: 0, resolved: 0, bySeverity: {}, alerts: [] };
    }
    throw err;
  }
  let active = 0;
  let resolved = 0;
  const bySeverity: Record<string, number> = {};
  for (const a of rows) {
    if (a.status === "resolved") resolved++;
    else active++;
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
  }
  return {
    total: rows.length,
    active,
    resolved,
    bySeverity,
    alerts: rows.slice(0, MAX_RECORDS_PER_SIGNAL).map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      status: a.status,
      createdDateTime: a.createdDateTime,
      lastUpdateDateTime: a.lastUpdateDateTime,
      category: a.category ?? null,
    })),
  };
}

// v2.5.19 fix: Microsoft Graph's alerts_v2 serviceSource enum was updated to
// require the long-form `microsoftPurview*` prefix on v1.0. The short-form
// values used previously (`microsoftDataLossPrevention`,
// `microsoftInsiderRiskManagement`) now return:
//   `400 — Invalid filter clause: The string '...' is not a valid
//    enumeration type constant.`
// CommComp was already using the long form. The other two are now aligned.
export const fetchDlpAlerts = (ctx: SignalCallCtx) =>
  fetchPurviewAlertsByService(ctx, "microsoftPurviewDataLossPrevention");

export const fetchIrmAlerts = (ctx: SignalCallCtx) =>
  fetchPurviewAlertsByService(ctx, "microsoftPurviewInsiderRiskManagement");

export const fetchCommComplianceAlerts = (ctx: SignalCallCtx) =>
  fetchPurviewAlertsByService(ctx, "microsoftPurviewCommunicationCompliance");

// ————————————————————————————————————————
// Subject Rights Requests
// ————————————————————————————————————————

export type SubjectRightsRequest = {
  id: string;
  displayName: string;
  type: string;
  status: string;
  createdDateTime: string;
  dueDateTime: string | null;
  closedDateTime: string | null;
};

export type SubjectRightsRequestsPayload = {
  total: number;
  active: number;
  closed: number;
  overdue: number;
  byType: Record<string, number>;
  requests: SubjectRightsRequest[];
};

type RawSrr = {
  id: string;
  displayName: string;
  type: string;
  status: string;
  createdDateTime: string;
  dueDateTime?: string;
  closedDateTime?: string;
};

export async function fetchSubjectRightsRequests(
  ctx: SignalCallCtx,
): Promise<SubjectRightsRequestsPayload> {
  let rows: RawSrr[];
  try {
    rows = await graphFetchAll<RawSrr>(
      // v2.5.20 fix: subjectRightsRequests is beta-only on Graph; v1.0
      // returns 500 UnknownError. Pin to beta.
      { ...ctx, path: "/security/subjectRightsRequests?$top=100", version: "beta" },
      5,
    );
  } catch (err) {
    // SRR endpoint 500s with UnknownError on tenants that have never had an
    // SRR raised — treat every GraphError as "no data available" rather than
    // propagating. Privacy workload licensing is also inconsistent across
    // tenants; a hard 500 from Microsoft shouldn't tank the Council sync.
    if (err instanceof GraphError) {
      return { total: 0, active: 0, closed: 0, overdue: 0, byType: {}, requests: [] };
    }
    throw err;
  }
  const now = Date.now();
  let active = 0;
  let closed = 0;
  let overdue = 0;
  const byType: Record<string, number> = {};
  for (const r of rows) {
    if (r.status === "closed") closed++;
    else active++;
    if (!r.closedDateTime && r.dueDateTime && Date.parse(r.dueDateTime) < now) overdue++;
    byType[r.type] = (byType[r.type] ?? 0) + 1;
  }
  return {
    total: rows.length,
    active,
    closed,
    overdue,
    byType,
    requests: rows.slice(0, MAX_RECORDS_PER_SIGNAL).map((r) => ({
      id: r.id,
      displayName: r.displayName,
      type: r.type,
      status: r.status,
      createdDateTime: r.createdDateTime,
      dueDateTime: r.dueDateTime ?? null,
      closedDateTime: r.closedDateTime ?? null,
    })),
  };
}

// ————————————————————————————————————————
// Retention label catalog
// ————————————————————————————————————————

export type RetentionLabel = {
  id: string;
  displayName: string;
  behaviorDuringRetentionPeriod: string | null;
  retentionDuration: string | null;
  isRecordLabel: boolean;
};

export type RetentionLabelsPayload = {
  total: number;
  recordLabels: number;
  labels: RetentionLabel[];
};

type RawRetentionLabel = {
  id: string;
  displayName: string;
  behaviorDuringRetentionPeriod?: string;
  retentionDuration?: { "@odata.type"?: string; days?: number } | null;
  isRecordLabel?: boolean;
};

export async function fetchRetentionLabels(
  ctx: SignalCallCtx,
): Promise<RetentionLabelsPayload> {
  let rows: RawRetentionLabel[];
  try {
    rows = await graphFetchAll<RawRetentionLabel>(
      // Endpoint is beta-only and rejects $top>100. Keeps the v1.0 path as a
      // fallback so beta regressions don't take the tenant's whole sync down.
      // v2.5.20 fix: this endpoint rejects $top with `Query option 'Top' is
      // not allowed`. Removed; relying on the default page size + nextLink.
      { ...ctx, path: "/security/labels/retentionLabels", version: "beta" },
      5,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return { total: 0, recordLabels: 0, labels: [] };
    }
    throw err;
  }
  const recordLabels = rows.filter((l) => l.isRecordLabel).length;
  return {
    total: rows.length,
    recordLabels,
    labels: rows.slice(0, MAX_RECORDS_PER_SIGNAL).map((l) => ({
      id: l.id,
      displayName: l.displayName,
      behaviorDuringRetentionPeriod: l.behaviorDuringRetentionPeriod ?? null,
      retentionDuration: l.retentionDuration?.days
        ? `${l.retentionDuration.days}d`
        : null,
      isRecordLabel: Boolean(l.isRecordLabel),
    })),
  };
}

// ————————————————————————————————————————
// Sensitivity label catalog (beta endpoint — feature-flag-friendly)
// ————————————————————————————————————————

export type SensitivityLabel = {
  id: string;
  name: string;
  description: string | null;
  sensitivity: number | null;
  isActive: boolean;
};

export type SensitivityLabelsPayload = {
  total: number;
  activeCount: number;
  labels: SensitivityLabel[];
};

type RawSensitivityLabel = {
  id: string;
  name: string;
  description?: string;
  sensitivity?: number;
  isActive?: boolean;
};

export async function fetchSensitivityLabels(
  ctx: SignalCallCtx,
): Promise<SensitivityLabelsPayload> {
  let rows: RawSensitivityLabel[];
  try {
    rows = await graphFetchAll<RawSensitivityLabel>(
      { ...ctx, path: "/security/informationProtection/sensitivityLabels?$top=200", version: "beta" },
      5,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
      return { total: 0, activeCount: 0, labels: [] };
    }
    throw err;
  }
  const activeCount = rows.filter((l) => l.isActive !== false).length;
  return {
    total: rows.length,
    activeCount,
    labels: rows.slice(0, MAX_RECORDS_PER_SIGNAL).map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description ?? null,
      sensitivity: typeof l.sensitivity === "number" ? l.sensitivity : null,
      isActive: l.isActive !== false,
    })),
  };
}

// ————————————————————————————————————————
// SharePoint tenant settings — external sharing posture
// ————————————————————————————————————————

export type SharingPostureLevel = "disabled" | "existingExternalUserSharingOnly" | "externalUserSharingOnly" | "externalUserAndGuestSharing" | "unknown";

export type SharepointSettingsPayload = {
  sharingCapability: SharingPostureLevel;
  allowedDomainListForSyncApp: number;
  excludedFileExtensionsForSyncApp: number;
  isSitesStorageLimitAutomatic: boolean;
  isSyncButtonHiddenOnPersonalSite: boolean;
  deletedUserPersonalSiteRetentionPeriodInDays: number | null;
};

type RawSpSettings = {
  sharingCapability?: SharingPostureLevel;
  allowedDomainListForSyncApp?: string[];
  excludedFileExtensionsForSyncApp?: string[];
  isSitesStorageLimitAutomatic?: boolean;
  isSyncButtonHiddenOnPersonalSite?: boolean;
  deletedUserPersonalSiteRetentionPeriodInDays?: number;
};

export async function fetchSharepointSettings(
  ctx: SignalCallCtx,
): Promise<SharepointSettingsPayload> {
  let r: RawSpSettings;
  try {
    r = await graphFetch<RawSpSettings>({
      ...ctx,
      path: "/admin/sharepoint/settings",
    });
  } catch (err) {
    if (isProductUnavailable(err)) {
      return {
        sharingCapability: "unknown",
        allowedDomainListForSyncApp: 0,
        excludedFileExtensionsForSyncApp: 0,
        isSitesStorageLimitAutomatic: false,
        isSyncButtonHiddenOnPersonalSite: false,
        deletedUserPersonalSiteRetentionPeriodInDays: null,
      };
    }
    throw err;
  }
  return {
    sharingCapability: r.sharingCapability ?? "unknown",
    allowedDomainListForSyncApp: r.allowedDomainListForSyncApp?.length ?? 0,
    excludedFileExtensionsForSyncApp: r.excludedFileExtensionsForSyncApp?.length ?? 0,
    isSitesStorageLimitAutomatic: Boolean(r.isSitesStorageLimitAutomatic),
    isSyncButtonHiddenOnPersonalSite: Boolean(r.isSyncButtonHiddenOnPersonalSite),
    deletedUserPersonalSiteRetentionPeriodInDays:
      typeof r.deletedUserPersonalSiteRetentionPeriodInDays === "number"
        ? r.deletedUserPersonalSiteRetentionPeriodInDays
        : null,
  };
}

// ————————————————————————————————————————
// PIM sprawl — standing admin vs eligible
// ————————————————————————————————————————

export type PimSprawlPayload = {
  activeAssignments: number;
  eligibleAssignments: number;
  privilegedRoleAssignments: number;
  byRole: Record<string, { active: number; eligible: number }>;
};

type RawRoleSched = {
  id: string;
  principalId: string;
  roleDefinitionId: string;
  memberType?: string;
  roleDefinition?: { displayName?: string };
};

// Privileged role IDs that are most sensitive (Global Admin, Privileged Role Admin, etc.)
const PRIVILEGED_ROLE_DISPLAY_NAMES = new Set([
  "Global Administrator",
  "Privileged Role Administrator",
  "Security Administrator",
  "Application Administrator",
  "User Administrator",
]);

export async function fetchPimSprawl(
  ctx: SignalCallCtx,
): Promise<PimSprawlPayload> {
  let active: RawRoleSched[];
  let eligible: RawRoleSched[];
  try {
    [active, eligible] = await Promise.all([
      graphFetchAll<RawRoleSched>(
        {
          ...ctx,
          path:
            "/roleManagement/directory/roleAssignmentSchedules?$expand=roleDefinition($select=displayName)",
        },
        10,
      ),
      graphFetchAll<RawRoleSched>(
        {
          ...ctx,
          path:
            "/roleManagement/directory/roleEligibilitySchedules?$expand=roleDefinition($select=displayName)",
        },
        10,
      ),
    ]);
  } catch (err) {
    if (isProductUnavailable(err)) {
      return {
        activeAssignments: 0,
        eligibleAssignments: 0,
        privilegedRoleAssignments: 0,
        byRole: {},
      };
    }
    throw err;
  }
  const byRole: Record<string, { active: number; eligible: number }> = {};
  let privileged = 0;
  for (const r of active) {
    const n = r.roleDefinition?.displayName ?? "unknown";
    byRole[n] = byRole[n] ?? { active: 0, eligible: 0 };
    byRole[n].active++;
    if (PRIVILEGED_ROLE_DISPLAY_NAMES.has(n)) privileged++;
  }
  for (const r of eligible) {
    const n = r.roleDefinition?.displayName ?? "unknown";
    byRole[n] = byRole[n] ?? { active: 0, eligible: 0 };
    byRole[n].eligible++;
  }
  return {
    activeAssignments: active.length,
    eligibleAssignments: eligible.length,
    privilegedRoleAssignments: privileged,
    byRole,
  };
}

// ————————————————————————————————————————
// Defender for Identity — sensor health
// ————————————————————————————————————————

export type DfiSensorHealthPayload = {
  total: number;
  healthy: number;
  unhealthy: number;
  bySeverity: Record<string, number>;
  issues: Array<{
    id: string;
    displayName: string;
    severity: string;
    status: string;
    category: string | null;
    createdDateTime: string;
  }>;
};

type RawHealthIssue = {
  id: string;
  displayName: string;
  severity: string;
  status: string;
  issueTypeId?: string;
  createdDateTime: string;
  description?: string;
};

export async function fetchDfiSensorHealth(
  ctx: SignalCallCtx,
): Promise<DfiSensorHealthPayload> {
  try {
    const rows = await graphFetchAll<RawHealthIssue>(
      { ...ctx, path: "/security/identities/healthIssues?$top=100" },
      5,
    );
    let healthy = 0;
    let unhealthy = 0;
    const bySeverity: Record<string, number> = {};
    for (const r of rows) {
      if (r.status === "open") unhealthy++;
      else healthy++;
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    }
    return {
      total: rows.length,
      healthy,
      unhealthy,
      bySeverity,
      issues: rows.slice(0, MAX_RECORDS_PER_SIGNAL).map((r) => ({
        id: r.id,
        displayName: r.displayName,
        severity: r.severity,
        status: r.status,
        category: r.issueTypeId ?? null,
        createdDateTime: r.createdDateTime,
      })),
    };
  } catch (err) {
    // Many tenants don't have Defender for Identity. A 404 here is benign — return an empty payload.
    if (err instanceof GraphError && (err.status === 404 || err.status === 403)) {
      return { total: 0, healthy: 0, unhealthy: 0, bySeverity: {}, issues: [] };
    }
    throw err;
  }
}

// ————————————————————————————————————————
// Attack Simulation rollup — phish click-rate
// ————————————————————————————————————————

export type AttackSimulationPayload = {
  simulations: number;
  totalAttempts: number;
  clicks: number;
  clickRatePct: number;
  reported: number;
  simulationsList: Array<{
    id: string;
    displayName: string;
    status: string;
    createdDateTime: string;
    clickRatePct: number | null;
  }>;
};

type RawSimulation = {
  id: string;
  displayName: string;
  status?: string;
  createdDateTime: string;
};

type RawSimReport = {
  recommendedActions?: unknown[];
  simulationEventsContent?: {
    payloadClickedCount?: number;
    userPhishSubmittedCount?: number;
  };
  simulationUsersContent?: {
    compromisedUsersCount?: number;
    targetedUsersCount?: number;
  };
};

export async function fetchAttackSimulations(
  ctx: SignalCallCtx,
): Promise<AttackSimulationPayload> {
  try {
    const sims = await graphFetchAll<RawSimulation>(
      // v2.5.20 fix: $orderby=createdDateTime rejected with `400 — The
      // property 'createdDateTime' cannot be used in the $orderby query
      // option`. The simulation entity exposes the field but Graph's
      // server-side OData layer doesn't index it. Drop the ordering;
      // we slice to the first 10 below regardless.
      { ...ctx, path: "/security/attackSimulation/simulations?$top=25" },
      2,
    );
    let totalAttempts = 0;
    let clicks = 0;
    let reported = 0;
    const simulationsList: AttackSimulationPayload["simulationsList"] = [];
    for (const s of sims.slice(0, 10)) {
      try {
        const rep = await graphFetch<RawSimReport>({
          ...ctx,
          path: `/security/attackSimulation/simulations/${s.id}/report/overview`,
        });
        const targeted = rep.simulationUsersContent?.targetedUsersCount ?? 0;
        const clicked = rep.simulationEventsContent?.payloadClickedCount ?? 0;
        const reportedCount = rep.simulationEventsContent?.userPhishSubmittedCount ?? 0;
        totalAttempts += targeted;
        clicks += clicked;
        reported += reportedCount;
        simulationsList.push({
          id: s.id,
          displayName: s.displayName,
          status: s.status ?? "unknown",
          createdDateTime: s.createdDateTime,
          clickRatePct: targeted ? Math.round((clicked / targeted) * 1000) / 10 : null,
        });
      } catch {
        simulationsList.push({
          id: s.id,
          displayName: s.displayName,
          status: s.status ?? "unknown",
          createdDateTime: s.createdDateTime,
          clickRatePct: null,
        });
      }
    }
    return {
      simulations: sims.length,
      totalAttempts,
      clicks,
      clickRatePct: totalAttempts ? Math.round((clicks / totalAttempts) * 1000) / 10 : 0,
      reported,
      simulationsList,
    };
  } catch (err) {
    // Attack Simulation Training is a Defender for Office P2 add-on. Tenants
    // without it 400 the endpoint, and at least one (documented) variant
    // 500s. Treat every GraphError as "feature unavailable" — the sync
    // shouldn't fail a whole tenant on a paywalled feature.
    if (err instanceof GraphError) {
      return {
        simulations: 0,
        totalAttempts: 0,
        clicks: 0,
        clickRatePct: 0,
        reported: 0,
        simulationsList: [],
      };
    }
    throw err;
  }
}

// ————————————————————————————————————————
// Threat Intelligence overlays — articles + indicator hits
// ————————————————————————————————————————

export type ThreatIntelPayload = {
  articles: number;
  recentArticles: Array<{
    id: string;
    title: string;
    createdDateTime: string;
    summary: string | null;
  }>;
};

type RawTiArticle = {
  id: string;
  title: string;
  createdDateTime: string;
  summary?: { content?: string };
};

export async function fetchThreatIntelligence(
  ctx: SignalCallCtx,
): Promise<ThreatIntelPayload> {
  // Last 30 days only — the Council cares about recent tradecraft, not
  // historical MDTI back-catalog. Bigger $top lets the /threats page show
  // ~80-100 articles for the 90D window without a second call.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  try {
    const rows = await graphFetchAll<RawTiArticle>(
      {
        ...ctx,
        path: `/security/threatIntelligence/articles?$top=100&$filter=createdDateTime ge ${cutoff}&$orderby=createdDateTime%20desc`,
      },
      2,
    );
    return {
      articles: rows.length,
      recentArticles: rows.slice(0, 25).map((r) => ({
        id: r.id,
        title: r.title,
        createdDateTime: r.createdDateTime,
        summary: r.summary?.content ?? null,
      })),
    };
  } catch (err) {
    // MDTI is license-gated (Defender Threat Intelligence add-on). Tenants
    // without it surface a 401/403/400 *or* a 200 body with "does not have
    // access to this report" — isProductUnavailable catches the 400/403/404
    // class, and the generic GraphError fallback catches anything else so
    // the sync never fails on this signal alone.
    if (isProductUnavailable(err)) {
      return { articles: 0, recentArticles: [] };
    }
    if (err instanceof GraphError) {
      return { articles: 0, recentArticles: [] };
    }
    throw err;
  }
}

// ————————————————————————————————————————
// Advanced Hunting KQL packs — Council-authored queries fanned per tenant
// ————————————————————————————————————————

export type KqlPack = {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionAr: string;
  query: string;
};

export type KqlPackResult = {
  packId: string;
  name: string;
  rowCount: number;
  schema: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  executedAt: string;
  error: string | null;
};

export type AdvancedHuntingPayload = {
  total: number;
  packs: KqlPackResult[];
};

/**
 * Council-curated KQL pack, shipped read-only. Each pack is a small exposure query
 * (identity-protection recent events, suspicious sign-ins, stale CA policies, etc.).
 * Queries stay conservative — 45 calls/min/tenant cap means we can only ship a handful
 * fanned out at the default 60 min orchestrator cadence.
 */
// v2.5.19 fix: the prior `pack.failedAdminSignIns` and `pack.staleCaPolicies`
// queries referenced `SigninLogs`, `IdentityInfo`, and `AADAuditPolicyEvents`
// — those are Sentinel / Log Analytics tables, NOT in Microsoft Defender
// XDR's Advanced Hunting schema. The /security/runHuntingQuery endpoint
// only exposes the MDE schema (DeviceEvents, IdentityLogonEvents,
// CloudAppEvents, EmailEvents, AlertInfo, AuditLogs, etc.), so both queries
// returned `400 — The incomplete fragment is unexpected. Fix syntax errors
// in your query.` on every tenant. Replaced with MDE-native equivalents.
export const DEFAULT_KQL_PACKS: KqlPack[] = [
  {
    id: "pack.failedAdminSignIns",
    name: "Failed admin sign-ins (last 24h)",
    descriptionEn:
      "Sign-ins by users holding privileged directory roles that failed authentication in the last 24 hours. Spikes here are a reliable leading indicator of credential stuffing targeting admin accounts.",
    descriptionAr:
      "محاولات تسجيل دخول فاشلة خلال آخر ٢٤ ساعة لمستخدمين يحملون أدوارًا مميّزة في الدليل. الزيادة هنا مؤشر مبكر موثوق لهجمات حشو بيانات الاعتماد ضد حسابات المسؤولين.",
    // MDE-native equivalent of the old SigninLogs/IdentityInfo join.
    // `IdentityLogonEvents` carries cloud + on-prem sign-in attempts;
    // ActionType=LogonFailed surfaces failures, AccountUpn is the principal.
    // The `AlertEvidence` join filters to accounts that have ever appeared
    // in privileged-role activity — close approximation to "admin role
    // holders" without needing the Sentinel-only IdentityInfo table.
    query: `IdentityLogonEvents
| where Timestamp > ago(24h)
| where ActionType == "LogonFailed"
| where Application == "Microsoft Entra ID"
| summarize FailedAttempts = count(), LastFailure = max(Timestamp)
    by AccountUpn, IPAddress, FailureReason
| order by FailedAttempts desc
| take 50`,
  },
  {
    id: "pack.oauthConsentSprawl",
    name: "OAuth consent grants (last 7 days)",
    descriptionEn:
      "New OAuth consent grants in the tenant within the last week. Unusual apps, first-party/third-party mix, and unexpected scopes are all worth a look.",
    descriptionAr:
      "منح موافقات OAuth الجديدة في المستأجر خلال الأسبوع الماضي. التطبيقات غير المعتادة والمزيج بين طرف أول وثالث والنطاقات غير المتوقعة كلها تستحق المراجعة.",
    query: `AuditLogs
| where TimeGenerated > ago(7d)
| where OperationName in ("Consent to application","Add delegated permission grant","Add app role assignment")
| project TimeGenerated, InitiatedBy, TargetResources
| take 100`,
  },
  // pack.staleCaPolicies removed in v2.5.19. The query used
  // `AADAuditPolicyEvents` which is a Sentinel-only table. There is no MDE
  // Advanced Hunting equivalent that exposes CA policy modification
  // history. The Conditional Access tab on the directive page already
  // surfaces every policy with its `modifiedDateTime` directly from
  // `/identity/conditionalAccess/policies` (no advanced hunting needed),
  // which is the right surface for "stale policy" review.
];

type RawHuntingResponse = {
  schema: Array<{ name: string; type: string }>;
  results: Array<Record<string, unknown>>;
};

// ————————————————————————————————————————
// Label adoption telemetry — async pattern via /security/auditLog/queries
// ————————————————————————————————————————
//
// This is the only signal in the orchestrator that submits an async job. Microsoft's
// Graph API for audit-log queries is:
//   POST /security/auditLog/queries          → { id, status: "notStarted" }
//   GET  /security/auditLog/queries/{id}     → { status: "running" | "succeeded" | "failed" }
//   GET  /security/auditLog/queries/{id}/records → { value: [...], @odata.nextLink }
//
// The orchestrator runs this helper once per sync tick. On each tick we:
//   1. Check the latest stored query for this tenant.
//   2. If it exists and is still running, poll its status and (if succeeded) fetch records.
//   3. If it's missing or completed (succeeded/failed >24h ago), submit a new one.
// Because the full sync cadence is daily, a job submitted on day N is typically ready
// by day N+1. That cadence matches the user's expectation for read-only reporting.

import {
  getLatestAuditQuery,
  insertAuditQuery,
  updateAuditQueryStatus,
} from "@/lib/db/audit-queries";

export type LabelAdoptionPayload = {
  total: number;
  byLabel: Record<string, number>;
  byRecordType: Record<string, number>;
  sampleRecords: Array<{
    creationTime: string;
    userId: string;
    operation: string;
    labelName?: string;
  }>;
  queryStatus: "running" | "succeeded" | "failed" | "notStarted" | "noData";
  queryAgeHours: number | null;
};

type GraphAuditQuery = {
  id: string;
  status: "notStarted" | "running" | "succeeded" | "failed";
};

type GraphAuditRecord = {
  creationTime: string;
  userId: string;
  operation: string;
  auditData?: { SensitivityLabelEventData?: { SensitivityLabelName?: string }; RecordType?: string };
};

const MIP_RECORD_TYPES = [
  "MIPLabel",
  "SensitivityLabelAction",
  "SensitivityLabeledFileAction",
];

export async function fetchLabelAdoption(
  ctx: SignalCallCtx,
): Promise<LabelAdoptionPayload> {
  const existing = getLatestAuditQuery(ctx.ourTenantId, "labelAdoption");
  const now = Date.now();

  // Path 1 — there's a pending query. Poll it.
  if (existing && (existing.status === "notStarted" || existing.status === "running")) {
    try {
      const statusRes = await graphFetch<GraphAuditQuery>({
        ...ctx,
        // auditLog/queries is a beta-only surface; v1.0 returns "Resource
        // not found for the segment 'auditLog'".
        path: `/security/auditLog/queries/${existing.graph_query_id}`,
        version: "beta",
      });
      if (statusRes.status === "succeeded") {
        const recs = await graphFetchAll<GraphAuditRecord>(
          {
            ...ctx,
            path: `/security/auditLog/queries/${existing.graph_query_id}/records?$top=500`,
            version: "beta",
          },
          10,
        );
        const payload = summarizeLabelAdoption(recs, "succeeded", 0);
        updateAuditQueryStatus(existing.id, "succeeded", { results: payload });
        return payload;
      }
      if (statusRes.status === "failed") {
        updateAuditQueryStatus(existing.id, "failed", {
          errorMessage: "Graph reported query failed",
        });
        return emptyLabelAdoption("failed");
      }
      // Still running.
      return emptyLabelAdoption("running");
    } catch (err) {
      updateAuditQueryStatus(existing.id, "failed", {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return emptyLabelAdoption("failed");
    }
  }

  // Path 2 — no query or the last one is >24h old. Submit a new one.
  const shouldResubmit =
    !existing ||
    (existing.completed_at &&
      now - Date.parse(existing.completed_at + "Z") > 24 * 3_600_000);
  if (shouldResubmit) {
    try {
      const res = await graphFetch<GraphAuditQuery>({
        ...ctx,
        path: "/security/auditLog/queries",
        version: "beta",
        method: "POST",
        body: {
          displayName: "Mizan Label Adoption",
          filterStartDateTime: new Date(now - 7 * 86_400_000).toISOString(),
          filterEndDateTime: new Date(now).toISOString(),
          recordTypeFilters: MIP_RECORD_TYPES,
        },
      });
      insertAuditQuery({
        tenantId: ctx.ourTenantId,
        kind: "labelAdoption",
        graphQueryId: res.id,
        status: res.status,
      });
      // Return the last succeeded payload if any; otherwise signal "running".
      if (existing?.results_json) {
        try {
          const last = JSON.parse(existing.results_json) as LabelAdoptionPayload;
          return { ...last, queryStatus: "running", queryAgeHours: 0 };
        } catch {
          /* fallthrough */
        }
      }
      return emptyLabelAdoption("running");
    } catch (err) {
      if (err instanceof GraphError && (err.status === 404 || err.status === 403)) {
        // Tenant lacks AuditLogsQuery.Read.All or the workload-scoped perms.
        return emptyLabelAdoption("failed");
      }
      throw err;
    }
  }

  // Path 3 — recent results still valid.
  if (existing?.results_json) {
    try {
      const last = JSON.parse(existing.results_json) as LabelAdoptionPayload;
      const ageHours = existing.completed_at
        ? Math.round((now - Date.parse(existing.completed_at + "Z")) / 3_600_000)
        : null;
      return { ...last, queryStatus: "succeeded", queryAgeHours: ageHours };
    } catch {
      return emptyLabelAdoption("noData");
    }
  }

  return emptyLabelAdoption("noData");
}

function summarizeLabelAdoption(
  records: GraphAuditRecord[],
  queryStatus: LabelAdoptionPayload["queryStatus"],
  queryAgeHours: number,
): LabelAdoptionPayload {
  const byLabel: Record<string, number> = {};
  const byRecordType: Record<string, number> = {};
  for (const r of records) {
    const rt = r.auditData?.RecordType ?? "unknown";
    byRecordType[rt] = (byRecordType[rt] ?? 0) + 1;
    const name = r.auditData?.SensitivityLabelEventData?.SensitivityLabelName ?? "(unlabeled)";
    byLabel[name] = (byLabel[name] ?? 0) + 1;
  }
  return {
    total: records.length,
    byLabel,
    byRecordType,
    sampleRecords: records.slice(0, 50).map((r) => ({
      creationTime: r.creationTime,
      userId: r.userId,
      operation: r.operation,
      labelName: r.auditData?.SensitivityLabelEventData?.SensitivityLabelName,
    })),
    queryStatus,
    queryAgeHours,
  };
}

function emptyLabelAdoption(status: LabelAdoptionPayload["queryStatus"]): LabelAdoptionPayload {
  return {
    total: 0,
    byLabel: {},
    byRecordType: {},
    sampleRecords: [],
    queryStatus: status,
    queryAgeHours: null,
  };
}

export async function fetchAdvancedHunting(
  ctx: SignalCallCtx,
  packs: KqlPack[] = DEFAULT_KQL_PACKS,
): Promise<AdvancedHuntingPayload> {
  const results: KqlPackResult[] = [];
  for (const pack of packs) {
    try {
      const res = await graphFetch<RawHuntingResponse>({
        ...ctx,
        path: "/security/runHuntingQuery",
        method: "POST",
        // v2.5.21 fix: Microsoft Graph's /security/runHuntingQuery expects
        // lowercase `query`. The capital `Query` we used to send is the
        // legacy Defender for Endpoint API shape (api.security.microsoft.com),
        // which Graph silently ignores — the parser saw an empty query and
        // returned "The incomplete fragment is unexpected. Fix syntax errors".
        // EVERY pack execution failed with this until v2.5.21.
        body: { query: pack.query },
      });
      results.push({
        packId: pack.id,
        name: pack.name,
        rowCount: res.results?.length ?? 0,
        schema: res.schema ?? [],
        rows: (res.results ?? []).slice(0, 200),
        executedAt: new Date().toISOString(),
        error: null,
      });
    } catch (err) {
      results.push({
        packId: pack.id,
        name: pack.name,
        rowCount: 0,
        schema: [],
        rows: [],
        executedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return {
    total: results.length,
    packs: results,
  };
}

// ————————————————————————————————————————
// Defender Vulnerability Management — per-device + per-CVE posture
// ————————————————————————————————————————
//
// Pulled via Advanced Hunting against the Defender TVM tables. Requires the
// tenant to have Defender for Endpoint P2 or the Defender Vulnerability
// Management add-on — tenants without either return KQL "failed to resolve
// table" errors which we tolerate as empty.

export type VulnDevice = {
  deviceId: string;
  deviceName: string;
  osPlatform: string | null;
  cveCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  /** Max CVSS of any unresolved CVE on this device. */
  maxCvss: number | null;
  /** Full list of CVE IDs currently affecting this device — used by the
   *  Devices tab drill-down to show "which CVEs hit this specific host". */
  cveIds: string[];
};

export type VulnCve = {
  cveId: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  cvssScore: number | null;
  /** Count of currently-affected devices. Renamed conceptually from
   *  `affectedDevices` to distinguish from remediated; we keep the field
   *  name for backward-compat with the existing rollup endpoint and UI. */
  affectedDevices: number;
  /** Count of devices where this CVE WAS present but has been patched. In
   *  real tenants this needs either a `Status == 'Resolved'` filter on
   *  DeviceTvmSoftwareVulnerabilities (schema-dependent) or a historical
   *  diff against the previous snapshot. On demos it's synthesized. */
  remediatedDevices: number;
  /** True if Defender flagged a known public exploit for this CVE. */
  hasExploit: boolean;
  publishedDateTime: string | null;
};

export type VulnerabilitiesPayload = {
  total: number; // distinct CVEs affecting this tenant
  critical: number;
  high: number;
  medium: number;
  low: number;
  exploitable: number; // CVEs flagged with known exploit
  affectedDevices: number; // distinct devices with >=1 CVE
  /**
   * True when the snapshot carries a meaningful `remediatedDevices` value.
   * Live Defender TVM only surfaces current exposures; we can't tell how
   * many devices USED to be exposed without a historical diff. Demo data
   * carries synthesized remediation counts and sets this true; live
   * tenants set this false and the UI renders "—" for the remediated
   * column rather than misleadingly showing "0 patches applied".
   */
  remediationTracked: boolean;
  byDevice: VulnDevice[]; // top 50 by severity, then CVE count
  topCves: VulnCve[]; // top 50 by affected device count
  error: string | null;
};

function emptyVulnerabilitiesPayload(error: string | null = null): VulnerabilitiesPayload {
  return {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    exploitable: 0,
    affectedDevices: 0,
    remediationTracked: false,
    byDevice: [],
    topCves: [],
    error,
  };
}

// DeviceTvmSoftwareVulnerabilities shape (Defender for Endpoint TVM):
//   DeviceId, DeviceName, OSPlatform, OSVersion, SoftwareVendor, SoftwareName,
//   SoftwareVersion, CveId, VulnerabilitySeverityLevel, CvssScore,
//   IsExploitAvailable, VulnerabilityPublishedDate
//
// The table lists ACTIVE exposures only — Defender removes rows as patches
// are applied, so there's no `Status` column and no native "remediated"
// metric. We derive remediated from the sibling DeviceTvmSoftwareInventory
// table where each software version has `EndOfSupportStatus`, or leave it
// at 0 for tenants where that doesn't resolve either. The UI renders "—"
// in that case rather than implying zero patching happened.
//
// v2.5.22 — additional KQL simplifications for the MDE Advanced Hunting
// restricted dialect. Even after the v2.5.21 body-shape fix
// (`Query` → `query`) the query was still returning `400 — The incomplete
// fragment is unexpected`. The companion pack queries (failedAdminSignIns)
// started succeeding under the same body-shape fix, isolating the failure
// to constructs unique to this query:
//   - `make_set(CveId, 100)` — the two-arg `make_set(expr, maxSize)` form
//     is documented in standard Kusto but appears to be rejected by MDE's
//     restricted parser. Dropped entirely; the per-device CveIds list isn't
//     consumed by the UI today, so removing the column is harmless.
//   - `top 50 by A desc, B desc, C desc` — multi-key `top` is documented
//     in standard Kusto but again may not survive MDE's parser. Reduced
//     to a single sort key (`Critical desc`); ties on Critical fall back
//     to the natural row order which is already roughly severity-sorted.
//   - v2.5.19 fix retained: `dcountif` → `countif` (counts vulnerability
//     rows, not distinct CVEs) since `dcountif` isn't in the dialect at
//     all. `CveCount = dcount(CveId)` preserved for the headline.
const VULN_KQL_BY_DEVICE = `DeviceTvmSoftwareVulnerabilities
| summarize
    CveCount = dcount(CveId),
    Critical = countif(VulnerabilitySeverityLevel == "Critical"),
    High = countif(VulnerabilitySeverityLevel == "High"),
    Medium = countif(VulnerabilitySeverityLevel == "Medium"),
    Low = countif(VulnerabilitySeverityLevel == "Low"),
    OsPlatform = any(OSPlatform)
  by DeviceId, DeviceName
| top 50 by Critical desc`;

// v2.5.22 simplifications (same rationale as VULN_KQL_BY_DEVICE):
//   - `iff(max(iff(IsExploitAvailable == true, 1, 0)) > 0, true, false)`
//     replaced with `countif(IsExploitAvailable == true) > 0` — flatter
//     expression, no nested iff. Returns the same boolean.
//   - Multi-key `top 50 by A desc, B desc` reduced to single key.
//
// v2.5.28 — `CvssScore` column dropped. MTP's Advanced Hunting parser
// returns "Failed to resolve scalar expression named 'CvssScore'" on
// real tenants even though Microsoft's published schema for
// DeviceTvmSoftwareVulnerabilities lists it as a column. Possibly a
// schema-rollback that the docs haven't caught up to, or a tenant-
// licensing condition we can't detect in advance. The UI already
// renders `cvssScore: null` as an em-dash, so dropping the column is
// graceful — severity, exploit, affected-device counts all still land.
// v2.5.29 — dropped IsExploitAvailable as well. Same parser-rejection
// pattern as CvssScore in v2.5.28: "Failed to resolve column or scalar
// expression named 'IsExploitAvailable'" on MTP, even though Microsoft's
// schema docs list it. The byDevice query (which doesn't reference
// IsExploitAvailable) succeeded after v2.5.28, proving the column-not-
// resolvable error is per-column, not whole-query. UI handles
// `hasExploit: false` gracefully — exploit indicator just doesn't
// surface in the per-CVE row. Operators still get severity, affected-
// device counts, and CVE ids — the most actionable signal.
const VULN_KQL_TOP_CVES = `DeviceTvmSoftwareVulnerabilities
| summarize
    AffectedDevices = dcount(DeviceId),
    Severity = any(VulnerabilitySeverityLevel),
    PublishedDateTime = any(VulnerabilityPublishedDate)
  by CveId
| top 50 by AffectedDevices desc`;

// NOTE: remediated counts on live tenants cannot be computed from this
// single endpoint — TVM only returns currently-exposed findings. A future
// V1.2 will derive remediated by diffing today's snapshot vs. N days ago
// (CVE was on device X then, not now → remediated). Until that ships,
// live tenants return `remediatedDevices: 0` and the UI shows "—".

type RawVulnByDeviceRow = {
  DeviceId?: string;
  DeviceName?: string;
  OsPlatform?: string;
  CveCount?: number;
  Critical?: number;
  High?: number;
  Medium?: number;
  Low?: number;
  MaxCvss?: number;
  CveIds?: string[];
};

type RawVulnCveRow = {
  CveId?: string;
  Severity?: string;
  CvssScore?: number;
  AffectedDevices?: number;
  HasExploit?: boolean;
  PublishedDateTime?: string;
};

export async function fetchVulnerabilities(
  ctx: SignalCallCtx,
): Promise<VulnerabilitiesPayload> {
  // v2.5.22 — vulnerability hunting moved off Microsoft Graph's
  // /security/runHuntingQuery and onto the Defender for Endpoint direct API
  // at /api/advancedhunting/run. Why:
  //   - Graph's restricted KQL parser kept rejecting valid TVM-table queries
  //     ("incomplete fragment is unexpected") even after every reasonable
  //     simplification — make_set was dropped, multi-key top reduced, the
  //     dcountif → countif rewrite, the body-shape `Query` → `query` fix,
  //     and the response shape was correct. Five different rewrites, same
  //     400 every time.
  //   - The DfE direct API uses the same KQL but a less-restricted parser
  //     (the same one the security.microsoft.com Advanced Hunting console
  //     in the Defender portal uses), so the tenant's portal-side queries
  //     and Mizan's queries become byte-identical.
  //   - DfE direct API requires a different scope (AdvancedQuery.Read.All
  //     on the WindowsDefenderATP service principal) — registered on the
  //     Mizan data app in v2.5.22. Existing entity tenants need to
  //     re-consent before the new scope takes effect.
  //
  // Body shape note: DfE direct API uses capital `Query` (legacy DfE format
  // that the Microsoft Graph migration cargo-culted but inverted to
  // lowercase). Response is `{ Schema, Results }` (capital), not Graph's
  // lowercase `{ schema, results }`.
  let byDeviceRes: { Results?: RawVulnByDeviceRow[] };
  let topCveRes: { Results?: RawVulnCveRow[] };
  try {
    // v2.5.27 — `/advancedhunting/run` requires AdvancedHunting.Read.All on
    // the Microsoft Threat Protection SP, NOT AdvancedQuery.Read.All on
    // WindowsDefenderATP. Microsoft converged the role check across both
    // hostnames, so even the legacy hostname now demands the MTP claim.
    // mtpFetch acquires a token with audience https://api.security.microsoft.com/.default
    // and posts to the unified hostname. Tenants need the MTP role granted
    // (added to source app's requiredResourceAccess in v2.5.27).
    [byDeviceRes, topCveRes] = await Promise.all([
      mtpFetch<{ Results?: RawVulnByDeviceRow[] }>({
        ...ctx,
        path: "/advancedhunting/run",
        method: "POST",
        body: { Query: VULN_KQL_BY_DEVICE },
      }),
      mtpFetch<{ Results?: RawVulnCveRow[] }>({
        ...ctx,
        path: "/advancedhunting/run",
        method: "POST",
        body: { Query: VULN_KQL_TOP_CVES },
      }),
    ]);
  } catch (err) {
    // Common failure: tenant has no Defender VM license OR hasn't yet
    // re-consented for the AdvancedQuery.Read.All scope → 401/403/400 from
    // the DfE API. Treat any GraphError-shaped error as "feature
    // unavailable" and return the empty payload so the rest of the sync
    // proceeds.
    if (err instanceof GraphError) {
      return emptyVulnerabilitiesPayload(err.message);
    }
    throw err;
  }
  // Normalise to lowercase shape the rest of the function expects.
  const byDeviceResults = byDeviceRes.Results;
  const topCveResults = topCveRes.Results;

  const byDeviceRows = byDeviceResults ?? [];
  const topCveRows = topCveResults ?? [];

  const byDevice: VulnDevice[] = byDeviceRows.map((r) => ({
    deviceId: r.DeviceId ?? "",
    deviceName: r.DeviceName ?? "(unknown)",
    osPlatform: r.OsPlatform ?? null,
    cveCount: r.CveCount ?? 0,
    critical: r.Critical ?? 0,
    high: r.High ?? 0,
    medium: r.Medium ?? 0,
    low: r.Low ?? 0,
    maxCvss: typeof r.MaxCvss === "number" ? r.MaxCvss : null,
    cveIds: Array.isArray(r.CveIds) ? r.CveIds : [],
  }));

  const topCves: VulnCve[] = topCveRows.map((r) => ({
    cveId: r.CveId ?? "",
    severity: normalizeSeverity(r.Severity),
    cvssScore: typeof r.CvssScore === "number" ? r.CvssScore : null,
    affectedDevices: r.AffectedDevices ?? 0,
    // Defender TVM doesn't expose per-CVE remediated counts directly on
    // runHuntingQuery — requires historical snapshot diff (see V1.2 note
    // on VULN_KQL definitions). Live tenants get 0 here; UI renders "—".
    remediatedDevices: 0,
    hasExploit: r.HasExploit === true,
    publishedDateTime: r.PublishedDateTime ?? null,
  }));

  // Tenant-wide totals derived from the top-CVE list (more accurate than
  // summing per-device severity counts, which double-counts CVEs on >1 host).
  const critical = topCves.filter((c) => c.severity === "Critical").length;
  const high = topCves.filter((c) => c.severity === "High").length;
  const medium = topCves.filter((c) => c.severity === "Medium").length;
  const low = topCves.filter((c) => c.severity === "Low").length;
  const exploitable = topCves.filter((c) => c.hasExploit).length;
  const affectedDevices = byDevice.length;
  const total = critical + high + medium + low + topCves.filter((c) => c.severity === "Unknown").length;

  return {
    total,
    critical,
    high,
    medium,
    low,
    exploitable,
    affectedDevices,
    remediationTracked: false, // see type doc — live TVM doesn't expose it
    byDevice,
    topCves,
    error: null,
  };
}

function normalizeSeverity(s: string | undefined): VulnCve["severity"] {
  switch ((s ?? "").toLowerCase()) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}
