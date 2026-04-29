"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Plus,
  Sparkles,
  Check,
  X,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { useFmtRelative } from "@/lib/i18n/time";

/**
 * Risk register — board-grade risk list. v2.6.0 (Executive mode).
 *
 * Two panels:
 *   - "Auto-suggested" panel up top — Mizan generated these from
 *     posture signals (CVE aging, admin deactivation, etc.). Operator
 *     reviews each + clicks Accept (→ moves to register) or Dismiss
 *     (→ 30-day cooldown so the same auto-rule doesn't immediately
 *     re-suggest).
 *   - Main register table below, sorted by residual rating
 *     (impact × likelihood, 1..25). Color-coded: 1-6 green, 7-14
 *     amber, 15-25 red.
 */

type Risk = {
  id: number;
  title: string;
  description: string | null;
  impact: number;
  likelihood: number;
  residual_rating: number;
  owner: string | null;
  due_date: string | null;
  status:
    | "suggested"
    | "open"
    | "mitigated"
    | "accepted"
    | "dismissed";
  mitigation_notes: string | null;
  source: string;
  related_signal: string | null;
  suggested_at: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function RiskRegisterPage() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const fmtRelative = useFmtRelative();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/risk-register", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { risks: Risk[] };
      setRisks(j.risks);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const suggested = risks.filter((r) => r.status === "suggested");
  const active = risks.filter((r) =>
    ["open", "mitigated", "accepted"].includes(r.status),
  );

  const onAcceptOrDismiss = async (
    id: number,
    action: "accept" | "dismiss",
  ) => {
    setBusyId(id);
    try {
      await fetch(`/api/risk-register/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm(t("risk.delete.confirm"))) return;
    setBusyId(id);
    try {
      await fetch(`/api/risk-register/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">
            <AlertTriangle size={11} className="inline -mt-0.5 me-1" />
            {t("risk.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("risk.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
            {t("risk.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
        >
          <Plus size={14} />
          {t("risk.newRisk")}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1">
          {error}
        </div>
      ) : null}

      {/* Suggested panel */}
      {suggested.length > 0 ? (
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                {t("risk.suggested.title", { count: fmt(suggested.length) })}
              </span>
            }
            subtitle={t("risk.suggested.body")}
          />
          <ul className="divide-y divide-border">
            {suggested.map((r) => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <RiskRatingChip rating={r.residual_rating} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink-1">
                    {r.title}
                  </div>
                  {r.description ? (
                    <div className="text-[12px] text-ink-2 leading-relaxed mt-0.5">
                      {r.description}
                    </div>
                  ) : null}
                  <div className="text-[10.5px] text-ink-3 mt-1">
                    {t("risk.suggested.source", { source: r.source })} ·{" "}
                    {r.suggested_at ? fmtRelative(r.suggested_at) : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onAcceptOrDismiss(r.id, "accept")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-pos/40 bg-pos/10 hover:bg-pos/15 text-[11px] text-pos disabled:opacity-50"
                  >
                    {busyId === r.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Check size={11} />
                    )}
                    {t("risk.suggested.accept")}
                  </button>
                  <button
                    onClick={() => onAcceptOrDismiss(r.id, "dismiss")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border hover:bg-surface-3 text-[11px] text-ink-3 disabled:opacity-50"
                  >
                    <X size={11} />
                    {t("risk.suggested.dismiss")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Active register */}
      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader
            title={t("risk.active.title")}
            subtitle={t("risk.active.subtitle", { count: fmt(active.length) })}
          />
        </div>
        {loading ? (
          <div className="p-6 text-center text-[12.5px] text-ink-3">
            {t("state.loading")}
          </div>
        ) : active.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-ink-3">
            {t("risk.active.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">
                    {t("risk.col.rating")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("risk.col.risk")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("risk.col.owner")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("risk.col.status")}
                  </th>
                  <th className="py-2.5 pe-5 text-end font-semibold">
                    {t("risk.col.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="ps-5 py-3">
                      <RiskRatingChip rating={r.residual_rating} />
                      <div className="text-[10px] text-ink-3 mt-0.5 tabular">
                        {r.impact} × {r.likelihood}
                      </div>
                    </td>
                    <td className="py-3 max-w-[420px]">
                      <div className="text-ink-1 font-medium">{r.title}</div>
                      {r.description ? (
                        <div className="text-[11.5px] text-ink-3 leading-relaxed mt-0.5 line-clamp-2">
                          {r.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 text-ink-2">
                      {r.owner ?? <span className="text-ink-3">—</span>}
                      {r.due_date ? (
                        <div className="text-[10.5px] text-ink-3">
                          {t("risk.col.due")}: {r.due_date}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 text-[11.5px]">
                      <RiskStatusChip status={r.status} />
                    </td>
                    <td className="py-3 pe-5 text-end">
                      <button
                        onClick={() => onDelete(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center justify-center h-7 w-7 rounded border border-border hover:text-neg hover:border-neg/40 text-ink-3 disabled:opacity-50"
                        aria-label={t("risk.col.delete")}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateRiskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function RiskRatingChip({ rating }: { rating: number }) {
  const tone =
    rating >= 15
      ? "bg-neg/15 text-neg"
      : rating >= 7
        ? "bg-warn/15 text-warn"
        : "bg-pos/15 text-pos";
  return (
    <span
      className={`inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded text-[11.5px] font-semibold tabular ${tone}`}
    >
      {rating}
    </span>
  );
}

function RiskStatusChip({ status }: { status: Risk["status"] }) {
  const { t } = useI18n();
  const tone =
    status === "open"
      ? "bg-warn/10 text-warn"
      : status === "mitigated"
        ? "bg-pos/10 text-pos"
        : status === "accepted"
          ? "bg-surface-3 text-ink-2"
          : status === "dismissed"
            ? "bg-surface-3 text-ink-3"
            : "bg-accent/15 text-accent";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-[0.04em] ${tone}`}
    >
      {t(`risk.status.${status}` as
        | "risk.status.suggested"
        | "risk.status.open"
        | "risk.status.mitigated"
        | "risk.status.accepted"
        | "risk.status.dismissed")}
    </span>
  );
}

function CreateRiskModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState(3);
  const [likelihood, setLikelihood] = useState(3);
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setImpact(3);
    setLikelihood(3);
    setOwner("");
    setDueDate("");
    setErr(null);
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/risk-register", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          impact,
          likelihood,
          owner: owner || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      reset();
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("risk.modal.title")}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={saving}
            className="h-9 px-3 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-[12.5px] text-ink-1 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={saving || title.trim().length < 2}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {t("risk.modal.create")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-[13px]">
        <Field label={t("risk.field.title")}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 h-9 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1"
            placeholder={t("risk.field.title.placeholder")}
          />
        </Field>
        <Field label={t("risk.field.description")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("risk.field.impact")}>
            <ScalePicker value={impact} onChange={setImpact} />
          </Field>
          <Field label={t("risk.field.likelihood")}>
            <ScalePicker value={likelihood} onChange={setLikelihood} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("risk.field.owner")}>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3 h-9 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1"
            />
          </Field>
          <Field label={t("risk.field.dueDate")}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 h-9 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
            />
          </Field>
        </div>
        {err ? (
          <div className="text-[12px] text-neg">{err}</div>
        ) : null}
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function ScalePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 h-9 rounded-md border text-[13px] tabular ${
            value === n
              ? "border-council-strong bg-council-strong text-white font-semibold"
              : "border-border bg-surface-1 text-ink-2 hover:bg-surface-3"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
