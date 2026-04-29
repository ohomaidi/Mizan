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
 * Council mode (current default) shows the multi-tenant chrome: a flat
 * list of entity-aware pages plus directive surfaces.
 *
 * Executive mode (v2.6.0) reframes the dashboard for a single-org CISO:
 * "Maturity" → "Posture overview", "Governance" → "Compliance",
 * Entities link is hidden, and three new modules unlock — Risk register,
 * Cyber insurance readiness, Board report — each grouped under a
 * section heading so the sidebar reads as a CISO workspace, not a
 * federation tool.
 *
 * Each entry can opt out of one mode via `showWhen` so a single table
 * drives both kinds without duplicating the list.
 */
const NAV: NavEntry[] = [
  // Top of the sidebar — common to both kinds, just labelled differently.
  {
    kind: "link",
    href: "/maturity",
    labelKey: "nav.maturity", // dict swaps to "Posture overview" in Executive — done at lookup time
    icon: LayoutDashboard,
  },
  // Council-only: list of consented entities.
  {
    kind: "link",
    href: "/entities",
    labelKey: "nav.entities",
    icon: Building2,
    showWhen: (s) => s.deploymentKind === "council",
  },
  // Per-domain operational surfaces. Order in Executive bumps Identity
  // higher because admin governance is the loudest CISO concern.
  { kind: "link", href: "/identity", labelKey: "nav.identity", icon: UserCog },
  {
    kind: "link",
    href: "/devices",
    labelKey: "nav.devices",
    icon: MonitorSmartphone,
  },
  { kind: "link", href: "/data", labelKey: "nav.data", icon: Files },
  {
    kind: "link",
    href: "/threats",
    labelKey: "nav.threats",
    icon: ShieldAlert,
  },
  {
    kind: "link",
    href: "/governance",
    labelKey: "nav.governance",
    icon: Scale,
  },
  {
    kind: "link",
    href: "/vulnerabilities",
    labelKey: "nav.vulnerabilities",
    icon: Bug,
  },
  // Directive-only across both kinds. Council = push to entities;
  // Executive = push to self.
  {
    kind: "link",
    href: "/directive",
    labelKey: "nav.directive",
    icon: Gavel,
    showWhen: (s) => s.deploymentMode === "directive",
  },
  // ── Risk management section (Executive only) ──
  {
    kind: "separator",
    labelKey: "nav.section.riskMgmt",
    showWhen: (s) => s.deploymentKind === "executive",
  },
  {
    kind: "link",
    href: "/risk-register",
    labelKey: "nav.riskRegister",
    icon: AlertTriangle,
    showWhen: (s) => s.deploymentKind === "executive",
  },
  {
    kind: "link",
    href: "/insurance",
    labelKey: "nav.insurance",
    icon: ShieldCheck,
    showWhen: (s) => s.deploymentKind === "executive",
  },
  // ── Reports section (Executive only) ──
  {
    kind: "separator",
    labelKey: "nav.section.reports",
    showWhen: (s) => s.deploymentKind === "executive",
  },
  {
    kind: "link",
    href: "/board-report",
    labelKey: "nav.boardReport",
    icon: FileText,
    showWhen: (s) => s.deploymentKind === "executive",
  },
  {
    kind: "link",
    href: "/scorecard",
    labelKey: "nav.scorecard",
    icon: Target,
    showWhen: (s) => s.deploymentKind === "executive",
  },
  // Bottom — common.
  {
    kind: "link",
    href: "/settings",
    labelKey: "nav.settings",
    icon: Settings,
  },
  { kind: "link", href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

/**
 * For nav labels that read differently per kind (e.g. "Maturity"
 * → "Posture overview" on Executive; "Governance" → "Compliance"),
 * resolve the right dict key at render time. Keeps the NAV table
 * single-source.
 */
function resolveLabelKey(
  base: DictKey,
  kind: "council" | "executive",
): DictKey {
  if (kind !== "executive") return base;
  if (base === "nav.maturity") return "nav.posture";
  if (base === "nav.governance") return "nav.compliance";
  return base;
}

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

  const items = NAV.filter((entry) =>
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
            const resolved = resolveLabelKey(labelKey, gate.deploymentKind);
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
                  <span>{t(resolved)}</span>
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
