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
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-2 p-5",
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
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div>
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
