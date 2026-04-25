import "server-only";
import { z } from "zod";

/**
 * Threat Intelligence Indicators (IOCs) — Phase 14b.
 *
 * IOCs are operator-authored block lists pushed to each entity's
 * Defender for Endpoint via `POST /security/tiIndicators`. Different
 * lifecycle from baselines:
 *   - Each IOC is a single observable (file hash / URL / domain / IP)
 *     with an action (allow / alert / alertAndBlock / block) and an
 *     expiration date.
 *   - No baseline catalog — the operator types the indicator value at
 *     push time. Mizan ships a console rather than a card grid.
 *   - Each indicator has its own Graph id; rollback DELETEs by id.
 *
 * Idempotency: we tag every Mizan-pushed indicator with
 * `description = "[Mizan {id}] {operator description}"` so a repeat
 * push of the same observable+action can be detected by listing
 * indicators and matching on tag prefix.
 *
 * Reference:
 *   https://learn.microsoft.com/en-us/graph/api/tiindicators-post
 *   https://learn.microsoft.com/en-us/graph/api/resources/tiindicator
 */

export const IocActionSchema = z.enum([
  "allow",
  "alert",
  "alertAndBlock",
  "block",
  "unknown",
]);

export const IocSeveritySchema = z.enum(["low", "medium", "high", "informational"]);

export const IocTypeSchema = z.enum([
  "fileHashSha256",
  "fileHashSha1",
  "url",
  "domainName",
  "ipv4",
  "ipv6",
]);

export const IocPushBodySchema = z.object({
  /**
   * Observable type — drives which field on the Graph indicator the
   * value lands in (`fileHashValue`, `url`, `domainName`,
   * `networkDestinationIPv4`, etc.).
   */
  type: IocTypeSchema,
  /** The observable value (sha256 hex, https://example.com, 1.2.3.4, etc.). */
  value: z.string().min(3).max(2048),
  /** What Defender does on a match. */
  action: IocActionSchema.default("alertAndBlock"),
  severity: IocSeveritySchema.default("high"),
  /**
   * Free-text description (Mizan auto-prefixes with the tag). Microsoft
   * caps the final stored `description` at 100 chars, and the Mizan tag
   * itself eats ~20 chars (`[Mizan IOC 12345678] `), so we cap user
   * input at 80 to keep total ≤ 100. Anything longer would 400 on
   * the create call.
   */
  description: z.string().min(1).max(80),
  /** Optional Mizan-side note for the audit trail (not sent to Graph). */
  internalNote: z.string().max(500).optional(),
  /**
   * Expiration date. ISO-8601. Defaults to 90 days from now if omitted.
   * Microsoft requires every indicator to have one.
   */
  expirationDateTime: z.string().datetime().optional(),
  /** Multi-target push. */
  targetTenantIds: z.array(z.string().min(1)).min(1).max(100),
});

export type IocPushBody = z.infer<typeof IocPushBodySchema>;

/** Tag we stamp into the description so we can find IOCs we own. */
export function iocMizanTag(localId: string): string {
  return `[Mizan IOC ${localId}]`;
}

/**
 * Map Mizan's internal IOC observable type to the Defender API's
 * `indicatorType` enum. The Defender API does NOT distinguish IPv4 vs
 * IPv6 at the type level — both land under `IpAddress` and Defender
 * inspects the value to figure out which one it is. The Mizan-side
 * type stays granular (ipv4 / ipv6) for UI rendering + audit clarity.
 *
 * Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/post-ti-indicator
 */
export function mapIocKindToDefenderType(
  kind: z.infer<typeof IocTypeSchema>,
):
  | "FileSha256"
  | "FileSha1"
  | "Url"
  | "DomainName"
  | "IpAddress" {
  switch (kind) {
    case "fileHashSha256":
      return "FileSha256";
    case "fileHashSha1":
      return "FileSha1";
    case "url":
      return "Url";
    case "domainName":
      return "DomainName";
    case "ipv4":
    case "ipv6":
      return "IpAddress";
  }
}

/**
 * Map Mizan's internal action enum to Defender's. Defender accepts the
 * mapped string verbatim. `unknown` falls through to `Audit` so a
 * defensive misconfigured row never accidentally Blocks.
 */
export function mapIocActionToDefender(
  action: z.infer<typeof IocActionSchema>,
):
  | "Allowed"
  | "Alert"
  | "AlertAndBlock"
  | "Block"
  | "Audit" {
  switch (action) {
    case "allow":
      return "Allowed";
    case "alert":
      return "Alert";
    case "alertAndBlock":
      return "AlertAndBlock";
    case "block":
      return "Block";
    case "unknown":
      return "Audit";
  }
}

/**
 * Map Mizan's lowercase severity to Defender's TitleCase enum.
 * tiIndicator used integer 0–5; Defender uses a string. This is a
 * straight capitalize.
 */
export function mapIocSeverityToDefender(
  severity: z.infer<typeof IocSeveritySchema>,
): "Informational" | "Low" | "Medium" | "High" {
  switch (severity) {
    case "informational":
      return "Informational";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
  }
}
