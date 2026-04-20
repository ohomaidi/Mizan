import "server-only";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";

/**
 * Logo storage lives under DATA_DIR/branding/ so it persists across app
 * restarts and ships out of the container volume with the rest of the data.
 * We always normalize uploads to PNG (8-bit RGBA) so downstream consumers
 * (dashboard <img>, @react-pdf) can treat it uniformly.
 */

const FILENAME = "logo.png";

function brandingDir(): string {
  return path.join(config.dataDir, "branding");
}

export function logoPath(): string {
  return path.join(brandingDir(), FILENAME);
}

export function ensureBrandingDir(): void {
  fs.mkdirSync(brandingDir(), { recursive: true });
}

export function logoExists(): boolean {
  try {
    return fs.statSync(logoPath()).isFile();
  } catch {
    return false;
  }
}

export function readLogoBytes(): Buffer | null {
  try {
    return fs.readFileSync(logoPath());
  } catch {
    return null;
  }
}

export function writeLogo(bytes: Buffer): void {
  ensureBrandingDir();
  fs.writeFileSync(logoPath(), bytes);
}

export function deleteLogo(): void {
  try {
    fs.unlinkSync(logoPath());
  } catch {
    /* ignore — already gone */
  }
}

/**
 * Returns a data URI for server-side rendering (e.g. @react-pdf <Image>),
 * or null if no logo has been uploaded.
 */
export function readLogoDataUri(): string | null {
  const bytes = readLogoBytes();
  if (!bytes) return null;
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
