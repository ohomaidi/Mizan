"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Check, ExternalLink, FileText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

type DiscoveryStep = {
  titleEn: string;
  titleAr: string;
  whatEn: string;
  whatAr: string;
  whereEn: string;
  whereAr: string;
};
type DiscoveryTemplate = {
  councilEn: string;
  councilAr: string;
  taglineEn: string;
  taglineAr: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  overviewEn: string;
  overviewAr: string;
  steps: DiscoveryStep[];
  sendBackEn: string;
  sendBackAr: string;
  nextEn: string;
  nextAr: string;
  footerEn: string;
  footerAr: string;
  updatedAt?: string;
};

export function DiscoveryTemplatePanel() {
  const { t } = useI18n();
  const [tpl, setTpl] = useState<DiscoveryTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.getDiscoveryTemplate();
    setTpl(r.template as unknown as DiscoveryTemplate);
  }, []);
  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onSave = async () => {
    if (!tpl) return;
    setSaving(true);
    try {
      await api.saveDiscoveryTemplate(tpl as unknown as Record<string, unknown>);
      setToast(t("discoveryCfg.saved"));
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      const r = await api.resetDiscoveryTemplate();
      setTpl(r.template as unknown as DiscoveryTemplate);
      setToast(t("discoveryCfg.saved"));
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSaving(false);
    }
  };

  if (!tpl) return <Card><div className="text-ink-3 text-[13px]">{t("state.loading")}</div></Card>;

  const set = <K extends keyof DiscoveryTemplate>(k: K, v: DiscoveryTemplate[K]) =>
    setTpl((prev) => (prev ? { ...prev, [k]: v } : prev));

  const setStep = (i: number, patch: Partial<DiscoveryStep>) =>
    setTpl((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.slice();
      steps[i] = { ...steps[i], ...patch };
      return { ...prev, steps };
    });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title={t("discoveryCfg.title")}
          subtitle={t("discoveryCfg.subtitle")}
          right={
            <div className="flex items-center gap-2">
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
                <RotateCcw size={13} /> {t("discoveryCfg.reset")}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {t("discoveryCfg.save")}
              </button>
            </div>
          }
        />

        <Section title={t("discoveryCfg.section.brand")}>
          <Pair label={t("pdfCfg.field.councilEn")} value={tpl.councilEn} onChange={(v) => set("councilEn", v)} />
          <Pair ar label={t("pdfCfg.field.councilAr")} value={tpl.councilAr} onChange={(v) => set("councilAr", v)} />
          <Pair label={t("pdfCfg.field.taglineEn")} value={tpl.taglineEn} onChange={(v) => set("taglineEn", v)} />
          <Pair ar label={t("pdfCfg.field.taglineAr")} value={tpl.taglineAr} onChange={(v) => set("taglineAr", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.title")}>
          <Pair label={t("pdfCfg.field.titleEn")} value={tpl.titleEn} onChange={(v) => set("titleEn", v)} />
          <Pair ar label={t("pdfCfg.field.titleAr")} value={tpl.titleAr} onChange={(v) => set("titleAr", v)} />
          <Pair area label={t("pdfCfg.field.subtitleEn")} value={tpl.subtitleEn} onChange={(v) => set("subtitleEn", v)} />
          <Pair area ar label={t("pdfCfg.field.subtitleAr")} value={tpl.subtitleAr} onChange={(v) => set("subtitleAr", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.contact")}>
          <Pair label={t("pdfCfg.field.contactName")} value={tpl.contactName} onChange={(v) => set("contactName", v)} />
          <Pair label={t("pdfCfg.field.contactEmail")} value={tpl.contactEmail} onChange={(v) => set("contactEmail", v)} />
          <Pair label={t("discoveryCfg.field.phone")} value={tpl.contactPhone ?? ""} onChange={(v) => set("contactPhone", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.overview")}>
          <Pair area label={t("discoveryCfg.field.overviewEn")} value={tpl.overviewEn} onChange={(v) => set("overviewEn", v)} />
          <Pair area ar label={t("discoveryCfg.field.overviewAr")} value={tpl.overviewAr} onChange={(v) => set("overviewAr", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.steps")}>
          <div className="sm:col-span-2 flex flex-col gap-4">
            {tpl.steps.map((step, i) => (
              <div key={i} className="rounded-md border border-border bg-surface-1 p-4">
                <div className="eyebrow mb-3">
                  {t("discoveryCfg.stepHeading", { n: i + 1 })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Pair label={t("discoveryCfg.field.stepTitleEn")} value={step.titleEn} onChange={(v) => setStep(i, { titleEn: v })} />
                  <Pair ar label={t("discoveryCfg.field.stepTitleAr")} value={step.titleAr} onChange={(v) => setStep(i, { titleAr: v })} />
                  <Pair area label={t("discoveryCfg.field.stepWhatEn")} value={step.whatEn} onChange={(v) => setStep(i, { whatEn: v })} />
                  <Pair area ar label={t("discoveryCfg.field.stepWhatAr")} value={step.whatAr} onChange={(v) => setStep(i, { whatAr: v })} />
                  <Pair area label={t("discoveryCfg.field.stepWhereEn")} value={step.whereEn} onChange={(v) => setStep(i, { whereEn: v })} />
                  <Pair area ar label={t("discoveryCfg.field.stepWhereAr")} value={step.whereAr} onChange={(v) => setStep(i, { whereAr: v })} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("discoveryCfg.section.sendBack")}>
          <Pair area label={t("discoveryCfg.field.sendBackEn")} value={tpl.sendBackEn} onChange={(v) => set("sendBackEn", v)} />
          <Pair area ar label={t("discoveryCfg.field.sendBackAr")} value={tpl.sendBackAr} onChange={(v) => set("sendBackAr", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.next")}>
          <Pair area label={t("discoveryCfg.field.nextEn")} value={tpl.nextEn} onChange={(v) => set("nextEn", v)} />
          <Pair area ar label={t("discoveryCfg.field.nextAr")} value={tpl.nextAr} onChange={(v) => set("nextAr", v)} />
        </Section>

        <Section title={t("discoveryCfg.section.footer")}>
          <Pair label={t("pdfCfg.field.footerEn")} value={tpl.footerEn} onChange={(v) => set("footerEn", v)} />
          <Pair ar label={t("pdfCfg.field.footerAr")} value={tpl.footerAr} onChange={(v) => set("footerAr", v)} />
        </Section>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11.5px] text-ink-3">
            {tpl.updatedAt ? `Last saved: ${new Date(tpl.updatedAt).toISOString().slice(0, 16).replace("T", " ")}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/discovery-letter?lang=en"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
            >
              <FileText size={13} /> {t("discoveryCfg.preview")} EN <ExternalLink size={11} />
            </a>
            <a
              href="/api/discovery-letter?lang=ar"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
            >
              <FileText size={13} /> {t("discoveryCfg.preview")} AR <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="eyebrow mb-3">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Pair({
  label,
  value,
  onChange,
  area,
  ar,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  ar?: boolean;
}) {
  const cls =
    "w-full px-3 py-2 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-council-strong focus:ring-2 focus:ring-[var(--ring)]";
  return (
    <label className="flex flex-col gap-1.5 text-[11.5px] text-ink-2 font-semibold">
      {label}
      {area ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={ar ? "rtl" : "ltr"}
          className={cls}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={ar ? "rtl" : "ltr"}
          className={`h-9 ${cls}`}
        />
      )}
    </label>
  );
}
