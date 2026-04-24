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
  /** Dict key: WHY this policy exists — risk rationale shown on card expand. */
  whyKey: string;
  /** Dict key: IMPACT — who / what sees the change when enforced. */
  impactKey: string;
  /** Dict key: PREREQUISITES — licensing, enrollment, etc. an entity needs. */
  prerequisitesKey: string;
  /** Dict key: ROLLOUT ADVICE — how to move from report-only to enforced. */
  rolloutAdviceKey: string;
  /** Microsoft Learn reference URL for the operator to study before pushing. */
  docsUrl: string;
};

/**
 * The Graph body shape for a Conditional Access policy. Trimmed to the
 * fields baselines actually set; Graph accepts any subset.
 *
 * Schema reference: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy
 */
export type CaPolicyBody = {
  displayName: string;
  state: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  conditions: {
    applications?: {
      includeApplications?: string[];
      excludeApplications?: string[];
      includeUserActions?: string[];
    };
    users?: {
      includeUsers?: string[];
      includeRoles?: string[];
      includeGroups?: string[];
      excludeUsers?: string[];
      excludeRoles?: string[];
      excludeGroups?: string[];
      /**
       * Targets guest / external identity types in the tenant. Graph schema:
       *   guestOrExternalUserTypes = comma-separated list of:
       *     internalGuest,b2bCollaborationGuest,b2bCollaborationMember,
       *     b2bDirectConnectUser,otherExternalUser,serviceProvider
       */
      includeGuestsOrExternalUsers?: {
        guestOrExternalUserTypes: string;
        externalTenants?: { membershipKind: "all" | "enumerated" };
      };
    };
    clientAppTypes?: string[];
    locations?: {
      includeLocations?: string[];
      excludeLocations?: string[];
    };
    /** ["low","medium","high","none","hidden"] */
    signInRiskLevels?: string[];
    /** ["low","medium","high"] */
    userRiskLevels?: string[];
    platforms?: {
      includePlatforms?: string[];
      excludePlatforms?: string[];
    };
  };
  grantControls?: {
    operator: "OR" | "AND";
    /** "mfa" | "compliantDevice" | "domainJoinedDevice" | "approvedApplication"
     *  | "compliantApplication" | "passwordChange" | "block" */
    builtInControls: string[];
    /**
     * Authentication strength reference — used for phishing-resistant MFA.
     * Built-in IDs (documented at Microsoft Learn):
     *   MFA                     00000000-0000-0000-0000-000000000001
     *   Passwordless MFA        00000000-0000-0000-0000-000000000002
     *   Phishing-resistant MFA  00000000-0000-0000-0000-000000000003
     */
    authenticationStrength?: { id: string };
  };
  sessionControls?: {
    signInFrequency?: {
      isEnabled: true;
      type: "hours" | "days";
      value: number;
      authenticationType?:
        | "primaryAndSecondaryAuthentication"
        | "secondaryAuthentication";
    };
    persistentBrowser?: {
      isEnabled: true;
      mode: "never" | "always";
    };
    applicationEnforcedRestrictions?: {
      isEnabled: true;
    };
  };
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
