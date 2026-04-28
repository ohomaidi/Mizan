import "server-only";
import type { Baseline } from "./types";
import { requireMfaForAdmins } from "./require-mfa-for-admins";
import { blockLegacyAuth } from "./block-legacy-auth";
import { requireCompliantDevice } from "./require-compliant-device";
import { requireMfaAllUsers } from "./require-mfa-all-users";
import { blockHighSignInRisk } from "./block-high-signin-risk";
import { requirePasswordChangeHighUserRisk } from "./require-password-change-high-user-risk";
import { phishingResistantMfaAdmins } from "./phishing-resistant-mfa-admins";
import { requireMfaGuests } from "./require-mfa-guests";
import { adminSignInFrequency4h } from "./admin-signin-frequency-4h";
import { adminNoPersistentBrowser } from "./admin-no-persistent-browser";
import { compliantDeviceAdminPortals } from "./compliant-device-admin-portals";
import { requireMfaAzureManagement } from "./require-mfa-azure-management";
import { prohibitAdminDeactivation } from "./prohibit-admin-deactivation";

/**
 * Phase 3 baseline catalog. Each entry is a Conditional Access policy the
 * Center can push to any directive-consent entity. New baselines land
 * here; the UI picks them up automatically.
 *
 * Order reflects the journey a tenant typically walks — identity hardening
 * first (admins → all users → guests), then risk-based enforcement, then
 * session-level + device-posture controls.
 */

export const BASELINES: Baseline[] = [
  // --- Identity hardening (who must MFA) ---
  requireMfaForAdmins,
  phishingResistantMfaAdmins,
  requireMfaAllUsers,
  requireMfaGuests,
  requireMfaAzureManagement,
  // --- Legacy surface reduction ---
  blockLegacyAuth,
  // --- Risk-based enforcement ---
  blockHighSignInRisk,
  requirePasswordChangeHighUserRisk,
  // --- Session hygiene for admins ---
  adminSignInFrequency4h,
  adminNoPersistentBrowser,
  // --- Device posture ---
  requireCompliantDevice,
  compliantDeviceAdminPortals,
  // --- Admin governance (v2.5.34) ---
  prohibitAdminDeactivation,
];

export function getBaseline(id: string): Baseline | null {
  return BASELINES.find((b) => b.descriptor.id === id) ?? null;
}
