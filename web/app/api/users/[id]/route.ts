import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import {
  countAdmins,
  deleteUser,
  getUser,
  setUserActive,
  setUserRole,
} from "@/lib/db/users";
import { ROLES, type Role } from "@/lib/config/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    role: z.enum(ROLES as [Role, ...Role[]]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "at least one field required",
  });

function cannotStrandDashboard(targetId: string, nextRole?: Role, nextActive?: boolean) {
  // Refuse the mutation if it would leave the install with zero active admins.
  // The admin who just locked themselves out has no recovery path short of
  // direct DB surgery; the bootstrap escape hatch doesn't re-open once any
  // user row exists. See lib/auth/rbac.ts.
  const target = getUser(targetId);
  if (!target) return null;
  const wasActiveAdmin = target.role === "admin" && target.is_active === 1;
  if (!wasActiveAdmin) return null;
  const demoting = nextRole !== undefined && nextRole !== "admin";
  const deactivating = nextActive === false;
  if (!demoting && !deactivating) return null;
  // Any other active admin left after this change?
  if (countAdmins() > 1) return null;
  return "would_strand_dashboard";
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const target = getUser(id);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const bad = cannotStrandDashboard(id, parsed.data.role, parsed.data.isActive);
  if (bad) return NextResponse.json({ error: bad }, { status: 409 });
  if (parsed.data.role !== undefined) setUserRole(id, parsed.data.role);
  if (parsed.data.isActive !== undefined) setUserActive(id, parsed.data.isActive);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const target = getUser(id);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bad = cannotStrandDashboard(id, undefined, false);
  if (bad) return NextResponse.json({ error: bad }, { status: 409 });
  deleteUser(id);
  return NextResponse.json({ ok: true });
}
