import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db/client";
import { listTenants } from "@/lib/db/tenants";
import {
  computeFromSnapshots,
  type MaturityBreakdown,
} from "@/lib/compute/maturity";
import { writeMaturitySnapshot } from "@/lib/db/maturity-snapshots";
import type {
  ConditionalAccessPayload,
  DevicesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
  SecureScorePayload,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reconstruct historical maturity scores from `signal_snapshots` and
 * populate `maturity_snapshots` retrospectively. Designed to run once
 * after an upgrade that introduced the trend feature — so Entity Detail
 * immediately shows 30+ days of trend data instead of a flat line.
 *
 * Algorithm (per tenant):
 *   1. List every distinct calendar day that has at least one signal
 *      snapshot for this tenant.
 *   2. For each day, take the latest snapshot per signal_type as-of
 *      end-of-day (23:59:59Z).
 *   3. Feed those five primary snapshots into computeFromSnapshots()
 *      and insert a maturity_snapshots row with captured_at = that day's
 *      end-of-day timestamp.
 *   4. Skip days that already have a maturity_snapshots row (idempotent).
 *
 * Admin only. Not throttled — run once, done.
 */

const PRIMARY_TYPES = [
  "secureScore",
  "conditionalAccess",
  "riskyUsers",
  "devices",
  "incidents",
] as const;

type DayRow = { day: string };
type LatestRow = {
  signal_type: string;
  fetched_at: string;
  payload: string | null;
};

export async function POST() {
  const role = await apiRequireRole("admin");
  if (!role.ok) return role.response;

  const db = getDb();
  const tenants = listTenants().filter((t) => t.is_demo !== 1);
  let tenantsProcessed = 0;
  let rowsInserted = 0;
  let daysSkipped = 0;

  for (const t of tenants) {
    // Distinct days that have at least one signal snapshot for this tenant.
    const days = db
      .prepare(
        `SELECT DISTINCT substr(fetched_at, 1, 10) AS day
           FROM signal_snapshots
          WHERE tenant_id = ?
          ORDER BY day ASC`,
      )
      .all(t.id) as DayRow[];

    for (const { day } of days) {
      const endOfDay = `${day}T23:59:59.999Z`;

      // Skip if we already have a maturity snapshot for this day+tenant.
      const existing = db
        .prepare(
          `SELECT id FROM maturity_snapshots
            WHERE tenant_id = ?
              AND substr(captured_at, 1, 10) = ?
            LIMIT 1`,
        )
        .get(t.id, day);
      if (existing) {
        daysSkipped++;
        continue;
      }

      // Latest snapshot per signal_type as-of end-of-day, for the 5
      // primary signals that drive the Maturity Index today.
      const placeholders = PRIMARY_TYPES.map(() => "?").join(",");
      const latestRows = db
        .prepare(
          `SELECT s.signal_type, s.fetched_at, s.payload FROM signal_snapshots s
           INNER JOIN (
             SELECT signal_type, MAX(fetched_at) AS max_at
               FROM signal_snapshots
              WHERE tenant_id = ?
                AND fetched_at <= ?
                AND signal_type IN (${placeholders})
                AND ok = 1
              GROUP BY signal_type
           ) latest
              ON s.signal_type = latest.signal_type
             AND s.fetched_at = latest.max_at
           WHERE s.tenant_id = ?`,
        )
        .all(t.id, endOfDay, ...PRIMARY_TYPES, t.id) as LatestRow[];

      // Assemble the shape computeFromSnapshots expects.
      const byType = new Map<string, unknown>();
      for (const r of latestRows) {
        if (!r.payload) continue;
        try {
          byType.set(r.signal_type, JSON.parse(r.payload));
        } catch {
          /* skip malformed */
        }
      }

      const breakdown: MaturityBreakdown = computeFromSnapshots({
        secureScore:
          (byType.get("secureScore") as SecureScorePayload | undefined) ??
          null,
        conditionalAccess:
          (byType.get("conditionalAccess") as
            | ConditionalAccessPayload
            | undefined) ?? null,
        riskyUsers:
          (byType.get("riskyUsers") as RiskyUsersPayload | undefined) ?? null,
        devices:
          (byType.get("devices") as DevicesPayload | undefined) ?? null,
        incidents:
          (byType.get("incidents") as IncidentsPayload | undefined) ?? null,
      });

      if (!breakdown.hasData) continue;

      writeMaturitySnapshot({
        tenant_id: t.id,
        overall: breakdown.index,
        secureScore: breakdown.subScores.secureScore,
        identity: breakdown.subScores.identity,
        device: breakdown.subScores.device,
        data: breakdown.subScores.data,
        threat: breakdown.subScores.threat,
        compliance: breakdown.subScores.compliance,
        capturedAt: endOfDay,
      });
      rowsInserted++;
    }

    tenantsProcessed++;
  }

  return NextResponse.json({
    ok: true,
    tenantsProcessed,
    rowsInserted,
    daysSkipped,
  });
}
