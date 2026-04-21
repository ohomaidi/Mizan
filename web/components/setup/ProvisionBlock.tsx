"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type Kind = "graph" | "user";

type Started = {
  flowId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  message: string;
};

type Poll =
  | { status: "pending"; interval?: number }
  | { status: "success"; clientId: string; displayName: string }
  | { status: "error"; message: string };

export function ProvisionBlock({
  kind,
  tenant,
  onSuccess,
}: {
  kind: Kind;
  tenant: string;
  onSuccess: (clientId: string) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<
    | { mode: "idle" }
    | { mode: "starting" }
    | { mode: "waiting"; started: Started }
    | { mode: "success"; clientId: string; displayName: string }
    | { mode: "error"; message: string }
  >({ mode: "idle" });
  const [copied, setCopied] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelled.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  const poll = useCallback(
    async (flowId: string, intervalSec: number) => {
      if (cancelled.current) return;
      try {
        const res = await fetch("/api/setup/provision/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flowId }),
        });
        const body = (await res.json()) as Poll;
        if (cancelled.current) return;
        if (body.status === "pending") {
          const wait = (body.interval ?? intervalSec) * 1000;
          pollTimer.current = setTimeout(() => poll(flowId, intervalSec), wait);
          return;
        }
        if (body.status === "success") {
          stopPolling();
          setState({
            mode: "success",
            clientId: body.clientId,
            displayName: body.displayName,
          });
          onSuccess(body.clientId);
          return;
        }
        stopPolling();
        setState({ mode: "error", message: body.message });
      } catch (err) {
        if (cancelled.current) return;
        stopPolling();
        setState({ mode: "error", message: (err as Error).message });
      }
    },
    [onSuccess, stopPolling],
  );

  const start = async () => {
    setState({ mode: "starting" });
    try {
      const res = await fetch("/api/setup/provision/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, tenant }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const started = (await res.json()) as Started;
      setState({ mode: "waiting", started });
      pollTimer.current = setTimeout(
        () => poll(started.flowId, started.interval),
        started.interval * 1000,
      );
    } catch (err) {
      setState({ mode: "error", message: (err as Error).message });
    }
  };

  const reset = () => {
    stopPolling();
    setState({ mode: "idle" });
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  // ---------- render ----------

  if (state.mode === "success") {
    return (
      <div className="rounded-md border border-pos/40 bg-pos/10 p-4 flex items-start gap-3">
        <PartyPopper size={18} className="text-pos shrink-0 mt-0.5" />
        <div className="flex-1 text-[13px] text-ink-1">
          <div className="font-semibold text-pos">
            {t("setup.prov.success")}
          </div>
          <div className="text-[12px] text-ink-2 mt-1">
            {state.displayName}
            <span className="mx-1.5 text-ink-3">·</span>
            <span className="tabular keep-ltr text-ink-3">{state.clientId}</span>
          </div>
          <div className="text-[11.5px] text-ink-3 mt-2">
            {t("setup.prov.successHint")}
          </div>
        </div>
      </div>
    );
  }

  if (state.mode === "error") {
    return (
      <div className="rounded-md border border-neg/40 bg-neg/10 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-neg shrink-0 mt-0.5" />
        <div className="flex-1 text-[13px] text-ink-1">
          <div className="font-semibold text-neg">
            {t("setup.prov.failed")}
          </div>
          <div className="text-[12px] text-ink-2 mt-1 break-words">
            {state.message}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px]"
          >
            {t("setup.prov.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (state.mode === "waiting") {
    const s = state.started;
    return (
      <div className="rounded-md border border-council-strong/40 bg-council-strong/5 p-4 flex flex-col gap-3">
        <div className="text-[13px] text-ink-1 font-semibold inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-council-strong" />
          {t("setup.prov.waiting")}
        </div>
        <ol className="text-[12.5px] text-ink-2 list-decimal ms-5 space-y-1.5">
          <li>
            {t("setup.prov.step1a")}{" "}
            <a
              href={s.verificationUri}
              target="_blank"
              rel="noreferrer"
              className="text-council-strong underline inline-flex items-center gap-1"
            >
              {s.verificationUri}
              <ExternalLink size={11} />
            </a>
          </li>
          <li>
            {t("setup.prov.step2a")}
            <div className="mt-1.5 flex items-center gap-2">
              <code className="px-3 py-1.5 rounded bg-surface-1 border border-border text-[14px] font-semibold tabular tracking-wider">
                {s.userCode}
              </code>
              <button
                type="button"
                onClick={() => copy(s.userCode)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px]"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t("settings.consent.copied") : t("settings.consent.copy")}
              </button>
            </div>
          </li>
          <li>{t("setup.prov.step3a")}</li>
        </ol>
        <div className="text-[11px] text-ink-3">
          {t("setup.prov.expires", { minutes: Math.floor(s.expiresIn / 60) })}
        </div>
        <button
          type="button"
          onClick={reset}
          className="self-start text-[11.5px] text-ink-3 hover:text-ink-1 underline underline-offset-2"
        >
          {t("setup.prov.cancel")}
        </button>
      </div>
    );
  }

  // idle or starting
  return (
    <div className="rounded-md border border-border bg-surface-2 p-4 flex flex-col gap-2">
      <div className="text-[13px] text-ink-1 font-semibold inline-flex items-center gap-2">
        <Sparkles size={14} className="text-council-strong" />
        {t("setup.prov.autoTitle")}
      </div>
      <p className="text-[12px] text-ink-3 leading-relaxed">
        {t("setup.prov.autoBody")}
      </p>
      <button
        type="button"
        onClick={start}
        disabled={state.mode === "starting"}
        className="self-start inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
      >
        {state.mode === "starting" ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Sparkles size={13} />
        )}
        {t("setup.prov.start")}
      </button>
    </div>
  );
}
