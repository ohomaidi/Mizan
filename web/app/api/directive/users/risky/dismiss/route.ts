import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import { dismissRiskyUsers } from "@/lib/directive/graph-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  tenantId: z.string().min(1),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const gate = await gateDirectiveRoute("analyst");
  if (!gate.ok) return gate.response;

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
  const { tenantId, userIds } = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId,
    actionType: "user.dismiss_risk",
    targetId: userIds[0],
    input: { userIds },
    simulatedResult: { dismissedCount: userIds.length },
    run: ({ tenant }) => dismissRiskyUsers(tenant, userIds),
  });

  return respondOutcome(outcome);
}
