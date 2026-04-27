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
  /**
   * v2.5.6+: explicit "we couldn't check" reason (rate-limit, no
   * releases, network). Distinct from "we checked and you're up to
   * date" — null on success, string on failure.
   */
  checkError: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
  notes: string | null;
  containerImage: string;
  fetchedAt: string;
  /** Detected hosting environment. Drives the upgrade UX (button vs snippet). */
  runtime: "aca" | "mac" | "windows" | "docker" | "unknown";
  /** True when the ACA managed-identity self-upgrade path is wired up. */
  selfUpgradeReady: boolean;
  /**
   * v2.5.8+ — direct download URL for the platform's native installer
   * (.pkg on mac, .msi on windows). Null on aca/docker/unknown.
   */
  installerUrl: string | null;
  error?: string;
};

type ApplyResult =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; from: string; to: string }
  | { kind: "err"; reason: string; detail?: string };

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
  const [apply, setApply] = useState<ApplyResult>({ kind: "idle" });
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fire the in-place upgrade. Two-step UX: click → confirm dialog →
  // confirm. Posts to /api/updates/apply which uses the container app's
  // managed identity to PATCH ARM. ACA spins up a new revision and shifts
  // traffic; the dashboard call from the OLD revision will eventually
  // 502 as the new revision takes over — at which point the user
  // refreshes and sees the new version.
  const onApply = useCallback(async () => {
    setApply({ kind: "running" });
    try {
      const res = await fetch("/api/updates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as
        | { ok: true; from: string; to: string }
        | { ok: false; reason: string; detail?: string };
      if (!res.ok || !("ok" in body) || !body.ok) {
        const errBody = body as { reason?: string; detail?: string };
        setApply({
          kind: "err",
          reason: errBody.reason ?? `HTTP ${res.status}`,
          detail: errBody.detail,
        });
      } else {
        setApply({ kind: "ok", from: body.from, to: body.to });
      }
    } catch (err) {
      setApply({
        kind: "err",
        reason: "network",
        detail: (err as Error).message,
      });
    } finally {
      setConfirmOpen(false);
    }
  }, []);

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

        {/* Status banner. Three states (in priority order):
            (a) checkError set OR error from the route — the GitHub
                fetch couldn't complete; show the reason and explicitly
                NOT claim up-to-date.
            (b) upToDate=true — checked successfully and we're current.
            (c) upToDate=false with a latest tag — newer release out. */}
        {info.checkError || info.error ? (
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 flex items-start gap-3 text-[12.5px] text-ink-1">
            <Info size={14} className="text-warn shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                {t("settings.about.checkFailedTitle")}
              </div>
              <div className="text-ink-2 mt-0.5">
                {info.checkError ?? info.error}
              </div>
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

            {/* Five upgrade UXes by runtime + readiness:
                1. ACA + selfUpgradeReady   → one-click button.
                2. ACA + !selfUpgradeReady → "configure managed identity"
                   callout pointing at docs, plus the manual snippet.
                3. Mac (.pkg installed)    → "Download Mizan-X.Y.Z.pkg"
                                              button → operator runs the
                                              .pkg, the installer handles
                                              the upgrade (LaunchAgent
                                              bootout/bootstrap inside).
                4. Windows (.msi installed) → "Download Mizan-X.Y.Z.msi"
                                              button → operator runs the
                                              .msi, WiX MajorUpgrade +
                                              ServiceControl handle the
                                              service stop/replace/start.
                5. Docker / unknown        → manual `docker pull` snippet
                                              (one-click can't work
                                              without exposing the docker
                                              socket — security choice
                                              most operators reject). */}
            {info.runtime === "aca" && info.selfUpgradeReady ? (
              <UpgradeButtonAca
                latest={info.latest ?? ""}
                apply={apply}
                onClickConfirm={() => setConfirmOpen(true)}
              />
            ) : info.runtime === "aca" ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12px] text-ink-1">
                  <div className="font-semibold mb-0.5">
                    {t("settings.about.aca.selfUpgradeNotReady.title")}
                  </div>
                  <div className="text-ink-2">
                    {t("settings.about.aca.selfUpgradeNotReady.body")}
                  </div>
                </div>
                <UpgradeCmd
                  label={t("settings.about.azureCmd")}
                  cmd={azureCmd}
                  copied={copiedCmd === "azure"}
                  onCopy={() => copy("azure", azureCmd)}
                />
              </div>
            ) : info.runtime === "mac" || info.runtime === "windows" ? (
              <DownloadInstallerButton
                runtime={info.runtime}
                latest={info.latest ?? ""}
                installerUrl={info.installerUrl}
              />
            ) : (
              <UpgradeCmd
                label={t("settings.about.dockerCmd")}
                cmd={pullCmd}
                copied={copiedCmd === "docker"}
                onCopy={() => copy("docker", pullCmd)}
              />
            )}

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

        {/* Confirm dialog — small inline panel, no full Modal needed.
            Operator double-confirms because the upgrade triggers a
            revision rollover on the live deployment. */}
        {confirmOpen && state.kind === "ready" ? (
          <div className="rounded-md border border-warn/40 bg-warn/5 p-4 flex flex-col gap-3">
            <div className="text-[13px] text-ink-1 font-semibold">
              {t("settings.about.confirmUpgrade.title", {
                version: state.info.latest ?? "",
              })}
            </div>
            <div className="text-[12px] text-ink-2 leading-relaxed">
              {t("settings.about.confirmUpgrade.body")}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
              >
                {t("settings.about.confirmUpgrade.cancel")}
              </button>
              <button
                type="button"
                onClick={onApply}
                disabled={apply.kind === "running"}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-accent text-surface-1 text-[12.5px] font-semibold disabled:opacity-50"
              >
                {apply.kind === "running" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {t("settings.about.confirmUpgrade.confirm")}
              </button>
            </div>
          </div>
        ) : null}

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

/**
 * Native installer download button (v2.5.8+). Surfaced on Mac/Windows
 * native installs instead of the misleading `docker pull` snippet.
 *
 * Click behaviour: opens the GitHub Release asset URL in a new tab. The
 * browser downloads the .pkg/.msi to the user's Downloads folder; the
 * operator runs it; the installer handles upgrade-in-place
 * (LaunchAgent bootout/bootstrap on Mac, WiX MajorUpgrade +
 * ServiceControl on Windows). After the installer finishes, the
 * dashboard process restarts and Settings → About shows the new
 * installed version.
 *
 * Falls back to a "release page" link if `installerUrl` is null
 * (build of the asset failed in CI, etc.) — better than a dead button.
 */
function DownloadInstallerButton({
  runtime,
  latest,
  installerUrl,
}: {
  runtime: "mac" | "windows";
  latest: string;
  installerUrl: string | null;
}) {
  const { t } = useI18n();
  const labelKey =
    runtime === "mac"
      ? "settings.about.downloadPkg"
      : "settings.about.downloadMsi";
  const helpKey =
    runtime === "mac"
      ? "settings.about.downloadPkg.help"
      : "settings.about.downloadMsi.help";

  if (!installerUrl) {
    return (
      <div className="text-[12.5px] text-ink-2">
        {t("settings.about.installerMissing", { version: latest })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={installerUrl}
        // No `target="_blank"` — let the browser handle the file
        // download as a normal navigation; modern browsers detect
        // .pkg/.msi as binary and switch to a download instead of
        // navigating away.
        className="self-start inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-surface-1 text-[13px] font-semibold"
      >
        <Sparkles size={14} />
        {t(labelKey, { version: latest })}
      </a>
      <div className="text-[11.5px] text-ink-3 leading-relaxed max-w-xl">
        {t(helpKey)}
      </div>
    </div>
  );
}

/**
 * One-click ACA upgrade. Renders the prominent "Upgrade now" button +
 * an inline status pill once an upgrade attempt has fired. Three terminal
 * states:
 *   - ok    → green "Upgrade requested. ACA is rolling out the new
 *             revision; refresh in 1–2 minutes."
 *   - err   → red banner with reason + detail.
 *   - idle  → button only.
 */
function UpgradeButtonAca({
  latest,
  apply,
  onClickConfirm,
}: {
  latest: string;
  apply: ApplyResult;
  onClickConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClickConfirm}
        disabled={apply.kind === "running" || apply.kind === "ok"}
        className="self-start inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-surface-1 text-[13px] font-semibold disabled:opacity-50"
      >
        {apply.kind === "running" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        {t("settings.about.upgradeNow", { version: latest })}
      </button>

      {apply.kind === "ok" ? (
        <div className="rounded-md border border-pos/40 bg-pos/10 p-3 text-[12.5px] text-ink-1 flex items-start gap-2">
          <Check size={14} className="text-pos shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              {t("settings.about.upgradeRequested.title", {
                from: apply.from,
                to: apply.to,
              })}
            </div>
            <div className="text-ink-2 mt-0.5 leading-relaxed">
              {t("settings.about.upgradeRequested.body")}
            </div>
          </div>
        </div>
      ) : null}

      {apply.kind === "err" ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1 flex items-start gap-2">
          <Info size={14} className="text-neg shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              {t("settings.about.upgradeFailed.title")}
            </div>
            <div className="text-ink-2 mt-0.5">
              <code className="text-[11.5px] bg-surface-1 px-1.5 py-0.5 rounded border border-border keep-ltr">
                {apply.reason}
              </code>
              {apply.detail ? (
                <div className="mt-1 leading-relaxed">{apply.detail}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
