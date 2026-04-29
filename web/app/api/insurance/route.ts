import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { listAnswers, upsertAnswer } from "@/lib/db/insurance";
import { AVIATION_QUESTIONNAIRE } from "@/lib/insurance/aviation";
import {
  evaluateAutoSignal,
  type AutoSignalKind,
} from "@/lib/insurance/auto-eval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/insurance — returns the current questionnaire template
 * (aviation-only in v2.6.0; v2.7 adds finance / healthcare / generic)
 * with each question pre-evaluated against the Mizan signals where
 * possible. The operator's manual answers (saved via POST) override
 * auto-evaluations.
 */
export async function GET() {
  const stored = listAnswers();
  const storedById = new Map(stored.map((a) => [a.question_id, a]));

  const enriched = AVIATION_QUESTIONNAIRE.questions.map((q) => {
    let auto: ReturnType<typeof evaluateAutoSignal> = null;
    if (q.autoFromSignal) {
      auto = evaluateAutoSignal(q.autoFromSignal as AutoSignalKind);
    }
    const persisted = storedById.get(q.id) ?? null;
    return {
      ...q,
      auto,
      persisted,
    };
  });

  // Aggregate stats — for the header KPIs.
  const total = enriched.length;
  const answered = enriched.filter(
    (q) => q.persisted || (q.auto && q.auto.value !== "na"),
  ).length;
  const yes = enriched.filter((q) => {
    const effective = q.persisted?.value ?? q.auto?.value ?? null;
    return effective === "yes";
  }).length;
  const no = enriched.filter((q) => {
    const effective = q.persisted?.value ?? q.auto?.value ?? null;
    return effective === "no";
  }).length;
  const completionPct = Math.round((answered / total) * 1000) / 10;

  return NextResponse.json({
    questionnaire: {
      id: AVIATION_QUESTIONNAIRE.id,
      version: AVIATION_QUESTIONNAIRE.version,
      source: AVIATION_QUESTIONNAIRE.source,
      questions: enriched,
    },
    summary: {
      total,
      answered,
      yes,
      no,
      completionPct,
    },
  });
}

const Schema = z.object({
  questionId: z.string().trim().min(1).max(120),
  value: z.enum(["yes", "no", "na"]),
  evidence: z.string().trim().max(2000).optional(),
  signalSnapshot: z.string().trim().max(2000).optional(),
  answeredBy: z.string().trim().max(200).optional(),
});

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
  const answer = upsertAnswer(parsed.data);
  return NextResponse.json({ answer });
}
