"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DICT, LOCALES, type DictKey, type Locale } from "./dict";

/**
 * Branding fields exposed to every i18n consumer. The LocaleProvider fetches the
 * current branding config on mount and auto-injects these as interpolation
 * variables, so any dict string can reference `{orgName}` / `{orgShort}` /
 * `{tagline}` without the callsite having to pass them.
 *
 * Locale-correct variants: when the current locale is "ar", `{orgName}` resolves
 * to nameAr, etc. Both forms are always available under their explicit suffixed
 * names (`{orgNameEn}`, `{orgNameAr}`, …) for the rare case where a string needs
 * the other script inline (e.g. a bilingual PDF header).
 */
export type BrandingShape = {
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  taglineEn: string;
  taglineAr: string;
  accentColor?: string;
  accentColorStrong?: string;
};

const FALLBACK_BRANDING: BrandingShape = {
  nameEn: "Security Posture Dashboard",
  nameAr: "لوحة الأمن السيبراني",
  shortEn: "Posture",
  shortAr: "لوحة",
  taglineEn: "Unified security oversight across your government entities",
  taglineAr: "إشراف أمني موحّد عبر جهاتك الحكومية",
};

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
  branding: BrandingShape;
  t: (key: DictKey, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "scsc.locale";

function interpolate(s: string, params?: Record<string, string | number>) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

function brandingParams(b: BrandingShape, locale: Locale): Record<string, string> {
  const ar = locale === "ar";
  return {
    orgName: ar ? b.nameAr : b.nameEn,
    orgShort: ar ? b.shortAr : b.shortEn,
    tagline: ar ? b.taglineAr : b.taglineEn,
    orgNameEn: b.nameEn,
    orgNameAr: b.nameAr,
    orgShortEn: b.shortEn,
    orgShortAr: b.shortAr,
    taglineEn: b.taglineEn,
    taglineAr: b.taglineAr,
  };
}

export function LocaleProvider({
  children,
  initialBranding,
}: {
  children: React.ReactNode;
  /** Optional SSR-sourced branding to avoid a fallback flash. */
  initialBranding?: BrandingShape;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [branding, setBranding] = useState<BrandingShape>(
    initialBranding ?? FALLBACK_BRANDING,
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (LOCALES as readonly string[]).includes(stored)) {
        setLocaleState(stored as Locale);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", locale);
    html.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  }, [locale]);

  useEffect(() => {
    if (initialBranding) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/config/branding", { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as { branding?: Partial<BrandingShape> };
        if (alive && json.branding) {
          setBranding((prev) => ({ ...prev, ...json.branding! }));
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialBranding]);

  // Apply accent colors as CSS variable overrides on <html>. Overrides the
  // defaults in globals.css so theme switches still work (both dark + light
  // pull from the same overridden value).
  useEffect(() => {
    const { accentColor, accentColorStrong } = branding;
    if (!accentColor || !accentColorStrong) return;
    const root = document.documentElement;
    root.style.setProperty("--council-primary", accentColor);
    root.style.setProperty("--council-primary-strong", accentColorStrong);
  }, [branding]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: DictKey, params?: Record<string, string | number>) => {
      const raw = DICT[locale][key] ?? DICT.en[key] ?? key;
      return interpolate(raw, { ...brandingParams(branding, locale), ...params });
    },
    [locale, branding],
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      dir: locale === "ar" ? "rtl" : "ltr",
      branding,
      t,
    }),
    [locale, setLocale, branding, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const v = useContext(LocaleContext);
  if (!v) throw new Error("useI18n must be used within LocaleProvider");
  return v;
}
