import "server-only";
import type { PolicyKind } from "../graph-writes";

/**
 * Intune baseline contract. Parallel to CA baselines but for device
 * compliance / MAM / device configuration policies. Every baseline
 * declares its Graph PolicyKind + @odata.type discriminator so the
 * shared directive engine can route create/list/delete correctly.
 *
 * Unlike CA, Intune policies don't have a single body shape — iOS,
 * Android, Windows, and macOS each subclass the resource. The builder
 * returns the fully-typed body including @odata.type.
 */

export type IntuneBaselineRiskTier = "low" | "medium" | "high";

export type IntuneBaselineDescriptor = {
  id: string;
  /**
   * Graph PolicyKind determines which endpoint the engine POSTs to.
   * Intune compliance, iOS MAM, Android MAM, and device config all
   * go to different collections.
   */
  kind: Extract<
    PolicyKind,
    "intune-compliance" | "intune-mam-ios" | "intune-mam-android" | "intune-config"
  >;
  titleKey: string;
  bodyKey: string;
  riskTier: IntuneBaselineRiskTier;
  /** Human-readable scope ("All iOS devices with user assignment" etc.). */
  targetSummary: string;
  /** Human-readable effect ("Requires 6-digit passcode + encryption..."). */
  effectSummary: string;
  whyKey: string;
  impactKey: string;
  prerequisitesKey: string;
  rolloutAdviceKey: string;
  docsUrl: string;
  /**
   * Which platform this policy targets — drives the Platform filter on
   * the Intune baselines grid.
   */
  platform: "iOS" | "Android" | "Windows" | "macOS" | "cross-platform";
};

/**
 * Every Intune baseline's builder returns a Graph body dressed with the
 * right @odata.type. We don't try to model the full Intune schema —
 * baselines hand-craft the body because each resource type is deeply
 * nested and varies by platform.
 */
export type IntunePolicyBody = Record<string, unknown> & {
  "@odata.type": string;
  displayName: string;
  description?: string;
};

export type IntuneBaselinePushOptions = {
  /**
   * Whether to assign the policy to all users / devices after create. We
   * ship un-assigned by default (== report-only equivalent for Intune —
   * the policy exists but isn't enforced on any device). Operator flips
   * assignment in their Intune portal once they've reviewed the policy.
   */
  autoAssignAllUsers?: boolean;
};

export type IntuneBaseline = {
  descriptor: IntuneBaselineDescriptor;
  idempotencyKey: string;
  buildPolicyBody: (options: IntuneBaselinePushOptions) => IntunePolicyBody;
};

/** Idempotency tag pattern — parallel to CA: `mizan:intune-<id>:v1`. */
export function intuneIdempotencyKey(baselineId: string): string {
  return `mizan:intune-${baselineId}:v1`;
}

/** Stamp the idempotency tag into the policy displayName for tag-match lookup. */
export function intuneDisplayName(baseline: IntuneBaseline): string {
  return `[Mizan] ${baseline.descriptor.id} (${baseline.idempotencyKey})`;
}
