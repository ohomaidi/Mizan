import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const INTER_REL = "assets/fonts/Inter-Regular.ttf";
const NOTO_KUFI_REL = "assets/fonts/NotoKufiArabic-Regular.ttf";

let registered = false;

/**
 * Resolve a font's absolute path by trying a few common bases in order.
 *
 * `process.cwd()` is the canonical case — `next start` runs from the
 * project root in dev, and the Dockerfile sets `WORKDIR /app` and copies
 * `assets/` to `/app/assets/`. Both land here.
 *
 * The fallbacks cover edge cases we've hit in the wild:
 *   - Some hosts (older ACA workload profiles) start the process in a
 *     symlinked path where `process.cwd()` resolves to something other
 *     than where the assets live.
 *   - When this module is loaded inside a Next chunk, `__dirname` may
 *     resolve under `.next/server/...` — walking up to find `assets/`
 *     covers that.
 *   - `MIZAN_ASSETS_DIR` is an explicit override, in case an operator
 *     mounts the fonts elsewhere on a custom image.
 *
 * Returns null when nothing matched — caller throws with all attempted
 * paths so debugging the missing-font case in production is one log
 * line, not a guess.
 */
function resolveFont(rel: string): string | null {
  const tried: string[] = [];

  const envOverride = process.env.MIZAN_ASSETS_DIR?.trim();
  if (envOverride) {
    const p = path.join(envOverride, rel.replace(/^assets\//, ""));
    tried.push(p);
    if (fs.existsSync(p)) return p;
  }

  const cwdPath = path.resolve(process.cwd(), rel);
  tried.push(cwdPath);
  if (fs.existsSync(cwdPath)) return cwdPath;

  // Walk up from this module's directory looking for an `assets/` sibling.
  // Handles the case where the module is loaded out of a Next bundle
  // chunk that lives multiple levels deep under `.next/`.
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, rel);
    tried.push(candidate);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Last attempt: common production layouts. Some of our docs reference
  // /app, others might be deployed under /home/site/wwwroot (Azure App
  // Service legacy). Cheap to check; fast to fail.
  for (const base of ["/app", "/home/site/wwwroot"]) {
    const p = path.join(base, rel);
    tried.push(p);
    if (fs.existsSync(p)) return p;
  }

  // Stash the attempts for the error message.
  (resolveFont as unknown as { lastAttempts?: string[] }).lastAttempts = tried;
  return null;
}

export function ensureFontsRegistered(): void {
  if (registered) return;

  const interPath = resolveFont(INTER_REL);
  if (!interPath) {
    const tried =
      (resolveFont as unknown as { lastAttempts?: string[] }).lastAttempts ?? [];
    throw new Error(
      `PDF render failed: Inter-Regular.ttf not found.\n` +
        `cwd: ${process.cwd()}\n` +
        `Tried:\n  - ${tried.join("\n  - ")}\n` +
        `Fix: ensure assets/fonts/ is copied to the runtime image (Dockerfile) ` +
        `or set MIZAN_ASSETS_DIR to the directory that contains it.`,
    );
  }

  const notoPath = resolveFont(NOTO_KUFI_REL);
  if (!notoPath) {
    const tried =
      (resolveFont as unknown as { lastAttempts?: string[] }).lastAttempts ?? [];
    throw new Error(
      `PDF render failed: NotoKufiArabic-Regular.ttf not found.\n` +
        `cwd: ${process.cwd()}\n` +
        `Tried:\n  - ${tried.join("\n  - ")}\n` +
        `Fix: ensure assets/fonts/ is copied to the runtime image (Dockerfile) ` +
        `or set MIZAN_ASSETS_DIR to the directory that contains it.`,
    );
  }

  // Inter carries Latin glyphs. Register it as a named family AND a
  // fallback so Latin characters embedded in Arabic paragraphs (e.g.
  // "Microsoft 365") still render. `fallback` is supported by @react-pdf
  // at runtime even though it's not in the typing.
  Font.register({ family: "Inter", src: interPath });
  Font.register({
    family: "Fallback",
    src: interPath,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fallback: true,
  } as any);

  // Noto Kufi Arabic for Arabic script.
  Font.register({ family: "NotoKufiArabic", src: notoPath });

  // Disable auto-hyphenation so URLs and identifiers don't get broken up.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
