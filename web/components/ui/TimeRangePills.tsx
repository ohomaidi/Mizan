"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export const RANGES = ["7D", "30D", "QTD", "YTD"] as const;
export type Range = (typeof RANGES)[number];

/**
 * Time-range selector used on the Maturity overview. Labels are i18n-backed so
 * "7D / 30D / QTD / YTD" translate in Arabic to "٧ أيام / ٣٠ يوم / منذ الربع /
 * منذ السنة". Works as either uncontrolled (internal state) or controlled
 * (via `value` + `onChange`).
 */
export function TimeRangePills({
  initial = "7D",
  value,
  onChange,
}: {
  initial?: Range;
  value?: Range;
  onChange?: (r: Range) => void;
}) {
  const { t } = useI18n();
  const [internal, setInternal] = useState<Range>(initial);
  const active = value ?? internal;

  const label = (r: Range): string =>
    r === "7D"
      ? t("time.range.7d")
      : r === "30D"
        ? t("time.range.30d")
        : r === "QTD"
          ? t("time.range.qtd")
          : t("time.range.ytd");

  return (
    <div
      role="tablist"
      aria-label={t("time.range.ariaLabel")}
      className="inline-flex items-center rounded-md border border-border bg-surface-1 p-0.5"
    >
      {RANGES.map((r) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (value === undefined) setInternal(r);
              onChange?.(r);
            }}
            className={cn(
              "h-7 px-3 text-[12px] font-semibold tabular rounded-[5px] transition-colors",
              isActive
                ? "bg-surface-3 text-ink-1"
                : "text-ink-2 hover:text-ink-1",
            )}
          >
            {label(r)}
          </button>
        );
      })}
    </div>
  );
}
