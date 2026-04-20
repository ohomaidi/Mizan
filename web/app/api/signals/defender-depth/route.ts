import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  AdvancedHuntingPayload,
  AttackSimulationPayload,
  DfiSensorHealthPayload,
  PimSprawlPayload,
  ThreatIntelPayload,
} from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Council-wide roll-up of Defender-depth signals (PIM, DFI, Attack Sim, TI, KQL packs).
export async function GET() {
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  const entities = tenants.map((t) => ({
    id: t.id,
    nameEn: t.name_en,
    nameAr: t.name_ar,
    cluster: t.cluster,
    pim: getLatestSnapshot<PimSprawlPayload>(t.id, "pimSprawl")?.payload ?? null,
    dfi:
      getLatestSnapshot<DfiSensorHealthPayload>(t.id, "dfiSensorHealth")?.payload ?? null,
    attackSim:
      getLatestSnapshot<AttackSimulationPayload>(t.id, "attackSimulations")?.payload ??
      null,
    ti: getLatestSnapshot<ThreatIntelPayload>(t.id, "threatIntelligence")?.payload ?? null,
    hunting:
      getLatestSnapshot<AdvancedHuntingPayload>(t.id, "advancedHunting")?.payload ?? null,
  }));

  const totals = {
    pim: {
      standingAdmins: entities.reduce((n, e) => n + (e.pim?.activeAssignments ?? 0), 0),
      eligibleOnly: entities.reduce((n, e) => n + (e.pim?.eligibleAssignments ?? 0), 0),
      privilegedStanding: entities.reduce(
        (n, e) => n + (e.pim?.privilegedRoleAssignments ?? 0),
        0,
      ),
    },
    dfi: {
      unhealthy: entities.reduce((n, e) => n + (e.dfi?.unhealthy ?? 0), 0),
      total: entities.reduce((n, e) => n + (e.dfi?.total ?? 0), 0),
    },
    attackSim: {
      totalAttempts: entities.reduce((n, e) => n + (e.attackSim?.totalAttempts ?? 0), 0),
      totalClicks: entities.reduce((n, e) => n + (e.attackSim?.clicks ?? 0), 0),
    },
    hunting: {
      totalHits: entities.reduce(
        (n, e) => n + (e.hunting?.packs?.reduce((s, p) => s + p.rowCount, 0) ?? 0),
        0,
      ),
    },
  };

  return NextResponse.json({ totals, entities });
}
