"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SyncAllButton } from "./SyncAllButton";
import { BrandingMark } from "./BrandingMark";
import { UserMenu } from "./UserMenu";

function urlFromPath(pathname: string, host: string) {
  const clean = pathname === "/" ? "/maturity" : pathname;
  return `${host}${clean}`;
}

export function TopBar() {
  const pathname = usePathname();
  const { t, branding } = useI18n();
  const displayHost =
    typeof window !== "undefined" ? window.location.host : "dashboard";

  // The UserMenu already renders a "Demo mode" pill when MIZAN_DEMO_MODE=true.
  // The old top-bar "DEMO" pill was shown unconditionally — kept it only for
  // actual demo deployments, otherwise a production tenant would wear a
  // misleading demo badge.
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (alive) setDemoMode(r.demoMode);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="h-14 flex items-center gap-4 px-5 border-b border-border bg-surface-2/90 backdrop-blur">
      <div className="flex items-center gap-3 min-w-[280px]">
        <BrandingMark branding={branding} size={9} />
        <div className="leading-tight">
          <div className="text-[11.5px] text-ink-2" dir="rtl">
            {branding.nameAr}
          </div>
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-ink-1">
            {branding.nameEn}
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 px-3 h-8 rounded-md bg-surface-1 border border-border text-ink-2 text-[13px] tabular min-w-[360px] max-w-[560px] w-full keep-ltr">
          <span className="h-1.5 w-1.5 rounded-full bg-pos" aria-hidden />
          <span className="truncate">{urlFromPath(pathname, displayHost)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {demoMode ? (
          <span className="text-[10px] uppercase tracking-[0.1em] text-accent border border-accent/40 rounded px-2 py-0.5">
            {t("topbar.demo")}
          </span>
        ) : null}
        <SyncAllButton />
        <ThemeToggle />
        <LanguageToggle />
        <button
          aria-label={t("topbar.notifications")}
          className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface-3 text-ink-2 relative"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-neg" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
