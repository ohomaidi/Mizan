import "server-only";
import { readConfig, writeConfig } from "@/lib/db/config-store";

export type SubScoreKey =
  | "secureScore"
  | "identity"
  | "device"
  | "data"
  | "threat"
  | "compliance";

export type MaturityConfig = {
  weights: Record<SubScoreKey, number>;
  target: number;
  updatedAt?: string;
};

export const DEFAULT_MATURITY: MaturityConfig = {
  weights: {
    secureScore: 0.25,
    identity: 0.2,
    device: 0.15,
    data: 0.15,
    threat: 0.15,
    compliance: 0.1,
  },
  target: 75,
};

const KEY = "maturity";

export function getMaturityConfig(): MaturityConfig {
  const stored = readConfig<MaturityConfig>(KEY);
  if (!stored) return DEFAULT_MATURITY;
  return {
    weights: { ...DEFAULT_MATURITY.weights, ...stored.weights },
    target: Number.isFinite(stored.target) ? stored.target : DEFAULT_MATURITY.target,
    updatedAt: stored.updatedAt,
  };
}

/**
 * Persist a new maturity config. Weights are normalized to sum to 1.0 so the math stays sane
 * even if the user's slider values don't add up exactly. Target is clamped to 0..100.
 */
export function setMaturityConfig(input: MaturityConfig): MaturityConfig {
  const clean: MaturityConfig = {
    weights: { ...DEFAULT_MATURITY.weights, ...input.weights },
    target: clamp(input.target, 0, 100),
    updatedAt: new Date().toISOString(),
  };
  const sum = Object.values(clean.weights).reduce(
    (a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0),
    0,
  );
  if (sum > 0) {
    for (const k of Object.keys(clean.weights) as SubScoreKey[]) {
      clean.weights[k] = Math.max(0, clean.weights[k]) / sum;
    }
  } else {
    clean.weights = { ...DEFAULT_MATURITY.weights };
  }
  writeConfig(KEY, clean);
  return clean;
}

export function resetMaturityConfig(): MaturityConfig {
  const v = { ...DEFAULT_MATURITY, updatedAt: new Date().toISOString() };
  writeConfig(KEY, v);
  return v;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
