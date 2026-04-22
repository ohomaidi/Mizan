import "server-only";
import { getDb } from "./client";

/**
 * Per-tenant maturity-score time series. One row is appended every time a
 * `syncTenant()` run completes successfully — it captures the six sub-score
 * values + the overall index as they were at the moment the operator observed
 * them, so historical charts remain stable even if someone re-tunes the
 * weights in Settings → Maturity Index.
 *
 * Retention honors the same `SCSC_RETENTION_DAYS` env var as signal_snapshots.
 */

export type MaturitySnapshotRow = {
  id: number;
  tenant_id: string;
  captured_at: string;
  overall: number;
  secure_score: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
};

export type MaturitySnapshotInput = {
  tenant_id: string;
  overall: number;
  secureScore: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
  capturedAt?: string; // override for backfill; defaults to "now" at SQL level
};

export function writeMaturitySnapshot(snap: MaturitySnapshotInput): void {
  const db = getDb();
  if (snap.capturedAt) {
    db.prepare(
      `INSERT INTO maturity_snapshots
         (tenant_id, captured_at, overall, secure_score, identity, device, data, threat, compliance)
       VALUES
         (@tenant_id, @captured_at, @overall, @secure_score, @identity, @device, @data, @threat, @compliance)`,
    ).run({
      tenant_id: snap.tenant_id,
      captured_at: snap.capturedAt,
      overall: snap.overall,
      secure_score: snap.secureScore,
      identity: snap.identity,
      device: snap.device,
      data: snap.data,
      threat: snap.threat,
      compliance: snap.compliance,
    });
    return;
  }
  db.prepare(
    `INSERT INTO maturity_snapshots
       (tenant_id, overall, secure_score, identity, device, data, threat, compliance)
     VALUES
       (@tenant_id, @overall, @secure_score, @identity, @device, @data, @threat, @compliance)`,
  ).run({
    tenant_id: snap.tenant_id,
    overall: snap.overall,
    secure_score: snap.secureScore,
    identity: snap.identity,
    device: snap.device,
    data: snap.data,
    threat: snap.threat,
    compliance: snap.compliance,
  });
}

export type Granularity = "daily" | "weekly" | "monthly";

/**
 * Return the maturity series for one tenant over the last `sinceDays` days,
 * bucketed by granularity. For `weekly` / `monthly` we return the *latest*
 * snapshot in each bucket — that matches operator intuition ("what was the
 * score at end of last week?") better than an average that can hide a drop.
 */
export function listMaturitySnapshotsForTenant(
  tenantId: string,
  opts: { sinceDays?: number; granularity?: Granularity } = {},
): MaturitySnapshotRow[] {
  const db = getDb();
  const since = opts.sinceDays ?? 90;
  const cutoff = new Date(Date.now() - since * 24 * 60 * 60 * 1000).toISOString();
  const granularity: Granularity = opts.granularity ?? "daily";

  if (granularity === "daily") {
    // Latest snapshot per calendar day — handles the case where an operator
    // kicks off multiple manual syncs in one day.
    return db
      .prepare(
        `SELECT ms.* FROM maturity_snapshots ms
         INNER JOIN (
           SELECT tenant_id, substr(captured_at, 1, 10) AS d, MAX(captured_at) AS max_at
             FROM maturity_snapshots
            WHERE tenant_id = ? AND captured_at >= ?
            GROUP BY tenant_id, d
         ) latest
            ON ms.tenant_id = latest.tenant_id
           AND ms.captured_at = latest.max_at
         WHERE ms.tenant_id = ? AND ms.captured_at >= ?
         ORDER BY ms.captured_at ASC`,
      )
      .all(tenantId, cutoff, tenantId, cutoff) as MaturitySnapshotRow[];
  }

  if (granularity === "weekly") {
    // Latest snapshot per ISO-year-week. SQLite's strftime('%Y-%W', ...) is
    // close enough for dashboard trend purposes.
    return db
      .prepare(
        `SELECT ms.* FROM maturity_snapshots ms
         INNER JOIN (
           SELECT tenant_id, strftime('%Y-%W', captured_at) AS wk, MAX(captured_at) AS max_at
             FROM maturity_snapshots
            WHERE tenant_id = ? AND captured_at >= ?
            GROUP BY tenant_id, wk
         ) latest
            ON ms.tenant_id = latest.tenant_id
           AND ms.captured_at = latest.max_at
         WHERE ms.tenant_id = ? AND ms.captured_at >= ?
         ORDER BY ms.captured_at ASC`,
      )
      .all(tenantId, cutoff, tenantId, cutoff) as MaturitySnapshotRow[];
  }

  // monthly
  return db
    .prepare(
      `SELECT ms.* FROM maturity_snapshots ms
       INNER JOIN (
         SELECT tenant_id, substr(captured_at, 1, 7) AS mo, MAX(captured_at) AS max_at
           FROM maturity_snapshots
          WHERE tenant_id = ? AND captured_at >= ?
          GROUP BY tenant_id, mo
       ) latest
          ON ms.tenant_id = latest.tenant_id
         AND ms.captured_at = latest.max_at
       WHERE ms.tenant_id = ? AND ms.captured_at >= ?
       ORDER BY ms.captured_at ASC`,
    )
    .all(tenantId, cutoff, tenantId, cutoff) as MaturitySnapshotRow[];
}

/** Latest snapshot per tenant, useful for estate-wide rollups. */
export function latestMaturitySnapshots(): MaturitySnapshotRow[] {
  return getDb()
    .prepare(
      `SELECT ms.* FROM maturity_snapshots ms
       INNER JOIN (
         SELECT tenant_id, MAX(captured_at) AS max_at
           FROM maturity_snapshots
          GROUP BY tenant_id
       ) latest
          ON ms.tenant_id = latest.tenant_id
         AND ms.captured_at = latest.max_at`,
    )
    .all() as MaturitySnapshotRow[];
}

/**
 * Delete snapshots older than the retention window. Called from the sync
 * orchestrator at the end of each run, next to the signal-snapshot prune.
 */
export function pruneOldMaturitySnapshots(retentionDays: number): number {
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const res = getDb()
    .prepare("DELETE FROM maturity_snapshots WHERE captured_at < ?")
    .run(cutoff);
  return res.changes ?? 0;
}
