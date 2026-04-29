"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Minus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";

/**
 * Cyber-insurance readiness — v2.6.0. Aviation-specific template
 * synthesized from public carrier forms (Beazley / Coalition / AIG)
 * and IATA / ICAO / FAA references.
 *
 * Renders the questionnaire grouped by category. Each question shows:
 *   - The question text
 *   - The operator's saved answer (if any), OR Mizan's auto-evaluation
 *     (yes/no/na) drawn live from posture data
 *   - Yes / No / N/A buttons + evidence textarea — saving creates or
 *     updates an `insurance_answers` row.
 *
 * Header strip: total / answered / yes / no / completion %.
 */

type Question = {
  id: string;
  category: string;
  question: string;
  hint?: string;
  autoFromSignal?: string;
  requiresEvidence?: boolean;
  auto: {
    value: "yes" | "no" | "na";
    evidence: string;
    signalSnapshot: string;
  } | null;
  persisted: {
    question_id: string;
    value: "yes" | "no" | "na";
    evidence: string | null;
    answered_at: string;
    answered_by: string | null;
  } | null;
};

type Summary = {
  total: number;
  answered: number;
  yes: number;
  no: number;
  completionPct: number;
};

export default function InsurancePage() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<{
    version: string;
    source: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/insurance", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as {
        questionnaire: {
          version: string;
          source: string;
          questions: Question[];
        };
        summary: Summary;
      };
      setQuestions(j.questionnaire.questions);
      setSummary(j.summary);
      setMeta({ version: j.questionnaire.version, source: j.questionnaire.source });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAnswer = async (
    questionId: string,
    value: "yes" | "no" | "na",
    evidence: string,
  ) => {
    setBusyId(questionId);
    try {
      await fetch("/api/insurance", {
        method: "POST",
        body: JSON.stringify({ questionId, value, evidence: evidence || undefined }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  // Group by category preserving original order.
  const byCategory: Record<string, Question[]> = {};
  for (const q of questions) {
    (byCategory[q.category] ??= []).push(q);
  }
  const categories = Object.keys(byCategory);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={11} className="inline -mt-0.5 me-1" />
            {t("insurance.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("insurance.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">
            {t("insurance.subtitle")}
          </p>
          {meta ? (
            <p className="text-[10.5px] text-ink-3 mt-2 italic">
              {t("insurance.template", { version: meta.version })} · {meta.source}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryStat
            label={t("insurance.kpi.completion")}
            value={`${fmt(summary.completionPct)}%`}
            tone={
              summary.completionPct >= 90
                ? "pos"
                : summary.completionPct >= 70
                  ? "warn"
                  : "neg"
            }
          />
          <SummaryStat
            label={t("insurance.kpi.answered")}
            value={`${fmt(summary.answered)} / ${fmt(summary.total)}`}
          />
          <SummaryStat
            label={t("insurance.kpi.yes")}
            value={fmt(summary.yes)}
            tone="pos"
          />
          <SummaryStat
            label={t("insurance.kpi.no")}
            value={fmt(summary.no)}
            tone="neg"
          />
          <SummaryStat
            label={t("insurance.kpi.gaps")}
            value={fmt(summary.total - summary.answered)}
            tone={summary.total - summary.answered === 0 ? "pos" : "warn"}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="text-[12.5px] text-ink-3">{t("state.loading")}</div>
      ) : (
        categories.map((cat) => (
          <Card key={cat} className="p-0">
            <div className="p-5 border-b border-border">
              <CardHeader title={cat} />
            </div>
            <ul className="divide-y divide-border">
              {(byCategory[cat] ?? []).map((q) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  busy={busyId === q.id}
                  onAnswer={(v, ev) => onAnswer(q.id, v, ev)}
                />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}

function QuestionRow({
  q,
  busy,
  onAnswer,
}: {
  q: Question;
  busy: boolean;
  onAnswer: (value: "yes" | "no" | "na", evidence: string) => void;
}) {
  const { t } = useI18n();
  // Effective answer: the saved one wins; otherwise the auto eval.
  const effective = q.persisted?.value ?? q.auto?.value ?? null;
  const evidence = q.persisted?.evidence ?? q.auto?.evidence ?? "";
  const [draftEvidence, setDraftEvidence] = useState(q.persisted?.evidence ?? "");
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <AnswerChip value={effective} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-ink-1 leading-relaxed">
            {q.question}
          </div>
          {q.hint ? (
            <div className="text-[11px] text-ink-3 leading-relaxed mt-1">
              {q.hint}
            </div>
          ) : null}
          {q.auto && !q.persisted ? (
            <div className="mt-2 rounded-md border border-accent/30 bg-accent/[0.04] p-2 text-[11.5px] text-ink-1">
              <div className="font-semibold inline-flex items-center gap-1 text-accent mb-0.5">
                <Sparkles size={11} />
                {t("insurance.row.auto")}
              </div>
              <div className="text-ink-2 leading-relaxed">
                {q.auto.evidence}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-stretch">
            <textarea
              value={draftEvidence}
              onChange={(e) => setDraftEvidence(e.target.value)}
              placeholder={t("insurance.row.evidencePlaceholder")}
              rows={2}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-surface-1 text-[12.5px] text-ink-1"
            />
            <div className="flex gap-1.5 shrink-0">
              <AnswerButton
                onClick={() => onAnswer("yes", draftEvidence)}
                active={effective === "yes"}
                tone="pos"
                busy={busy}
                label={t("insurance.row.yes")}
                icon={<Check size={13} />}
              />
              <AnswerButton
                onClick={() => onAnswer("no", draftEvidence)}
                active={effective === "no"}
                tone="neg"
                busy={busy}
                label={t("insurance.row.no")}
                icon={<X size={13} />}
              />
              <AnswerButton
                onClick={() => onAnswer("na", draftEvidence)}
                active={effective === "na"}
                tone="muted"
                busy={busy}
                label={t("insurance.row.na")}
                icon={<Minus size={13} />}
              />
            </div>
          </div>
          {q.persisted ? (
            <div className="text-[10.5px] text-ink-3 mt-1.5">
              {t("insurance.row.savedAt", {
                when: q.persisted.answered_at.slice(0, 16),
              })}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function AnswerChip({ value }: { value: "yes" | "no" | "na" | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border bg-surface-1 text-ink-3 shrink-0 mt-0.5">
        <Minus size={13} />
      </span>
    );
  }
  const tone =
    value === "yes"
      ? "border-pos/40 bg-pos/10 text-pos"
      : value === "no"
        ? "border-neg/40 bg-neg/10 text-neg"
        : "border-border bg-surface-1 text-ink-3";
  return (
    <span
      className={`inline-flex items-center justify-center h-7 w-7 rounded-full border shrink-0 mt-0.5 ${tone}`}
    >
      {value === "yes" ? (
        <Check size={13} />
      ) : value === "no" ? (
        <X size={13} />
      ) : (
        <Minus size={13} />
      )}
    </span>
  );
}

function AnswerButton({
  onClick,
  active,
  tone,
  busy,
  label,
  icon,
}: {
  onClick: () => void;
  active: boolean;
  tone: "pos" | "neg" | "muted";
  busy: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  const cls = active
    ? tone === "pos"
      ? "bg-pos text-white border-pos"
      : tone === "neg"
        ? "bg-neg text-white border-neg"
        : "bg-surface-3 text-ink-1 border-border-strong"
    : tone === "pos"
      ? "border-pos/40 text-pos hover:bg-pos/10"
      : tone === "neg"
        ? "border-neg/40 text-neg hover:bg-neg/10"
        : "border-border text-ink-3 hover:bg-surface-3";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 h-9 px-3 rounded-md border text-[12px] font-medium disabled:opacity-50 ${cls}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "warn" | "neg";
}) {
  const valTone =
    tone === "pos"
      ? "text-pos"
      : tone === "warn"
        ? "text-warn"
        : tone === "neg"
          ? "text-neg"
          : "text-ink-1";
  return (
    <div className="rounded-md border border-border bg-surface-1 px-4 py-2.5">
      <div className={`text-[20px] font-semibold tabular ${valTone}`}>
        {value}
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mt-0.5">
        {label}
      </div>
    </div>
  );
}
