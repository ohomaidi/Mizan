import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const INTER_TTF = "assets/fonts/Inter-Regular.ttf";
const NOTO_KUFI_TTF = "assets/fonts/NotoKufiArabic-Regular.ttf";

let registered = false;

export function ensureFontsRegistered(): void {
  if (registered) return;
  const root = process.cwd();

  const interPath = path.join(root, INTER_TTF);
  const notoPath = path.join(root, NOTO_KUFI_TTF);

  if (!fs.existsSync(interPath)) {
    throw new Error(`Missing PDF font: ${interPath}`);
  }
  if (!fs.existsSync(notoPath)) {
    throw new Error(`Missing PDF font: ${notoPath}`);
  }

  // Inter carries Latin glyphs. Register it as a named family AND a fallback so Latin
  // characters embedded in Arabic paragraphs (e.g. "Microsoft 365") still render.
  // `fallback` is supported by @react-pdf at runtime even though it's not in the typing.
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
