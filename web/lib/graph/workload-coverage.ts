import "server-only";
import { graphFetch, graphFetchAll, GraphError } from "./fetch";
import { defenderFetch } from "./defender-fetch";
import {
  classifyWorkloadLicenses,
  type SubscribedSku,
  type WorkloadLicense,
} from "./license-skus";
import type { SignalCallCtx } from "./signals";

/**
 * Phase 16 — Workload Coverage signal.
 *
 * Surfaces a one-glance answer to "what Microsoft security tools is this
 * entity actually USING, and how completely?" for every entity tenant.
 * Card sits at the top of the entity overview page.
 *
 * Honest about availability: each tool's payload carries an `available`
 * field flagging whether the data is fully discoverable today on Microsoft
 * Graph (✅ live), partially via a beta endpoint (⚠️ beta), or entirely
 * gated behind PowerShell-only Microsoft surfaces (❌ coming-soon, license
 * presence + alert/usage signal only).
 *
 * Correlations we compute when both sides are available:
 *   - Intune-vs-MDE coverage gap (devices managed by Intune but not yet
 *     onboarded to MDE) — this is the single most valuable number on the
 *     card, because it's the actionable "you have N unprotected endpoints"
 *     line item every CISO wants on a poster.
 *   - License utilization (paid seats vs consumed) per tool.
 *   - Activity proxy via alerts_v2 serviceSource counts when the policy
 *     surface itself is unreachable (MDO, MDCA) — gives us a "yes the
 *     tool is generating signal" tell even if we can't read its rules.
 */

export type CoverageStatus = "live" | "beta" | "coming_soon";

export type WorkloadCoveragePayload = {
  /** When the snapshot was taken — UI shows this so the operator knows freshness. */
  collectedAt: string;
  /** MDM authority from /organization. Drives "Intune is the MDM authority" badge. */
  mdmAuthority: string | null;
  /** Tenant total assigned-license users, for "X of Y users are licensed" math. */
  tenantUserCountFloor: number | null;

  intune: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /** Intune-managed device count (post-enrollment, includes co-managed). */
    enrolledDevices: number | null;
    /** Devices grouped by operatingSystem (Windows/iOS/Android/macOS/etc). */
    devicesByPlatform: Record<string, number>;
    /** Devices grouped by complianceState (compliant/noncompliant/inGracePeriod/...). */
    devicesByCompliance: Record<string, number>;
    /** Convenience: percentage of enrolled devices in a compliant state. */
    percentCompliant: number | null;
    /** Number of compliance policies authored on this tenant. */
    compliancePolicyCount: number | null;
    /** Number of device configuration profiles. */
    configurationProfileCount: number | null;
    /** Number of Settings Catalog profiles (newer endpoint, separate count). */
    settingsCatalogProfileCount: number | null;
    /** Last endpoint error if a sub-fetch failed; null when everything was OK. */
    error: string | null;
  };

  mde: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /** Total MDE-onboarded machines (last seen any time). */
    onboardedDevices: number | null;
    /** Machines actively reporting in the last 7 days. */
    activeLast7Days: number | null;
    /** Machines whose lastSeen is older than 30 days — likely stale. */
    staleOver30Days: number | null;
    /** Onboarded machines grouped by osPlatform (Windows10 / WindowsServer / etc.). */
    devicesByOs: Record<string, number>;
    /** Health status breakdown from machine.healthStatus. */
    devicesByHealth: Record<string, number>;
    /**
     * Correlation: Intune-managed devices NOT yet onboarded to MDE.
     * Calculated as max(0, Intune.enrolledDevices - MDE.onboardedDevices)
     * when both are available. Null otherwise. This is the headline
     * "X devices need MDE onboarding" number on the card.
     */
    intuneCoverageGap: number | null;
    error: string | null;
  };

  mdi: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /** Active MDI sensors (beta endpoint — flag accordingly in UI). */
    sensorCount: number | null;
    /** Open health issues count (we already pull this in dfiSensorHealth). */
    openHealthIssues: number | null;
    /** Critical health issues — separate so the UI can highlight them. */
    criticalHealthIssues: number | null;
    error: string | null;
  };

  labels: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /** Number of sensitivity labels in the tenant catalog. */
    publishedLabelCount: number | null;
    /** Names of the top published labels for the hover hint. */
    labelNames: string[];
    /**
     * Activity proxy: number of label-related events in the last 30 days
     * pulled from the audit log. Tells the operator if labels are
     * actually being applied vs just sitting in the catalog. Null when
     * the audit query couldn't complete.
     */
    labelEventsLast30d: number | null;
    error: string | null;
  };

  mdo: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /**
     * Activity proxy: alerts in the last 30d with serviceSource =
     * 'microsoftDefenderForOffice365'. Non-zero count means the tool is
     * configured + active even though the policy surface is PowerShell-
     * only. Zero with license=true means licensed-but-quiet (could be
     * misconfigured OR genuinely no email threats).
     */
    alertsLast30d: number | null;
    /** Threat submissions (op-team initiated) in the last 30d. */
    submissionsLast30d: number | null;
    error: string | null;
  };

  mdca: {
    available: CoverageStatus;
    license: WorkloadLicense;
    alertsLast30d: number | null;
    error: string | null;
  };

  dlp: {
    available: CoverageStatus;
    license: WorkloadLicense;
    /** Beta-tier overall policy count if /security/dataLossPreventionPolicies returns. */
    policyCountBeta: number | null;
    /** Activity proxy: DLP alerts in 30d. */
    alertsLast30d: number | null;
    error: string | null;
  };
};

