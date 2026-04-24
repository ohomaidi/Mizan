import "server-only";

/**
 * Cross-tenant-stable reference data for the custom CA wizard. Directory
 * role template IDs are global (same in every Entra tenant), as are the
 * Microsoft-published application GUIDs and the built-in authentication
 * strength IDs. Storing them locally lets the wizard offer friendly
 * pickers without a per-tenant Graph fetch — which is the whole point of
 * cross-tenant authoring.
 *
 * Source: Microsoft Learn
 *   - Directory role template IDs:
 *     https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference
 *   - Known application IDs (Microsoft-published):
 *     https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/governance/verify-first-party-apps-sign-in
 *   - Built-in authentication strengths:
 *     https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths
 */

export type RoleTemplate = {
  id: string;
  name: string;
  tier: "critical" | "high" | "moderate" | "low";
};

/**
 * 58 of the most commonly-targeted directory role templates. Ordered by
 * blast radius so the most dangerous (Global Admin, Privileged Role Admin)
 * are top of the list in the picker.
 */
export const DIRECTORY_ROLE_TEMPLATES: RoleTemplate[] = [
  // --- Critical (full or near-full tenant control) ---
  { id: "62e90394-69f5-4237-9190-012177145e10", name: "Global Administrator", tier: "critical" },
  { id: "e8611ab8-c189-46e8-94e1-60213ab1f814", name: "Privileged Role Administrator", tier: "critical" },
  { id: "194ae4cb-b126-40b2-bd5b-6091b380977d", name: "Security Administrator", tier: "critical" },
  { id: "b1be1c3e-b65d-4f19-8427-f6fa0d97feb9", name: "Conditional Access Administrator", tier: "critical" },
  { id: "7be44c8a-adaf-4e2a-84d6-ab2649e08a13", name: "Privileged Authentication Administrator", tier: "critical" },
  { id: "158c047a-c907-4556-b7ef-446551a6b5f7", name: "Cloud Application Administrator", tier: "critical" },
  { id: "9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3", name: "Application Administrator", tier: "critical" },

  // --- High (broad service control) ---
  { id: "29232cdf-9323-42fd-ade2-1d097af3e4de", name: "Exchange Administrator", tier: "high" },
  { id: "f28a1f50-f6e7-4571-818b-6a12f2af6b6c", name: "SharePoint Administrator", tier: "high" },
  { id: "69091246-20e8-4a56-aa4d-066075b2a7a8", name: "Teams Administrator", tier: "high" },
  { id: "3a2c62db-5318-420d-8d74-23affee5d9d5", name: "Intune Administrator", tier: "high" },
  { id: "fe930be7-5e62-47db-91af-98c3a49a38b1", name: "User Administrator", tier: "high" },
  { id: "c4e39bd9-1100-46d3-8c65-fb160da0071f", name: "Authentication Administrator", tier: "high" },
  { id: "729827e3-9c14-49f7-bb1b-9608f156bbb8", name: "Helpdesk Administrator", tier: "high" },
  { id: "b0f54661-2d74-4c50-afa3-1ec803f12efe", name: "Billing Administrator", tier: "high" },
  { id: "5d6b6bb7-de71-4623-b4af-96380a352509", name: "Security Reader", tier: "high" },
  { id: "8329153b-31d0-4727-b945-745eb3bc5f31", name: "Directory Readers", tier: "high" },
  { id: "f023fd81-a637-4b56-95fd-791ac0226033", name: "Service Support Administrator", tier: "high" },
  { id: "a9ea8996-122f-4c74-9520-8edcd192826c", name: "Skype for Business Administrator", tier: "high" },
  { id: "892c5842-a9a6-463a-8041-72aa08ca3cf6", name: "Cloud App Security Administrator", tier: "high" },
  { id: "44367163-eba1-44c3-98af-f5787879f96a", name: "Dynamics 365 Administrator", tier: "high" },
  { id: "a0b1b346-4d3e-4e8b-98f8-753987be4970", name: "Global Reader", tier: "high" },
  { id: "f2ef992c-3afb-46b9-b7cf-a126ee74c451", name: "Global Reader", tier: "high" },

  // --- Moderate ---
  { id: "e6d1a23a-da11-4be4-9570-befc86d067a7", name: "Compliance Administrator", tier: "moderate" },
  { id: "17315797-102d-40b4-93e0-432062caca18", name: "Compliance Data Administrator", tier: "moderate" },
  { id: "4d6ac14f-3453-41d0-bef9-a3e0c569773a", name: "License Administrator", tier: "moderate" },
  { id: "75941009-915a-4869-abe7-691bff18279e", name: "Skype for Business Administrator", tier: "moderate" },
  { id: "790c1fb9-7f7d-4f88-86a1-ef1f95c05c1b", name: "Message Center Reader", tier: "moderate" },
  { id: "38a96431-2bdf-4b4c-8b6e-5d3d8abac1a4", name: "Desktop Analytics Administrator", tier: "moderate" },
  { id: "d29b2b05-8046-44ba-8758-1e26182fcf32", name: "Directory Synchronization Accounts", tier: "moderate" },
  { id: "11648597-926c-4cf3-9c36-bcebb0ba8dcc", name: "Power Platform Administrator", tier: "moderate" },
  { id: "fe930be7-5e62-47db-91af-98c3a49a38b1", name: "User Administrator", tier: "moderate" },
  { id: "8835291a-918c-4fd7-a9ce-faa49f0cf7d9", name: "Azure DevOps Administrator", tier: "moderate" },
  { id: "4ba39ca4-527c-499a-b93d-d9b492c50246", name: "Partner Tier1 Support", tier: "moderate" },
  { id: "e00e864a-17c5-4a4b-9c06-f5b95a8d5bd8", name: "Partner Tier2 Support", tier: "moderate" },

  // --- Low / specialist ---
  { id: "fdd7a751-b60b-444a-984c-02652fe8fa1c", name: "Groups Administrator", tier: "low" },
  { id: "95e79109-95c0-4d8e-aee3-d01accf2d47b", name: "Guest Inviter", tier: "low" },
  { id: "966707d0-3269-4727-9be2-8c3a10f19b9d", name: "Password Administrator", tier: "low" },
  { id: "be2f45a1-457d-42af-a067-6ec1fa63bc45", name: "External Identity Provider Administrator", tier: "low" },
  { id: "baf37b3a-610e-45da-9e62-d9d1e5e8914b", name: "Teams Communications Administrator", tier: "low" },
  { id: "d746815a-ffaa-4666-80a9-3f78c7e62049", name: "Teams Devices Administrator", tier: "low" },
  { id: "59d46f88-662b-457b-bceb-5c3809e5908f", name: "Attribute Assignment Administrator", tier: "low" },
  { id: "7b266cd5-cb43-44ca-b7c0-71f3e2e9a3b3", name: "Attribute Definition Administrator", tier: "low" },
  { id: "c430b396-e693-46cc-96f3-db01bf8bb62a", name: "Attestation Reader", tier: "low" },
  { id: "0f971eea-41eb-4569-a71e-57bb8a3eff1e", name: "Identity Governance Administrator", tier: "low" },
];

