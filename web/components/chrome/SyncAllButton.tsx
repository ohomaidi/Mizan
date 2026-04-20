"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

type Estimate = {
  consentedReal: number;
  consentedDemo: number;
  estimatedSeconds: number;
  perRealTenantSeconds: number;
};
type RunState =
  | { kind: "idle" }
  | { kind: "confirm"; estimate: Estimate | null }
  | { kind: "running"; startedAt: number; estSeconds: number }
  | { kind: "done"; ok: number; total: number }
  | { kind: "error"; message: string };

export function SyncAllButton() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [state, setState] = useState<RunState>({ kind: "idle" });

  const onOpen = useCallback(async () => {
    setState({ kind: "confirm", estimate: null });
    try {
      const r = await fetch("/api/sync/estimate", { cache: "no-store" });
      const est = (await r.json()) as Estimate;
      setState({ kind: "confirm", estimate: est });
    } catch {
      setState({ kind: "confirm", estimate: null });
    }
  }, []);

  const onConfirm = useCallback(async (estSeconds: number) => {
    setState({ kind: "running", startedAt: Date.now(), estSeconds });
    try {
      const r = await api.syncAll();
      const total = r.results.length;
      const ok = r.results.filter((x) => x.ok).length;
      setState({ kind: "done", ok, total });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }, []);

  const onClose = useCallback(() => setState({ kind: "idle" }), []);

  return (
    <>
      <button
        aria-label={t("sync.all")}
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12px]"
      >
        <RefreshCw size={13} />
        <span className="hidden md:inline">{t("sync.all")}</span>
      </button>

      {state.kind === "confirm" ? (
        <ConfirmModal
          estimate={state.estimate}
          onCancel={onClose}
          onConfirm={() => onConfirm(state.estimate?.estimatedSeconds ?? 60)}
          t={t}
          fmt={fmt}
        />
      ) : null}

      {state.kind === "running" ? (
        <RunningModal startedAt={state.startedAt} estSeconds={state.estSeconds} t={t} fmt={fmt} />
      ) : null}

      {state.kind === "done" ? (
        <DoneModal ok={state.ok} total={state.total} onClose={() => {
          setState({ kind: "idle" });
          // Simple refresh so every page re-fetches the latest.
          if (typeof window !== "undefined") window.location.reload();
        }} t={t} fmt={fmt} />
      ) : null}

      {state.kind === "error" ? (
        <ErrorModal message={state.message} onClose={onClose} t={t} />
      ) : null}
    </>
  );
}

function ConfirmModal({
  estimate,
  onCancel,
  onConfirm,
  t,
  fmt,
}: {
  estimate: Estimate | null;
  onCancel: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useI18n>["t"];
  fmt: ReturnType<typeof useFmtNum>;
}) {
  return (
    <ModalShell onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 grid place-items-center rounded-md bg-warn/15 text-warn shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-1">{t("sync.all.title")}</h2>
          <p className="text-[12.5px] text-ink-2 mt-1">{t("sync.all.body")}</p>

          {estimate ? (
            <div className="mt-4 rounded-md border border-border bg-surface-1 p-3 text-[12.5px] text-ink-2 space-y-1">
              <div className="text-ink-1 font-semibold">
                {t("sync.all.estimate", { duration: formatDuration(estimate.estimatedSeconds, t, fmt) })}
              </div>
              <div className="tabular">
                {t("sync.all.tenantsReal", {
                  n: fmt(estimate.consentedReal),
                  perTenant: fmt(estimate.perRealTenantSeconds),
                })}
              </div>
              {estimate.consentedDemo > 0 ? (
                <div className="tabular">
                  {t("sync.all.tenantsDemo", { n: fmt(estimate.consentedDemo) })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 h-16 rounded-md border border-border bg-surface-1 grid place-items-center text-ink-3 text-[12px]">
              <Loader2 size={14} className="animate-spin" />
            </div>
          )}

          <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 text-[12px] text-ink-1 p-3">
            ⚠ {t("sync.all.warning")}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              {t("sync.all.cancel")}
            </button>
            <button
              onClick={onConfirm}
              disabled={!estimate}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} /> {t("sync.all.start")}
            </button>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="h-8 w-8 grid place-items-center rounded text-ink-3 hover:text-ink-1"
        >
          <X size={15} />
        </button>
      </div>
    </ModalShell>
  );
}

function RunningModal({
  startedAt,
  estSeconds,
  t,
  fmt,
}: {
  startedAt: number;
  estSeconds: number;
  t: ReturnType<typeof useI18n>["t"];
  fmt: ReturnType<typeof useFmtNum>;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = Math.max(0, estSeconds - elapsed);
  const pct = Math.min(99, Math.round((elapsed / Math.max(estSeconds, 1)) * 100));
  return (
    <ModalShell>
      <div className="flex items-center gap-3 mb-4">
        <Loader2 size={18} className="animate-spin text-council-strong" />
        <h2 className="text-[15px] font-semibold text-ink-1">
          {t("sync.all.running", { n: fmt(estSeconds / 11) })}
        </h2>
      </div>
      <p className="text-[12.5px] text-ink-2">{t("sync.all.running.body")}</p>
      <div className="mt-5 h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full bg-council-strong transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3 tabular">
        <span>{formatDuration(elapsed, t, fmt)}</span>
        <span>~{formatDuration(remaining, t, fmt)}</span>
      </div>
    </ModalShell>
  );
}

function DoneModal({
  ok,
  total,
  onClose,
  t,
  fmt,
}: {
  ok: number;
  total: number;
  onClose: () => void;
  t: ReturnType<typeof useI18n>["t"];
  fmt: ReturnType<typeof useFmtNum>;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 grid place-items-center rounded-md bg-pos/15 text-pos shrink-0">
          <CheckCircle2 size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-ink-1">{t("sync.all.done")}</h2>
          <p className="text-[12.5px] text-ink-2 mt-1">
            {t("sync.all.doneBody", { ok: fmt(ok), total: fmt(total) })}
          </p>
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
            >
              {t("sync.all.close")}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ErrorModal({
  message,
  onClose,
  t,
}: {
  message: string;
  onClose: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 grid place-items-center rounded-md bg-neg/15 text-neg shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-ink-1">{t("sync.failed")}</h2>
          <p className="text-[12.5px] text-ink-2 mt-1 break-words">{message}</p>
          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              {t("sync.all.close")}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  // Close on Escape when a close handler is provided.
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === ref.current && onClose) onClose();
      }}
      ref={ref}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-border bg-surface-2 p-5 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}

function formatDuration(
  seconds: number,
  t: ReturnType<typeof useI18n>["t"],
  fmt: ReturnType<typeof useFmtNum>,
): string {
  if (seconds < 60) return t("time.seconds", { n: fmt(Math.max(1, Math.round(seconds))) });
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (s === 0) return t("time.minutes", { n: fmt(m) });
  return t("time.minutesSeconds", { m: fmt(m), s: fmt(s) });
}
