import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getTenant } from "@/lib/db/tenants";
import {
  listAuthStrengths,
  listNamedLocations,
  listTermsOfUse,
  searchGroups,
  searchUsers,
} from "@/lib/directive/custom-policies/ref-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/custom-policies/tenant-ref
 *   ?tenantId=<mizan-tenant-id>
 *   &kind=namedLocations|termsOfUse|authStrengths|users|groups
 *   &q=<typeahead query>  (only applies to users + groups)
 *
 * Reads tenant-local reference data for the wizard. Every callsite in
 * the wizard passes the currently-selected reference tenant; the
 * endpoint routes to the appropriate Graph read (or demo synthesis).
 * viewer role suffices — this is a read.
 */
export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q") ?? "";
  if (!tenantId || !kind) {
    return NextResponse.json(
      { error: "tenantId_and_kind_required" },
      { status: 400 },
    );
  }
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }
  if (tenant.consent_mode !== "directive") {
    return NextResponse.json(
      { error: "tenant_not_directive" },
      { status: 409 },
    );
  }

  try {
    switch (kind) {
      case "namedLocations":
        return NextResponse.json({
          items: await listNamedLocations(tenantId),
        });
      case "termsOfUse":
        return NextResponse.json({ items: await listTermsOfUse(tenantId) });
      case "authStrengths":
        return NextResponse.json({ items: await listAuthStrengths(tenantId) });
      case "users":
        return NextResponse.json({ items: await searchUsers(tenantId, q) });
      case "groups":
        return NextResponse.json({ items: await searchGroups(tenantId, q) });
      default:
        return NextResponse.json(
          { error: "invalid_kind" },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    return NextResponse.json(
      { error: "graph_read_failed", message: message.slice(0, 500) },
      { status: 502 },
    );
  }
}
