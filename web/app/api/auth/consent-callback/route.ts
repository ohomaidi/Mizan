import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantByState,
  markConsentFailed,
  markConsented,
} from "@/lib/db/tenants";
import { syncTenant } from "@/lib/sync/orchestrator";
import { resolveAppBaseUrl } from "@/lib/config/base-url";

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
    return NextResponse.redirect(
      new URL(
        `/consent-error?reason=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription ?? "")}`,
        base,
      ),
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

  // Fire-and-forget initial sync — the entity admin has already been redirected by then.
  syncTenant(tenant).catch(() => {
    // errors are already persisted into signal_snapshots + markSyncResult
  });

  return NextResponse.redirect(new URL(`/consent-success`, base));
}
