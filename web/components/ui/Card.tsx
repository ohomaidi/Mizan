import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    // Mobile padding shrinks from p-5 (20px) to p-4 (16px) so cards
    // don't crowd the 16-pixel page gutter on phones — a 32px
    // combined edge would leave roughly 60% of a 360px screen for
    // content, which is too tight for KPI tiles + headers.
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-2 p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    // flex-wrap on the header so a long subtitle + a wide `right`
    // slot (e.g. the legend swatches on the entity bar chart) stack
    // vertically on phones rather than getting clipped or causing
    // horizontal overflow.
    <div
      className={cn(
        "flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 flex-wrap",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-ink-1 text-base font-semibold leading-tight">
          {title}
        </div>
        {subtitle ? (
          <div className="text-ink-2 text-[12.5px] mt-1">{subtitle}</div>
        ) : null}
      </div>
      {right}
    </div>
  );
}
