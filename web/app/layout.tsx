import type { Metadata, Viewport } from "next";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { getBranding } from "@/lib/config/branding";
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
const themeBootstrapScript = `(function(){try{
  var stored = localStorage.getItem('scsc.theme');
  var theme = (stored === 'light' || stored === 'dark')
    ? stored
    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${arabic.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface-1 text-ink-1">
        <ThemeProvider>
          <LocaleProvider initialBranding={getBranding()}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
