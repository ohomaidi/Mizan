import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  PurviewAlertsPayload,
  RetentionLabelsPayload,
  SensitivityLabelsPayload,
  SharepointSettingsPayload,
  SubjectRightsRequestsPayload,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Council-wide Purview roll-up powering /data.
export async function GET() {
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  const perEntity: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
    cluster: string;
    dlp: PurviewAlertsPayload | null;
    irm: PurviewAlertsPayload | null;
    commComp: PurviewAlertsPayload | null;
    srrs: SubjectRightsRequestsPayload | null;
    retentionLabels: RetentionLabelsPayload | null;
    sensitivityLabels: SensitivityLabelsPayload | null;
    sharepoint: SharepointSettingsPayload | null;
  }> = [];

  for (const t of tenants) {
    perEntity.push({
      id: t.id,
      nameEn: t.name_en,
      nameAr: t.name_ar,
      cluster: t.cluster,
      dlp: getLatestSnapshot<PurviewAlertsPayload>(t.id, "dlpAlerts")?.payload ?? null,
      irm: getLatestSnapshot<PurviewAlertsPayload>(t.id, "irmAlerts")?.payload ?? null,
      commComp:
        getLatestSnapshot<PurviewAlertsPayload>(t.id, "commCompAlerts")?.payload ?? null,
      srrs:
        getLatestSnapshot<SubjectRightsRequestsPayload>(t.id, "subjectRightsRequests")
          ?.payload ?? null,
      retentionLabels:
        getLatestSnapshot<RetentionLabelsPayload>(t.id, "retentionLabels")?.payload ?? null,
      sensitivityLabels:
        getLatestSnapshot<SensitivityLabelsPayload>(t.id, "sensitivityLabels")?.payload ??
        null,
      sharepoint:
        getLatestSnapshot<SharepointSettingsPayload>(t.id, "sharepointSettings")?.payload ??
        null,
    });
  }

  const sum = <T extends object | null>(
    extract: (e: (typeof perEntity)[number]) => number,
  ) => perEntity.reduce((n, e) => n + (extract(e) || 0), 0);

  const sharingBreakdown: Record<string, number> = {};
  for (const e of perEntity) {
    const c = e.sharepoint?.sharingCapability ?? "unknown";
    sharingBreakdown[c] = (sharingBreakdown[c] ?? 0) + 1;
  }

  const totals = {
    dlp: {
      total: sum((e) => e.dlp?.total ?? 0),
      active: sum((e) => e.dlp?.active ?? 0),
      resolved: sum((e) => e.dlp?.resolved ?? 0),
    },
    irm: {
      total: sum((e) => e.irm?.total ?? 0),
      active: sum((e) => e.irm?.active ?? 0),
    },
    commComp: {
      total: sum((e) => e.commComp?.total ?? 0),
      active: sum((e) => e.commComp?.active ?? 0),
    },
    srrs: {
      total: sum((e) => e.srrs?.total ?? 0),
      active: sum((e) => e.srrs?.active ?? 0),
      overdue: sum((e) => e.srrs?.overdue ?? 0),
    },
    retention: {
      avgLabels: perEntity.length
        ? Math.round(
            (sum((e) => e.retentionLabels?.total ?? 0) / perEntity.length) * 10,
          ) / 10
        : 0,
      recordLabels: sum((e) => e.retentionLabels?.recordLabels ?? 0),
    },
    sensitivity: {
      avgActive: perEntity.length
        ? Math.round(
            (sum((e) => e.sensitivityLabels?.activeCount ?? 0) / perEntity.length) * 10,
          ) / 10
        : 0,
    },
    sharing: sharingBreakdown,
  };

  return NextResponse.json({ totals, entities: perEntity });
}
