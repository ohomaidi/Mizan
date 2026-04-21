import "server-only";
import crypto from "node:crypto";

/**
 * In-memory store for active device-code provisioning flows.
 *
 * A flow is short-lived (10–15 min max, bounded by Microsoft's device code
 * expiry). If the container restarts mid-flow, the operator just starts
 * over — acceptable for a one-time setup.
 *
 * Not durable. Not shared across ACA replicas. Fine because Mizan runs as a
 * single replica during the setup window, and real multi-replica scale only
 * kicks in after setup completes.
 */

export type FlowKind = "graph" | "user";

export type FlowState = {
  id: string;
  kind: FlowKind;
  tenant: string; // "common" | specific tenant GUID
  deviceCode: string;
  /** Seconds to wait between polls per Microsoft's response. */
  interval: number;
  /** Unix ms expiry derived from Microsoft's `expires_in`. */
  expiresAt: number;
  /** Once the flow has terminated we hold the result here until the UI reads it. */
  result:
    | { kind: "pending" }
    | { kind: "success"; clientId: string; displayName: string }
    | { kind: "error"; message: string };
  createdAt: number;
};

const store = new Map<string, FlowState>();

export function newFlowId(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function putFlow(f: FlowState): void {
  store.set(f.id, f);
  // Prune any stale flows so the map doesn't grow forever.
  for (const [id, v] of store.entries()) {
    if (v.expiresAt < Date.now() - 60_000) store.delete(id);
  }
}

export function getFlow(id: string): FlowState | null {
  return store.get(id) ?? null;
}

export function updateFlow(id: string, patch: Partial<FlowState>): void {
  const f = store.get(id);
  if (!f) return;
  store.set(id, { ...f, ...patch });
}

export function deleteFlow(id: string): void {
  store.delete(id);
}