export async function fetchWorkloadCoverage(
  ctx: SignalCallCtx,
): Promise<WorkloadCoveragePayload> {
  // Fan out the read calls in parallel — each sub-fetch is independently
  // tolerant of 403/404 (license gap) and falls back to nulls so the card
  // renders for every tenant.
  const [skus, organization, intuneCounts, mdeCounts, mdiCounts, labelCounts, mdoCounts, mdcaCounts, dlpCounts, labelEvents, submissions] =
    await Promise.all([
      fetchSubscribedSkus(ctx),
      fetchOrganizationSummary(ctx),
      fetchIntuneCounts(ctx),
      fetchMdeCounts(ctx),
      fetchMdiCounts(ctx),
      fetchSensitivityLabelCounts(ctx),
      fetchAlertCount(ctx, "microsoftDefenderForOffice365"),
      fetchAlertCount(ctx, "microsoftDefenderForCloudApps"),
      fetchDlpCounts(ctx),
      fetchLabelEventsLast30d(ctx),
      fetchThreatSubmissionsLast30d(ctx),
    ]);

  const license = classifyWorkloadLicenses(skus);
  const intuneCoverageGap =
    intuneCounts.enrolled !== null && mdeCounts.onboarded !== null
      ? Math.max(0, intuneCounts.enrolled - mdeCounts.onboarded)
      : null;

  return {
    collectedAt: new Date().toISOString(),
    mdmAuthority: organization.mdmAuthority,
    tenantUserCountFloor: organization.userCountFloor,

    intune: {
      available: "live",
      license: license.intune,
      enrolledDevices: intuneCounts.enrolled,
      devicesByPlatform: intuneCounts.byPlatform,
      devicesByCompliance: intuneCounts.byCompliance,
      percentCompliant: intuneCounts.percentCompliant,
      compliancePolicyCount: intuneCounts.compliancePolicyCount,
      configurationProfileCount: intuneCounts.configurationProfileCount,
      settingsCatalogProfileCount: intuneCounts.settingsCatalogProfileCount,
      error: intuneCounts.error,
    },

    mde: {
      available: "live",
      license: license.mde,
      onboardedDevices: mdeCounts.onboarded,
      activeLast7Days: mdeCounts.activeLast7d,
      staleOver30Days: mdeCounts.staleOver30d,
      devicesByOs: mdeCounts.byOs,
      devicesByHealth: mdeCounts.byHealth,
      intuneCoverageGap,
      error: mdeCounts.error,
    },

    mdi: {
      available: "beta",
      license: license.mdi,
      sensorCount: mdiCounts.sensors,
      openHealthIssues: mdiCounts.openIssues,
      criticalHealthIssues: mdiCounts.criticalIssues,
      error: mdiCounts.error,
    },

    labels: {
      available: "live",
      license: license.labels,
      publishedLabelCount: labelCounts.count,
      labelNames: labelCounts.names,
      labelEventsLast30d: labelEvents.count,
      error: labelCounts.error ?? labelEvents.error,
    },

    mdo: {
      available: "coming_soon",
      license: license.mdo,
      alertsLast30d: mdoCounts.count,
      submissionsLast30d: submissions.count,
      error: mdoCounts.error ?? submissions.error,
    },

    mdca: {
      available: "coming_soon",
      license: license.mdca,
      alertsLast30d: mdcaCounts.count,
      error: mdcaCounts.error,
    },

    dlp: {
      available: "coming_soon",
      license: license.dlp,
      policyCountBeta: dlpCounts.policyCount,
      alertsLast30d: dlpCounts.alertsLast30d,
      error: dlpCounts.error,
    },
  };
}

