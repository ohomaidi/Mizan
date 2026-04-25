import "server-only";

/**
 * SharePoint tenant settings baseline contract.
 *
 * Unlike CA / Intune, SharePoint tenant settings are a SINGLETON per
 * tenant — Mizan PATCHes the global `/admin/sharepoint/settings` object
 * rather than creating a new resource. Two consequences:
 *
 *   1. There's no graph_policy_id to delete on rollback. We track the
 *      change in the audit log; if the entity wants to revert, they do
 *      it manually in their SharePoint admin centre.
 *   2. "Already applied" means the current settings already match the
 *      baseline's intended values. We GET first, compare, and skip if
 *      no fields would change.
 *
 * Baselines are cross-tenant-safe — every field they touch is a global
 * SharePoint setting with the same meaning in every tenant.
 *
 * Microsoft Graph reference:
 *   https://learn.microsoft.com/en-us/graph/api/resources/sharepointsettings
 */

export type SharepointBaselineRiskTier = "low" | "medium" | "high";

export type SharepointBaselineDescriptor = {
  id: string;
  titleKey: string;
  bodyKey: string;
  riskTier: SharepointBaselineRiskTier;
  /** Plain-English summary of which settings the baseline touches. */
  effectSummary: string;
  whyKey: string;
  impactKey: string;
  prerequisitesKey: string;
  rolloutAdviceKey: string;
  docsUrl: string;
};

/** Subset of the sharepointSettings resource the baselines mutate. */
export type SharepointSettingsPatch = {
  /** Anonymous / external user / authenticated only. */
  sharingCapability?:
    | "disabled"
    | "externalUserSharingOnly"
    | "externalUserAndGuestSharing"
    | "existingExternalUserSharingOnly";
  /** view | edit */
  defaultSharingLinkType?: "none" | "anyoneWithLink" | "internal" | "direct";
  /** view | edit | review */
  defaultLinkPermission?: "none" | "view" | "edit";
  /** Restrict guest sharing to specific domains. */
  sharingDomainRestrictionMode?: "none" | "allowList" | "blockList";
  sharingAllowedDomainList?: string[];
  sharingBlockedDomainList?: string[];
  /** When true, recipients of an anonymous link must sign in. */
  requireAcceptingAccountMatchInvitedAccount?: boolean;
  /** Block anonymous links in OneDrive. */
  isLoopEnabled?: boolean;
  /** Anonymous-link expiration in days; null disables expiry. */
  anyoneLinkExpirationInDays?: number | null;
};

export type SharepointBaseline = {
  descriptor: SharepointBaselineDescriptor;
  /**
   * Idempotency for SharePoint baselines is by-value, not by-tag. The
   * push-time check GETs the current settings and skips PATCH if every
   * key in `intendedPatch` already matches.
   */
  idempotencyKey: string;
  intendedPatch: SharepointSettingsPatch;
};
