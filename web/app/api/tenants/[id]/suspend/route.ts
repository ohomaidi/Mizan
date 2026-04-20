import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getTenant, setSuspended } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ suspended: z.boolean() });

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
  setSuspended(id, parsed.data.suspended);
  return NextResponse.json({ ok: true, suspended: parsed.data.suspended });
}
