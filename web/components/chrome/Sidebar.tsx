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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { api } from "@/lib/api/client";

type NavItem = {
  href: string;
  labelKey: DictKey;
  icon: typeof LayoutDashboard;
  /** If set, the nav item only renders when this predicate returns true. */
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
  // Directive-only. Absent from the sidebar on observation-mode deployments
  // (SCSC) so the existing experience is byte-for-byte unchanged there.
  {
    href: "/directive",
    labelKey: "nav.directive",
    icon: Gavel,
    showWhen: (s) => s.deploymentMode === "directive",
  },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
    "observation",
  );

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
    <aside className="w-[260px] shrink-0 flex flex-col border-e border-border bg-surface-2">
      <nav className="flex-1 p-3" aria-label={t("nav.eyebrow")}>
        <div className="eyebrow px-2 pt-2 pb-1">{t("nav.eyebrow")}</div>
        <ul className="flex flex-col gap-0.5 mt-1">
          {items.map(({ href, labelKey, icon: Icon }) => {
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
