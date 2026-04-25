import "server-only";
import type { IntuneBaseline } from "./types";
import {
  intuneAndroidCompliance,
  intuneAndroidMam,
  intuneAsrCredentialTheft,
  intuneAsrExecutableContentEmail,
  intuneAsrJsVbsLaunchExe,
  intuneAsrOfficeChildProcesses,
  intuneAsrPsExecWmi,
  intuneAsrUntrustedUsb,
  intuneIosCompliance,
  intuneIosMam,
  intuneMacosCompliance,
  intuneWindowsBitLocker,
  intuneWindowsCompliance,
} from "./baselines";

/**
 * Phase 5 Intune baseline catalog. Ordered by the platform adoption ladder
 * a regulator typically walks — mobile first (where most risky usage
 * lives), then desktop.
 *
 * The three categories (compliance / MAM / device config) use different
 * Graph collections — see the `kind` field on each descriptor. The UI
 * renders them grouped by platform, not by category, because the
 * operator's mental model is "what posture on iOS, on Windows, etc."
 */

export const INTUNE_BASELINES: IntuneBaseline[] = [
  // Mobile — compliance + MAM together
  intuneIosCompliance,
  intuneIosMam,
  intuneAndroidCompliance,
  intuneAndroidMam,
  // Desktop — compliance + device config
  intuneWindowsCompliance,
  intuneWindowsBitLocker,
  intuneMacosCompliance,
  // Phase 14 — Defender for Endpoint Attack Surface Reduction (ASR)
  // rules. Each ships in audit mode by default; operator flips to Block
  // once they've reviewed audit telemetry. Six rules cover the highest-
  // value Microsoft-recommended set without producing too many false
  // positives in a typical Office 365 estate.
  intuneAsrOfficeChildProcesses,
  intuneAsrExecutableContentEmail,
  intuneAsrCredentialTheft,
  intuneAsrJsVbsLaunchExe,
  intuneAsrPsExecWmi,
  intuneAsrUntrustedUsb,
];

export function getIntuneBaseline(id: string): IntuneBaseline | null {
  return INTUNE_BASELINES.find((b) => b.descriptor.id === id) ?? null;
}
