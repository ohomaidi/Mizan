"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Check, Copy, ExternalLink, RefreshCw, Loader2, Trash2, FileDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { HealthDot } from "@/components/ui/HealthDot";
import { NotConfiguredState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { useFmtRelative } from "@/lib/i18n/time";
import { CLUSTERS, type ClusterId } from "@/lib/data/clusters";
import { api } from "@/lib/api/client";
import type { EntityRow } from "@/lib/compute/aggregate";
import { MaturityConfigPanel } from "@/components/settings/MaturityConfigPanel";
import { PdfTemplatePanel } from "@/components/settings/PdfTemplatePanel";
import { DiscoveryTemplatePanel } from "@/components/settings/DiscoveryTemplatePanel";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";
import { AzureConfigPanel } from "@/components/settings/AzureConfigPanel";
import { NesaMappingPanel } from "@/components/settings/NesaMappingPanel";
import { DocumentationPanel } from "@/components/settings/DocumentationPanel";
import { OnboardingWizard } from "@/components/settings/OnboardingWizard";
import { DeleteEntityModal } from "@/components/settings/DeleteEntityModal";
import { BrandingPanel } from "@/components/settings/BrandingPanel";
import { AuthConfigPanel } from "@/components/settings/AuthConfigPanel";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { AboutPanel } from "@/components/settings/AboutPanel";
import { OrganizationPanel } from "@/components/settings/OrganizationPanel";
import { AutoSuggestPanel } from "@/components/settings/AutoSuggestPanel";
import { SystemPanel } from "@/components/settings/SystemPanel";
import type { DictKey } from "@/lib/i18n/dict";

type SettingsTab =
  | "organization"
  | "entities"
  | "branding"
  | "auth"
  | "maturity"
  | "pdf"
  | "discovery"
  | "audit"
  | "azure"
  | "nesa"
  | "risk"
  | "system"
  | "docs"
  | "about";

type Draft = {
  nameEn: string;
  nameAr: string;
  cluster: ClusterId;
  tenantId: string;
  domain: string;
  ciso: string;
  cisoEmail: string;
};

const EMPTY: Draft = {
  nameEn: "",
  nameAr: "",
  cluster: "police",
  tenantId: "",
  domain: "",
  ciso: "",
  cisoEmail: "",
};

type Onboarded = {
  tenant: { id: string };
  consentUrl: string | null;
  azureConfigured: boolean;
};

function PdfLinks({ tenantId }: { tenantId: string }) {
  const { t } = useI18n();
  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={`/api/tenants/${tenantId}/onboarding-letter?lang=en`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-[11.5px] text-ink-2 hover:text-ink-1 hover:bg-surface-3"
        title={`${t("settings.pdf.download")} — ${t("settings.pdf.en")}`}
      >
        <FileDown size={11} /> EN
      </a>
      <a
        href={`/api/tenants/${tenantId}/onboarding-letter?lang=ar`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border text-[11.5px] text-ink-2 hover:text-ink-1 hover:bg-surface-3"
        title={`${t("settings.pdf.download")} — ${t("settings.pdf.ar")}`}
      >
        <FileDown size={11} /> AR
      </a>
    </div>
  );
}

/**
 * Settings UI client. Receives `initialDeploymentKind` from the
 * server `page.tsx` shim so the very first paint already knows
 * whether to render the Council tab list (entities-led) or the
 * Executive list (organization-led). v2.6.3 split — without this
 * pre-resolved hint the page used to flash the Council tabs on
 * Executive deployments before whoami() completed and re-rendered.
 */
export function SettingsClient({
  initialDeploymentKind,
}: {
  initialDeploymentKind: "council" | "executive";
}) {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner initialDeploymentKind={initialDeploymentKind} />
    </Suspense>
  );
}

function SettingsPageInner({
  initialDeploymentKind,
}: {
  initialDeploymentKind: "council" | "executive";
}) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const fmtRelative = useFmtRelative();
  const searchParams = useSearchParams();

  // v2.6.3 — Settings tab list now branches on deploymentKind. The
  // Council list (multi-tenant onboarding workshop) is wholly
  // inappropriate for an Executive deployment with N=1 tenant —
  // operators don't onboard themselves, list peers, or run
  // discovery letters. Executive gets a compact list led by a new
  // "Organization" tab that owns the single-tenant profile +
  // Microsoft Graph connection health. Initial state seeded by the
  // server `page.tsx` shim so the very first paint already shows
  // the correct tab list.
  const [isExecutive, setIsExecutive] = useState(
    initialDeploymentKind === "executive",
  );

  const COUNCIL_TABS: Array<{ id: SettingsTab; labelKey: DictKey }> = [
    { id: "entities", labelKey: "settings.tab.entities" },
    { id: "branding", labelKey: "settings.tab.branding" },
    { id: "auth", labelKey: "settings.tab.auth" },
    { id: "azure", labelKey: "settings.tab.azure" },
    { id: "maturity", labelKey: "settings.tab.maturity" },
    { id: "nesa", labelKey: "settings.tab.nesa" },
    { id: "discovery", labelKey: "settings.tab.discovery" },
    { id: "pdf", labelKey: "settings.tab.pdf" },
    { id: "system", labelKey: "settings.tab.system" },
    { id: "audit", labelKey: "settings.tab.audit" },
    { id: "docs", labelKey: "settings.tab.docs" },
    { id: "about", labelKey: "settings.tab.about" },
  ];
  const EXECUTIVE_TABS: Array<{ id: SettingsTab; labelKey: DictKey }> = [
    { id: "organization", labelKey: "settings.tab.organization" },
    { id: "branding", labelKey: "settings.tab.branding" },
    { id: "auth", labelKey: "settings.tab.auth" },
    { id: "azure", labelKey: "settings.tab.azure" },
    { id: "maturity", labelKey: "settings.tab.maturity" },
    { id: "nesa", labelKey: "settings.tab.compliance" },
    { id: "risk", labelKey: "settings.tab.risk" },
    { id: "pdf", labelKey: "settings.tab.pdf" },
    { id: "system", labelKey: "settings.tab.system" },
    { id: "audit", labelKey: "settings.tab.audit" },
    { id: "docs", labelKey: "settings.tab.docs" },
    { id: "about", labelKey: "settings.tab.about" },
  ];
  const TABS = isExecutive ? EXECUTIVE_TABS : COUNCIL_TABS;
  const defaultTab: SettingsTab = isExecutive ? "organization" : "entities";
  const requestedTab = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab =
    requestedTab && TABS.some((tb) => tb.id === requestedTab)
      ? requestedTab
      : defaultTab;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [submitted, setSubmitted] = useState<Onboarded | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entities, setEntities] = useState<EntityRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [useWizard, setUseWizard] = useState<boolean>(true);
  const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
    "observation",
  );

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (!alive) return;
        setDeploymentMode(r.deploymentMode);
        if (
          (r as { deploymentKind?: string }).deploymentKind === "executive"
        ) {
          setIsExecutive(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const consentBanner = searchParams.get("consent");
  const consentTenant = searchParams.get("tenant");
  const consentReason = searchParams.get("reason");

  const loadEntities = useCallback(async () => {
    try {
      const r = await api.getEntities();
      setEntities(r.entities);
    } catch {
      setEntities([]);
    }
  }, []);
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const validEn = draft.nameEn.trim().length > 1;
  const validAr = draft.nameAr.trim().length > 1;
  const validDomain = /\./.test(draft.domain);
  const validTenant = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    draft.tenantId.trim(),
  );
  const canSubmit = validEn && validAr && validDomain && validTenant && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createTenant(draft);
      setSubmitted(res);
      loadEntities();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSyncEntity = async (id: string) => {
    setBusyId(id);
    try {
      await api.syncTenant(id);
      await loadEntities();
    } finally {
      setBusyId(null);
    }
  };

  // v2.5.24 — replaced the bare confirm() prompt with a real modal that
  // tells operators about the orphan SP that gets left behind in the
  // entity tenant. Without that warning, every delete-and-reonboard
  // workflow silently lands on AADSTS650051 because the entity-side SP
  // wasn't cleaned up.
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nameEn: string;
    nameAr: string;
    tenantId: string;
  } | null>(null);

  const onDeleteEntity = async (id: string) => {
    const target = entities?.find((e) => e.id === id);
    if (!target) return;
    setDeleteTarget({
      id: target.id,
      nameEn: target.nameEn,
      nameAr: target.nameAr,
      tenantId: target.tenantId,
    });
  };

  const onConfirmDelete = async (id: string) => {
    setBusyId(id);
    try {
      await api.deleteTenant(id);
      await loadEntities();
    } finally {
      setBusyId(null);
    }
  };

  const bannerText =
    consentBanner === "ok"
      ? t("settings.consent.ok")
      : consentBanner === "failed"
        ? `${t("settings.consent.failed")} ${consentReason ? `(${consentReason})` : ""}`
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("page.settings.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("page.settings.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
          {t("page.settings.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-border -mt-2 overflow-x-auto">
        {TABS.map((tb) => {
          // The default tab gets the bare /settings URL — Executive
          // defaults to "organization", Council defaults to "entities".
          const href = tb.id === defaultTab ? "/settings" : `/settings?tab=${tb.id}`;
          const active = activeTab === tb.id;
          return (
            <a
              key={tb.id}
              href={href}
              className={`h-9 px-3 text-[13px] border-b-2 transition-colors -mb-px whitespace-nowrap ${
                active
                  ? "border-council-strong text-ink-1 font-medium"
                  : "border-transparent text-ink-2 hover:text-ink-1"
              }`}
            >
              {t(tb.labelKey)}
            </a>
          );
        })}
      </div>

      {activeTab === "organization" ? <OrganizationPanel /> : null}
      {activeTab === "risk" ? <AutoSuggestPanel /> : null}
      {activeTab === "system" ? <SystemPanel /> : null}
      {activeTab === "branding" ? <BrandingPanel /> : null}
      {activeTab === "auth" ? (
        <div className="flex flex-col gap-5">
          <AuthConfigPanel />
          <UsersPanel />
        </div>
      ) : null}
      {activeTab === "maturity" ? <MaturityConfigPanel /> : null}
      {activeTab === "pdf" ? <PdfTemplatePanel /> : null}
      {activeTab === "discovery" ? <DiscoveryTemplatePanel /> : null}
      {activeTab === "audit" ? <AuditLogPanel /> : null}
      {activeTab === "azure" ? <AzureConfigPanel /> : null}
      {activeTab === "nesa" ? <NesaMappingPanel /> : null}
      {activeTab === "docs" ? <DocumentationPanel /> : null}
      {activeTab === "about" ? <AboutPanel /> : null}
      {activeTab === "entities" ? (
      <>
      <DiscoveryBanner />
      {bannerText ? (
        <div
          className={`rounded-md p-3 text-[13px] border ${
            consentBanner === "ok"
              ? "border-pos/40 bg-pos/10 text-ink-1"
              : "border-neg/40 bg-neg/10 text-ink-1"
          }`}
        >
          {bannerText}
          {consentTenant ? ` — ${consentTenant}` : ""}
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            setUseWizard((v) => !v);
            setSubmitted(null);
          }}
          className="text-[12px] text-ink-3 hover:text-ink-1 underline underline-offset-2"
        >
          {useWizard ? t("wizard.toggle.useForm") : t("wizard.toggle.useWizard")}
        </button>
      </div>

      {useWizard && !submitted ? (
        <OnboardingWizard onDone={loadEntities} />
      ) : submitted ? (
        <Card>
          <CardHeader
            title={t("settings.newEntity.title")}
            subtitle={t("settings.newEntity.subtitle")}
          />
          <ConsentLinkPanel
            tenantId={submitted.tenant.id}
            consentUrl={submitted.consentUrl}
            azureConfigured={submitted.azureConfigured}
            onReset={() => {
              setSubmitted(null);
              setDraft(EMPTY);
            }}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={t("settings.newEntity.title")}
            subtitle={t("settings.newEntity.subtitle")}
          />
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("settings.field.nameEn")} required requiredLabel={t("settings.field.required")}>
              <input
                required
                value={draft.nameEn}
                onChange={(e) => set("nameEn", e.target.value)}
                dir="ltr"
                placeholder={t("settings.field.nameEn.placeholder")}
                className={inputClass}
              />
            </Field>
            <Field label={t("settings.field.nameAr")} required requiredLabel={t("settings.field.required")}>
              <input
                required
                value={draft.nameAr}
                onChange={(e) => set("nameAr", e.target.value)}
                dir="rtl"
                placeholder={t("settings.field.nameAr.placeholder")}
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
            <Field label={t("settings.field.domain")} required requiredLabel={t("settings.field.required")}>
              <input
                required
                value={draft.domain}
                onChange={(e) => set("domain", e.target.value)}
                dir="ltr"
                placeholder="entity.gov.ae"
                className={inputClass}
              />
            </Field>
            <Field label={t("settings.field.tenantId")} required requiredLabel={t("settings.field.required")}>
              <input
                required
                value={draft.tenantId}
                onChange={(e) => set("tenantId", e.target.value)}
                dir="ltr"
                placeholder="00000000-0000-0000-0000-000000000000"
                className={`${inputClass} tabular`}
              />
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
            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
              {submitError ? (
                <span className="text-[11.5px] text-neg">{submitError}</span>
              ) : (
                <span className="text-[11.5px] text-ink-3">{t("settings.submit.preview")}</span>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {t("settings.submit.add")}
              </button>
            </div>
          </form>
        </Card>
      )}

      <DeleteEntityModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        entity={deleteTarget}
        onConfirmed={onConfirmDelete}
      />

      <Card className="p-0">
        <div className="p-5">
          <CardHeader
            title={t("settings.existing.title")}
            subtitle={t("settings.existing.subtitle", { count: fmt(entities?.length ?? 0) })}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("settings.field.nameEn")}</th>
                <th className="py-2.5 text-start font-semibold">{t("settings.field.nameAr")}</th>
                <th className="py-2.5 text-start font-semibold">{t("settings.list.clusterHeader")}</th>
                <th className="py-2.5 text-start font-semibold">{t("settings.field.tenantId")}</th>
                <th className="py-2.5 text-start font-semibold">{t("settings.list.status")}</th>
                <th className="py-2.5 text-start font-semibold">{t("cols.lastSync")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {entities === null ? (
                <tr>
                  <td colSpan={7} className="py-6 ps-5 text-ink-3">
                    {t("state.loading")}
                  </td>
                </tr>
              ) : entities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 ps-5 text-ink-3">
                    {t("state.empty.title")}
                  </td>
                </tr>
              ) : (
                entities.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-2.5 ps-5 text-ink-1" dir="ltr">
                      {e.nameEn}
                    </td>
                    <td className="py-2.5 text-ink-1" dir="rtl">
                      {e.nameAr}
                    </td>
                    <td className="py-2.5 text-ink-2">
                      {(() => {
                        const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                        return c ? (locale === "ar" ? c.labelAr : c.label) : e.cluster;
                      })()}
                    </td>
                    <td className="py-2.5 text-ink-3 tabular keep-ltr">{e.tenantId}</td>
                    <td className="py-2.5">
                      {e.consentStatus === "consented" ? (
                        <HealthDot status={e.connection === "pending" ? "amber" : e.connection} showLabel />
                      ) : (
                        <span className="text-ink-3 text-[12px]">
                          {t(`consent.status.${e.consentStatus}` as
                            | "consent.status.pending"
                            | "consent.status.consented"
                            | "consent.status.revoked"
                            | "consent.status.failed")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-ink-3 tabular">
                      {e.lastSyncAt ? fmtRelative(e.lastSyncAt) : t("sync.never")}
                    </td>
                    <td className="py-2.5 pe-5 text-end">
                      <div className="inline-flex items-center gap-1">
                        <PdfLinks tenantId={e.id} />
                        {e.consentStatus === "consented" ? (
                          <button
                            onClick={() => onSyncEntity(e.id)}
                            disabled={busyId === e.id}
                            className="h-7 w-7 grid place-items-center rounded border border-border text-ink-2 hover:text-ink-1 disabled:opacity-50"
                            aria-label={t("sync.now")}
                          >
                            {busyId === e.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                          </button>
                        ) : null}
                        <button
                          onClick={() => onDeleteEntity(e.id)}
                          disabled={busyId === e.id}
                          className="h-7 w-7 grid place-items-center rounded border border-border text-ink-2 hover:text-neg hover:border-neg/50 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </>
      ) : null}
    </div>
  );
}

function ConsentLinkPanel({
  tenantId,
  consentUrl,
  azureConfigured,
  onReset,
}: {
  tenantId: string;
  consentUrl: string | null;
  azureConfigured: boolean;
  onReset: () => void;
}) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);

  const pdfButton = (
    <div className="flex items-center gap-2">
      <a
        href={`/api/tenants/${tenantId}/onboarding-letter?lang=en`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
      >
        <FileDown size={13} /> {t("settings.pdf.download")} — {t("settings.pdf.en")}
      </a>
      <a
        href={`/api/tenants/${tenantId}/onboarding-letter?lang=ar`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
      >
        <FileDown size={13} /> {t("settings.pdf.download")} — {t("settings.pdf.ar")}
      </a>
    </div>
  );

  if (!azureConfigured) {
    return (
      <div className="space-y-3">
        <NotConfiguredState />
        {pdfButton}
        <button
          onClick={onReset}
          className="h-8 px-3 text-[12px] rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1"
        >
          {locale === "ar" ? "تسجيل جهة أخرى" : "Onboard another entity"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-pos/40 bg-pos/10 p-4 text-[13px] text-ink-1 space-y-3">
      <div className="flex items-center gap-2 text-pos font-semibold">
        <Check size={14} /> {t("settings.consent.linkReady")}
      </div>
      {consentUrl ? (
        <>
          <div className="rounded border border-border bg-surface-1 px-3 py-2 text-[12px] tabular keep-ltr break-all">
            {consentUrl}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={consentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-council-strong text-white text-[12px] font-semibold"
            >
              <ExternalLink size={13} /> {t("settings.consent.openLink")}
            </a>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(consentUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
            >
              <Copy size={13} />
              {copied ? t("settings.consent.copied") : t("settings.consent.copy")}
            </button>
          </div>
        </>
      ) : null}
      {pdfButton}
      <div className="flex items-center justify-end">
        <button
          onClick={onReset}
          className="h-8 px-3 text-[12px] rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1"
        >
          {locale === "ar" ? "تسجيل جهة أخرى" : "Onboard another entity"}
        </button>
      </div>
      <div className="text-[11.5px] text-ink-3">{t("settings.consent.awaiting")}</div>
    </div>
  );
}

const inputClass =
  "w-full h-9 px-3 rounded-md border border-border bg-surface-1 text-[13px] text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-council-strong focus:ring-2 focus:ring-[var(--ring)]";

function Field({
  label,
  required,
  requiredLabel,
  children,
}: {
  label: string;
  required?: boolean;
  requiredLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-ink-2 flex items-center gap-2">
        {label}
        {required ? (
          <span className="text-[10px] text-neg uppercase tracking-wide font-normal">
            {requiredLabel}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function DiscoveryBanner() {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 flex flex-col sm:flex-row gap-4 items-start">
      <div className="h-10 w-10 rounded-md bg-accent/15 text-accent grid place-items-center shrink-0">
        <FileDown size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-ink-1 font-semibold text-[14px]">
          {t("discovery.banner.title")}
        </div>
        <p className="text-ink-2 text-[12.5px] mt-1 leading-relaxed">
          {t("discovery.banner.body")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <a
          href="/api/discovery-letter?lang=en"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[12.5px] font-semibold"
        >
          <FileDown size={13} /> {t("discovery.banner.download")} — {t("settings.pdf.en")}
        </a>
        <a
          href="/api/discovery-letter?lang=ar"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[12.5px] font-semibold"
        >
          <FileDown size={13} /> {t("discovery.banner.download")} — {t("settings.pdf.ar")}
        </a>
      </div>
    </div>
  );
}
