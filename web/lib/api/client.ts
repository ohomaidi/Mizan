"use client";

import type { CouncilKpis, ClusterSummary, EntityRow } from "@/lib/compute/aggregate";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = `${body.error}${body.message ? `: ${body.message}` : ""}`;
    } catch {}
    const err = new Error(msg);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export const api = {
  getKpis: () =>
    jsonFetch<{ kpis: CouncilKpis; clusters: ClusterSummary[] }>("/api/signals/kpi"),

  getEntities: () => jsonFetch<{ entities: EntityRow[] }>("/api/signals/entities"),

  getTenantDetail: (id: string) =>
    jsonFetch<{
      tenant: unknown;
      signals: unknown;
      health: unknown;
      maturity: unknown;
    }>(`/api/tenants/${id}`),

  createTenant: (draft: {
    nameEn: string;
    nameAr: string;
    cluster: string;
    tenantId: string;
    domain: string;
    ciso?: string;
    cisoEmail?: string;
    /** Observation (default) or directive. Honored only in directive-mode deployments. */
    consentMode?: "observation" | "directive";
  }) =>
    jsonFetch<{ tenant: { id: string }; consentUrl: string | null; azureConfigured: boolean }>(
      "/api/tenants",
      { method: "POST", body: JSON.stringify(draft) },
    ),

  deleteTenant: (id: string) =>
    jsonFetch<{ ok: true }>(`/api/tenants/${id}`, { method: "DELETE" }),

  getConsentUrl: (id: string) =>
    jsonFetch<{
      consentUrl: string | null;
      consentStatus: string;
      azureConfigured: boolean;
    }>(`/api/tenants/${id}/consent-url`),

  setSuspended: (id: string, suspended: boolean) =>
    jsonFetch<{ ok: true; suspended: boolean }>(`/api/tenants/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ suspended }),
    }),

  scheduleReview: (id: string, scheduledFor: string | null, note: string | null) =>
    jsonFetch<{ ok: true; scheduledFor: string | null; note: string | null }>(
      `/api/tenants/${id}/schedule-review`,
      { method: "POST", body: JSON.stringify({ scheduledFor, note }) },
    ),

  exportCardUrl: (id: string) => `/api/tenants/${id}/card`,

  resolveTenantFromDomain: (domain: string) =>
    jsonFetch<{ tenantId: string; issuer: string }>(
      `/api/discovery/resolve-tenant?domain=${encodeURIComponent(domain)}`,
    ),

  getBranding: () =>
    jsonFetch<{
      branding: {
        nameEn: string;
        nameAr: string;
        shortEn: string;
        shortAr: string;
        taglineEn: string;
        taglineAr: string;
        accentColor: string;
        accentColorStrong: string;
        logoPath: string | null;
        logoBgRemoved: boolean;
        frameworkId: "nesa" | "dubai-isr" | "nca" | "isr" | "generic";
        updatedAt?: string;
      };
      defaults: {
        nameEn: string;
        nameAr: string;
        shortEn: string;
        shortAr: string;
        taglineEn: string;
        taglineAr: string;
        accentColor: string;
        accentColorStrong: string;
        logoPath: string | null;
        logoBgRemoved: boolean;
        frameworkId: "nesa" | "dubai-isr" | "nca" | "isr" | "generic";
      };
    }>("/api/config/branding"),

  saveBranding: (patch: {
    nameEn?: string;
    nameAr?: string;
    shortEn?: string;
    shortAr?: string;
    taglineEn?: string;
    taglineAr?: string;
    accentColor?: string;
    accentColorStrong?: string;
    frameworkId?: "nesa" | "dubai-isr" | "nca" | "isr" | "generic";
  }) =>
    jsonFetch<{ branding: unknown }>("/api/config/branding", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  resetBranding: () =>
    jsonFetch<{ branding: unknown }>("/api/config/branding", {
      method: "PUT",
      body: JSON.stringify({ reset: true }),
    }),

  getAuthConfig: () =>
    jsonFetch<{
      config: {
        clientId: string;
        clientSecretSet: boolean;
        tenantId: string;
        sessionTimeoutMinutes: number;
        defaultRole: "admin" | "analyst" | "viewer";
        updatedAt: string | null;
        redirectUri: string;
      };
    }>("/api/config/auth"),

  saveAuthConfig: (patch: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    sessionTimeoutMinutes?: number;
    defaultRole?: "admin" | "analyst" | "viewer";
  }) =>
    jsonFetch<{ config: unknown }>("/api/config/auth", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  clearAuthConfig: () =>
    jsonFetch<{ config: unknown }>("/api/config/auth", {
      method: "PUT",
      body: JSON.stringify({ clear: true }),
    }),

  whoami: () =>
    jsonFetch<{
      authenticated: boolean;
      configured: boolean;
      demoMode: boolean;
      deploymentMode: "observation" | "directive";
      graphAppReady: boolean;
      user: {
        id: string;
        email: string;
        displayName: string;
        role: "admin" | "analyst" | "viewer";
        tenantId: string;
      } | null;
      session?: { expiresAt: string };
    }>("/api/auth/me"),

  signOut: () =>
    jsonFetch<{ ok: true }>("/api/auth/user-logout", { method: "POST" }),

  listUsers: () =>
    jsonFetch<{
      users: Array<{
        id: string;
        email: string;
        displayName: string;
        role: "admin" | "analyst" | "viewer";
        isActive: boolean;
        tenantId: string;
        createdAt: string;
        lastLoginAt: string | null;
        pending: boolean;
      }>;
    }>("/api/users"),

  inviteUser: (input: {
    email: string;
    role: "admin" | "analyst" | "viewer";
    displayName?: string;
  }) =>
    jsonFetch<{ user: unknown }>("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateUser: (
    id: string,
    patch: { role?: "admin" | "analyst" | "viewer"; isActive?: boolean },
  ) =>
    jsonFetch<{ ok: true }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteUser: (id: string) =>
    jsonFetch<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" }),

  getSetupState: () =>
    jsonFetch<{ completed: boolean; completedAt?: string }>("/api/setup"),

  markSetupComplete: () =>
    jsonFetch<{ ok: true }>("/api/setup", { method: "POST" }),

  getAzureConfig: () =>
    jsonFetch<{
      config: {
        clientId: string;
        clientSecretSet: boolean;
        authorityHost: string;
        consentRedirectUri: string;
        updatedAt: string | null;
        source: { clientId: "db" | "env" | "none"; clientSecret: "db" | "env" | "none" };
      };
    }>("/api/config/azure"),

  saveAzureConfig: (patch: {
    clientId?: string;
    clientSecret?: string;
    authorityHost?: string;
    consentRedirectUri?: string;
  }) =>
    jsonFetch<{
      config: {
        clientId: string;
        clientSecretSet: boolean;
        authorityHost: string;
        consentRedirectUri: string;
        updatedAt: string | null;
        source: { clientId: "db" | "env" | "none"; clientSecret: "db" | "env" | "none" };
      };
    }>("/api/config/azure", { method: "PUT", body: JSON.stringify(patch) }),

  clearAzureConfig: () =>
    jsonFetch<{ config: unknown }>("/api/config/azure", {
      method: "PUT",
      body: JSON.stringify({ clear: true }),
    }),

  // ----- Deployment mode (chosen once at /setup wizard) -----
  getDeploymentMode: () =>
    jsonFetch<{
      mode: "observation" | "directive";
      locked: boolean;
    }>("/api/config/deployment-mode"),

  setDeploymentMode: (mode: "observation" | "directive") =>
    jsonFetch<{ mode: "observation" | "directive"; locked: boolean }>(
      "/api/config/deployment-mode",
      { method: "POST", body: JSON.stringify({ mode }) },
    ),


  getNesaMapping: () =>
    jsonFetch<{
      mapping: {
        frameworkVersion: string;
        clauses: Array<{
          id: string;
          ref: string;
          titleEn: string;
          titleAr: string;
          descriptionEn: string;
          descriptionAr: string;
          secureScoreControls: string[];
          weight: number;
        }>;
        updatedAt?: string;
      };
      defaults: unknown;
    }>("/api/config/nesa"),

  saveNesaMapping: (mapping: {
    frameworkVersion: string;
    clauses: Array<{
      id: string;
      ref: string;
      titleEn: string;
      titleAr: string;
      descriptionEn: string;
      descriptionAr: string;
      secureScoreControls: string[];
      weight: number;
    }>;
  }) =>
    jsonFetch<{ mapping: unknown }>("/api/config/nesa", {
      method: "PUT",
      body: JSON.stringify(mapping),
    }),

  resetNesaMapping: () =>
    jsonFetch<{ mapping: unknown }>("/api/config/nesa", {
      method: "PUT",
      body: JSON.stringify({ reset: true }),
    }),

  getPurviewRollup: () =>
    jsonFetch<{
      totals: {
        dlp: { total: number; active: number; resolved: number };
        irm: { total: number; active: number };
        commComp: { total: number; active: number };
        srrs: { total: number; active: number; overdue: number };
        retention: { avgLabels: number; recordLabels: number };
        sensitivity: { avgActive: number };
        sharing: Record<string, number>;
      };
      entities: Array<{
        id: string;
        nameEn: string;
        nameAr: string;
        cluster: string;
        dlp: { total: number; active: number; resolved: number; bySeverity: Record<string, number>; alerts: Array<{ id: string; title: string; severity: string; status: string; createdDateTime: string; lastUpdateDateTime: string; category: string | null }> } | null;
        irm: { total: number; active: number; resolved: number; bySeverity: Record<string, number>; alerts: Array<{ id: string; title: string; severity: string; status: string; createdDateTime: string; lastUpdateDateTime: string; category: string | null }> } | null;
        commComp: { total: number; active: number; resolved: number; bySeverity: Record<string, number>; alerts: Array<{ id: string; title: string; severity: string; status: string; createdDateTime: string; lastUpdateDateTime: string; category: string | null }> } | null;
        srrs: { total: number; active: number; closed: number; overdue: number; requests: Array<{ id: string; displayName: string; type: string; status: string; createdDateTime: string; dueDateTime: string | null; closedDateTime: string | null }> } | null;
        retentionLabels: { total: number; recordLabels: number; labels: Array<{ id: string; displayName: string; isRecordLabel: boolean }> } | null;
        sensitivityLabels: { total: number; activeCount: number; labels: Array<{ id: string; name: string; sensitivity: number | null; isActive: boolean }> } | null;
        sharepoint: { sharingCapability: string } | null;
      }>;
    }>("/api/signals/purview"),

  getDefenderDepth: () =>
    jsonFetch<{
      totals: {
        pim: { standingAdmins: number; eligibleOnly: number; privilegedStanding: number };
        dfi: { unhealthy: number; total: number };
        attackSim: { totalAttempts: number; totalClicks: number };
        hunting: { totalHits: number };
      };
      entities: Array<{
        id: string;
        nameEn: string;
        nameAr: string;
        cluster: string;
        pim: { activeAssignments: number; eligibleAssignments: number; privilegedRoleAssignments: number; byRole: Record<string, { active: number; eligible: number }> } | null;
        dfi: { total: number; healthy: number; unhealthy: number; issues: Array<{ id: string; displayName: string; severity: string; status: string; createdDateTime: string }> } | null;
        attackSim: { simulations: number; totalAttempts: number; clicks: number; clickRatePct: number; reported: number; simulationsList: Array<{ id: string; displayName: string; createdDateTime: string; clickRatePct: number | null }> } | null;
        ti: { articles: number; recentArticles: Array<{ id: string; title: string; createdDateTime: string; summary: string | null }> } | null;
        hunting: { total: number; packs: Array<{ packId: string; name: string; rowCount: number; schema: Array<{ name: string; type: string }>; rows: Array<Record<string, unknown>>; executedAt: string; error: string | null }> } | null;
      }>;
    }>("/api/signals/defender-depth"),

  getVulnerabilities: () =>
    jsonFetch<{
      totals: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        exploitable: number;
        affectedDevices: number;
        remediatedDevices: number;
        entitiesWithData: number;
        entitiesWithCritical: number;
      };
      entities: Array<{
        id: string;
        nameEn: string;
        nameAr: string;
        cluster: string;
        hasData: boolean;
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        exploitable: number;
        affectedDevices: number;
        remediatedDevices: number;
        remediationTracked: boolean;
        error: string | null;
      }>;
      correlated: Array<{
        cveId: string;
        severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
        cvssScore: number | null;
        hasExploit: boolean;
        publishedDateTime: string | null;
        entityCount: number;
        totalAffectedDevices: number;
        totalRemediatedDevices: number;
        entities: Array<{
          id: string;
          nameEn: string;
          affectedDevices: number;
          remediatedDevices: number;
        }>;
      }>;
      topOverall: Array<{
        cveId: string;
        severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
        cvssScore: number | null;
        hasExploit: boolean;
        publishedDateTime: string | null;
        entityCount: number;
        totalAffectedDevices: number;
        totalRemediatedDevices: number;
      }>;
    }>("/api/signals/vulnerabilities"),

  syncTenant: (id: string) =>
    jsonFetch<{ tenantId: string; ok: boolean; errors: Array<{ signal: string; message: string }> }>(
      `/api/tenants/${id}/sync`,
      { method: "POST" },
    ),

  // Fast single-signal verify used by the Onboarding Wizard Step 5. Avoids the 30-60s
  // full-sync HTTP hang that was tripping "Load failed" in the browser.
  verifyTenant: (id: string) =>
    jsonFetch<{
      ok: boolean;
      durationMs: number;
      secureScorePercent?: number;
      message?: string;
      status?: number;
    }>(`/api/tenants/${id}/verify`, { method: "POST" }),

  syncAll: () =>
    jsonFetch<{ results: Array<{ tenantId: string; ok: boolean }> }>("/api/sync", {
      method: "POST",
    }),

  getMaturityConfig: () =>
    jsonFetch<{
      config: { weights: Record<string, number>; target: number; updatedAt?: string };
      defaults: { weights: Record<string, number>; target: number };
    }>("/api/config/maturity"),

  saveMaturityConfig: (cfg: { weights: Record<string, number>; target: number }) =>
    jsonFetch<{
      config: { weights: Record<string, number>; target: number; updatedAt?: string };
    }>("/api/config/maturity", { method: "PUT", body: JSON.stringify(cfg) }),

  resetMaturityConfig: () =>
    jsonFetch<{
      config: { weights: Record<string, number>; target: number; updatedAt?: string };
    }>("/api/config/maturity", { method: "PUT", body: JSON.stringify({ reset: true }) }),

  getDiscoveryTemplate: () =>
    jsonFetch<{
      template: Record<string, unknown>;
      defaults: Record<string, unknown>;
    }>("/api/config/discovery-template"),

  saveDiscoveryTemplate: (tpl: Record<string, unknown>) =>
    jsonFetch<{ template: Record<string, unknown> }>(
      "/api/config/discovery-template",
      { method: "PUT", body: JSON.stringify(tpl) },
    ),

  resetDiscoveryTemplate: () =>
    jsonFetch<{ template: Record<string, unknown> }>(
      "/api/config/discovery-template",
      { method: "PUT", body: JSON.stringify({ reset: true }) },
    ),

  getPdfTemplate: () =>
    jsonFetch<{
      template: Record<string, unknown>;
      defaults: Record<string, unknown>;
    }>("/api/config/pdf-template"),

  savePdfTemplate: (tpl: Record<string, unknown>) =>
    jsonFetch<{ template: Record<string, unknown> }>("/api/config/pdf-template", {
      method: "PUT",
      body: JSON.stringify(tpl),
    }),

  resetPdfTemplate: () =>
    jsonFetch<{ template: Record<string, unknown> }>("/api/config/pdf-template", {
      method: "PUT",
      body: JSON.stringify({ reset: true }),
    }),

  getDraggingControls: () =>
    jsonFetch<{
      controls: Array<{
        id: string;
        title: string;
        category: string;
        service: string;
        maxScore: number;
        missedScore: number;
        failingCount: number;
        partialCount: number;
        affectedCount: number;
        userImpact: string | null;
        implementationCost: string | null;
        tier: string | null;
      }>;
    }>("/api/signals/dragging-controls"),

  getAuditLog: () =>
    jsonFetch<{
      rows: Array<{
        tenant_id: string;
        endpoint: string;
        last_success_at: string | null;
        last_error_at: string | null;
        last_error_message: string | null;
        call_count_24h: number;
        throttle_count_24h: number;
        updated_at: string;
        nameEn: string;
        nameAr: string;
        cluster: string | null;
        tenantGuid: string | null;
        isDemo: boolean;
      }>;
    }>("/api/audit"),

  getRollup: () =>
    jsonFetch<{
      totals: {
        identity: { totalUsers: number; atRisk: number; caMfa: number };
        threats: { total: number; active: number; resolved: number; bySeverity: Record<string, number> };
        devices: { total: number; compliant: number; nonCompliant: number; byOs: Record<string, number> };
      };
      identity: Array<{ id: string; nameEn: string; nameAr: string; cluster: string; payload: { total: number; atRisk: number; highRisk: number; caMfa: number; caPolicies: number } | null }>;
      threats: Array<{
        id: string;
        nameEn: string;
        nameAr: string;
        cluster: string;
        payload: {
          total: number;
          active: number;
          resolved: number;
          bySeverity: Record<string, number>;
          incidents: Array<{
            id: string;
            displayName: string;
            severity: string;
            status: string;
            createdDateTime: string;
            lastUpdateDateTime: string;
            alertCount: number | null;
          }>;
        } | null;
      }>;
      devices: Array<{ id: string; nameEn: string; nameAr: string; cluster: string; payload: { total: number; compliant: number; nonCompliant: number; compliancePct: number } | null }>;
    }>("/api/signals/rollup"),

  // ----- Phase 2 Directive actions (directive-mode deployments only) -----
  directiveClassifyIncident: (
    incidentId: string,
    body: {
      tenantId: string;
      classification?:
        | "truePositive"
        | "falsePositive"
        | "informationalExpectedActivity";
      determination?:
        | "apt"
        | "malware"
        | "phishing"
        | "compromisedAccount"
        | "maliciousUserActivity"
        | "unwantedSoftware"
        | "insufficientInformation"
        | "other";
      status?: "active" | "resolved" | "inProgress" | "redirected";
      assignedTo?: string;
      customTags?: string[];
    },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      `/api/directive/incidents/${encodeURIComponent(incidentId)}/classify`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveCommentIncident: (
    incidentId: string,
    body: { tenantId: string; comment: string },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      `/api/directive/incidents/${encodeURIComponent(incidentId)}/comment`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveClassifyAlert: (
    alertId: string,
    body: {
      tenantId: string;
      classification?:
        | "truePositive"
        | "falsePositive"
        | "informationalExpectedActivity";
      determination?:
        | "apt"
        | "malware"
        | "phishing"
        | "compromisedAccount"
        | "maliciousUserActivity"
        | "unwantedSoftware"
        | "insufficientInformation"
        | "other";
      status?: "new" | "inProgress" | "resolved";
      assignedTo?: string;
    },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      `/api/directive/alerts/${encodeURIComponent(alertId)}/classify`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveCommentAlert: (
    alertId: string,
    body: { tenantId: string; comment: string },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      `/api/directive/alerts/${encodeURIComponent(alertId)}/comment`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveConfirmCompromised: (body: { tenantId: string; userIds: string[] }) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      "/api/directive/users/risky/confirm-compromised",
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveDismissRiskyUsers: (body: { tenantId: string; userIds: string[] }) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      "/api/directive/users/risky/dismiss",
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveRevokeSessions: (
    userId: string,
    body: { tenantId: string },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      `/api/directive/users/${encodeURIComponent(userId)}/revoke-sessions`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveSubmitThreat: (
    body:
      | {
          kind: "email";
          tenantId: string;
          category: "phishing" | "malware" | "spam" | "notSpam";
          recipientEmailAddress: string;
          messageUri: string;
        }
      | {
          kind: "url";
          tenantId: string;
          category: "phishing" | "malware" | "spam" | "notSpam";
          url: string;
        }
      | {
          kind: "file";
          tenantId: string;
          category: "malware" | "notMalware";
          fileName: string;
          fileContent: string;
        },
  ) =>
    jsonFetch<{ ok: boolean; simulated: boolean; auditId: number; result: unknown }>(
      "/api/directive/threat-submission",
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveTenantIncidentEvidence: (tenantId: string, incidentId: string) =>
    jsonFetch<{
      tenantId: string;
      incidentId: string;
      simulated: boolean;
      evidence: Array<{
        kind: "url" | "email" | "file";
        label: string;
        description: string;
        url?: string;
        emailRecipient?: string;
        messageUri?: string;
        fileName?: string;
        fileHash?: string;
        detail?: string;
      }>;
    }>(
      `/api/directive/tenant-incident-evidence?tenantId=${encodeURIComponent(tenantId)}&incidentId=${encodeURIComponent(incidentId)}`,
    ),

  directiveTenantIncidents: (tenantId: string) =>
    jsonFetch<{
      tenantId: string;
      tenantNameEn: string;
      incidents: Array<{
        id: string;
        displayName: string;
        severity: string;
        status: string;
        classification: string | null;
        determination: string | null;
        createdDateTime: string;
        lastUpdateDateTime: string;
        alertCount: number | null;
        incidentWebUrl: string | null;
        tags: string[];
      }>;
    }>(
      `/api/directive/tenant-incidents?tenantId=${encodeURIComponent(tenantId)}`,
    ),

  // ----- Phase 3 baseline pushes -----
  directiveBaselines: () =>
    jsonFetch<{
      baselines: Array<{
        id: string;
        titleKey: string;
        bodyKey: string;
        riskTier: "low" | "medium" | "high";
        targetSummary: string;
        grantSummary: string;
        initialState: "enabledForReportingButNotEnforced" | "enabled";
        excludesOwnAdmins: boolean;
        idempotencyKey: string;
        whyKey: string;
        impactKey: string;
        prerequisitesKey: string;
        rolloutAdviceKey: string;
        docsUrl: string;
      }>;
    }>("/api/directive/baselines"),

  directiveBaselinePreview: (
    baselineId: string,
    body: {
      overrideState?:
        | "enabled"
        | "disabled"
        | "enabledForReportingButNotEnforced";
    } = {},
  ) =>
    jsonFetch<{
      baselineId: string;
      preview: {
        displayName: string;
        state: string;
        descriptor: unknown;
        body: unknown;
      };
    }>(
      `/api/directive/baselines/${encodeURIComponent(baselineId)}/preview`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directiveBaselinePush: (
    baselineId: string,
    body: {
      targetTenantIds: string[];
      overrideState?:
        | "enabled"
        | "disabled"
        | "enabledForReportingButNotEnforced";
    },
  ) =>
    jsonFetch<{
      ok: boolean;
      pushRequestId: number;
      perTenant: Array<{
        tenantId: string;
        status:
          | "success"
          | "already_applied"
          | "failed"
          | "simulated"
          | "skipped_observation";
        policyId?: string | null;
        currentState?: string | null;
        error?: string | null;
        auditId?: number;
      }>;
    }>(
      `/api/directive/baselines/${encodeURIComponent(baselineId)}/push`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  directivePushes: (limit = 50) =>
    jsonFetch<{
      pushes: Array<{
        id: number;
        baselineId: string;
        status:
          | "preview"
          | "executing"
          | "complete"
          | "failed"
          | "rolledback";
        pushedByUserId: string | null;
        targetTenantIds: string[];
        targetTenantNames: Array<{
          id: string;
          nameEn: string;
          nameAr: string;
        }>;
        optionsJson: string | null;
        summaryJson: string | null;
        createdAt: string;
        executedAt: string | null;
        rolledbackAt: string | null;
      }>;
    }>(`/api/directive/pushes?limit=${limit}`),

  directiveBaselineStatus: (tenantId: string) =>
    jsonFetch<{
      tenantId: string;
      mode: "real" | "simulated";
      generatedAt: string;
      entries: Array<{
        baselineId: string;
        titleKey: string;
        present: boolean;
        policyId: string | null;
        state: string | null;
        observedAt: string | null;
      }>;
    }>(
      `/api/directive/baselines/status?tenantId=${encodeURIComponent(tenantId)}`,
    ),

  directivePushRollback: (pushId: number) =>
    jsonFetch<{
      ok: boolean;
      pushId: number;
      results: Array<{
        tenantId: string;
        status: "rolledback" | "skipped" | "failed";
        error?: string | null;
      }>;
    }>(
      `/api/directive/pushes/${pushId}/rollback`,
      { method: "POST" },
    ),

  directiveAudit: (opts: { tenantId?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.tenantId) q.set("tenantId", opts.tenantId);
    if (opts.limit) q.set("limit", String(opts.limit));
    const qs = q.toString();
    return jsonFetch<{
      actions: Array<{
        id: number;
        tenantId: string;
        tenantNameEn: string;
        tenantNameAr: string;
        actionType: string;
        targetId: string | null;
        status: "success" | "failed" | "simulated";
        inputJson: string | null;
        resultJson: string | null;
        errorMessage: string | null;
        actorUserId: string | null;
        at: string;
      }>;
    }>(`/api/directive/audit${qs ? `?${qs}` : ""}`);
  },
};
