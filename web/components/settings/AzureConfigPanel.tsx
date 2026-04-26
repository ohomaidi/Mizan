"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
import { api } from "@/lib/api/client";

type Source = "db" | "env" | "none";
type AuthMethod = "certificate" | "secret" | "none";
type Loaded = {
  clientId: string;
  clientSecretSet: boolean;
  clientCertSet: boolean;
  clientCertThumbprint: string;
  authMethod: AuthMethod;
  authorityHost: string;
  consentRedirectUri: string;
  updatedAt: string | null;
  source: { clientId: Source; clientSecret: Source; clientCert: Source };
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; config: Loaded };

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[13px] outline-none focus:border-council-strong keep-ltr tabular";

export function AzureConfigPanel() {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authorityHost, setAuthorityHost] = useState("");
  const [consentRedirectUri, setConsentRedirectUri] = useState("");
  // Cert-based auth fields. Either secret OR these is enough.
  const [authMethodChoice, setAuthMethodChoice] = useState<"secret" | "certificate">("secret");
  const [clientCertThumbprint, setClientCertThumbprint] = useState("");
  const [clientCertPrivateKeyPem, setClientCertPrivateKeyPem] = useState("");
  const [clientCertChainPem, setClientCertChainPem] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [banner, setBanner] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(true);
  const [redirectCopied, setRedirectCopied] = useState(false);
  // Deployment mode — drives which Graph + Defender permissions the
  // walkthrough surfaces. Observation deployments need read-only;
  // directive deployments need read + the write scopes that power
  // /directive (CA push, Intune baselines, SharePoint hardening,
  // incident classify, risky-user confirm, IOC push, etc.).
  const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
    "observation",
  );

  const load = useCallback(async () => {
    try {
      const [r, who] = await Promise.all([
        api.getAzureConfig(),
        api.whoami().catch(() => null),
      ]);
      setState({ kind: "ready", config: r.config });
      setClientId(r.config.clientId);
      setClientSecret("");
      setAuthorityHost(r.config.authorityHost);
      setConsentRedirectUri(r.config.consentRedirectUri);
      setAuthMethodChoice(
        r.config.authMethod === "certificate" ? "certificate" : "secret",
      );
      setClientCertThumbprint(r.config.clientCertThumbprint);
      setClientCertPrivateKeyPem("");
      setClientCertChainPem("");
      if (who?.deploymentMode) setDeploymentMode(who.deploymentMode);
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    if (state.kind !== "ready") return;
    setSaving(true);
    setBanner(null);
    try {
      const patch: {
        clientId?: string;
        clientSecret?: string;
        clientCertThumbprint?: string;
        clientCertPrivateKeyPem?: string;
        clientCertChainPem?: string;
        authorityHost?: string;
        consentRedirectUri?: string;
      } = {};
      if (clientId !== state.config.clientId) patch.clientId = clientId;
      if (authorityHost !== state.config.authorityHost) patch.authorityHost = authorityHost;
      if (consentRedirectUri !== state.config.consentRedirectUri)
        patch.consentRedirectUri = consentRedirectUri;
      // Switching auth method: clear the OTHER credential by sending empty
      // strings so the server forgets it. Otherwise the user could end up
      // with both secret and cert stored, with cert silently winning —
      // confusing for ops.
      if (authMethodChoice === "secret") {
        if (clientSecret.length > 0) patch.clientSecret = clientSecret;
        if (state.config.clientCertSet) {
          patch.clientCertThumbprint = "";
          patch.clientCertPrivateKeyPem = "";
          patch.clientCertChainPem = "";
        }
      } else {
        if (clientCertThumbprint !== state.config.clientCertThumbprint)
          patch.clientCertThumbprint = clientCertThumbprint;
        if (clientCertPrivateKeyPem.length > 0)
          patch.clientCertPrivateKeyPem = clientCertPrivateKeyPem;
        if (clientCertChainPem.length > 0)
          patch.clientCertChainPem = clientCertChainPem;
        if (state.config.clientSecretSet) patch.clientSecret = "";
      }
      if (Object.keys(patch).length === 0) {
        setSaving(false);
        return;
      }
      const r = await api.saveAzureConfig(patch);
      setState({ kind: "ready", config: r.config });
      setClientSecret("");
      setClientCertPrivateKeyPem("");
      setClientCertChainPem("");
      setBanner({ tone: "ok", text: t("azureCfg.saved") });
    } catch (err) {
      setBanner({ tone: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const onClear = async () => {
    setClearing(true);
    setBanner(null);
    try {
      await api.clearAzureConfig();
      await load();
      setBanner({ tone: "ok", text: t("azureCfg.cleared") });
    } catch (err) {
      setBanner({ tone: "err", text: (err as Error).message });
    } finally {
      setClearing(false);
    }
  };

  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "error") return <ErrorState message={state.message} onRetry={load} />;

  const ready =
    state.config.clientId.length > 0 &&
    (state.config.clientSecretSet || state.config.clientCertSet);
  const dirty =
    clientId !== state.config.clientId ||
    clientSecret.length > 0 ||
    authorityHost !== state.config.authorityHost ||
    consentRedirectUri !== state.config.consentRedirectUri ||
    (authMethodChoice === "certificate" &&
      (clientCertThumbprint !== state.config.clientCertThumbprint ||
        clientCertPrivateKeyPem.length > 0 ||
        clientCertChainPem.length > 0)) ||
    (authMethodChoice === "secret" && state.config.authMethod === "certificate") ||
    (authMethodChoice === "certificate" && state.config.authMethod === "secret");

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/consent-callback`
      : "/api/auth/consent-callback";
  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setRedirectCopied(true);
      setTimeout(() => setRedirectCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Walkthrough
        open={walkthroughOpen}
        onToggle={() => setWalkthroughOpen((v) => !v)}
        redirectUri={redirectUri}
        onCopyRedirect={copyRedirect}
        copied={redirectCopied}
        deploymentMode={deploymentMode}
      />
      <Card>
        <CardHeader
          title={t("azureCfg.title")}
          subtitle={t("azureCfg.subtitle")}
          right={
            <div
              className={`inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded border ${
                ready
                  ? "text-pos border-pos/40 bg-pos/10"
                  : "text-warn border-warn/40 bg-warn/10"
              }`}
            >
              {ready ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              {ready ? t("azureCfg.status.ready") : t("azureCfg.status.missing")}
            </div>
          }
        />

        {banner ? (
          <div
            className={`rounded-md p-2.5 text-[12.5px] border mb-4 ${
              banner.tone === "ok"
                ? "border-pos/40 bg-pos/10 text-ink-1"
                : "border-neg/40 bg-neg/10 text-ink-1"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 max-w-[640px]">
          <Field
            label={t("azureCfg.field.clientId")}
            source={state.config.source.clientId}
          >
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className={inputClass}
              dir="ltr"
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[11.5px] text-ink-3 mb-1">
              {t("azureCfg.field.authMethod")}
            </legend>
            <div className="flex gap-2">
              {(["secret", "certificate"] as const).map((m) => {
                const active = authMethodChoice === m;
                return (
                  <label
                    key={m}
                    className={`flex-1 flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
                      active
                        ? "border-council-strong bg-council-strong/5"
                        : "border-border bg-surface-1 hover:border-council-strong/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="auth-method"
                      checked={active}
                      onChange={() => setAuthMethodChoice(m)}
                      className="mt-0.5 accent-council-strong"
                    />
                    <span className="text-[12.5px] text-ink-1 leading-snug">
                      <span className="font-semibold">
                        {t(
                          m === "secret"
                            ? "azureCfg.authMethod.secret"
                            : "azureCfg.authMethod.cert",
                        )}
                      </span>
                      <span className="block text-[10.5px] text-ink-3 mt-0.5">
                        {t(
                          m === "secret"
                            ? "azureCfg.authMethod.secretHint"
                            : "azureCfg.authMethod.certHint",
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {authMethodChoice === "secret" ? (
            <Field
              label={t("azureCfg.field.clientSecret")}
              source={state.config.source.clientSecret}
            >
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={
                  state.config.clientSecretSet
                    ? t("azureCfg.secret.placeholderReplace")
                    : t("azureCfg.secret.placeholderNew")
                }
                className={inputClass}
                dir="ltr"
                autoComplete="off"
              />
              <p className="text-[11.5px] text-ink-3 mt-1">
                {state.config.clientSecretSet
                  ? t("azureCfg.secret.hasValue")
                  : t("azureCfg.secret.never")}
              </p>
            </Field>
          ) : (
            <>
              <Field
                label={t("azureCfg.field.clientCertThumbprint")}
                source={state.config.source.clientCert}
              >
                <input
                  value={clientCertThumbprint}
                  onChange={(e) =>
                    setClientCertThumbprint(
                      e.target.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase(),
                    )
                  }
                  placeholder="A1B2C3D4E5F6...   (40 hex chars, no colons)"
                  className={inputClass}
                  dir="ltr"
                  maxLength={40}
                />
                <p className="text-[11.5px] text-ink-3 mt-1">
                  {t("azureCfg.cert.thumbprintHint")}
                </p>
              </Field>
              <Field
                label={t("azureCfg.field.clientCertPrivateKeyPem")}
              >
                <textarea
                  value={clientCertPrivateKeyPem}
                  onChange={(e) => setClientCertPrivateKeyPem(e.target.value)}
                  placeholder={
                    state.config.clientCertSet
                      ? t("azureCfg.cert.privateKeyPlaceholderReplace")
                      : "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
                  }
                  className="w-full min-h-[160px] px-3 py-2 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[11.5px] outline-none focus:border-council-strong keep-ltr font-mono"
                  dir="ltr"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-[11.5px] text-ink-3 mt-1">
                  {state.config.clientCertSet
                    ? t("azureCfg.cert.hasValue")
                    : t("azureCfg.cert.never")}
                </p>
              </Field>
              <Field label={t("azureCfg.field.clientCertChainPem")}>
                <textarea
                  value={clientCertChainPem}
                  onChange={(e) => setClientCertChainPem(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-border bg-surface-1 text-ink-1 placeholder:text-ink-3 text-[11.5px] outline-none focus:border-council-strong keep-ltr font-mono"
                  dir="ltr"
                  spellCheck={false}
                />
                <p className="text-[11.5px] text-ink-3 mt-1">
                  {t("azureCfg.cert.chainHint")}
                </p>
              </Field>
            </>
          )}

          <Field label={t("azureCfg.field.authorityHost")}>
            <input
              value={authorityHost}
              onChange={(e) => setAuthorityHost(e.target.value)}
              placeholder="https://login.microsoftonline.com"
              className={inputClass}
              dir="ltr"
            />
          </Field>

          <Field label={t("azureCfg.field.consentRedirectUri")}>
            <input
              value={consentRedirectUri}
              onChange={(e) => setConsentRedirectUri(e.target.value)}
              placeholder="https://scscdemo.example.com/api/auth/consent-callback"
              className={inputClass}
              dir="ltr"
            />
            <p className="text-[11.5px] text-ink-3 mt-1">
              {t("azureCfg.field.consentRedirectUri.hint")}
            </p>
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onClear}
            disabled={clearing || saving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-neg disabled:opacity-50"
          >
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t("azureCfg.clear")}
          </button>
          <div className="flex items-center gap-3">
            {state.config.updatedAt ? (
              <span className="text-[11.5px] text-ink-3 tabular">
                {t("azureCfg.updatedAt", { when: fmtRelative(state.config.updatedAt) })}
              </span>
            ) : null}
            <button
              onClick={onSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {t("azureCfg.save")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Microsoft Graph permissions surfaced in the walkthrough. The walkthrough
// auto-selects the correct list at render time based on `deploymentMode`
// (whoami exposes it). Keep these arrays in sync with the provisioner's
// `GRAPH_APP_PERMISSIONS` / `GRAPH_APP_WRITE_PERMISSIONS` in
// `lib/auth/graph-app-provisioner.ts` — that's the source of truth for
// what gets registered on the Entra app at provision time.
//
// READ scopes are required in BOTH observation and directive deployments.
const GRAPH_READ_PERMISSIONS = [
  "SecurityEvents.Read.All",
  "SecurityIncident.Read.All",
  "SecurityAlert.Read.All",
  "ThreatHunting.Read.All",
  "SecurityIdentitiesHealth.Read.All",
  "AttackSimulation.Read.All",
  "ThreatIntelligence.Read.All",
  "IdentityRiskyUser.Read.All",
  "IdentityRiskEvent.Read.All",
  "Policy.Read.All",
  "RoleManagement.Read.Directory",
  "RoleEligibilitySchedule.Read.Directory",
  "AuditLog.Read.All",
  "AuditLogsQuery.Read.All",
  "DeviceManagementManagedDevices.Read.All",
  "DeviceManagementConfiguration.Read.All",
  "InformationProtectionPolicy.Read.All",
  "RecordsManagement.Read.All",
  "SubjectRightsRequest.Read.All",
  "SharePointTenantSettings.Read.All",
];

// WRITE scopes — added ONLY in directive deployments. These are what the
// /directive surface uses to push CA / Intune / SharePoint baselines,
// classify incidents/alerts, confirm/dismiss risky users, revoke sessions,
// submit threats, etc. Observation deployments must not have these.
const GRAPH_WRITE_PERMISSIONS = [
  "Policy.ReadWrite.ConditionalAccess",
  "Application.Read.All",
  "DeviceManagementConfiguration.ReadWrite.All",
  "DeviceManagementManagedDevices.ReadWrite.All",
  "DeviceManagementManagedDevices.PrivilegedOperations.All",
  "DeviceManagementApps.ReadWrite.All",
  "SecurityIncident.ReadWrite.All",
  "SecurityAlert.ReadWrite.All",
  "IdentityRiskyUser.ReadWrite.All",
  "User.RevokeSessions.All",
  "ThreatSubmission.ReadWrite.All",
  "SharePointTenantSettings.ReadWrite.All",
];

// Defender for Endpoint API — second resource block on the same Entra
// app. Read scope (Machine.Read.All) is required in BOTH modes for the
// MDE workload-coverage card. Write scope (Ti.ReadWrite.All) powers IOC
// push and is added ONLY in directive deployments.
const DEFENDER_READ_PERMISSIONS = ["Machine.Read.All"];
const DEFENDER_WRITE_PERMISSIONS = ["Ti.ReadWrite.All"];

function Walkthrough({
  open,
  onToggle,
  redirectUri,
  onCopyRedirect,
  copied,
  deploymentMode,
}: {
  open: boolean;
  onToggle: () => void;
  redirectUri: string;
  onCopyRedirect: () => void;
  copied: boolean;
  deploymentMode: "observation" | "directive";
}) {
  const { t, branding } = useI18n();
  const isDirective = deploymentMode === "directive";
  // Brand-driven example values so the walkthrough text reflects the
  // deployment's actual organization name. Falls back to neutral
  // wording when branding is empty (fresh install before /setup).
  const orgName = branding.nameEn?.trim() || "Your Organization";
  const orgShort = branding.shortEn?.trim() || "Mizan";
  const exampleAppName = `${orgShort} Posture Dashboard`;
  const exampleSecretDesc = `${orgShort} Posture Dashboard`;
  return (
    <Card className="p-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-5 text-start"
      >
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-ink-1">
            {t("azureCfg.walkthrough.title")}
          </div>
          <div className="text-[12.5px] text-ink-2 mt-0.5">
            {t("azureCfg.walkthrough.subtitle")}
          </div>
        </div>
        <div className="text-ink-3 text-[12px] inline-flex items-center gap-1.5 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
          {open
            ? t("azureCfg.walkthrough.toggle.hide")
            : t("azureCfg.walkthrough.toggle.show")}
        </div>
      </button>

      {open ? (
        <div className="px-5 pb-5 border-t border-border text-[13px] text-ink-2 leading-relaxed space-y-4">
          {/* Mode banner — clarifies WHICH permission set the rest of
              the walkthrough applies to. Without this the operator
              has no signal that what they're seeing is tailored to
              their deployment. Directive deployments must register
              the write scopes too; observation must NOT (overgrant). */}
          <div
            className={`rounded-md border p-3 text-[12.5px] ${
              isDirective
                ? "border-council-strong/40 bg-council-strong/5 text-ink-1"
                : "border-border bg-surface-1 text-ink-2"
            }`}
          >
            <div className="font-semibold text-ink-1 mb-0.5">
              {isDirective
                ? "Directive deployment — read + write permissions required"
                : "Observation deployment — read-only permissions"}
            </div>
            <div className="text-[12px] text-ink-2">
              {isDirective
                ? "This deployment is in directive mode. The Entra app you create below must include both the read and write scopes shown in Step 3 — without the write scopes, the /directive surface (Conditional Access push, Intune baselines, SharePoint hardening, incident classify, IOC push) cannot function."
                : "This deployment is in observation mode (read-only). The app needs only the read-side scopes shown in Step 3. To unlock the /directive surface later, switch deployment mode and re-register the app — admin consent is scope-wide and cannot be widened in place."}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-1.5">
              {t("azureCfg.walkthrough.redirectUri")}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-surface-1 border border-border text-[12.5px] text-ink-1 tabular keep-ltr truncate">
                {redirectUri}
              </code>
              <button
                onClick={onCopyRedirect}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12.5px]"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <Step n={1} title="Open the Entra admin center">
            Go to{" "}
            <a
              href="https://entra.microsoft.com"
              target="_blank"
              rel="noreferrer"
              className="text-council-strong hover:underline keep-ltr"
            >
              entra.microsoft.com
            </a>{" "}
            and sign in as a <strong>Global Administrator of the operator
            tenant</strong> — i.e. {orgName}'s own Microsoft 365 tenant, not
            any entity tenant you'll later onboard. Make sure the directory
            switcher in the top-right is on your organization's directory.
          </Step>

          <Step n={2} title="Create a new app registration">
            Left nav → <strong>Identity → Applications → App registrations</strong>{" "}
            → <strong>+ New registration</strong>.
            <ul className="list-disc ms-5 mt-2 space-y-1">
              <li>
                <strong>Name:</strong>{" "}
                <code className="keep-ltr">{exampleAppName}</code>{" "}
                <span className="text-ink-3">
                  (any name works; this is just a label inside Entra)
                </span>
              </li>
              <li>
                <strong>Supported account types:</strong> Accounts in{" "}
                <em>any</em> organizational directory (Multitenant). Critical
                — single-tenant will not work for this platform.
              </li>
              <li>
                <strong>Redirect URI:</strong> platform <strong>Web</strong>,
                value copied from above.
              </li>
            </ul>
            <div className="mt-2">
              Click <strong>Register</strong>. On the Overview tab, copy the{" "}
              <strong>Application (client) ID</strong> — this is your Client
              ID below.
            </div>
          </Step>

          <Step
            n={3}
            title={
              isDirective
                ? "Grant Graph permissions (read + write)"
                : "Grant Graph read permissions"
            }
          >
            Left nav inside the app → <strong>API permissions</strong> →{" "}
            <strong>+ Add a permission</strong> → <strong>Microsoft Graph</strong>{" "}
            → <strong>Application permissions</strong>. Tick every permission
            below (use the search box). Click <strong>Add permissions</strong>{" "}
            after each block.

            {/* READ block — required in BOTH modes. */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-1">
                Microsoft Graph — read scopes ({GRAPH_READ_PERMISSIONS.length}){" "}
                <span className="normal-case tracking-normal text-ink-3/80">
                  required in every deployment
                </span>
              </div>
              <div className="rounded-md border border-border bg-surface-1 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {GRAPH_READ_PERMISSIONS.map((p) => (
                  <code key={p} className="text-[11.5px] text-ink-2 keep-ltr">
                    {p}
                  </code>
                ))}
              </div>
            </div>

            {/* WRITE block — directive deployments only. */}
            {isDirective ? (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-[0.08em] text-council-strong mb-1">
                  Microsoft Graph — write scopes ({GRAPH_WRITE_PERMISSIONS.length}){" "}
                  <span className="normal-case tracking-normal text-ink-3/80">
                    directive mode only · powers /directive
                  </span>
                </div>
                <div className="rounded-md border border-council-strong/40 bg-council-strong/5 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                  {GRAPH_WRITE_PERMISSIONS.map((p) => (
                    <code key={p} className="text-[11.5px] text-ink-1 keep-ltr">
                      {p}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Defender for Endpoint API — second resource block.
                Read scope is required in every deployment (powers
                the MDE workload-coverage card); the write scope
                drives IOC push and is directive-only. */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-1">
                Defender for Endpoint API — separate resource (
                {isDirective
                  ? DEFENDER_READ_PERMISSIONS.length +
                    DEFENDER_WRITE_PERMISSIONS.length
                  : DEFENDER_READ_PERMISSIONS.length}
                ){" "}
                <span className="normal-case tracking-normal text-ink-3/80">
                  + Add a permission → APIs my organization uses → search{" "}
                  <code className="keep-ltr">WindowsDefenderATP</code>
                </span>
              </div>
              <div className="rounded-md border border-border bg-surface-1 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {DEFENDER_READ_PERMISSIONS.map((p) => (
                  <code key={p} className="text-[11.5px] text-ink-2 keep-ltr">
                    {p}
                  </code>
                ))}
                {isDirective
                  ? DEFENDER_WRITE_PERMISSIONS.map((p) => (
                      <code
                        key={p}
                        className="text-[11.5px] text-council-strong keep-ltr"
                      >
                        {p}
                      </code>
                    ))
                  : null}
              </div>
            </div>

            <div className="mt-3">
              When all blocks are added, click{" "}
              <strong>Grant admin consent for &lt;your tenant&gt;</strong> at
              the top of the API permissions page. Every row should show a
              green ✓ Granted indicator before you continue.
            </div>
          </Step>

          <Step n={4} title="Create a client secret">
            Left nav → <strong>Certificates & secrets</strong> → Client secrets
            tab → <strong>+ New client secret</strong>.
            <ul className="list-disc ms-5 mt-2 space-y-1">
              <li>
                <strong>Description:</strong>{" "}
                <code className="keep-ltr">{exampleSecretDesc}</code>{" "}
                <span className="text-ink-3">
                  (any description works; this is for your own reference)
                </span>
              </li>
              <li>
                <strong>Expires:</strong> 24 months (the maximum the UI
                offers; rotate before expiry)
              </li>
            </ul>
            <div className="mt-2">
              Click <strong>Add</strong>. <strong>Immediately copy the Value</strong>{" "}
              (not the Secret ID) — Entra only shows it once. If you miss it,
              delete the secret and create a new one.
            </div>
          </Step>

          <Step n={5} title="Paste the values below">
            Paste the <strong>Application (client) ID</strong> from step 2 into
            the Client ID field below. Paste the secret <strong>Value</strong>{" "}
            from step 4 into Client secret. Leave Authority host at the default
            (<code className="keep-ltr">https://login.microsoftonline.com</code>)
            unless you're on a sovereign cloud. Leave Consent redirect URI
            blank — the dashboard derives it from APP_BASE_URL.
            <div className="mt-2">
              Click <strong>Save</strong>. The status pill flips to green
              ("Ready") and the next Graph call uses the new credentials
              immediately.
            </div>
          </Step>

          <Step n={6} title="Test with a real entity">
            Open <strong>Settings → Entities</strong> and walk the Onboarding
            Wizard with your first entity. At Step 3 (Generate), the consent
            URL should be created (no "not configured" warning). Once the
            entity admin consents, the first sync runs automatically and the
            entity lights up in the Maturity overview within ~10 minutes.
          </Step>
        </div>
      ) : null}
    </Card>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-6 w-6 rounded-full bg-council-strong/15 text-council-strong grid place-items-center text-[11px] font-semibold shrink-0 tabular">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink-1 mb-0.5">
          {title}
        </div>
        <div className="text-[12.5px] text-ink-2">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  source,
  children,
}: {
  label: string;
  source?: Source;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const sourceLabel =
    source === "db"
      ? t("azureCfg.source.db")
      : source === "env"
        ? t("azureCfg.source.env")
        : source === "none"
          ? t("azureCfg.source.none")
          : null;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-ink-3 inline-flex items-center gap-1.5">
        {label}
        {sourceLabel ? (
          <span
            className={`text-[10px] uppercase tracking-[0.08em] px-1 py-px rounded ${
              source === "db"
                ? "bg-council-strong/15 text-council-strong"
                : source === "env"
                  ? "bg-warn/15 text-warn"
                  : "bg-surface-3 text-ink-3"
            }`}
          >
            {sourceLabel}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
