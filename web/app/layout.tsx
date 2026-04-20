import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  const b = getBranding();
  return {
    title: `${b.nameEn} · Security Posture`,
    description: `${b.taglineEn} — posture, maturity, and incidents on Microsoft Graph.`,
  };
}

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
