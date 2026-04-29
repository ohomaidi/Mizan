"use client";

import { useState } from "react";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Custom KPI builder — operator-defined scorecard KPIs.
 *
 * Two formula shapes supported in v2.7.0:
 *   - signalNumber: pluck a numeric field from one signal payload.
 *   - ratio: divide one signalNumber by another (optionally ×100).
 *
 * Common signals are presented as a dropdown (the same set the
 * server-side `parseFormula()` allows). Field path is free-text
 * with a hint about dot-paths. Save → POST → returns the row, the
 * parent page refreshes its catalog and the new KPI is immediately
 * pin-able.
 *
 * v2.7.0.
 */

type FormulaKind = "signalNumber" | "ratio";

const SIGNAL_OPTIONS = [
  "incidents",
  "vulnerabilities",
  "devices",
  "riskyUsers",
  "pimSprawl",
  "sensitivityLabels",
  "retentionLabels",
  "dlpAlerts",
  "irmAlerts",
  "commCompAlerts",
  "subjectRightsRequests",
  "secureScore",
  "conditionalAccess",
  "attackSimulations",
  "dfiSensorHealth",
  "labelAdoption",
  "advancedHunting",
  "threatIntelligence",
  "sharepointSettings",
  "workloadCoverage",
];

export function CustomKpiBuilderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState<"percent" | "count" | "hours" | "boolean">(
    "count",
  );
  const [direction, setDirection] = useState<"higherBetter" | "lowerBetter">(
    "higherBetter",
  );
  const [target, setTarget] = useState("0");
  const [formulaKind, setFormulaKind] = useState<FormulaKind>("signalNumber");
  // signalNumber state
  const [snSignal, setSnSignal] = useState("incidents");
  const [snField, setSnField] = useState("active");
  // ratio state
  const [numSignal, setNumSignal] = useState("devices");
  const [numField, setNumField] = useState("compliant");
  const [denSignal, setDenSignal] = useState("devices");
  const [denField, setDenField] = useState("total");
  const [asPercent, setAsPercent] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setLabel("");
    setDescription("");
    setUnit("count");
    setDirection("higherBetter");
    setTarget("0");
    setFormulaKind("signalNumber");
    setSnSignal("incidents");
    setSnField("active");
    setNumSignal("devices");
    setNumField("compliant");
    setDenSignal("devices");
    setDenField("total");
    setAsPercent(true);
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (label.trim().length < 2) {
      setError(t("custom.kpi.error.label"));
      return;
    }
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum)) {
      setError(t("custom.kpi.error.target"));
      return;
    }
    const formula =
      formulaKind === "signalNumber"
        ? {
            kind: "signalNumber" as const,
            signal: snSignal,
            field: snField.trim(),
          }
        : {
            kind: "ratio" as const,
            numerator: { signal: numSignal, field: numField.trim() },
            denominator: { signal: denSignal, field: denField.trim() },
            asPercent,
          };

    setSaving(true);
    try {
      const r = await fetch("/api/scorecard/custom-kpis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          description: description.trim() || undefined,
          unit,
          direction,
          target: targetNum,
          formula,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${r.status}`);
      }
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t("custom.kpi.title")}
      onClose={onClose}
      size="wide"
    >
      <div className="flex flex-col gap-4 text-[13px]">
        <Field label={t("custom.kpi.field.label")}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
          />
        </Field>
        <Field label={t("custom.kpi.field.description")} optional>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t("custom.kpi.field.unit")}>
            <select
              value={unit}
              onChange={(e) =>
                setUnit(e.target.value as typeof unit)
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
            >
              <option value="count">{t("custom.kpi.unit.count")}</option>
              <option value="percent">{t("custom.kpi.unit.percent")}</option>
              <option value="hours">{t("custom.kpi.unit.hours")}</option>
              <option value="boolean">{t("custom.kpi.unit.boolean")}</option>
            </select>
          </Field>
          <Field label={t("custom.kpi.field.direction")}>
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as typeof direction)
              }
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
            >
              <option value="higherBetter">
                {t("custom.kpi.dir.higherBetter")}
              </option>
              <option value="lowerBetter">
                {t("custom.kpi.dir.lowerBetter")}
              </option>
            </select>
          </Field>
          <Field label={t("custom.kpi.field.target")}>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1 tabular"
            />
          </Field>
        </div>

        <div className="rounded-md border border-border bg-surface-1 p-4 mt-2">
          <div className="text-[12.5px] font-semibold text-ink-1 mb-2">
            {t("custom.kpi.formula.title")}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-1.5 text-[12.5px] cursor-pointer">
              <input
                type="radio"
                checked={formulaKind === "signalNumber"}
                onChange={() => setFormulaKind("signalNumber")}
                className="accent-council-strong"
              />
              {t("custom.kpi.formula.signalNumber")}
            </label>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] cursor-pointer">
              <input
                type="radio"
                checked={formulaKind === "ratio"}
                onChange={() => setFormulaKind("ratio")}
                className="accent-council-strong"
              />
              {t("custom.kpi.formula.ratio")}
            </label>
          </div>

          {formulaKind === "signalNumber" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("custom.kpi.signal")}>
                <select
                  value={snSignal}
                  onChange={(e) => setSnSignal(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
                >
                  {SIGNAL_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("custom.kpi.fieldPath")} hint={t("custom.kpi.fieldPath.hint")}>
                <input
                  value={snField}
                  onChange={(e) => setSnField(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1 tabular font-mono text-[12.5px]"
                />
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("custom.kpi.numerator.signal")}>
                  <select
                    value={numSignal}
                    onChange={(e) => setNumSignal(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
                  >
                    {SIGNAL_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("custom.kpi.numerator.field")}>
                  <input
                    value={numField}
                    onChange={(e) => setNumField(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1 tabular font-mono text-[12.5px]"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("custom.kpi.denominator.signal")}>
                  <select
                    value={denSignal}
                    onChange={(e) => setDenSignal(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1"
                  >
                    {SIGNAL_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("custom.kpi.denominator.field")}>
                  <input
                    value={denField}
                    onChange={(e) => setDenField(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1 tabular font-mono text-[12.5px]"
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-[12.5px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={asPercent}
                  onChange={(e) => setAsPercent(e.target.checked)}
                  className="accent-council-strong"
                />
                {t("custom.kpi.asPercent")}
              </label>
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-neg/40 bg-neg/10 p-2 text-[12px] text-ink-1 inline-flex items-center gap-1.5">
            <AlertTriangle size={12} /> {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-ink-1 text-[12.5px]"
          >
            {t("custom.kpi.cancel")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-medium disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            {t("custom.kpi.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
        {label}
        {optional ? (
          <span className="ms-1 text-ink-3/70 normal-case font-normal">
            (optional)
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <div className="text-[10.5px] text-ink-3">{hint}</div> : null}
    </div>
  );
}
