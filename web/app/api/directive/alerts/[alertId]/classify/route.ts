import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import { classifyAlert } from "@/lib/directive/graph-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z
  .object({
    tenantId: z.string().min(1),
    classification: z
      .enum(["truePositive", "falsePositive", "informationalExpectedActivity"])
      .optional(),
    determination: z
      .enum([
        "apt",
        "malware",
        "phishing",
        "compromisedAccount",
        "maliciousUserActivity",
        "unwantedSoftware",
        "insufficientInformation",
        "other",
      ])
      .optional(),
    status: z.enum(["new", "inProgress", "resolved"]).optional(),
    assignedTo: z.string().email().optional(),
  })
  .refine(
    (v) =>
      v.classification !== undefined ||
      v.determination !== undefined ||
      v.status !== undefined ||
      v.assignedTo !== undefined,
    { message: "at least one field required" },
  );

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ alertId: string }> },
) {
  const gate = await gateDirectiveRoute("analyst");
  if (!gate.ok) return gate.response;

  const { alertId } = await ctx.params;
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
  const { tenantId, ...rest } = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId,
    actionType: "alert.classify",
    targetId: alertId,
    input: rest,
    simulatedResult: { id: alertId, ...rest },
    run: ({ tenant }) => classifyAlert(tenant, alertId, rest),
  });

  return respondOutcome(outcome);
}
