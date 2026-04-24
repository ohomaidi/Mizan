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

export const CustomCaPolicySpecSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    state: PolicyStateSchema.default("enabledForReportingButNotEnforced"),

    users: z.object({
      include: z.object({
        kind: UsersIncludeKindSchema.default("all"),
        roleIds: z.array(z.string()).default([]),
        guestTypes: z.array(GuestOrExternalUserTypeSchema).default([]),
        externalTenantMembershipKind: z
          .enum(["all", "enumerated"])
          .default("all"),
      }),
      exclude: z.object({
        roleIds: z.array(z.string()).default([]),
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
        locations: z.enum(["any", "trustedOnly"]).default("any"),
      })
      .default(() => ({
        userRiskLevels: [],
        signInRiskLevels: [],
        platforms: [],
        clientAppTypes: [],
        locations: "any" as const,
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
      /** When set, maps to grantControls.authenticationStrength.id. Overrides requireMfa. */
      authenticationStrengthId: z.string().optional(),
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
