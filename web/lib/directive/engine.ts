import "server-only";
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/rbac";
import { isDirectiveDeployment } from "@/lib/config/deployment-mode";
import { getTenant, type TenantRow } from "@/lib/db/tenants";
import { recordDirectiveAction } from "./audit";

/**
 * Directive engine — the single place every Graph WRITE goes through.
 * Centralises five responsibilities so individual route handlers stay thin:
 *
 *   1. RBAC gate (minimum "analyst" by default, overridable per action).
 *   2. Deployment-mode gate: refuses to run on observation deployments.
 *   3. Per-tenant consent gate: refuses to run unless the tenant explicitly
 *      chose directive mode at onboarding. This is the code-level policy
 *      that backs the "observation entities are never written to" promise.
 *   4. Per-tenant demo simulation: ONLY when tenant.is_demo === 1. Demo
 *      tenants have synthesized Entra GUIDs that Graph can't resolve, so
 *      simulating is the only viable path for them. Real tenants onboarded
 *      to the same deployment — even if MIZAN_DEMO_MODE is on for the
 *      dashboard — go through the full Graph write path. MIZAN_DEMO_MODE
 *      controls the auth bypass only, not the write simulation.
 *   5. Audit: every attempt — success, failure, or simulation — lands in
 *      directive_actions before the caller sees a result.
 */

export type EngineContext = {
  tenant: TenantRow;
  actorUserId: string | null;
};

export type EngineOutcome<T> =
  | { kind: "success"; result: T; simulated: boolean; auditId: number }
  | { kind: "failed"; error: string; auditId: number };

export type ExecuteInput<T> = {
  tenantId: string;
  actionType: string;
  targetId?: string | null;
  input?: unknown;
  /**
   * The real Graph call. Runs only when the tenant is real (not demo) and
   * the deployment is not in demo mode. Must throw on failure — the engine
   * translates thrown errors into failed-status audit rows.
   */
  run: (ctx: EngineContext) => Promise<T>;
  /**
   * Simulated result returned for demo tenants. If omitted, a generic
   * `{ simulated: true }` is used.
   */
  simulatedResult?: T;
};

/**
 * Run a directive action with full gating + audit. Callers pass the gate
 * object they already have from apiRequireRole so we don't double-check.
 */
export async function executeDirective<T>(
  gate: { ok: true; user: { id: string; role: "admin" | "analyst" | "viewer" } | null },
  input: ExecuteInput<T>,
): Promise<EngineOutcome<T>> {
  const tenant = getTenant(input.tenantId);
  if (!tenant) {
    const auditId = recordDirectiveAction({
      tenantId: input.tenantId,
      actionType: input.actionType,
      targetId: input.targetId ?? null,
      status: "failed",
      input: input.input,
      errorMessage: "tenant_not_found",
      actorUserId: gate.user?.id ?? null,
    });
    return { kind: "failed", error: "tenant_not_found", auditId };
  }

  if (tenant.consent_mode !== "directive") {
    const auditId = recordDirectiveAction({
      tenantId: input.tenantId,
      actionType: input.actionType,
      targetId: input.targetId ?? null,
      status: "failed",
      input: input.input,
      errorMessage: "tenant_not_directive",
      actorUserId: gate.user?.id ?? null,
    });
    return { kind: "failed", error: "tenant_not_directive", auditId };
  }

  const ctx: EngineContext = {
    tenant,
    actorUserId: gate.user?.id ?? null,
  };

  // Demo path — simulate a success without actually calling Graph. ONLY
  // fires for tenants flagged is_demo (the synthesized Sharjah / DESC demo
  // tenants whose Entra GUIDs are fake). A real tenant onboarded to a
  // demo-mode deployment is NOT demo-gated — its writes go through the
  // real Graph path below.
  if (tenant.is_demo === 1) {
    const result = (input.simulatedResult ??
      ({ simulated: true } as unknown as T)) as T;
    const auditId = recordDirectiveAction({
      tenantId: input.tenantId,
      actionType: input.actionType,
      targetId: input.targetId ?? null,
      status: "simulated",
      input: input.input,
      result,
      actorUserId: gate.user?.id ?? null,
    });
    return { kind: "success", result, simulated: true, auditId };
  }

  // Real path.
  try {
    const result = await input.run(ctx);
    const auditId = recordDirectiveAction({
      tenantId: input.tenantId,
      actionType: input.actionType,
      targetId: input.targetId ?? null,
      status: "success",
      input: input.input,
      result,
      actorUserId: gate.user?.id ?? null,
    });
    return { kind: "success", result, simulated: false, auditId };
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    const auditId = recordDirectiveAction({
      tenantId: input.tenantId,
      actionType: input.actionType,
      targetId: input.targetId ?? null,
      status: "failed",
      input: input.input,
      errorMessage: message.slice(0, 500),
      actorUserId: gate.user?.id ?? null,
    });
    return { kind: "failed", error: message, auditId };
  }
}

/**
 * Boilerplate gate for every /api/directive/* route: RBAC + directive
 * deployment check. Returns a NextResponse to bail with on failure, or the
 * gate object to pass to executeDirective on success.
 */
export async function gateDirectiveRoute(
  minRole: "viewer" | "analyst" | "admin" = "analyst",
): Promise<
  | { ok: true; user: { id: string; role: "admin" | "analyst" | "viewer" } | null }
  | { ok: false; response: NextResponse }
> {
  if (!isDirectiveDeployment()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "not_directive_deployment" },
        { status: 404 },
      ),
    };
  }
  const gate = await apiRequireRole(minRole);
  if (!gate.ok) return gate;
  return {
    ok: true,
    user: gate.user
      ? { id: gate.user.id, role: gate.user.role }
      : null,
  };
}

export type EngineOutcomeHttp<T> = NextResponse;

/**
 * Serialize an EngineOutcome into a NextResponse. Success → 200 (with
 * simulated flag echoed). Failed → 409 for policy / not-found / not-directive
 * errors, 500 for everything else.
 */
export function respondOutcome<T>(outcome: EngineOutcome<T>): NextResponse {
  if (outcome.kind === "success") {
    return NextResponse.json({
      ok: true,
      simulated: outcome.simulated,
      auditId: outcome.auditId,
      result: outcome.result,
    });
  }
  const policyErrors = new Set([
    "tenant_not_found",
    "tenant_not_directive",
  ]);
  const status = policyErrors.has(outcome.error) ? 409 : 502;
  return NextResponse.json(
    { ok: false, error: outcome.error, auditId: outcome.auditId },
    { status },
  );
}
