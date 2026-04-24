import "server-only";
import { z } from "zod";

/**
 * UI-oriented spec for a custom Conditional Access policy. The wizard
 * writes this; the builder translates it into the Graph CA body at
 * preview + push time. This separation lets the wizard speak in
 * human-friendly options (e.g. "target: Office 365") while the Graph
 * layer keeps dealing with app GUIDs and bitmask strings.
 *
 * Every field is optional except name + state; the builder fills in
 * safe defaults (empty conditions, required grant).
 */

// ----- Zod schema (used by API routes for validation) -----

export const PolicyStateSchema = z.enum([
  "enabledForReportingButNotEnforced",
  "disabled",
  "enabled",
]);

export const UsersIncludeKindSchema = z.enum([
  "all",
  "none",
  "roles",
  "guestsOrExternalUsers",
]);

export const AppsTargetSchema = z.enum([
  "all",
  "office365",
  "adminPortals",
  "azureManagement",
  "specific",
]);

export const SessionPersistentBrowserSchema = z.enum([
  "default",
  "never",
  "always",
]);

export const GuestOrExternalUserTypeSchema = z.enum([
  "internalGuest",
  "b2bCollaborationGuest",
  "b2bCollaborationMember",
  "b2bDirectConnectUser",
  "otherExternalUser",
  "serviceProvider",
]);

/**
 * Attribute + operator the device filter rule builder emits. Subset of
 * the Entra rule grammar covering the four most common attributes
 * (trustType, isCompliant, mdmAppId, operatingSystem) and three
 * operators. At render time these are joined into the Kusto-like string
 * Graph expects — e.g. `device.trustType -eq "ServerAD"`.
 */
export const DeviceFilterAttrSchema = z.enum([
  "trustType",
  "isCompliant",
  "mdmAppId",
  "operatingSystem",
]);
export const DeviceFilterOpSchema = z.enum(["-eq", "-ne", "-contains"]);

export const CustomCaPolicySpecSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    state: PolicyStateSchema.default("enabledForReportingButNotEnforced"),

    /**
     * Reference tenant. When non-null, the spec may carry tenant-local
     * IDs (specific users/groups, named location IDs, ToU IDs, custom
     * auth strength IDs) that were picked from this tenant's Graph. At
     * push time the target tenant MUST equal referenceTenantId — the
     * push route rejects cross-tenant pushes of scoped drafts.
     */
    referenceTenantId: z.string().nullable().default(null),

    users: z.object({
      include: z.object({
        kind: UsersIncludeKindSchema.default("all"),
        roleIds: z.array(z.string()).default([]),
        /** Tenant-local user IDs — requires referenceTenantId. */
        userIds: z.array(z.string()).default([]),
        /** Tenant-local group IDs — requires referenceTenantId. */
        groupIds: z.array(z.string()).default([]),
        guestTypes: z.array(GuestOrExternalUserTypeSchema).default([]),
        externalTenantMembershipKind: z
          .enum(["all", "enumerated"])
          .default("all"),
      }),
      exclude: z.object({
        roleIds: z.array(z.string()).default([]),
        /** Tenant-local user IDs — requires referenceTenantId. */
        userIds: z.array(z.string()).default([]),
        /** Tenant-local group IDs — requires referenceTenantId. */
        groupIds: z.array(z.string()).default([]),
        /** Mandatory safety rail — defaults true. */
        excludeGlobalAdmins: z.boolean().default(true),
      }),
    }),

    apps: z.object({
      target: AppsTargetSchema.default("all"),
      /** Used when target = "specific" — includes app IDs or known pseudo-GUIDs. */
      includeAppIds: z.array(z.string()).default([]),
      excludeAppIds: z.array(z.string()).default([]),
    }),

    conditions: z
      .object({
        userRiskLevels: z.array(z.enum(["low", "medium", "high"])).default([]),
        signInRiskLevels: z
          .array(z.enum(["low", "medium", "high"]))
          .default([]),
        platforms: z
          .array(
            z.enum([
              "android",
              "iOS",
              "windows",
              "macOS",
              "linux",
              "windowsPhone",
            ]),
          )
          .default([]),
        clientAppTypes: z
          .array(
            z.enum([
              "browser",
              "mobileAppsAndDesktopClients",
              "exchangeActiveSync",
              "other",
            ]),
          )
          .default([]),
        /**
         * Locations mode:
         *   - "any"          (default)  — no location condition
         *   - "trustedOnly"  Only AllTrusted (cross-tenant safe)
         *   - "specific"     includeLocations/excludeLocations are arrays
         *                    of named-location IDs. Requires referenceTenantId.
         */
        locations: z.enum(["any", "trustedOnly", "specific"]).default("any"),
        includeLocations: z.array(z.string()).default([]),
        excludeLocations: z.array(z.string()).default([]),
        /**
         * Device filter. When enabled, the rules array is joined with
         * logical AND into a single Graph `rule` string. Entra's grammar
         * allows richer expressions (OR, parentheses) but the wizard
         * scopes to AND of attribute-op-value triples for safety.
         */
        deviceFilter: z
          .object({
            enabled: z.boolean().default(false),
            mode: z.enum(["include", "exclude"]).default("include"),
            rules: z
              .array(
                z.object({
                  attr: DeviceFilterAttrSchema,
                  op: DeviceFilterOpSchema,
                  value: z.string(),
                }),
              )
              .default([]),
          })
          .default({ enabled: false, mode: "include", rules: [] }),
      })
      .default(() => ({
        userRiskLevels: [],
        signInRiskLevels: [],
        platforms: [],
        clientAppTypes: [],
        locations: "any" as const,
        includeLocations: [],
        excludeLocations: [],
        deviceFilter: {
          enabled: false,
          mode: "include" as const,
          rules: [],
        },
      })),

    grant: z.object({
      /** When "block", all other grant fields are ignored. */
      kind: z.enum(["block", "grantWithRequirements"]).default("grantWithRequirements"),
      operator: z.enum(["AND", "OR"]).default("OR"),
      requireMfa: z.boolean().default(false),
      requireCompliantDevice: z.boolean().default(false),
      requireHybridJoinedDevice: z.boolean().default(false),
      requireApprovedClientApp: z.boolean().default(false),
      requireCompliantApplication: z.boolean().default(false),
      requirePasswordChange: z.boolean().default(false),
      /**
       * When set, maps to grantControls.authenticationStrength.id.
       * Overrides requireMfa. May be a built-in strength GUID (3
       * cross-tenant-safe values) OR a custom strength ID from the
       * reference tenant — custom IDs require referenceTenantId.
       */
      authenticationStrengthId: z.string().optional(),
      /**
       * Terms of Use IDs from the reference tenant. Each becomes an
       * entry in grantControls.termsOfUse. Requires referenceTenantId.
       */
      termsOfUseIds: z.array(z.string()).default([]),
    }),

    session: z
      .object({
        signInFrequency: z
          .object({
            enabled: z.boolean().default(false),
            type: z.enum(["hours", "days"]).default("hours"),
            value: z.number().int().min(1).max(365).default(4),
          })
          .default({ enabled: false, type: "hours", value: 4 }),
        persistentBrowser: SessionPersistentBrowserSchema.default("default"),
        applicationEnforcedRestrictions: z.boolean().default(false),
      })
      .default({
        signInFrequency: { enabled: false, type: "hours", value: 4 },
        persistentBrowser: "default",
        applicationEnforcedRestrictions: false,
      }),
  })
  .strict();

export type CustomCaPolicySpec = z.infer<typeof CustomCaPolicySpecSchema>;
