import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pollDeviceToken } from "@/lib/auth/msgraph-bootstrap";
import {
  deleteFlow,
  getFlow,
  updateFlow,
} from "@/lib/auth/provision-store";
import {
  extractTenantFromToken,
  provisionGraphSignalsApp,
  provisionUserAuthApp,
} from "@/lib/auth/graph-app-provisioner";
import { resolveAppBaseUrl } from "@/lib/config/base-url";
import { getBranding } from "@/lib/config/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  flowId: z.string().min(1),
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
  const flow = getFlow(parsed.data.flowId);
  if (!flow) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }

  // Terminal states — just echo what we stashed on the previous tick.
  if (flow.result.kind !== "pending") {
    // Once the UI has seen a terminal state, drop the flow so a restart is
    // clean. A second poll returns 404.
    const final = flow.result;
    deleteFlow(flow.id);
    return NextResponse.json({
      status: final.kind,
      ...(final.kind === "success"
        ? { clientId: final.clientId, displayName: final.displayName }
        : {}),
      ...(final.kind === "error" ? { message: final.message } : {}),
    });
  }

  if (flow.expiresAt < Date.now()) {
    updateFlow(flow.id, {
      result: { kind: "error", message: "device code expired — please retry" },
    });
    return NextResponse.json({ status: "error", message: "expired" });
  }

  const result = await pollDeviceToken(flow.deviceCode, flow.tenant);
  if (result.kind === "pending" || result.kind === "slow_down") {
    return NextResponse.json({
      status: "pending",
      ...(result.kind === "slow_down" ? { interval: result.interval } : {}),
    });
  }
  if (result.kind === "declined") {
    updateFlow(flow.id, {
      result: { kind: "error", message: "sign-in declined by user" },
    });
    return NextResponse.json({ status: "error", message: "declined" });
  }
  if (result.kind === "expired") {
    updateFlow(flow.id, {
      result: { kind: "error", message: "code expired — please retry" },
    });
    return NextResponse.json({ status: "error", message: "expired" });
  }
  if (result.kind === "error") {
    updateFlow(flow.id, {
      result: { kind: "error", message: result.message },
    });
    return NextResponse.json({ status: "error", message: result.message });
  }

  // Success — we have an access token to the operator's tenant. Use it to
  // actually create the requested app. Any Graph failure here lands as an
  // error in the flow state and gets surfaced on the next poll.
  try {
    const dashboardBaseUrl = await resolveAppBaseUrl();
    const branding = getBranding();
    const tenantId =
      flow.tenant !== "common"
        ? flow.tenant
        : extractTenantFromToken(result.accessToken) ?? "common";

    let provisionResult: { clientId: string; displayName: string };
    if (flow.kind === "graph") {
      const p = await provisionGraphSignalsApp(result.accessToken, {
        displayName: `${branding.shortEn || "Mizan"} — Graph signals`,
        dashboardBaseUrl,
      });
      provisionResult = { clientId: p.clientId, displayName: p.displayName };
    } else {
      const p = await provisionUserAuthApp(result.accessToken, {
        displayName: `${branding.shortEn || "Mizan"} — User Auth`,
        dashboardBaseUrl,
        tenantId,
      });
      provisionResult = { clientId: p.clientId, displayName: p.displayName };
    }

    updateFlow(flow.id, {
      result: {
        kind: "success",
        clientId: provisionResult.clientId,
        displayName: provisionResult.displayName,
      },
    });
    return NextResponse.json({
      status: "success",
      clientId: provisionResult.clientId,
      displayName: provisionResult.displayName,
    });
  } catch (err) {
    const message = (err as Error).message;
    updateFlow(flow.id, { result: { kind: "error", message } });
    return NextResponse.json({ status: "error", message });
  }
}
