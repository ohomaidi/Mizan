import "server-only";
import type { Baseline } from "./types";
import { requireMfaForAdmins } from "./require-mfa-for-admins";
import { blockLegacyAuth } from "./block-legacy-auth";
import { requireCompliantDevice } from "./require-compliant-device";

/**
 * Phase 3 baseline catalog. Each entry is a Conditional Access policy the
 * Center can push to any directive-consent entity. New baselines land
 * here; the UI picks them up automatically.
 */

export const BASELINES: Baseline[] = [
  requireMfaForAdmins,
  blockLegacyAuth,
  requireCompliantDevice,
];

export function getBaseline(id: string): Baseline | null {
  return BASELINES.find((b) => b.descriptor.id === id) ?? null;
}
