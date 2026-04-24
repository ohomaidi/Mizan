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
  extractUserFromToken,
  provisionGraphSignalsApp,
  provisionUserAuthApp,
} from "@/lib/auth/graph-app-provisioner";
import { resolveAppBaseUrl } from "@/lib/config/base-url";
import { getBranding } from "@/lib/config/branding";
import { getDeploymentMode } from "@/lib/config/deployment-mode";
import { countAdmins, upsertUser } from "@/lib/db/users";
import { openSession, writeSessionCookie } from "@/lib/auth/session";

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
      // Pick the scope set to stamp on the new app by the DB-stored
      // deployment mode. The /setup wizard wrote it to app_config on Step 1,
      // before this Graph-app step ran. Falls back to env var, then
      // observation.
      const p = await provisionGraphSignalsApp(result.accessToken, {
        displayName: `${branding.shortEn || "Mizan"} — Graph signals`,
        dashboardBaseUrl,
        deploymentMode: getDeploymentMode(),
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

    // Carry the operator's Microsoft identity straight into a Mizan session.
    // They just signed in with a device code — there's no need to make them
    // do a second OIDC round-trip on Step 5 (which needs the freshly-created
    // app to have admin consent, match its redirect URI exactly, accept the
    // authority, clear any MFA policy...). Here we already have a proven
    // oid/tid/email/name from a real Microsoft authentication — skip straight
    // to openSession and let Step 5 become a click-Finish screen.
    let autoLoggedIn = false;
    if (countAdmins() === 0) {
      const ident = extractUserFromToken(result.accessToken);
      if (ident) {
        const user = upsertUser({
          entra_oid: ident.oid,
          tenant_id: ident.tenantId,
          email: ident.email,
          display_name: ident.displayName,
          role: "admin",
        });
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const ua = req.headers.get("user-agent") ?? null;
        const session = await openSession(user.id, ip, ua);
        await writeSessionCookie(session.id, session.expires_at);
        autoLoggedIn = true;
      }
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
      autoLoggedIn,
    });
  } catch (err) {
    const message = (err as Error).message;
    updateFlow(flow.id, { result: { kind: "error", message } });
    return NextResponse.json({ status: "error", message });
  }
}
