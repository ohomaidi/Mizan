import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getEndpointHealthAll } from "@/lib/db/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Council-wide audit-of-access log. Joins endpoint_health against tenants so the UI
// can show entity display names alongside per-endpoint call counts and throttle rates.
export async function GET() {
  const tenants = listTenants();
  const tenantMap = new Map(tenants.map((t) => [t.id, t] as const));
  const rows = getEndpointHealthAll().map((h) => {
    const t = tenantMap.get(h.tenant_id);
    return {
      ...h,
      nameEn: t?.name_en ?? h.tenant_id,
      nameAr: t?.name_ar ?? h.tenant_id,
      cluster: t?.cluster ?? null,
      tenantGuid: t?.tenant_id ?? null,
      isDemo: t?.is_demo === 1,
    };
  });
  return NextResponse.json({ rows });
}
