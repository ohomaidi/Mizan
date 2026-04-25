"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

type SecureScoreControl = {
  id: string;
  title: string;
  category: string | null;
  service: string | null;
  observedOnTenants: number;
  averagePassRate: number | null;
};

type Clause = {
  id: string;
  ref: string;
  classRefs?: Array<"Governance" | "Operation" | "Assurance">;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  secureScoreControls: string[];
  weight: number;
};

type Loaded = {
  framework?: string;
  frameworkVersion: string;
  status?: "official" | "draft";
  draftNote?: string;
  clauses: Clause[];
  updatedAt?: string;
};

const inputClass =
  "w-full h-8 px-2.5 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[12.5px] outline-none focus:border-council-strong";

export function NesaMappingPanel() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Loaded | null>(null);
  const [registry, setRegistry] = useState<SecureScoreControl[]>([]);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Quick lookup of registry rows by id, for rendering chips with the
  // human title + live coverage % even when the operator hasn't seen
  // the picker yet.
  const registryById = useMemo(() => {
    const m = new Map<string, SecureScoreControl>();
    for (const c of registry) m.set(c.id, c);
    return m;
  }, [registry]);

  const load = async () => {
    try {
      const [m, r] = await Promise.all([
        api.getNesaMapping(),
        api.getSecureScoreControls().catch(() => ({ controls: [], total: 0 })),
      ]);
      setMapping(m.mapping);
      setRegistry(r.controls);
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
          subtitle={
            <span>
              {t("nesaCfg.subtitle")}
              {mapping.frameworkVersion ? (
                <span className="ms-2 text-ink-3">
                  · <span className="keep-ltr">{mapping.frameworkVersion}</span>
                </span>
              ) : null}
            </span>
          }
          right={
            <div className="text-[11.5px] tabular text-ink-3">
              {t("nesaCfg.totalWeight", { n: fmt(Math.round(totalWeight * 10) / 10) })}
            </div>
          }
        />
        {/* Draft-status banner — appears for any framework whose default
            catalog is flagged `status: "draft"` (currently Dubai ISR until
            the official PDF lands). Replaces operator confidence in the
            catalog with the explicit "this is a working approximation"
            message. Disappears the moment the catalog is stamped
            "official" by an admin save (or the seed default is updated
            to status="official"). */}
        {mapping.status === "draft" ? (
          <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-[12.5px] text-ink-1">
            <div className="font-semibold text-accent">
              {t("nesaCfg.draftBanner.title")}
            </div>
            {mapping.draftNote ? (
              <div className="text-ink-2 mt-1 text-[11.5px] leading-relaxed">
                {mapping.draftNote}
              </div>
            ) : null}
          </div>
        ) : null}
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
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {(c.classRefs ?? []).map((cls) => (
                  <span
                    key={cls}
                    className="text-[9.5px] uppercase tracking-[0.08em] font-semibold text-ink-2 border border-border rounded px-1.5 py-px shrink-0 keep-ltr"
                  >
                    {cls}
                  </span>
                ))}
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 keep-ltr min-w-0 truncate">
                  {c.ref || c.id}
                </div>
              </div>
              <button
                onClick={() => removeClause(i)}
                className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-neg shrink-0"
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
              <Field label={t("nesaCfg.coverage")}>
                <CoverageReadout
                  controls={c.secureScoreControls}
                  registry={registryById}
                />
              </Field>
            </div>
            {/* Evidence anchors — Microsoft Secure Score controls that
                evidence this clause. Replaces the legacy comma-typed
                text input with a searchable picker over the actual
                controls returned by the consented tenants. Each chip
                is removable; the picker drops when a control is
                selected. The id-only chips for non-Graph evidence
                (operator-typed) still show as a string with no
                metadata — those are typed via the "Custom..." button
                below if the registry doesn't carry the id. */}
            <div className="mt-3">
              <div className="text-[11px] text-ink-3 mb-1.5">
                {t("nesaCfg.controls")}
              </div>
              <ControlPicker
                value={c.secureScoreControls}
                registry={registry}
                registryById={registryById}
                onChange={(next) =>
                  setClause(i, { secureScoreControls: next })
                }
              />
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

// ────────────────────────────────────────────────────────────────────
// CoverageReadout — % pass-rate across the chosen controls + tenant
// fan-out. Reads from the registry the panel already loaded; no extra
// fetch. Empty-state and "no data observed" cases are distinguished
// — DESC's auditor cares about the difference.
// ────────────────────────────────────────────────────────────────────
function CoverageReadout({
  controls,
  registry,
}: {
  controls: string[];
  registry: Map<string, SecureScoreControl>;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();

  if (controls.length === 0) {
    return (
      <div className="text-[12.5px] text-ink-3">
        {t("nesaCfg.coverage.noControls")}
      </div>
    );
  }

  // Pass-rate roll-up across the registered controls. We ignore any id
  // the registry doesn't know about (operator-typed legacy IDs) and
  // surface the unmatched count separately so it's transparent.
  let matched = 0;
  let observedTenantUnion = 0;
  let weightedRate = 0;
  let weightSum = 0;
  for (const id of controls) {
    const r = registry.get(id);
    if (!r) continue;
    matched++;
    observedTenantUnion = Math.max(observedTenantUnion, r.observedOnTenants);
    if (r.averagePassRate !== null) {
      weightedRate += r.averagePassRate;
      weightSum += 1;
    }
  }

  if (matched === 0) {
    return (
      <div className="text-[12.5px] text-ink-3">
        {t("nesaCfg.coverage.notObserved")}
      </div>
    );
  }

  if (weightSum === 0) {
    return (
      <div className="text-[12.5px] text-ink-2">
        {t("nesaCfg.coverage.observedNoScore", {
          n: fmt(matched),
          total: fmt(controls.length),
        })}
      </div>
    );
  }

  const pct = Math.round((weightedRate / weightSum) * 100);
  const tone =
    pct >= 80 ? "text-pos" : pct >= 50 ? "text-ink-1" : "text-warn";
  return (
    <div className="text-[12.5px] flex items-baseline gap-2">
      <span className={`tabular font-semibold ${tone}`}>{pct}%</span>
      <span className="text-ink-3">
        {t("nesaCfg.coverage.acrossTenants", {
          n: fmt(observedTenantUnion),
        })}
      </span>
      {matched < controls.length ? (
        <span className="text-ink-3">
          {t("nesaCfg.coverage.unmatched", {
            n: fmt(controls.length - matched),
          })}
        </span>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// ControlPicker — chips for selected ids + a searchable dropdown over
// the live registry of every control the consented tenants have
// reported. Operators add/remove evidence anchors without typing IDs
// from memory. A "Custom..." action lets them attach an id the
// registry doesn't know about (e.g. a control DESC publishes after
// our last sync) — that chip carries no live coverage data.
// ────────────────────────────────────────────────────────────────────
function ControlPicker({
  value,
  registry,
  registryById,
  onChange,
}: {
  value: string[];
  registry: SecureScoreControl[];
  registryById: Map<string, SecureScoreControl>;
  onChange: (next: string[]) => void;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close picker when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = new Set(value);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return registry.slice(0, 60);
    const hits: SecureScoreControl[] = [];
    for (const r of registry) {
      if (
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.service ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q)
      ) {
        hits.push(r);
        if (hits.length >= 60) break;
      }
    }
    return hits;
  }, [registry, q]);

  const addControl = (id: string) => {
    if (!id || selected.has(id)) return;
    onChange([...value, id]);
    setQuery("");
    setCustomValue("");
    setCustomMode(false);
  };

  const removeControl = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Chip row — selected controls. Each chip = id + service/cat
          + remove button. Live pass-rate badge when the registry knows
          the control. */}
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-[11.5px] text-ink-3">
            {t("nesaCfg.picker.noneSelected")}
          </span>
        ) : (
          value.map((id) => {
            const r = registryById.get(id);
            const pr = r?.averagePassRate;
            const pct =
              pr !== null && pr !== undefined ? Math.round(pr * 100) : null;
            return (
              <div
                key={id}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-1 ps-2 pe-1 py-1"
              >
                <span className="text-[11px] font-mono keep-ltr text-ink-1">
                  {id}
                </span>
                {r?.service ? (
                  <span className="text-[9.5px] uppercase tracking-[0.06em] text-ink-3 keep-ltr">
                    {r.service}
                  </span>
                ) : null}
                {pct !== null ? (
                  <span
                    className={`text-[10px] tabular font-semibold ${
                      pct >= 80
                        ? "text-pos"
                        : pct >= 50
                          ? "text-ink-2"
                          : "text-warn"
                    }`}
                  >
                    {pct}%
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-3">—</span>
                )}
                <button
                  type="button"
                  onClick={() => removeControl(id)}
                  className="h-5 w-5 grid place-items-center rounded-sm text-ink-3 hover:text-neg hover:bg-surface-2"
                  aria-label={`Remove ${id}`}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Picker popover — opens on click of "Add control...", closes on
          select / outside-click / Esc. Search filters by id/title/
          service/category, capped at 60 results so big tenants stay
          responsive. */}
      <div className="relative" ref={popoverRef}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setCustomMode(false);
            }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-border text-[11.5px] text-ink-2 hover:text-ink-1"
          >
            <Plus size={11} />
            {t("nesaCfg.picker.addControl")}
            <span className="text-ink-3 ms-1">
              ({fmt(registry.length)} {t("nesaCfg.picker.available")})
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomMode(true);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] text-ink-3 hover:text-ink-1"
          >
            {t("nesaCfg.picker.custom")}
          </button>
        </div>

        {open ? (
          <div className="absolute z-20 mt-1 w-[min(560px,100%)] rounded-md border border-border bg-surface-1 shadow-lg">
            {customMode ? (
              <div className="p-3 flex flex-col gap-2">
                <div className="text-[11.5px] text-ink-2">
                  {t("nesaCfg.picker.customLabel")}
                </div>
                <input
                  autoFocus
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addControl(customValue.trim());
                    if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder={t("nesaCfg.picker.customPlaceholder")}
                  className={`${inputClass} keep-ltr font-mono`}
                  dir="ltr"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className="h-7 px-2.5 rounded-md text-[11.5px] text-ink-3 hover:text-ink-1"
                  >
                    {t("nesaCfg.picker.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => addControl(customValue.trim())}
                    disabled={!customValue.trim()}
                    className="h-7 px-2.5 rounded-md bg-council-strong text-white text-[11.5px] font-semibold disabled:opacity-50"
                  >
                    {t("nesaCfg.picker.add")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-2 border-b border-border flex items-center gap-2">
                  <Search size={12} className="text-ink-3 shrink-0 ms-1" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("nesaCfg.picker.searchPlaceholder")}
                    className="flex-1 h-7 bg-transparent text-[12.5px] text-ink-1 outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-3 text-[11.5px] text-ink-3">
                      {t("nesaCfg.picker.noResults")}
                    </div>
                  ) : (
                    filtered.map((r) => {
                      const isSelected = selected.has(r.id);
                      const pr = r.averagePassRate;
                      const pct =
                        pr !== null && pr !== undefined
                          ? Math.round(pr * 100)
                          : null;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            if (!isSelected) addControl(r.id);
                            setOpen(false);
                          }}
                          disabled={isSelected}
                          className="w-full px-3 py-2 text-start hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed border-b border-border/50 last:border-b-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-mono keep-ltr text-ink-1 truncate">
                              {r.id}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {r.service ? (
                                <span className="text-[9.5px] uppercase tracking-[0.06em] text-ink-3 keep-ltr">
                                  {r.category ? `${r.category}/` : ""}
                                  {r.service}
                                </span>
                              ) : null}
                              {pct !== null ? (
                                <span
                                  className={`text-[10px] tabular font-semibold ${
                                    pct >= 80
                                      ? "text-pos"
                                      : pct >= 50
                                        ? "text-ink-2"
                                        : "text-warn"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-[11px] text-ink-2 mt-0.5">
                            {r.title}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="p-2 border-t border-border text-[10.5px] text-ink-3 flex items-center justify-between">
                  <span>
                    {t("nesaCfg.picker.showing", {
                      n: fmt(filtered.length),
                      total: fmt(registry.length),
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomMode(true)}
                    className="text-ink-2 hover:text-ink-1"
                  >
                    {t("nesaCfg.picker.customLink")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
