import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve an Entra tenant GUID from a verified domain via OIDC discovery:
//   https://login.microsoftonline.com/{domain}/.well-known/openid-configuration
//
// The issuer URL contains the tenant GUID. Used in step 1 of the onboarding wizard
// so the Council operator can paste a domain and we auto-fill the Tenant ID.
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  const authorityHost = config.azure.authorityHost.replace(/\/+$/, "");
  const url = `${authorityHost}/${encodeURIComponent(domain)}/.well-known/openid-configuration`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    return NextResponse.json(
      { error: "network", message: (err as Error).message },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "not_found", status: res.status },
      { status: 404 },
    );
  }

  let body: { issuer?: string };
  try {
    body = (await res.json()) as { issuer?: string };
  } catch {
    return NextResponse.json({ error: "invalid_response" }, { status: 502 });
  }

  // issuer looks like https://sts.windows.net/{guid}/ or https://login.microsoftonline.com/{guid}/v2.0
  const match = (body.issuer ?? "").match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  if (!match) {
    return NextResponse.json({ error: "no_tenant_id_in_issuer" }, { status: 502 });
  }

  return NextResponse.json({ tenantId: match[1].toLowerCase(), issuer: body.issuer });
}
