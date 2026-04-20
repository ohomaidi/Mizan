import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  clearAzureConfig,
  getAzureConfig,
  getAzureConfigSource,
  setAzureConfig,
} from "@/lib/config/azure-config";
import { invalidateAllTokens } from "@/lib/graph/msal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Schema = z
  .object({
    clientId: z.string().trim().regex(GUID_RE, "expected GUID").optional(),
    // Secret: empty string means "don't change"; omit to clear? We treat omitted as "no change",
    // and a sentinel `"__clear__"` to actively clear. Simpler: explicit `clear: true` flag.
    clientSecret: z.string().trim().optional(),
    authorityHost: z.string().trim().url().optional(),
    consentRedirectUri: z.string().trim().url().optional().or(z.literal("")),
    clear: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.clear ||
      v.clientId !== undefined ||
      v.clientSecret !== undefined ||
      v.authorityHost !== undefined ||
      v.consentRedirectUri !== undefined,
    { message: "at least one field required" },
  );

// Masked payload for the UI — NEVER echo the secret. Only hint whether one is set.
function maskForClient() {
  const cfg = getAzureConfig();
  const src = getAzureConfigSource();
  return {
    clientId: cfg.clientId,
    clientSecretSet: Boolean(cfg.clientSecret),
    authorityHost: cfg.authorityHost,
    consentRedirectUri: cfg.consentRedirectUri,
    updatedAt: cfg.updatedAt ?? null,
    source: src,
  };
}

export async function GET() {
  return NextResponse.json({ config: maskForClient() });
}

export async function PUT(req: NextRequest) {
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
    clearAzureConfig();
  } else {
    const patch: Parameters<typeof setAzureConfig>[0] = {};
    if (parsed.data.clientId !== undefined) patch.clientId = parsed.data.clientId;
    if (parsed.data.clientSecret !== undefined) patch.clientSecret = parsed.data.clientSecret;
    if (parsed.data.authorityHost !== undefined) patch.authorityHost = parsed.data.authorityHost;
    if (parsed.data.consentRedirectUri !== undefined)
      patch.consentRedirectUri = parsed.data.consentRedirectUri;
    setAzureConfig(patch);
  }
  // Credentials changed — every cached MSAL client/token is now stale.
  invalidateAllTokens();
  return NextResponse.json({ config: maskForClient() });
}
