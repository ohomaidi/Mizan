"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  AlertTriangle,
  ShieldCheck,
  FileText,
  Target,
  Sun,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { api } from "@/lib/api/client";

type NavItem = {
  /** A nav link item. */
  kind: "link";
  href: string;
  labelKey: DictKey;
  icon: typeof LayoutDashboard;
  /** If set, only render when predicate returns true. */
  showWhen?: (state: NavGate) => boolean;
};

type NavSeparator = {
  /** A section heading above a group of links. */
  kind: "separator";
  labelKey: DictKey;
  showWhen?: (state: NavGate) => boolean;
};

type NavGate = {
  deploymentMode: "observation" | "directive";
  deploymentKind: "council" | "executive";
};

type NavEntry = NavItem | NavSeparator;

/**
 * Navigation table — single source of truth for sidebar order.
 *
 * Council mode is the multi-tenant chrome: maturity overview, list of
 * consented entities, per-domain operational surfaces, governance,
 * directive (when enabled), settings, FAQ.
 *
 * Executive mode (v2.6.0 introduced; v2.6.1 redesigned) is reshaped
 * for a single-org CISO. Today is the daily-driver home; Posture is
 * a single tabbed page that consolidates what Council splits across
 * Identity / Devices / Data / Threats / Vulnerabilities; Compliance
 * folds in Directive as a single framework view; Risk / Scorecard /
 * Insurance / Board sit grouped underneath. The flat list of
 * Identity/Devices/etc + Entities is hidden — for a CISO with one
 * tenant, those drill-downs are inside Posture, not separate stops.
 *
 * Two distinct sequences keep the IA crisp instead of overloading
 * one list with dense `showWhen` predicates.
 */
const COUNCIL_NAV: NavEntry[] = [
  { kind: "link", href: "/maturity", labelKey: "nav.maturity", icon: LayoutDashboard },
  { kind: "link", href: "/entities", labelKey: "nav.entities", icon: Building2 },
  { kind: "link", href: "/identity", labelKey: "nav.identity", icon: UserCog },
  { kind: "link", href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone },
  { kind: "link", href: "/data", labelKey: "nav.data", icon: Files },
  { kind: "link", href: "/threats", labelKey: "nav.threats", icon: ShieldAlert },
  { kind: "link", href: "/governance", labelKey: "nav.governance", icon: Scale },
  { kind: "link", href: "/vulnerabilities", labelKey: "nav.vulnerabilities", icon: Bug },
  {
    kind: "link",
    href: "/directive",
    labelKey: "nav.directive",
    icon: Gavel,
    showWhen: (s) => s.deploymentMode === "directive",
  },
  { kind: "link", href: "/settings", labelKey: "nav.settings", icon: Settings },
  { kind: "link", href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

const EXECUTIVE_NAV: NavEntry[] = [
  // Daily driver — first entry, no separator needed.
  { kind: "link", href: "/today", labelKey: "nav.today", icon: Sun },
  { kind: "link", href: "/posture", labelKey: "nav.posture", icon: Activity },
  { kind: "link", href: "/governance", labelKey: "nav.compliance", icon: Scale },

  // ── Risk management ──
  { kind: "separator", labelKey: "nav.section.riskMgmt" },
  { kind: "link", href: "/risk-register", labelKey: "nav.riskRegister", icon: AlertTriangle },
  { kind: "link", href: "/scorecard", labelKey: "nav.scorecard", icon: Target },

  // ── Reports ──
  { kind: "separator", labelKey: "nav.section.reports" },
  { kind: "link", href: "/insurance", labelKey: "nav.insurance", icon: ShieldCheck },
  { kind: "link", href: "/board-report", labelKey: "nav.boardReport", icon: FileText },

  // ── Workspace ──
  { kind: "separator", labelKey: "nav.section.bottom" },
  { kind: "link", href: "/settings", labelKey: "nav.settings", icon: Settings },
  { kind: "link", href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [gate, setGate] = useState<NavGate>({
    deploymentMode: "observation",
    deploymentKind: "council",
  });

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (alive) {
          setGate({
            deploymentMode: r.deploymentMode,
            deploymentKind:
              (r as { deploymentKind?: "council" | "executive" })
                .deploymentKind ?? "council",
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Pick the IA based on deploymentKind, then apply per-entry gates
  // (e.g. Council's directive entry hides in observation mode).
  const source = gate.deploymentKind === "executive" ? EXECUTIVE_NAV : COUNCIL_NAV;
  const items = source.filter((entry) =>
    !entry.showWhen ? true : entry.showWhen(gate),
  );

  return (
    <aside className="w-[260px] shrink-0 flex flex-col border-e border-border bg-surface-2">
      <nav className="flex-1 p-3" aria-label={t("nav.eyebrow")}>
        <div className="eyebrow px-2 pt-2 pb-1">{t("nav.eyebrow")}</div>
        <ul className="flex flex-col gap-0.5 mt-1">
          {items.map((entry, idx) => {
            if (entry.kind === "separator") {
              return (
                <li
                  key={`sep-${idx}-${entry.labelKey}`}
                  className="px-2 pt-3 pb-1"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {t(entry.labelKey)}
                  </div>
                </li>
              );
            }
            const { href, labelKey, icon: Icon } = entry;
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-surface-3 text-ink-1 font-medium shadow-[inset_2px_0_0_var(--council-primary-strong)] rtl:shadow-[inset_-2px_0_0_var(--council-primary-strong)]"
                      : "text-ink-2 hover:text-ink-1 hover:bg-surface-3/60",
                  )}
                >
                  <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                  <span>{t(labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <DataSourcesPanel />
    </aside>
  );
}
