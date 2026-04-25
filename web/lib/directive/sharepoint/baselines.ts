import "server-only";
import type { SharepointBaseline } from "./types";

/**
 * Phase 11a SharePoint tenant external-sharing baselines.
 *
 * Every baseline targets the cross-tenant-stable subset of SharePoint
 * tenant settings — sharing capability, default link type/permission,
 * domain restrictions, anonymous-link expiry. Site-level + OneDrive +
 * Teams policies are not in this catalog (they're PowerShell-only and
 * sit in the coming-soon roadmap).
 */

const idem = (id: string) => `mizan:sharepoint-${id}:v1`;

export const sharepointStrictExternalSharing: SharepointBaseline = {
  descriptor: {
    id: "sharepoint-strict-external-sharing",
    titleKey: "sharepoint.baseline.strictExternalSharing.title",
    bodyKey: "sharepoint.baseline.strictExternalSharing.body",
    riskTier: "high",
    effectSummary:
      "External sharing limited to authenticated guests only — no anonymous links. Default link expires after 30 days.",
    whyKey: "sharepoint.baseline.strictExternalSharing.why",
    impactKey: "sharepoint.baseline.strictExternalSharing.impact",
    prerequisitesKey:
      "sharepoint.baseline.strictExternalSharing.prerequisites",
    rolloutAdviceKey: "sharepoint.baseline.strictExternalSharing.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/sharepoint/turn-external-sharing-on-or-off",
  },
  idempotencyKey: idem("strict-external-sharing"),
  intendedPatch: {
    sharingCapability: "externalUserSharingOnly",
    requireAcceptingAccountMatchInvitedAccount: true,
    anyoneLinkExpirationInDays: 30,
  },
};

export const sharepointDefaultLinkInternal: SharepointBaseline = {
  descriptor: {
    id: "sharepoint-default-link-internal",
    titleKey: "sharepoint.baseline.defaultLinkInternal.title",
    bodyKey: "sharepoint.baseline.defaultLinkInternal.body",
    riskTier: "medium",
    effectSummary:
      "Default sharing link type is 'Internal' (people in the organization). Default permission is 'View'. Stops accidental over-sharing on the first click.",
    whyKey: "sharepoint.baseline.defaultLinkInternal.why",
    impactKey: "sharepoint.baseline.defaultLinkInternal.impact",
    prerequisitesKey: "sharepoint.baseline.defaultLinkInternal.prerequisites",
    rolloutAdviceKey: "sharepoint.baseline.defaultLinkInternal.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/sharepoint/change-default-sharing-link",
  },
  idempotencyKey: idem("default-link-internal"),
  intendedPatch: {
    defaultSharingLinkType: "internal",
    defaultLinkPermission: "view",
  },
};

export const sharepointDomainAllowList: SharepointBaseline = {
  descriptor: {
    id: "sharepoint-domain-allow-list",
    titleKey: "sharepoint.baseline.domainAllowList.title",
    bodyKey: "sharepoint.baseline.domainAllowList.body",
    riskTier: "medium",
    effectSummary:
      "Restrict guest sharing to an allow-list of domains. Empty list ships as a placeholder — operator must add the entity's partner domains before pushing.",
    whyKey: "sharepoint.baseline.domainAllowList.why",
    impactKey: "sharepoint.baseline.domainAllowList.impact",
    prerequisitesKey: "sharepoint.baseline.domainAllowList.prerequisites",
    rolloutAdviceKey: "sharepoint.baseline.domainAllowList.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/sharepoint/restricted-domains-sharing",
  },
  idempotencyKey: idem("domain-allow-list"),
  intendedPatch: {
    sharingDomainRestrictionMode: "allowList",
    sharingAllowedDomainList: [],
  },
};

export const sharepointAnonymousLinksOff: SharepointBaseline = {
  descriptor: {
    id: "sharepoint-anonymous-links-off",
    titleKey: "sharepoint.baseline.anonymousLinksOff.title",
    bodyKey: "sharepoint.baseline.anonymousLinksOff.body",
    riskTier: "high",
    effectSummary:
      "Disable anonymous-link sharing entirely. Users can still share with named recipients (internal or external), but cannot generate 'anyone with the link' URLs.",
    whyKey: "sharepoint.baseline.anonymousLinksOff.why",
    impactKey: "sharepoint.baseline.anonymousLinksOff.impact",
    prerequisitesKey: "sharepoint.baseline.anonymousLinksOff.prerequisites",
    rolloutAdviceKey: "sharepoint.baseline.anonymousLinksOff.rollout",
    docsUrl:
      "https://learn.microsoft.com/en-us/sharepoint/turn-external-sharing-on-or-off",
  },
  idempotencyKey: idem("anonymous-links-off"),
  intendedPatch: {
    sharingCapability: "existingExternalUserSharingOnly",
  },
};

export const SHAREPOINT_BASELINES: SharepointBaseline[] = [
  sharepointStrictExternalSharing,
  sharepointDefaultLinkInternal,
  sharepointDomainAllowList,
  sharepointAnonymousLinksOff,
];

export function getSharepointBaseline(id: string): SharepointBaseline | null {
  return (
    SHAREPOINT_BASELINES.find((b) => b.descriptor.id === id) ?? null
  );
}
