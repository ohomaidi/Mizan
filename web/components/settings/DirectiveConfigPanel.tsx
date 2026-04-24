"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Save, Trash2, Gavel } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

/**
 * Settings → Authentication → Directive app panel. Only renders on
 * directive-mode deployments (DESC-style). Captures the second Entra app's
 * credentials (the .ReadWrite app). Parallel to AzureConfigPanel but scoped
 * tighter because Phase 1 is manual entry only — no device-code auto-
 * provisioning flow yet. That lands in Phase 2 alongside the first real
 * write endpoints.
 */

type Form = {
  clientId: string;
  clientSecret: string;
  authorityHost: string;
};

const EMPTY: Form = {
  clientId: "",
  clientSecret: "",
  authorityHost: "https://login.microsoftonline.com",
};

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DirectiveConfigPanel() {
  const { t } = useI18n();
  const [form, setForm] = useState<Form>(EMPTY);
  const [secretSet, setSecretSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getDirectiveConfig();
      setForm({
        clientId: r.config.clientId,
        clientSecret: "",
        authorityHost:
          r.config.authorityHost || "https://login.microsoftonline.com",
      });
      setSecretSet(r.config.clientSecretSet);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.clientId === "" || GUID_RE.test(form.clientId);

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const patch: Parameters<typeof api.saveDirectiveConfig>[0] = {
        clientId: form.clientId,
        authorityHost: form.authorityHost,
      };
      if (form.clientSecret.length > 0) patch.clientSecret = form.clientSecret;
      await api.saveDirectiveConfig(patch);
      setToast(t("directiveCfg.saved"));
      setTimeout(() => setToast(null), 4000);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    if (!window.confirm(t("directiveCfg.clearConfirm"))) return;
    setSaving(true);
    try {
      await api.clearDirectiveConfig();
      await load();
      setToast(t("directiveCfg.saved"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Gavel size={14} className="text-council-strong" />
            {t("directiveCfg.title")}
          </span>
        }
        subtitle={t("directiveCfg.subtitle")}
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
          <Field label={t("directiveCfg.field.clientId")}>
            <input
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value.trim())}
              dir="ltr"
              placeholder="00000000-0000-0000-0000-000000000000"
              className={`${inputClass} tabular`}
            />
            <div className="text-[11px] text-ink-3 mt-1">
              {t("directiveCfg.clientIdHelper")}
            </div>
          </Field>
          <Field label={t("directiveCfg.field.clientSecret")}>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) => set("clientSecret", e.target.value)}
              dir="ltr"
              placeholder={
                secretSet
                  ? t("directiveCfg.secretSetPlaceholder")
                  : t("directiveCfg.secretUnsetPlaceholder")
              }
              className={inputClass}
            />
            <div className="text-[11px] text-ink-3 mt-1">
              {secretSet ? t("directiveCfg.secretSet") : t("directiveCfg.secretUnset")}
            </div>
          </Field>
          <Field label={t("directiveCfg.field.authorityHost")}>
            <input
              value={form.authorityHost}
              onChange={(e) => set("authorityHost", e.target.value.trim())}
              dir="ltr"
              placeholder="https://login.microsoftonline.com"
              className={`${inputClass} tabular`}
            />
          </Field>
          <div className="sm:col-span-2 rounded-md border border-warn/40 bg-warn/10 p-3 text-[12px] text-ink-1 leading-relaxed">
            <div className="font-semibold mb-1">
              {t("directiveCfg.warningTitle")}
            </div>
            {t("directiveCfg.warningBody")}
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onClear}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
            >
              <Trash2 size={13} /> {t("directiveCfg.clear")}
            </button>
            <button
              onClick={onSave}
              disabled={!valid || saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {t("directiveCfg.save")}
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}
