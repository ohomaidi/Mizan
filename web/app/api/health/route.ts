import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { isDirectiveDeployment } from "@/lib/config/deployment-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness + readiness probe for Azure Container Apps,
 * Mac LaunchAgents, and the Mizan deploy script's post-deploy curl.
 *
 * Returns 200 with a minimal status body when the database is reachable
 * and the deployment-mode env is consistent. Returns 503 when the DB
 * ping fails — Azure interprets that as "rolling revision not yet ready"
 * and won't shift traffic.
 *
 * Deliberately does not require auth: probes have no credentials, and
 * the response carries no sensitive data (mode + timestamp + a count of
 * tenants in the DB so monitoring can spot a wiped install).
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM tenants")
      .get() as { n: number };
    const directive = isDirectiveDeployment();
    return NextResponse.json({
      status: "ok",
      deploymentMode: directive ? "directive" : "observation",
      tenantCount: row.n,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: message.slice(0, 500),
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
