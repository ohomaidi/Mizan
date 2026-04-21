import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { startDeviceCode } from "@/lib/auth/msgraph-bootstrap";
import { putFlow, newFlowId, type FlowKind } from "@/lib/auth/provision-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick off a device-code flow for either the Graph-signals app or the
 * user-auth app. Returns the code + URL the operator reads off the wizard,
 * plus an opaque `flowId` the UI polls via /api/setup/provision/poll.
 *
 * The flow itself isn't admin-gated because it happens during the
 * bootstrap window (no users exist yet) — apiRequireRole() short-circuits
 * to `ok` in that state. Once a real admin user exists, callers without
 * the admin role get 401/403 automatically.
 */

const Schema = z.object({
  kind: z.enum(["graph", "user"]),
  tenant: z.string().trim().default("common"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { kind, tenant } = parsed.data;

  try {
    const start = await startDeviceCode(tenant);
    const id = newFlowId();
    putFlow({
      id,
      kind: kind as FlowKind,
      tenant,
      deviceCode: start.deviceCode,
      interval: start.interval,
      expiresAt: Date.now() + start.expiresIn * 1000,
      result: { kind: "pending" },
      createdAt: Date.now(),
    });
    return NextResponse.json({
      flowId: id,
      userCode: start.userCode,
      verificationUri: start.verificationUri,
      expiresIn: start.expiresIn,
      interval: start.interval,
      message: start.message,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "device_code_failed", message: (err as Error).message },
      { status: 502 },
    );
  }
}
