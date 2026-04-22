import "server-only";
import { getDb } from "./client";

export type SignalType =
  | "secureScore"
  | "conditionalAccess"
  | "riskyUsers"
  | "devices"
  | "incidents"
  | "dlpAlerts"
  | "irmAlerts"
  | "commCompAlerts"
  | "subjectRightsRequests"
  | "retentionLabels"
  | "sensitivityLabels"
  | "sharepointSettings"
  | "pimSprawl"
  | "dfiSensorHealth"
  | "attackSimulations"
  | "threatIntelligence"
  | "advancedHunting"
  | "labelAdoption"
  | "vulnerabilities";

export type SignalSnapshot<P = unknown> = {
  id: number;
  tenant_id: string;
  signal_type: SignalType;
  fetched_at: string;
  ok: 0 | 1;
  http_status: number | null;
  error_message: string | null;
  payload: P | null;
};

type DbRow = Omit<SignalSnapshot, "payload"> & { payload: string | null };

function hydrate<P>(row: DbRow | undefined): SignalSnapshot<P> | null {
  if (!row) return null;
  return {
    ...row,
    payload: row.payload ? (JSON.parse(row.payload) as P) : null,
  };
}

export function writeSnapshot<P>(snap: {
  tenant_id: string;
  signal_type: SignalType;
  ok: boolean;
  http_status?: number;
  error_message?: string;
  payload?: P;
}): void {
  getDb()
    .prepare(
      `INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, error_message, payload)
       VALUES (@tenant_id, @signal_type, @ok, @http_status, @error_message, @payload)`,
    )
    .run({
      tenant_id: snap.tenant_id,
      signal_type: snap.signal_type,
      ok: snap.ok ? 1 : 0,
      http_status: snap.http_status ?? null,
      error_message: snap.error_message ?? null,
      payload: snap.payload ? JSON.stringify(snap.payload) : null,
    });
}

export function getLatestSnapshot<P>(
  tenantId: string,
  signalType: SignalType,
): SignalSnapshot<P> | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM signal_snapshots
        WHERE tenant_id = ? AND signal_type = ?
        ORDER BY fetched_at DESC LIMIT 1`,
    )
    .get(tenantId, signalType) as DbRow | undefined;
  return hydrate<P>(row);
}

const ALL_SIGNAL_TYPES: SignalType[] = [
  "secureScore",
  "conditionalAccess",
  "riskyUsers",
  "devices",
  "incidents",
  "dlpAlerts",
  "irmAlerts",
  "commCompAlerts",
  "subjectRightsRequests",
  "retentionLabels",
  "sensitivityLabels",
  "sharepointSettings",
  "pimSprawl",
  "dfiSensorHealth",
  "attackSimulations",
  "threatIntelligence",
  "advancedHunting",
  "labelAdoption",
  "vulnerabilities",
];

export function getLatestSnapshotsForTenant(
  tenantId: string,
): Record<SignalType, SignalSnapshot<unknown> | null> {
  return ALL_SIGNAL_TYPES.reduce(
    (acc, t) => {
      acc[t] = getLatestSnapshot(tenantId, t);
      return acc;
    },
    {} as Record<SignalType, SignalSnapshot<unknown> | null>,
  );
}

export function recordEndpointHealth(params: {
  tenantId: string;
  endpoint: string;
  ok: boolean;
  throttled: boolean;
  errorMessage?: string;
}): void {
  const { tenantId, endpoint, ok, throttled, errorMessage } = params;
  const db = getDb();
  db.prepare(
    `INSERT INTO endpoint_health (tenant_id, endpoint, last_success_at, last_error_at,
                                   last_error_message, call_count_24h, throttle_count_24h)
     VALUES (
       @tenantId, @endpoint,
       CASE WHEN @ok = 1 THEN datetime('now') ELSE NULL END,
       CASE WHEN @ok = 0 THEN datetime('now') ELSE NULL END,
       @errorMessage,
       1,
       CASE WHEN @throttled = 1 THEN 1 ELSE 0 END
     )
     ON CONFLICT(tenant_id, endpoint) DO UPDATE SET
       last_success_at = CASE WHEN @ok = 1 THEN datetime('now') ELSE last_success_at END,
       last_error_at = CASE WHEN @ok = 0 THEN datetime('now') ELSE last_error_at END,
       last_error_message = CASE WHEN @ok = 0 THEN @errorMessage ELSE last_error_message END,
       call_count_24h = call_count_24h + 1,
       throttle_count_24h = throttle_count_24h + CASE WHEN @throttled = 1 THEN 1 ELSE 0 END,
       updated_at = datetime('now')`,
  ).run({
    tenantId,
    endpoint,
    ok: ok ? 1 : 0,
    throttled: throttled ? 1 : 0,
    errorMessage: errorMessage ?? null,
  });
}

/**
 * Find the most recent snapshot strictly older than `daysAgo`. Used by the deltas module to
 * compare current state to N days ago.
 */
export function getSnapshotAsOf<P>(
  tenantId: string,
  signalType: SignalType,
  daysAgo: number,
): SignalSnapshot<P> | null {
  const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const row = getDb()
    .prepare(
      `SELECT * FROM signal_snapshots
        WHERE tenant_id = ? AND signal_type = ? AND fetched_at <= ?
        ORDER BY fetched_at DESC LIMIT 1`,
    )
    .get(tenantId, signalType, cutoff) as DbRow | undefined;
  return hydrate<P>(row);
}

/**
 * Delete snapshots older than the retention window. Returns rows deleted.
 * Called from the sync orchestrator at the end of each run.
 */
export function pruneOldSnapshots(retentionDays: number): number {
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const res = getDb()
    .prepare("DELETE FROM signal_snapshots WHERE fetched_at < ?")
    .run(cutoff);
  return res.changes ?? 0;
}

export function getEndpointHealthAll(): Array<{
  tenant_id: string;
  endpoint: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  call_count_24h: number;
  throttle_count_24h: number;
  updated_at: string;
}> {
  return getDb()
    .prepare(
      `SELECT tenant_id, endpoint, last_success_at, last_error_at, last_error_message,
              call_count_24h, throttle_count_24h, updated_at
         FROM endpoint_health
        ORDER BY updated_at DESC`,
    )
    .all() as Array<{
      tenant_id: string;
      endpoint: string;
      last_success_at: string | null;
      last_error_at: string | null;
      last_error_message: string | null;
      call_count_24h: number;
      throttle_count_24h: number;
      updated_at: string;
    }>;
}

export function getEndpointHealthForTenant(
  tenantId: string,
): Array<{
  endpoint: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  call_count_24h: number;
  throttle_count_24h: number;
}> {
  return getDb()
    .prepare(
      `SELECT endpoint, last_success_at, last_error_at, last_error_message,
              call_count_24h, throttle_count_24h
         FROM endpoint_health
        WHERE tenant_id = ?
        ORDER BY endpoint ASC`,
    )
    .all(tenantId) as Array<{
      endpoint: string;
      last_success_at: string | null;
      last_error_at: string | null;
      last_error_message: string | null;
      call_count_24h: number;
      throttle_count_24h: number;
    }>;
}
