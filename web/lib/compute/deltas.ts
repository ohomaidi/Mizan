import "server-only";
import { getSnapshotAsOf } from "@/lib/db/signals";
import { computeFromSnapshots } from "./maturity";
import type {
  ConditionalAccessPayload,
  DevicesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
  SecureScorePayload,
} from "@/lib/graph/signals";

/**
 * Compute the Maturity Index for a given tenant as-of `daysAgo` days ago using the most
 * recent snapshot from each signal type that precedes that cutoff. Returns null when
 * there is no historical data (e.g., tenant was onboarded less than `daysAgo` ago).
 */
export function computeMaturityAsOf(
  tenantId: string,
  daysAgo: number,
): number | null {
  const ss = getSnapshotAsOf<SecureScorePayload>(tenantId, "secureScore", daysAgo);
  const ca = getSnapshotAsOf<ConditionalAccessPayload>(tenantId, "conditionalAccess", daysAgo);
  const ru = getSnapshotAsOf<RiskyUsersPayload>(tenantId, "riskyUsers", daysAgo);
  const dv = getSnapshotAsOf<DevicesPayload>(tenantId, "devices", daysAgo);
  const inc = getSnapshotAsOf<IncidentsPayload>(tenantId, "incidents", daysAgo);

  if (!ss && !ca && !ru && !dv && !inc) return null;

  return computeFromSnapshots({
    secureScore: ss?.payload ?? null,
    conditionalAccess: ca?.payload ?? null,
    riskyUsers: ru?.payload ?? null,
    devices: dv?.payload ?? null,
    incidents: inc?.payload ?? null,
  }).index;
}

export function deltaFromAsOf(current: number, asOf: number | null): number | null {
  if (asOf === null) return null;
  return Math.round((current - asOf) * 10) / 10;
}
