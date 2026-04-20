import { NextResponse, type NextRequest } from "next/server";
import { assertAzureConfigured, config } from "@/lib/config";
import { syncAllTenants } from "@/lib/sync/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Trigger a full sync across every consented tenant. */
export async function POST(req: NextRequest) {
  if (config.syncSecret) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (provided !== config.syncSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    assertAzureConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: "not_configured", message: (err as Error).message },
      { status: 412 },
    );
  }
  const results = await syncAllTenants();
  return NextResponse.json({ results });
}
