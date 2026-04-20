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
  const consentUrl = await buildConsentUrl(tenant.tenant_id, tenant.consent_state);
  return NextResponse.json({
    consentUrl,
    consentStatus: tenant.consent_status,
    azureConfigured: config.isAzureConfigured,
  });
}
