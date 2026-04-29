import { NextResponse, type NextRequest } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { deleteCustomKpi } from "@/lib/db/custom-kpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  deleteCustomKpi(n);
  return NextResponse.json({ ok: true });
}
