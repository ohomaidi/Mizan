import { NextResponse } from "next/server";
import { getTenant, markConsented } from "@/lib/db/tenants";
import { fetchSecureScore } from "@/lib/graph/signals";
import { writeSnapshot } from "@/lib/db/signals";
import { GraphError } from "@/lib/graph/fetch";
import { assertAzureConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight first-sync verification used by the Onboarding Wizard Step 5.
 *
 * Runs a single Graph call (Secure Score) to prove the pipeline is live, persists
 * a snapshot, and returns immediately (~2s). This replaces the full 18-signal sync
 * at the moment of wizard completion — that would take 30-60s and often trip
 * browser / tunnel / load-balancer fetch timeouts with "Load failed".
 *
 * The full 18-signal sync still runs in two places:
 *   1. Fire-and-forget from /api/auth/consent-callback at consent time.
 *   2. The daily scheduled /api/sync from cron / Azure Timer Function.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    assertAzureConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: "not_configured", message: (err as Error).message },
      { status: 412 },
    );
  }

  const started = Date.now();
  try {
    const payload = await fetchSecureScore({
      tenantGuid: tenant.tenant_id,
      ourTenantId: tenant.id,
    });
    writeSnapshot({
      tenant_id: tenant.id,
      signal_type: "secureScore",
      ok: true,
      payload,
    });
    // Self-heal: a tenant stuck in `failed` (typically AADSTS650051 — admin
    // manually granted consent in Enterprise Apps after the URL flow errored)
    // gets flipped to `consented` once a real Graph call proves the SP is
    // alive. Without this, the dashboard's Sync button stays gated by the
    // orchestrator's `consent_status !== "consented"` guard. v2.5.23.
    if (tenant.consent_status !== "consented") {
      markConsented(tenant.id);
    }
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      secureScorePercent: payload.percent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof GraphError ? err.status : undefined;
    writeSnapshot({
      tenant_id: tenant.id,
      signal_type: "secureScore",
      ok: false,
      http_status: status,
      error_message: message,
    });
    return NextResponse.json(
      { ok: false, message, status, durationMs: Date.now() - started },
      { status: 200 },
    );
  }
}
