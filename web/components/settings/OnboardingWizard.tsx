"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { CLUSTERS, type ClusterId } from "@/lib/data/clusters";
import { api } from "@/lib/api/client";

type Draft = {
  nameEn: string;
  nameAr: string;
  cluster: ClusterId;
  ciso: string;
  cisoEmail: string;
  domain: string;
  tenantId: string;
  licenseConfirmed: boolean;
};

const EMPTY: Draft = {
  nameEn: "",
  nameAr: "",
  cluster: "police",
  ciso: "",
  cisoEmail: "",
  domain: "",
  tenantId: "",
  licenseConfirmed: false,
};

type Generated = {
  tenantLocalId: string;
  consentUrl: string | null;
  azureConfigured: boolean;
};

type StepId = 1 | 2 | 3 | 4 | 5;

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[13px] outline-none focus:border-council-strong";

export function OnboardingWizard({ onDone }: { onDone?: () => void }) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();

  const [step, setStep] = useState<StepId>(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [resolvedMessage, setResolvedMessage] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [consentStatus, setConsentStatus] =
    useState<"pending" | "consented" | "revoked" | "failed" | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<
    | { kind: "ok" }
    | { kind: "err"; message: string }
    | null
  >(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const validEn = draft.nameEn.trim().length > 1;
  const validAr = draft.nameAr.trim().length > 1;
  const validDomain = /\./.test(draft.domain.trim());
  const validTenant = GUID_RE.test(draft.tenantId.trim());

  const canProceedFrom1 = validEn && validAr;
  const canProceedFrom2 = validDomain && validTenant && draft.licenseConfirmed;

  const onResolve = async () => {
    const d = draft.domain.trim();
    if (!d) return;
    setResolvedMessage(null);
    setResolving(true);
    try {
      const r = await api.resolveTenantFromDomain(d);
      set("tenantId", r.tenantId);
      setResolvedMessage(t("wizard.step2.resolved", { tenantId: r.tenantId }));
    } catch (err) {
      void err;
      setResolvedMessage(t("wizard.step2.resolveFailed"));
    } finally {
      setResolving(false);
    }
  };

  const onGenerate = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await api.createTenant({
        nameEn: draft.nameEn.trim(),
        nameAr: draft.nameAr.trim(),
        cluster: draft.cluster,
        tenantId: draft.tenantId.trim(),
        domain: draft.domain.trim(),
        ciso: draft.ciso.trim(),
        cisoEmail: draft.cisoEmail.trim(),
      });
      setGenerated({
        tenantLocalId: res.tenant.id,
        consentUrl: res.consentUrl,
        azureConfigured: res.azureConfigured,
      });
      setStep(4);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4 — live-poll consent status every 5 s.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  const checkStatus = useCallback(async () => {
    if (!generated) return;
    try {
      const d = await api.getTenantDetail(generated.tenantLocalId);
      const status = (d.tenant as { consent_status?: string } | null)?.consent_status;
      if (
        status === "pending" ||
        status === "consented" ||
        status === "revoked" ||
        status === "failed"
      ) {
        setConsentStatus(status);
      }
    } catch {
      /* swallow — next tick retries */
    }
  }, [generated]);
  useEffect(() => {
    if (step !== 4 || !generated) return;
    void checkStatus();
    pollRef.current = setInterval(() => {
      void checkStatus();
    }, 5000);
    return stopPolling;
  }, [step, generated, checkStatus]);

  const onCopyConsent = async () => {
    if (!generated?.consentUrl) return;
    try {
      await navigator.clipboard.writeText(generated.consentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const onFirstSync = async () => {
    if (!generated) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      // Verify uses a single-signal Graph call (~2s) rather than a full 18-signal sync.
      // The full sync is already running in the background from the consent-callback,
      // so we only need to prove the pipeline is live here.
      const r = await api.verifyTenant(generated.tenantLocalId);
      if (r.ok) setSyncResult({ kind: "ok" });
      else
        setSyncResult({
          kind: "err",
          message: r.message ?? "unknown",
        });
    } catch (err) {
      setSyncResult({ kind: "err", message: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const onFinish = () => {
    setStep(1);
    setDraft(EMPTY);
    setGenerated(null);
    setConsentStatus(null);
    setSyncResult(null);
    setResolvedMessage(null);
    onDone?.();
  };

  const stepTitle = [
    t("wizard.step1.title"),
    t("wizard.step2.title"),
    t("wizard.step3.title"),
    t("wizard.step4.title"),
    t("wizard.step5.title"),
  ];

  const stepSubtitle = [
    t("wizard.step1.subtitle"),
    t("wizard.step2.subtitle"),
    t("wizard.step3.subtitle"),
    t("wizard.step4.subtitle"),
    t("wizard.step5.subtitle"),
  ];

  return (
    <Card className="p-0">
      <div className="p-5 border-b border-border">
        <CardHeader
          title={stepTitle[step - 1]}
          subtitle={stepSubtitle[step - 1]}
          right={
            <div className="text-[11.5px] uppercase tracking-[0.08em] text-ink-3 inline-flex items-center gap-1.5">
              <Sparkles size={12} className="text-council-strong" />
              {t("wizard.step", { n: fmt(step), total: fmt(5) })}
            </div>
          }
        />
      </div>

      {/* Step tracker */}
      <div className="px-5 pt-4">
        <ol className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const done = n < step;
            const active = n === step;
            return (
              <li key={n} className="flex-1 flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold tabular border ${
                    done
                      ? "bg-council-strong text-white border-council-strong"
                      : active
                        ? "bg-surface-2 text-ink-1 border-council-strong"
                        : "bg-surface-2 text-ink-3 border-border"
                  }`}
                >
                  {done ? <Check size={12} /> : fmt(n)}
                </div>
                {n < 5 ? (
                  <div
                    className={`flex-1 h-px ${
                      done ? "bg-council-strong" : "bg-border"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="p-5">
        {step === 1 ? (
          <Step1 draft={draft} set={set} />
        ) : step === 2 ? (
          <Step2
            draft={draft}
            set={set}
            onResolve={onResolve}
            resolving={resolving}
            resolvedMessage={resolvedMessage}
            validTenant={validTenant}
          />
        ) : step === 3 ? (
          <Step3 draft={draft} />
        ) : step === 4 ? (
          <Step4
            generated={generated}
            consentStatus={consentStatus}
            copied={copied}
            onCopy={onCopyConsent}
          />
        ) : (
          <Step5
            syncing={syncing}
            syncResult={syncResult}
            onRun={onFirstSync}
          />
        )}
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
        <button
          onClick={onFinish}
          className="h-8 px-3 rounded-md text-[12.5px] text-ink-3 hover:text-ink-2"
        >
          {t("wizard.nav.cancel")}
        </button>
        <div className="flex items-center gap-2">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as StepId)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-ink-1"
            >
              <ArrowLeft size={13} className="rtl:rotate-180" />
              {t("wizard.nav.back")}
            </button>
          ) : null}
          {step === 1 ? (
            <button
              disabled={!canProceedFrom1}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50"
            >
              {t("wizard.nav.next")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          ) : null}
          {step === 2 ? (
            <button
              disabled={!canProceedFrom2}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50"
            >
              {t("wizard.nav.next")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          ) : null}
          {step === 3 ? (
            <button
              disabled={submitting}
              onClick={onGenerate}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {t("wizard.step3.generate")}
            </button>
          ) : null}
          {step === 4 ? (
            <button
              disabled={consentStatus !== "consented"}
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50"
            >
              {t("wizard.nav.next")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </button>
          ) : null}
          {step === 5 ? (
            <button
              onClick={onFinish}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px]"
            >
              {t("wizard.nav.finish")}
              <Check size={13} />
            </button>
          ) : null}
        </div>
      </div>

      {submitError ? (
        <div className="px-5 pb-3 text-[12px] text-neg">{submitError}</div>
      ) : null}
    </Card>
  );
}

function Step1({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("settings.field.nameEn")} required>
        <input
          value={draft.nameEn}
          onChange={(e) => set("nameEn", e.target.value)}
          dir="ltr"
          placeholder="Sharjah Police General HQ"
          className={inputClass}
        />
      </Field>
      <Field label={t("settings.field.nameAr")} required>
        <input
          value={draft.nameAr}
          onChange={(e) => set("nameAr", e.target.value)}
          dir="rtl"
          placeholder="القيادة العامة لشرطة الشارقة"
          className={inputClass}
        />
      </Field>
      <Field label={t("settings.field.cluster")}>
        <select
          value={draft.cluster}
          onChange={(e) => set("cluster", e.target.value as ClusterId)}
          className={inputClass}
        >
          {CLUSTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {locale === "ar" ? c.labelAr : c.label}
            </option>
          ))}
        </select>
      </Field>
      <div />
      <Field label={t("settings.field.ciso")}>
        <input
          value={draft.ciso}
          onChange={(e) => set("ciso", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label={t("settings.field.cisoEmail")}>
        <input
          type="email"
          value={draft.cisoEmail}
          onChange={(e) => set("cisoEmail", e.target.value)}
          dir="ltr"
          placeholder="ciso@entity.gov.ae"
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function Step2({
  draft,
  set,
  onResolve,
  resolving,
  resolvedMessage,
  validTenant,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  onResolve: () => void;
  resolving: boolean;
  resolvedMessage: string | null;
  validTenant: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 max-w-[640px]">
      <Field label={t("settings.field.domain")} required>
        <div className="flex items-center gap-2">
          <input
            value={draft.domain}
            onChange={(e) => set("domain", e.target.value)}
            dir="ltr"
            placeholder="entity.gov.ae"
            className={inputClass}
          />
          <button
            type="button"
            onClick={onResolve}
            disabled={resolving || !/\./.test(draft.domain.trim())}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50 shrink-0"
          >
            {resolving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            {resolving ? t("wizard.step2.resolving") : t("wizard.step2.resolve")}
          </button>
        </div>
      </Field>
      {resolvedMessage ? (
        <div
          className={`text-[12px] keep-ltr ${
            validTenant ? "text-pos" : "text-warn"
          }`}
        >
          {resolvedMessage}
        </div>
      ) : null}
      <Field label={t("wizard.step2.manualTenant")} required>
        <input
          value={draft.tenantId}
          onChange={(e) => set("tenantId", e.target.value)}
          dir="ltr"
          placeholder="00000000-0000-0000-0000-000000000000"
          className={`${inputClass} tabular`}
        />
      </Field>
      <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.licenseConfirmed}
          onChange={(e) => set("licenseConfirmed", e.target.checked)}
          className="h-4 w-4 accent-council-strong"
        />
        {t("wizard.step2.license")}
      </label>
    </div>
  );
}

function Step3({ draft }: { draft: Draft }) {
  const { t, locale } = useI18n();
  const cluster = CLUSTERS.find((c) => c.id === draft.cluster);
  return (
    <div className="flex flex-col gap-4 max-w-[640px] text-[13px] text-ink-2">
      <p>{t("wizard.step3.subtitle")}</p>
      <div className="rounded-md border border-border bg-surface-2 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Summary label={t("settings.field.nameEn")} value={draft.nameEn} />
        <Summary label={t("settings.field.nameAr")} value={draft.nameAr} />
        <Summary
          label={t("settings.field.cluster")}
          value={locale === "ar" ? cluster?.labelAr ?? "" : cluster?.label ?? ""}
        />
        <Summary label={t("settings.field.domain")} value={draft.domain} />
        <Summary
          label={t("settings.field.tenantId")}
          value={<span className="keep-ltr tabular">{draft.tenantId}</span>}
        />
        <Summary label={t("settings.field.ciso")} value={draft.ciso || "—"} />
        <Summary
          label={t("settings.field.cisoEmail")}
          value={draft.cisoEmail || "—"}
        />
      </div>
    </div>
  );
}

function Step4({
  generated,
  consentStatus,
  copied,
  onCopy,
}: {
  generated: Generated | null;
  consentStatus: "pending" | "consented" | "revoked" | "failed" | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  if (!generated) {
    return (
      <div className="text-ink-3 text-[12.5px]">{t("wizard.step4.polling")}</div>
    );
  }
  const statusKey = consentStatus ?? "pending";
  const tone =
    statusKey === "consented"
      ? "text-pos"
      : statusKey === "revoked" || statusKey === "failed"
        ? "text-neg"
        : "text-warn";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-ink-3">Status:</span>
        <span className={`font-semibold ${tone}`}>
          {t(
            `wizard.step4.status.${statusKey}` as
              | "wizard.step4.status.pending"
              | "wizard.step4.status.consented"
              | "wizard.step4.status.revoked"
              | "wizard.step4.status.failed",
          )}
        </span>
      </div>
      {generated.consentUrl ? (
        <div className="rounded-md border border-border bg-surface-2 p-4 flex flex-col gap-2">
          <div className="text-[12px] text-ink-3">Consent URL</div>
          <div className="text-[12.5px] text-ink-1 font-mono break-all keep-ltr">
            {generated.consentUrl}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <a
              href={generated.consentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px]"
            >
              <ExternalLink size={13} />
              {t("settings.consent.openLink")}
            </a>
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? t("settings.consent.copied") : t("settings.consent.copy")}
            </button>
            <a
              href={`/api/tenants/${generated.tenantLocalId}/onboarding-letter?lang=en`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              <FileDown size={13} /> EN
            </a>
            <a
              href={`/api/tenants/${generated.tenantLocalId}/onboarding-letter?lang=ar`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
            >
              <FileDown size={13} /> AR
            </a>
          </div>
        </div>
      ) : (
        <div className="text-[12.5px] text-warn">
          {t("settings.consent.notConfigured")}
        </div>
      )}
    </div>
  );
}

function Step5({
  syncing,
  syncResult,
  onRun,
}: {
  syncing: boolean;
  syncResult: { kind: "ok" } | { kind: "err"; message: string } | null;
  onRun: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 max-w-[640px]">
      <p className="text-[13px] text-ink-2">{t("wizard.step5.subtitle")}</p>
      <div>
        <button
          onClick={onRun}
          disabled={syncing}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50"
        >
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {syncing ? t("wizard.step5.running") : t("wizard.step5.run")}
        </button>
      </div>
      {syncResult?.kind === "ok" ? (
        <div className="rounded-md border border-pos/40 bg-pos/10 p-3 text-[12.5px] text-ink-1 inline-flex items-center gap-2">
          <Check size={14} className="text-pos" />
          {t("wizard.step5.ok")}
        </div>
      ) : null}
      {syncResult?.kind === "err" ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1">
          {t("wizard.step5.failed", { message: syncResult.message })}
        </div>
      ) : null}
    </div>
  );
}

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
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-ink-3 inline-flex items-center gap-1">
        {label}
        {required ? (
          <span className="text-[10px] uppercase tracking-[0.08em] text-warn">
            {t("settings.field.required")}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-ink-3 uppercase tracking-[0.06em]">
        {label}
      </span>
      <span className="text-[13px] text-ink-1">{value}</span>
    </div>
  );
}
