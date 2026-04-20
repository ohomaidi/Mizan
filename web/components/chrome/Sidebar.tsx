"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataSourcesPanel } from "./DataSourcesPanel";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";

const NAV: { href: string; labelKey: DictKey; icon: typeof LayoutDashboard }[] = [
  { href: "/maturity", labelKey: "nav.maturity", icon: LayoutDashboard },
  { href: "/entities", labelKey: "nav.entities", icon: Building2 },
  { href: "/identity", labelKey: "nav.identity", icon: UserCog },
  { href: "/threats", labelKey: "nav.threats", icon: ShieldAlert },
  { href: "/data", labelKey: "nav.data", icon: Files },
  { href: "/devices", labelKey: "nav.devices", icon: MonitorSmartphone },
  { href: "/governance", labelKey: "nav.governance", icon: Scale },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/faq", labelKey: "nav.faq", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className="w-[260px] shrink-0 flex flex-col border-e border-border bg-surface-2">
      <nav className="flex-1 p-3">
        <div className="eyebrow px-2 pt-2 pb-1">{t("nav.eyebrow")}</div>
        <ul className="flex flex-col gap-0.5 mt-1">
          {NAV.map(({ href, labelKey, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-surface-3 text-ink-1 font-medium shadow-[inset_2px_0_0_var(--council-primary-strong)] rtl:shadow-[inset_-2px_0_0_var(--council-primary-strong)]"
                      : "text-ink-2 hover:text-ink-1 hover:bg-surface-3/60",
                  )}
                >
                  <Icon size={15} strokeWidth={1.9} />
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
