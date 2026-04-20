import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { insertTenant, listTenants, getTenantByTenantId } from "@/lib/db/tenants";
import { config } from "@/lib/config";
import { buildConsentUrl } from "@/lib/config/consent-url";

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
  const tenant = insertTenant(
    {
      tenant_id: draft.tenantId,
      name_en: draft.nameEn,
      name_ar: draft.nameAr,
      cluster: draft.cluster,
      domain: draft.domain,
      ciso: draft.ciso,
      ciso_email: draft.cisoEmail,
    },
    consentState,
  );

  const consentUrl = await buildConsentUrl(tenant.tenant_id, consentState);

  return NextResponse.json(
    { tenant, consentUrl, azureConfigured: config.isAzureConfigured },
    { status: 201 },
  );
}
