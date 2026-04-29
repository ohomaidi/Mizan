import "server-only";
import { cookies } from "next/headers";
import { DICT, type DictKey, type Locale, LOCALES } from "./dict";

/**
 * Server-side translation helper.
 *
 * Mirrors the `t()` function exposed by the client `LocaleProvider`
 * but resolves the active locale from the `mizan-locale` cookie set
 * by that same provider when the user toggles language. Falls back
 * to English when the cookie is missing or holds an unknown value.
 *
 * Usage in a server component:
 *
 *   import { getTranslator } from "@/lib/i18n/dict.server";
 *
 *   export default async function Page() {
 *     const t = await getTranslator();
 *     return <h1>{t("today.title")}</h1>;
 *   }
 *
 * Or for code paths outside a request scope (cron, scripts):
 *
 *   import { translateEn } from "@/lib/i18n/dict.server";
 *   translateEn("today.title");
 *
 * v2.6.1.
 */

const STORAGE_COOKIE = "mizan-locale";

function interpolate(
  s: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export type ServerTranslator = (
  key: DictKey,
  params?: Record<string, string | number>,
) => string;

/**
 * Resolve the active locale from the request cookie and return a
 * bound translator. Cheap to await — cookies() is request-scoped.
 */
export async function getTranslator(): Promise<ServerTranslator> {
  let locale: Locale = "en";
  try {
    const c = await cookies();
    const v = c.get(STORAGE_COOKIE)?.value;
    if (isLocale(v)) locale = v;
  } catch {
    // cookies() throws outside a request scope — e.g. during static
    // generation. Stick with English.
  }
  return (key, params) => {
    const raw = DICT[locale][key] ?? DICT.en[key] ?? (key as unknown as string);
    return interpolate(raw, params);
  };
}

/**
 * English-only synchronous translate for code paths that run
 * outside a request scope. Useful for module-level constants where
 * a string interpolation is needed before render.
 */
export function translateEn(
  key: DictKey,
  params?: Record<string, string | number>,
): string {
  const raw = DICT.en[key] ?? (key as unknown as string);
  return interpolate(raw, params);
}
