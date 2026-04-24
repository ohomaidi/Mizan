import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { insertTenant, listTenants, getTenantByTenantId } from "@/lib/db/tenants";
import { config } from "@/lib/config";
import { buildConsentUrl } from "@/lib/config/consent-url";
import { isDirectiveDeployment } from "@/lib/config/deployment-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLUSTERS = [
  "police",
  "health",
  "edu",
  "municipality",
  "utilities",
  "transport",
  "other",
] as const;

const DraftSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  cluster: z.enum(CLUSTERS),
  tenantId: z.string().trim().uuid(),
  domain: z.string().trim().min(3).max(253).regex(/\./),
  ciso: z.string().trim().max(120).optional().default(""),
  cisoEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  /**
   * Per-entity consent mode picked by the Center admin at onboarding.
   * Only honored in directive-mode deployments; server-side guard below
   * forces observation if the deployment isn't directive-mode.
   */
  consentMode: z.enum(["observation", "directive"]).optional().default("observation"),
});

export async function GET() {
  return NextResponse.json({ tenants: listTenants() });
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = DraftSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const draft = parsed.data;

  const existing = getTenantByTenantId(draft.tenantId);
  if (existing) {
    // Idempotent re-onboarding: if consent hasn't landed yet, rebuild the same
    // URL from the stored state so the operator can recover the link they lost.
    // Once the entity has actually consented we reject — re-onboarding a live
    // tenant would be a real mistake.
    if (existing.consent_status === "consented") {
      return NextResponse.json(
        { error: "tenant_already_registered", tenant: existing },
        { status: 409 },
      );
    }
    const consentUrl = await buildConsentUrl(existing.tenant_id, existing.consent_state);
    return NextResponse.json(
      {
        tenant: existing,
        consentUrl,
        azureConfigured: config.isAzureConfigured,
        reused: true,
      },
      { status: 200 },
    );
  }

  const consentState = crypto.randomBytes(16).toString("hex");
  // Server-side guard: directive mode is only meaningful in directive-mode
  // deployments. Observation-mode deployments (SCSC) silently coerce every
  // incoming onboarding to observation even if the client sent directive.
  const mode = isDirectiveDeployment() ? draft.consentMode : "observation";
  const tenant = insertTenant(
    {
      tenant_id: draft.tenantId,
      name_en: draft.nameEn,
      name_ar: draft.nameAr,
      cluster: draft.cluster,
      domain: draft.domain,
      ciso: draft.ciso,
      ciso_email: draft.cisoEmail,
      consent_mode: mode,
    },
    consentState,
  );

  const consentUrl = await buildConsentUrl(tenant.tenant_id, consentState);

  return NextResponse.json(
    { tenant, consentUrl, azureConfigured: config.isAzureConfigured },
    { status: 201 },
  );
}
