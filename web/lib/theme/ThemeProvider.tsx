"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "scsc.theme";
const COOKIE_KEY = "mizan-theme";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

/** Read the initial theme consistently with the pre-hydration script in layout.tsx. */
function readInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  // Fall back to OS preference.
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

/**
 * v2.7.0 — accepts `initialTheme` from the server. The root layout
 * reads the `mizan-theme` cookie at request time and passes it
 * through, which means the server-rendered `<html data-theme>`
 * matches the user's choice on every navigation. Without this,
 * Next 16's RSC-on-navigation diff would re-apply
 * `data-theme="dark"` from the server tree, overwriting the user's
 * toggle every time they switched tabs.
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "dark");

  useEffect(() => {
    // After hydration, sync React state with whatever the inline script applied.
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") {
      setThemeState(attr);
      // Backfill the cookie for users who only have localStorage from
      // pre-v2.7.0 sessions, so server-side renders pick up their
      // preference on the next navigation.
      try {
        if (!document.cookie.includes(`${COOKIE_KEY}=`)) {
          document.cookie =
            `${COOKIE_KEY}=${attr}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        }
      } catch {}
    } else {
      const initial = readInitial();
      setThemeState(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    // Mirror to a cookie so server components render with the right
    // `<html data-theme>` on the next navigation. Without this the
    // server tree always says "dark" and Next would diff that back
    // onto the document on every Link click. v2.7.0.
    try {
      document.cookie =
        `${COOKIE_KEY}=${t}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {}
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<Ctx>(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
