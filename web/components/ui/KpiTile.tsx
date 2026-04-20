import type { ReactNode } from "react";
import { DeltaPill } from "./DeltaPill";

export function KpiTile({
  label,
  value,
  suffix,
  delta,
  deltaSuffix,
  invertDelta,
  accent,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  accent?: "default" | "council" | "warn" | "neg";
}) {
  const bar =
    accent === "council"
      ? "bg-council-strong"
      : accent === "warn"
        ? "bg-warn"
        : accent === "neg"
          ? "bg-neg"
          : "bg-border-strong";
  return (
    <div className="relative rounded-lg border border-border bg-surface-2 p-5 overflow-hidden">
      <span
        aria-hidden
        className={`absolute start-0 top-0 bottom-0 w-[3px] ${bar}`}
      />
      <div className="eyebrow">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[44px] leading-none font-semibold tabular text-ink-1">
          {value}
        </span>
        {suffix ? (
          <span className="text-xl text-ink-2 tabular">{suffix}</span>
        ) : null}
      </div>
      {delta !== undefined ? (
        <div className="mt-3">
          <DeltaPill value={delta} suffix={deltaSuffix} invert={invertDelta} />
        </div>
      ) : null}
    </div>
  );
}
