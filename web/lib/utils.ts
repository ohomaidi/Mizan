import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtPct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

export function fmtDelta(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
}

/**
 * Parse a timestamp as UTC, regardless of whether the input has an explicit
 * timezone marker.
 *
 * v2.5.21 fix: SQLite's `datetime('now')` returns strings like
 * `"2026-04-27 12:09:21"` — UTC by SQLite convention but with no `Z` suffix
 * and a space (not `T`) between date and time. JavaScript's Date constructor
 * treats space-separated strings without timezone offsets as **local time**,
 * not UTC. On a UAE browser (UTC+4) that's a 4-hour skew in every relative
 * timestamp. Normalise so JS parses as UTC.
 */
export function parseAsUtc(iso: string): Date {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
  const isoTs = iso.includes("T") ? iso : iso.replace(" ", "T");
  return new Date(`${isoTs}Z`);
}

export function fmtRelative(iso: string) {
  const delta = Date.now() - parseAsUtc(iso).getTime();
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
