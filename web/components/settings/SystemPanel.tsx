"use client";

import { useEffect, useState } from "react";
import {
  Globe2,
  Loader2,
  Save,
  Check,
  Copy,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Settings → System — Domain & URL.
 *
 * The 3-step domain-change story:
 *   1. Enter the new dashboard URL (e.g. `https://posture.dubai.ae`).
 *   2. Update DNS so the new hostname resolves to wherever the dashboard
 *      runs (Cloudflare tunnel CNAME, Azure custom domain, on-prem
 *      ingress IP). v2.7.0 just lists the host the operator needs to
 *      point at — we don't manage their DNS for them.
 *   3. Update both Azure App Registrations' redirect URIs so the OIDC
 *      round-trip lands back at the new dashboard URL. v2.7.0 prints
 *      the URIs with a copy button each; the operator pastes into the
 *      Azure portal. Auto-update via Graph PATCH is v2.8.
 *
 * v2.7.0.
 */

type Loaded = {
  config: { baseUrl: string };
  effective: string;
  detected: string | null;
  redirectUris: {
    consent: string;
    userAuth: string;
    directiveConsent: string;
  };
};

export function SystemPanel() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/config/system", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Loaded;
      setLoaded(j);
      setDraft(j.config.baseUrl);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/config/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseUrl: draft.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!loaded) {
    return (
      <Card>
        <div className="text-ink-3 text-sm flex items-center gap-2">
          {error ? (
            <>
              <AlertTriangle size={14} className="text-neg" /> {error}
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("system.loading")}
            </>
          )}
        </div>
      </Card>
    );
  }

  const dirty = draft.trim() !== loaded.config.baseUrl;
  const willClear = draft.trim().length === 0 && loaded.config.baseUrl.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Domain & URL editor ───────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Globe2 size={16} className="text-council-strong" />
              {t("system.title")}
            </span>
          }
          subtitle={t("system.subtitle")}
        />
        <div className="flex flex-col gap-3">
          <Field
            label={t("system.field.effective")}
            hint={t("system.field.effective.hint")}
          >
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md border border-border bg-surface-1 text-[12.5px] tabular text-ink-1 break-all">
                {loaded.effective}
              </code>
              <a
                href={loaded.effective}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border text-ink-2 hover:text-ink-1"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </Field>

          {loaded.detected && loaded.detected !== loaded.effective ? (
            <Field
              label={t("system.field.detected")}
              hint={t("system.field.detected.hint")}
            >
              <code className="block px-3 py-2 rounded-md border border-dashed border-border bg-surface-1 text-[12.5px] tabular text-ink-2 break-all">
                {loaded.detected}
              </code>
            </Field>
          ) : null}

          <Field
            label={t("system.field.override")}
            hint={t("system.field.override.hint")}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://posture.example.com"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface-2 text-ink-1 tabular text-[13px]"
            />
          </Field>

          {willClear ? (
            <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12px] text-ink-1">
              {t("system.willClear")}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <Check size={13} />
              ) : (
                <Save size={13} />
              )}
              {saved ? t("system.saved") : t("system.save")}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Redirect URI checklist ────────────────────────── */}
      <Card>
        <CardHeader
          title={t("system.uris.title")}
          subtitle={t("system.uris.subtitle")}
        />
        <ul className="flex flex-col gap-2">
          <UriRow
            label={t("system.uris.consent")}
            description={t("system.uris.consent.body")}
            uri={loaded.redirectUris.consent}
            copied={copiedKey === "consent"}
            onCopy={() => onCopy("consent", loaded.redirectUris.consent)}
          />
          <UriRow
            label={t("system.uris.userAuth")}
            description={t("system.uris.userAuth.body")}
            uri={loaded.redirectUris.userAuth}
            copied={copiedKey === "userAuth"}
            onCopy={() => onCopy("userAuth", loaded.redirectUris.userAuth)}
          />
          <UriRow
            label={t("system.uris.directiveConsent")}
            description={t("system.uris.directiveConsent.body")}
            uri={loaded.redirectUris.directiveConsent}
            copied={copiedKey === "directiveConsent"}
            onCopy={() =>
              onCopy("directiveConsent", loaded.redirectUris.directiveConsent)
            }
          />
        </ul>
        <div className="mt-4 text-[11.5px] text-ink-3 leading-relaxed">
          {t("system.uris.tip")}
        </div>
      </Card>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
        {label}
      </label>
      {children}
      {hint ? (
        <div className="text-[11px] text-ink-3 leading-relaxed">{hint}</div>
      ) : null}
    </div>
  );
}

function UriRow({
  label,
  description,
  uri,
  copied,
  onCopy,
}: {
  label: string;
  description: string;
  uri: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <li className="rounded-md border border-border bg-surface-1 p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-ink-1">{label}</div>
          <div className="text-[11px] text-ink-3 mt-0.5 leading-relaxed">
            {description}
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 h-7 px-2 rounded border border-border text-ink-2 hover:text-ink-1 text-[11px] shrink-0"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="mt-2 block px-2 py-1.5 rounded border border-border bg-surface-2 text-[11.5px] tabular text-ink-1 break-all">
        {uri}
      </code>
    </li>
  );
}
