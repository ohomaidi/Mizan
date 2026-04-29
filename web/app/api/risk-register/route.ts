import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createRisk,
  listRisks,
  type RiskStatus,
} from "@/lib/db/risk-register";
import { runAutoSuggestRules } from "@/lib/risk-register/auto-suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: RiskStatus[] = [
  "suggested",
  "open",
  "mitigated",
  "accepted",
  "dismissed",
];

const Schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  impact: z.number().int().min(1).max(5),
  likelihood: z.number().int().min(1).max(5),
  owner: z.string().trim().max(200).optional(),
  dueDate: z.string().trim().max(40).optional(),
  mitigationNotes: z.string().trim().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  // Run the auto-suggest engine on every list call. Cheap (it's a few
  // signal-snapshot reads + dedup checks) and ensures the suggestions
  // panel never goes stale even if the sync orchestrator hasn't fired
  // the engine recently.
  try {
    runAutoSuggestRules();
  } catch {
    /* tolerate — the list still serves whatever's persisted */
  }
  const status = (statusParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is RiskStatus => STATUSES.includes(s as RiskStatus));
  return NextResponse.json({
    risks: status.length > 0 ? listRisks({ status }) : listRisks(),
  });
}

export async function POST(req: NextRequest) {
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
  const created = createRisk(parsed.data);
  return NextResponse.json({ risk: created }, { status: 201 });
}
