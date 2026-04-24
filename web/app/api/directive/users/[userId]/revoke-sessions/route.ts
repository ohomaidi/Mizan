import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import { revokeSignInSessions } from "@/lib/directive/graph-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tenantId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const gate = await gateDirectiveRoute("analyst");
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
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
  const { tenantId } = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId,
    actionType: "user.revoke_sessions",
    targetId: userId,
    input: { userId },
    simulatedResult: { value: true },
    run: ({ tenant }) => revokeSignInSessions(tenant, userId),
  });

  return respondOutcome(outcome);
}
