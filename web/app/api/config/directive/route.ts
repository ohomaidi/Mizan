import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  clearDirectiveConfig,
  getDirectiveConfig,
  getDirectiveConfigSource,
  setDirectiveConfig,
} from "@/lib/config/directive-config";
import { apiRequireRole } from "@/lib/auth/rbac";
import { isDirectiveDeployment } from "@/lib/config/deployment-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Directive Graph app config — the second Entra app that carries `.ReadWrite`
 * scopes for directive-mode deployments (DESC-style regulators). Observation-
 * mode deployments never reach this endpoint; even if they hit it the route
 * 404s so nothing leaks.
 *
 * Mirrors /api/config/azure for the read-only Graph Signals app. Same PUT /
 * GET pattern, same masking of the client secret on GET.
 */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Schema = z
  .object({
    clientId: z.string().trim().regex(GUID).optional(),
    clientSecret: z.string().trim().min(1).optional(),
    authorityHost: z
      .string()
      .trim()
      .url()
      .optional(),
    consentRedirectUri: z.string().trim().url().optional().or(z.literal("")),
    clear: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.clear ||
      Object.keys(v).some((k) => k !== "clear" && v[k as keyof typeof v] !== undefined),
    { message: "at least one field required" },
  );

function maskForClient() {
  const cfg = getDirectiveConfig();
  const src = getDirectiveConfigSource();
  return {
    clientId: cfg.clientId,
    clientSecretSet: cfg.clientSecret.length > 0,
    authorityHost: cfg.authorityHost,
    consentRedirectUri: cfg.consentRedirectUri,
    updatedAt: cfg.updatedAt ?? null,
    source: src,
  };
}

export async function GET() {
  if (!isDirectiveDeployment()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ config: maskForClient() });
}

export async function PUT(req: NextRequest) {
  if (!isDirectiveDeployment()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
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
    clearDirectiveConfig();
  } else {
    const patch: Parameters<typeof setDirectiveConfig>[0] = {};
    if (parsed.data.clientId !== undefined) patch.clientId = parsed.data.clientId;
    if (parsed.data.clientSecret !== undefined && parsed.data.clientSecret.length > 0)
      patch.clientSecret = parsed.data.clientSecret;
    if (parsed.data.authorityHost !== undefined)
      patch.authorityHost = parsed.data.authorityHost;
    if (parsed.data.consentRedirectUri !== undefined)
      patch.consentRedirectUri = parsed.data.consentRedirectUri;
    setDirectiveConfig(patch);
  }
  return NextResponse.json({ config: maskForClient() });
}
