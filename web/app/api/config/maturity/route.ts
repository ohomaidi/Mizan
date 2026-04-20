import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_MATURITY,
  getMaturityConfig,
  resetMaturityConfig,
  setMaturityConfig,
  type MaturityConfig,
} from "@/lib/config/maturity-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    config: getMaturityConfig(),
    defaults: DEFAULT_MATURITY,
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
    return NextResponse.json({ config: resetMaturityConfig() });
  }

  const parsed = body as Partial<MaturityConfig>;
  if (!parsed.weights || typeof parsed.target !== "number") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const saved = setMaturityConfig({
    weights: parsed.weights as MaturityConfig["weights"],
    target: parsed.target,
  });
  return NextResponse.json({ config: saved });
}
