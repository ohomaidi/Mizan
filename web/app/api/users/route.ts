import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiRequireRole } from "@/lib/auth/rbac";
import { inviteUser, isPending, listUsers } from "@/lib/db/users";
import { ROLES, type Role } from "@/lib/config/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(ROLES as [Role, ...Role[]]),
  displayName: z.string().trim().max(120).optional().default(""),
});

export async function GET() {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  const rows = listUsers();
  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      isActive: u.is_active === 1,
      tenantId: u.tenant_id,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      pending: isPending(u),
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { email, role, displayName } = parsed.data;
  try {
    const row = inviteUser(email, role, displayName);
    return NextResponse.json(
      {
        user: {
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          role: row.role,
          isActive: row.is_active === 1,
          pending: isPending(row),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = (err as Error).message;
    // SQLite UNIQUE(entra_oid) collisions never happen here because we mint a
    // fresh sentinel per invite; only email-uniqueness would need to be
    // enforced at the app layer, and we allow re-invites intentionally.
    return NextResponse.json(
      { error: "invite_failed", message: msg },
      { status: 500 },
    );
  }
}
