"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Check, AlertTriangle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Settings → Risk register → Auto-suggest sensitivity.
 *
 * Lets the operator tune the four threshold knobs Mizan uses to
 * decide when a posture signal becomes a risk-register suggestion:
 *   - critical CVE age (days)
 *   - minimum affected device count
 *   - admin deactivation lookback window (days)
 *   - active high-severity incident SLA (hours)
 *
 * Plus an auto-promote toggle that bypasses the suggested-panel
 * review and writes risks straight to status='open' — for unattended
 * automation.
 *
 * v2.7.0.
 */

type Config = {
  cveAgeDays: number;
  cveMinDevices: number;
  deactivationWindowDays: number;
  incidentOpenHours: number;
  autoPromote: boolean;
};

type Range = { min: number; max: number; step: number; unit: string };

type Loaded = {
  config: Config;
  defaults: Config;
  ranges: Record<keyof Omit<Config, "autoPromote">, Range>;
};

const KNOBS: Array<{
  key: keyof Omit<Config, "autoPromote">;
  labelKey:
    | "autoSuggest.cveAgeDays"
    | "autoSuggest.cveMinDevices"
    | "autoSuggest.deactivationWindowDays"
    | "autoSuggest.incidentOpenHours";
  hintKey:
    | "autoSuggest.cveAgeDays.hint"
    | "autoSuggest.cveMinDevices.hint"
    | "autoSuggest.deactivationWindowDays.hint"
    | "autoSuggest.incidentOpenHours.hint";
}> = [
  {
    key: "cveAgeDays",
    labelKey: "autoSuggest.cveAgeDays",
    hintKey: "autoSuggest.cveAgeDays.hint",
  },
  {
    key: "cveMinDevices",
    labelKey: "autoSuggest.cveMinDevices",
    hintKey: "autoSuggest.cveMinDevices.hint",
  },
  {
    key: "deactivationWindowDays",
    labelKey: "autoSuggest.deactivationWindowDays",
    hintKey: "autoSuggest.deactivationWindowDays.hint",
  },
  {
    key: "incidentOpenHours",
    labelKey: "autoSuggest.incidentOpenHours",
    hintKey: "autoSuggest.incidentOpenHours.hint",
  },
];

export function AutoSuggestPanel() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/config/auto-suggest", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Loaded;
      setLoaded(j);
      setDraft(j.config);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/config/auto-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { config: Config };
      setDraft(j.config);
      if (loaded) setLoaded({ ...loaded, config: j.config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (!loaded) return;
    setDraft(loaded.defaults);
  };

  const dirty =
    !!loaded &&
    !!draft &&
    (KNOBS.some((k) => draft[k.key] !== loaded.config[k.key]) ||
      draft.autoPromote !== loaded.config.autoPromote);

  if (!loaded || !draft) {
    return (
      <Card>
        <div className="text-ink-3 text-sm flex items-center gap-2">
          {error ? (
            <>
              <AlertTriangle size={14} className="text-neg" /> {error}
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("autoSuggest.loading")}
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("autoSuggest.title")}
        subtitle={t("autoSuggest.subtitle")}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              <RotateCcw size={13} />
              {t("autoSuggest.reset")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <Check size={13} />
              ) : (
                <Save size={13} />
              )}
              {saved ? t("autoSuggest.saved") : t("autoSuggest.save")}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {KNOBS.map((k) => {
          const range = loaded.ranges[k.key];
          const value = draft[k.key];
          return (
            <div
              key={k.key}
              className="rounded-md border border-border bg-surface-1 p-4"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-[13px] font-semibold text-ink-1">
                  {t(k.labelKey)}
                </div>
                <div className="text-[14px] font-semibold tabular text-council-strong">
                  {value}
                  <span className="text-[10px] text-ink-3 ms-1 uppercase tracking-[0.05em]">
                    {range.unit}
                  </span>
                </div>
              </div>
              <p className="text-[11.5px] text-ink-3 leading-relaxed mb-3">
                {t(k.hintKey)}
              </p>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(e) =>
                  setDraft({ ...draft, [k.key]: Number(e.target.value) })
                }
                className="w-full accent-council-strong"
              />
              <div className="flex justify-between text-[10.5px] text-ink-3 tabular mt-1">
                <span>
                  {range.min} {range.unit}
                </span>
                <span>
                  {range.max} {range.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-promote toggle */}
      <div className="mt-5 rounded-md border border-border bg-surface-1 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoPromote}
            onChange={(e) =>
              setDraft({ ...draft, autoPromote: e.target.checked })
            }
            className="mt-1 h-4 w-4 accent-council-strong"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink-1">
              {t("autoSuggest.autoPromote.title")}
            </div>
            <p className="text-[11.5px] text-ink-3 leading-relaxed mt-0.5">
              {t("autoSuggest.autoPromote.hint")}
            </p>
          </div>
        </label>
      </div>

      {error ? (
        <div className="mt-3 text-[12px] text-neg flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </div>
      ) : null}
    </Card>
  );
}
