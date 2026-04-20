import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  ConditionalAccessPayload,
  DevicesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aggregates the latest snapshot for every consented tenant into Council-level roll-ups
 * powering the top-level Identity / Threats / Devices pages.
 */
export async function GET() {
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  type PerEntity<T> = { id: string; nameEn: string; nameAr: string; cluster: string; payload: T | null };

  const identity: PerEntity<RiskyUsersPayload & { caPolicies: number; caMfa: number }>[] = [];
  const threats: PerEntity<IncidentsPayload>[] = [];
  const devices: PerEntity<DevicesPayload>[] = [];

  for (const t of tenants) {
    const ru = getLatestSnapshot<RiskyUsersPayload>(t.id, "riskyUsers")?.payload ?? null;
    const ca = getLatestSnapshot<ConditionalAccessPayload>(t.id, "conditionalAccess")?.payload ?? null;
    const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents")?.payload ?? null;
    const dv = getLatestSnapshot<DevicesPayload>(t.id, "devices")?.payload ?? null;

    identity.push({
      id: t.id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      payload: ru
        ? {
            ...ru,
            caPolicies: ca?.total ?? 0,
            caMfa: ca?.requiresMfaCount ?? 0,
          }
        : null,
    });
    threats.push({
      id: t.id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      payload: inc,
    });
    devices.push({
      id: t.id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      payload: dv,
    });
  }

  // Totals
  const totals = {
    identity: {
      totalUsers: identity.reduce((n, e) => n + (e.payload?.total ?? 0), 0),
      atRisk: identity.reduce((n, e) => n + (e.payload?.atRisk ?? 0), 0),
      caMfa: identity.reduce((n, e) => n + (e.payload?.caMfa ?? 0), 0),
    },
    threats: {
      total: threats.reduce((n, e) => n + (e.payload?.total ?? 0), 0),
      active: threats.reduce((n, e) => n + (e.payload?.active ?? 0), 0),
      resolved: threats.reduce((n, e) => n + (e.payload?.resolved ?? 0), 0),
      bySeverity: threats.reduce<Record<string, number>>((acc, e) => {
        const bs = e.payload?.bySeverity ?? {};
        for (const [k, v] of Object.entries(bs)) acc[k] = (acc[k] ?? 0) + v;
        return acc;
      }, {}),
    },
    devices: {
      total: devices.reduce((n, e) => n + (e.payload?.total ?? 0), 0),
      compliant: devices.reduce((n, e) => n + (e.payload?.compliant ?? 0), 0),
      nonCompliant: devices.reduce((n, e) => n + (e.payload?.nonCompliant ?? 0), 0),
      byOs: devices.reduce<Record<string, number>>((acc, e) => {
        const bs = e.payload?.byOs ?? {};
        for (const [k, v] of Object.entries(bs)) acc[k] = (acc[k] ?? 0) + v;
        return acc;
      }, {}),
    },
  };

  return NextResponse.json({ totals, identity, threats, devices });
}
