"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SyncAllButton } from "./SyncAllButton";
import { BrandingMark } from "./BrandingMark";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";

function urlFromPath(pathname: string, host: string) {
  const clean = pathname === "/" ? "/maturity" : pathname;
  return `${host}${clean}`;
}

export function TopBar() {
  const pathname = usePathname();
  const { t, branding } = useI18n();
  const displayHost =
    typeof window !== "undefined" ? window.location.host : "dashboard";

  // v2.7.9 — the TopBar demoMode pill was a duplicate of the one
  // UserMenu already renders in demo mode (see UserMenu.tsx line ~55).
  // Removed here so demo deployments don't wear two badges. See also
  // MobileTopBar.tsx for the same removal.

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
        <SyncAllButton />
        <ThemeToggle />
        <LanguageToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
