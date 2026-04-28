import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type {
  IncidentsPayload,
  PimSprawlPayload,
  RiskyUsersPayload,
} from "@/lib/graph/signals";
import { currentScopeHash } from "@/lib/auth/graph-app-provisioner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * v2.5.34 — feed for the top-bar notification bell. Merges signals from
 * the Council's own DB (sync failures, scope-stale tenants) with
 * tenant-side findings that surfaced in the latest snapshots (high-risk
 * users, critical incidents, recent admin deactivations). One ranked
 * list, capped at 50, sorted newest-first by issue timestamp.
 *
 * No persisted "unread" state yet — the bell renders an unread badge on
 * any tenant whose `last_sync_error` set in the last 24h, or whose new
 * deactivation event landed in the last 24h. Read-state persistence is
 * a follow-up; this gives operators an actionable feed today.
 */

type Notification = {
  id: string;
  kind:
    | "sync_failure"
    | "consent_failed"
    | "scope_stale"
    | "admin_deactivated"
    | "high_risk_user"
    | "critical_incident";
  severity: "info" | "warn" | "neg";
  /** Untranslated key that the UI looks up. */
  titleKey: string;
  /** Already-substituted body. UI prints as-is. */
  body: string;
  tenantId: string | null;
  tenantName: string | null;
  occurredAt: string;
  /** Optional path the bell can deep-link to. */
  href: string | null;
};

export async function GET() {
  const tenants = listTenants();
  const out: Notification[] = [];
  const now = Date.now();

  for (const t of tenants) {
    if (t.suspended_at) continue;

    // Sync failure (last_sync_error set; row consented).
    if (t.consent_status === "consented" && t.last_sync_error) {
      out.push({
        id: `sync-${t.id}`,
        kind: "sync_failure",
        severity: "warn",
        titleKey: "notif.syncFailure.title",
        body: t.last_sync_error.slice(0, 240),
        tenantId: t.id,
        tenantName: t.name_en,
        occurredAt: t.last_sync_at ?? t.updated_at,
        href: `/entities/${t.id}`,
      });
    }

    // Consent flow stuck.
    if (t.consent_status === "failed" || t.consent_status === "revoked") {
      out.push({
        id: `consent-${t.id}`,
        kind: "consent_failed",
        severity: "neg",
        titleKey: "notif.consentFailed.title",
        body: t.last_sync_error ?? "",
        tenantId: t.id,
        tenantName: t.name_en,
        occurredAt: t.updated_at,
        href: `/entities`,
      });
    }

    // Scope stale (release added new permissions and this tenant hasn't
    // re-consented). v2.5.24 plumbing.
    if (
      t.consent_status === "consented" &&
      !t.is_demo &&
      (t.consented_scope_hash === null ||
        t.consented_scope_hash !== currentScopeHash(t.consent_mode))
    ) {
      out.push({
        id: `scope-${t.id}`,
        kind: "scope_stale",
        severity: "warn",
        titleKey: "notif.scopeStale.title",
        body: "",
        tenantId: t.id,
        tenantName: t.name_en,
        occurredAt: t.updated_at,
        href: `/entities`,
      });
    }

    // Admin deactivations from PIM signal payload (v2.5.34 PimSprawl extension).
    const pim = getLatestSnapshot<PimSprawlPayload>(t.id, "pimSprawl");
    if (pim?.payload?.recentAdminDeactivations) {
      for (const d of pim.payload.recentAdminDeactivations.slice(0, 5)) {
        out.push({
          id: `dx-${t.id}-${d.auditId}`,
          kind: "admin_deactivated",
          severity: "neg",
          titleKey: "notif.adminDeactivated.title",
          body: `${d.targetDisplayName ?? d.targetUserPrincipalName ?? "?"} (${d.targetRoles.join(", ")}) — by ${d.actorPrincipalName ?? "?"}`,
          tenantId: t.id,
          tenantName: t.name_en,
          occurredAt: d.activityDateTime,
          href: `/entities/${t.id}#identity`,
        });
      }
    }

    // High-risk users (latest snapshot's atRisk count).
    const risky = getLatestSnapshot<RiskyUsersPayload>(t.id, "riskyUsers");
    if (risky?.payload && risky.payload.highRisk > 0) {
      out.push({
        id: `risky-${t.id}`,
        kind: "high_risk_user",
        severity: "neg",
        titleKey: "notif.highRiskUser.title",
        body: `${risky.payload.highRisk} high-risk user(s)`,
        tenantId: t.id,
        tenantName: t.name_en,
        occurredAt: risky.fetched_at,
        href: `/entities/${t.id}`,
      });
    }

    // Critical incidents (open with severity high or above).
    const inc = getLatestSnapshot<IncidentsPayload>(t.id, "incidents");
    if (inc?.payload) {
      const high = (inc.payload.bySeverity?.high ?? 0) as number;
      const active = inc.payload.active ?? 0;
      const flagged = Math.min(active, high);
      if (flagged > 0) {
        out.push({
          id: `inc-${t.id}`,
          kind: "critical_incident",
          severity: "neg",
          titleKey: "notif.criticalIncident.title",
          body: `${flagged} active high-severity incident(s)`,
          tenantId: t.id,
          tenantName: t.name_en,
          occurredAt: inc.fetched_at,
          href: `/entities/${t.id}`,
        });
      }
    }
  }

  // Sort newest first; trim to 50.
  out.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  const trimmed = out.slice(0, 50);
  const since24h = now - 24 * 60 * 60 * 1000;
  const unreadCount = trimmed.filter(
    (n) => new Date(n.occurredAt).getTime() >= since24h,
  ).length;

  return NextResponse.json({
    unreadCount,
    notifications: trimmed,
  });
}
