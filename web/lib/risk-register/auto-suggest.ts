import "server-only";
import {
  createRisk,
  hasActiveSuggestion,
  type RiskSource,
} from "@/lib/db/risk-register";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  IncidentsPayload,
  PimSprawlPayload,
  VulnerabilitiesPayload,
} from "@/lib/graph/signals";

/**
 * Auto-suggest engine — converts posture signals into risk-register
 * suggestions when thresholds breach. Every rule:
 *   1. Checks for an existing active suggestion (or a dismissed one
 *      still in cooldown) and skips if present — see
 *      `hasActiveSuggestion` for the dedup contract.
 *   2. Computes a deterministic `relatedSignal` discriminator (CVE id,
 *      user UPN, etc.) so subsequent runs match the same risk.
 *   3. Creates the risk with `status = 'suggested'`. Operator promotes
 *      to `open` on the /risk-register page.
 *
 * Wired into the sync orchestrator (Phase 5 — to be called at end of
 * each tenant sync). Deliberately tolerant — every rule wraps in
 * try/catch so a malformed snapshot doesn't break the sync.
 *
 * Setting `MIZAN_AUTO_PROMOTE_SUGGESTIONS=true` (or the equivalent
 * Settings toggle, future) flips suggestions straight to `open` —
 * customers who trust the rules can run unattended. Default: suggest
 * only.
 */

const AUTO_PROMOTE =
  (process.env.MIZAN_AUTO_PROMOTE_SUGGESTIONS ?? "").toLowerCase() === "true";

function suggestRisk(opts: {
  source: RiskSource;
  relatedSignal: string;
  title: string;
  description: string;
  impact: number;
  likelihood: number;
  owner?: string;
}): void {
  if (hasActiveSuggestion(opts.source, opts.relatedSignal)) return;
  createRisk({
    title: opts.title,
    description: opts.description,
    impact: opts.impact,
    likelihood: opts.likelihood,
    owner: opts.owner,
    source: opts.source,
    relatedSignal: opts.relatedSignal,
    status: AUTO_PROMOTE ? "open" : "suggested",
  });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Walk every tenant's latest signal snapshots and emit suggestions
 * where thresholds breach. Idempotent — duplicate suggestions are
 * filtered by `hasActiveSuggestion`.
 */
export function runAutoSuggestRules(): void {
  for (const t of listTenants()) {
    if (t.consent_status !== "consented" && t.is_demo === 0) continue;

    // Rule 1 — Critical CVE > 30 days unpatched on > 1 device.
    try {
      const vuln = getLatestSnapshot<VulnerabilitiesPayload>(
        t.id,
        "vulnerabilities",
      );
      if (vuln?.payload?.topCves) {
        for (const cve of vuln.payload.topCves) {
          if (cve.severity !== "Critical") continue;
          if ((cve.affectedDevices ?? 0) < 2) continue;
          if (!cve.publishedDateTime) continue;
          const ageMs =
            Date.now() - new Date(cve.publishedDateTime).getTime();
          if (ageMs < THIRTY_DAYS_MS) continue;
          suggestRisk({
            source: "auto-cve",
            relatedSignal: cve.cveId,
            title: `Critical CVE ${cve.cveId} unpatched on ${cve.affectedDevices} devices > 30 days`,
            description: `Microsoft Defender Vulnerability Management has surfaced ${cve.cveId} (severity ${cve.severity}, ${cve.affectedDevices} affected devices) for more than 30 days without remediation. ${cve.recommendedFix ?? ""}`,
            impact: 5,
            likelihood: 4,
          });
        }
      }
    } catch {
      /* tolerate snapshot parse fail */
    }

    // Rule 2 — Admin deactivation event in last 7 days.
    try {
      const pim = getLatestSnapshot<PimSprawlPayload>(t.id, "pimSprawl");
      if (pim?.payload?.recentAdminDeactivations) {
        const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const d of pim.payload.recentAdminDeactivations) {
          if (new Date(d.activityDateTime).getTime() < sevenDays) continue;
          const upn = d.targetUserPrincipalName ?? d.auditId;
          suggestRisk({
            source: "auto-deactivation",
            relatedSignal: d.auditId,
            title: `Admin account deactivated: ${d.targetDisplayName ?? upn}`,
            description: `${d.targetDisplayName ?? upn} (roles: ${d.targetRoles.join(", ")}) was deactivated by ${d.actorPrincipalName ?? "unknown"} on ${d.activityDateTime}. Confirm this was authorized; deactivating an admin account is a textbook persistence-removal step in cross-tenant attacks.`,
            impact: 5,
            likelihood: 3,
          });
        }
      }
    } catch {
      /* tolerate */
    }

    // Rule 3 — Active high-severity incident open > 24h.
    try {
      const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents");
      if (inc?.payload?.incidents) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const item of inc.payload.incidents) {
          if (item.severity !== "high") continue;
          if (item.status !== "active") continue;
          if (new Date(item.createdDateTime).getTime() > dayAgo) continue;
          suggestRisk({
            source: "auto-incident",
            relatedSignal: item.id,
            title: `High-severity incident open > 24h: ${item.displayName}`,
            description: `Defender XDR incident ${item.id} (severity ${item.severity}) has been open since ${item.createdDateTime} without resolution. SLA breach.`,
            impact: 5,
            likelihood: 5,
          });
        }
      }
    } catch {
      /* tolerate */
    }
  }
}
