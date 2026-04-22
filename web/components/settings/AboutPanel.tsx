"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";

type UpdateInfo = {
  current: string;
  latest: string | null;
  upToDate: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  notes: string | null;
  containerImage: string;
  fetchedAt: string;
  error?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; info: UpdateInfo };

/**
 * Settings → About. Shows the currently-running Mizan version + whether a
 * newer release is available on GitHub. Manual "Check now" bypasses the
 * server-side 1-hour cache. The upgrade-command block is platform-agnostic
 * (we don't try to detect macOS vs ACA from inside the container); operators
 * copy whichever line matches their install.
 */
export function AboutPanel() {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [checking, setChecking] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    if (force) setChecking(true);
    try {
      const res = await fetch(`/api/updates${force ? "?force=1" : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const info = (await res.json()) as UpdateInfo;
      setState({ kind: "ready", info });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCmd(key);
      setTimeout(() => setCopiedCmd(null), 1600);
    } catch {
      /* noop */
    }
  };

  if (state.kind === "loading") {
    return (
      <Card>
        <CardHeader
          title={t("settings.about.title")}
          subtitle={t("settings.about.subtitle")}
        />
        <div className="flex items-center gap-2 text-ink-3 text-[12.5px]">
          <Loader2 size={13} className="animate-spin" />
          {t("state.loading")}
        </div>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader
          title={t("settings.about.title")}
          subtitle={t("settings.about.subtitle")}
        />
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[13px] text-ink-1">
          {state.message}
        </div>
      </Card>
    );
  }

  const { info } = state;
  const azureCmd = `az containerapp update -g <your-rg> -n $(az containerapp list -g <your-rg> --query "[0].name" -o tsv) --image ${info.containerImage}:${info.latest ?? info.current}`;
  const pullCmd = `docker pull ${info.containerImage}:${info.latest ?? "latest"}`;

  return (
    <Card>
      <CardHeader
        title={t("settings.about.title")}
        subtitle={t("settings.about.subtitle")}
      />

      <div className="flex flex-col gap-4">
        {/* Current / latest version row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-surface-1 p-4">
            <div className="text-[11.5px] text-ink-3 uppercase tracking-wide">
              {t("settings.about.current")}
            </div>
            <div className="text-[18px] font-semibold text-ink-1 mt-1 tabular keep-ltr inline-flex items-center gap-2">
              <Sparkles size={14} className="text-council-strong" />v
              {info.current}
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-1 p-4">
            <div className="text-[11.5px] text-ink-3 uppercase tracking-wide">
              {t("settings.about.latest")}
            </div>
            <div className="text-[18px] font-semibold text-ink-1 mt-1 tabular keep-ltr">
              {info.latest ? `v${info.latest}` : "—"}
            </div>
            {info.publishedAt ? (
              <div className="text-[11.5px] text-ink-3 mt-0.5">
                {t("settings.about.published")} {fmtRelative(info.publishedAt)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Status banner */}
        {info.error ? (
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 flex items-start gap-3 text-[12.5px] text-ink-1">
            <Info size={14} className="text-warn shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                {t("settings.about.checkFailedTitle")}
              </div>
              <div className="text-ink-2 mt-0.5">{info.error}</div>
            </div>
          </div>
        ) : info.upToDate ? (
          <div className="rounded-md border border-pos/40 bg-pos/10 p-3 flex items-center gap-2 text-[13px] text-ink-1">
            <Check size={14} className="text-pos shrink-0" />
            <span className="font-semibold text-pos">
              {t("settings.about.upToDate")}
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-accent/40 bg-accent/10 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[13px] text-ink-1">
              <Sparkles size={14} className="text-accent shrink-0" />
              <span className="font-semibold text-accent">
                {t("settings.about.updateAvailable", {
                  version: info.latest ?? "",
                })}
              </span>
            </div>

            {/* Platform-aware upgrade commands */}
            <div className="flex flex-col gap-2">
              <UpgradeCmd
                label={t("settings.about.azureCmd")}
                cmd={azureCmd}
                copied={copiedCmd === "azure"}
                onCopy={() => copy("azure", azureCmd)}
              />
              <UpgradeCmd
                label={t("settings.about.dockerCmd")}
                cmd={pullCmd}
                copied={copiedCmd === "docker"}
                onCopy={() => copy("docker", pullCmd)}
              />
            </div>

            {info.releaseUrl ? (
              <a
                href={info.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline self-start"
              >
                <ExternalLink size={12} /> {t("settings.about.openReleaseNotes")}
              </a>
            ) : null}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="text-[11.5px] text-ink-3">
            {t("settings.about.lastChecked")} {fmtRelative(info.fetchedAt)}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={checking}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px] disabled:opacity-50"
          >
            {checking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {t("settings.about.checkNow")}
          </button>
        </div>

        {/* Optional release notes excerpt */}
        {info.notes && !info.upToDate ? (
          <details className="rounded-md border border-border bg-surface-1 p-3">
            <summary className="cursor-pointer text-[12.5px] text-ink-2 font-semibold">
              {t("settings.about.releaseNotes")}
            </summary>
            <pre className="text-[12px] text-ink-2 mt-2 whitespace-pre-wrap break-words font-mono">
              {info.notes}
            </pre>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function UpgradeCmd({
  label,
  cmd,
  copied,
  onCopy,
}: {
  label: string;
  cmd: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="text-[11px] text-ink-3 mb-1 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 px-3 py-2 rounded border border-border bg-surface-1 text-[12px] text-ink-1 tabular keep-ltr overflow-x-auto whitespace-nowrap">
          {cmd}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 h-auto px-2.5 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px] shrink-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
