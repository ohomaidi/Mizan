import "server-only";

/**
 * Defensive Arabic-text sanitizer for @react-pdf/textkit.
 *
 * @react-pdf (v4.5.x) has a bidi-reorder crash when an Arabic Tatweel (U+0640, ـ)
 * appears right before a whitespace or Latin character — e.g. "بـ Primary". The
 * Tatweel is a stylistic Arabic joining mark meant to stretch between two Arabic
 * letters; followed by non-Arabic content it produces a malformed shaping run
 * that textkit can't reorder, crashing with "Cannot read properties of undefined
 * (reading 'id')" in reorderLine.
 *
 * This helper strips any Tatweel that isn't safely sandwiched between two
 * Arabic letters. Stylistically-correct Tatweels inside Arabic words stay.
 *
 * Applied to Council-editable template strings at the getter layer so future
 * template edits can't reintroduce the crash without us noticing.
 */

const TATWEEL = /\u0640/g;
// True Arabic *letters* only — explicitly NOT digits (U+0660–0669 Arabic-Indic
// numerals) because BIDI class `AN` (Arabic Number) across a Tatweel run still
// trips the same reorderLine crash even though the codepoints are in the Arabic
// block. Covers Arabic Letter main block + Arabic Supplement letters.
const ARABIC_LETTER = /[\u0620-\u063F\u0641-\u064A\u0671-\u06D3\u06FA-\u06FC]/;

export function sanitizeArabic(input: string): string {
  if (!input || input.indexOf("\u0640") === -1) return input;
  return input.replace(TATWEEL, (_match, offset: number, full: string) => {
    const prev = full.charAt(offset - 1);
    const next = full.charAt(offset + 1);
    // Keep the Tatweel only if both neighbors are Arabic letters.
    if (ARABIC_LETTER.test(prev) && ARABIC_LETTER.test(next)) return "\u0640";
    return "";
  });
}

/** Walk any object's string leaves and apply the sanitizer. Non-strings pass through. */
export function sanitizeArabicDeep<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeArabic(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeArabicDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeArabicDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
