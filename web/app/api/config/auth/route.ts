import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  clearAuthConfig,
  getAuthConfig,
  setAuthConfig,
  ROLES,
  type Role,
} from "@/lib/config/auth-config";
import { apiRequireRole } from "@/lib/auth/rbac";
import { invalidateAuthClient } from "@/lib/auth/msal-user";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUID_OR_COMMON = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|common|organizations)$/i;

const Schema = z
  .object({
    clientId: z.string().trim().optional(),
    clientSecret: z.string().trim().optional(),
    tenantId: z.string().trim().regex(GUID_OR_COMMON).optional(),
    sessionTimeoutMinutes: z.number().int().min(15).max(24 * 60).optional(),
    defaultRole: z.enum(ROLES as [Role, ...Role[]]).optional(),
    enforce: z.boolean().optional(),
    clear: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.clear ||
      Object.keys(v).some((k) => k !== "clear" && v[k as keyof typeof v] !== undefined),
    { message: "at least one field required" },
  );

function maskForClient() {
  const cfg = getAuthConfig();
  return {
    clientId: cfg.clientId,
    clientSecretSet: Boolean(cfg.clientSecret),
    tenantId: cfg.tenantId,
    sessionTimeoutMinutes: cfg.sessionTimeoutMinutes,
    defaultRole: cfg.defaultRole,
    enforce: cfg.enforce,
    updatedAt: cfg.updatedAt ?? null,
    redirectUri: `${config.appBaseUrl.replace(/\/+$/, "")}/api/auth/user-callback`,
  };
}

export async function GET() {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ config: maskForClient() });
}

export async function PUT(req: NextRequest) {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.clear) {
    clearAuthConfig();
  } else {
    const patch: Parameters<typeof setAuthConfig>[0] = {};
    if (parsed.data.clientId !== undefined) patch.clientId = parsed.data.clientId;
    if (parsed.data.clientSecret !== undefined && parsed.data.clientSecret.length > 0)
      patch.clientSecret = parsed.data.clientSecret;
    if (parsed.data.tenantId !== undefined) patch.tenantId = parsed.data.tenantId;
    if (parsed.data.sessionTimeoutMinutes !== undefined)
      patch.sessionTimeoutMinutes = parsed.data.sessionTimeoutMinutes;
    if (parsed.data.defaultRole !== undefined) patch.defaultRole = parsed.data.defaultRole;
    if (parsed.data.enforce !== undefined) patch.enforce = parsed.data.enforce;
    setAuthConfig(patch);
  }
  invalidateAuthClient();
  return NextResponse.json({ config: maskForClient() });
}
