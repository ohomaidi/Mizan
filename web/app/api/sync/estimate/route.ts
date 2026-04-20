import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estimate duration of a full sync. Accounts for demo tenants (skipped instantly), real
 * consented tenants (each costs ~5 signal fetches × ~2s per tenant serially), and the
 * tenant-level worker-pool concurrency (SCSC_SYNC_CONCURRENCY, default 5). The UI uses
 * this to show an expected-wait time before kicking off.
 */
function getSyncConcurrency(): number {
  const raw = Number(process.env.SCSC_SYNC_CONCURRENCY);
  if (!Number.isFinite(raw) || raw < 1) return 5;
  return Math.min(20, Math.max(1, Math.floor(raw)));
}

export async function GET() {
  const tenants = listTenants();
  const consentedReal = tenants.filter(
    (t) => t.consent_status === "consented" &&
      t.is_demo !== 1 &&
      !t.suspended_at,
  ).length;
  const consentedDemo = tenants.filter(
    (t) => t.consent_status === "consented" && t.is_demo === 1,
  ).length;

  // 5 signals per tenant × ~2s per signal (conservative; real Graph is 500ms–1.5s each).
  // Plus ~1s bookkeeping per tenant.
  const perRealTenantSeconds = 5 * 2 + 1;
  const perDemoTenantSeconds = 0.05; // essentially instant
  const concurrency = getSyncConcurrency();

  // Tenants fan out across N workers, so wall-clock ≈ ceil(tenants / N) × per-tenant.
  const realWorkItems = Math.ceil(consentedReal / concurrency);
  const estSeconds = Math.ceil(
    realWorkItems * perRealTenantSeconds + consentedDemo * perDemoTenantSeconds,
  );

  return NextResponse.json({
    consentedReal,
    consentedDemo,
    estimatedSeconds: estSeconds,
    perRealTenantSeconds,
    concurrency,
  });
}
