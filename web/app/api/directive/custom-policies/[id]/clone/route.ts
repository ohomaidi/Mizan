import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  createCustomPolicy,
  getCustomPolicy,
  parseSpec,
} from "@/lib/directive/custom-policies/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/directive/custom-policies/{id}/clone — duplicate a draft so
 * the operator can branch without editing the original. Appends " (copy)"
 * to the name; everything else is bit-for-bit identical.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = getCustomPolicy(Number(id));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let spec;
  try {
    spec = parseSpec(row);
  } catch (e) {
    return NextResponse.json(
      { error: "spec_invalid", message: (e as Error).message.slice(0, 500) },
      { status: 409 },
    );
  }

  const newName = `${row.name} (copy)`;
  spec.name = newName;
  const newId = createCustomPolicy({
    name: newName,
    description: row.description,
    spec,
    ownerUserId: gate.user?.id ?? null,
  });
  return NextResponse.json({ id: newId }, { status: 201 });
}
