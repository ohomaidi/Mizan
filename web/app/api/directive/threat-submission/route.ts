import { type NextRequest } from "next/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  executeDirective,
  gateDirectiveRoute,
  respondOutcome,
} from "@/lib/directive/engine";
import {
  submitEmailThreat,
  submitFileThreat,
  submitUrlThreat,
} from "@/lib/directive/graph-writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Email = z.object({
  kind: z.literal("email"),
  tenantId: z.string().min(1),
  category: z.enum(["phishing", "malware", "spam", "notSpam"]),
  recipientEmailAddress: z.string().email(),
  messageUri: z.string().url(),
});
const Url = z.object({
  kind: z.literal("url"),
  tenantId: z.string().min(1),
  category: z.enum(["phishing", "malware", "spam", "notSpam"]),
  url: z.string().url(),
});
const File = z.object({
  kind: z.literal("file"),
  tenantId: z.string().min(1),
  category: z.enum(["malware", "notMalware"]),
  fileName: z.string().min(1).max(260),
  fileContent: z.string().min(1),
});
const Body = z.discriminatedUnion("kind", [Email, Url, File]);

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
  const data = parsed.data;

  const outcome = await executeDirective(gate, {
    tenantId: data.tenantId,
    actionType: `threat.submit.${data.kind}`,
    // Submission IDs are returned by Graph; we don't have one ahead of time.
    input: data,
    simulatedResult: { submissionId: `sim-${Date.now()}` },
    run: ({ tenant }) => {
      if (data.kind === "email") {
        return submitEmailThreat(tenant, {
          category: data.category,
          recipientEmailAddress: data.recipientEmailAddress,
          messageUri: data.messageUri,
        });
      }
      if (data.kind === "url") {
        return submitUrlThreat(tenant, {
          category: data.category,
          url: data.url,
        });
      }
      return submitFileThreat(tenant, {
        category: data.category,
        fileName: data.fileName,
        fileContent: data.fileContent,
      });
    },
  });

  return respondOutcome(outcome);
}
