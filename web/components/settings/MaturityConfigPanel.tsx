"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Check, AlertTriangle, Scale } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

type WeightsKey =
  | "secureScore"
  | "identity"
  | "device"
  | "data"
  | "threat"
  | "compliance";
const KEYS: WeightsKey[] = [
  "secureScore",
  "identity",
  "device",
  "data",
  "threat",
  "compliance",
];
const LABEL_KEYS: Record<WeightsKey,
  | "maturityCfg.w.secureScore"
  | "maturityCfg.w.identity"
  | "maturityCfg.w.device"
  | "maturityCfg.w.data"
  | "maturityCfg.w.threat"
  | "maturityCfg.w.compliance"> = {
  secureScore: "maturityCfg.w.secureScore",
  identity: "maturityCfg.w.identity",
  device: "maturityCfg.w.device",
  data: "maturityCfg.w.data",
  threat: "maturityCfg.w.threat",
  compliance: "maturityCfg.w.compliance",
};

export function MaturityConfigPanel() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [loaded, setLoaded] = useState<{
    config: { weights: Record<string, number>; target: number };
    defaults: { weights: Record<string, number>; target: number };
  } | null>(null);
  const [weights, setWeights] = useState<Record<WeightsKey, number>>({
    secureScore: 25,
    identity: 20,
    device: 15,
    data: 15,
    threat: 15,
    compliance: 10,
  });
  const [target, setTarget] = useState(75);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.getMaturityConfig();
    setLoaded(r);
    // Stored as fractions (0..1). UI uses integer percentages.
    const ws = r.config.weights;
    setWeights({
      secureScore: Math.round((ws.secureScore ?? 0.25) * 100),
      identity: Math.round((ws.identity ?? 0.2) * 100),
      device: Math.round((ws.device ?? 0.15) * 100),
      data: Math.round((ws.data ?? 0.15) * 100),
      threat: Math.round((ws.threat ?? 0.15) * 100),
      compliance: Math.round((ws.compliance ?? 0.1) * 100),
    });
    setTarget(r.config.target);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const total = KEYS.reduce((n, k) => n + (weights[k] ?? 0), 0);
  const balanced = total === 100;

  /** Scale every weight proportionally so the sum becomes exactly 100. */
  const normalize = () => {
    if (total === 0) return;
    const scaled: Record<WeightsKey, number> = { ...weights };
    for (const k of KEYS) scaled[k] = Math.round(((weights[k] ?? 0) / total) * 100);
    // Rounding can leave us at 99 or 101 — push the rounding delta onto the largest weight.
    const sum = KEYS.reduce((n, k) => n + scaled[k], 0);
    const drift = 100 - sum;
    if (drift !== 0) {
      const max = KEYS.reduce((a, b) => (scaled[a] >= scaled[b] ? a : b));
      scaled[max] = Math.max(0, scaled[max] + drift);
    }
    setWeights(scaled);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const fractions: Record<string, number> = {};
      for (const k of KEYS) fractions[k] = (weights[k] ?? 0) / 100;
      await api.saveMaturityConfig({ weights: fractions, target });
      setToast(t("maturityCfg.saved"));
      setTimeout(() => setToast(null), 4000);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      await api.resetMaturityConfig();
      await load();
      setToast(t("maturityCfg.saved"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <Card>
        <div className="text-ink-3 text-[13px]">{t("state.loading")}</div>
      </Card>
    );
  }

  const defaultStr = KEYS.map(
    (k) => `${t(LABEL_KEYS[k])} ${fmt(Math.round((loaded.defaults.weights[k] ?? 0) * 100))}%`,
  ).join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title={t("maturityCfg.title")} subtitle={t("maturityCfg.subtitle")} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-ink-1">{t(LABEL_KEYS[k])}</span>
                <span className="text-[12.5px] tabular text-ink-2 font-semibold">
                  {fmt(weights[k])}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={weights[k]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))
                }
                className="w-full accent-[var(--council-primary-strong)]"
              />
            </div>
          ))}
        </div>

        <div
          className={`mt-4 flex items-center justify-between gap-3 text-[12px] border-t pt-3 ${
            balanced ? "border-border text-ink-2" : "border-warn/40 text-warn"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {balanced ? (
              <Check size={13} className="text-pos" />
            ) : (
              <AlertTriangle size={13} />
            )}
            <span className="text-ink-2">{t("maturityCfg.weightsTotal")}:</span>
            <span
              className={`tabular font-semibold ${
                balanced ? "text-pos" : "text-warn"
              }`}
            >
              {fmt(total)}%
            </span>
            {!balanced ? (
              <span className="text-ink-3">
                · {t("maturityCfg.mustBe100", { diff: fmt(100 - total) })}
              </span>
            ) : null}
          </span>
          {!balanced ? (
            <button
              onClick={normalize}
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px]"
            >
              <Scale size={11} />
              {t("maturityCfg.normalize")}
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] text-ink-2 font-semibold">
              {t("maturityCfg.target")}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-border bg-surface-1 text-[13px] tabular"
            />
            <span className="text-[11.5px] text-ink-3">{t("maturityCfg.targetHelp")}</span>
          </label>
        </div>

        <div className="mt-4 text-[11px] text-ink-3">
          {t("maturityCfg.defaults", { values: defaultStr })} ·
          <span className="ms-2">Target {fmt(loaded.defaults.target)}</span>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {toast ? (
            <span className="text-[12px] text-pos inline-flex items-center gap-1.5">
              <Check size={13} /> {toast}
            </span>
          ) : null}
          <button
            onClick={onReset}
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
          >
            <RotateCcw size={13} /> {t("maturityCfg.reset")}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !balanced}
            title={!balanced ? t("maturityCfg.saveBlocked") : undefined}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {t("maturityCfg.save")}
          </button>
        </div>
      </Card>
    </div>
  );
}
