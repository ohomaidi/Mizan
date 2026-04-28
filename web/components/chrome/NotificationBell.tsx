"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";

type Notification = {
  id: string;
  kind: string;
  severity: "info" | "warn" | "neg";
  titleKey: string;
  body: string;
  tenantId: string | null;
  tenantName: string | null;
  occurredAt: string;
  href: string | null;
};

const POLL_INTERVAL_MS = 60_000;

/**
 * v2.5.34 — top-bar notification bell. Polls /api/notifications every
 * 60s for ranked posture events from across the federation:
 *   - Sync failures (last_sync_error set on a consented row)
 *   - Consent failures / revocations
 *   - Scope-stale tenants (release added scopes, tenant hasn't re-consented)
 *   - Recent admin deactivations (PimSprawl audit-log cross-reference)
 *   - High-risk users
 *   - Active high-severity incidents
 *
 * Shows an unread-count badge for events from the last 24h. Clicking the
 * bell opens a popover; clicking an item deep-links to the relevant page.
 * Replaces the v2.4.x dead Bell button that rendered a static red dot
 * with no actual data behind it.
 */
export function NotificationBell() {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{
    unreadCount: number;
    notifications: Notification[];
  }>({ unreadCount: 0, notifications: [] });
  const [loading, setLoading] = useState(true);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchOnce = () => {
      fetch("/api/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { unreadCount: 0, notifications: [] }))
        .then((j) => {
          if (alive) {
            setData(j);
            setLoading(false);
          }
        })
        .catch(() => {
          if (alive) setLoading(false);
        });
    };
    fetchOnce();
    const interval = setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const titleFor = (n: Notification) => {
    return t(n.titleKey as Parameters<typeof t>[0]);
  };

  const severityColor = (s: Notification["severity"]) =>
    s === "neg" ? "text-neg" : s === "warn" ? "text-warn" : "text-ink-2";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("topbar.notifications")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface-3 text-ink-2 relative"
      >
        <Bell size={16} />
        {data.unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-neg text-[10px] font-bold text-white grid place-items-center tabular leading-none">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t("topbar.notifications")}
          className="absolute end-0 top-10 z-50 w-[360px] rounded-md border border-border bg-surface-2 shadow-xl"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-ink-1">
              {t("notif.popover.title")}
            </div>
            <div className="text-[11px] text-ink-3 tabular">
              {t("notif.popover.summary", {
                count: String(data.notifications.length),
                unread: String(data.unreadCount),
              })}
            </div>
          </div>
          <div className="max-h-[460px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-ink-3">
                {t("state.loading")}
              </div>
            ) : data.notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-ink-3">
                {t("notif.popover.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.notifications.map((n) => {
                  const inner = (
                    <div className="flex items-start gap-2.5 px-4 py-3 hover:bg-surface-3 transition-colors">
                      <span
                        aria-hidden
                        className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                          n.severity === "neg"
                            ? "bg-neg"
                            : n.severity === "warn"
                              ? "bg-warn"
                              : "bg-ink-3"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12.5px] font-semibold ${severityColor(n.severity)}`}>
                          {titleFor(n)}
                        </div>
                        {n.tenantName ? (
                          <div className="text-[11.5px] text-ink-1 truncate">
                            {n.tenantName}
                          </div>
                        ) : null}
                        {n.body ? (
                          <div className="text-[11px] text-ink-3 leading-relaxed line-clamp-2 mt-0.5">
                            {n.body}
                          </div>
                        ) : null}
                        <div className="text-[10.5px] text-ink-3 tabular mt-1">
                          {fmtRelative(n.occurredAt)}
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="px-4 py-2 border-t border-border text-[10.5px] text-ink-3 leading-relaxed">
            {t("notif.popover.footer")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
