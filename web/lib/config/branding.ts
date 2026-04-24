import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

const KEY = "branding";

export type FrameworkId =
  | "nesa" // UAE NESA (Sharjah, other UAE federal entities)
  | "dubai-isr" // Dubai Information Security Regulation — DESC
  | "nca" // KSA NCA
  | "isr" // ISR / ISO 27001 generic
  | "generic";

export type BrandingConfig = {
  /** Full organization name, English. Used in PDF letterheads, page titles, TopBar. */
  nameEn: string;
  /** Full organization name, Arabic. */
  nameAr: string;
  /** Short form in English (e.g. "SCSC"). Used in compact places like badges, footers. */
  shortEn: string;
  /** Short form in Arabic. */
  shortAr: string;
  /** Tagline / subtitle, English. One line. Shown under the org name. */
  taglineEn: string;
  /** Tagline, Arabic. */
  taglineAr: string;
  /** Hex color used for primary accent (the current `--council-primary`). */
  accentColor: string;
  /** Hex color for the stronger accent variant (the current `--council-primary-strong`). */
  accentColorStrong: string;
  /** Relative path under DATA_DIR/branding/ for the uploaded logo. Null = use text-only header. */
  logoPath: string | null;
  /** If false, preserve the uploaded logo's original background; if true, we strip it on upload. */
  logoBgRemoved: boolean;
  /** Active maturity framework — drives the Governance page + PDF titles. */
  frameworkId: FrameworkId;
  updatedAt?: string;
};

/**
 * Generic defaults for a fresh, un-branded install. First-run wizard will overwrite these.
 * The demo seed path overrides with Sharjah Cybersecurity Council values — see seed.ts.
 */
export const DEFAULT_BRANDING: BrandingConfig = {
  nameEn: "Mizan",
  nameAr: "ميزان",
  shortEn: "Mizan",
  shortAr: "ميزان",
  taglineEn: "Security posture, measured.",
  taglineAr: "الوضع الأمني… مقيَّم.",
  accentColor: "#0d6b63",
  accentColorStrong: "#0d9488",
  logoPath: null,
  logoBgRemoved: true,
  frameworkId: "generic",
};

/**
 * Demo branding (Sharjah Cybersecurity Council) is written into `app_config`
 * at seed time — see `lib/db/seed.ts`. It's inlined there rather than exported
 * from here to avoid a module-import cycle.
 */

export function getBranding(): BrandingConfig {
  const stored = readConfig<Partial<BrandingConfig>>(KEY);
  if (!stored) return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...stored,
  };
}

export function setBranding(patch: Partial<BrandingConfig>): BrandingConfig {
  const existing = getBranding();
  const next: BrandingConfig = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeConfig(KEY, next);
  return next;
}

export function resetBranding(): BrandingConfig {
  writeConfig(KEY, { ...DEFAULT_BRANDING, updatedAt: new Date().toISOString() });
  return getBranding();
}
