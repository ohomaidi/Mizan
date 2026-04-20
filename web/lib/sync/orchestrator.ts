import "server-only";
import {
  listTenants,
  markConsentRevoked,
  markSyncResult,
  type TenantRow,
} from "@/lib/db/tenants";
import { pruneOldSnapshots, writeSnapshot } from "@/lib/db/signals";
import {
  fetchAdvancedHunting,
  fetchAttackSimulations,
  fetchCommComplianceAlerts,
  fetchConditionalAccess,
  fetchDevices,
  fetchDfiSensorHealth,
  fetchDlpAlerts,
  fetchIncidents,
  fetchIrmAlerts,
  fetchLabelAdoption,
  fetchPimSprawl,
  fetchRetentionLabels,
  fetchRiskyUsers,
  fetchSecureScore,
  fetchSensitivityLabels,
  fetchSharepointSettings,
  fetchSubjectRightsRequests,
  fetchThreatIntelligence,
} from "@/lib/graph/signals";
import { GraphError } from "@/lib/graph/fetch";
import { invalidateTenantToken } from "@/lib/graph/msal";
import { config } from "@/lib/config";

/**
 * AADSTS codes that indicate the Council's multi-tenant app is no longer trusted
 * in the entity's tenant (consent withdrawn, app uninstalled, or service principal
 * removed). If MSAL returns any of these, `consent_status` flips to 'revoked' so
 * the Settings tab can surface it and stop retrying.
 *
 *   AADSTS65001     — user / admin has not consented to the app
 *   AADSTS700016    — application not found in the directory (uninstalled)
 *   AADSTS7000222   — client credentials expired (usually secret rotation, not revocation — excluded)
 *   AADSTS50020     — user account from identity provider not in tenant
 *   AADSTS500011    — resource principal not found in tenant
 */
const REVOCATION_AADSTS = [
  "AADSTS65001",
  "AADSTS700016",
  "AADSTS50020",
  "AADSTS500011",
];

function isRevocationError(e: {
  status?: number;
  message: string;
}): boolean {
  if (e.status === 401) return true;
  const msg = e.message || "";
  return REVOCATION_AADSTS.some((code) => msg.includes(code));
}

export type SyncResult = {
  tenantId: string;
  ok: boolean;
  errors: Array<{ signal: string; message: string; status?: number }>;
  durationMs: number;
};

const SIGNAL_ORDER = [
  // Defender / Entra / Intune — original Phase 2 set.
  { type: "secureScore", run: fetchSecureScore },
  { type: "conditionalAccess", run: fetchConditionalAccess },
  { type: "riskyUsers", run: fetchRiskyUsers },
  { type: "devices", run: fetchDevices },
  { type: "incidents", run: fetchIncidents },
  // Purview reads.
  { type: "dlpAlerts", run: fetchDlpAlerts },
  { type: "irmAlerts", run: fetchIrmAlerts },
  { type: "commCompAlerts", run: fetchCommComplianceAlerts },
  { type: "subjectRightsRequests", run: fetchSubjectRightsRequests },
  { type: "retentionLabels", run: fetchRetentionLabels },
  { type: "sensitivityLabels", run: fetchSensitivityLabels },
  { type: "sharepointSettings", run: fetchSharepointSettings },
  // Defender-side depth.
  { type: "pimSprawl", run: fetchPimSprawl },
  { type: "dfiSensorHealth", run: fetchDfiSensorHealth },
  { type: "attackSimulations", run: fetchAttackSimulations },
  { type: "threatIntelligence", run: fetchThreatIntelligence },
  // Advanced Hunting runs last so per-tenant throttle doesn't starve simpler calls.
  { type: "advancedHunting", run: fetchAdvancedHunting },
  // Label adoption telemetry (async job — submits or polls depending on state).
  { type: "labelAdoption", run: fetchLabelAdoption },
] as const;

/**
 * Run one signal, persist a snapshot, and return whether it succeeded.
 * We write a snapshot on both success and failure so we always have audit state.
 */
