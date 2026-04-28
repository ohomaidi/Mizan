"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { BrandingMark } from "./BrandingMark";
import { UserMenu } from "./UserMenu";
import { MobileDrawerTrigger } from "./MobileDrawer";
import { NotificationBell } from "./NotificationBell";

/**
 * Mobile top bar (v2.5.0).
 *
 * Compact 56px chrome — hamburger trigger on the start edge, branding
 * mark in the middle, language + theme + bell + user menu on the end.
 * The desktop topbar's URL pill and Sync-All button are intentionally
 * dropped — both are operator-grade controls that don't fit on a
 * phone screen and aren't part of the mobile use case (read posture +
 * drill into entities).
 *
 * The drawer trigger lives here so the topbar height can host both
 * the hamburger and the close-X (rendered inside the drawer, not on
 * the topbar) without competing for vertical real estate.
 *
 * Sync-All action is reachable via Settings → Council, where the
 * full sync controls live with audit + cadence config.
 */
export function MobileTopBar({
  onOpenDrawer,
}: {
  onOpenDrawer: () => void;
}) {
  const { t, branding } = useI18n();
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
    <header className="h-14 flex items-center gap-2 px-3 border-b border-border bg-surface-2/95 backdrop-blur safe-area-pt safe-area-pl safe-area-pr">
      <MobileDrawerTrigger onOpen={onOpenDrawer} />

      {/* Branding strip — short name only on mobile. The Arabic + English
          full names compete for too much real estate; the short tag plus
          the brand mark is the clearest "you're in <Council>'s app"
          signal at this width. */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
        <BrandingMark branding={branding} size={8} />
        <div className="text-[12px] font-semibold tracking-[0.10em] uppercase text-ink-1 truncate">
          {branding.shortEn}
        </div>
        {demoMode ? (
          <span className="text-[9px] uppercase tracking-[0.1em] text-accent border border-accent/40 rounded px-1.5 py-0.5 shrink-0">
            {t("topbar.demo")}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
