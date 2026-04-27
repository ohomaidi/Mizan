import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import {
  insertTenant,
  listTenants,
  getTenantByTenantId,
  markConsented,
  getTenant,
} from "@/lib/db/tenants";
import { config } from "@/lib/config";
import { buildConsentUrl } from "@/lib/config/consent-url";
import { isDirectiveDeployment } from "@/lib/config/deployment-mode";
import { isDemoMode } from "@/lib/config/auth-config";
import { currentScopeHash } from "@/lib/auth/graph-app-provisioner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLUSTERS = [
  "police",
  "health",
  "edu",
  "municipality",
  "utilities",
  "transport",
  "other",
] as const;

const DraftSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  cluster: z.enum(CLUSTERS),
  tenantId: z.string().trim().uuid(),
  domain: z.string().trim().min(3).max(253).regex(/\./),
  ciso: z.string().trim().max(120).optional().default(""),
  cisoEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  /**
   * Per-entity consent mode picked by the Center admin at onboarding.
   * Only honored in directive-mode deployments; server-side guard below
   * forces observation if the deployment isn't directive-mode.
   */
  consentMode: z.enum(["observation", "directive"]).optional().default("observation"),
  /**
   * Operator opt-in: mark this tenant as a demo / simulated entity, skip
   * the real Entra consent flow, auto-mark consented. Server-side
   * guard: only honoured when the deployment has `MIZAN_DEMO_MODE=true`
   * — production deployments silently coerce to false even if a forged
   * request sends true. Observation/directive writes against the row
   * are simulated by the existing executeDirective gate.
   */
  isDemo: z.boolean().optional().default(false),
});

export async function GET() {
  // Decorate each row with `scopeStale` — true when the tenant's stored
  // consent hash differs from the live scope set for its consent_mode.
  // Demo tenants and revoked/suspended tenants are never marked stale —
  // the banner is for tenants the operator can actually act on. v2.5.24.
  const tenants = listTenants().map((t) => {
    const live = currentScopeHash(t.consent_mode);
    const stale =
      t.is_demo === 0 &&
      t.consent_status === "consented" &&
      t.suspended_at === null &&
      (t.consented_scope_hash === null || t.consented_scope_hash !== live);
    return { ...t, scopeStale: stale };
  });
  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = DraftSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const draft = parsed.data;

  const existing = getTenantByTenantId(draft.tenantId);
  if (existing) {
    // Idempotent re-onboarding: if consent hasn't landed yet, rebuild the same
    // URL from the stored state so the operator can recover the link they lost.
    // Once the entity has actually consented we reject — re-onboarding a live
    // tenant would be a real mistake.
    if (existing.consent_status === "consented") {
      return NextResponse.json(
        { error: "tenant_already_registered", tenant: existing },
        { status: 409 },
      );
    }
    const consentUrl = await buildConsentUrl(existing.tenant_id, existing.consent_state);
    return NextResponse.json(
      {
        tenant: existing,
        consentUrl,
        azureConfigured: config.isAzureConfigured,
        reused: true,
      },
      { status: 200 },
    );
  }

  const consentState = crypto.randomBytes(16).toString("hex");
  // Server-side guard: directive mode is only meaningful in directive-mode
  // deployments. Observation-mode deployments (SCSC) silently coerce every
  // incoming onboarding to observation even if the client sent directive.
  const mode = isDirectiveDeployment() ? draft.consentMode : "observation";

  // Demo flag — explicit operator opt-in via the wizard's "Demo entity"
  // toggle. Server-side guard: production deployments (no
  // MIZAN_DEMO_MODE env) silently coerce to false even if a forged
  // request sets isDemo=true, so a hijacked client cannot create
  // simulated entities on a real install. When honoured, the new row
  // gets is_demo=1 + an immediate markConsented(), bypassing the live
  // Entra consent flow. Real onboarding stays available alongside —
  // operator just leaves the toggle off.
  const demo = draft.isDemo && isDemoMode();

  const tenant = insertTenant(
    {
      tenant_id: draft.tenantId,
      name_en: draft.nameEn,
      name_ar: draft.nameAr,
      cluster: draft.cluster,
      domain: draft.domain,
      ciso: draft.ciso,
      ciso_email: draft.cisoEmail,
      consent_mode: mode,
      is_demo: demo,
    },
    consentState,
  );

  if (demo) {
    markConsented(tenant.id);
  }

  const consentUrl = demo
    ? null
    : await buildConsentUrl(tenant.tenant_id, consentState);

  return NextResponse.json(
    {
      // Re-read so the caller sees the updated consent_status when demo=true.
      tenant: demo ? getTenant(tenant.id) ?? tenant : tenant,
      consentUrl,
      azureConfigured: config.isAzureConfigured,
      demoBypass: demo || undefined,
    },
    { status: 201 },
  );
}
