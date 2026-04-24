import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  deleteCustomPolicy,
  getCustomPolicy,
  parseSpec,
  updateCustomPolicy,
} from "@/lib/directive/custom-policies/store";
import { CustomCaPolicySpecSchema } from "@/lib/directive/custom-policies/types";
import {
  buildCaBodyFromSpec,
  inferRiskTier,
} from "@/lib/directive/custom-policies/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  spec: CustomCaPolicySpecSchema.optional(),
  status: z.enum(["draft", "archived"]).optional(),
});

function toJson(row: ReturnType<typeof getCustomPolicy>) {
  if (!row) return null;
  let spec: ReturnType<typeof parseSpec> | null = null;
  try {
    spec = parseSpec(row);
  } catch {
    spec = null;
  }
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spec,
    riskTier: spec ? inferRiskTier(spec) : "low",
    previewBody: spec
      ? buildCaBodyFromSpec(spec, `mizan:custom:${row.id}:v1`)
      : null,
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const row = getCustomPolicy(Number(id));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(toJson(row));
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const updated = updateCustomPolicy(Number(id), {
    name: parsed.data.name,
    description:
      parsed.data.description === undefined ? undefined : parsed.data.description,
    spec: parsed.data.spec,
    status: parsed.data.status,
  });
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(toJson(updated));
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const ok = deleteCustomPolicy(Number(id));
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
