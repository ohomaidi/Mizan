"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  return (
    <button
      aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      onClick={toggle}
      className="h-8 w-8 grid place-items-center rounded-md hover:bg-surface-3 text-ink-2 transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
