"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Check, ExternalLink, FileText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

type Bullet = { en: string; ar: string };
type PdfSection = {
  titleEn: string;
  titleAr: string;
  en: string;
  ar: string;
  bulletsTitleEn?: string;
  bulletsTitleAr?: string;
  bullets?: Bullet[];
  noteEn?: string;
  noteAr?: string;
};
type PdfTemplate = {
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
  sections: PdfSection[];
  sigRoles: Array<[string, string]>;
  footerEn: string;
  footerAr: string;
  updatedAt?: string;
};

export function PdfTemplatePanel() {
  const { t } = useI18n();
  const [tpl, setTpl] = useState<PdfTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Preview ID resolves at runtime to the first onboarded tenant. The
  // panel previously hardcoded a specific seed-customer id which 404'd
  // on any deployment whose seed catalogue used different ids. Now we
  // pull the live tenant list and use the first row's id; if there are
  // no tenants yet, the preview buttons render disabled.
  const [previewTenantId, setPreviewTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tplR, tenantsR] = await Promise.all([
      api.getPdfTemplate(),
      api.listTenants().catch(() => ({ tenants: [] as Array<{ id: string }> })),
    ]);
    setTpl(tplR.template as unknown as PdfTemplate);
    const first = (tenantsR as { tenants: Array<{ id: string }> }).tenants[0];
    setPreviewTenantId(first?.id ?? null);
  }, []);
  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onSave = async () => {
    if (!tpl) return;
    setSaving(true);
    try {
      await api.savePdfTemplate(tpl as unknown as Record<string, unknown>);
      setToast(t("pdfCfg.saved"));
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      const r = await api.resetPdfTemplate();
      setTpl(r.template as unknown as PdfTemplate);
      setToast(t("pdfCfg.saved"));
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSaving(false);
    }
  };

  if (!tpl) return <Card><div className="text-ink-3 text-[13px]">{t("state.loading")}</div></Card>;

  const set = <K extends keyof PdfTemplate>(k: K, v: PdfTemplate[K]) =>
    setTpl((prev) => (prev ? { ...prev, [k]: v } : prev));

  const setSection = (i: number, patch: Partial<PdfSection>) =>
    setTpl((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.slice();
      sections[i] = { ...sections[i], ...patch };
      return { ...prev, sections };
    });

  const setBullet = (secIdx: number, bi: number, patch: Partial<Bullet>) =>
    setTpl((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.slice();
      const sec = sections[secIdx];
      const bullets = (sec.bullets ?? []).slice();
      bullets[bi] = { ...bullets[bi], ...patch };
      sections[secIdx] = { ...sec, bullets };
      return { ...prev, sections };
    });

  const setSig = (i: number, lang: "en" | "ar", v: string) =>
    setTpl((prev) => {
      if (!prev) return prev;
      const sigRoles = prev.sigRoles.map((p) => [...p] as [string, string]);
      sigRoles[i][lang === "en" ? 0 : 1] = v;
      return { ...prev, sigRoles };
    });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title={t("pdfCfg.title")}
          subtitle={t("pdfCfg.subtitle")}
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
                <RotateCcw size={13} /> {t("pdfCfg.reset")}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {t("pdfCfg.save")}
              </button>
            </div>
          }
        />

        {/* Brand + header */}
        <Section title={t("pdfCfg.section.brand")}>
          <Pair label={t("pdfCfg.field.councilEn")} value={tpl.councilEn} onChange={(v) => set("councilEn", v)} />
          <Pair ar label={t("pdfCfg.field.councilAr")} value={tpl.councilAr} onChange={(v) => set("councilAr", v)} />
          <Pair label={t("pdfCfg.field.taglineEn")} value={tpl.taglineEn} onChange={(v) => set("taglineEn", v)} />
          <Pair ar label={t("pdfCfg.field.taglineAr")} value={tpl.taglineAr} onChange={(v) => set("taglineAr", v)} />
        </Section>

        {/* Title */}
        <Section title={t("pdfCfg.section.title")}>
          <Pair label={t("pdfCfg.field.titleEn")} value={tpl.titleEn} onChange={(v) => set("titleEn", v)} />
          <Pair ar label={t("pdfCfg.field.titleAr")} value={tpl.titleAr} onChange={(v) => set("titleAr", v)} />
          <Pair area label={t("pdfCfg.field.subtitleEn")} value={tpl.subtitleEn} onChange={(v) => set("subtitleEn", v)} />
          <Pair area ar label={t("pdfCfg.field.subtitleAr")} value={tpl.subtitleAr} onChange={(v) => set("subtitleAr", v)} />
        </Section>

        {/* Contact */}
        <Section title={t("pdfCfg.section.contact")}>
          <Pair label={t("pdfCfg.field.contactName")} value={tpl.contactName} onChange={(v) => set("contactName", v)} />
          <Pair label={t("pdfCfg.field.contactEmail")} value={tpl.contactEmail} onChange={(v) => set("contactEmail", v)} />
        </Section>

        {/* Sections */}
        <Section title={t("pdfCfg.section.sections")}>
          <div className="flex flex-col gap-5">
            {tpl.sections.map((sec, i) => (
              <div key={i} className="rounded-md border border-border bg-surface-1 p-4">
                <div className="eyebrow mb-3">
                  {t("pdfCfg.section.heading", { n: i + 1 })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Pair label={t("pdfCfg.field.secTitleEn")} value={sec.titleEn} onChange={(v) => setSection(i, { titleEn: v })} />
                  <Pair ar label={t("pdfCfg.field.secTitleAr")} value={sec.titleAr} onChange={(v) => setSection(i, { titleAr: v })} />
                  <Pair area label={t("pdfCfg.field.secBodyEn")} value={sec.en} onChange={(v) => setSection(i, { en: v })} />
                  <Pair area ar label={t("pdfCfg.field.secBodyAr")} value={sec.ar} onChange={(v) => setSection(i, { ar: v })} />
                </div>
                {sec.bullets ? (
                  <div className="mt-4 space-y-2">
                    {sec.bullets.map((b, bi) => (
                      <div key={bi} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Pair
                          label={`${t("pdfCfg.field.bulletEn")} ${bi + 1}`}
                          value={b.en}
                          onChange={(v) => setBullet(i, bi, { en: v })}
                        />
                        <Pair
                          ar
                          label={`${t("pdfCfg.field.bulletAr")} ${bi + 1}`}
                          value={b.ar}
                          onChange={(v) => setBullet(i, bi, { ar: v })}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {sec.noteEn !== undefined || sec.noteAr !== undefined ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Pair
                      area
                      label={t("pdfCfg.field.secNoteEn")}
                      value={sec.noteEn ?? ""}
                      onChange={(v) => setSection(i, { noteEn: v })}
                    />
                    <Pair
                      area
                      ar
                      label={t("pdfCfg.field.secNoteAr")}
                      value={sec.noteAr ?? ""}
                      onChange={(v) => setSection(i, { noteAr: v })}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>

        {/* Sign-off */}
        <Section title={t("pdfCfg.section.signoff")}>
          <div className="grid grid-cols-1 gap-3">
            {tpl.sigRoles.map((roles, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-border rounded-md bg-surface-1">
                <Pair
                  label={`${t("pdfCfg.sig.role", { n: i + 1 })} · ${t("pdfCfg.sig.en")}`}
                  value={roles[0]}
                  onChange={(v) => setSig(i, "en", v)}
                />
                <Pair
                  ar
                  label={`${t("pdfCfg.sig.role", { n: i + 1 })} · ${t("pdfCfg.sig.ar")}`}
                  value={roles[1]}
                  onChange={(v) => setSig(i, "ar", v)}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <Section title={t("pdfCfg.section.footer")}>
          <Pair label={t("pdfCfg.field.footerEn")} value={tpl.footerEn} onChange={(v) => set("footerEn", v)} />
          <Pair ar label={t("pdfCfg.field.footerAr")} value={tpl.footerAr} onChange={(v) => set("footerAr", v)} />
        </Section>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11.5px] text-ink-3">
            {tpl.updatedAt ? `Last saved: ${new Date(tpl.updatedAt).toISOString().slice(0, 16).replace("T", " ")}` : ""}
          </div>
          <div className="flex items-center gap-2">
            {/* Preview buttons fall back to a disabled state when no
                tenants are onboarded yet — without a real tenant id
                the API returns 404 (the route looks up the tenant
                first, then renders the personalized letter). */}
            {previewTenantId ? (
              <>
                <a
                  href={`/api/tenants/${previewTenantId}/onboarding-letter?lang=en`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
                >
                  <FileText size={13} /> {t("pdfCfg.preview")} EN <ExternalLink size={11} />
                </a>
                <a
                  href={`/api/tenants/${previewTenantId}/onboarding-letter?lang=ar`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
                >
                  <FileText size={13} /> {t("pdfCfg.preview")} AR <ExternalLink size={11} />
                </a>
              </>
            ) : (
              <span className="text-[11.5px] text-ink-3 inline-flex items-center gap-1.5">
                <FileText size={13} />
                {t("pdfCfg.preview.noTenants")}
              </span>
            )}
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
