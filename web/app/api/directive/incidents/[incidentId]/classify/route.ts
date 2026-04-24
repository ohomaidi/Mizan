import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import { classifyIncident } from "@/lib/directive/graph-writes";

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
    status: z
      .enum(["active", "resolved", "inProgress", "redirected"])
      .optional(),
    assignedTo: z.string().email().optional(),
    customTags: z.array(z.string().min(1).max(64)).max(20).optional(),
  })
  .refine(
    (v) =>
      v.classification !== undefined ||
      v.determination !== undefined ||
      v.status !== undefined ||
      v.assignedTo !== undefined ||
      (v.customTags !== undefined && v.customTags.length > 0),
    { message: "at least one classification field required" },
  );

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
  const { tenantId, ...rest } = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId,
    actionType: "incident.classify",
    targetId: incidentId,
    input: rest,
    simulatedResult: { id: incidentId, ...rest },
    run: ({ tenant }) => classifyIncident(tenant, incidentId, rest),
  });

  return respondOutcome(outcome);
}
