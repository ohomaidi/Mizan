import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  clearAuthConfig,
  getAuthConfig,
  getUserAuthMethod,
  setAuthConfig,
  ROLES,
  MAX_SESSION_MINUTES,
  type Role,
} from "@/lib/config/auth-config";
import { apiRequireRole } from "@/lib/auth/rbac";
import { invalidateAuthClient } from "@/lib/auth/msal-user";
import { resolveUserAuthRedirectUri } from "@/lib/config/base-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUID_OR_COMMON = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|common|organizations)$/i;
const SHA1_THUMBPRINT_RE = /^[0-9A-Fa-f]{40}$/;

const Schema = z
  .object({
    clientId: z.string().trim().optional(),
    clientSecret: z.string().trim().optional(),
    clientCertThumbprint: z
      .string()
      .trim()
      .regex(SHA1_THUMBPRINT_RE)
      .optional()
      .or(z.literal("")),
    clientCertPrivateKeyPem: z.string().trim().optional().or(z.literal("")),
    clientCertChainPem: z.string().trim().optional().or(z.literal("")),
    tenantId: z.string().trim().regex(GUID_OR_COMMON).optional(),
    sessionTimeoutMinutes: z
      .number()
      .int()
      .min(15)
      .max(MAX_SESSION_MINUTES)
      .optional(),
    defaultRole: z.enum(ROLES as [Role, ...Role[]]).optional(),
    clear: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.clear ||
      Object.keys(v).some((k) => k !== "clear" && v[k as keyof typeof v] !== undefined),
    { message: "at least one field required" },
  );

async function maskForClient() {
  const cfg = getAuthConfig();
  return {
    clientId: cfg.clientId,
    clientSecretSet: Boolean(cfg.clientSecret),
    clientCertSet: Boolean(
      cfg.clientCertThumbprint && cfg.clientCertPrivateKeyPem,
    ),
    clientCertThumbprint: cfg.clientCertThumbprint,
    authMethod: getUserAuthMethod(),
    tenantId: cfg.tenantId,
    sessionTimeoutMinutes: cfg.sessionTimeoutMinutes,
    defaultRole: cfg.defaultRole,
    updatedAt: cfg.updatedAt ?? null,
    redirectUri: await resolveUserAuthRedirectUri(),
  };
}

export async function GET() {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ config: await maskForClient() });
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
    if (parsed.data.clientCertThumbprint !== undefined)
      patch.clientCertThumbprint = parsed.data.clientCertThumbprint.toUpperCase();
    if (parsed.data.clientCertPrivateKeyPem !== undefined)
      patch.clientCertPrivateKeyPem = parsed.data.clientCertPrivateKeyPem;
    if (parsed.data.clientCertChainPem !== undefined)
      patch.clientCertChainPem = parsed.data.clientCertChainPem;
    if (parsed.data.tenantId !== undefined) patch.tenantId = parsed.data.tenantId;
    if (parsed.data.sessionTimeoutMinutes !== undefined)
      patch.sessionTimeoutMinutes = parsed.data.sessionTimeoutMinutes;
    if (parsed.data.defaultRole !== undefined) patch.defaultRole = parsed.data.defaultRole;
    setAuthConfig(patch);
  }
  invalidateAuthClient();
  return NextResponse.json({ config: await maskForClient() });
}
