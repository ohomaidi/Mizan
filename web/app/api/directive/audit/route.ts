import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { listDirectiveActions } from "@/lib/directive/audit";
import { listTenants, type TenantRow } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/audit — list recent directive actions. Filterable by
 * tenantId, bounded at 500 rows. Used by the /directive Audit tab and by
 * the per-entity directive history section (future).
 */
export async function GET(req: NextRequest) {
  // viewer role is enough to READ the audit log — analysts push, viewers
  // and admins can see.
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const url = req.nextUrl;
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(500, Number(limitRaw) || 50)) : 50;

  const rows = listDirectiveActions({ tenantId, limit });

  // Join tenant names so the UI doesn't need a second lookup per row.
  const tenants = listTenants();
  const nameById = new Map<string, { nameEn: string; nameAr: string }>();
  for (const t of tenants as TenantRow[]) {
    nameById.set(t.id, { nameEn: t.name_en, nameAr: t.name_ar });
  }

  return NextResponse.json({
    actions: rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantNameEn: nameById.get(r.tenant_id)?.nameEn ?? r.tenant_id,
      tenantNameAr: nameById.get(r.tenant_id)?.nameAr ?? r.tenant_id,
      actionType: r.action_type,
      targetId: r.target_id,
      status: r.status,
      inputJson: r.input_json,
      resultJson: r.result_json,
      errorMessage: r.error_message,
      actorUserId: r.actor_user_id,
      at: r.at,
    })),
  });
}
