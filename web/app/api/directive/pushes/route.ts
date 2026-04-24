import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { listPushRequests } from "@/lib/directive/push-store";
import { listTenants, type TenantRow } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/pushes — history of every baseline push. Joined with
 * tenant names so the UI can render targets without a second round trip.
 */
export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, Number(limitRaw) || 50)) : 50;

  const rows = listPushRequests(limit);
  const tenants = listTenants() as TenantRow[];
  const nameById = new Map<string, { nameEn: string; nameAr: string }>(
    tenants.map((t) => [t.id, { nameEn: t.name_en, nameAr: t.name_ar }]),
  );

  return NextResponse.json({
    pushes: rows.map((r) => {
      const targets: string[] = JSON.parse(r.target_tenant_ids_json) as string[];
      return {
        id: r.id,
        baselineId: r.baseline_id,
        status: r.status,
        pushedByUserId: r.pushed_by_user_id,
        targetTenantIds: targets,
        targetTenantNames: targets.map((tid) => ({
          id: tid,
          nameEn: nameById.get(tid)?.nameEn ?? tid,
          nameAr: nameById.get(tid)?.nameAr ?? tid,
        })),
        optionsJson: r.options_json,
        summaryJson: r.summary_json,
        createdAt: r.created_at,
        executedAt: r.executed_at,
        rolledbackAt: r.rolledback_at,
      };
    }),
  });
}
