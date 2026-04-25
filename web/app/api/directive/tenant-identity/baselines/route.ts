import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 15 Tenant-wide identity defaults catalog — COMING SOON.
 *
 * `/authenticationMethodsPolicy`, `/authorizationPolicy`,
 * `/identity/b2bManagementPolicy`, cross-tenant access settings — most
 * of this surface IS on Graph but the policy schemas have been moving
 * (FIDO2 → passkey rename, B2B trust model rev). Held coming-soon
 * until the schemas settle and Mizan ships a stable Phase 15 build.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Tenant-wide identity defaults live on `/authenticationMethodsPolicy`, `/authorizationPolicy`, and the cross-tenant access settings endpoints. Schemas have evolved (FIDO2 → passkey rename, B2B trust model). Coming-soon catalog ships now; real Phase 15 implementation lands once the schemas settle.",
    baselines: [
      {
        id: "tenant-id-fido2-tenant-wide",
        titleKey: "tenantIdentity.baseline.fido2TenantWide.title",
        bodyKey: "tenantIdentity.baseline.fido2TenantWide.body",
        riskTier: "medium" as const,
        effectSummary:
          "Tenant-wide allow + recommend FIDO2 / passkey for every user. Pairs with the Phase 3 phishing-resistant MFA admin baseline by ensuring users CAN enroll a key.",
      },
      {
        id: "tenant-id-block-user-app-registration",
        titleKey: "tenantIdentity.baseline.blockUserAppRegistration.title",
        bodyKey: "tenantIdentity.baseline.blockUserAppRegistration.body",
        riskTier: "medium" as const,
        effectSummary:
          "Only Application Administrators register Entra apps. Default user permission `allowedToCreateApps: false`.",
      },
      {
        id: "tenant-id-block-user-tenant-creation",
        titleKey: "tenantIdentity.baseline.blockUserTenantCreation.title",
        bodyKey: "tenantIdentity.baseline.blockUserTenantCreation.body",
        riskTier: "high" as const,
        effectSummary:
          "Block ordinary users from spinning up new Entra tenants under your subscription. Default user permission `allowedToCreateTenants: false`.",
      },
      {
        id: "tenant-id-restrict-default-user-perms",
        titleKey: "tenantIdentity.baseline.restrictDefaultUserPerms.title",
        bodyKey: "tenantIdentity.baseline.restrictDefaultUserPerms.body",
        riskTier: "medium" as const,
        effectSummary:
          "Lock down the default user role: cannot read all directory objects, cannot create Microsoft 365 groups, cannot invite guests (delegate to a guest-inviter role).",
      },
      {
        id: "tenant-id-cross-tenant-trust-mfa",
        titleKey: "tenantIdentity.baseline.crossTenantTrustMfa.title",
        bodyKey: "tenantIdentity.baseline.crossTenantTrustMfa.body",
        riskTier: "low" as const,
        effectSummary:
          "Trust inbound MFA + compliant-device claims from explicitly-listed partner tenants. Avoids re-MFA prompts on legit B2B collaboration.",
      },
      {
        id: "tenant-id-block-personal-account-linking",
        titleKey: "tenantIdentity.baseline.blockPersonalLinking.title",
        bodyKey: "tenantIdentity.baseline.blockPersonalLinking.body",
        riskTier: "low" as const,
        effectSummary:
          "Disable LinkedIn account connections + similar personal-account linking. Removes the 'add my LinkedIn to my work account' surface.",
      },
    ],
  });
}