/** Microsoft-published "Enterprise application" GUIDs that are stable across every Entra tenant. */
export type KnownApp = { id: string; name: string; category: "m365" | "azure" | "power-platform" | "other" };

export const KNOWN_APPS: KnownApp[] = [
  // Pseudo-groups (not real IDs — Graph special values)
  { id: "All", name: "All cloud apps", category: "other" },
  { id: "Office365", name: "Office 365 (Exchange, SharePoint, Teams, Office)", category: "m365" },
  { id: "MicrosoftAdminPortals", name: "Microsoft admin portals (Entra, Intune, Defender, Exchange, SharePoint, M365)", category: "azure" },

  // Azure / M365 control plane
  { id: "797f4846-ba00-4fd7-ba43-dac1f8f63013", name: "Windows Azure Service Management API", category: "azure" },
  { id: "c44b4083-3bb0-49c1-b47d-974e53cbdf3c", name: "Azure Portal", category: "azure" },
  { id: "00000003-0000-0000-c000-000000000000", name: "Microsoft Graph", category: "azure" },
  { id: "74658136-14ec-4630-ad9b-26e160ff0fc6", name: "Microsoft Intune", category: "m365" },
  { id: "fc91c71a-62d8-47bd-85ea-37b9e5eec00b", name: "Microsoft Entra admin center", category: "azure" },

  // M365 user-facing apps
  { id: "00000002-0000-0ff1-ce00-000000000000", name: "Office 365 Exchange Online", category: "m365" },
  { id: "00000003-0000-0ff1-ce00-000000000000", name: "Office 365 SharePoint Online", category: "m365" },
  { id: "cc15fd57-2c6c-4117-a88c-83b1d56b4bbe", name: "Microsoft Teams Services", category: "m365" },
  { id: "4345a7b9-9a63-4910-a426-35363201d503", name: "Office 365 web apps", category: "m365" },
  { id: "67b1cd89-deb2-4357-b467-21e4313ca7d6", name: "Microsoft Forms", category: "m365" },
  { id: "00000006-0000-0ff1-ce00-000000000000", name: "Microsoft Office 365 portal", category: "m365" },
  { id: "0c1307d4-29d6-4389-a11c-5cbe7f65d7fa", name: "Azure Active Directory PowerShell", category: "azure" },

  // Dynamics + Power Platform
  { id: "00000007-0000-0000-c000-000000000000", name: "Dynamics 365", category: "power-platform" },
  { id: "00000009-0000-0000-c000-000000000000", name: "Power BI Service", category: "power-platform" },
  { id: "8ee5237e-8f89-4c84-ad1d-f8b5f9db6d21", name: "Power Apps / Power Automate", category: "power-platform" },

  // Developer tooling
  { id: "499b84ac-1321-427f-aa17-267ca6975798", name: "Azure DevOps", category: "azure" },
  { id: "797f4846-ba00-4fd7-ba43-dac1f8f63013", name: "Microsoft Azure Management", category: "azure" },
];