async function runOne<P>(
  tenant: TenantRow,
  signalType: (typeof SIGNAL_ORDER)[number]["type"],
  run: (ctx: { tenantGuid: string; ourTenantId: string }) => Promise<P>,
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  try {
    const payload = await run({
      tenantGuid: tenant.tenant_id,
      ourTenantId: tenant.id,
    });
    writeSnapshot<P>({
      tenant_id: tenant.id,
      signal_type: signalType,
      ok: true,
      payload,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof GraphError ? err.status : undefined;
    writeSnapshot({
      tenant_id: tenant.id,
      signal_type: signalType,
      ok: false,
      http_status: status,
      error_message: message,
    });
    return { ok: false, message, status };
  }
}

export async function syncTenant(tenant: TenantRow): Promise<SyncResult> {
  const started = Date.now();
  const errors: SyncResult["errors"] = [];

  if (tenant.is_demo === 1) {
    // Demo tenants carry pre-baked snapshots. Skip without touching anything.
    return {
      tenantId: tenant.id,
      ok: true,
      errors: [],
      durationMs: Date.now() - started,
    };
  }

  if (tenant.suspended_at) {
    const message = `Skipping tenant ${tenant.id}: suspended at ${tenant.suspended_at}`;
    return {
      tenantId: tenant.id,
      ok: true,
      errors: [{ signal: "precondition", message }],
      durationMs: Date.now() - started,
    };
  }

  if (tenant.consent_status !== "consented") {
    const message = `Skipping tenant ${tenant.id}: consent status is ${tenant.consent_status}`;
    markSyncResult(tenant.id, false, message);
    return {
      tenantId: tenant.id,
      ok: false,
      errors: [{ signal: "precondition", message }],
      durationMs: Date.now() - started,
    };
  }

  for (const s of SIGNAL_ORDER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await runOne(tenant, s.type, s.run as any);
    if (!res.ok) {
      errors.push({
        signal: s.type,
        message: res.message,
        status: res.status,
      });
    }
  }

  const ok = errors.length === 0;
  markSyncResult(
    tenant.id,
    ok,
    ok ? undefined : errors.map((e) => `${e.signal}: ${e.message}`).join(" | "),
  );

  // Revocation auto-detection. If EVERY signal failed with a revocation-class error,
  // the Council's app registration has been removed from this entity's tenant.
  // Flip consent_status so the Settings surface shows it and the next sync skips.
  if (!ok && errors.length === SIGNAL_ORDER.length && errors.every(isRevocationError)) {
    const reason = errors[0]?.message ?? "Consent appears revoked";
    markConsentRevoked(
      tenant.id,
      `Auto-detected revocation on ${new Date().toISOString().slice(0, 10)}: ${reason}`,
    );
    invalidateTenantToken(tenant.tenant_id);
  }

  return {
    tenantId: tenant.id,
    ok,
    errors,
    durationMs: Date.now() - started,
  };
}

/**
 * Default concurrency: 5 parallel tenant workers.
 *
 * Design: signals WITHIN a tenant stay serial to respect Graph's per-tenant
 * throttling envelope. Tenants BETWEEN each other are independent — throttling is
 * per-tenant-app-pair, so different tenants don't compete. 200 tenants × 5 signals
 * runs in ~25s concurrent vs ~3min serial.
 *
 * Tune via SCSC_SYNC_CONCURRENCY env var. Clamped to [1, 20] to avoid exhausting
 * sockets or the Graph global quota.
 */
function getSyncConcurrency(): number {
  const raw = Number(process.env.SCSC_SYNC_CONCURRENCY);
  if (!Number.isFinite(raw) || raw < 1) return 5;
  return Math.min(20, Math.max(1, Math.floor(raw)));
}

export async function syncAllTenants(): Promise<SyncResult[]> {
  const tenants = listTenants().filter(
    (t) => t.consent_status === "consented" && !t.suspended_at,
  );

  const concurrency = getSyncConcurrency();
  const results: SyncResult[] = new Array(tenants.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= tenants.length) return;
      results[i] = await syncTenant(tenants[i]);
    }
  };

  const workerCount = Math.min(concurrency, tenants.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  // Prune old snapshots after a full sync so the DB stays bounded.
  try {
    const removed = pruneOldSnapshots(config.retentionDays);
    if (removed > 0) {
      console.log(
        `[sync] pruned ${removed} snapshot row(s) older than ${config.retentionDays}d`,
      );
    }
  } catch (err) {
    console.warn("[sync] snapshot prune failed:", (err as Error).message);
  }
  return results;
}
