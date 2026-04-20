"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFmtNum } from "@/lib/i18n/num";

export function DeltaPill({
  value,
  digits = 1,
  suffix,
  invert = false,
}: {
  value: number;
  digits?: number;
  suffix?: string;
  /** When true, negative deltas are positive (e.g. "Below target" count going down is good). */
  invert?: boolean;
}) {
  const fmt = useFmtNum();
  const good = invert ? value <= 0 : value >= 0;
  const neutral = value === 0;
  const color = neutral
    ? "text-ink-3 bg-surface-3"
    : good
      ? "text-pos bg-pos/10"
      : "text-neg bg-neg/10";
  const Icon = neutral ? Minus : value > 0 ? ArrowUp : ArrowDown;
  const magnitude = fmt(Math.abs(value), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular leading-none",
        color,
      )}
    >
      <Icon size={11} strokeWidth={2.5} />
      {magnitude}
      {suffix ? <span className="text-[10px] opacity-80">{suffix}</span> : null}
    </span>
  );
}