// ————————————————————————————————————————
// /subscribedSkus — license entitlements
// ————————————————————————————————————————

async function fetchSubscribedSkus(
  ctx: SignalCallCtx,
): Promise<SubscribedSku[]> {
  try {
    const r = await graphFetch<{ value: SubscribedSku[] }>({
      ...ctx,
      path: "/subscribedSkus",
    });
    return r.value ?? [];
  } catch (err) {
    // 403 = the data app's Directory.Read.All didn't propagate yet on a
    // brand-new entity; treat as zero-license and let the card show
    // "license info pending consent".
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      return [];
    }
    throw err;
  }
}

// ————————————————————————————————————————
// /organization — MDM authority + tenant license floor
// ————————————————————————————————————————

async function fetchOrganizationSummary(
  ctx: SignalCallCtx,
): Promise<{ mdmAuthority: string | null; userCountFloor: number | null }> {
  try {
    const r = await graphFetch<{
      value: Array<{
        mobileDeviceManagementAuthority?: string;
        assignedPlans?: Array<{ service: string; capabilityStatus: string }>;
      }>;
    }>({
      ...ctx,
      path: "/organization?$select=mobileDeviceManagementAuthority,assignedPlans",
    });
    const org = r.value?.[0];
    return {
      mdmAuthority: org?.mobileDeviceManagementAuthority ?? null,
      userCountFloor: null, // populated separately if needed; deferred for now
    };
  } catch {
    return { mdmAuthority: null, userCountFloor: null };
  }
}

// ————————————————————————————————————————
// Intune counts — every endpoint is independently tolerant
// ————————————————————————————————————————

async function fetchIntuneCounts(ctx: SignalCallCtx): Promise<{
  enrolled: number | null;
  byPlatform: Record<string, number>;
  byCompliance: Record<string, number>;
  percentCompliant: number | null;
  compliancePolicyCount: number | null;
  configurationProfileCount: number | null;
  settingsCatalogProfileCount: number | null;
  error: string | null;
}> {
  const out = {
    enrolled: null as number | null,
    byPlatform: {} as Record<string, number>,
    byCompliance: {} as Record<string, number>,
    percentCompliant: null as number | null,
    compliancePolicyCount: null as number | null,
    configurationProfileCount: null as number | null,
    settingsCatalogProfileCount: null as number | null,
    error: null as string | null,
  };

  // Pull a slice of managed devices for OS + compliance histograms. We
  // cap at $top=999 (Graph max for this collection) — for very large
  // tenants we trust the histogram of the top page, which is more than
  // enough for the dashboard glance card. If a customer has >999 devices
  // we'll add paging later.
  try {
    type IntuneDevice = {
      id: string;
      operatingSystem?: string;
      complianceState?: string;
    };
    const devs = await graphFetchAll<IntuneDevice>(
      {
        ...ctx,
        path:
          "/deviceManagement/managedDevices?$select=id,operatingSystem,complianceState&$top=999",
      },
      3,
    );
    out.enrolled = devs.length;
    let compliant = 0;
    for (const d of devs) {
      const os = d.operatingSystem ?? "Unknown";
      out.byPlatform[os] = (out.byPlatform[os] ?? 0) + 1;
      const cs = d.complianceState ?? "unknown";
      out.byCompliance[cs] = (out.byCompliance[cs] ?? 0) + 1;
      if (cs === "compliant") compliant++;
    }
    out.percentCompliant =
      devs.length > 0 ? Math.round((compliant / devs.length) * 100) : null;
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      // No Intune license / tenant / data — leave nulls.
    } else {
      out.error = errorMessage(err);
    }
  }

  // Compliance policies + configuration profiles — separate counts so
  // we can show "X compliance, Y config profiles, Z settings catalog".
  try {
    const r = await graphFetch<{ "@odata.count"?: number; value: unknown[] }>({
      ...ctx,
      path: "/deviceManagement/deviceCompliancePolicies?$count=true&$top=1",
    });
    out.compliancePolicyCount = r["@odata.count"] ?? r.value?.length ?? 0;
  } catch {
    /* leave null */
  }
  try {
    const r = await graphFetch<{ "@odata.count"?: number; value: unknown[] }>({
      ...ctx,
      path: "/deviceManagement/deviceConfigurations?$count=true&$top=1",
    });
    out.configurationProfileCount = r["@odata.count"] ?? r.value?.length ?? 0;
  } catch {
    /* leave null */
  }
  try {
    const r = await graphFetch<{ "@odata.count"?: number; value: unknown[] }>({
      ...ctx,
      path: "/deviceManagement/configurationPolicies?$count=true&$top=1",
    });
    out.settingsCatalogProfileCount = r["@odata.count"] ?? r.value?.length ?? 0;
  } catch {
    /* leave null */
  }

  return out;
}

