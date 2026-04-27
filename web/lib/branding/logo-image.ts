import "server-only";
import sharp from "sharp";

/**
 * Normalize an uploaded logo to a canonical PNG with alpha preserved.
 *
 * v2.5.8 — replaces the old `remove-bg.ts` module that ran U-2-Net via
 * onnxruntime-node to auto-strip backgrounds. That feature was removed
 * because:
 *   - The 4.6 MB ONNX model wasn't always shipped with the runtime
 *     image (depending on installer + Dockerfile state).
 *   - `onnxruntime-node`'s native binding flaked on cold-start across
 *     a few customer deployments — sometimes throwing "Failed to load
 *     dynamic library" with no actionable signal.
 *   - The mask quality was OK but routinely chipped away at real logo
 *     content (thin strokes, gradient edges) — operators were
 *     re-uploading anyway.
 *
 * Now the contract is simple: operators upload PNGs that already have
 * the alpha they want. We just round-trip through sharp to canonicalise
 * the format (sniff JPEG/WebP → re-encode as PNG with `compressionLevel
 * 9` for the smallest on-disk file).
 */
export async function normalizeLogo(inputBytes: Buffer): Promise<Buffer> {
  return sharp(inputBytes).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
}
