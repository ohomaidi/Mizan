import "server-only";

/**
 * Baseline contract. Every directive baseline is a TypeScript module that
 * implements this interface. A baseline knows how to describe itself for
 * preview, how to build its Graph CA-policy body for a specific tenant,
 * and how to generate its idempotency key so repeat pushes are no-ops.
 *
 * The UI never talks to Graph directly — it asks for a baseline's preview
 * (local) or pushes the baseline through the directive engine, which
 * builds the body + calls Graph on real tenants, or synthesizes results
 * on demo tenants.
 */

/**
 * Risk tier — drives UI emphasis. All baselines in Phase 3 are low/medium
 * because they all ship as report-only; "high" is reserved for future
 * baselines that enforce by default or touch privileged paths.
 */
export type BaselineRiskTier = "low" | "medium" | "high";

/** Everything the UI needs to show the baseline and preview its effect. */
export type BaselineDescriptor = {
  id: string;
  titleKey: string;
  bodyKey: string;
  riskTier: BaselineRiskTier;
  /** Human-readable target description (EN). "Admin directory roles" etc. */
  targetSummary: string;
  /** Human-readable grant description. "Require MFA." etc. */
  grantSummary: string;
  /** What state the resulting policy ships in. Always report-only in Phase 3. */
  initialState: "enabledForReportingButNotEnforced" | "enabled";
  /**
   * True when the baseline respects per-tenant "exclude our own Global
   * Admins" — hard requirement on any baseline that touches admin roles
   * so a bad push cannot lock the entity out of their own tenant.
   */
  excludesOwnAdmins: boolean;
};

/**
 * The Graph body shape for a Conditional Access policy. Trimmed to the
 * fields baselines actually set; Graph accepts any subset.
 */
export type CaPolicyBody = {
  displayName: string;
  state: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  conditions: {
    applications?: {
      includeApplications?: string[];
      excludeApplications?: string[];
    };
    users?: {
      includeUsers?: string[];
      includeRoles?: string[];
      excludeUsers?: string[];
      excludeRoles?: string[];
      excludeGroups?: string[];
    };
    clientAppTypes?: string[];
    locations?: {
      includeLocations?: string[];
      excludeLocations?: string[];
    };
    signInRiskLevels?: string[];
  };
  grantControls?: {
    operator: "OR" | "AND";
    builtInControls: string[]; // "mfa", "compliantDevice", "domainJoinedDevice", "block"
  };
  sessionControls?: Record<string, unknown>;
};

/** Options the Center operator can pass when pushing. */
export type BaselinePushOptions = {
  /**
   * Override the initial state. The /directive push UI exposes this so
   * an operator can push as `disabled` for dry-tenant testing, then flip
   * to report-only once the push is confirmed safe.
   */
  overrideState?: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
};

export type Baseline = {
  descriptor: BaselineDescriptor;
  /**
   * Deterministic identifier that Mizan stamps into the policy displayName
   * so a repeat push against the same tenant can detect "already there" and
   * return a no-op rather than creating a duplicate. Includes the baseline
   * id + a short version tag.
   */
  idempotencyKey: string;
  /**
   * Build the Graph CA-policy body for a specific tenant. `options` carries
   * overrides; the baseline is responsible for honoring them + for not
   * letting any path through that could exclude-all-users (which would
   * make a policy that applies to zero people).
   */
  buildPolicyBody: (options: BaselinePushOptions) => CaPolicyBody;
};

/** Summary of what a baseline will do, for the preview UI. Computed locally. */
export type BaselinePreview = {
  descriptor: BaselineDescriptor;
  body: CaPolicyBody;
  effectiveState: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  notes: string[];
};

export function previewBaseline(
  baseline: Baseline,
  options: BaselinePushOptions = {},
): BaselinePreview {
  const body = baseline.buildPolicyBody(options);
  return {
    descriptor: baseline.descriptor,
    body,
    effectiveState: body.state,
    notes: [],
  };
}
