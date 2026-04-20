import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

const KEY = "setup";

export type SetupState = {
  /** True once the first-run wizard has been completed (or the demo seed has fired). */
  completed: boolean;
  completedAt?: string;
};

export function getSetupState(): SetupState {
  return readConfig<SetupState>(KEY) ?? { completed: false };
}

export function markSetupCompleted(): void {
  writeConfig(KEY, { completed: true, completedAt: new Date().toISOString() });
}

/**
 * Writes `completed: true` only if no state exists yet. Called from the demo
 * seed so the Mac Mini skips the wizard — and idempotent so a re-seeded DB
 * doesn't regress if the operator has in the meantime run the wizard manually.
 */
export function markSetupCompletedIfAbsent(): void {
  if (!readConfig<SetupState>(KEY)) {
    writeConfig(KEY, { completed: true, completedAt: new Date().toISOString() });
  }
}
