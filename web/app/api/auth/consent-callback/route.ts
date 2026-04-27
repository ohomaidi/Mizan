import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantByState,
  markConsentFailed,
  markConsented,
  stampConsentedScopeHash,
} from "@/lib/db/tenants";
import { syncTenant } from "@/lib/sync/orchestrator";
import { resolveAppBaseUrl } from "@/lib/config/base-url";
import { config } from "@/lib/config";
import { currentScopeHash } from "@/lib/auth/graph-app-provisioner";
import { invalidateTenantToken } from "@/lib/graph/msal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-consent redirect target.
 * Entra appends: tenant, state, admin_consent=True on success, or error/error_description on failure.
 * We look up the tenant by our `state` and flip it to consented, then kick off an initial sync.
 *
 * ⚠️ IMPORTANT — never redirect to a dashboard page (like /settings). The entity admin's
 * browser lands here. Dashboard routes show Council-wide posture data that would leak
 * cross-tenant. Redirect targets are standalone /consent-success and /consent-error pages
 * that render OUTSIDE the (dashboard) route group.
 *
 * On error redirects we also pass `tenantGuid` + `appId` through to the
 * /consent-error page so it can render specific recovery instructions for
 * known errors (notably AADSTS650051 — "service principal already exists in
 * tenant", v2.5.15+) with a working deep-link to the entity admin's
 * Enterprise Apps blade. These are public identifiers — appId is in every
 * consent URL, tenantGuid is in the callback Entra just sent us — so passing
 * them via query string is fine.
 */
export async function GET(req: NextRequest) {
  const base = await resolveAppBaseUrl();
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const tenantGuid = url.searchParams.get("tenant");

  if (!state) {
    return NextResponse.redirect(new URL("/consent-error?reason=missing_state", base));
  }

  const tenant = getTenantByState(state);
  if (!tenant) {
    return NextResponse.redirect(new URL(`/consent-error?reason=unknown_state`, base));
  }

  if (error) {
    markConsentFailed(tenant.id, `${error}: ${errorDescription ?? ""}`.trim());
    const params = new URLSearchParams({
      reason: error,
      description: errorDescription ?? "",
      tenantGuid: tenantGuid ?? tenant.tenant_id ?? "",
      appId: config.azure.clientId ?? "",
      // Forward `state` so the OrphanSpRecovery card can call /api/auth/consent-recheck
      // after the admin grants consent in Enterprise Applications. v2.5.23.
      state,
    });
    return NextResponse.redirect(
      new URL(`/consent-error?${params.toString()}`, base),
    );
  }

  // Sanity check the tenant GUID on the callback matches what was registered.
  if (tenantGuid && tenantGuid !== tenant.tenant_id) {
    markConsentFailed(
      tenant.id,
      `tenant mismatch: expected ${tenant.tenant_id} got ${tenantGuid}`,
    );
    return NextResponse.redirect(new URL(`/consent-error?reason=tenant_mismatch`, base));
  }

  markConsented(tenant.id);
  // Stamp the live scope hash so the dashboard knows this tenant is up to
  // date with the current scope set. Cleared by the next scope-set change. v2.5.24.
  stampConsentedScopeHash(tenant.id, currentScopeHash(tenant.consent_mode));
  // Drop any cached MSAL token for this tenant so the immediate sync below
  // acquires a fresh one — the previous token (if any) was issued before
  // the just-granted role assignments, so it's missing the new claims. v2.5.24.
  invalidateTenantToken(tenant.tenant_id);

  // Fire-and-forget initial sync — the entity admin has already been redirected by then.
  syncTenant(tenant).catch(() => {
    // errors are already persisted into signal_snapshots + markSyncResult
  });

  return NextResponse.redirect(new URL(`/consent-success`, base));
}
