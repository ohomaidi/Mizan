import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantByState,
  markConsented,
} from "@/lib/db/tenants";
import { fetchSecureScore } from "@/lib/graph/signals";
import { syncTenant } from "@/lib/sync/orchestrator";
import { GraphError } from "@/lib/graph/fetch";
import { assertAzureConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entity-admin-driven recovery endpoint for the AADSTS650051 path.
 *
 * When the original consent URL fails because a service principal already
 * exists in the entity tenant, the admin is told to grant consent on the
 * existing SP via Enterprise Applications. That works on Microsoft's side,
 * but Mizan never observes the success — the consent-callback already
 * recorded `consent_status = failed`, and there's no signal back to flip it.
 * Result: tenant is permanently stuck in "failed" until someone hand-edits
 * the database. This endpoint closes the loop.
 *
 * The `state` GUID issued at wizard time acts as the bearer — same model as
 * the consent-callback. The endpoint is public so the entity admin (who is
 * NOT signed into the operator dashboard) can call it from the standalone
 * /consent-error recovery page.
 *
 * Logic: try a single Graph call against the entity tenant. If it succeeds,
 * consent IS granted regardless of what the row currently says, so
 * `markConsented` + fire-and-forget initial sync. If it fails, return the
 * Graph error so the admin can see what's still wrong (most often: they
 * haven't actually granted consent yet, or only some scopes were granted).
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  if (!state) {
    return NextResponse.json({ ok: false, error: "missing_state" }, { status: 400 });
  }
  const tenant = getTenantByState(state);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "unknown_state" }, { status: 404 });
  }
  try {
    assertAzureConfigured();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: (err as Error).message },
      { status: 412 },
    );
  }

  try {
    await fetchSecureScore({
      tenantGuid: tenant.tenant_id,
      ourTenantId: tenant.id,
    });
  } catch (err) {
    const status = err instanceof GraphError ? err.status : undefined;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "graph_call_failed", status, message },
      { status: 200 },
    );
  }

  if (tenant.consent_status !== "consented") {
    markConsented(tenant.id);
  }

  syncTenant({ ...tenant, consent_status: "consented" }).catch(() => {
    // errors land in signal_snapshots + markSyncResult
  });

  return NextResponse.json({ ok: true });
}
