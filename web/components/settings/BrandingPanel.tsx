"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Save, Check, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

type FrameworkId = "nesa" | "nca" | "isr" | "generic";

type Form = {
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  taglineEn: string;
  taglineAr: string;
  accentColor: string;
  accentColorStrong: string;
  frameworkId: FrameworkId;
};

const EMPTY: Form = {
  nameEn: "",
  nameAr: "",
  shortEn: "",
  shortAr: "",
  taglineEn: "",
  taglineAr: "",
  accentColor: "#0d6b63",
  accentColorStrong: "#0d9488",
  frameworkId: "generic",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function BrandingPanel() {
  const { t } = useI18n();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [keepBg, setKeepBg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoVersion, setLogoVersion] = useState<number>(Date.now());
  const [logoPresent, setLogoPresent] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getBranding();
      setForm({
        nameEn: r.branding.nameEn,
        nameAr: r.branding.nameAr,
        shortEn: r.branding.shortEn,
        shortAr: r.branding.shortAr,
        taglineEn: r.branding.taglineEn,
        taglineAr: r.branding.taglineAr,
        accentColor: r.branding.accentColor,
        accentColorStrong: r.branding.accentColorStrong,
        frameworkId: r.branding.frameworkId,
      });
      setKeepBg(!r.branding.logoBgRemoved);
      setLogoPresent(!!r.branding.logoPath);
    } finally {
      setLoading(false);
    }
  }, []);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setLogoError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("logo", file);
      fd.set("keepBackground", keepBg ? "true" : "false");
      const res = await fetch("/api/config/branding/logo", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      setLogoVersion(Date.now());
      setLogoPresent(true);
      setToast(t("branding.logo.saved"));
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setLogoError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onDeleteLogo = async () => {
    if (!window.confirm(t("branding.logo.deleteConfirm"))) return;
    setUploading(true);
    try {
      const res = await fetch("/api/config/branding/logo", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLogoPresent(false);
      setLogoVersion(Date.now());
      setToast(t("branding.logo.removed"));
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setLogoError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.nameEn.trim().length >= 2 &&
    form.nameAr.trim().length >= 2 &&
    form.shortEn.trim().length >= 1 &&
    form.shortAr.trim().length >= 1 &&
    HEX_RE.test(form.accentColor) &&
    HEX_RE.test(form.accentColorStrong);

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.saveBranding(form);
      setToast(t("branding.saved"));
      setTimeout(() => setToast(null), 3500);
      // Branding feeds i18n placeholders + layout chrome. Easiest way to propagate
      // it across every currently-mounted component is a hard reload — the next
      // mount of LocaleProvider picks up the new values.
      setTimeout(() => window.location.reload(), 400);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (!window.confirm(t("branding.resetConfirm"))) return;
    setSaving(true);
    try {
      await api.resetBranding();
      await load();
      setToast(t("branding.saved"));
      setTimeout(() => setToast(null), 3500);
      setTimeout(() => window.location.reload(), 400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={t("branding.title")}
        subtitle={t("branding.subtitle")}
        right={
          toast ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-pos">
              <Check size={12} /> {toast}
            </span>
          ) : null
        }
      />
      {loading ? (
        <div className="text-ink-3 text-[12.5px]">{t("state.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 rounded-md border border-border bg-surface-2 p-4 flex flex-col sm:flex-row gap-4 items-start">
            <div className="h-20 w-20 rounded-md border border-border bg-surface-1 grid place-items-center overflow-hidden shrink-0">
              {logoPresent ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo preview"
                  src={`/api/config/branding/logo?v=${logoVersion}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon size={22} className="text-ink-3" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="text-[13px] font-semibold text-ink-1">
                {t("branding.field.logo")}
              </div>
              <div className="text-[11.5px] text-ink-3">
                {t("branding.logo.helper")}
              </div>
              <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={keepBg}
                  onChange={(e) => setKeepBg(e.target.checked)}
                  className="h-4 w-4 accent-council-strong"
                />
                {t("branding.logo.keepBackground")}
              </label>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={onPickFile}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  {t("branding.logo.upload")}
                </button>
                {logoPresent ? (
                  <button
                    type="button"
                    onClick={onDeleteLogo}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-3 hover:text-neg hover:border-neg/40 text-[12.5px] disabled:opacity-50"
                  >
                    <Trash2 size={13} /> {t("branding.logo.remove")}
                  </button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
              {logoError ? (
                <div className="text-[11.5px] text-neg mt-1">{logoError}</div>
              ) : null}
            </div>
          </div>
          <Field label={t("branding.field.nameEn")} required>
            <input
              value={form.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
              dir="ltr"
              className={inputClass}
              placeholder="Security Posture Dashboard"
            />
          </Field>
          <Field label={t("branding.field.nameAr")} required>
            <input
              value={form.nameAr}
              onChange={(e) => set("nameAr", e.target.value)}
              dir="rtl"
              className={inputClass}
              placeholder="لوحة الأمن السيبراني"
            />
          </Field>
          <Field label={t("branding.field.shortEn")} required>
            <input
              value={form.shortEn}
              onChange={(e) => set("shortEn", e.target.value)}
              dir="ltr"
              className={inputClass}
              placeholder="Posture"
            />
          </Field>
          <Field label={t("branding.field.shortAr")} required>
            <input
              value={form.shortAr}
              onChange={(e) => set("shortAr", e.target.value)}
              dir="rtl"
              className={inputClass}
              placeholder="لوحة"
            />
          </Field>
          <Field label={t("branding.field.taglineEn")}>
            <input
              value={form.taglineEn}
              onChange={(e) => set("taglineEn", e.target.value)}
              dir="ltr"
              className={inputClass}
            />
          </Field>
          <Field label={t("branding.field.taglineAr")}>
            <input
              value={form.taglineAr}
              onChange={(e) => set("taglineAr", e.target.value)}
              dir="rtl"
              className={inputClass}
            />
          </Field>
          <Field label={t("branding.field.accentColor")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => set("accentColor", e.target.value)}
                className="h-9 w-12 rounded border border-border bg-surface-1 cursor-pointer"
              />
              <input
                value={form.accentColor}
                onChange={(e) => set("accentColor", e.target.value)}
                dir="ltr"
                className={`${inputClass} tabular`}
                placeholder="#0d6b63"
              />
            </div>
          </Field>
          <Field label={t("branding.field.accentColorStrong")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColorStrong}
                onChange={(e) => set("accentColorStrong", e.target.value)}
                className="h-9 w-12 rounded border border-border bg-surface-1 cursor-pointer"
              />
              <input
                value={form.accentColorStrong}
                onChange={(e) => set("accentColorStrong", e.target.value)}
                dir="ltr"
                className={`${inputClass} tabular`}
                placeholder="#0d9488"
              />
            </div>
          </Field>
          <Field label={t("branding.field.framework")}>
            <select
              value={form.frameworkId}
              onChange={(e) => set("frameworkId", e.target.value as FrameworkId)}
              className={inputClass}
            >
              <option value="generic">{t("branding.framework.generic")}</option>
              <option value="nesa">{t("branding.framework.nesa")}</option>
              <option value="nca">{t("branding.framework.nca")}</option>
              <option value="isr">{t("branding.framework.isr")}</option>
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onReset}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
            >
              <RotateCcw size={13} /> {t("branding.reset")}
            </button>
            <button
              onClick={onSave}
              disabled={!valid || saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {t("branding.save")}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-council-strong focus:ring-2 focus:ring-[var(--ring)]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-ink-2 flex items-center gap-2">
        {label}
        {required ? (
          <span className="text-[10px] text-neg uppercase tracking-wide font-normal">
            {t("settings.field.required")}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
