import { NextResponse } from "next/server";
import { getTenant } from "@/lib/db/tenants";
import { config } from "@/lib/config";
import { buildConsentUrl } from "@/lib/config/consent-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Demo tenants don't need a real consent URL — the POST /tenants
  // handler already marked them consented inline. The wizard's
  // 5-second poll reads consentStatus and advances to step 5 either
  // way; returning null for the URL just suppresses the (irrelevant)
  // "open consent link" affordance on demo rows.
  const consentUrl = tenant.is_demo
    ? null
    : await buildConsentUrl(tenant.tenant_id, tenant.consent_state);
  return NextResponse.json({
    consentUrl,
    consentStatus: tenant.consent_status,
    azureConfigured: config.isAzureConfigured,
    demoBypass: tenant.is_demo ? true : undefined,
  });
}
