import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantByState,
  markConsentFailed,
  markConsented,
} from "@/lib/db/tenants";
import { syncTenant } from "@/lib/sync/orchestrator";

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
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const tenantGuid = url.searchParams.get("tenant");

  if (!state) {
    return redirect(req, "/consent-error?reason=missing_state");
  }

  const tenant = getTenantByState(state);
  if (!tenant) {
    return redirect(req, `/consent-error?reason=unknown_state`);
  }

  if (error) {
    markConsentFailed(tenant.id, `${error}: ${errorDescription ?? ""}`.trim());
    return redirect(
      req,
      `/consent-error?reason=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription ?? "")}`,
    );
  }

  // Sanity check the tenant GUID on the callback matches what was registered.
  if (tenantGuid && tenantGuid !== tenant.tenant_id) {
    markConsentFailed(
      tenant.id,
      `tenant mismatch: expected ${tenant.tenant_id} got ${tenantGuid}`,
    );
    return redirect(req, `/consent-error?reason=tenant_mismatch`);
  }

  markConsented(tenant.id);

  // Fire-and-forget initial sync — the entity admin has already been redirected by then.
  syncTenant(tenant).catch(() => {
    // errors are already persisted into signal_snapshots + markSyncResult
  });

  return redirect(req, `/consent-success`);
}

/**
 * Build the redirect URL off the incoming request rather than env vars.
 * APP_BASE_URL is optional in the Bicep template — the fallback used to be
 * `?? "http://127.0.0.1:8787"` but `??` doesn't trigger on an empty string,
 * so on a default Azure deploy `new URL(path, "")` threw and the route 500'd
 * at exactly the worst moment — the entity admin just clicked Consent.
 * Using req.url as the base works regardless of env var wiring.
 */
function redirect(req: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.url));
}
