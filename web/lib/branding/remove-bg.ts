import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
// Use the Tensor + InferenceSession types at compile time only — the runtime
// module is required lazily inside getSession() so the native binding doesn't
// initialize on cold start of unrelated routes.
import type { InferenceSession, Tensor } from "onnxruntime-node";

type Ort = {
  InferenceSession: {
    create(uri: string, opts?: unknown): Promise<InferenceSession>;
  };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => Tensor;
};

let ortRef: Ort | null = null;
function loadOrt(): Ort {
  if (!ortRef) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ortRef = require("onnxruntime-node") as Ort;
  }
  return ortRef;
}

/**
 * Background removal using U-2-Netp (the 4.7MB variant of U-2-Net).
 *
 * Runs locally — no network. Equivalent to what Python `rembg` does under the
 * hood: resize input → normalize → U-2-Net inference → mask → composite.
 * We bind to ONNX Runtime from Node instead of shelling out to Python so
 * installer packaging stays self-contained.
 *
 * The model bytes live at web/public/models/u2netp.onnx — large enough to
 * bundle into the installer, small enough (~5 MB) to ship without a separate
 * download step.
 */

const MODEL_PATH = path.resolve(process.cwd(), "public/models/u2netp.onnx");
const INPUT_SIZE = 320; // U-2-Net trained at 320×320

let _session: Promise<InferenceSession> | null = null;

async function getSession(): Promise<InferenceSession> {
  if (!_session) {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(
        `u2netp.onnx not found at ${MODEL_PATH}. Package the model with the installer or run scripts/fetch-model.mjs.`,
      );
    }
    const ort = loadOrt();
    _session = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
    });
  }
  return _session;
}

/**
 * Strip the background from an image. Returns PNG bytes with an alpha channel
 * where the foreground was detected.
 *
 * @param inputPng PNG/JPEG bytes from the user's upload.
 * @param options.featherRadius Smooth the mask edge by N px (default 2).
 */
export async function removeBackground(
  inputBytes: Buffer,
  options: { featherRadius?: number } = {},
): Promise<Buffer> {
  const featherRadius = options.featherRadius ?? 2;

  // Round-trip through PNG first. This normalizes whatever format the user
  // uploaded (PNG/JPEG/WebP) into a single canonical representation, and
  // avoids re-parsing the same bytes through sharp's format-sniffer on every
  // subsequent call — which flakes on some input PNG variants under Next's
  // Turbopack runtime with "Input buffer contains unsupported image format".
  const canonical = await sharp(inputBytes).png().toBuffer();

  // Normalize input → PNG with metadata so we know the final output size.
  const meta = await sharp(canonical).metadata();
  const outW = meta.width ?? INPUT_SIZE;
  const outH = meta.height ?? INPUT_SIZE;

  // Pre-process: resize to 320x320, normalize to ImageNet-ish stats the U-2-Net
  // training pipeline used. Sharp gives us raw RGB pixels we reshape into CHW.
  const resized = await sharp(canonical)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  // NCHW float32, normalized per channel.
  const floatData = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  const MEAN = [0.485, 0.456, 0.406];
  const STD = [0.229, 0.224, 0.225];
  const hw = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < hw; i++) {
    const r = resized[i * 3] / 255;
    const g = resized[i * 3 + 1] / 255;
    const b = resized[i * 3 + 2] / 255;
    floatData[i] = (r - MEAN[0]) / STD[0];
    floatData[hw + i] = (g - MEAN[1]) / STD[1];
    floatData[2 * hw + i] = (b - MEAN[2]) / STD[2];
  }

  const ort = loadOrt();
  const session = await getSession();
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const tensor = new ort.Tensor("float32", floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const results = await session.run({ [inputName]: tensor });
  const maskTensor = results[outputName];
  const maskData = maskTensor.data as Float32Array;

  // U-2-Net output is [1, 1, 320, 320]. Normalize to 0..255 and write into a
  // single-channel PNG sized 320×320, then resize up to the original image
  // using a fast bilinear filter.
  let maskMin = Infinity;
  let maskMax = -Infinity;
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] < maskMin) maskMin = maskData[i];
    if (maskData[i] > maskMax) maskMax = maskData[i];
  }
  const range = maskMax - maskMin || 1;
  const mask8 = Buffer.alloc(hw);
  for (let i = 0; i < hw; i++) {
    mask8[i] = Math.round(((maskData[i] - maskMin) / range) * 255);
  }

  // Resize + blur the 320×320 mask up to the original image size, then convert
  // back to raw single-channel bytes for compositing. We encode through PNG
  // between the resize and the raw-read — re-reading a raw-in / raw-out sharp
  // pipeline in one shot trips "unsupported image format" on some sharp builds.
  const maskPng = await sharp(mask8, {
    raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 1 },
  })
    .resize(outW, outH, { fit: "fill", kernel: "cubic" })
    .blur(featherRadius > 0 ? featherRadius : undefined)
    .png()
    .toBuffer();

  // Composite: take the original RGB and use the mask as the alpha channel.
  const rgb = await sharp(canonical)
    .resize(outW, outH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const maskRaw = await sharp(maskPng).raw().toBuffer();

  const rgba = Buffer.alloc(outW * outH * 4);
  for (let i = 0; i < outW * outH; i++) {
    rgba[i * 4] = rgb[i * 3];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = maskRaw[i];
  }

  return sharp(rgba, {
    raw: { width: outW, height: outH, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Pass-through: re-encode as PNG without bg removal, used when user opts to keep the original background. */
export async function normalizeLogo(inputBytes: Buffer): Promise<Buffer> {
  return sharp(inputBytes).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
}
