"use client";

import type { Health } from "@/lib/data/entities";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const COLOR: Record<Health, string> = {
  green: "bg-pos",
  amber: "bg-warn",
  red: "bg-neg",
};

const LABEL_KEY: Record<Health, "health.green" | "health.amber" | "health.red"> = {
  green: "health.green",
  amber: "health.amber",
  red: "health.red",
};

export function HealthDot({
  status,
  showLabel = false,
  className,
}: {
  status: Health;
  showLabel?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t(LABEL_KEY[status]);
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={label}
    >
      <span className={cn("h-2 w-2 rounded-full", COLOR[status])} aria-hidden />
      {showLabel ? <span className="text-[12px] text-ink-2">{label}</span> : null}
    </span>
  );
}
