import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import { commentOnIncident } from "@/lib/directive/graph-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tenantId: z.string().min(1),
  comment: z.string().min(1).max(4000),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ incidentId: string }> },
) {
  const gate = await gateDirectiveRoute("analyst");
  if (!gate.ok) return gate.response;

  const { incidentId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { tenantId, comment } = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId,
    actionType: "incident.comment",
    targetId: incidentId,
    input: { comment },
    simulatedResult: {
      comments: [{ comment, createdDateTime: new Date().toISOString() }],
    },
    run: ({ tenant }) => commentOnIncident(tenant, incidentId, comment),
  });

  return respondOutcome(outcome);
}
