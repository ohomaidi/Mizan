import "server-only";
import { getTenant } from "@/lib/db/tenants";
import { BASELINES } from "./baselines/registry";
import { listMizanCaPolicies } from "./graph-writes";
import { listDirectiveActions } from "./audit";

/**
 * Answers "what's the current state of each Mizan baseline inside this
 * entity's tenant?" — used by the /directive status view so the Center can
 * see at a glance which entities have flipped a baseline from report-only
 * to enabled after the initial push.
 *
 * Two data paths:
 *   - Real tenants: one Graph call listing every Mizan-tagged CA policy,
 *     then a string match per baseline idempotency key.
 *   - Demo tenants: reconstructed from the directive_actions audit log.
 *     The latest successful simulated push for each baseline determines
 *     the reported state.
 */

export type BaselineStatusEntry = {
  baselineId: string;
  titleKey: string;
  /** True when a matching policy exists in the tenant (real or simulated). */
  present: boolean;
  /** Graph policy id — may be a sim id on demo tenants. */
  policyId: string | null;
  /** Raw CA state: "enabled" | "disabled" | "enabledForReportingButNotEnforced". */
  state: string | null;
  /** Last time we observed this baseline in the tenant. ISO-8601, or null. */
  observedAt: string | null;
};

export type BaselineStatusResult = {
  tenantId: string;
  mode: "real" | "simulated";
  generatedAt: string;
  entries: BaselineStatusEntry[];
};

export async function getBaselineStatusForTenant(
  tenantId: string,
): Promise<BaselineStatusResult> {
  const tenant = getTenant(tenantId);
  if (!tenant) {
    throw new Error("tenant_not_found");
  }

  const generatedAt = new Date().toISOString();

  // Demo tenants — reconstruct from audit log. We look at the most recent
  // successful baseline.push.<id> action per baseline and use its simulated
  // result's state. This means the demo UI reflects whatever state the
  // operator last pushed as, which is enough to demo the "stayed in
  // report-only vs flipped to enabled" distinction.
  if (tenant.is_demo === 1) {
    const actions = listDirectiveActions({ tenantId, limit: 500 });
    const entries: BaselineStatusEntry[] = BASELINES.map((b) => {
      const latest = actions.find(
        (a) =>
          a.action_type === `baseline.push.${b.descriptor.id}` &&
          (a.status === "simulated" || a.status === "success"),
      );
      if (!latest) {
        return {
          baselineId: b.descriptor.id,
          titleKey: b.descriptor.titleKey,
          present: false,
          policyId: null,
          state: null,
          observedAt: null,
        };
      }
      let state: string | null = b.descriptor.initialState;
      let policyId: string | null = null;
      try {
        const r = latest.result_json
          ? (JSON.parse(latest.result_json) as {
              state?: string;
              policyId?: string;
            })
          : null;
        if (r?.state) state = r.state;
        if (r?.policyId) policyId = r.policyId;
      } catch {
        // parse failure — fall back to the initial state above.
      }
      return {
        baselineId: b.descriptor.id,
        titleKey: b.descriptor.titleKey,
        present: true,
        policyId,
        state,
        observedAt: latest.at,
      };
    });
    return { tenantId, mode: "simulated", generatedAt, entries };
  }

  // Real tenants — one Graph list call, then match.
  const policies = await listMizanCaPolicies(tenant);
  const entries: BaselineStatusEntry[] = BASELINES.map((b) => {
    const hit = policies.find((p) =>
      p.displayName.includes(b.idempotencyKey),
    );
    if (!hit) {
      return {
        baselineId: b.descriptor.id,
        titleKey: b.descriptor.titleKey,
        present: false,
        policyId: null,
        state: null,
        observedAt: null,
      };
    }
    return {
      baselineId: b.descriptor.id,
      titleKey: b.descriptor.titleKey,
      present: true,
      policyId: hit.id,
      state: hit.state,
      observedAt: generatedAt,
    };
  });
  return { tenantId, mode: "real", generatedAt, entries };
}
