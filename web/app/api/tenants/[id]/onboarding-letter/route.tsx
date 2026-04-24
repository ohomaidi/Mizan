import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getTenant } from "@/lib/db/tenants";
import { config } from "@/lib/config";
import { OnboardingLetter } from "@/lib/pdf/OnboardingLetter";
import { getPdfTemplateForMode } from "@/lib/config/pdf-template";
import { buildConsentUrl } from "@/lib/config/consent-url";
import { resolveAppBaseUrl } from "@/lib/config/base-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";

  const consentUrl = await buildConsentUrl(tenant.tenant_id, tenant.consent_state);
  // Pick the template variant based on the tenant's consent mode. Observation
  // tenants get the classic onboarding letter. Directive tenants get the
  // directive-variant with the .ReadWrite scope listing so the entity's
  // Global Admin cannot claim they did not know what they were granting.
  const template = getPdfTemplateForMode(tenant.consent_mode);
  const dashboardUrl = await resolveAppBaseUrl();

  const doc = (
    <OnboardingLetter
      lang={lang}
      entity={{
        id: tenant.id,
        nameEn: tenant.name_en,
        nameAr: tenant.name_ar,
        tenantId: tenant.tenant_id,
        domain: tenant.domain,
        ciso: tenant.ciso,
        cisoEmail: tenant.ciso_email,
        consentState: tenant.consent_state ?? "",
      }}
      council={{ issueDate: new Date().toISOString().slice(0, 10) }}
      consentUrl={consentUrl}
      appId={config.azure.clientId}
      dashboardUrl={dashboardUrl}
      template={template}
    />
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);

  const filename = `onboarding-${tenant.id}-${lang}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
