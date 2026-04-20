import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { getSetupState, markSetupCompleted } from "@/lib/config/setup-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSetupState());
}

export async function POST() {
  // Setup completion runs during the bootstrap window, so this accepts any
  // request. Once a real admin user exists the normal RBAC gate kicks in
  // and a non-admin trying to re-mark setup would be bounced. That still
  // doesn't matter much — marking setup twice is idempotent.
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  markSetupCompleted();
  return NextResponse.json({ ok: true });
}
