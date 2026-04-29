"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";

/**
 * Board PDF report — v2.6.0.
 *
 * Two surfaces:
 *   - "Generate now" button → runs the report for the current quarter,
 *     streams the rendered PDF.
 *   - "Drafts" list → every previously generated draft (auto-weekly +
 *     on-demand). Operator can re-download an old draft, sign it
 *     (status → 'signed'), or delete it.
 */

type Draft = {
  id: number;
  period: string;
  generated_at: string;
  status: "draft" | "signed" | "superseded";
  signed_by: string | null;
  signed_at: string | null;
  planned_actions: string | null;
};

export default function BoardReportPage() {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/board-report/drafts", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { drafts: Draft[] };
      setDrafts(j.drafts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch("/api/board-report/drafts", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { draft: Draft };
      // Trigger download of the just-generated PDF.
      window.location.href = `/api/board-report/drafts/${j.draft.id}/pdf`;
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const onSign = async (id: number) => {
    setBusyId(id);
    try {
      await fetch(`/api/board-report/drafts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "sign" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm(t("board.delete.confirm"))) return;
    setBusyId(id);
    try {
      await fetch(`/api/board-report/drafts/${id}`, { method: "DELETE" });
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
            <FileText size={11} className="inline -mt-0.5 me-1" />
            {t("board.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("board.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">
            {t("board.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-60"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {t("board.generate")}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1">
          {error}
        </div>
      ) : null}

      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader title={t("board.drafts.title")} subtitle={t("board.drafts.subtitle")} />
        </div>
        {loading ? (
          <div className="p-6 text-center text-[12.5px] text-ink-3">
            {t("state.loading")}
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-ink-3">
            {t("board.drafts.empty")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="px-5 py-4 flex items-center gap-4 flex-wrap"
              >
                <FileText
                  size={18}
                  className="text-ink-3 shrink-0"
                  strokeWidth={1.7}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-1">
                    {t("board.drafts.row.period", { period: d.period })}
                  </div>
                  <div className="text-[11.5px] text-ink-3">
                    {t("board.drafts.row.generated", {
                      when: fmtRelative(d.generated_at),
                    })}
                    {d.status === "signed" ? (
                      <>
                        {" · "}
                        <span className="text-pos">
                          {t("board.drafts.row.signedBy", {
                            by: d.signed_by ?? "?",
                            when: d.signed_at?.slice(0, 10) ?? "",
                          })}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <a
                  href={`/api/board-report/drafts/${d.id}/pdf`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border hover:bg-surface-3 text-[12px] text-ink-1"
                >
                  <Download size={12} />
                  {t("board.drafts.download")}
                </a>
                {d.status !== "signed" ? (
                  <button
                    type="button"
                    onClick={() => onSign(d.id)}
                    disabled={busyId === d.id}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-pos/40 bg-pos/10 text-pos text-[12px] disabled:opacity-50"
                  >
                    {busyId === d.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    {t("board.drafts.sign")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(d.id)}
                  disabled={busyId === d.id}
                  className="inline-flex items-center justify-center h-8 w-8 rounded border border-border hover:text-neg hover:border-neg/40 text-ink-3 disabled:opacity-50"
                  aria-label={t("board.drafts.delete")}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
