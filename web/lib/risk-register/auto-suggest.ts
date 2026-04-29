import "server-only";
import {
  createRisk,
  hasActiveSuggestion,
  type RiskSource,
} from "@/lib/db/risk-register";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import { getAutoSuggestConfig } from "@/lib/config/auto-suggest-config";
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

/**
 * Auto-promote can be flipped two ways: env var (legacy v2.6.0 escape
 * hatch for unattended automation) OR the per-deployment config knob
 * landed in v2.7.0 — UI on Settings → Risk register. ENV wins so a
 * fresh-install demo with the env set still bypasses review even
 * before the config knob is touched.
 */
function autoPromoteEnabled(): boolean {
  if ((process.env.MIZAN_AUTO_PROMOTE_SUGGESTIONS ?? "").toLowerCase() === "true") {
    return true;
  }
  return getAutoSuggestConfig().autoPromote;
}

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
    status: autoPromoteEnabled() ? "open" : "suggested",
  });
}

/**
 * Walk every tenant's latest signal snapshots and emit suggestions
 * where thresholds breach. Idempotent — duplicate suggestions are
 * filtered by `hasActiveSuggestion`.
 */
export function runAutoSuggestRules(): void {
  // Pull thresholds once per run so the operator's slider edit is
  // honoured immediately on the next sync. v2.7.0 — was hardcoded
  // before. Each rule reads its knob from the config object below.
  const cfg = getAutoSuggestConfig();
  const cveAgeMs = cfg.cveAgeDays * 24 * 60 * 60 * 1000;
  const deactivationWindowMs =
    cfg.deactivationWindowDays * 24 * 60 * 60 * 1000;
  const incidentOpenMs = cfg.incidentOpenHours * 60 * 60 * 1000;

  for (const t of listTenants()) {
    if (t.consent_status !== "consented" && t.is_demo === 0) continue;

    // Rule 1 — Critical CVE older than `cveAgeDays` on at least
    // `cveMinDevices` devices.
    try {
      const vuln = getLatestSnapshot<VulnerabilitiesPayload>(
        t.id,
        "vulnerabilities",
      );
      if (vuln?.payload?.topCves) {
        for (const cve of vuln.payload.topCves) {
          if (cve.severity !== "Critical") continue;
          if ((cve.affectedDevices ?? 0) < cfg.cveMinDevices) continue;
          if (!cve.publishedDateTime) continue;
          const ageMs =
            Date.now() - new Date(cve.publishedDateTime).getTime();
          if (ageMs < cveAgeMs) continue;
          suggestRisk({
            source: "auto-cve",
            relatedSignal: cve.cveId,
            title: `Critical CVE ${cve.cveId} unpatched on ${cve.affectedDevices} devices > ${cfg.cveAgeDays} days`,
            description: `Microsoft Defender Vulnerability Management has surfaced ${cve.cveId} (severity ${cve.severity}, ${cve.affectedDevices} affected devices) for more than ${cfg.cveAgeDays} days without remediation. ${cve.recommendedFix ?? ""}`,
            impact: 5,
            likelihood: 4,
          });
        }
      }
    } catch {
      /* tolerate snapshot parse fail */
    }

    // Rule 2 — Admin deactivation in last `deactivationWindowDays` days.
    try {
      const pim = getLatestSnapshot<PimSprawlPayload>(t.id, "pimSprawl");
      if (pim?.payload?.recentAdminDeactivations) {
        const cutoff = Date.now() - deactivationWindowMs;
        for (const d of pim.payload.recentAdminDeactivations) {
          if (new Date(d.activityDateTime).getTime() < cutoff) continue;
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

    // Rule 3 — Active high-severity incident open > `incidentOpenHours`.
    try {
      const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents");
      if (inc?.payload?.incidents) {
        const cutoff = Date.now() - incidentOpenMs;
        for (const item of inc.payload.incidents) {
          if (item.severity !== "high") continue;
          if (item.status !== "active") continue;
          if (new Date(item.createdDateTime).getTime() > cutoff) continue;
          suggestRisk({
            source: "auto-incident",
            relatedSignal: item.id,
            title: `High-severity incident open > ${cfg.incidentOpenHours}h: ${item.displayName}`,
            description: `Defender XDR incident ${item.id} (severity ${item.severity}) has been open since ${item.createdDateTime} without resolution. SLA breach (${cfg.incidentOpenHours}h threshold).`,
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
