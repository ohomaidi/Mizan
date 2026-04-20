import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_DISCOVERY,
  getDiscoveryTemplate,
  resetDiscoveryTemplate,
  setDiscoveryTemplate,
  type DiscoveryTemplate,
} from "@/lib/config/discovery-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    template: getDiscoveryTemplate(),
    defaults: DEFAULT_DISCOVERY,
  });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (
    body &&
    typeof body === "object" &&
    "reset" in body &&
    (body as { reset?: boolean }).reset === true
  ) {
    return NextResponse.json({ template: resetDiscoveryTemplate() });
  }
  const parsed = body as DiscoveryTemplate;
  if (!parsed || !Array.isArray(parsed.steps)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const saved = setDiscoveryTemplate(parsed);
  return NextResponse.json({ template: saved });
}
