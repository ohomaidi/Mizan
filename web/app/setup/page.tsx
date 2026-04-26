"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  Upload,
  LogIn,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";
import { ProvisionBlock } from "@/components/setup/ProvisionBlock";

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL = 5;

export default function SetupPage() {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — branding + deployment mode
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [shortEn, setShortEn] = useState("");
  const [shortAr, setShortAr] = useState("");
  // v2.4.x — fresh installs default to NESA. The "generic" / "nca" /
  // "isr" ids still exist as fallbacks in code but the wizard no
  // longer offers them as choices, so a new deployment never lands on
  // a hidden value.
  const [framework, setFramework] = useState<
    "generic" | "nesa" | "dubai-isr" | "nca" | "isr"
  >("nesa");
  const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
    "observation",
  );
  const [deploymentModeLocked, setDeploymentModeLocked] = useState(false);

  // Load the current deployment mode on mount. Once locked the wizard shows
  // the value read-only so a re-run of /setup after the first install can't
  // accidentally flip it.
  useEffect(() => {
    api
      .getDeploymentMode()
      .then((r) => {
        setDeploymentMode(r.mode);
        setDeploymentModeLocked(r.locked);
      })
      .catch(() => {});
  }, []);

  // Step 2 — logo
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Step 3 — Graph app
  const [graphClientId, setGraphClientId] = useState("");
  const [graphClientSecret, setGraphClientSecret] = useState("");

  // Step 4 — Auth app
  const [authClientId, setAuthClientId] = useState("");
  const [authClientSecret, setAuthClientSecret] = useState("");
  const [authTenantId, setAuthTenantId] = useState("");
  const [authRedirectUri, setAuthRedirectUri] = useState("");

  // Generic state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Set true the moment any device-code flow signs a user in as bootstrap admin.
  // We also re-check via /api/auth/me on mount so returning to the wizard from
  // a reload still shows the right Step 5 state.
  const [autoLoggedIn, setAutoLoggedIn] = useState(false);
  const [adminIdentity, setAdminIdentity] = useState<{
    displayName: string;
    email: string;
  } | null>(null);

  // Load the redirect URI so the operator can paste it into the Entra app.
  useEffect(() => {
    api
      .getAuthConfig()
      .then((r) => setAuthRedirectUri(r.config.redirectUri))
      .catch(() => {});
  }, []);

  // Detect the case where the poll route already opened a session for us on
  // a prior device-code success (e.g. user refreshed the page mid-wizard).
  useEffect(() => {
    api
      .whoami()
      .then((r) => {
        if (r.authenticated && r.user) {
          setAutoLoggedIn(true);
          setAdminIdentity({
            displayName: r.user.displayName || r.user.email || "Administrator",
            email: r.user.email || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const canProceed = useCallback(
    (s: Step): boolean => {
      if (s === 1) return nameEn.trim().length >= 2 && nameAr.trim().length >= 2;
      if (s === 2) return true; // logo optional
      if (s === 3) return true; // Graph creds optional at setup time
      if (s === 4) return true; // Auth creds optional at setup time
      if (s === 5) return true;
      return false;
    },
    [nameEn, nameAr],
  );

  const next = async () => {
    setError(null);
    setSaving(true);
    try {
      if (step === 1) {
        await api.saveBranding({
          nameEn: nameEn.trim(),
          nameAr: nameAr.trim(),
          shortEn: shortEn.trim() || nameEn.trim().split(" ")[0],
          shortAr: shortAr.trim() || nameAr.trim().split(" ")[0],
          frameworkId: framework,
        });
        // Lock deployment mode. Fails silently if already set — the /setup
        // page can be re-opened to edit branding, but the mode stays pinned
        // to whatever was chosen on the first install.
        if (!deploymentModeLocked) {
          try {
            await api.setDeploymentMode(deploymentMode);
            setDeploymentModeLocked(true);
          } catch {
            /* already locked — harmless */
          }
        }
      }
      if (step === 3 && graphClientId.trim().length > 0) {
        // The "auto-provisioned" path already persisted the secret server-side
        // during the device-code flow. If the user went through that path,
        // the client-side secret field holds a sentinel we skip over so we
        // don't overwrite the real stored secret with the sentinel.
        const patch: Parameters<typeof api.saveAzureConfig>[0] = {
          clientId: graphClientId.trim(),
        };
        if (
          graphClientSecret.trim().length > 0 &&
          graphClientSecret.trim() !== "__auto_provisioned__"
        ) {
          patch.clientSecret = graphClientSecret.trim();
        }
        await api.saveAzureConfig(patch);
      }
      if (step === 4 && authClientId.trim().length > 0) {
        const patch: Parameters<typeof api.saveAuthConfig>[0] = {
          clientId: authClientId.trim(),
        };
        // Auto-provision path stores the real tenant GUID server-side during
        // the device flow. Only send tenantId from the form if the user is
        // filling it in manually — otherwise we'd clobber the real GUID with
        // "common" and break sign-in (AADSTS50194: single-tenant app rejects
        // the /common authority).
        if (
          authTenantId.trim().length > 0 &&
          authTenantId.trim() !== "__auto_provisioned__"
        ) {
          patch.tenantId = authTenantId.trim();
        }
        if (
          authClientSecret.trim().length > 0 &&
          authClientSecret.trim() !== "__auto_provisioned__"
        ) {
          patch.clientSecret = authClientSecret.trim();
        }
        await api.saveAuthConfig(patch);
      }
      if (step < TOTAL) setStep((s) => (s + 1) as Step);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("logo", file);
      fd.set("keepBackground", "false");
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
      setLogoUploaded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onFinish = async () => {
    setSaving(true);
    try {
      await api.markSetupComplete();
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const onSignIn = () => {
    // Persist step=5 state across the round-trip so when the user comes back
    // from Entra they land directly on the "finish" screen.
    window.location.href = `/api/auth/user-login?next=${encodeURIComponent(
      "/setup?step=5",
    )}`;
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const s = Number(url.searchParams.get("step"));
    if (s >= 1 && s <= TOTAL) setStep(s as Step);
  }, []);

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="min-h-screen flex items-start sm:items-center justify-center px-4 sm:px-6 py-6 sm:py-10 bg-surface-1 safe-area-pt safe-area-pb"
    >
      <div className="w-full max-w-[720px]">
        <div className="flex items-center gap-2 mb-5 sm:mb-6">
          <Sparkles size={18} className="text-council-strong" />
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-ink-1">
            {t("setup.title")}
          </h1>
        </div>

        <Stepper step={step} />

        <div className="mt-5 sm:mt-6 rounded-lg border border-border bg-surface-2 p-4 sm:p-6">
          {step === 1 ? (
            <Step1
              nameEn={nameEn}
              setNameEn={setNameEn}
              nameAr={nameAr}
              setNameAr={setNameAr}
              shortEn={shortEn}
              setShortEn={setShortEn}
              shortAr={shortAr}
              setShortAr={setShortAr}
              framework={framework}
              setFramework={setFramework}
              deploymentMode={deploymentMode}
              setDeploymentMode={setDeploymentMode}
              deploymentModeLocked={deploymentModeLocked}
            />
          ) : null}
          {step === 2 ? (
            <Step2
              logoUploaded={logoUploaded}
              uploading={uploading}
              onUpload={onUpload}
            />
          ) : null}
          {step === 3 ? (
            <Step3
              clientId={graphClientId}
              setClientId={setGraphClientId}
              clientSecret={graphClientSecret}
              setClientSecret={setGraphClientSecret}
              onAutoLoggedIn={(who) => {
                setAutoLoggedIn(true);
                setAdminIdentity(who);
              }}
            />
          ) : null}
          {step === 4 ? (
            <Step4
              clientId={authClientId}
              setClientId={setAuthClientId}
              clientSecret={authClientSecret}
              setClientSecret={setAuthClientSecret}
              tenantId={authTenantId}
              setTenantId={setAuthTenantId}
              redirectUri={authRedirectUri}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(authRedirectUri);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* noop */
                }
              }}
              copied={copied}
              onAutoLoggedIn={(who) => {
                setAutoLoggedIn(true);
                setAdminIdentity(who);
              }}
            />
          ) : null}
          {step === 5 ? (
            <Step5
              onSignIn={onSignIn}
              onFinish={onFinish}
              saving={saving}
              authConfigured={authClientId.trim().length > 0}
              autoLoggedIn={autoLoggedIn}
              adminIdentity={adminIdentity}
              autoProvisioned={
                graphClientSecret === "__auto_provisioned__" ||
                authClientSecret === "__auto_provisioned__"
              }
            />
          ) : null}

          {error ? (
            <div className="mt-4 rounded-md border border-neg/40 bg-neg/10 p-3 text-[12px] text-ink-1">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              onClick={() =>
                step > 1 ? setStep((s) => (s - 1) as Step) : undefined
              }
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] disabled:opacity-50"
            >
              <ArrowLeft size={13} className="rtl:rotate-180" />
              {t("setup.back")}
            </button>
            {step < TOTAL ? (
              <button
                onClick={next}
                disabled={saving || !canProceed(step)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ArrowRight size={13} className="rtl:rotate-180" />
                )}
                {t("setup.next")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const done = n < step;
        const active = n === step;
        return (
          <li key={n} className="flex-1 flex items-center gap-2">
            <div
              className={`h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold border ${
                done
                  ? "bg-council-strong text-white border-council-strong"
                  : active
                    ? "bg-surface-2 text-ink-1 border-council-strong"
                    : "bg-surface-2 text-ink-3 border-border"
              }`}
            >
              {done ? <Check size={12} /> : n}
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
  );
}

function Step1(props: {
  nameEn: string;
  setNameEn: (v: string) => void;
  nameAr: string;
  setNameAr: (v: string) => void;
  shortEn: string;
  setShortEn: (v: string) => void;
  shortAr: string;
  setShortAr: (v: string) => void;
  framework: "generic" | "nesa" | "dubai-isr" | "nca" | "isr";
  setFramework: (
    v: "generic" | "nesa" | "dubai-isr" | "nca" | "isr",
  ) => void;
  deploymentMode: "observation" | "directive";
  setDeploymentMode: (v: "observation" | "directive") => void;
  deploymentModeLocked: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <StepHeader
        title={t("setup.s1.title")}
        subtitle={t("setup.s1.subtitle")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("branding.field.nameEn")}>
          <input
            value={props.nameEn}
            onChange={(e) => props.setNameEn(e.target.value)}
            dir="ltr"
            placeholder="Acme Security Authority"
            className={inputClass}
          />
        </Field>
        <Field label={t("branding.field.nameAr")}>
          <input
            value={props.nameAr}
            onChange={(e) => props.setNameAr(e.target.value)}
            dir="rtl"
            className={inputClass}
          />
        </Field>
        <Field label={t("branding.field.shortEn")}>
          <input
            value={props.shortEn}
            onChange={(e) => props.setShortEn(e.target.value)}
            dir="ltr"
            placeholder="ASA"
            className={inputClass}
          />
        </Field>
        <Field label={t("branding.field.shortAr")}>
          <input
            value={props.shortAr}
            onChange={(e) => props.setShortAr(e.target.value)}
            dir="rtl"
            className={inputClass}
          />
        </Field>
        <Field label={t("branding.field.framework")}>
          {/* v2.4.x — only NESA + Dubai ISR are user-selectable on
              first install. The other framework ids exist as code
              fallbacks for legacy deployments but aren't offered to a
              new operator (see BrandingPanel + NesaMappingPanel for
              the same pattern). */}
          <select
            value={props.framework}
            onChange={(e) =>
              props.setFramework(
                e.target.value as
                  | "generic"
                  | "nesa"
                  | "dubai-isr"
                  | "nca"
                  | "isr",
              )
            }
            className={inputClass}
          >
            <option value="nesa">{t("branding.framework.nesa")}</option>
            <option value="dubai-isr">
              {t("branding.framework.dubai-isr")}
            </option>
          </select>
        </Field>
      </div>

      {/* Deployment mode — picked once, locked after first-save. Drives
          whether the Graph app requests .ReadWrite scopes and whether the
          Directive UI surfaces light up. */}
      <div className="rounded-md border border-border bg-surface-2 p-4 mt-2">
        <div className="text-[13px] font-semibold text-ink-1 mb-1">
          {t("setup.deployment.title")}
        </div>
        <div className="text-[12px] text-ink-2 mb-3 leading-relaxed">
          {t("setup.deployment.subtitle")}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DeploymentModeOption
            active={props.deploymentMode === "observation"}
            locked={props.deploymentModeLocked}
            onSelect={() => props.setDeploymentMode("observation")}
            titleKey="setup.deployment.observation.title"
            bodyKey="setup.deployment.observation.body"
          />
          <DeploymentModeOption
            active={props.deploymentMode === "directive"}
            locked={props.deploymentModeLocked}
            onSelect={() => props.setDeploymentMode("directive")}
            titleKey="setup.deployment.directive.title"
            bodyKey="setup.deployment.directive.body"
          />
        </div>
        {props.deploymentModeLocked ? (
          <div className="text-[11.5px] text-ink-3 mt-2">
            {t("setup.deployment.lockedHint")}
          </div>
        ) : (
          <div className="text-[11.5px] text-warn mt-2">
            {t("setup.deployment.unlockedWarning")}
          </div>
        )}
      </div>
    </div>
  );
}

function DeploymentModeOption({
  active,
  locked,
  onSelect,
  titleKey,
  bodyKey,
}: {
  active: boolean;
  locked: boolean;
  onSelect: () => void;
  titleKey:
    | "setup.deployment.observation.title"
    | "setup.deployment.directive.title";
  bodyKey:
    | "setup.deployment.observation.body"
    | "setup.deployment.directive.body";
}) {
  const { t } = useI18n();
  const disabled = locked && !active;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`text-start rounded-md border p-3 transition-colors ${
        disabled
          ? "border-border bg-surface-1/60 opacity-60 cursor-not-allowed"
          : active
            ? "border-council-strong bg-council-strong/5"
            : "border-border bg-surface-1 hover:border-council-strong/60"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`shrink-0 h-4 w-4 rounded-full border-2 mt-0.5 ${
            active ? "border-council-strong bg-council-strong" : "border-border"
          }`}
        >
          {active ? (
            <div className="h-full w-full rounded-full bg-surface-2 scale-50" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink-1">
            {t(titleKey)}
          </div>
          <div className="text-[12px] text-ink-2 mt-0.5 leading-relaxed">
            {t(bodyKey)}
          </div>
        </div>
      </div>
    </button>
  );
}

function Step2({
  logoUploaded,
  uploading,
  onUpload,
}: {
  logoUploaded: boolean;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title={t("setup.s2.title")} subtitle={t("setup.s2.subtitle")} />
      <div className="rounded-md border border-border bg-surface-1 p-4 flex items-center gap-4">
        <div className="h-20 w-20 rounded-md border border-border bg-surface-2 grid place-items-center overflow-hidden shrink-0">
          {logoUploaded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Logo"
              src={`/api/config/branding/logo?v=${Date.now()}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Upload size={18} className="text-ink-3" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px] cursor-pointer">
            {uploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            {t("branding.logo.upload")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onUpload}
              className="hidden"
            />
          </label>
          <div className="text-[11.5px] text-ink-3 mt-2">{t("setup.s2.skip")}</div>
        </div>
      </div>
    </div>
  );
}

function Step3(props: {
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  onAutoLoggedIn: (who: { displayName: string; email: string }) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title={t("setup.s3.title")} subtitle={t("setup.s3.subtitle")} />
      <ProvisionBlock
        kind="graph"
        tenant="common"
        onSuccess={(clientId, { autoLoggedIn }) => {
          props.setClientId(clientId);
          // Secret is persisted server-side during provisioning. Set a
          // sentinel client-side so onNext() doesn't overwrite the stored
          // secret with a blank field.
          props.setClientSecret("__auto_provisioned__");
          if (autoLoggedIn) {
            // Re-query whoami so Step 5 shows the real display name instead
            // of a placeholder — avoids claim-decode edge cases on the UI.
            fetch("/api/auth/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((me) => {
                if (me?.authenticated && me?.user) {
                  props.onAutoLoggedIn({
                    displayName:
                      me.user.displayName ||
                      me.user.email ||
                      "Administrator",
                    email: me.user.email || "",
                  });
                }
              })
              .catch(() => {});
          }
        }}
      />
      <details className="rounded-md border border-border bg-surface-2 p-4">
        <summary className="text-[12.5px] text-ink-2 cursor-pointer">
          {t("setup.prov.manualToggle")}
        </summary>
        <ul className="text-[12.5px] text-ink-2 list-disc ms-5 space-y-1 mt-3">
          <li>{t("setup.s3.b1")}</li>
          <li>{t("setup.s3.b2")}</li>
          <li>{t("setup.s3.b3")}</li>
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <Field label={t("authCfg.field.clientId")}>
            <input
              value={props.clientId}
              onChange={(e) => props.setClientId(e.target.value.trim())}
              dir="ltr"
              placeholder="00000000-0000-0000-0000-000000000000"
              className={`${inputClass} tabular`}
            />
          </Field>
          <Field label={t("authCfg.field.clientSecret")}>
            <input
              value={props.clientSecret}
              onChange={(e) => props.setClientSecret(e.target.value)}
              type="password"
              dir="ltr"
              className={inputClass}
            />
          </Field>
        </div>
      </details>
      <div className="text-[11.5px] text-ink-3">{t("setup.skipHint")}</div>
    </div>
  );
}

function Step4(props: {
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  tenantId: string;
  setTenantId: (v: string) => void;
  redirectUri: string;
  onCopy: () => void;
  copied: boolean;
  onAutoLoggedIn: (who: { displayName: string; email: string }) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title={t("setup.s4.title")} subtitle={t("setup.s4.subtitle")} />
      <ProvisionBlock
        kind="user"
        tenant="common"
        onSuccess={(clientId, { autoLoggedIn }) => {
          props.setClientId(clientId);
          props.setClientSecret("__auto_provisioned__");
          // tenantId is written server-side from the user's token `tid` claim.
          // Flag it with the same sentinel so next() knows not to clobber the
          // real GUID with whatever is (or isn't) in the form.
          props.setTenantId("__auto_provisioned__");
          if (autoLoggedIn) {
            fetch("/api/auth/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((me) => {
                if (me?.authenticated && me?.user) {
                  props.onAutoLoggedIn({
                    displayName:
                      me.user.displayName ||
                      me.user.email ||
                      "Administrator",
                    email: me.user.email || "",
                  });
                }
              })
              .catch(() => {});
          }
        }}
      />
      <details className="rounded-md border border-border bg-surface-2 p-4">
        <summary className="text-[12.5px] text-ink-2 cursor-pointer">
          {t("setup.prov.manualToggle")}
        </summary>
        <ul className="text-[12.5px] text-ink-2 list-disc ms-5 space-y-1 mt-3">
          <li>{t("setup.s4.b1")}</li>
          <li>{t("setup.s4.b2")}</li>
          <li>{t("setup.s4.b3")}</li>
        </ul>
        <div className="mt-3">
          <Field label={t("authCfg.redirectUri")}>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={props.redirectUri}
                dir="ltr"
                className={`${inputClass} tabular bg-surface-1`}
              />
              <button
                type="button"
                onClick={props.onCopy}
                className="inline-flex items-center gap-1 h-9 px-2 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px] shrink-0"
              >
                {props.copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <Field label={t("authCfg.field.clientId")}>
            <input
              value={props.clientId}
              onChange={(e) => props.setClientId(e.target.value.trim())}
              dir="ltr"
              placeholder="00000000-0000-0000-0000-000000000000"
              className={`${inputClass} tabular`}
            />
          </Field>
          <Field label={t("authCfg.field.tenantId")}>
            <input
              value={props.tenantId}
              onChange={(e) => props.setTenantId(e.target.value.trim())}
              dir="ltr"
              placeholder="common"
              className={`${inputClass} tabular`}
            />
          </Field>
          <Field label={t("authCfg.field.clientSecret")}>
            <input
              value={props.clientSecret}
              onChange={(e) => props.setClientSecret(e.target.value)}
              type="password"
              dir="ltr"
              className={inputClass}
            />
          </Field>
        </div>
      </details>
      <div className="text-[11.5px] text-ink-3">{t("setup.skipHint")}</div>
    </div>
  );
}

function Step5({
  onSignIn,
  onFinish,
  saving,
  authConfigured,
  autoLoggedIn,
  adminIdentity,
  autoProvisioned,
}: {
  onSignIn: () => void;
  onFinish: () => void;
  saving: boolean;
  authConfigured: boolean;
  autoLoggedIn: boolean;
  adminIdentity: { displayName: string; email: string } | null;
  autoProvisioned: boolean;
}) {
  const { t } = useI18n();

  // Happy path — the device-code flow on Step 3/4 already opened an admin
  // session for us. No Microsoft round-trip needed; just click Finish.
  if (autoLoggedIn) {
    const name = adminIdentity?.displayName ?? "Administrator";
    const email = adminIdentity?.email ?? "";
    return (
      <div className="flex flex-col gap-4">
        <StepHeader
          title={t("setup.s5.title")}
          subtitle={t("setup.s5.subtitle")}
        />
        <div className="rounded-md border border-pos/40 bg-pos/10 p-4 flex items-start gap-3">
          <Check size={18} className="text-pos shrink-0 mt-0.5" />
          <div className="flex-1 text-[13px] text-ink-1">
            <div className="font-semibold text-pos">
              {t("setup.s5.alreadyTitle")}
            </div>
            <div className="text-[12.5px] text-ink-2 mt-1">
              {name}
              {email ? (
                <>
                  <span className="mx-1.5 text-ink-3">·</span>
                  <span className="tabular keep-ltr text-ink-3">{email}</span>
                </>
              ) : null}
            </div>
            <div className="text-[11.5px] text-ink-3 mt-2">
              {t("setup.s5.alreadyBody")}
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={onFinish}
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-council-strong text-white text-[13px] font-semibold disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {t("setup.s5.finish")}
          </button>
        </div>
      </div>
    );
  }

  // Fallback — operator went through the manual-credentials escape hatch and
  // hasn't signed in yet. Keep the old OIDC-round-trip button available.
  return (
    <div className="flex flex-col gap-4">
      <StepHeader title={t("setup.s5.title")} subtitle={t("setup.s5.subtitle")} />
      {autoProvisioned ? (
        <div className="rounded-md border border-warn/40 bg-warn/10 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
          <div className="flex-1 text-[12.5px] text-ink-1 leading-relaxed">
            <div className="font-semibold text-ink-1 mb-1">
              {t("setup.s5.consentTitle")}
            </div>
            <div className="text-ink-2">{t("setup.s5.consentBody")}</div>
          </div>
        </div>
      ) : null}
      {authConfigured ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-2">{t("setup.s5.bootstrapBody")}</p>
          <button
            onClick={onSignIn}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-council-strong text-white text-[13px] font-semibold self-start"
          >
            <LogIn size={14} /> {t("setup.s5.signIn")}
          </button>
          <div className="text-[11.5px] text-ink-3">{t("setup.s5.afterSignIn")}</div>
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">{t("setup.s5.openBody")}</p>
      )}
      <div className="mt-2">
        <button
          onClick={onFinish}
          disabled={saving}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-surface-1 text-ink-1 text-[13px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {t("setup.s5.finish")}
        </button>
      </div>
      <a
        href="/login"
        target="_blank"
        rel="noreferrer"
        className="text-[11.5px] text-ink-3 hover:text-ink-1 inline-flex items-center gap-1 self-start"
      >
        <ExternalLink size={11} /> {t("authCfg.testSignIn")}
      </a>
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[16px] font-semibold text-ink-1">{title}</h2>
      <p className="text-[12.5px] text-ink-3 mt-1 leading-relaxed">{subtitle}</p>
    </div>
  );
}

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

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-council-strong focus:ring-2 focus:ring-[var(--ring)]";
