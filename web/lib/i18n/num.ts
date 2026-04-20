"use client";

import { useCallback } from "react";
import { useI18n } from "./LocaleProvider";
import type { Locale } from "./dict";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Replace Latin digits with Arabic-Indic digits. Non-digit chars unchanged. */
export function toArDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_DIGITS.charAt(Number(d)));
}

/**
 * Format a number in the active locale.
 * - Uses `en-US` formatting rules (commas, period decimal) in both locales for consistency with
 *   the Microsoft / Graph-tooling context the Council operates in.
 * - In Arabic mode, digits are mapped to Arabic-Indic (٠١٢٣٤٥٦٧٨٩); separators stay Latin.
 */
export function fmtNum(
  n: number,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  const s = new Intl.NumberFormat("en-US", opts).format(n);
  return locale === "ar" ? toArDigits(s) : s;
}

/** Signed delta, e.g. "+4.2" / "-٢٫٣" with 1 decimal default. */
export function fmtDelta(n: number, locale: Locale, digits = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = fmtNum(Math.abs(n), locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${sign}${abs}`;
}

/** Hook returning a locale-bound `fmtNum`. */
export function useFmtNum() {
  const { locale } = useI18n();
  return useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => fmtNum(n, locale, opts),
    [locale],
  );
}

/** Hook returning a locale-bound signed-delta formatter. */
export function useFmtDelta() {
  const { locale } = useI18n();
  return useCallback(
    (n: number, digits?: number) => fmtDelta(n, locale, digits),
    [locale],
  );
}

/** Hook returning a function that localizes digits in an already-formatted string. */
export function useToLocaleDigits() {
  const { locale } = useI18n();
  return useCallback(
    (s: string) => (locale === "ar" ? toArDigits(s) : s),
    [locale],
  );
}
