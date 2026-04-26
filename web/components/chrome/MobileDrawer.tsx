"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  UserCog,
  ShieldAlert,
  Files,
  MonitorSmartphone,
  Scale,
  Settings,
  HelpCircle,
  Bug,
  Gavel,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { api } from "@/lib/api/client";
import { DataSourcesPanel } from "./DataSourcesPanel";

/**
 * Mobile-only navigation drawer (v2.5.0).
 *
 * Nav item list mirrors the desktop Sidebar's, intentionally duplicated
 * here rather than imported. The architectural rule: desktop chrome
 * lives in DesktopShell.tsx + Sidebar.tsx and mobile chrome lives in
 * Mobile*.tsx — they don't share UI components, only data shapes (and
 * even those, sparingly). That isolation is what makes the desktop
 * view bit-for-bit unchanged when mobile evolves.
 *
 * If a new top-level page lands, add it BOTH places. The convention is
 * intentional friction: small enough that adding a third or fourth
 * top-level surface doesn't sneak by, large enough that mobile
 * decisions don't accidentally rewrite desktop ones.
 */

type NavItem = {
  href: string;
  labelKey: DictKey;
  icon: typeof LayoutDashboard;
  showWhen?: (state: { deploymentMode: "observation" | "directive" }) => boolean;
};

const NAV: NavItem[] = [
  { href: "/maturity", labelKey: "nav.maturity", icon: LayoutDashboard },
  { href: "/entities", labelKey: "nav.entities", icon: Building2 },
  { href: "/identity", labelKey: "nav.identity", icon: UserCog },
  { href: "/threats", labelKey: "nav.threats", icon: ShieldAlert },
  { href: "/vulnerabilities", labelKey: "nav.vulnerabilities", icon: Bug },
  { href: "/data", labelKey: "nav.data", icon: Files },
  { href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone },
  { href: "/governance", labelKey: "nav.governance", icon: Scale },
  {
    href: "/directive",
    labelKey: "nav.directive",
    icon: Gavel,
    showWhen: (s) => s.deploymentMode === "directive",
  },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

export function MobileDrawerTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t("nav.menu.open")}
      aria-controls="mobile-nav-drawer"
      onClick={onOpen}
      className="touch-target -ms-2 grid place-items-center rounded-md text-ink-1 hover:bg-surface-3"
    >
      <Menu size={20} aria-hidden="true" />
    </button>
  );
}

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
    "observation",
  );

  // Body-scroll lock while open. We toggle a data-attribute on <html>
  // rather than mutating body styles so the rule lives in CSS
  // (globals.css) and survives competing components.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute(
      "data-scroll-locked",
      open ? "true" : "false",
    );
    return () => {
      document.documentElement.removeAttribute("data-scroll-locked");
    };
  }, [open]);

  // Escape closes — listened at document level so the drawer doesn't
  // need focus, which is fuzzy on touch.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (alive) setDeploymentMode(r.deploymentMode);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = NAV.filter((item) =>
    !item.showWhen ? true : item.showWhen({ deploymentMode }),
  );

  return (
    <>
      {/* Backdrop. pointer-events disabled when closed so taps reach
          underlying content during the transition's exit phase. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer — slides from inline-start. Width capped so a tap-to-
          close edge stays visible even on 320px screens. The
          `start-0` + `-translate-x-full rtl:translate-x-full` combo
          handles both LTR and RTL deployments without conditionals. */}
      <aside
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.eyebrow")}
        className={`fixed top-0 bottom-0 start-0 z-50 flex flex-col w-[80vw] max-w-[300px] bg-surface-2 border-e border-border shadow-2xl transform transition-transform safe-area-pt safe-area-pb ${
          open
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="h-14 px-3 flex items-center justify-between border-b border-border">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2 ps-2">
            {t("nav.eyebrow")}
          </span>
          <button
            type="button"
            aria-label={t("nav.menu.close")}
            onClick={onClose}
            className="touch-target grid place-items-center rounded-md text-ink-2 hover:text-ink-1 hover:bg-surface-3"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto" aria-label={t("nav.eyebrow")}>
          <ul className="flex flex-col gap-0.5 mt-1">
            {items.map(({ href, labelKey, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                    className={cn(
                      // h-11 = 44px touch target floor.
                      "flex items-center gap-2.5 h-11 px-2.5 rounded-md text-[14px] transition-colors",
                      active
                        ? "bg-surface-3 text-ink-1 font-medium shadow-[inset_2px_0_0_var(--council-primary-strong)] rtl:shadow-[inset_-2px_0_0_var(--council-primary-strong)]"
                        : "text-ink-2 hover:text-ink-1 hover:bg-surface-3/60",
                    )}
                  >
                    <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    <span>{t(labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <DataSourcesPanel />
      </aside>
    </>
  );
}
