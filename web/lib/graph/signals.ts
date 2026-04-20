import "server-only";
import { graphFetch, graphFetchAll, GraphError } from "./fetch";

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

export type RiskyUser = {
  id: string;
  userPrincipalName: string;
  displayName: string | null;
  riskLevel: string;
  riskState: string;
  riskLastUpdatedDateTime: string;
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
  createdDateTime: string;
  lastUpdateDateTime: string;
  alertCount: number | null;
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
  createdDateTime: string;
  lastUpdateDateTime: string;
  alerts?: { length?: number } | unknown[];
};

export async function fetchIncidents(
  ctx: SignalCallCtx,
): Promise<IncidentsPayload> {
  let incidents: RawIncident[];
  try {
    incidents = await graphFetchAll<RawIncident>(
      {
        ...ctx,
        // Note: space in `desc` gets URL-encoded by fetch's URL constructor. Some tenants
        // still 400 here if Defender XDR isn't initialized — we tolerate that below.
        path: "/security/incidents?$top=200&$orderby=lastUpdateDateTime desc",
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
      createdDateTime: i.createdDateTime,
      lastUpdateDateTime: i.lastUpdateDateTime,
      alertCount: Array.isArray(i.alerts) ? i.alerts.length : null,
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
  const path = `/security/alerts_v2?$filter=serviceSource eq '${serviceSource}'&$top=200&$orderby=lastUpdateDateTime desc`;
  let rows: RawAlertV2[];
  try {
    rows = await graphFetchAll<RawAlertV2>({ ...ctx, path }, 10);
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
      { ...ctx, path: "/security/subjectRightsRequests?$top=100" },
      5,
    );
  } catch (err) {
    if (isProductUnavailable(err)) {
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
      { ...ctx, path: "/security/labels/retentionLabels?$top=200" },
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
      { ...ctx, path: "/security/attackSimulation/simulations?$top=25&$orderby=createdDateTime desc" },
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
    if (err instanceof GraphError && (err.status === 404 || err.status === 403)) {
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
  try {
    const rows = await graphFetchAll<RawTiArticle>(
      {
        ...ctx,
        path: "/security/threatIntelligence/articles?$top=25&$orderby=createdDateTime desc",
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
    if (err instanceof GraphError && (err.status === 404 || err.status === 403)) {
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
export const DEFAULT_KQL_PACKS: KqlPack[] = [
  {
    id: "pack.failedAdminSignIns",
    name: "Failed admin sign-ins (last 24h)",
    descriptionEn:
      "Sign-ins by users holding privileged directory roles that failed authentication in the last 24 hours. Spikes here are a reliable leading indicator of credential stuffing targeting admin accounts.",
    descriptionAr:
      "محاولات تسجيل دخول فاشلة خلال آخر ٢٤ ساعة لمستخدمين يحملون أدوارًا مميّزة في الدليل. الزيادة هنا مؤشر مبكر موثوق لهجمات حشو بيانات الاعتماد ضد حسابات المسؤولين.",
    query: `SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != 0
| where UserType == "Member"
| join kind=inner (IdentityInfo | where JobTitle has_any("Admin","Administrator")) on $left.UserPrincipalName == $right.AccountUPN
| summarize count() by UserPrincipalName, IPAddress, ResultType
| order by count_ desc
| take 50`,
  },
  {
    id: "pack.staleCaPolicies",
    name: "Conditional Access policies not modified in 180 days",
    descriptionEn:
      "Conditional Access policies that haven't been touched in the last 180 days. Worth reviewing — the threat landscape moves faster than that.",
    descriptionAr:
      "سياسات الوصول المشروط التي لم تُعدَّل خلال آخر ١٨٠ يومًا. تستحق المراجعة — مشهد التهديدات يتغير بسرعة أكبر.",
    query: `AADAuditPolicyEvents
| where TimeGenerated > ago(180d)
| where OperationName has "Conditional Access"
| summarize last_modified=max(TimeGenerated) by PolicyId
| where last_modified < ago(180d)
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
        path: `/security/auditLog/queries/${existing.graph_query_id}`,
      });
      if (statusRes.status === "succeeded") {
        const recs = await graphFetchAll<GraphAuditRecord>(
          {
            ...ctx,
            path: `/security/auditLog/queries/${existing.graph_query_id}/records?$top=500`,
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
        method: "POST",
        body: {
          displayName: "SCSC Label Adoption",
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
        body: { Query: pack.query },
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