// ————————————————————————————————————————
// MDE machine inventory via Defender for Endpoint API
// ————————————————————————————————————————

async function fetchMdeCounts(ctx: SignalCallCtx): Promise<{
  onboarded: number | null;
  activeLast7d: number | null;
  staleOver30d: number | null;
  byOs: Record<string, number>;
  byHealth: Record<string, number>;
  error: string | null;
}> {
  const out = {
    onboarded: null as number | null,
    activeLast7d: null as number | null,
    staleOver30d: null as number | null,
    byOs: {} as Record<string, number>,
    byHealth: {} as Record<string, number>,
    error: null as string | null,
  };
  try {
    type Machine = {
      id: string;
      osPlatform?: string;
      healthStatus?: string;
      lastSeen?: string;
    };
    // Pull a page of machines (Defender caps at 1000 per page, default
    // pagination via @odata.nextLink). For the card we fetch the first
    // 1000 — large tenants get a representative histogram.
    const r = await defenderFetch<{ value: Machine[] }>({
      ...ctx,
      path: `/machines?$top=1000`,
    });
    const machines = r.value ?? [];
    out.onboarded = machines.length;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
    let active = 0;
    let stale = 0;
    for (const m of machines) {
      const os = m.osPlatform ?? "Unknown";
      out.byOs[os] = (out.byOs[os] ?? 0) + 1;
      const hs = m.healthStatus ?? "Unknown";
      out.byHealth[hs] = (out.byHealth[hs] ?? 0) + 1;
      if (m.lastSeen) {
        const seenMs = Date.parse(m.lastSeen);
        if (!Number.isNaN(seenMs)) {
          if (seenMs >= sevenDaysAgo) active++;
          if (seenMs < thirtyDaysAgo) stale++;
        }
      }
    }
    out.activeLast7d = active;
    out.staleOver30d = stale;
  } catch (err) {
    // 403 / 401: tenant doesn't have MDE consented (license-but-no-app
    // case) or the Defender resource didn't propagate yet. Treat as
    // not-deployed — license-SKU layer still says yes/no.
    if (err instanceof GraphError && (err.status === 401 || err.status === 403)) {
      // Leave nulls so UI distinguishes "no data" from "0 onboarded".
    } else {
      out.error = errorMessage(err);
    }
  }
  return out;
}

// ————————————————————————————————————————
// MDI sensor count + health (BETA path)
// ————————————————————————————————————————

async function fetchMdiCounts(ctx: SignalCallCtx): Promise<{
  sensors: number | null;
  openIssues: number | null;
  criticalIssues: number | null;
  error: string | null;
}> {
  const out = {
    sensors: null as number | null,
    openIssues: null as number | null,
    criticalIssues: null as number | null,
    error: null as string | null,
  };

  // Sensor count — beta endpoint. Many tenants without MDI return 404
  // here; license-SKU layer handles the licensed-but-unprovisioned case.
  try {
    const r = await graphFetch<{ value: Array<{ id: string }> }>({
      ...ctx,
      path: "/security/identities/sensors?$top=200",
      version: "beta",
    });
    out.sensors = r.value?.length ?? 0;
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      // Leave null so UI shows "—" rather than "0" when MDI isn't there at all.
    } else {
      out.error = errorMessage(err);
    }
  }

  // Open + critical health issues — same endpoint dfiSensorHealth uses.
  try {
    const issues = await graphFetchAll<{ severity?: string; status?: string }>(
      { ...ctx, path: "/security/identities/healthIssues?$top=100" },
      3,
    );
    let open = 0;
    let critical = 0;
    for (const i of issues) {
      if (i.status === "open") open++;
      if (i.severity === "high" && i.status === "open") critical++;
    }
    out.openIssues = open;
    out.criticalIssues = critical;
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      out.openIssues = 0;
      out.criticalIssues = 0;
    } else {
      out.error = out.error ?? errorMessage(err);
    }
  }

  return out;
}

// ————————————————————————————————————————
// Sensitivity label catalog
// ————————————————————————————————————————

