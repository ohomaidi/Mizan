import type { Metadata, Viewport } from "next";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ThemeProvider, type Theme } from "@/lib/theme/ThemeProvider";
import { getBranding } from "@/lib/config/branding";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const arabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Force dynamic at the root so the DB-backed branding (via getBranding) is
// re-read on every request. Without this, Next statically prerenders pages
// like /login at build time and ships whatever branding was in the DB back
// then — which leaks old customer names into fresh installs.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const b = getBranding();
  return {
    title: `${b.nameEn} · Security Posture`,
    description: `${b.taglineEn} — posture, maturity, and incidents on Microsoft Graph.`,
  };
}

/**
 * Viewport configuration. `viewport-fit=cover` lets the layout extend
 * under iOS notches + home-indicator areas, paired with safe-area
 * padding on the topbar / sidebar / main content (see globals.css).
 *
 * `themeColor` keys both light + dark schemes so iOS Safari picks the
 * correct chrome color in either mode without a flash.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

// Runs before any React code — applies the persisted theme (or OS preference)
// to the <html data-theme> attribute so the first paint is correct.
//
// v2.7.0 — cookie wins over localStorage. The cookie is also what
// the server uses to render `<html data-theme>`, so picking the
// cookie here keeps SSR + first-paint + ThemeProvider in lockstep.
// Falls back to legacy localStorage for users who haven't toggled
// since the cookie was added; backfilled by ThemeProvider on next
// mount.
const themeBootstrapScript = `(function(){try{
  var m = (document.cookie || '').match(/(?:^|;\\s*)mizan-theme=(light|dark)/);
  var stored = m ? m[1] : localStorage.getItem('scsc.theme');
  var theme = (stored === 'light' || stored === 'dark')
    ? stored
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // v2.7.0 — read theme + locale from cookies so the server-rendered
  // `<html>` element matches the user's persisted choices. Without
  // this, Next 16's RSC-on-navigation diff overwrites whatever the
  // user toggled (every tab switch flipped to dark mode and to en/
  // ltr because the static `data-theme="dark"` / `lang="en"` /
  // `dir="ltr"` attributes were re-applied from the server tree).
  const cookieJar = await cookies();
  const themeCookie = cookieJar.get("mizan-theme")?.value;
  const initialTheme: Theme =
    themeCookie === "light" || themeCookie === "dark"
      ? (themeCookie as Theme)
      : "dark";
  const localeCookie = cookieJar.get("mizan-locale")?.value;
  const initialLocale: Locale =
    localeCookie && (LOCALES as readonly string[]).includes(localeCookie)
      ? (localeCookie as Locale)
      : "en";
  const dir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={initialLocale}
      dir={dir}
      data-theme={initialTheme}
      suppressHydrationWarning
      className={`${inter.variable} ${arabic.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface-1 text-ink-1">
        <ThemeProvider initialTheme={initialTheme}>
          <LocaleProvider initialBranding={getBranding()}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
