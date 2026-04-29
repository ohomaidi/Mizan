"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Per-risk treatment plan editor.
 *
 * Loads/edits the rows of `risk_treatment_steps` for a given risk.
 * Each step carries: text, owner, due date, status (open / in_progress
 * / done / blocked). Inline editing — click into a field, blur to
 * save (no separate "save" button on each step), one explicit "+ Add
 * step" at the bottom.
 *
 * v2.7.0.
 */

type Status = "open" | "in_progress" | "done" | "blocked";

type Step = {
  id: number;
  risk_id: number;
  step_text: string;
  owner: string | null;
  due_date: string | null;
  status: Status;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const STATUSES: Status[] = ["open", "in_progress", "done", "blocked"];

function statusTone(s: Status): string {
  return s === "done"
    ? "text-pos bg-pos/10"
    : s === "in_progress"
      ? "text-council-strong bg-council-strong/10"
      : s === "blocked"
        ? "text-neg bg-neg/10"
        : "text-ink-2 bg-surface-3";
}

export function TreatmentPlanModal({
  riskId,
  riskTitle,
  open,
  onClose,
}: {
  riskId: number | null;
  riskTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState("");

  const load = async () => {
    if (riskId == null) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/risk-register/${riskId}/treatment`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { steps: Step[] };
      setSteps(j.steps);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && riskId != null) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, riskId]);

  if (riskId == null) return null;

  const onAdd = async () => {
    if (draft.trim().length < 1) return;
    setBusyId("new");
    try {
      const r = await fetch(`/api/risk-register/${riskId}/treatment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepText: draft.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDraft("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const onPatch = async (
    stepId: number,
    patch: Partial<{
      stepText: string;
      owner: string;
      dueDate: string;
      status: Status;
    }>,
  ) => {
    setBusyId(stepId);
    try {
      const r = await fetch(
        `/api/risk-register/${riskId}/treatment/${stepId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (stepId: number) => {
    setBusyId(stepId);
    try {
      const r = await fetch(
        `/api/risk-register/${riskId}/treatment/${stepId}`,
        { method: "DELETE" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const totals = {
    total: steps.length,
    done: steps.filter((s) => s.status === "done").length,
  };

  return (
    <Modal
      open={open}
      title={`${t("risk.treatment.title")} — ${riskTitle}`}
      onClose={onClose}
      size="wide"
    >
      <div className="flex flex-col gap-4">
        <div className="text-[11.5px] text-ink-3">
          {t("risk.treatment.progress", {
            done: totals.done,
            total: totals.total,
          })}
        </div>

        {error ? (
          <div className="rounded-md border border-neg/40 bg-neg/10 p-2 text-[12px] text-ink-1 inline-flex items-center gap-1.5">
            <AlertTriangle size={12} /> {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-ink-3 text-sm flex items-center gap-1.5">
            <Loader2 size={14} className="animate-spin" />
            {t("risk.treatment.loading")}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {steps.length === 0 ? (
              <li className="text-[12.5px] text-ink-3 italic">
                {t("risk.treatment.empty")}
              </li>
            ) : null}
            {steps.map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-border bg-surface-1 p-3"
              >
                <div className="flex items-start gap-2">
                  <input
                    defaultValue={s.step_text}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== s.step_text) onPatch(s.id, { stepText: v });
                    }}
                    className="flex-1 bg-transparent text-[13px] text-ink-1 outline-none focus:bg-surface-2 px-2 py-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    disabled={busyId === s.id}
                    aria-label={t("risk.treatment.delete")}
                    className="inline-flex items-center justify-center h-7 w-7 rounded border border-border hover:text-neg hover:border-neg/40 text-ink-3 disabled:opacity-50"
                  >
                    {busyId === s.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                  <input
                    defaultValue={s.owner ?? ""}
                    placeholder={t("risk.treatment.owner")}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (s.owner ?? "")) onPatch(s.id, { owner: v });
                    }}
                    className="px-2 py-1.5 rounded border border-border bg-surface-2 text-ink-1"
                  />
                  <input
                    type="date"
                    defaultValue={s.due_date ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (s.due_date ?? ""))
                        onPatch(s.id, { dueDate: v });
                    }}
                    className="px-2 py-1.5 rounded border border-border bg-surface-2 text-ink-1 tabular"
                  />
                  <select
                    value={s.status}
                    onChange={(e) =>
                      onPatch(s.id, { status: e.target.value as Status })
                    }
                    className={`px-2 py-1.5 rounded border border-border tabular font-medium ${statusTone(
                      s.status,
                    )}`}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t(`risk.treatment.status.${st}` as `risk.treatment.status.${Status}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add step */}
        <div className="flex items-center gap-2 mt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busyId) onAdd();
            }}
            placeholder={t("risk.treatment.addPlaceholder")}
            className="flex-1 px-3 py-2 rounded-md border border-border bg-surface-2 text-[13px] text-ink-1"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={busyId === "new" || draft.trim().length < 1}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-medium disabled:opacity-50"
          >
            {busyId === "new" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            {t("risk.treatment.add")}
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-ink-1 text-[12.5px]"
          >
            <Check size={13} />
            {t("risk.treatment.done")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
