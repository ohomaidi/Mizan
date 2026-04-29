import "server-only";
import { getDb } from "./client";

/**
 * Cyber-insurance questionnaire answers. v2.6.0 — table is per-question
 * (single row per `question_id`); answers are upserted on save. The
 * questionnaire template itself lives in `lib/insurance/aviation.ts`
 * (and future industry files) — this table just stores the operator's
 * answers + the auto-captured signal evidence at answer time.
 */

export type InsuranceAnswer = {
  question_id: string;
  value: "yes" | "no" | "na";
  evidence: string | null;
  signal_snapshot: string | null;
  answered_at: string;
  answered_by: string | null;
};

export type AnswerDraft = {
  questionId: string;
  value: "yes" | "no" | "na";
  evidence?: string;
  signalSnapshot?: string;
  answeredBy?: string;
};

export function listAnswers(): InsuranceAnswer[] {
  return getDb()
    .prepare("SELECT * FROM insurance_answers")
    .all() as InsuranceAnswer[];
}

export function upsertAnswer(draft: AnswerDraft): InsuranceAnswer {
  getDb()
    .prepare(
      `INSERT INTO insurance_answers
        (question_id, value, evidence, signal_snapshot, answered_at, answered_by)
       VALUES (?, ?, ?, ?, datetime('now'), ?)
       ON CONFLICT(question_id) DO UPDATE SET
        value = excluded.value,
        evidence = excluded.evidence,
        signal_snapshot = excluded.signal_snapshot,
        answered_at = excluded.answered_at,
        answered_by = excluded.answered_by`,
    )
    .run(
      draft.questionId,
      draft.value,
      draft.evidence?.trim() ?? null,
      draft.signalSnapshot ?? null,
      draft.answeredBy?.trim() ?? null,
    );
  return getDb()
    .prepare("SELECT * FROM insurance_answers WHERE question_id = ?")
    .get(draft.questionId) as InsuranceAnswer;
}

export function deleteAnswer(questionId: string): void {
  getDb()
    .prepare("DELETE FROM insurance_answers WHERE question_id = ?")
    .run(questionId);
}
