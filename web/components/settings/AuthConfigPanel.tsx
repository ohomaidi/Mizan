"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Trash2, Check, Copy, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

type Role = "admin" | "analyst" | "viewer";

type Form = {
  clientId: string;
  clientSecret: string; // blank on load — user re-types to change; existing stored secret is preserved
  tenantId: string;
  sessionTimeoutMinutes: number;
  defaultRole: Role;
};

// Sliding-window presets (minutes). Must match the API-side whitelist in
// lib/config/auth-config.ts. Keep in sync if either changes.
const SESSION_PRESETS = [
  { value: 60 * 8, labelKey: "authCfg.session.8h" as const },
  { value: 60 * 24, labelKey: "authCfg.session.1d" as const },
  { value: 60 * 24 * 7, labelKey: "authCfg.session.7d" as const },
  { value: 60 * 24 * 30, labelKey: "authCfg.session.30d" as const },
];

const EMPTY: Form = {
  clientId: "",
  clientSecret: "",
  tenantId: "",
  sessionTimeoutMinutes: 60 * 24 * 7,
  defaultRole: "viewer",
};

const GUID_OR_COMMON =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|common|organizations)$/i;

export function AuthConfigPanel() {
  const { t } = useI18n();
  const [form, setForm] = useState<Form>(EMPTY);
  const [secretSet, setSecretSet] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getAuthConfig();
      setForm({
        clientId: r.config.clientId,
        clientSecret: "",
        tenantId: r.config.tenantId,
        sessionTimeoutMinutes: r.config.sessionTimeoutMinutes,
        defaultRole: r.config.defaultRole,
      });
      setSecretSet(r.config.clientSecretSet);
      setRedirectUri(r.config.redirectUri);
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
    (form.clientId === "" ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        form.clientId,
      )) &&
    (form.tenantId === "" || GUID_OR_COMMON.test(form.tenantId)) &&
    form.sessionTimeoutMinutes >= 15;

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const patch: Parameters<typeof api.saveAuthConfig>[0] = {
        clientId: form.clientId,
        tenantId: form.tenantId,
        sessionTimeoutMinutes: form.sessionTimeoutMinutes,
        defaultRole: form.defaultRole,
      };
      if (form.clientSecret.length > 0) patch.clientSecret = form.clientSecret;
      await api.saveAuthConfig(patch);
      setToast(t("authCfg.saved"));
      setTimeout(() => setToast(null), 4000);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    if (!window.confirm(t("authCfg.clearConfirm"))) return;
    setSaving(true);
    try {
      await api.clearAuthConfig();
      await load();
      setToast(t("authCfg.saved"));
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const onCopyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <Card>
      <CardHeader
        title={t("authCfg.title")}
        subtitle={t("authCfg.subtitle")}
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
          <Field label={t("authCfg.field.clientId")}>
            <input
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value.trim())}
              dir="ltr"
              placeholder="00000000-0000-0000-0000-000000000000"
              className={`${inputClass} tabular`}
            />
          </Field>
          <Field label={t("authCfg.field.tenantId")}>
            <input
              value={form.tenantId}
              onChange={(e) => set("tenantId", e.target.value.trim())}
              dir="ltr"
              placeholder="common or GUID"
              className={`${inputClass} tabular`}
            />
          </Field>
          <Field label={t("authCfg.field.clientSecret")}>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) => set("clientSecret", e.target.value)}
              dir="ltr"
              placeholder={t("authCfg.field.clientSecretPlaceholder")}
              className={inputClass}
            />
            <div className="text-[11px] text-ink-3 mt-1">
              {secretSet ? t("authCfg.secretSet") : t("authCfg.secretUnset")}
            </div>
          </Field>
          <Field label={t("authCfg.field.sessionTimeout")}>
            <select
              value={form.sessionTimeoutMinutes}
              onChange={(e) =>
                set("sessionTimeoutMinutes", Number(e.target.value))
              }
              className={inputClass}
            >
              {SESSION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-ink-3 mt-1">
              {t("authCfg.session.helper")}
            </div>
          </Field>
          <Field label={t("authCfg.field.defaultRole")}>
            <select
              value={form.defaultRole}
              onChange={(e) => set("defaultRole", e.target.value as Role)}
              className={inputClass}
            >
              <option value="admin">{t("authCfg.role.admin")}</option>
              <option value="analyst">{t("authCfg.role.analyst")}</option>
              <option value="viewer">{t("authCfg.role.viewer")}</option>
            </select>
          </Field>
          <Field label={t("authCfg.redirectUri")}>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={redirectUri}
                dir="ltr"
                className={`${inputClass} tabular bg-surface-2`}
              />
              <button
                type="button"
                onClick={onCopyRedirect}
                className="inline-flex items-center gap-1 h-9 px-2 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px] shrink-0"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </Field>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-border">
            {secretSet && form.clientId.length > 0 ? (
              <a
                href="/login"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
              >
                <ExternalLink size={13} /> {t("authCfg.testSignIn")}
              </a>
            ) : null}
            <button
              onClick={onClear}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
            >
              <Trash2 size={13} /> {t("authCfg.clear")}
            </button>
            <button
              onClick={onSave}
              disabled={!valid || saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {t("authCfg.save")}
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
