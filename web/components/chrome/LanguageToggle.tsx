"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("topbar.language")}
      className="inline-flex items-center h-8 rounded-md border border-border bg-surface-1 p-0.5 text-[11.5px] font-semibold"
    >
      {(["en", "ar"] as const).map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            aria-pressed={active}
            onClick={() => setLocale(l)}
            className={cn(
              "h-7 px-2.5 rounded-[5px] transition-colors tabular",
              active ? "bg-surface-3 text-ink-1" : "text-ink-2 hover:text-ink-1",
            )}
          >
            {l === "en" ? "EN" : "AR"}
          </button>
        );
      })}
    </div>
  );
}