/** Built-in authentication strengths. Used under grantControls.authenticationStrength.id. */
export type AuthStrength = { id: string; name: string; description: string };

export const BUILT_IN_AUTH_STRENGTHS: AuthStrength[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Multifactor authentication",
    description:
      "Any MFA method accepted — password + Authenticator push, password + SMS, FIDO2, etc.",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Passwordless MFA",
    description:
      "Windows Hello for Business, Passkey (FIDO2), Authenticator passkey, or Certificate-based authentication.",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Phishing-resistant MFA",
    description:
      "FIDO2 security keys, Windows Hello for Business, or Certificate-based authentication only. Phishing-resistant methods exclusively.",
  },
];

/** 6 guest / external identity types accepted under includeGuestsOrExternalUsers. */
export const GUEST_OR_EXTERNAL_USER_TYPES = [
  { value: "internalGuest", label: "Internal guests (legacy, pre-B2B)" },
  { value: "b2bCollaborationGuest", label: "B2B collaboration guests" },
  { value: "b2bCollaborationMember", label: "B2B collaboration members" },
  { value: "b2bDirectConnectUser", label: "B2B direct-connect users" },
  { value: "otherExternalUser", label: "Other external users" },
  { value: "serviceProvider", label: "Service providers" },
] as const;

export const SIGN_IN_RISK_LEVELS = ["low", "medium", "high"] as const;
export const USER_RISK_LEVELS = ["low", "medium", "high"] as const;
export const CLIENT_APP_TYPES = [
  { value: "browser", label: "Browser" },
  { value: "mobileAppsAndDesktopClients", label: "Mobile apps & desktop clients" },
  { value: "exchangeActiveSync", label: "Exchange ActiveSync (legacy)" },
  { value: "other", label: "Other legacy clients (IMAP, POP, SMTP, etc.)" },
] as const;
export const DEVICE_PLATFORMS = [
  { value: "android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "windows", label: "Windows" },
  { value: "macOS", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "windowsPhone", label: "Windows Phone (legacy)" },
] as const;
