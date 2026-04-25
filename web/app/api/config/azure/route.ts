import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  clearAzureConfig,
  getAzureAuthMethod,
  getAzureConfig,
  getAzureConfigSource,
  setAzureConfig,
} from "@/lib/config/azure-config";
import { invalidateAllTokens } from "@/lib/graph/msal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA1_THUMBPRINT_RE = /^[0-9A-Fa-f]{40}$/;

const Schema = z
  .object({
    clientId: z.string().trim().regex(GUID_RE, "expected GUID").optional(),
    // Secret: empty string means "don't change"; omit to clear? We treat omitted as "no change",
    // and a sentinel `"__clear__"` to actively clear. Simpler: explicit `clear: true` flag.
    clientSecret: z.string().trim().optional(),
    /**
     * Cert-based auth fields. Thumbprint is SHA-1 hex (40 chars, no colons).
     * Private key is PEM-encoded (entire `-----BEGIN PRIVATE KEY-----` block
     * as a single string). Optional chain PEM lets MSAL send x5c on token
     * requests so Entra can validate against a chain.
     */
    clientCertThumbprint: z
      .string()
      .trim()
      .regex(
        SHA1_THUMBPRINT_RE,
        "expected 40-character SHA-1 thumbprint (no colons)",
      )
      .optional()
      .or(z.literal("")),
    clientCertPrivateKeyPem: z.string().trim().optional().or(z.literal("")),
    clientCertChainPem: z.string().trim().optional().or(z.literal("")),
    authorityHost: z.string().trim().url().optional(),
    consentRedirectUri: z.string().trim().url().optional().or(z.literal("")),
    clear: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.clear ||
      v.clientId !== undefined ||
      v.clientSecret !== undefined ||
      v.clientCertThumbprint !== undefined ||
      v.clientCertPrivateKeyPem !== undefined ||
      v.clientCertChainPem !== undefined ||
      v.authorityHost !== undefined ||
      v.consentRedirectUri !== undefined,
    { message: "at least one field required" },
  );

// Masked payload for the UI — NEVER echo the secret or private key. Only
// hint whether each is set + show the cert thumbprint (public, safe).
function maskForClient() {
  const cfg = getAzureConfig();
  const src = getAzureConfigSource();
  const method = getAzureAuthMethod();
  return {
    clientId: cfg.clientId,
    clientSecretSet: Boolean(cfg.clientSecret),
    clientCertSet: Boolean(
      cfg.clientCertThumbprint && cfg.clientCertPrivateKeyPem,
    ),
    clientCertThumbprint: cfg.clientCertThumbprint,
    authMethod: method,
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
    if (parsed.data.clientSecret !== undefined)
      patch.clientSecret = parsed.data.clientSecret;
    if (parsed.data.clientCertThumbprint !== undefined)
      patch.clientCertThumbprint = parsed.data.clientCertThumbprint.toUpperCase();
    if (parsed.data.clientCertPrivateKeyPem !== undefined)
      patch.clientCertPrivateKeyPem = parsed.data.clientCertPrivateKeyPem;
    if (parsed.data.clientCertChainPem !== undefined)
      patch.clientCertChainPem = parsed.data.clientCertChainPem;
    if (parsed.data.authorityHost !== undefined) patch.authorityHost = parsed.data.authorityHost;
    if (parsed.data.consentRedirectUri !== undefined)
      patch.consentRedirectUri = parsed.data.consentRedirectUri;
    setAzureConfig(patch);
  }
  // Credentials changed — every cached MSAL client/token is now stale.
  invalidateAllTokens();
  return NextResponse.json({ config: maskForClient() });
}
