"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

type Clause = {
  id: string;
  ref: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  secureScoreControls: string[];
  weight: number;
};

type Loaded = { frameworkVersion: string; clauses: Clause[]; updatedAt?: string };

const inputClass =
  "w-full h-8 px-2.5 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[12.5px] outline-none focus:border-council-strong";

export function NesaMappingPanel() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api.getNesaMapping();
      setMapping(r.mapping);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setClause = (i: number, patch: Partial<Clause>) =>
    setMapping((m) =>
      m
        ? {
            ...m,
            clauses: m.clauses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
          }
        : m,
    );

  const removeClause = (i: number) =>
    setMapping((m) => (m ? { ...m, clauses: m.clauses.filter((_, idx) => idx !== i) } : m));

  const addClause = () =>
    setMapping((m) =>
      m
        ? {
            ...m,
            clauses: [
              ...m.clauses,
              {
                id: `NEW.${m.clauses.length + 1}`,
                ref: "",
                titleEn: "",
                titleAr: "",
                descriptionEn: "",
                descriptionAr: "",
                secureScoreControls: [],
                weight: 0,
              },
            ],
          }
        : m,
    );

  const onSave = async () => {
    if (!mapping) return;
    setSaving(true);
    setBanner(null);
    try {
      const r = await api.saveNesaMapping(mapping);
      setMapping(r.mapping as Loaded);
      setBanner(t("nesaCfg.saved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      const r = await api.resetNesaMapping();
      setMapping(r.mapping as Loaded);
      setBanner(t("nesaCfg.saved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!mapping) return null;

  const totalWeight = mapping.clauses.reduce((n, c) => n + (c.weight || 0), 0);

  return (
    <Card className="p-0">
      <div className="p-5 border-b border-border">
        <CardHeader
          title={t("nesaCfg.title")}
          subtitle={t("nesaCfg.subtitle")}
          right={
            <div className="text-[11.5px] tabular text-ink-3">
              {t("nesaCfg.totalWeight", { n: fmt(Math.round(totalWeight * 10) / 10) })}
            </div>
          }
        />
        {banner ? (
          <div className="mt-3 rounded-md border border-pos/40 bg-pos/10 px-3 py-2 text-[12.5px] text-ink-1">
            {banner}
          </div>
        ) : null}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {mapping.clauses.map((c, i) => (
          <div
            key={`${c.id}-${i}`}
            className="rounded-md border border-border bg-surface-2 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 keep-ltr">
                {c.ref || c.id}
              </div>
              <button
                onClick={() => removeClause(i)}
                className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-neg"
              >
                <Trash2 size={12} />
                {t("nesaCfg.removeClause")}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={locale === "ar" ? "العنوان (عربي)" : "Title (EN)"}>
                <input
                  value={locale === "ar" ? c.titleAr : c.titleEn}
                  onChange={(e) =>
                    setClause(
                      i,
                      locale === "ar"
                        ? { titleAr: e.target.value }
                        : { titleEn: e.target.value },
                    )
                  }
                  className={inputClass}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                />
              </Field>
              <Field label={locale === "ar" ? "العنوان (إنجليزي)" : "Title (AR)"}>
                <input
                  value={locale === "ar" ? c.titleEn : c.titleAr}
                  onChange={(e) =>
                    setClause(
                      i,
                      locale === "ar"
                        ? { titleEn: e.target.value }
                        : { titleAr: e.target.value },
                    )
                  }
                  className={inputClass}
                  dir={locale === "ar" ? "ltr" : "rtl"}
                />
              </Field>
              <Field label={t("nesaCfg.weight")}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={c.weight}
                  onChange={(e) => setClause(i, { weight: Number(e.target.value) })}
                  className={`${inputClass} tabular`}
                  dir="ltr"
                />
              </Field>
              <Field label={t("nesaCfg.controls")}>
                <input
                  value={c.secureScoreControls.join(", ")}
                  onChange={(e) =>
                    setClause(i, {
                      secureScoreControls: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className={`${inputClass} keep-ltr`}
                  dir="ltr"
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          onClick={addClause}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border text-[12.5px] text-ink-2 hover:text-ink-1 self-start"
        >
          <Plus size={12} />
          {t("nesaCfg.addClause")}
        </button>
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
        <button
          onClick={onReset}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-ink-1 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          {t("nesaCfg.reset")}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {t("nesaCfg.save")}
        </button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-ink-3">{label}</span>
      {children}
    </label>
  );
}