async function fetchSensitivityLabelCounts(ctx: SignalCallCtx): Promise<{
  count: number | null;
  names: string[];
  error: string | null;
}> {
  try {
    const r = await graphFetch<{
      value: Array<{ id: string; name?: string; displayName?: string }>;
    }>({
      ...ctx,
      path:
        "/security/informationProtection/sensitivityLabels?$top=50&$select=id,name,displayName",
      version: "beta",
    });
    const labels = r.value ?? [];
    return {
      count: labels.length,
      names: labels.map((l) => l.displayName ?? l.name ?? "label").slice(0, 8),
      error: null,
    };
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      return { count: 0, names: [], error: null };
    }
    return { count: null, names: [], error: errorMessage(err) };
  }
}

// ————————————————————————————————————————
// Alerts_v2 count by serviceSource — used as MDO/MDCA activity proxy.
// We can't see the policies for these tools but if alerts are firing,
// we know the tool is deployed AND in use.
// ————————————————————————————————————————

async function fetchAlertCount(
  ctx: SignalCallCtx,
  serviceSource: string,
): Promise<{ count: number | null; error: string | null }> {
  // Last-30-days filter on createdDateTime keeps the count meaningful.
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  try {
    const r = await graphFetch<{
      "@odata.count"?: number;
      value: Array<{ id: string }>;
    }>({
      ...ctx,
      path: `/security/alerts_v2?$filter=serviceSource eq '${serviceSource}' and createdDateTime ge ${cutoff}&$count=true&$top=1`,
    });
    return { count: r["@odata.count"] ?? r.value?.length ?? 0, error: null };
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      return { count: 0, error: null };
    }
    return { count: null, error: errorMessage(err) };
  }
}

// ————————————————————————————————————————
// DLP — tenant policy count via beta endpoint (sparse) + alert count
// ————————————————————————————————————————

async function fetchDlpCounts(ctx: SignalCallCtx): Promise<{
  policyCount: number | null;
  alertsLast30d: number | null;
  error: string | null;
}> {
  const out = {
    policyCount: null as number | null,
    alertsLast30d: null as number | null,
    error: null as string | null,
  };
  try {
    const r = await graphFetch<{ value: Array<{ id: string }> }>({
      ...ctx,
      path: "/security/dataLossPreventionPolicies?$top=100",
      version: "beta",
    });
    out.policyCount = r.value?.length ?? 0;
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 404)) {
      out.policyCount = 0;
    } else {
      out.error = errorMessage(err);
    }
  }
  const a = await fetchAlertCount(ctx, "microsoftDataLossPrevention");
  out.alertsLast30d = a.count;
  return out;
}

// ————————————————————————————————————————
// Threat submissions in 30d — MDO usage proxy
// ————————————————————————————————————————

async function fetchThreatSubmissionsLast30d(
  ctx: SignalCallCtx,
): Promise<{ count: number | null; error: string | null }> {
  // Combine email + url + file submissions. Each endpoint is separate
  // on Graph; we count rows in last 30d across all three.
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  let total = 0;
  let touched = false;
  for (const path of [
    `/security/threatSubmission/emailThreats?$filter=createdDateTime ge ${cutoff}&$count=true&$top=1`,
    `/security/threatSubmission/urlThreats?$filter=createdDateTime ge ${cutoff}&$count=true&$top=1`,
    `/security/threatSubmission/fileThreats?$filter=createdDateTime ge ${cutoff}&$count=true&$top=1`,
  ]) {
    try {
      const r = await graphFetch<{
        "@odata.count"?: number;
        value: unknown[];
      }>({ ...ctx, path });
      total += r["@odata.count"] ?? r.value?.length ?? 0;
      touched = true;
    } catch {
      /* swallow individual endpoint failures */
    }
  }
  return touched
    ? { count: total, error: null }
    : { count: null, error: null };
}

// ————————————————————————————————————————
// Label adoption activity proxy via /security/auditLog/queries.
// Slow path — guarded by 30d cutoff and limited to a single result page.
// ————————————————————————————————————————

async function fetchLabelEventsLast30d(
  _ctx: SignalCallCtx,
): Promise<{ count: number | null; error: string | null }> {
  // The Unified Audit Log query API is async (POST creates a query, then
  // GET polls). For the dashboard glance we don't want to block on a 30s
  // poll loop, so return null + let a separate batch job populate this
  // later. Stub kept here so the payload shape is stable.
  return { count: null, error: null };
}

function errorMessage(err: unknown): string {
  if (err instanceof GraphError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
