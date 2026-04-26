"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

/**
 * Frameworks the Council can pick from. The list is shared with the
 * BrandingPanel — keeping both sources of truth identical avoids the
 * "what does each option mean?" confusion. Order: most-locally-relevant
 * first, then generic at the end.
 */
const FRAMEWORK_OPTIONS = [
  { id: "dubai-isr", labelKey: "branding.framework.dubai-isr" },
  { id: "nesa", labelKey: "branding.framework.nesa" },
  { id: "nca", labelKey: "branding.framework.nca" },
  { id: "isr", labelKey: "branding.framework.isr" },
  { id: "generic", labelKey: "branding.framework.generic" },
] as const;

type SecureScoreControl = {
  id: string;
  title: string;
  category: string | null;
  service: string | null;
  observedOnTenants: number;
  averagePassRate: number | null;
};

type CustomEvidence = {
  id: string;
  label: string;
  manualPassRate: number;
  reviewedAt: string;
  reviewerNote?: string;
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
  customEvidence?: CustomEvidence[];
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
  // Active framework — read from branding so the hero block matches
  // whatever the deployment selected at /setup. Switching it in the
  // hero selector below writes back to branding.frameworkId.
  const [activeFrameworkId, setActiveFrameworkId] = useState<string>("generic");
  const [switchingFramework, setSwitchingFramework] = useState(false);
  // Compliance config — target % + unscored-clause treatment. Edits save
  // immediately; no separate Save button in the hero strip.
  const [complianceCfg, setComplianceCfg] = useState<{
    target: number;
    unscoredTreatment: "skip" | "zero";
  }>({ target: 70, unscoredTreatment: "skip" });
  const [savingCfg, setSavingCfg] = useState(false);

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
      const [m, r, b, cfg] = await Promise.all([
        api.getNesaMapping(),
        api.getSecureScoreControls().catch(() => ({ controls: [], total: 0 })),
        api.getBranding().catch(() => null),
        api.getComplianceConfig().catch(() => null),
      ]);
      setMapping(m.mapping);
      setRegistry(r.controls);
      if (b?.branding?.frameworkId) setActiveFrameworkId(b.branding.frameworkId);
      if (cfg?.config) {
        setComplianceCfg({
          target: cfg.config.target,
          unscoredTreatment: cfg.config.unscoredTreatment,
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveComplianceCfg = async (patch: {
    target?: number;
    unscoredTreatment?: "skip" | "zero";
  }) => {
    setSavingCfg(true);
    try {
      const r = await api.saveComplianceConfig(patch);
      const c = (r as { config: { target: number; unscoredTreatment: "skip" | "zero" } }).config;
      setComplianceCfg({
        target: c.target,
        unscoredTreatment: c.unscoredTreatment,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingCfg(false);
    }
  };

  /**
   * Switch the active regulatory framework. Updates `branding.frameworkId`,
   * which is the single source of truth for which catalog the dashboard
   * surfaces — `getActiveComplianceMapping()` reads from this. After save,
   * we reload so the catalog/registry/coverage all repopulate against the
   * new framework's storage key (e.g. switching from Dubai ISR → NESA
   * surfaces NESA's clauses, leaving the ISR edits intact under
   * `isr.mapping` for if/when the operator switches back).
   *
   * Choosing "generic" hides framework-related UI everywhere — entity
   * overview Framework Compliance card, KPI tile, entity grid column.
   */
  const onSwitchFramework = async (next: string) => {
    if (next === activeFrameworkId) return;
    setSwitchingFramework(true);
    setBanner(null);
    try {
      await api.saveBranding({
        frameworkId: next as
          | "nesa"
          | "dubai-isr"
          | "nca"
          | "isr"
          | "generic",
      });
      setActiveFrameworkId(next);
      // Reload mapping (which now points at the new framework's catalog).
      const m = await api.getNesaMapping();
      setMapping(m.mapping);
      setBanner(t("nesaCfg.frameworkSwitched"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSwitchingFramework(false);
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
  const isGeneric = activeFrameworkId === "generic";

  return (
    <div className="flex flex-col gap-4">
      {/* Active-framework HERO. Sits at the very top of the Compliance
          Framework tab so the operator + any reviewer sees immediately
          which regulation is active for this deployment. The selector
          on the right lets the Council switch frameworks (writing back
          to branding.frameworkId) — choosing "Generic / no framework"
          hides framework UI everywhere in the dashboard. */}
      <Card>
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className={`shrink-0 h-12 w-12 grid place-items-center rounded-lg ${
              isGeneric
                ? "bg-surface-3 text-ink-3"
                : "bg-council-strong/15 text-council-strong"
            }`}
          >
            <ShieldCheck size={22} strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3 font-semibold">
              {t("nesaCfg.hero.eyebrow")}
            </div>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h2 className="text-[20px] leading-tight font-semibold text-ink-1 keep-ltr">
                {t(
                  `branding.framework.${activeFrameworkId}` as
                    | "branding.framework.nesa"
                    | "branding.framework.dubai-isr"
                    | "branding.framework.nca"
                    | "branding.framework.isr"
                    | "branding.framework.generic",
                )}
              </h2>
              {!isGeneric && mapping.frameworkVersion ? (
                <span className="text-[12px] text-ink-2 keep-ltr">
                  {mapping.frameworkVersion}
                </span>
              ) : null}
              {!isGeneric ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.06em] font-semibold text-pos border border-pos/40 bg-pos/10 rounded px-1.5 py-px">
                  <CheckCircle2 size={11} aria-hidden="true" />
                  {t("nesaCfg.hero.activeBadge")}
                </span>
              ) : null}
            </div>
            <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed max-w-3xl">
              {isGeneric
                ? t("nesaCfg.hero.bodyGeneric")
                : t(
                    `nesaCfg.hero.body.${activeFrameworkId}` as
                      | "nesaCfg.hero.body.nesa"
                      | "nesaCfg.hero.body.dubai-isr"
                      | "nesaCfg.hero.body.nca"
                      | "nesaCfg.hero.body.isr",
                  )}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <label
              htmlFor="framework-selector"
              className="text-[11px] text-ink-3"
            >
              {t("nesaCfg.hero.changeLabel")}
            </label>
            <select
              id="framework-selector"
              value={activeFrameworkId}
              onChange={(e) => onSwitchFramework(e.target.value)}
              disabled={switchingFramework}
              className="h-9 px-3 pe-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12.5px] outline-none focus:border-council-strong"
            >
              {FRAMEWORK_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.labelKey as
                    | "branding.framework.nesa"
                    | "branding.framework.dubai-isr"
                    | "branding.framework.nca"
                    | "branding.framework.isr"
                    | "branding.framework.generic")}
                </option>
              ))}
            </select>
            {switchingFramework ? (
              <div className="text-[11px] text-ink-3 inline-flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
                {t("nesaCfg.hero.switching")}
              </div>
            ) : null}
          </div>
        </div>
        {/* Scoring config — only meaningful when a framework is active.
            Two knobs: target % (Council pass-mark — entities below
            are flagged on the grid + KPI) and unscored-clause
            treatment (skip = exclude from denominator, zero = count
            as 0%). Saves on change. */}
        {!isGeneric ? (
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-ink-3 block mb-1">
                {t("nesaCfg.cfg.targetLabel")}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={complianceCfg.target}
                  onChange={(e) =>
                    setComplianceCfg((c) => ({
                      ...c,
                      target: Number(e.target.value),
                    }))
                  }
                  onMouseUp={() =>
                    saveComplianceCfg({ target: complianceCfg.target })
                  }
                  onTouchEnd={() =>
                    saveComplianceCfg({ target: complianceCfg.target })
                  }
                  className="flex-1 accent-council-strong"
                />
                <span className="tabular text-[14px] font-semibold text-ink-1 w-12 text-end">
                  {fmt(complianceCfg.target)}%
                </span>
              </div>
              <div className="text-[10.5px] text-ink-3 mt-1">
                {t("nesaCfg.cfg.targetHelp")}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-ink-3 block mb-1">
                {t("nesaCfg.cfg.treatmentLabel")}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    saveComplianceCfg({ unscoredTreatment: "skip" })
                  }
                  className={`flex-1 h-9 px-3 rounded-md border text-[12px] ${
                    complianceCfg.unscoredTreatment === "skip"
                      ? "border-council-strong bg-council-strong/10 text-council-strong"
                      : "border-border bg-surface-1 text-ink-2 hover:text-ink-1"
                  }`}
                  disabled={savingCfg}
                >
                  {t("nesaCfg.cfg.treatmentSkip")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    saveComplianceCfg({ unscoredTreatment: "zero" })
                  }
                  className={`flex-1 h-9 px-3 rounded-md border text-[12px] ${
                    complianceCfg.unscoredTreatment === "zero"
                      ? "border-council-strong bg-council-strong/10 text-council-strong"
                      : "border-border bg-surface-1 text-ink-2 hover:text-ink-1"
                  }`}
                  disabled={savingCfg}
                >
                  {t("nesaCfg.cfg.treatmentZero")}
                </button>
              </div>
              <div className="text-[10.5px] text-ink-3 mt-1 leading-relaxed">
                {complianceCfg.unscoredTreatment === "skip"
                  ? t("nesaCfg.cfg.treatmentSkipHelp")
                  : t("nesaCfg.cfg.treatmentZeroHelp")}
              </div>
            </div>
          </div>
        ) : null}

        {/* Generic-mode helper: explains what's hidden right now and how
            to bring it back. Replaces the catalog editor below since
            there's no catalog to edit when no framework is selected. */}
        {isGeneric ? (
          <div className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-[12.5px] text-ink-2 leading-relaxed">
            <div className="font-semibold text-ink-1 mb-1">
              {t("nesaCfg.hero.genericHidden.title")}
            </div>
            {t("nesaCfg.hero.genericHidden.body")}
          </div>
        ) : null}
      </Card>

      {/* Catalog editor — only when a real framework is selected. */}
      {isGeneric ? null : (
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
                  customEvidence={c.customEvidence ?? []}
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

            {/* Custom evidence — operator-managed anchors for ISR
                domains Microsoft can't see (BCP, Physical, HR) and
                for any future ISR sub-control whose evidence lives
                outside the Microsoft estate. Each anchor carries a
                manually-set pass rate the Council reviews
                periodically; if reviewedAt is older than 90 days the
                chip shows a stale-review badge. */}
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] text-ink-3">
                  {t("nesaCfg.custom.title")}
                </div>
                <span className="text-[10.5px] text-ink-3">
                  {t("nesaCfg.custom.subtitle")}
                </span>
              </div>
              <CustomEvidenceList
                value={c.customEvidence ?? []}
                onChange={(next) =>
                  setClause(i, { customEvidence: next })
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
      )}
    </div>
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
  customEvidence,
  registry,
}: {
  controls: string[];
  customEvidence: CustomEvidence[];
  registry: Map<string, SecureScoreControl>;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();

  if (controls.length === 0 && customEvidence.length === 0) {
    return (
      <div className="text-[12.5px] text-ink-3">
        {t("nesaCfg.coverage.noControls")}
      </div>
    );
  }

  // Pass-rate roll-up: combine Microsoft Secure Score evidence (live
  // pass-rates from the registry) with operator-managed custom
  // evidence (manualPassRate set by the Council). Both are weighted
  // equally — each anchor contributes one sample to the average,
  // regardless of source. This is intentional: a 70% manual rating
  // on the entity's BCP drill is just as meaningful as a 70% Secure
  // Score rating on MFA coverage when rolling up an ISR domain.
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

  for (const ev of customEvidence) {
    weightedRate += (ev.manualPassRate ?? 0) / 100;
    weightSum += 1;
  }

  if (matched === 0 && customEvidence.length === 0) {
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
    <div className="text-[12.5px] flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`tabular font-semibold ${tone}`}>{pct}%</span>
      {observedTenantUnion > 0 ? (
        <span className="text-ink-3">
          {t("nesaCfg.coverage.acrossTenants", {
            n: fmt(observedTenantUnion),
          })}
        </span>
      ) : null}
      {customEvidence.length > 0 ? (
        <span className="text-ink-3">
          {t("nesaCfg.coverage.customEvidenceCount", {
            n: fmt(customEvidence.length),
          })}
        </span>
      ) : null}
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
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterService, setFilterService] = useState<string>("");
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Build the filter dropdown options from whatever the registry
  // actually contains. Microsoft has rebranded categories + service
  // labels several times so we don't hard-code an enum — we discover
  // what's there and let the operator narrow.
  const { categoryOptions, serviceOptions } = useMemo(() => {
    const cats = new Set<string>();
    const svcs = new Set<string>();
    for (const r of registry) {
      if (r.category) cats.add(r.category);
      if (r.service) svcs.add(r.service);
    }
    return {
      categoryOptions: Array.from(cats).sort(),
      serviceOptions: Array.from(svcs).sort(),
    };
  }, [registry]);

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
    const matchesFilter = (r: SecureScoreControl) =>
      (!filterCategory || r.category === filterCategory) &&
      (!filterService || r.service === filterService);

    if (!q) {
      const out: SecureScoreControl[] = [];
      for (const r of registry) {
        if (matchesFilter(r)) {
          out.push(r);
          if (out.length >= 60) break;
        }
      }
      return out;
    }
    const hits: SecureScoreControl[] = [];
    for (const r of registry) {
      if (!matchesFilter(r)) continue;
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
                {/* Category + service filter dropdowns. Drawn from
                    whatever the registry actually contains so the
                    options stay current as Microsoft adds/renames
                    services. Setting either narrows the result list
                    in addition to the text search above. */}
                <div className="px-2 py-1.5 border-b border-border flex items-center gap-2 text-[11.5px]">
                  <span className="text-ink-3 shrink-0">
                    {t("nesaCfg.picker.filterBy")}
                  </span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-6 px-1.5 rounded border border-border bg-surface-2 text-ink-1 text-[11.5px]"
                  >
                    <option value="">
                      {t("nesaCfg.picker.allCategories")}
                    </option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className="h-6 px-1.5 rounded border border-border bg-surface-2 text-ink-1 text-[11.5px]"
                  >
                    <option value="">
                      {t("nesaCfg.picker.allServices")}
                    </option>
                    {serviceOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {(filterCategory || filterService) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterCategory("");
                        setFilterService("");
                      }}
                      className="ms-auto text-ink-3 hover:text-ink-1 inline-flex items-center gap-1"
                    >
                      <X size={11} /> {t("nesaCfg.picker.clearFilters")}
                    </button>
                  )}
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

// ────────────────────────────────────────────────────────────────────
// CustomEvidenceList — operator-managed evidence anchors for a clause.
// Each row shows the label + manual pass-rate slider + last-reviewed
// date + a stale-review badge if reviewedAt is older than 90 days.
// "Add evidence" opens an inline editor for new anchors. Edit + delete
// are inline.
// ────────────────────────────────────────────────────────────────────
function CustomEvidenceList({
  value,
  onChange,
}: {
  value: CustomEvidence[];
  onChange: (next: CustomEvidence[]) => void;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftRate, setDraftRate] = useState(0);
  const [draftDate, setDraftDate] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const startEdit = (i: number) => {
    const ev = value[i];
    setEditingIdx(i);
    setDraftLabel(ev.label);
    setDraftRate(ev.manualPassRate);
    setDraftDate(ev.reviewedAt);
    setDraftNote(ev.reviewerNote ?? "");
  };

  const startAdd = () => {
    setEditingIdx(value.length);
    setDraftLabel("");
    setDraftRate(0);
    setDraftDate(new Date().toISOString().slice(0, 10));
    setDraftNote("");
  };

  const cancelEdit = () => {
    setEditingIdx(null);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    if (!draftLabel.trim()) return;
    const next = [...value];
    const existing = next[editingIdx];
    const evidence: CustomEvidence = {
      // Keep id stable across edits; generate from the label for new
      // entries (operator can override later by editing the saved file).
      id:
        existing?.id ??
        (draftLabel
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || `custom-${Date.now()}`),
      label: draftLabel.trim(),
      manualPassRate: Math.max(0, Math.min(100, Math.round(draftRate))),
      reviewedAt: draftDate || new Date().toISOString().slice(0, 10),
      reviewerNote: draftNote.trim() || undefined,
    };
    next[editingIdx] = evidence;
    onChange(next);
    setEditingIdx(null);
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  // Compute "stale" = reviewedAt older than 90 days. Defensive parse
  // — invalid dates sort as never-reviewed.
  const isStale = (iso: string): boolean => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return true;
    return Date.now() - t > 90 * 24 * 3600 * 1000;
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && editingIdx === null ? (
        <div className="text-[11.5px] text-ink-3">
          {t("nesaCfg.custom.empty")}
        </div>
      ) : null}

      {value.map((ev, i) => {
        if (editingIdx === i) {
          return (
            <CustomEvidenceEditor
              key={`edit-${i}`}
              draftLabel={draftLabel}
              draftRate={draftRate}
              draftDate={draftDate}
              draftNote={draftNote}
              setDraftLabel={setDraftLabel}
              setDraftRate={setDraftRate}
              setDraftDate={setDraftDate}
              setDraftNote={setDraftNote}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          );
        }
        const stale = isStale(ev.reviewedAt);
        const tone =
          ev.manualPassRate >= 80
            ? "text-pos"
            : ev.manualPassRate >= 50
              ? "text-ink-1"
              : "text-warn";
        return (
          <div
            key={ev.id}
            className="rounded border border-border bg-surface-1 p-2.5 flex items-start gap-2.5"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[12.5px] tabular font-semibold shrink-0 ${tone}`}
                >
                  {fmt(ev.manualPassRate)}%
                </span>
                <span className="text-[12.5px] text-ink-1 truncate">
                  {ev.label}
                </span>
                {stale ? (
                  <span className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-warn border border-warn/40 bg-warn/10 rounded px-1.5 py-px">
                    {t("nesaCfg.custom.stale")}
                  </span>
                ) : null}
              </div>
              <div className="text-[10.5px] text-ink-3 mt-0.5 keep-ltr">
                {t("nesaCfg.custom.reviewedAt", { date: ev.reviewedAt })}
                {ev.reviewerNote ? (
                  <span className="ms-2 text-ink-2">— {ev.reviewerNote}</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="h-7 px-2 rounded text-[11.5px] text-ink-2 hover:text-ink-1 hover:bg-surface-2"
              >
                {t("nesaCfg.custom.edit")}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-7 w-7 grid place-items-center rounded text-ink-3 hover:text-neg hover:bg-surface-2"
                aria-label="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}

      {editingIdx === value.length ? (
        <CustomEvidenceEditor
          draftLabel={draftLabel}
          draftRate={draftRate}
          draftDate={draftDate}
          draftNote={draftNote}
          setDraftLabel={setDraftLabel}
          setDraftRate={setDraftRate}
          setDraftDate={setDraftDate}
          setDraftNote={setDraftNote}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-border text-[11.5px] text-ink-2 hover:text-ink-1 self-start"
        >
          <Plus size={11} />
          {t("nesaCfg.custom.add")}
        </button>
      )}
    </div>
  );
}

function CustomEvidenceEditor({
  draftLabel,
  draftRate,
  draftDate,
  draftNote,
  setDraftLabel,
  setDraftRate,
  setDraftDate,
  setDraftNote,
  onSave,
  onCancel,
}: {
  draftLabel: string;
  draftRate: number;
  draftDate: string;
  draftNote: string;
  setDraftLabel: (s: string) => void;
  setDraftRate: (n: number) => void;
  setDraftDate: (s: string) => void;
  setDraftNote: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded border border-accent/40 bg-accent/5 p-3 flex flex-col gap-2">
      <input
        autoFocus
        value={draftLabel}
        onChange={(e) => setDraftLabel(e.target.value)}
        placeholder={t("nesaCfg.custom.labelPlaceholder")}
        className={inputClass}
        maxLength={160}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-ink-3">
            {t("nesaCfg.custom.passRate")}: {draftRate}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draftRate}
            onChange={(e) => setDraftRate(Number(e.target.value))}
            className="accent-council-strong"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] text-ink-3">
            {t("nesaCfg.custom.reviewedDateLabel")}
          </span>
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className={`${inputClass} keep-ltr`}
            dir="ltr"
          />
        </label>
      </div>
      <textarea
        value={draftNote}
        onChange={(e) => setDraftNote(e.target.value)}
        placeholder={t("nesaCfg.custom.notePlaceholder")}
        rows={2}
        maxLength={500}
        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[12.5px] outline-none focus:border-council-strong resize-y"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-7 px-2.5 rounded-md text-[11.5px] text-ink-3 hover:text-ink-1"
        >
          {t("nesaCfg.picker.cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draftLabel.trim()}
          className="h-7 px-3 rounded-md bg-council-strong text-white text-[11.5px] font-semibold disabled:opacity-50"
        >
          {t("nesaCfg.custom.save")}
        </button>
      </div>
    </div>
  );
}
