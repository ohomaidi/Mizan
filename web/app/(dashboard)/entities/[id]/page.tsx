"use client";

import { Fragment, Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  CalendarClock,
  Ban,
  Play,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { MaturityTrendCard } from "@/components/charts/MaturityTrendCard";
import { HealthDot } from "@/components/ui/HealthDot";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { CLUSTERS } from "@/lib/data/clusters";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import type { TenantRow } from "@/lib/db/tenants";
import type { MaturityBreakdown } from "@/lib/compute/maturity";
import type { DictKey } from "@/lib/i18n/dict";
import type {
  AttackSimulationPayload,
  ConditionalAccessPayload,
  DevicesPayload,
  DfiSensorHealthPayload,
  Incident,
  IncidentsPayload,
  PimSprawlPayload,
  PurviewAlertsPayload,
  RetentionLabelsPayload,
  RiskyUser,
  RiskyUsersPayload,
  SecureScorePayload,
  SensitivityLabelsPayload,
  SharepointSettingsPayload,
  SubjectRightsRequestsPayload,
  VulnerabilitiesPayload,
} from "@/lib/graph/signals";
import type { WorkloadCoveragePayload } from "@/lib/graph/workload-coverage";
import { WorkloadCoverageCard } from "@/components/entity/WorkloadCoverageCard";

type Signals = {
  secureScore: { payload: SecureScorePayload } | null;
  conditionalAccess: { payload: ConditionalAccessPayload } | null;
  riskyUsers: { payload: RiskyUsersPayload } | null;
  devices: { payload: DevicesPayload } | null;
  incidents: { payload: IncidentsPayload } | null;
  dlpAlerts: { payload: PurviewAlertsPayload } | null;
  irmAlerts: { payload: PurviewAlertsPayload } | null;
  commCompAlerts: { payload: PurviewAlertsPayload } | null;
  subjectRightsRequests: { payload: SubjectRightsRequestsPayload } | null;
  retentionLabels: { payload: RetentionLabelsPayload } | null;
  sensitivityLabels: { payload: SensitivityLabelsPayload } | null;
  sharepointSettings: { payload: SharepointSettingsPayload } | null;
  pimSprawl: { payload: PimSprawlPayload } | null;
  dfiSensorHealth: { payload: DfiSensorHealthPayload } | null;
  vulnerabilities: { payload: VulnerabilitiesPayload } | null;
  attackSimulations: { payload: AttackSimulationPayload } | null;
  workloadCoverage: { payload: WorkloadCoveragePayload } | null;
};

type EndpointHealth = {
  endpoint: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  call_count_24h: number;
  throttle_count_24h: number;
};

/**
 * Per-clause framework breakdown — populated by the entity-detail
 * API. Powers the "ISR Compliance breakdown" panel and the headline
 * Framework Compliance card on overview.
 */
type FrameworkBreakdownRow = {
  clauseId: string;
  ref: string;
  classRefs?: Array<"Governance" | "Operation" | "Assurance">;
  titleEn: string;
  titleAr: string;
  weight: number;
  coverage: number | null;
  samples: number;
  secureScoreControls: string[];
  customEvidenceCount: number;
  oosState: "in-scope" | "global-oos" | "tenant-oos";
};

type FrameworkComplianceDetail = {
  frameworkId: string;
  frameworkVersion: string;
  target: number;
  unscoredTreatment: "skip" | "zero";
  percent: number | null;
  clausesScored: number;
  clausesTotal: number;
  clausesOos: number;
  breakdown: FrameworkBreakdownRow[];
};

type Detail = {
  tenant: TenantRow;
  maturity: MaturityBreakdown;
  signals: Signals;
  health: EndpointHealth[];
  frameworkCompliance?: FrameworkComplianceDetail;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing" }
  | { kind: "ready"; detail: Detail };

type SubTab = "overview" | "controls" | "incidents" | "identity" | "data" | "devices" | "governance" | "framework" | "vulnerabilities" | "attackSimulation" | "connection";
const VALID_TABS: readonly SubTab[] = [
  "overview", "controls", "incidents", "identity", "data", "devices", "governance", "framework", "vulnerabilities", "attackSimulation", "connection",
] as const;

type IdentityView = "risky" | "privileged" | "sensors";
const VALID_IDENTITY_VIEWS: readonly IdentityView[] = ["risky", "privileged", "sensors"] as const;

export default function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <EntityDetailInner params={params} />
    </Suspense>
  );
}

function EntityDetailInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const fmtRelative = useFmtRelative();
  const fmt = useFmtNum();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab + sub-view are URL-driven so deep-links from the global /identity
  // page arrive on the right section and so browser-back restores state.
  const rawTab = searchParams.get("tab");
  const tab: SubTab = (VALID_TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as SubTab)
    : "overview";

  const rawView = searchParams.get("view");
  const identityView: IdentityView = (VALID_IDENTITY_VIEWS as readonly string[]).includes(
    rawView ?? "",
  )
    ? (rawView as IdentityView)
    : "risky";

  // `from` lets us know where the user clicked in from, so the back button
  // returns to the correct top-level surface instead of always /entities.
  const cameFrom = searchParams.get("from"); // e.g. "identity"
  const FROM_ROUTES: Record<string, { href: string; key: string }> = {
    identity: { href: "/identity", key: "entity.backToIdentity" },
    devices: { href: "/devices", key: "entity.backToDevices" },
    threats: { href: "/threats", key: "entity.backToThreats" },
    vulnerabilities: {
      href: "/vulnerabilities",
      key: "entity.backToVulnerabilities",
    },
    data: { href: "/data", key: "entity.backToData" },
    governance: { href: "/governance", key: "entity.backToGovernance" },
    maturity: { href: "/maturity", key: "entity.backToMaturity" },
  };
  const backRoute = cameFrom ? FROM_ROUTES[cameFrom] : null;
  const backHref = backRoute?.href ?? "/entities";
  const backKey = backRoute?.key ?? "entity.backToAll";

  const setTab = useCallback(
    (newTab: SubTab) => {
      const qp = new URLSearchParams(Array.from(searchParams.entries()));
      if (newTab === "overview") qp.delete("tab");
      else qp.set("tab", newTab);
      qp.delete("view"); // switching tabs clears the sub-view
      const qs = qp.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );

  const setIdentityView = useCallback(
    (v: IdentityView) => {
      const qp = new URLSearchParams(Array.from(searchParams.entries()));
      qp.set("tab", "identity");
      if (v === "risky") qp.delete("view");
      else qp.set("view", v);
      router.replace(`?${qp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [state, setState] = useState<State>({ kind: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [suspendModal, setSuspendModal] = useState<"idle" | "confirm" | "working">("idle");
  const [reviewModal, setReviewModal] = useState<{ open: boolean; working: boolean }>({
    open: false,
    working: false,
  });
  const [reviewDate, setReviewDate] = useState<string>("");
  const [reviewNote, setReviewNote] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const d = await api.getTenantDetail(id);
      setState({ kind: "ready", detail: d as unknown as Detail });
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 404) setState({ kind: "missing" });
      else setState({ kind: "error", message: e.message });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSync = async () => {
    setSyncing(true);
    try {
      await api.syncTenant(id);
      await load();
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const onConfirmSuspendToggle = async () => {
    if (state.kind !== "ready") return;
    setSuspendModal("working");
    try {
      const nextSuspended = !state.detail.tenant.suspended_at;
      await api.setSuspended(id, nextSuspended);
      await load();
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    } finally {
      setSuspendModal("idle");
    }
  };

  const openReviewModal = () => {
    if (state.kind !== "ready") return;
    const current = state.detail.tenant.scheduled_review_at ?? "";
    setReviewDate(current.slice(0, 10));
    setReviewNote(state.detail.tenant.scheduled_review_note ?? "");
    setReviewModal({ open: true, working: false });
  };

  const saveReview = async (clear: boolean) => {
    setReviewModal({ open: true, working: true });
    try {
      if (clear) {
        await api.scheduleReview(id, null, null);
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
          setReviewModal({ open: true, working: false });
          return;
        }
        await api.scheduleReview(id, reviewDate, reviewNote.trim() || null);
      }
      await load();
      setReviewModal({ open: false, working: false });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
      setReviewModal({ open: false, working: false });
    }
  };

  const onExportCard = () => {
    window.location.href = api.exportCardUrl(id);
  };

  const onOpenDefender = () => {
    if (state.kind !== "ready") return;
    // Per-tenant Defender portal deep-link. `tid` scopes the portal to the given tenant.
    const url = `https://security.microsoft.com/?tid=${encodeURIComponent(state.detail.tenant.tenant_id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (state.kind === "missing") return <EmptyState />;

  const { tenant, maturity, signals, health, frameworkCompliance } =
    state.detail;
  const cluster = CLUSTERS.find((c) => c.id === tenant.cluster);
  const clusterLabel = cluster ? (locale === "ar" ? cluster.labelAr : cluster.label) : tenant.cluster;

  // Framework tab is hidden when no framework is selected ("generic"
  // or framework data missing). When active, the label tracks the
  // chosen framework's short name (e.g. "Dubai ISR") so the tab is
  // self-documenting.
  const showFramework =
    !!frameworkCompliance &&
    frameworkCompliance.frameworkId !== "generic";
  const frameworkTabLabel = showFramework
    ? t(`branding.framework.${frameworkCompliance!.frameworkId}` as DictKey)
    : "";

  const SUB_TABS: Array<{ id: SubTab; labelKey: DictKey; rawLabel?: string }> = [
    { id: "overview", labelKey: "tab.overview" },
    { id: "controls", labelKey: "tab.controls" },
    { id: "incidents", labelKey: "tab.incidents" },
    { id: "identity", labelKey: "tab.identity" },
    { id: "data", labelKey: "tab.data" },
    { id: "devices", labelKey: "tab.devices" },
    { id: "governance", labelKey: "tab.governance" },
    ...(showFramework
      ? [
          {
            id: "framework" as SubTab,
            labelKey: "tab.framework" as DictKey,
            rawLabel: frameworkTabLabel,
          },
        ]
      : []),
    { id: "vulnerabilities", labelKey: "tab.vulnerabilities" },
    { id: "attackSimulation", labelKey: "tab.attackSimulation" },
    { id: "connection", labelKey: "tab.connection" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink-1"
        >
          <ArrowLeft size={13} className="rtl:rotate-180" />{" "}
          {t(backKey as DictKey)}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-2 border border-border rounded px-2 py-0.5">
              {clusterLabel}
            </span>
            {tenant.consent_status === "consented" ? (
              <HealthDot
                status={tenant.last_sync_ok === 1 ? "green" : tenant.last_sync_at ? "red" : "amber"}
                showLabel
              />
            ) : (
              <span className="text-[11.5px] text-ink-3">
                {t(`consent.status.${tenant.consent_status}` as
                  | "consent.status.pending"
                  | "consent.status.consented"
                  | "consent.status.revoked"
                  | "consent.status.failed")}
              </span>
            )}
            <span className="text-[11.5px] text-ink-3 tabular">
              {tenant.last_sync_at
                ? t("entity.lastSync", { when: fmtRelative(tenant.last_sync_at) })
                : t("sync.never")}
            </span>
          </div>
          <h1 className="mt-2 text-[26px] font-semibold text-ink-1 tracking-tight leading-tight inline-flex items-center gap-3 flex-wrap">
            <span>{locale === "ar" ? tenant.name_ar : tenant.name_en}</span>
            {tenant.consent_mode === "directive" ? (
              <span className="text-[10px] uppercase tracking-[0.08em] border border-council-strong/60 text-council-strong rounded px-1.5 py-0.5 font-semibold">
                {t("mode.directive")}
              </span>
            ) : null}
          </h1>
          <div className="text-ink-2 text-[13px] mt-0.5" dir={locale === "ar" ? "ltr" : "rtl"}>
            {locale === "ar" ? tenant.name_en : tenant.name_ar}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-ink-2">
            <KV label={t("entity.tenant")} value={<span className="tabular keep-ltr">{tenant.tenant_id}</span>} />
            <KV label={t("entity.domain")} value={<span className="keep-ltr">{tenant.domain}</span>} />
            {tenant.ciso ? <KV label={t("entity.ciso")} value={tenant.ciso} /> : null}
            {tenant.ciso_email ? (
              <KV label={t("entity.contact")} value={<span className="keep-ltr">{tenant.ciso_email}</span>} />
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            disabled={syncing || tenant.consent_status !== "consented" || !!tenant.suspended_at}
            onClick={onSync}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-council-strong text-white text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {syncing ? t("sync.inProgress") : t("sync.now")}
          </button>
          <button
            onClick={onOpenDefender}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12.5px]"
          >
            <ExternalLink size={13} /> {t("entity.openDefender")}
          </button>
          <button
            onClick={onExportCard}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12.5px]"
          >
            <FileText size={13} /> {t("entity.exportCard")}
          </button>
          <button
            onClick={openReviewModal}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12.5px]"
          >
            <CalendarClock size={13} /> {t("entity.scheduleReview")}
          </button>
          {tenant.suspended_at ? (
            <button
              onClick={() => setSuspendModal("confirm")}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border text-pos hover:border-pos/50 bg-surface-2 text-[12.5px]"
            >
              <Play size={13} /> {t("entity.resume")}
            </button>
          ) : (
            <button
              onClick={() => setSuspendModal("confirm")}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border text-ink-2 hover:text-neg hover:border-neg/50 bg-surface-2 text-[12.5px]"
            >
              <Ban size={13} /> {t("entity.suspend")}
            </button>
          )}
        </div>
      </div>

      {/* Banners — suspended / scheduled review */}
      {tenant.suspended_at ? (
        <div className="rounded-md border border-warn/40 bg-warn/5 px-4 py-2.5 text-[12.5px] text-warn">
          {t("entity.suspended.banner")}
        </div>
      ) : null}
      {tenant.scheduled_review_at ? (
        <div className="rounded-md border border-border bg-surface-2 px-4 py-2.5 text-[12.5px] text-ink-2 flex items-center gap-2">
          <CalendarClock size={14} className="text-ink-3" />
          <span>
            {t("entity.review.banner", { date: tenant.scheduled_review_at.slice(0, 10) })}
          </span>
          {tenant.scheduled_review_note ? (
            <span className="text-ink-3 ms-1">— {tenant.scheduled_review_note}</span>
          ) : null}
        </div>
      ) : null}

      {/* Suspend / resume dialog */}
      <Modal
        open={suspendModal !== "idle"}
        onClose={() => suspendModal !== "working" && setSuspendModal("idle")}
        title={
          tenant.suspended_at
            ? t("entity.resume.dialog.title")
            : t("entity.suspend.dialog.title")
        }
        footer={
          <>
            <button
              disabled={suspendModal === "working"}
              onClick={() => setSuspendModal("idle")}
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-ink-1 disabled:opacity-50"
            >
              {t("entity.suspend.dialog.cancel")}
            </button>
            <button
              disabled={suspendModal === "working"}
              onClick={onConfirmSuspendToggle}
              className={`h-8 px-3 rounded-md text-[12.5px] text-white ${
                tenant.suspended_at ? "bg-council-strong" : "bg-neg"
              } disabled:opacity-50 inline-flex items-center gap-1.5`}
            >
              {suspendModal === "working" ? <Loader2 size={12} className="animate-spin" /> : null}
              {tenant.suspended_at
                ? t("entity.resume.dialog.confirm")
                : t("entity.suspend.dialog.confirm")}
            </button>
          </>
        }
      >
        {tenant.suspended_at ? t("entity.resume.dialog.body") : t("entity.suspend.dialog.body")}
      </Modal>

      {/* Schedule-review dialog */}
      <Modal
        open={reviewModal.open}
        onClose={() => !reviewModal.working && setReviewModal({ open: false, working: false })}
        title={t("entity.review.dialog.title")}
        size="wide"
        footer={
          <>
            {tenant.scheduled_review_at ? (
              <button
                disabled={reviewModal.working}
                onClick={() => saveReview(true)}
                className="h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-neg disabled:opacity-50 me-auto"
              >
                {t("entity.review.dialog.clear")}
              </button>
            ) : null}
            <button
              disabled={reviewModal.working}
              onClick={() => setReviewModal({ open: false, working: false })}
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-ink-1 disabled:opacity-50"
            >
              {t("entity.review.dialog.cancel")}
            </button>
            <button
              disabled={reviewModal.working || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)}
              onClick={() => saveReview(false)}
              className="h-8 px-3 rounded-md bg-council-strong text-white text-[12.5px] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {reviewModal.working ? <Loader2 size={12} className="animate-spin" /> : null}
              {t("entity.review.dialog.save")}
            </button>
          </>
        }
      >
        <p className="mb-3 text-ink-2">{t("entity.review.dialog.body")}</p>
        <label className="block text-[12px] text-ink-3 mb-1">
          {t("entity.review.dialog.dateLabel")}
        </label>
        <input
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          className="w-full h-9 px-2.5 rounded-md border border-border bg-surface-1 text-ink-1 text-[13px] mb-3"
        />
        <label className="block text-[12px] text-ink-3 mb-1">
          {t("entity.review.dialog.noteLabel")}
        </label>
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-2.5 py-2 rounded-md border border-border bg-surface-1 text-ink-1 text-[13px]"
        />
      </Modal>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border -mt-2 overflow-x-auto">
        {SUB_TABS.map((sub) => {
          const active = sub.id === tab;
          return (
            <button
              key={sub.id}
              onClick={() => setTab(sub.id)}
              className={`h-9 px-3 text-[13px] border-b-2 transition-colors -mb-px whitespace-nowrap ${
                active
                  ? "border-council-strong text-ink-1 font-medium"
                  : "border-transparent text-ink-2 hover:text-ink-1"
              }`}
            >
              {sub.rawLabel ?? t(sub.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" ? (
        <OverviewTab
          maturity={maturity}
          clusterIndex={cluster?.index ?? 0}
          vulns={signals.vulnerabilities?.payload ?? null}
          onOpenVulns={() => setTab("vulnerabilities")}
        />
      ) : null}
      {tab === "controls" ? <ControlsTab payload={signals.secureScore?.payload ?? null} /> : null}
      {tab === "incidents" ? <IncidentsTab payload={signals.incidents?.payload ?? null} /> : null}
      {tab === "identity" ? (
        <IdentityTab
          risky={signals.riskyUsers?.payload ?? null}
          pim={signals.pimSprawl?.payload ?? null}
          dfi={signals.dfiSensorHealth?.payload ?? null}
          view={identityView}
          setView={setIdentityView}
        />
      ) : null}
      {tab === "devices" ? (
        <DevicesTab
          payload={signals.devices?.payload ?? null}
          vulns={signals.vulnerabilities?.payload ?? null}
          sortByCves={cameFrom === "vulnerabilities"}
        />
      ) : null}
      {tab === "vulnerabilities" ? (
        <VulnerabilitiesTab
          payload={signals.vulnerabilities?.payload ?? null}
        />
      ) : null}
      {tab === "attackSimulation" ? (
        <AttackSimulationTab
          payload={signals.attackSimulations?.payload ?? null}
        />
      ) : null}
      {tab === "connection" ? <ConnectionTab health={health} /> : null}
      {tab === "data" ? (
        <DataTab
          dlp={signals.dlpAlerts?.payload ?? null}
          irm={signals.irmAlerts?.payload ?? null}
          commComp={signals.commCompAlerts?.payload ?? null}
          srrs={signals.subjectRightsRequests?.payload ?? null}
          retention={signals.retentionLabels?.payload ?? null}
          sensitivity={signals.sensitivityLabels?.payload ?? null}
          sharing={signals.sharepointSettings?.payload ?? null}
        />
      ) : null}
      {tab === "governance" ? (
        <GovernanceTab
          tenantId={id}
          secureScore={signals.secureScore?.payload ?? null}
          maturity={maturity}
        />
      ) : null}
      {tab === "framework" && showFramework ? (
        <FrameworkTab
          tenantId={id}
          fc={frameworkCompliance}
          tenantNameEn={tenant.name_en}
          onRefresh={load}
        />
      ) : null}
    </div>
  );

  function OverviewTab({
    maturity,
    clusterIndex,
    vulns,
    onOpenVulns,
  }: {
    maturity: MaturityBreakdown;
    clusterIndex: number;
    vulns: VulnerabilitiesPayload | null;
    onOpenVulns: () => void;
  }) {
    const target = 75;
    const subScores = [
      { key: "subscores.identity" as const, value: maturity.subScores.identity },
      { key: "subscores.device" as const, value: maturity.subScores.device },
      { key: "subscores.data" as const, value: maturity.subScores.data },
      { key: "subscores.threatResponse" as const, value: maturity.subScores.threat },
      { key: "subscores.compliance" as const, value: maturity.subScores.compliance },
    ];

    // Top 5 CVEs by severity rank, then affected-device count. Drives the
    // compact "Top vulnerabilities" card at the bottom of the overview grid
    // so a Council reviewer sees the loudest exposures without switching tabs.
    const sevRank: Record<string, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
      Unknown: 0,
    };
    const topVulnCves =
      vulns && !vulns.error
        ? [...vulns.topCves]
            .sort(
              (a, b) =>
                (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0) ||
                b.affectedDevices - a.affectedDevices ||
                (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
            )
            .slice(0, 5)
        : [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Workload Coverage — sits at the top of the overview as the
            single-glance answer to "what Microsoft tools is this entity
            using and how completely?". Spans all 3 columns. Tagged BETA
            on tools served by /beta endpoints, COMING SOON on tools
            still gated behind PowerShell-only Microsoft surfaces. */}
        <div className="lg:col-span-3">
          <WorkloadCoverageCard
            coverage={signals.workloadCoverage?.payload ?? null}
            tenant={tenant}
          />
        </div>

        <Card className="lg:col-span-1">
          <CardHeader
            title={t("entity.maturityTitle")}
            subtitle={t("entity.maturitySubtitle", { target: fmt(target) })}
          />
          <div className="flex items-baseline gap-3">
            <span className="text-[56px] leading-none font-semibold tabular">
              {fmt(Math.round(maturity.index))}
            </span>
            <span className="text-[18px] text-ink-3 tabular">%</span>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-council-strong"
              style={{ width: `${Math.min(100, maturity.index)}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3 tabular">
            <span>{fmt(0)}</span>
            <span>{t("entity.targetMarker", { target: fmt(target) })}</span>
            <span>{fmt(100)}</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <MiniStat label={t("entity.stats.incidents")} value={fmt(maturity.openIncidents)} tone="warn" />
            <MiniStat label={t("entity.stats.riskyUsers")} value={fmt(maturity.riskyUsers)} tone="warn" />
            <MiniStat
              label={t("entity.stats.devicesCompliant")}
              value={`${fmt(maturity.deviceCompliancePct)}%`}
              tone={maturity.deviceCompliancePct >= 85 ? "pos" : "warn"}
            />
          </div>
        </Card>

        {/* Framework Compliance — separate primary metric, sits next to
            Maturity Index. Not a subscore of maturity — answers a
            different question: "how aligned is this entity with the
            regulator's specific framework?". Computed as the weighted
            average of per-clause coverage (Microsoft Secure Score
            pass-rates + operator-managed custom evidence).
            Hidden entirely when no framework is selected
            (branding.frameworkId === "generic"). */}
        {frameworkCompliance &&
        frameworkCompliance.frameworkId !== "generic" ? (
          <FrameworkComplianceCard fc={frameworkCompliance} />
        ) : null}

        <Card className="lg:col-span-1">
          <CardHeader title={t("subscores.title")} subtitle={t("subscores.subtitle")} />
          <ul className="flex flex-col gap-3">
            {subScores.map((s) => (
              <li key={s.key} className="flex items-center gap-3">
                <span className="w-44 text-[12.5px] text-ink-2">{t(s.key)}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={`h-full ${
                      s.value >= target
                        ? "bg-council-strong"
                        : s.value >= target - 10
                          ? "bg-warn"
                          : "bg-neg"
                    }`}
                    style={{ width: `${Math.min(100, s.value)}%` }}
                  />
                </div>
                <span className="w-10 text-end tabular text-[13px] text-ink-1 font-semibold">
                  {fmt(Math.round(s.value))}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-border text-[12px] text-ink-2">
            {t("benchmark.footer", {
              cluster: fmt(clusterIndex),
              council: fmt(72),
              target: fmt(target),
            })}
          </div>
        </Card>

        {/* Framework Compliance breakdown — per-clause coverage so
            operators can see exactly where this entity is failing
            ISR. Anchor `#isr-breakdown` makes the "View breakdown"
            link in the headline card scroll here. Hidden when no
            framework is selected. */}
        {frameworkCompliance &&
        frameworkCompliance.frameworkId !== "generic" ? (
          <div className="lg:col-span-3" id="isr-breakdown">
            <FrameworkBreakdownPanel fc={frameworkCompliance} />
          </div>
        ) : null}

        {/* Maturity trend — full-width below the index/sub-score cards. */}
        <div className="lg:col-span-3">
          <MaturityTrendCard tenantId={id} target={target} />
        </div>

        {/* Top vulnerabilities — compact callout of the loudest CVEs on this
            entity so a reviewer sees exposure risk without switching tabs. */}
        <Card className="lg:col-span-3 p-0">
          <div className="p-5 flex items-start justify-between gap-3">
            <CardHeader
              title={t("entity.overview.topVulns.title")}
              subtitle={t("entity.overview.topVulns.subtitle")}
            />
            <button
              type="button"
              onClick={onOpenVulns}
              className="h-7 px-3 text-[12px] rounded-md border border-border text-ink-2 hover:text-ink-1 hover:bg-surface-3"
            >
              {t("entity.overview.topVulns.viewAll")}
            </button>
          </div>
          {vulns == null ? (
            <div className="px-5 pb-5 text-[12.5px] text-ink-3">
              {t("sync.never")}
            </div>
          ) : vulns.error ? (
            <div className="px-5 pb-5 text-[12.5px] text-ink-3">
              {t("tab.vulnerabilities.notLicensedBody")}
            </div>
          ) : topVulnCves.length === 0 ? (
            <div className="px-5 pb-5 text-[12.5px] text-ink-3">
              {t("entity.overview.topVulns.clean")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                    <th className="py-2.5 ps-5 text-start font-semibold">
                      {t("vuln.cols.cve")}
                    </th>
                    <th className="py-2.5 text-start font-semibold">
                      {t("vuln.cols.severity")}
                    </th>
                    <th className="py-2.5 text-end font-semibold">
                      {t("vuln.cols.cvss")}
                    </th>
                    <th className="py-2.5 text-end font-semibold">
                      {t("vuln.cols.exposedDevices")}
                    </th>
                    <th className="py-2.5 pe-5 text-start font-semibold">
                      {t("vuln.cols.exploit")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topVulnCves.map((c) => (
                    <tr
                      key={c.cveId}
                      className="border-t border-border hover:bg-surface-3/40 cursor-pointer"
                      onClick={onOpenVulns}
                    >
                      <td className="ps-5 py-2.5 text-ink-1 tabular keep-ltr">
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${c.cveId}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-council-strong"
                        >
                          {c.cveId}
                        </a>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] border ${
                            c.severity === "Critical"
                              ? "text-neg bg-neg/10 border-neg/40"
                              : c.severity === "High"
                                ? "text-warn bg-warn/10 border-warn/40"
                                : "text-ink-2 bg-surface-3 border-border"
                          }`}
                        >
                          {c.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-end tabular">
                        {c.cvssScore != null ? c.cvssScore.toFixed(1) : "—"}
                      </td>
                      <td className="py-2.5 text-end tabular">
                        {fmt(c.affectedDevices)}
                      </td>
                      <td className="py-2.5 pe-5">
                        {c.hasExploit ? (
                          <span className="text-neg text-[11px] font-semibold uppercase tracking-[0.06em]">
                            {t("vuln.exploit.yes")}
                          </span>
                        ) : (
                          <span className="text-ink-3 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  function ControlsTab({ payload }: { payload: SecureScorePayload | null }) {
    // Category filter state must be declared *before* the empty-payload
    // early-return so React sees the same hook order on every render.
    const [activeCategory, setActiveCategory] = useState<string>("all");

    // v2.5.22: per-control Out-of-Scope state. Mirrors the FrameworkTab
    // pattern — each control can be carved out of the maturity calculation
    // when "Done using a non-Microsoft tool". The compute layer
    // (lib/compute/maturity.ts) honors these marks and excludes OOS
    // controls from the secure-score-driven sub-scores.
    const [oosControls, setOosControls] = useState<Set<string>>(new Set());
    const [busyControlId, setBusyControlId] = useState<string | null>(null);
    const [controlReasonDraft, setControlReasonDraft] = useState<{
      controlId: string;
      reason: string;
    } | null>(null);
    const [oosError, setOosError] = useState<string | null>(null);

    useEffect(() => {
      let alive = true;
      (async () => {
        try {
          const oos = await api.listComplianceOos(id);
          if (!alive) return;
          setOosControls(
            new Set(
              oos.marks
                .filter(
                  (mk) =>
                    mk.scopeKind === "control" &&
                    (mk.tenantId === id || mk.tenantId === null),
                )
                .map((mk) => mk.scopeId),
            ),
          );
        } catch {
          /* non-fatal — empty set is the safe default */
        }
      })();
      return () => {
        alive = false;
      };
    }, []);

    const toggleControlOos = async (
      controlId: string,
      reason: string | null,
    ) => {
      const wasOos = oosControls.has(controlId);
      setBusyControlId(controlId);
      setOosError(null);
      // Optimistic flip.
      setOosControls((prev) => {
        const next = new Set(prev);
        if (wasOos) next.delete(controlId);
        else next.add(controlId);
        return next;
      });
      try {
        if (wasOos) {
          await api.unmarkComplianceOos({
            tenantId: id,
            scopeKind: "control",
            scopeId: controlId,
          });
        } else {
          await api.markComplianceOos({
            tenantId: id,
            scopeKind: "control",
            scopeId: controlId,
            reason,
          });
        }
        // Refresh the parent's full detail (so the entity overview's
        // controls-passing % and compliance sub-score reflect the change).
        await load();
      } catch (err) {
        // Rollback.
        setOosControls((prev) => {
          const next = new Set(prev);
          if (wasOos) next.add(controlId);
          else next.delete(controlId);
          return next;
        });
        setOosError((err as Error).message);
      } finally {
        setBusyControlId(null);
        setControlReasonDraft(null);
      }
    };

    if (!payload || payload.controls.length === 0) {
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

    // Distinct categories present in this tenant's Secure Score control list.
    // Controls whose `category` is null/empty get bucketed under the
    // "Uncategorized" label so they're still reachable via the filter.
    const UNCATEGORIZED = "__uncategorized__";
    const categoryCounts = new Map<string, number>();
    for (const c of payload.controls) {
      const key = c.category && c.category.trim().length > 0 ? c.category : UNCATEGORIZED;
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
    const categoriesInOrder = Array.from(categoryCounts.keys()).sort((a, b) => {
      // Uncategorized always last; real categories alphabetical.
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b);
    });

    const matchesActive = (cat: string | null): boolean => {
      if (activeCategory === "all") return true;
      const key = cat && cat.trim().length > 0 ? cat : UNCATEGORIZED;
      return key === activeCategory;
    };

    // Classify each control:
    //   passed   — score > 0 AND (score == maxScore, or status looks positive)
    //   partial  — score > 0 but status indicates gaps / score < maxScore
    //   failed   — score === 0
    //   unknown  — score null / no status
    const classify = (c: SecureScorePayload["controls"][number]):
      | "passed"
      | "partial"
      | "failed"
      | "unknown" => {
      if (c.score == null) return "unknown";
      if (c.score === 0) return "failed";
      const statusLower = (c.implementationStatus ?? "").toLowerCase();
      if (
        statusLower.includes("not compliant") ||
        statusLower.includes("not enabled") ||
        statusLower.includes("is disabled") ||
        statusLower.includes("is empty") ||
        statusLower.includes("not installed") ||
        statusLower.includes("not in place") ||
        statusLower.includes("partial") ||
        statusLower.includes("false.") ||
        statusLower.includes("less securely")
      ) {
        return "partial";
      }
      // If we have maxScore, partial when strictly less than max.
      if (c.maxScore != null && c.score < c.maxScore) return "partial";
      return "passed";
    };

    // Microsoft sometimes dumps raw HTML into implementationStatus ("<p>...</p><ul>...").
    // Strip tags + decode common entities so the status reads as plain text.
    const sanitizeStatus = (s: string | null): string => {
      if (!s) return "";
      return s
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?(p|div|li|ul|ol|span|strong|em|b|i)[^>]*>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, " ")
        .trim();
    };

    const filteredControls = payload.controls.filter((c) =>
      matchesActive(c.category),
    );

    // Totals reflect the active filter — operators opening Identity want to
    // see "how many Identity controls are failing", not the whole tenant.
    const totals = { passed: 0, partial: 0, failed: 0, unknown: 0 };
    for (const c of filteredControls) totals[classify(c)]++;

    // Sort: failed first, then partial, then unknown, then passed. Within group,
    // sort by category ascending then control id.
    const rank = { failed: 0, partial: 1, unknown: 2, passed: 3 } as const;
    const rows = [...filteredControls].sort((a, b) => {
      const ra = rank[classify(a)];
      const rb = rank[classify(b)];
      if (ra !== rb) return ra - rb;
      const ca = (a.category ?? "").localeCompare(b.category ?? "");
      if (ca !== 0) return ca;
      return a.id.localeCompare(b.id);
    });

    // Fallback humanizer only used when the control profile has no real title.
    const humanize = (s: string) =>
      s
        .replace(/_v\d+$/i, "")
        .replace(/[_.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return (
      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader
            title={t("tab.controls.title")}
            subtitle={t("tab.controls.subtitle")}
            right={
              <div className="flex items-center gap-3 text-[12px] tabular">
                <span className="text-pos">✓ {fmt(totals.passed)}</span>
                <span className="text-warn">◐ {fmt(totals.partial)}</span>
                <span className="text-neg">✗ {fmt(totals.failed)}</span>
                {totals.unknown > 0 ? (
                  <span className="text-ink-3">? {fmt(totals.unknown)}</span>
                ) : null}
                <span className="text-ink-3">
                  / {fmt(payload.controls.length)}
                </span>
              </div>
            }
          />

          {/* Category filter pills — match the cluster-chip style from the
              entities list so the UI stays consistent across tabs. */}
          <div className="mt-4 flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
              {t("tab.controls.filter.label")}
            </span>
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                activeCategory === "all"
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              {t("cols.all")}{" "}
              <span className="text-ink-3 tabular ms-1">
                {fmt(payload.controls.length)}
              </span>
            </button>
            {categoriesInOrder.map((cat) => {
              const active = activeCategory === cat;
              const label =
                cat === UNCATEGORIZED
                  ? t("tab.controls.filter.uncategorized")
                  : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                    active
                      ? "bg-surface-3 text-ink-1 border-border-strong"
                      : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
                  }`}
                >
                  {label}
                  <span className="text-ink-3 tabular ms-1">
                    {fmt(categoryCounts.get(cat) ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {oosError ? (
          <div className="px-5 pb-3">
            <div className="rounded-md border border-neg/40 bg-neg/10 px-3 py-2 text-[12px] text-neg">
              {oosError}
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "32%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "36%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("tab.controls.col.name")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("tab.controls.col.category")}
                </th>
                <th className="py-2.5 text-end font-semibold">
                  {t("tab.controls.col.score")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("tab.controls.col.status")}
                </th>
                <th className="py-2.5 pe-5 text-end font-semibold">
                  {t("tab.controls.col.scope")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-[12.5px] text-ink-3"
                  >
                    {t("tab.controls.filter.empty")}
                  </td>
                </tr>
              ) : null}
              {rows.map((c) => {
                const kind = classify(c);
                const tint =
                  kind === "passed"
                    ? "text-pos border-pos/40 bg-pos/10"
                    : kind === "partial"
                      ? "text-warn border-warn/40 bg-warn/10"
                      : kind === "failed"
                        ? "text-neg border-neg/40 bg-neg/10"
                        : "text-ink-3 border-border bg-surface-3";
                const chipLabel =
                  kind === "passed"
                    ? t("tab.controls.implemented")
                    : kind === "partial"
                      ? t("tab.controls.partial")
                      : kind === "failed"
                        ? t("tab.controls.notImplemented")
                        : t("tab.controls.unknown");
                const displayTitle = c.title ?? humanize(c.id);
                const cleanStatus = sanitizeStatus(c.implementationStatus);
                const isOos = oosControls.has(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-border align-top hover:bg-surface-3/40 ${
                      isOos ? "opacity-60" : ""
                    }`}
                  >
                    <td className="ps-5 py-3 text-ink-1 align-top">
                      <div className="font-medium leading-snug inline-flex items-center gap-2 flex-wrap">
                        <span>{displayTitle}</span>
                        {isOos ? (
                          <span className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-warn border border-warn/40 bg-warn/10 rounded px-1.5 py-px">
                            {t("tab.controls.scope.oosChip")}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-ink-3 keep-ltr mt-0.5 truncate">
                        {c.id}
                      </div>
                      {(c.userImpact || c.implementationCost) && kind !== "passed" ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          {c.userImpact ? (
                            <span className="text-[10.5px] text-ink-3">
                              {t("tab.controls.userImpact")}:{" "}
                              <span className="text-ink-2">{c.userImpact}</span>
                            </span>
                          ) : null}
                          {c.implementationCost ? (
                            <span className="text-[10.5px] text-ink-3">
                              {t("tab.controls.implCost")}:{" "}
                              <span className="text-ink-2">{c.implementationCost}</span>
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 align-top">
                      <span className="inline-flex text-[10.5px] uppercase tracking-[0.08em] text-ink-2 border border-border rounded px-1.5 py-0.5">
                        {c.category ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 text-end tabular align-top">
                      {c.score != null ? (
                        <div className="inline-flex items-baseline gap-0.5">
                          <span
                            className={
                              kind === "failed"
                                ? "text-neg font-semibold"
                                : kind === "passed"
                                  ? "text-pos font-semibold"
                                  : "text-ink-1 font-semibold"
                            }
                          >
                            {fmt(c.score)}
                          </span>
                          {c.maxScore != null ? (
                            <span className="text-ink-3 text-[11px]">
                              /{fmt(c.maxScore)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit text-[10.5px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded border ${tint}`}
                        >
                          {chipLabel}
                        </span>
                        {cleanStatus ? (
                          <span className="text-[12px] text-ink-2 leading-snug">
                            {cleanStatus}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pe-5 align-top text-end">
                      {isOos ? (
                        <button
                          onClick={() => toggleControlOos(c.id, null)}
                          disabled={busyControlId === c.id}
                          className="inline-flex items-center gap-1 text-[11.5px] text-warn hover:text-warn/80 disabled:opacity-50"
                        >
                          {busyControlId === c.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : null}
                          {t("tab.controls.scope.restore")}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setControlReasonDraft({
                              controlId: c.id,
                              reason: "",
                            })
                          }
                          disabled={busyControlId === c.id}
                          className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink-1 disabled:opacity-50"
                        >
                          {t("tab.controls.scope.markOos")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Reason capture for marking a control OOS — modal. v2.5.22. */}
        {controlReasonDraft ? (
          <Modal
            open
            onClose={() => setControlReasonDraft(null)}
            title={t("tab.controls.scope.reason.title")}
          >
            <div className="text-[12.5px] text-ink-2 mb-3">
              {t("tab.controls.scope.reason.body")}
            </div>
            <textarea
              value={controlReasonDraft.reason}
              onChange={(e) =>
                setControlReasonDraft({
                  ...controlReasonDraft,
                  reason: e.target.value,
                })
              }
              rows={4}
              placeholder={t("tab.controls.scope.reason.placeholder")}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[13px] text-ink-1 outline-none focus:border-council-strong"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setControlReasonDraft(null)}
                className="h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 text-[12.5px] hover:text-ink-1"
              >
                {t("tab.controls.scope.reason.cancel")}
              </button>
              <button
                onClick={() =>
                  toggleControlOos(
                    controlReasonDraft.controlId,
                    controlReasonDraft.reason.trim() || null,
                  )
                }
                disabled={busyControlId === controlReasonDraft.controlId}
                className="h-8 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {busyControlId === controlReasonDraft.controlId
                  ? t("tab.controls.scope.reason.saving")
                  : t("tab.controls.scope.reason.confirm")}
              </button>
            </div>
          </Modal>
        ) : null}
      </Card>
    );
  }

  function IncidentsTab({ payload }: { payload: IncidentsPayload | null }) {
    const [drill, setDrill] = useState<Incident | null>(null);
    if (!payload)
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    return (
      <>
        <Card className="p-0">
          <div className="p-5">
            <CardHeader
              title={t("tab.incidents.title")}
              subtitle={t("tab.incidents.subtitle")}
              right={
                <div className="text-[12px] text-ink-2 tabular">
                  {t("tab.incidents.summary", {
                    total: fmt(payload.total),
                    active: fmt(payload.active),
                    resolved: fmt(payload.resolved),
                  })}
                </div>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                  <th className="py-2.5 ps-5 text-start font-semibold">{t("tab.incidents.col.name")}</th>
                  <th className="py-2.5 text-start font-semibold">{t("tab.incidents.col.severity")}</th>
                  <th className="py-2.5 text-start font-semibold">{t("tab.incidents.col.status")}</th>
                  <th className="py-2.5 text-end font-semibold">{t("tab.incidents.col.alerts")}</th>
                  <th className="py-2.5 pe-5 text-start font-semibold">{t("tab.incidents.col.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {payload.incidents.slice(0, 50).map((i) => (
                  <tr
                    key={i.id}
                    className="border-t border-border cursor-pointer hover:bg-surface-3/40"
                    onClick={() => setDrill(i)}
                  >
                    <td className="ps-5 py-2.5 text-ink-1 hover:text-council-strong">
                      {i.displayName}
                    </td>
                    <td className="py-2.5"><SeverityChip sev={i.severity} /></td>
                    <td className="py-2.5"><StatusChip status={i.status} /></td>
                    <td className="py-2.5 text-end tabular">{i.alertCount != null ? fmt(i.alertCount) : "—"}</td>
                    <td className="py-2.5 pe-5 text-ink-3 tabular">{fmtRelative(i.lastUpdateDateTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {drill ? (
          <IncidentDetailsModal incident={drill} onClose={() => setDrill(null)} />
        ) : null}
      </>
    );
  }

  function IncidentDetailsModal({
    incident,
    onClose,
  }: {
    incident: Incident;
    onClose: () => void;
  }) {
    // The panel is visible to every directive-deployment user so the UI is
    // discoverable. Actions are ENABLED only when this entity consented to
    // directive mode; observation-mode entities see the same controls but
    // disabled with an inline hint. This is more intuitive than hiding the
    // panel — users can see what directive actions exist and why they're
    // unavailable on a given entity.
    const [deploymentMode, setDeploymentMode] = useState<"observation" | "directive">(
      "observation",
    );
    useEffect(() => {
      let alive = true;
      api
        .whoami()
        .then((r) => {
          if (alive) setDeploymentMode(r.deploymentMode);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []);
    const showPanel = deploymentMode === "directive";
    const enabled = tenant.consent_mode === "directive";

    // Evidence for this incident — URLs / email message URIs / file hashes
    // pulled through the Signals Graph app (or synthesized for demo
    // tenants). Surfaces what a Defender analyst would copy out of the
    // entity's portal — except the Center doesn't have access to that
    // portal, so Mizan is the only place it can appear.
    type EvidenceItem = Awaited<
      ReturnType<typeof api.directiveTenantIncidentEvidence>
    >["evidence"][number];
    const [evidence, setEvidence] = useState<EvidenceItem[] | null>(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    useEffect(() => {
      // Only fetch on directive deployments — the endpoint is 404 elsewhere.
      if (deploymentMode !== "directive") return;
      let alive = true;
      setEvidenceLoading(true);
      api
        .directiveTenantIncidentEvidence(tenant.id, incident.id)
        .then((r) => {
          if (alive) setEvidence(r.evidence);
        })
        .catch(() => {
          if (alive) setEvidence([]);
        })
        .finally(() => {
          if (alive) setEvidenceLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [deploymentMode, incident.id]);
    return (
      <Modal open onClose={onClose} size="wide" title={incident.displayName}>
        <div className="flex flex-col gap-4">
          {/* Top row — severity + status + alert count + IDs */}
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityChip sev={incident.severity} />
            <StatusChip status={incident.status} />
            <span className="text-[11.5px] text-ink-3">
              {t("tab.incidents.col.alerts")}:{" "}
              <span className="text-ink-2 tabular">
                {incident.alertCount != null ? fmt(incident.alertCount) : "—"}
              </span>
            </span>
            <span className="text-[11.5px] text-ink-3 keep-ltr ms-auto">
              ID {incident.id}
            </span>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelledValue
              label={t("tab.incidents.drill.created")}
              value={fmtRelative(incident.createdDateTime)}
            />
            <LabelledValue
              label={t("tab.incidents.drill.updated")}
              value={fmtRelative(incident.lastUpdateDateTime)}
            />
          </div>

          {/* Classification / determination / assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelledValue
              label={t("tab.incidents.drill.classification")}
              value={
                incident.classification
                  ? t(
                      `incidentClassification.${incident.classification}` as DictKey,
                      {},
                    ) || incident.classification
                  : t("tab.incidents.drill.unclassified")
              }
            />
            <LabelledValue
              label={t("tab.incidents.drill.determination")}
              value={
                incident.determination
                  ? t(
                      `incidentDetermination.${incident.determination}` as DictKey,
                      {},
                    ) || incident.determination
                  : "—"
              }
            />
            <LabelledValue
              label={t("tab.incidents.drill.assignedTo")}
              value={incident.assignedTo ?? t("tab.incidents.drill.unassigned")}
              mono={!!incident.assignedTo}
            />
          </div>

          {/* Tags */}
          {incident.tags.length > 0 ? (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mb-1">
                {t("tab.incidents.drill.tags")}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {incident.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center h-6 px-2 rounded border border-border bg-surface-2 text-[11px] text-ink-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Alert evidence — URLs, email message URIs, file hashes the
              Center would otherwise need to copy from the entity's
              Defender XDR portal. Only rendered on directive deployments
              because the evidence endpoint is gated there. */}
          {showPanel ? (
            <IncidentEvidenceList
              tenantId={tenant.id}
              evidence={evidence}
              loading={evidenceLoading}
              canSubmit={enabled}
            />
          ) : null}

          {/* Directive actions panel. Rendered on every directive-mode
              deployment so the capability is visible; enabled only when
              this entity explicitly consented to directive mode. */}
          {showPanel ? (
            <IncidentDirectiveActions
              tenantId={tenant.id}
              incident={incident}
              enabled={enabled}
            />
          ) : null}

          {/* External link to Defender portal */}
          {incident.incidentWebUrl ? (
            <div className="pt-2 border-t border-border">
              <a
                href={incident.incidentWebUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
              >
                <ExternalLink size={13} />
                {t("tab.incidents.drill.openInDefender")}
              </a>
              <div className="text-[11px] text-ink-3 mt-2">
                {t("tab.incidents.drill.defenderHint")}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }

  function IncidentEvidenceList({
    tenantId,
    evidence,
    loading,
    canSubmit,
  }: {
    tenantId: string;
    evidence:
      | Awaited<
          ReturnType<typeof api.directiveTenantIncidentEvidence>
        >["evidence"]
      | null;
    loading: boolean;
    canSubmit: boolean;
  }) {
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const show = (msg: string, isError?: boolean) => {
      if (isError) {
        setErrorMsg(msg);
        setToast(null);
      } else {
        setToast(msg);
        setErrorMsg(null);
      }
      setTimeout(() => {
        setToast(null);
        setErrorMsg(null);
      }, 5000);
    };

    const onSubmit = async (
      ev: Awaited<
        ReturnType<typeof api.directiveTenantIncidentEvidence>
      >["evidence"][number],
      index: number,
    ) => {
      setSubmitting(index);
      try {
        let r: Awaited<ReturnType<typeof api.directiveSubmitThreat>>;
        if (ev.kind === "url") {
          r = await api.directiveSubmitThreat({
            kind: "url",
            tenantId,
            category: "phishing",
            url: ev.url ?? "",
          });
        } else if (ev.kind === "email") {
          r = await api.directiveSubmitThreat({
            kind: "email",
            tenantId,
            category: "phishing",
            recipientEmailAddress: ev.emailRecipient ?? "",
            messageUri: ev.messageUri ?? "",
          });
        } else {
          r = await api.directiveSubmitThreat({
            kind: "file",
            tenantId,
            category: "malware",
            fileName: ev.fileName ?? "unknown.bin",
            fileContent: ev.fileHash ?? "",
          });
        }
        show(
          r.simulated
            ? t("directive.toast.simulated", { auditId: String(r.auditId) })
            : t("directive.toast.success", { auditId: String(r.auditId) }),
        );
      } catch (err) {
        show((err as Error).message, true);
      } finally {
        setSubmitting(null);
      }
    };

    return (
      <div className="rounded-md border border-border bg-surface-1 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-semibold text-ink-1">
            {t("directive.threat.evidenceTitle")}
          </div>
          {toast ? (
            <span className="text-[11.5px] text-pos">{toast}</span>
          ) : errorMsg ? (
            <span className="text-[11.5px] text-neg truncate max-w-[50%]">
              {errorMsg}
            </span>
          ) : null}
        </div>
        {loading ? (
          <div className="text-[11.5px] text-ink-3">{t("state.loading")}</div>
        ) : !evidence || evidence.length === 0 ? (
          <div className="text-[11.5px] text-ink-3">
            {t("directive.threat.noEvidence")}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {evidence.map((ev, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-2"
              >
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-[0.06em] font-semibold rounded px-1.5 py-0.5 border ${
                    ev.kind === "url"
                      ? "text-warn border-warn/40 bg-warn/10"
                      : ev.kind === "email"
                        ? "text-accent border-accent/40 bg-accent/10"
                        : "text-neg border-neg/40 bg-neg/10"
                  }`}
                >
                  {ev.kind}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-ink-1 text-[12px] keep-ltr truncate">
                    {ev.label}
                  </div>
                  {ev.detail ? (
                    <div className="text-ink-3 text-[10.5px] mt-0.5 truncate">
                      {ev.detail}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => onSubmit(ev, i)}
                  disabled={!canSubmit || submitting !== null}
                  title={
                    canSubmit ? undefined : t("directive.action.observationHint")
                  }
                  className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-council-strong text-white text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting === i ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : null}
                  {t("directive.threat.submitToMicrosoft")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!canSubmit && evidence && evidence.length > 0 ? (
          <div className="text-[10.5px] text-ink-3 mt-2 leading-relaxed">
            {t("directive.action.observationHint")}
          </div>
        ) : null}
      </div>
    );
  }

  function IncidentDirectiveActions({
    tenantId,
    incident,
    enabled,
  }: {
    tenantId: string;
    incident: Incident;
    enabled: boolean;
  }) {
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [classification, setClassification] = useState<string>(
      incident.classification ?? "",
    );
    const [determination, setDetermination] = useState<string>(
      incident.determination ?? "",
    );
    const [status, setStatus] = useState<string>(incident.status ?? "");
    const [assignedTo, setAssignedTo] = useState<string>(
      incident.assignedTo ?? "",
    );
    const [comment, setComment] = useState("");

    const showToast = (msg: string, isError?: boolean) => {
      if (isError) {
        setErrorMsg(msg);
        setToast(null);
      } else {
        setToast(msg);
        setErrorMsg(null);
      }
      setTimeout(() => {
        setToast(null);
        setErrorMsg(null);
      }, 5000);
    };

    const onSaveClassification = async () => {
      setSaving(true);
      try {
        const body: Parameters<typeof api.directiveClassifyIncident>[1] = {
          tenantId,
        };
        if (classification) body.classification = classification as never;
        if (determination) body.determination = determination as never;
        if (status) body.status = status as never;
        if (assignedTo.trim()) body.assignedTo = assignedTo.trim();
        const r = await api.directiveClassifyIncident(incident.id, body);
        showToast(
          r.simulated
            ? t("directive.toast.simulated", { auditId: String(r.auditId) })
            : t("directive.toast.success", { auditId: String(r.auditId) }),
        );
      } catch (err) {
        showToast((err as Error).message, true);
      } finally {
        setSaving(false);
      }
    };

    const onAddComment = async () => {
      if (!comment.trim()) return;
      setSaving(true);
      try {
        const r = await api.directiveCommentIncident(incident.id, {
          tenantId,
          comment: comment.trim(),
        });
        showToast(
          r.simulated
            ? t("directive.toast.simulated", { auditId: String(r.auditId) })
            : t("directive.toast.success", { auditId: String(r.auditId) }),
        );
        setComment("");
      } catch (err) {
        showToast((err as Error).message, true);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div
        className={`rounded-md border p-3 ${
          enabled
            ? "border-council-strong/40 bg-council-strong/5"
            : "border-border bg-surface-1/60"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12.5px] font-semibold text-ink-1">
            {t("directive.action.title")}
          </div>
          {toast ? (
            <span className="text-[11.5px] text-pos">{toast}</span>
          ) : errorMsg ? (
            <span className="text-[11.5px] text-neg truncate max-w-[50%]">
              {errorMsg}
            </span>
          ) : (
            <span
              className={`text-[10.5px] uppercase tracking-[0.06em] rounded px-1.5 py-0.5 font-semibold border ${
                enabled
                  ? "text-council-strong border-council-strong/40"
                  : "text-ink-3 border-border"
              }`}
            >
              {enabled ? t("mode.directive") : t("mode.observation")}
            </span>
          )}
        </div>
        {!enabled ? (
          <div className="text-[11.5px] text-ink-3 mb-3 leading-relaxed">
            {t("directive.action.observationHint")}
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("tab.incidents.drill.classification")}
            </span>
            <select
              disabled={!enabled}
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="h-8 px-2 rounded border border-border bg-surface-1 text-[12.5px] text-ink-1 disabled:opacity-50"
            >
              <option value="">—</option>
              <option value="truePositive">True positive</option>
              <option value="falsePositive">False positive</option>
              <option value="informationalExpectedActivity">
                Informational / expected
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("tab.incidents.drill.determination")}
            </span>
            <select
              disabled={!enabled}
              value={determination}
              onChange={(e) => setDetermination(e.target.value)}
              className="h-8 px-2 rounded border border-border bg-surface-1 text-[12.5px] text-ink-1 disabled:opacity-50"
            >
              <option value="">—</option>
              <option value="apt">APT</option>
              <option value="malware">Malware</option>
              <option value="phishing">Phishing</option>
              <option value="compromisedAccount">Compromised account</option>
              <option value="maliciousUserActivity">Malicious user activity</option>
              <option value="unwantedSoftware">Unwanted software</option>
              <option value="insufficientInformation">
                Insufficient information
              </option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("tab.incidents.col.status")}
            </span>
            <select
              disabled={!enabled}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 px-2 rounded border border-border bg-surface-1 text-[12.5px] text-ink-1 disabled:opacity-50"
            >
              <option value="">—</option>
              <option value="active">Active</option>
              <option value="inProgress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="redirected">Redirected</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("tab.incidents.drill.assignedTo")}
            </span>
            <input
              disabled={!enabled}
              type="email"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              dir="ltr"
              placeholder="analyst@entity.gov.ae"
              className="h-8 px-2 rounded border border-border bg-surface-1 text-[12.5px] text-ink-1 disabled:opacity-50"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={onSaveClassification}
            disabled={!enabled || saving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[11.5px] font-semibold disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {t("directive.action.apply")}
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("directive.action.commentLabel")}
            </span>
            <textarea
              disabled={!enabled}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="px-2 py-1 rounded border border-border bg-surface-1 text-[12.5px] text-ink-1 disabled:opacity-50"
              placeholder={t("directive.action.commentPlaceholder")}
            />
          </label>
          <div className="mt-2 flex justify-end">
            <button
              onClick={onAddComment}
              disabled={!enabled || saving || !comment.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[11.5px] font-semibold disabled:opacity-50"
            >
              {t("directive.action.comment")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function LabelledValue({
    label,
    value,
    mono,
  }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
  }) {
    // min-w-0 on the outer div is what lets the inner text actually wrap
    // when it lives in a grid track — without it, a long email or tenant
    // GUID stretches the track and bleeds outside the card border.
    // `break-all` wraps long unbroken strings (emails, URLs, GUIDs) that
    // normal whitespace-driven word-wrap leaves alone.
    return (
      <div className="rounded-md border border-border bg-surface-1 p-3 min-w-0 overflow-hidden">
        <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mb-0.5">
          {label}
        </div>
        <div
          className={`text-[13px] text-ink-1 break-all ${mono ? "tabular keep-ltr" : ""}`}
        >
          {value}
        </div>
      </div>
    );
  }

  function IdentityTab({
    risky,
    pim,
    dfi,
    view,
    setView,
  }: {
    risky: RiskyUsersPayload | null;
    pim: PimSprawlPayload | null;
    dfi: DfiSensorHealthPayload | null;
    view: IdentityView;
    setView: (v: IdentityView) => void;
  }) {
    // Sub-view filter state — which of the three identity surfaces is active.
    const views: Array<{
      id: IdentityView;
      labelKey:
        | "tab.identity.view.risky"
        | "tab.identity.view.privileged"
        | "tab.identity.view.sensors";
      count: number;
    }> = [
      {
        id: "risky",
        labelKey: "tab.identity.view.risky",
        count: risky?.atRisk ?? 0,
      },
      {
        id: "privileged",
        labelKey: "tab.identity.view.privileged",
        count: pim?.privilegedRoleAssignments ?? 0,
      },
      {
        id: "sensors",
        labelKey: "tab.identity.view.sensors",
        count: dfi?.unhealthy ?? 0,
      },
    ];

    return (
      <div className="flex flex-col gap-4">
        {/* Sub-view pill bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
            {t("tab.identity.view.label")}
          </span>
          {views.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`inline-flex items-center h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                  active
                    ? "bg-surface-3 text-ink-1 border-border-strong"
                    : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
                }`}
              >
                {t(v.labelKey)}
                <span
                  className={`tabular ms-1.5 ${v.count > 0 ? (v.id === "risky" && (risky?.atRisk ?? 0) > 0 ? "text-warn" : v.id === "sensors" && (dfi?.unhealthy ?? 0) > 0 ? "text-neg" : "text-ink-2") : "text-ink-3"}`}
                >
                  {fmt(v.count)}
                </span>
              </button>
            );
          })}
        </div>

        {view === "risky" ? (
          <RiskyUsersSection payload={risky} />
        ) : view === "privileged" ? (
          <PrivilegedRolesSection payload={pim} />
        ) : (
          <SensorHealthSection payload={dfi} />
        )}
      </div>
    );
  }

  function RiskyUsersSection({ payload }: { payload: RiskyUsersPayload | null }) {
    const [levelFilter, setLevelFilter] = useState<string>("all");
    const [stateFilter, setStateFilter] = useState<string>("all");
    const [helpOpen, setHelpOpen] = useState(false);
    const [drillUser, setDrillUser] = useState<RiskyUser | null>(null);

    if (!payload || payload.users.length === 0) {
      return (
        <Card>
          <CardHeader
            title={t("tab.identity.title")}
            subtitle={t("tab.identity.subtitle")}
          />
          <div className="text-ink-3 text-[13px]">
            {!payload ? t("sync.never") : t("tab.identity.empty")}
          </div>
        </Card>
      );
    }

    const levels = Array.from(new Set(payload.users.map((u) => u.riskLevel))).sort();
    const states = Array.from(new Set(payload.users.map((u) => u.riskState))).sort();

    const filtered = payload.users.filter(
      (u) =>
        (levelFilter === "all" || u.riskLevel === levelFilter) &&
        (stateFilter === "all" || u.riskState === stateFilter),
    );

    return (
      <>
        <Card className="p-0">
          <div className="p-5 border-b border-border">
            <CardHeader
              title={t("tab.identity.title")}
              subtitle={t("tab.identity.subtitle")}
              right={
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHelpOpen((v) => !v)}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border text-ink-3 hover:text-ink-1 hover:bg-surface-3 text-[11px]"
                  >
                    {t("tab.identity.helpBtn")}
                  </button>
                  <div className="text-[12px] text-ink-2 tabular">
                    {t("tab.identity.summary", {
                      atRisk: fmt(payload.atRisk),
                      total: fmt(payload.total),
                    })}
                  </div>
                </div>
              }
            />
            {helpOpen ? (
              <div className="mt-3 rounded-md border border-border bg-surface-1 p-3 text-[12.5px] text-ink-2 leading-relaxed">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-ink-1 font-semibold mb-1">
                      {t("tab.identity.help.levelTitle")}
                    </div>
                    <p>{t("tab.identity.help.levelBody")}</p>
                  </div>
                  <div className="flex-1">
                    <div className="text-ink-1 font-semibold mb-1">
                      {t("tab.identity.help.stateTitle")}
                    </div>
                    <p>{t("tab.identity.help.stateBody")}</p>
                  </div>
                </div>
                <div className="mt-2 text-[11.5px] text-ink-3">
                  {t("tab.identity.help.clickHint")}
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <FilterGroup
                label={t("tab.identity.filter.level")}
                options={[{ id: "all", label: t("cols.all") }, ...levels.map((l) => ({ id: l, label: l }))]}
                value={levelFilter}
                onChange={setLevelFilter}
              />
              <FilterGroup
                label={t("tab.identity.filter.state")}
                options={[{ id: "all", label: t("cols.all") }, ...states.map((s) => ({ id: s, label: s }))]}
                value={stateFilter}
                onChange={setStateFilter}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">{t("tab.identity.col.user")}</th>
                  <th className="py-2.5 text-start font-semibold">{t("tab.identity.col.level")}</th>
                  <th className="py-2.5 text-start font-semibold">{t("tab.identity.col.state")}</th>
                  <th className="py-2.5 pe-5 text-start font-semibold">{t("tab.identity.col.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[12.5px] text-ink-3">
                      {t("tab.identity.filter.empty")}
                    </td>
                  </tr>
                ) : null}
                {filtered.slice(0, 200).map((u) => {
                  const canDrill =
                    (u.riskState === "atRisk" ||
                      u.riskState === "confirmedCompromised") &&
                    (u.detections?.length ?? 0) > 0;
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="ps-5 py-2.5">
                        <div className="text-ink-1">{u.displayName ?? u.userPrincipalName}</div>
                        <div className="text-[11.5px] text-ink-3 keep-ltr">{u.userPrincipalName}</div>
                      </td>
                      <td className="py-2.5"><RiskChip level={u.riskLevel} /></td>
                      <td className="py-2.5">
                        {canDrill ? (
                          <button
                            type="button"
                            onClick={() => setDrillUser(u)}
                            className="inline-flex items-center"
                            title={t("tab.identity.clickToExplain")}
                          >
                            <RiskStateChip state={u.riskState} />
                            <span className="ms-1 text-[11px] text-ink-3 underline underline-offset-2 decoration-dotted">
                              {t("tab.identity.why")}
                            </span>
                          </button>
                        ) : (
                          <RiskStateChip state={u.riskState} />
                        )}
                      </td>
                      <td className="py-2.5 pe-5 text-ink-3 tabular">{fmtRelative(u.riskLastUpdatedDateTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {drillUser ? (
          <RiskyUserDetailsModal
            user={drillUser}
            onClose={() => setDrillUser(null)}
          />
        ) : null}
      </>
    );
  }

  function RiskyUserDetailsModal({
    user,
    onClose,
  }: {
    user: RiskyUser;
    onClose: () => void;
  }) {
    const [deploymentMode, setDeploymentMode] = useState<
      "observation" | "directive"
    >("observation");
    useEffect(() => {
      let alive = true;
      api
        .whoami()
        .then((r) => {
          if (alive) setDeploymentMode(r.deploymentMode);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []);
    const showPanel = deploymentMode === "directive";
    const enabled = tenant.consent_mode === "directive";
    return (
      <Modal
        open
        onClose={onClose}
        size="wide"
        title={t("tab.identity.why.title", {
          user: user.displayName ?? user.userPrincipalName,
        })}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-surface-1 p-3 text-[12.5px] text-ink-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-ink-3 uppercase tracking-wide text-[10.5px]">
                {t("tab.identity.col.user")}
              </span>
              <span className="text-ink-1 keep-ltr">{user.userPrincipalName}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3 uppercase tracking-wide text-[10.5px]">
                {t("tab.identity.col.level")}
              </span>
              <RiskChip level={user.riskLevel} />
              <span className="text-ink-3">·</span>
              <span className="text-ink-3 uppercase tracking-wide text-[10.5px]">
                {t("tab.identity.col.state")}
              </span>
              <RiskStateChip state={user.riskState} />
            </div>
          </div>

          <div className="text-[12.5px] text-ink-2 leading-relaxed">
            {t("tab.identity.why.subtitle")}
          </div>

          {user.detections.length === 0 ? (
            <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12.5px] text-ink-1">
              {t("tab.identity.why.noDetections")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
                    <th className="py-1.5 text-start font-semibold">
                      {t("tab.identity.why.event")}
                    </th>
                    <th className="py-1.5 text-start font-semibold">
                      {t("tab.identity.why.severity")}
                    </th>
                    <th className="py-1.5 text-start font-semibold">
                      {t("tab.identity.why.location")}
                    </th>
                    <th className="py-1.5 text-start font-semibold">
                      {t("tab.identity.why.ip")}
                    </th>
                    <th className="py-1.5 text-start font-semibold">
                      {t("tab.identity.why.detected")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {user.detections.map((d) => (
                    <tr key={d.id} className="border-t border-border align-top">
                      <td className="py-2 pe-3">
                        <div className="text-ink-1 font-medium">
                          {t(
                            `riskEvent.${d.riskEventType}` as DictKey,
                            {},
                          ) || d.riskEventType}
                        </div>
                        {d.riskDetail ? (
                          <div className="text-[11.5px] text-ink-3 mt-0.5">
                            {d.riskDetail}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pe-3">
                        <RiskChip level={d.riskLevel} />
                      </td>
                      <td className="py-2 pe-3 text-ink-2">
                        {d.city && d.countryOrRegion
                          ? `${d.city}, ${d.countryOrRegion}`
                          : d.countryOrRegion ?? "—"}
                      </td>
                      <td className="py-2 pe-3 text-ink-3 keep-ltr tabular">
                        {d.ipAddress ?? "—"}
                      </td>
                      <td className="py-2 pe-3 text-ink-3 tabular">
                        {fmtRelative(d.detectedDateTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showPanel ? (
            <RiskyUserDirectiveActions
              tenantId={tenant.id}
              user={user}
              enabled={enabled}
            />
          ) : null}
        </div>
      </Modal>
    );
  }

  function RiskyUserDirectiveActions({
    tenantId,
    user,
    enabled,
  }: {
    tenantId: string;
    user: RiskyUser;
    enabled: boolean;
  }) {
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const show = (msg: string, isError?: boolean) => {
      if (isError) {
        setErrorMsg(msg);
        setToast(null);
      } else {
        setToast(msg);
        setErrorMsg(null);
      }
      setTimeout(() => {
        setToast(null);
        setErrorMsg(null);
      }, 5000);
    };

    const run = async (
      action: "confirm" | "dismiss" | "revoke",
      fn: () => Promise<{ simulated: boolean; auditId: number }>,
    ) => {
      setSaving(action);
      try {
        const r = await fn();
        show(
          r.simulated
            ? t("directive.toast.simulated", { auditId: String(r.auditId) })
            : t("directive.toast.success", { auditId: String(r.auditId) }),
        );
      } catch (err) {
        show((err as Error).message, true);
      } finally {
        setSaving(null);
      }
    };

    return (
      <div
        className={`rounded-md border p-3 ${
          enabled
            ? "border-council-strong/40 bg-council-strong/5"
            : "border-border bg-surface-1/60"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[12.5px] font-semibold text-ink-1">
            {t("directive.action.title")}
          </div>
          {toast ? (
            <span className="text-[11.5px] text-pos">{toast}</span>
          ) : errorMsg ? (
            <span className="text-[11.5px] text-neg truncate max-w-[50%]">
              {errorMsg}
            </span>
          ) : (
            <span
              className={`text-[10.5px] uppercase tracking-[0.06em] rounded px-1.5 py-0.5 font-semibold border ${
                enabled
                  ? "text-council-strong border-council-strong/40"
                  : "text-ink-3 border-border"
              }`}
            >
              {enabled ? t("mode.directive") : t("mode.observation")}
            </span>
          )}
        </div>
        {!enabled ? (
          <div className="text-[11.5px] text-ink-3 mb-3 leading-relaxed">
            {t("directive.action.observationHint")}
          </div>
        ) : null}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={!enabled || !!saving}
            onClick={() =>
              run("confirm", () =>
                api.directiveConfirmCompromised({
                  tenantId,
                  userIds: [user.id],
                }),
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-neg text-white text-[11.5px] font-semibold disabled:opacity-50"
          >
            {saving === "confirm" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {t("directive.action.confirmCompromised")}
          </button>
          <button
            disabled={!enabled || !!saving}
            onClick={() =>
              run("dismiss", () =>
                api.directiveDismissRiskyUsers({
                  tenantId,
                  userIds: [user.id],
                }),
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[11.5px] font-semibold disabled:opacity-50"
          >
            {saving === "dismiss" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {t("directive.action.dismiss")}
          </button>
          <button
            disabled={!enabled || !!saving}
            onClick={() =>
              run("revoke", () =>
                api.directiveRevokeSessions(user.id, { tenantId }),
              )
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-warn/60 bg-warn/10 text-ink-1 text-[11.5px] font-semibold disabled:opacity-50"
          >
            {saving === "revoke" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {t("directive.action.revokeSessions")}
          </button>
        </div>
        <div className="text-[10.5px] text-ink-3 mt-2 leading-relaxed">
          {t("directive.action.riskyHelper")}
        </div>
      </div>
    );
  }

  function PrivilegedRolesSection({ payload }: { payload: PimSprawlPayload | null }) {
    if (!payload) {
      return (
        <Card>
          <CardHeader
            title={t("tab.identity.pim.title")}
            subtitle={t("tab.identity.pim.subtitle")}
          />
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

    const roleRows = Object.entries(payload.byRole)
      .map(([role, counts]) => ({ role, ...counts, total: counts.active + counts.eligible }))
      .sort((a, b) => b.total - a.total);

    return (
      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader
            title={t("tab.identity.pim.title")}
            subtitle={t("tab.identity.pim.subtitle")}
            right={
              <div className="text-[12px] text-ink-2 tabular">
                {t("tab.identity.pim.summary", {
                  active: fmt(payload.activeAssignments),
                  eligible: fmt(payload.eligibleAssignments),
                  privileged: fmt(payload.privilegedRoleAssignments),
                })}
              </div>
            }
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MiniStat
              label={t("tab.identity.pim.activeKpi")}
              value={fmt(payload.activeAssignments)}
              tone={undefined}
            />
            <MiniStat
              label={t("tab.identity.pim.eligibleKpi")}
              value={fmt(payload.eligibleAssignments)}
              tone={undefined}
            />
            <MiniStat
              label={t("tab.identity.pim.privilegedKpi")}
              value={fmt(payload.privilegedRoleAssignments)}
              tone={payload.privilegedRoleAssignments > 10 ? "warn" : undefined}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("tab.identity.pim.col.role")}
                </th>
                <th className="py-2.5 text-end font-semibold">
                  {t("tab.identity.pim.col.active")}
                </th>
                <th className="py-2.5 text-end font-semibold">
                  {t("tab.identity.pim.col.eligible")}
                </th>
                <th className="py-2.5 pe-5 text-end font-semibold">
                  {t("tab.identity.pim.col.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {roleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[12.5px] text-ink-3">
                    {t("tab.identity.pim.empty")}
                  </td>
                </tr>
              ) : null}
              {roleRows.map((r) => (
                <tr key={r.role} className="border-t border-border">
                  <td className="ps-5 py-2.5 text-ink-1">{r.role}</td>
                  <td className="py-2.5 text-end tabular text-ink-1">{fmt(r.active)}</td>
                  <td className="py-2.5 text-end tabular text-ink-2">{fmt(r.eligible)}</td>
                  <td className="py-2.5 pe-5 text-end tabular text-ink-1 font-semibold">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function SensorHealthSection({ payload }: { payload: DfiSensorHealthPayload | null }) {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [severityFilter, setSeverityFilter] = useState<string>("all");

    if (!payload) {
      return (
        <Card>
          <CardHeader
            title={t("tab.identity.dfi.title")}
            subtitle={t("tab.identity.dfi.subtitle")}
          />
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

    const statuses = Array.from(new Set(payload.issues.map((i) => i.status))).sort();
    const severities = Array.from(new Set(payload.issues.map((i) => i.severity))).sort();

    const filteredIssues = payload.issues.filter(
      (i) =>
        (statusFilter === "all" || i.status === statusFilter) &&
        (severityFilter === "all" || i.severity === severityFilter),
    );

    return (
      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader
            title={t("tab.identity.dfi.title")}
            subtitle={t("tab.identity.dfi.subtitle")}
            right={
              <div className="text-[12px] text-ink-2 tabular">
                {t("tab.identity.dfi.summary", {
                  total: fmt(payload.total),
                  healthy: fmt(payload.healthy),
                  unhealthy: fmt(payload.unhealthy),
                })}
              </div>
            }
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MiniStat
              label={t("tab.identity.dfi.totalKpi")}
              value={fmt(payload.total)}
              tone={undefined}
            />
            <MiniStat
              label={t("tab.identity.dfi.healthyKpi")}
              value={fmt(payload.healthy)}
              tone="pos"
            />
            <MiniStat
              label={t("tab.identity.dfi.unhealthyKpi")}
              value={fmt(payload.unhealthy)}
              tone={payload.unhealthy > 0 ? "neg" : undefined}
            />
          </div>
          {payload.issues.length > 0 ? (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <FilterGroup
                label={t("tab.identity.dfi.filter.severity")}
                options={[
                  { id: "all", label: t("cols.all") },
                  ...severities.map((s) => ({ id: s, label: s })),
                ]}
                value={severityFilter}
                onChange={setSeverityFilter}
              />
              <FilterGroup
                label={t("tab.identity.dfi.filter.status")}
                options={[
                  { id: "all", label: t("cols.all") },
                  ...statuses.map((s) => ({ id: s, label: s })),
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          ) : null}
        </div>
        {payload.issues.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-ink-3">
            {payload.total === 0
              ? t("tab.identity.dfi.notLicensed")
              : t("tab.identity.dfi.allHealthy")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">
                    {t("tab.identity.dfi.col.sensor")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("tab.identity.dfi.col.severity")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("tab.identity.dfi.col.status")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("tab.identity.dfi.col.category")}
                  </th>
                  <th className="py-2.5 pe-5 text-start font-semibold">
                    {t("tab.identity.dfi.col.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[12.5px] text-ink-3">
                      {t("tab.identity.dfi.filter.empty")}
                    </td>
                  </tr>
                ) : null}
                {filteredIssues.slice(0, 200).map((i) => {
                  const sevTone =
                    i.severity === "high"
                      ? "text-neg bg-neg/10"
                      : i.severity === "medium"
                        ? "text-warn bg-warn/10"
                        : "text-ink-2 bg-surface-3";
                  return (
                    <tr key={i.id} className="border-t border-border">
                      <td className="ps-5 py-2.5 text-ink-1">{i.displayName}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-[0.06em] ${sevTone}`}
                        >
                          {i.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-ink-2">{i.status}</td>
                      <td className="py-2.5 text-ink-3">{i.category ?? "—"}</td>
                      <td className="py-2.5 pe-5 text-ink-3 tabular">
                        {fmtRelative(i.createdDateTime)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  }

  function FilterGroup({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: Array<{ id: string; label: string }>;
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
          {label}
        </span>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`h-6 px-2 text-[11px] rounded border transition-colors ${
                active
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-3 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  function DevicesTab({
    payload,
    vulns,
    sortByCves,
  }: {
    payload: DevicesPayload | null;
    vulns: VulnerabilitiesPayload | null;
    sortByCves: boolean;
  }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Index CVE-per-device from the Defender TVM payload (if available).
    // Match on deviceName first (works for demos + Azure-AD-joined hosts where
    // MDE sees the same hostname Intune does).
    const vulnByDeviceName = useMemo(() => {
      const m = new Map<string, NonNullable<typeof vulns>["byDevice"][number]>();
      if (vulns?.byDevice) {
        for (const d of vulns.byDevice) {
          if (d.deviceName) m.set(d.deviceName.trim().toLowerCase(), d);
        }
      }
      return m;
    }, [vulns]);

    const cveIndex = useMemo(() => {
      const m = new Map<string, VulnerabilitiesPayload["topCves"][number]>();
      if (vulns?.topCves) {
        for (const c of vulns.topCves) m.set(c.cveId, c);
      }
      return m;
    }, [vulns]);

    // When arriving via /vulnerabilities → entity drill-down, the operator's
    // intent is "which devices need patching?" — sort to put CVE-affected
    // hosts at the top regardless of alphabetic / last-sync order.
    const orderedDevices = useMemo(() => {
      if (!payload) return [];
      if (!sortByCves) return payload.devices;
      return payload.devices.slice().sort((a, b) => {
        const av = vulnByDeviceName.get((a.deviceName ?? "").trim().toLowerCase());
        const bv = vulnByDeviceName.get((b.deviceName ?? "").trim().toLowerCase());
        const aCrit = av?.critical ?? 0;
        const bCrit = bv?.critical ?? 0;
        if (aCrit !== bCrit) return bCrit - aCrit;
        const aTot = av?.cveCount ?? 0;
        const bTot = bv?.cveCount ?? 0;
        return bTot - aTot;
      });
    }, [payload, sortByCves, vulnByDeviceName]);

    if (!payload)
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );

    return (
      <Card className="p-0">
        <div className="p-5">
          <CardHeader
            title={t("tab.devices.title")}
            subtitle={t("tab.devices.subtitle")}
            right={
              <div className="text-[12px] text-ink-2 tabular">
                {t("tab.devices.summary", {
                  total: fmt(payload.total),
                  compliancePct: fmt(payload.compliancePct),
                })}
              </div>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("tab.devices.col.name")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.devices.col.os")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.devices.col.user")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.devices.col.state")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.devices.col.encrypted")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">{t("tab.devices.col.cves")}</th>
              </tr>
            </thead>
            <tbody>
              {orderedDevices.slice(0, 100).map((d) => {
                const key = (d.deviceName ?? "").trim().toLowerCase();
                const vulnEntry = vulnByDeviceName.get(key) ?? null;
                const expanded = expandedId === d.id;
                const canExpand = !!vulnEntry && vulnEntry.cveIds.length > 0;
                return (
                  <Fragment key={d.id}>
                    <tr className="border-t border-border hover:bg-surface-3/40">
                      <td className="ps-5 py-2.5 text-ink-1 keep-ltr">
                        {d.deviceName}
                      </td>
                      <td className="py-2.5 text-ink-2">
                        {d.operatingSystem}
                        {d.osVersion ? ` · ${d.osVersion}` : ""}
                      </td>
                      <td className="py-2.5 text-ink-3 keep-ltr">
                        {d.userPrincipalName ?? "—"}
                      </td>
                      <td className="py-2.5">
                        <ComplianceChip state={d.complianceState} />
                      </td>
                      <td className="py-2.5">
                        {d.isEncrypted === true ? (
                          <span className="text-pos">✓</span>
                        ) : d.isEncrypted === false ? (
                          <span className="text-neg">✗</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pe-5 text-end tabular">
                        {vulnEntry && vulnEntry.cveCount > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : d.id)
                            }
                            aria-expanded={expanded}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold transition-colors ${
                              vulnEntry.critical > 0
                                ? "border-neg/40 bg-neg/10 text-neg hover:bg-neg/20"
                                : vulnEntry.high > 0
                                  ? "border-warn/40 bg-warn/10 text-warn hover:bg-warn/20"
                                  : "border-border bg-surface-2 text-ink-1 hover:bg-surface-3"
                            }`}
                            title={t("tab.devices.col.cvesHint")}
                          >
                            <ChevronRight
                              size={11}
                              className={`transition-transform ${
                                expanded ? "rotate-90" : ""
                              }`}
                            />
                            {fmt(vulnEntry.cveCount)}
                          </button>
                        ) : vulnEntry ? (
                          <span className="text-ink-3">{fmt(0)}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded && vulnEntry ? (
                      <tr className="bg-surface-1">
                        <td colSpan={6} className="ps-8 pe-5 py-3">
                          <DeviceCveDrilldown
                            cveIds={vulnEntry.cveIds}
                            cveIndex={cveIndex}
                            remediationTracked={vulns?.remediationTracked === true}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function DeviceCveDrilldown({
    cveIds,
    cveIndex,
    remediationTracked,
  }: {
    cveIds: string[];
    cveIndex: Map<string, VulnerabilitiesPayload["topCves"][number]>;
    remediationTracked: boolean;
  }) {
    if (cveIds.length === 0) {
      return (
        <div className="text-[12.5px] text-ink-3">
          {t("tab.devices.drilldown.empty")}
        </div>
      );
    }
    // Join against the CVE index to enrich with severity / exploit / remediated.
    const enriched = cveIds
      .map((id) => cveIndex.get(id))
      .filter(
        (c): c is VulnerabilitiesPayload["topCves"][number] => c !== undefined,
      )
      .sort((a, b) => {
        const rank = (s: string) =>
          s === "Critical" ? 4 : s === "High" ? 3 : s === "Medium" ? 2 : s === "Low" ? 1 : 0;
        return rank(b.severity) - rank(a.severity);
      });

    return (
      <div>
        <div className="text-[11.5px] text-ink-3 uppercase tracking-wide mb-2">
          {t("tab.devices.drilldown.title", { count: fmt(enriched.length) })}
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.cve")}</th>
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.severity")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.cvss")}</th>
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.exploit")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.exposedDevices")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.remediatedDevices")}</th>
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.published")}</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((c) => {
              const tone =
                c.severity === "Critical"
                  ? "text-neg bg-neg/10 border-neg/40"
                  : c.severity === "High"
                    ? "text-warn bg-warn/10 border-warn/40"
                    : "text-ink-2 bg-surface-3 border-border";
              return (
                <tr key={c.cveId} className="border-t border-border/60">
                  <td className="py-1.5 text-ink-1 tabular keep-ltr">
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${c.cveId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-council-strong"
                    >
                      {c.cveId}
                      <ExternalLink size={10} className="text-ink-3" />
                    </a>
                  </td>
                  <td className="py-1.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.06em] border ${tone}`}
                    >
                      {c.severity}
                    </span>
                  </td>
                  <td className="py-1.5 text-end tabular">
                    {c.cvssScore != null ? c.cvssScore.toFixed(1) : "—"}
                  </td>
                  <td className="py-1.5">
                    {c.hasExploit ? (
                      <span className="text-neg text-[10.5px] font-semibold uppercase tracking-[0.06em]">
                        {t("vuln.exploit.yes")}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-[10.5px]">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-end tabular">{fmt(c.affectedDevices)}</td>
                  <td className="py-1.5 text-end tabular">
                    {remediationTracked ? (
                      <span className="text-pos font-semibold">
                        {fmt(c.remediatedDevices)}
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-ink-3 tabular keep-ltr text-[11px]">
                    {c.publishedDateTime ? c.publishedDateTime.slice(0, 10) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function DataTab({
    dlp,
    irm,
    commComp,
    srrs,
    retention,
    sensitivity,
    sharing,
  }: {
    dlp: PurviewAlertsPayload | null;
    irm: PurviewAlertsPayload | null;
    commComp: PurviewAlertsPayload | null;
    srrs: SubjectRightsRequestsPayload | null;
    retention: RetentionLabelsPayload | null;
    sensitivity: SensitivityLabelsPayload | null;
    sharing: SharepointSettingsPayload | null;
  }) {
    const anyPayload =
      dlp || irm || commComp || srrs || retention || sensitivity || sharing;
    if (!anyPayload) {
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("tab.data.emptyNoSync")}</div>
        </Card>
      );
    }

    // Cumulative signal across all Purview sources. When every field is zero
    // it means the tenant has no Purview data configured yet (no DLP policies,
    // no IRM plan, no retention labels) — show an explicit note so the page
    // doesn't look broken.
    const totalAlerts =
      (dlp?.total ?? 0) + (irm?.total ?? 0) + (commComp?.total ?? 0);
    const totalSrrs = srrs?.total ?? 0;
    const totalLabels =
      (retention?.labels.length ?? 0) + (sensitivity?.labels.length ?? 0);
    const everythingZero =
      totalAlerts === 0 && totalSrrs === 0 && totalLabels === 0;

    const sharingLabels: Record<string, string> = {
      disabled: locale === "ar" ? "تعطيل" : "Disabled",
      existingExternalUserSharingOnly:
        locale === "ar" ? "ضيوف حاليون فقط" : "Existing guests only",
      externalUserSharingOnly: locale === "ar" ? "ضيوف" : "External users",
      externalUserAndGuestSharing: locale === "ar" ? "أي شخص" : "Anyone",
      unknown: locale === "ar" ? "غير معروف" : "Unknown",
    };

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title={t("tab.data.title")} subtitle={t("tab.data.subtitle")} />
          {everythingZero ? (
            <div className="rounded-md border border-warn/30 bg-warn/5 text-[12.5px] text-ink-2 px-3 py-2 mb-4">
              {t("tab.data.empty.body")}
            </div>
          ) : null}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DataKpi
              label={t("tab.data.kpi.dlp")}
              total={dlp?.total ?? 0}
              active={dlp?.active ?? 0}
            />
            <DataKpi
              label={t("tab.data.kpi.irm")}
              total={irm?.total ?? 0}
              active={irm?.active ?? 0}
            />
            <DataKpi
              label={t("tab.data.kpi.commComp")}
              total={commComp?.total ?? 0}
              active={commComp?.active ?? 0}
            />
            <DataKpi
              label={t("tab.data.kpi.srrs")}
              total={srrs?.total ?? 0}
              active={srrs?.active ?? 0}
              extra={
                srrs?.overdue && srrs.overdue > 0
                  ? `${fmt(srrs.overdue)} ${locale === "ar" ? "متأخر" : "overdue"}`
                  : null
              }
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader
              title={t("tab.data.labels.title")}
              subtitle={t("tab.data.labels.subtitle")}
            />
            <div className="text-[12.5px] text-ink-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span>{t("tab.data.labels.retention")}</span>
                <span className="tabular text-ink-1 font-semibold">
                  {fmt(retention?.labels.length ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("tab.data.labels.retentionRecord")}</span>
                <span className="tabular text-ink-1 font-semibold">
                  {fmt(retention?.recordLabels ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("tab.data.labels.sensitivity")}</span>
                <span className="tabular text-ink-1 font-semibold">
                  {fmt(sensitivity?.labels.length ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t("tab.data.labels.sensitivityActive")}</span>
                <span className="tabular text-ink-1 font-semibold">
                  {fmt(sensitivity?.activeCount ?? 0)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t("tab.data.sharing.title")}
              subtitle={t("tab.data.sharing.subtitle")}
            />
            {sharing ? (
              <div className="flex flex-col gap-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink-2">
                    {t("tab.data.sharing.sharepoint")}
                  </span>
                  <span className="text-ink-1 font-semibold">
                    {sharingLabels[sharing.sharingCapability ?? "unknown"] ??
                      sharing.sharingCapability}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-2">
                    {t("tab.data.sharing.guestCount")}
                  </span>
                  <span className="text-ink-1 font-semibold tabular">
                    {fmt(sharing.allowedDomainListForSyncApp ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-2">
                    {t("tab.data.sharing.syncButtonHidden")}
                  </span>
                  <span className="text-ink-1 font-semibold">
                    {sharing.isSyncButtonHiddenOnPersonalSite
                      ? locale === "ar"
                        ? "نعم"
                        : "Yes"
                      : locale === "ar"
                        ? "لا"
                        : "No"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[12.5px] text-ink-3">
                {t("tab.data.sharing.missing")}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  function DataKpi({
    label,
    total,
    active,
    extra,
  }: {
    label: string;
    total: number;
    active: number;
    extra?: string | null;
  }) {
    return (
      <div className="rounded-md border border-border bg-surface-1 p-3">
        <div className="text-[11px] text-ink-3 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-[22px] text-ink-1 font-semibold tabular mt-0.5">
          {fmt(total)}
        </div>
        <div className="text-[11px] text-ink-3 tabular mt-0.5">
          {active > 0 ? (
            <span className="text-warn font-medium">
              {fmt(active)} {locale === "ar" ? "نشِط" : "active"}
            </span>
          ) : (
            <span>{locale === "ar" ? "لا توجد تنبيهات نشطة" : "no active alerts"}</span>
          )}
          {extra ? (
            <>
              <span className="mx-1.5 text-ink-3">·</span>
              <span className="text-neg font-medium">{extra}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function GovernanceTab({
    secureScore,
    maturity,
  }: {
    tenantId: string;
    secureScore: SecureScorePayload | null;
    maturity: MaturityBreakdown;
  }) {
    if (!secureScore) {
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("tab.gov.emptyNoSync")}</div>
        </Card>
      );
    }

    // Group secureScore controls by category. Each group's pass ratio drives
    // the framework alignment bars — categories mirror what NESA, NCA, and
    // ISR cluster their controls around (Identity, Data, Device, Apps).
    type Bucket = { total: number; passed: number; partial: number; failed: number };
    const byCategory = new Map<string, Bucket>();
    const tally = (cat: string, kind: keyof Bucket) => {
      const b = byCategory.get(cat) ?? { total: 0, passed: 0, partial: 0, failed: 0 };
      b.total++;
      b[kind]++;
      byCategory.set(cat, b);
    };
    for (const c of secureScore.controls) {
      const cat = c.category?.trim() || "Uncategorized";
      if (c.score == null) continue;
      const statusLower = (c.implementationStatus ?? "").toLowerCase();
      if (c.score === 0) tally(cat, "failed");
      else if (
        (c.maxScore != null && c.score < c.maxScore) ||
        statusLower.includes("not") ||
        statusLower.includes("partial")
      ) {
        tally(cat, "partial");
      } else tally(cat, "passed");
    }

    const sorted = Array.from(byCategory.entries()).sort(
      (a, b) => b[1].total - a[1].total,
    );
    const totalControls = sorted.reduce((s, [, b]) => s + b.total, 0);
    const totalPassed = sorted.reduce((s, [, b]) => s + b.passed, 0);
    const passingPct =
      totalControls > 0 ? Math.round((totalPassed / totalControls) * 100) : 0;

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title={t("tab.gov.title")}
            subtitle={t("tab.gov.subtitle")}
          />
          <div className="grid grid-cols-3 gap-3">
            <GovKpi
              label={t("tab.gov.kpi.controls")}
              value={fmt(totalControls)}
              caption={t("tab.gov.kpi.controlsCaption")}
            />
            <GovKpi
              label={t("tab.gov.kpi.passing")}
              value={`${fmt(passingPct)}%`}
              caption={t("tab.gov.kpi.passingCaption", {
                passed: fmt(totalPassed),
              })}
              tone={passingPct >= 75 ? "pos" : passingPct >= 50 ? "warn" : "neg"}
            />
            <GovKpi
              label={t("tab.gov.kpi.complianceSub")}
              value={fmt(Math.round(maturity.subScores.compliance))}
              caption={t("tab.gov.kpi.complianceSubCaption")}
              tone={
                maturity.subScores.compliance >= 75
                  ? "pos"
                  : maturity.subScores.compliance >= 50
                    ? "warn"
                    : "neg"
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("tab.gov.categories.title")}
            subtitle={t("tab.gov.categories.subtitle")}
          />
          <ul className="flex flex-col gap-4">
            {sorted.map(([cat, b]) => {
              const passedPct =
                b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0;
              return (
                <li key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-ink-1 font-medium">
                      {cat}
                    </span>
                    <span className="text-[12px] text-ink-2 tabular">
                      {fmt(b.passed)} / {fmt(b.total)}{" "}
                      <span className="text-ink-3">({fmt(passedPct)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3 overflow-hidden flex">
                    <div
                      className="h-full bg-pos"
                      style={{ width: `${(b.passed / Math.max(1, b.total)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-warn"
                      style={{ width: `${(b.partial / Math.max(1, b.total)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-neg"
                      style={{ width: `${(b.failed / Math.max(1, b.total)) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    );
  }

  function GovKpi({
    label,
    value,
    caption,
    tone,
  }: {
    label: string;
    value: string;
    caption: string;
    tone?: "pos" | "warn" | "neg";
  }) {
    const toneClass =
      tone === "pos"
        ? "text-pos"
        : tone === "warn"
          ? "text-warn"
          : tone === "neg"
            ? "text-neg"
            : "text-ink-1";
    return (
      <div className="rounded-md border border-border bg-surface-1 p-4">
        <div className="text-[11px] text-ink-3 uppercase tracking-wide">
          {label}
        </div>
        <div className={`text-[26px] font-semibold tabular mt-1 ${toneClass}`}>
          {value}
        </div>
        <div className="text-[11px] text-ink-3 mt-1">{caption}</div>
      </div>
    );
  }

  function VulnerabilitiesTab({
    payload,
  }: {
    payload: VulnerabilitiesPayload | null;
  }) {
    const [sevFilter, setSevFilter] = useState<
      "all" | "Critical" | "High" | "Medium" | "Low"
    >("all");
    const [onlyExploitable, setOnlyExploitable] = useState(false);
    const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
    const [expandedCveId, setExpandedCveId] = useState<string | null>(null);

    if (!payload) {
      return (
        <Card>
          <CardHeader
            title={t("tab.vulnerabilities.title")}
            subtitle={t("tab.vulnerabilities.subtitle")}
          />
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

    if (payload.error) {
      return (
        <Card>
          <CardHeader
            title={t("tab.vulnerabilities.title")}
            subtitle={t("tab.vulnerabilities.subtitle")}
          />
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12.5px] text-ink-1">
            <div className="font-semibold mb-1">
              {t("tab.vulnerabilities.notLicensedTitle")}
            </div>
            <div className="text-ink-2">
              {t("tab.vulnerabilities.notLicensedBody")}
            </div>
          </div>
        </Card>
      );
    }

    const devices = payload.byDevice.filter((d) => {
      if (sevFilter === "Critical" && d.critical === 0) return false;
      if (sevFilter === "High" && d.high === 0) return false;
      if (sevFilter === "Medium" && d.medium === 0) return false;
      if (sevFilter === "Low" && d.low === 0) return false;
      return true;
    });

    const cves = payload.topCves.filter((c) => {
      if (sevFilter !== "all" && c.severity !== sevFilter) return false;
      if (onlyExploitable && !c.hasExploit) return false;
      return true;
    });

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title={t("tab.vulnerabilities.title")}
            subtitle={t("tab.vulnerabilities.subtitle")}
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MiniStat
              label={t("tab.vulnerabilities.kpi.cves")}
              value={fmt(payload.total)}
            />
            <MiniStat
              label={t("tab.vulnerabilities.kpi.critical")}
              value={fmt(payload.critical)}
              tone={payload.critical > 0 ? "neg" : undefined}
            />
            <MiniStat
              label={t("tab.vulnerabilities.kpi.high")}
              value={fmt(payload.high)}
              tone={payload.high > 0 ? "warn" : undefined}
            />
            <MiniStat
              label={t("tab.vulnerabilities.kpi.exploitable")}
              value={fmt(payload.exploitable)}
              tone={payload.exploitable > 0 ? "neg" : undefined}
            />
            <MiniStat
              label={t("tab.vulnerabilities.kpi.devices")}
              value={fmt(payload.affectedDevices)}
            />
          </div>
        </Card>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
            {t("tab.vulnerabilities.filter.severity")}
          </span>
          {(["all", "Critical", "High", "Medium", "Low"] as const).map((s) => {
            const active = sevFilter === s;
            const label =
              s === "all"
                ? t("cols.all")
                : s === "Critical"
                  ? t("vuln.sev.critical")
                  : s === "High"
                    ? t("vuln.sev.high")
                    : s === "Medium"
                      ? t("vuln.sev.medium")
                      : t("vuln.sev.low");
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSevFilter(s)}
                className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                  active
                    ? "bg-surface-3 text-ink-1 border-border-strong"
                    : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOnlyExploitable((v) => !v)}
            className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ms-2 ${
              onlyExploitable
                ? "bg-neg/10 text-neg border-neg/40"
                : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
            }`}
          >
            {t("tab.vulnerabilities.filter.exploitOnly")}
          </button>
        </div>

        <Card className="p-0">
          <div className="p-5 border-b border-border">
            <CardHeader
              title={t("tab.vulnerabilities.byDevice.title")}
              subtitle={t("tab.vulnerabilities.byDevice.subtitleAll", {
                count: fmt(devices.length),
              })}
            />
          </div>
          {/* Scrollable body — ~520px keeps the section visible without
              pushing the CVE card off-screen, but operators can scroll
              through every device, not just the top 50. */}
          <div className="overflow-auto" style={{ maxHeight: 520 }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface-1 z-10">
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">
                    {t("tab.vulnerabilities.byDevice.device")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("tab.vulnerabilities.byDevice.os")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("vuln.cols.critical")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("vuln.cols.high")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("tab.vulnerabilities.byDevice.maxCvss")}
                  </th>
                  <th className="py-2.5 pe-5 text-end font-semibold">
                    {t("tab.vulnerabilities.byDevice.cves")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-[12.5px] text-ink-3"
                    >
                      {t("tab.vulnerabilities.filter.empty")}
                    </td>
                  </tr>
                ) : null}
                {devices.map((d) => {
                  const expanded = expandedDeviceId === d.deviceId;
                  const canExpand = d.cveIds.length > 0;
                  return (
                    <Fragment key={d.deviceId}>
                      <tr className="border-t border-border hover:bg-surface-3/40">
                        <td className="ps-5 py-2.5 text-ink-1">{d.deviceName}</td>
                        <td className="py-2.5 text-ink-2">{d.osPlatform ?? "—"}</td>
                        <td className="py-2.5 text-end tabular">
                          {d.critical > 0 ? (
                            <span className="text-neg font-semibold">{fmt(d.critical)}</span>
                          ) : (
                            fmt(0)
                          )}
                        </td>
                        <td className="py-2.5 text-end tabular">
                          {d.high > 0 ? (
                            <span className="text-warn font-semibold">{fmt(d.high)}</span>
                          ) : (
                            fmt(0)
                          )}
                        </td>
                        <td className="py-2.5 text-end tabular">
                          {d.maxCvss != null ? d.maxCvss.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5 pe-5 text-end tabular">
                          {canExpand ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDeviceId(expanded ? null : d.deviceId)
                              }
                              aria-expanded={expanded}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold transition-colors ${
                                d.critical > 0
                                  ? "border-neg/40 bg-neg/10 text-neg hover:bg-neg/20"
                                  : d.high > 0
                                    ? "border-warn/40 bg-warn/10 text-warn hover:bg-warn/20"
                                    : "border-border bg-surface-2 text-ink-1 hover:bg-surface-3"
                              }`}
                            >
                              <ChevronRight
                                size={11}
                                className={`transition-transform ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                              {fmt(d.cveCount)}
                            </button>
                          ) : (
                            <span className="text-ink-3">{fmt(0)}</span>
                          )}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-surface-1">
                          <td colSpan={6} className="ps-8 pe-5 py-3">
                            <VulnDeviceCveList
                              cveIds={d.cveIds}
                              allCves={payload.topCves}
                              remediationTracked={payload.remediationTracked}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-5 border-b border-border">
            <CardHeader
              title={t("tab.vulnerabilities.topCves.titleAll")}
              subtitle={t("tab.vulnerabilities.topCves.subtitleAll", {
                count: fmt(cves.length),
              })}
            />
          </div>
          <div className="overflow-auto" style={{ maxHeight: 520 }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface-1 z-10">
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">
                    {t("vuln.cols.cve")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("vuln.cols.severity")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("vuln.cols.cvss")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("vuln.cols.exploit")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("vuln.cols.exposedDevices")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("vuln.cols.remediatedDevices")}
                  </th>
                  <th className="py-2.5 pe-5 text-start font-semibold">
                    {t("vuln.cols.published")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cves.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-[12.5px] text-ink-3"
                    >
                      {t("tab.vulnerabilities.filter.empty")}
                    </td>
                  </tr>
                ) : null}
                {cves.map((c) => {
                  const tone =
                    c.severity === "Critical"
                      ? "text-neg bg-neg/10 border-neg/40"
                      : c.severity === "High"
                        ? "text-warn bg-warn/10 border-warn/40"
                        : "text-ink-2 bg-surface-3 border-border";
                  const expanded = expandedCveId === c.cveId;
                  const canExpand = c.affectedDevices > 0;
                  return (
                    <Fragment key={c.cveId}>
                      <tr className="border-t border-border hover:bg-surface-3/40">
                        <td className="ps-5 py-2.5 text-ink-1 tabular keep-ltr">
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${c.cveId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-council-strong"
                          >
                            {c.cveId}
                            <ExternalLink size={11} className="text-ink-3" />
                          </a>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] border ${tone}`}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-2.5 text-end tabular">
                          {c.cvssScore != null ? c.cvssScore.toFixed(1) : "—"}
                        </td>
                        <td className="py-2.5">
                          {c.hasExploit ? (
                            <span className="text-neg text-[11px] font-semibold uppercase tracking-[0.06em]">
                              {t("vuln.exploit.yes")}
                            </span>
                          ) : (
                            <span className="text-ink-3 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-end tabular">
                          {canExpand ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCveId(expanded ? null : c.cveId)
                              }
                              aria-expanded={expanded}
                              title={t("tab.vulnerabilities.topCves.clickHint")}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold transition-colors ${
                                c.severity === "Critical"
                                  ? "border-neg/40 bg-neg/10 text-neg hover:bg-neg/20"
                                  : c.severity === "High"
                                    ? "border-warn/40 bg-warn/10 text-warn hover:bg-warn/20"
                                    : "border-border bg-surface-2 text-ink-1 hover:bg-surface-3"
                              }`}
                            >
                              <ChevronRight
                                size={11}
                                className={`transition-transform ${
                                  expanded ? "rotate-90" : ""
                                }`}
                              />
                              {fmt(c.affectedDevices)}
                            </button>
                          ) : (
                            <span className="text-ink-3">{fmt(0)}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-end tabular">
                          {payload.remediationTracked ? (
                            <span className="text-pos font-semibold">
                              {fmt(c.remediatedDevices)}
                            </span>
                          ) : (
                            <span
                              className="text-ink-3"
                              title={t("tab.vulnerabilities.remediationNotTracked")}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pe-5 text-ink-3 tabular keep-ltr text-[12px]">
                          {c.publishedDateTime ? c.publishedDateTime.slice(0, 10) : "—"}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-surface-1">
                          <td colSpan={7} className="ps-8 pe-5 py-3">
                            <VulnCveDeviceList
                              cveId={c.cveId}
                              byDevice={payload.byDevice}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function VulnDeviceCveList({
    cveIds,
    allCves,
    remediationTracked,
  }: {
    cveIds: string[];
    allCves: VulnerabilitiesPayload["topCves"];
    remediationTracked: boolean;
  }) {
    // Join device-local CVE IDs against the tenant-wide CVE catalog.
    const byId = new Map(allCves.map((c) => [c.cveId, c]));
    const enriched = cveIds
      .map((id) => byId.get(id))
      .filter((c): c is VulnerabilitiesPayload["topCves"][number] => !!c)
      .sort((a, b) => {
        const rank = (s: string) =>
          s === "Critical" ? 4 : s === "High" ? 3 : s === "Medium" ? 2 : s === "Low" ? 1 : 0;
        return rank(b.severity) - rank(a.severity) || (b.cvssScore ?? 0) - (a.cvssScore ?? 0);
      });
    if (enriched.length === 0) {
      return (
        <div className="text-[12.5px] text-ink-3">
          {t("tab.devices.drilldown.empty")}
        </div>
      );
    }
    return (
      <div>
        <div className="text-[11.5px] text-ink-3 uppercase tracking-wide mb-2">
          {t("tab.devices.drilldown.title", { count: fmt(enriched.length) })}
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.cve")}</th>
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.severity")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.cvss")}</th>
              <th className="py-1.5 text-start font-semibold">{t("vuln.cols.exploit")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.exposedDevices")}</th>
              <th className="py-1.5 text-end font-semibold">{t("vuln.cols.remediatedDevices")}</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((c) => {
              const tone =
                c.severity === "Critical"
                  ? "text-neg bg-neg/10 border-neg/40"
                  : c.severity === "High"
                    ? "text-warn bg-warn/10 border-warn/40"
                    : "text-ink-2 bg-surface-3 border-border";
              return (
                <tr key={c.cveId} className="border-t border-border/60">
                  <td className="py-1.5 text-ink-1 tabular keep-ltr">
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${c.cveId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-council-strong"
                    >
                      {c.cveId}
                      <ExternalLink size={10} className="text-ink-3" />
                    </a>
                  </td>
                  <td className="py-1.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.06em] border ${tone}`}
                    >
                      {c.severity}
                    </span>
                  </td>
                  <td className="py-1.5 text-end tabular">
                    {c.cvssScore != null ? c.cvssScore.toFixed(1) : "—"}
                  </td>
                  <td className="py-1.5">
                    {c.hasExploit ? (
                      <span className="text-neg text-[10.5px] font-semibold uppercase tracking-[0.06em]">
                        {t("vuln.exploit.yes")}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-[10.5px]">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-end tabular">{fmt(c.affectedDevices)}</td>
                  <td className="py-1.5 text-end tabular">
                    {remediationTracked ? (
                      <span className="text-pos font-semibold">
                        {fmt(c.remediatedDevices)}
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function VulnCveDeviceList({
    cveId,
    byDevice,
  }: {
    cveId: string;
    byDevice: VulnerabilitiesPayload["byDevice"];
  }) {
    // Find every device whose cveIds array contains this CVE.
    const matched = byDevice
      .filter((d) => d.cveIds.includes(cveId))
      .sort((a, b) => b.critical - a.critical || b.cveCount - a.cveCount);
    if (matched.length === 0) {
      return (
        <div className="text-[12.5px] text-ink-3">
          {t("tab.vulnerabilities.topCves.noDevices")}
        </div>
      );
    }
    return (
      <div>
        <div className="text-[11.5px] text-ink-3 uppercase tracking-wide mb-2">
          {t("tab.vulnerabilities.topCves.affectedDevicesLabel", {
            count: fmt(matched.length),
          })}
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
              <th className="py-1.5 text-start font-semibold">
                {t("tab.vulnerabilities.byDevice.device")}
              </th>
              <th className="py-1.5 text-start font-semibold">
                {t("tab.vulnerabilities.byDevice.os")}
              </th>
              <th className="py-1.5 text-end font-semibold">
                {t("tab.vulnerabilities.byDevice.cves")}
              </th>
              <th className="py-1.5 text-end font-semibold">
                {t("vuln.cols.critical")}
              </th>
              <th className="py-1.5 text-end font-semibold">
                {t("tab.vulnerabilities.byDevice.maxCvss")}
              </th>
            </tr>
          </thead>
          <tbody>
            {matched.map((d) => (
              <tr key={d.deviceId} className="border-t border-border/60">
                <td className="py-1.5 text-ink-1">{d.deviceName}</td>
                <td className="py-1.5 text-ink-2">{d.osPlatform ?? "—"}</td>
                <td className="py-1.5 text-end tabular">{fmt(d.cveCount)}</td>
                <td className="py-1.5 text-end tabular">
                  {d.critical > 0 ? (
                    <span className="text-neg font-semibold">{fmt(d.critical)}</span>
                  ) : (
                    fmt(0)
                  )}
                </td>
                <td className="py-1.5 text-end tabular">
                  {d.maxCvss != null ? d.maxCvss.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function AttackSimulationTab({
    payload,
  }: {
    payload: AttackSimulationPayload | null;
  }) {
    const [statusFilter, setStatusFilter] = useState<string>("all");

    if (!payload) {
      return (
        <Card>
          <CardHeader
            title={t("tab.attackSim.title")}
            subtitle={t("tab.attackSim.subtitle")}
          />
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

    if (payload.simulations === 0) {
      return (
        <Card>
          <CardHeader
            title={t("tab.attackSim.title")}
            subtitle={t("tab.attackSim.subtitle")}
          />
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-[12.5px] text-ink-1">
            <div className="font-semibold mb-1">
              {t("tab.attackSim.notLicensedTitle")}
            </div>
            <div className="text-ink-2">
              {t("tab.attackSim.notLicensedBody")}
            </div>
          </div>
        </Card>
      );
    }

    const statuses = Array.from(
      new Set(payload.simulationsList.map((s) => s.status)),
    ).sort();
    const filtered = payload.simulationsList.filter(
      (s) => statusFilter === "all" || s.status === statusFilter,
    );
    // Fleet click-rate tier for colour-coding each simulation row.
    const tier = (rate: number | null): "pos" | "warn" | "neg" | "ink" => {
      if (rate == null) return "ink";
      if (rate >= 20) return "neg";
      if (rate >= 10) return "warn";
      if (rate > 0) return "pos";
      return "ink";
    };

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title={t("tab.attackSim.title")}
            subtitle={t("tab.attackSim.subtitle")}
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MiniStat
              label={t("tab.attackSim.kpi.simulations")}
              value={fmt(payload.simulations)}
            />
            <MiniStat
              label={t("tab.attackSim.kpi.attempts")}
              value={fmt(payload.totalAttempts)}
            />
            <MiniStat
              label={t("tab.attackSim.kpi.clicks")}
              value={fmt(payload.clicks)}
              tone={payload.clicks > 0 ? "warn" : undefined}
            />
            <MiniStat
              label={t("tab.attackSim.kpi.clickRate")}
              value={`${fmt(payload.clickRatePct)}%`}
              tone={
                payload.clickRatePct >= 20
                  ? "neg"
                  : payload.clickRatePct >= 10
                    ? "warn"
                    : payload.clickRatePct > 0
                      ? "pos"
                      : undefined
              }
            />
            <MiniStat
              label={t("tab.attackSim.kpi.reported")}
              value={fmt(payload.reported)}
              tone={payload.reported > 0 ? "pos" : undefined}
            />
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-5 border-b border-border">
            <CardHeader
              title={t("tab.attackSim.list.title")}
              subtitle={t("tab.attackSim.list.subtitle")}
            />
            {statuses.length > 1 ? (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <FilterGroup
                  label={t("tab.attackSim.filter.status")}
                  options={[
                    { id: "all", label: t("cols.all") },
                    ...statuses.map((s) => ({ id: s, label: s })),
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                  <th className="py-2.5 ps-5 text-start font-semibold">
                    {t("tab.attackSim.col.name")}
                  </th>
                  <th className="py-2.5 text-start font-semibold">
                    {t("tab.attackSim.col.status")}
                  </th>
                  <th className="py-2.5 text-end font-semibold">
                    {t("tab.attackSim.col.clickRate")}
                  </th>
                  <th className="py-2.5 pe-5 text-start font-semibold">
                    {t("tab.attackSim.col.launched")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-[12.5px] text-ink-3"
                    >
                      {t("tab.attackSim.filter.empty")}
                    </td>
                  </tr>
                ) : null}
                {filtered.slice(0, 50).map((s) => {
                  const rate = s.clickRatePct;
                  const toneCls =
                    tier(rate) === "neg"
                      ? "text-neg font-semibold"
                      : tier(rate) === "warn"
                        ? "text-warn font-semibold"
                        : tier(rate) === "pos"
                          ? "text-pos"
                          : "text-ink-3";
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="ps-5 py-2.5 text-ink-1">{s.displayName}</td>
                      <td className="py-2.5 text-ink-2 capitalize">
                        {s.status}
                      </td>
                      <td className={`py-2.5 text-end tabular ${toneCls}`}>
                        {rate != null ? `${fmt(rate)}%` : "—"}
                      </td>
                      <td className="py-2.5 pe-5 text-ink-3 tabular">
                        {fmtRelative(s.createdDateTime)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function ConnectionTab({ health }: { health: EndpointHealth[] }) {
    if (health.length === 0) return <Card><div className="text-ink-3 text-[13px]">{t("sync.never")}</div></Card>;
    return (
      <Card className="p-0">
        <div className="p-5">
          <CardHeader title={t("tab.connection.title")} subtitle={t("tab.connection.subtitle")} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("tab.connection.col.endpoint")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.connection.col.lastSuccess")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.connection.col.lastError")}</th>
                <th className="py-2.5 text-end font-semibold">{t("tab.connection.col.callCount")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">{t("tab.connection.col.throttled")}</th>
              </tr>
            </thead>
            <tbody>
              {health.map((h) => (
                <tr key={h.endpoint} className="border-t border-border">
                  <td className="ps-5 py-2.5 text-ink-1 keep-ltr tabular">{h.endpoint}</td>
                  <td className="py-2.5 text-ink-2 tabular">{h.last_success_at ? fmtRelative(h.last_success_at) : "—"}</td>
                  <td className="py-2.5 text-ink-3 max-w-[280px] truncate">
                    {h.last_error_at ? `${fmtRelative(h.last_error_at)} — ${h.last_error_message ?? ""}` : "—"}
                  </td>
                  <td className="py-2.5 text-end tabular">{fmt(h.call_count_24h)}</td>
                  <td className="py-2.5 pe-5 text-end tabular">{fmt(h.throttle_count_24h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function SeverityChip({ sev }: { sev: string }) {
    const color = sev === "high" ? "text-neg bg-neg/10" : sev === "medium" ? "text-warn bg-warn/10" : "text-ink-2 bg-surface-3";
    const labelKey = `severity.${sev === "informational" ? "informational" : sev}` as
      | "severity.high" | "severity.medium" | "severity.low" | "severity.informational";
    return (
      <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-[0.06em] ${color}`}>
        {t(labelKey)}
      </span>
    );
  }

  function StatusChip({ status }: { status: string }) {
    const color = status === "active" ? "text-warn bg-warn/10" : status === "resolved" ? "text-pos bg-pos/10" : "text-ink-2 bg-surface-3";
    const labelKey = (`status.${status === "inProgress" ? "inProgress" : status}`) as
      | "status.active" | "status.inProgress" | "status.resolved" | "status.redirected";
    return (
      <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-[0.06em] ${color}`}>
        {t(labelKey)}
      </span>
    );
  }

  function RiskChip({ level }: { level: string }) {
    const color = level === "high" ? "text-neg bg-neg/10" : level === "medium" ? "text-warn bg-warn/10" : "text-ink-2 bg-surface-3";
    const labelKey = `risk.${level}` as DictKey;
    return <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-[0.06em] ${color}`}>{t(labelKey)}</span>;
  }

  function RiskStateChip({ state }: { state: string }) {
    const color = state === "atRisk" || state === "confirmedCompromised" ? "text-neg bg-neg/10" : state === "remediated" || state === "confirmedSafe" ? "text-pos bg-pos/10" : "text-ink-2 bg-surface-3";
    const labelKey = `riskState.${state}` as DictKey;
    return <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold ${color}`}>{t(labelKey)}</span>;
  }

  function ComplianceChip({ state }: { state: string }) {
    const color = state === "compliant" ? "text-pos bg-pos/10" : state === "noncompliant" || state === "conflict" || state === "error" ? "text-neg bg-neg/10" : state === "inGracePeriod" ? "text-warn bg-warn/10" : "text-ink-2 bg-surface-3";
    const labelKey = `compliance.${state}` as DictKey;
    return <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded font-semibold ${color}`}>{t(labelKey)}</span>;
  }
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-1">{value}</span>
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "pos" | "warn" | "neg";
  /**
   * Optional secondary line rendered under the label in a smaller, dimmer
   * style. Use it for a one-glance qualifier (e.g. "Skipped from math") that
   * tells the reader what the number means without making the box noisy.
   */
  hint?: React.ReactNode;
}) {
  const c =
    tone === "pos"
      ? "text-pos"
      : tone === "warn"
        ? "text-warn"
        : tone === "neg"
          ? "text-neg"
          : "text-ink-1";
  return (
    <div className="rounded-md border border-border bg-surface-1 py-2.5">
      <div className={`text-[20px] font-semibold tabular ${c}`}>{value}</div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mt-0.5">
        {label}
      </div>
      {hint ? (
        <div className="text-[10px] text-ink-3/80 mt-0.5">{hint}</div>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// FrameworkTab — dedicated entity-level Framework view (v2.4.0).
//
// Three blocks:
//   1) Headline pill: framework % + clauses-scored / total / OOS counts
//   2) Per-clause table identical to the Overview breakdown, but with a
//      column of OOS toggles so the operator can carve out clauses that
//      are "covered elsewhere on this entity" — sets a tenant-tier OOS
//      mark, immediately removing the clause from this entity's score.
//   3) "Deployed via Directive" recap — a list of pushes the Directive
//      app has executed against THIS entity, so an operator can see
//      which baselines are already in flight before authoring more.
//
// Per-entity OOS captures a `reason` (free-text) so there's an audit
// trail. The global tier marked from Settings → Compliance framework
// is also shown here as a chip on the row but cannot be unmarked from
// this surface — that lives in Settings.
// ────────────────────────────────────────────────────────────────────
type DirectivePushAction = {
  id: number;
  push_request_id: number;
  tenant_id: string;
  status: "success" | "failed" | "simulated" | "rolledback";
  graph_policy_id: string | null;
  error_message: string | null;
  at: string;
  baseline_id?: string;
};

function FrameworkTab({
  tenantId,
  fc,
  tenantNameEn,
  onRefresh,
}: {
  tenantId: string;
  fc: FrameworkComplianceDetail | undefined;
  tenantNameEn: string;
  onRefresh: () => Promise<void> | void;
}) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const fmtRelative = useFmtRelative();
  const [tenantOos, setTenantOos] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState<{
    clauseId: string;
    reason: string;
  } | null>(null);
  const [pushHistory, setPushHistory] = useState<DirectivePushAction[]>([]);
  const [pushHistoryError, setPushHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load per-tenant OOS marks + this entity's directive push history.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const oos = await api.listComplianceOos(tenantId);
        if (!alive) return;
        setTenantOos(
          new Set(
            oos.marks
              .filter((mk) => mk.scopeKind === "clause" && mk.tenantId === tenantId)
              .map((mk) => mk.scopeId),
          ),
        );
      } catch (err) {
        if (alive) setError((err as Error).message);
      }
    })();
    (async () => {
      try {
        const r = await fetch(
          `/api/directive/push/history?tenantId=${encodeURIComponent(tenantId)}`,
          { cache: "no-store" },
        );
        if (!alive) return;
        if (r.ok) {
          const body = (await r.json()) as { actions?: DirectivePushAction[] };
          setPushHistory(body.actions ?? []);
        }
      } catch (err) {
        if (alive) setPushHistoryError((err as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantId]);

  if (!fc) {
    return (
      <Card className="p-5">
        <div className="text-[12.5px] text-ink-3">
          {t("entity.frameworkCompliance.noData")}
        </div>
      </Card>
    );
  }

  const target = fc.target / 100;
  const partialFloor = (fc.target - 20) / 100;
  const frameworkName = t(
    `branding.framework.${fc.frameworkId}` as DictKey,
  );

  const inScopeRows = fc.breakdown.filter(
    (r) => r.oosState !== "global-oos" && !tenantOos.has(r.clauseId),
  );

  // Recompute the score locally so the headline reacts instantly when
  // the operator toggles an OOS — saves a roundtrip and avoids the
  // "click toggle, score doesn't move" perception bug. Once `onRefresh`
  // resolves the next breakdown fetch confirms.
  const localPercent = (() => {
    const scored = inScopeRows.filter((r) => r.coverage !== null);
    if (scored.length === 0) return null;
    const sumW = scored.reduce((a, b) => a + (b.weight || 0), 0);
    if (sumW === 0) return null;
    const sumWC = scored.reduce(
      (a, b) => a + (b.coverage ?? 0) * (b.weight || 0),
      0,
    );
    return (sumWC / sumW) * 100;
  })();

  const oosCount =
    fc.breakdown.filter((r) => r.oosState === "global-oos").length +
    tenantOos.size;

  const toggleTenantOos = async (clauseId: string, reason: string | null) => {
    const wasOos = tenantOos.has(clauseId);
    setBusyId(clauseId);
    setError(null);
    setTenantOos((prev) => {
      const next = new Set(prev);
      if (wasOos) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
    try {
      if (wasOos) {
        await api.unmarkComplianceOos({
          tenantId,
          scopeKind: "clause",
          scopeId: clauseId,
        });
      } else {
        await api.markComplianceOos({
          tenantId,
          scopeKind: "clause",
          scopeId: clauseId,
          reason,
        });
      }
      // Confirm against the server (returns updated framework breakdown
      // so headlines elsewhere — e.g. the entity's score on the overview
      // tab — stay in sync).
      await onRefresh();
    } catch (err) {
      // Rollback.
      setTenantOos((prev) => {
        const next = new Set(prev);
        if (wasOos) next.add(clauseId);
        else next.delete(clauseId);
        return next;
      });
      setError((err as Error).message);
    } finally {
      setBusyId(null);
      setReasonDraft(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Headline strip — v2.5.22 layout fix: title + description stack on
          the left, headline % stays right-aligned but TOP-aligned with the
          title (was bottom-aligned with `items-end`, which left the big
          number floating awkwardly off the description's baseline). */}
      <Card className="p-0">
        <div className="p-5 flex items-start gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">
              {t("entity.frameworkTab.eyebrowFor", {
                framework: frameworkName,
              })}
            </div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ink-1">
              {t("entity.frameworkTab.titleFor", { framework: frameworkName })}
            </h2>
            <p className="text-ink-2 text-[12.5px] mt-1 max-w-xl">
              {t("entity.frameworkTab.subtitleFor", {
                framework: frameworkName,
                entity: tenantNameEn,
              })}
            </p>
          </div>
          <div className="flex items-baseline gap-2 shrink-0">
            <span
              className={`text-[44px] leading-none font-semibold tabular ${
                localPercent === null
                  ? "text-ink-3"
                  : localPercent >= fc.target
                    ? "text-pos"
                    : localPercent >= fc.target - 15
                      ? "text-warn"
                      : "text-neg"
              }`}
            >
              {localPercent === null ? "—" : fmt(Math.round(localPercent))}
            </span>
            {localPercent !== null ? (
              <span className="text-[16px] text-ink-3 tabular">%</span>
            ) : null}
          </div>
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat
            label={t("entity.frameworkTab.stat.clausesTotal")}
            value={fmt(fc.clausesTotal)}
          />
          <MiniStat
            label={t("entity.frameworkTab.stat.clausesScored")}
            value={`${fmt(fc.clausesScored)} / ${fmt(fc.clausesTotal)}`}
          />
          <MiniStat
            label={t("entity.frameworkTab.stat.clausesOos")}
            value={fmt(oosCount)}
            tone={oosCount > 0 ? "warn" : undefined}
          />
          <MiniStat
            label={t("entity.frameworkTab.stat.target")}
            value={`${fmt(fc.target)}%`}
          />
        </div>
        {error ? (
          <div className="px-5 pb-4">
            <div className="rounded-md border border-neg/40 bg-neg/10 px-3 py-2 text-[12px] text-neg">
              {error}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Per-clause table with OOS toggles */}
      <Card className="p-0">
        <div className="p-5">
          <CardHeader
            title={t("entity.frameworkTab.controls.title")}
            subtitle={t("entity.frameworkTab.controls.subtitle")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-3 text-[11px] uppercase tracking-[0.06em]">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("entity.frameworkBreakdown.col.clause")}
                </th>
                <th className="py-2.5 text-end font-semibold">
                  {t("entity.frameworkBreakdown.col.coverage")}
                </th>
                <th className="py-2.5 pe-5 text-end font-semibold">
                  {t("entity.frameworkTab.col.scope")}
                </th>
              </tr>
            </thead>
            <tbody>
              {fc.breakdown.map((r) => {
                const isGlobalOos = r.oosState === "global-oos";
                const isTenantOos = tenantOos.has(r.clauseId);
                const cov = r.coverage;
                const tone =
                  isGlobalOos || isTenantOos
                    ? "text-ink-3"
                    : cov === null
                      ? "text-ink-3"
                      : cov >= target
                        ? "text-pos"
                        : cov >= partialFloor
                          ? "text-warn"
                          : "text-neg";
                const rowDim =
                  isGlobalOos || isTenantOos ? "opacity-60" : "";
                return (
                  <tr
                    key={r.clauseId}
                    className={`border-t border-border align-top ${rowDim}`}
                  >
                    <td className="ps-5 py-3">
                      <div className="text-ink-1 font-medium">
                        {locale === "ar" ? r.titleAr : r.titleEn}
                      </div>
                      <div className="text-[11px] text-ink-3 mt-0.5 keep-ltr flex items-center gap-2 flex-wrap">
                        <span>{r.ref}</span>
                        {(r.classRefs ?? []).map((cls) => (
                          <span
                            key={cls}
                            className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-ink-2 border border-border rounded px-1.5 py-px"
                          >
                            {cls}
                          </span>
                        ))}
                        {isGlobalOos ? (
                          <span className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-warn border border-warn/40 bg-warn/10 rounded px-1.5 py-px">
                            {t("entity.frameworkTab.chip.globalOos")}
                          </span>
                        ) : null}
                        {isTenantOos ? (
                          <span className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-warn border border-warn/40 bg-warn/10 rounded px-1.5 py-px">
                            {t("entity.frameworkTab.chip.tenantOos")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 text-end">
                      <span className={`tabular font-semibold ${tone}`}>
                        {cov === null
                          ? "—"
                          : `${fmt(Math.round(cov * 100))}%`}
                      </span>
                      <div className="text-[10.5px] text-ink-3 mt-0.5">
                        {t("entity.frameworkBreakdown.samples", {
                          n: fmt(r.samples),
                        })}
                      </div>
                    </td>
                    <td className="pe-5 py-3 text-end">
                      {isGlobalOos ? (
                        <span className="text-[10.5px] text-ink-3">
                          {t("entity.frameworkTab.scope.globalLocked")}
                        </span>
                      ) : isTenantOos ? (
                        <button
                          onClick={() => toggleTenantOos(r.clauseId, null)}
                          disabled={busyId === r.clauseId}
                          className="inline-flex items-center gap-1 text-[11.5px] text-warn hover:text-warn/80 disabled:opacity-50"
                        >
                          {busyId === r.clauseId ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : null}
                          {t("entity.frameworkTab.scope.restore")}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setReasonDraft({
                              clauseId: r.clauseId,
                              reason: "",
                            })
                          }
                          disabled={busyId === r.clauseId}
                          className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink-1 disabled:opacity-50"
                        >
                          {t("entity.frameworkTab.scope.markOos")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reason capture for marking OOS — modal */}
      {reasonDraft ? (
        <Modal
          open
          onClose={() => setReasonDraft(null)}
          title={t("entity.frameworkTab.reason.title")}
        >
          <div className="text-[12.5px] text-ink-2 mb-3">
            {t("entity.frameworkTab.reason.body")}
          </div>
          <textarea
            value={reasonDraft.reason}
            onChange={(e) =>
              setReasonDraft({
                ...reasonDraft,
                reason: e.target.value.slice(0, 500),
              })
            }
            placeholder={t("entity.frameworkTab.reason.placeholder")}
            rows={4}
            className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-[12.5px] text-ink-1 outline-none focus:border-council-strong"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setReasonDraft(null)}
              className="h-8 px-3 rounded-md border border-border text-[12.5px] text-ink-2 hover:text-ink-1"
            >
              {t("entity.frameworkTab.reason.cancel")}
            </button>
            <button
              onClick={() =>
                toggleTenantOos(
                  reasonDraft.clauseId,
                  reasonDraft.reason.trim().length > 0
                    ? reasonDraft.reason.trim()
                    : null,
                )
              }
              disabled={busyId === reasonDraft.clauseId}
              className="h-8 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {t("entity.frameworkTab.reason.confirm")}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* Deployed-via-Directive recap */}
      <Card className="p-5">
        <CardHeader
          title={t("entity.frameworkTab.deployments.title")}
          subtitle={t("entity.frameworkTab.deployments.subtitle")}
        />
        {pushHistoryError ? (
          <div className="text-[12px] text-neg">{pushHistoryError}</div>
        ) : pushHistory.length === 0 ? (
          <div className="text-[12.5px] text-ink-3 py-2">
            {t("entity.frameworkTab.deployments.empty")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pushHistory.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="py-2.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[12.5px] text-ink-1 keep-ltr">
                    {p.baseline_id ?? `push #${p.push_request_id}`}
                  </div>
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    {fmtRelative(p.at)}
                    {p.error_message ? (
                      <span className="ms-2 text-neg">
                        {p.error_message}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`text-[10.5px] uppercase tracking-[0.06em] font-semibold rounded px-1.5 py-px shrink-0 ${
                    p.status === "success"
                      ? "border border-pos/40 bg-pos/10 text-pos"
                      : p.status === "simulated"
                        ? "border border-accent/40 bg-accent/10 text-accent"
                        : p.status === "rolledback"
                          ? "border border-border bg-surface-2 text-ink-3"
                          : "border border-neg/40 bg-neg/10 text-neg"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// FrameworkBreakdownPanel — per-clause coverage for the active
// regulatory framework. Sits below the headline cards. Operators
// answer "where is this entity failing ISR?" without leaving the
// overview. Filterable by class (Governance / Operation / Assurance)
// + by status (failing / partial / passing). Each row expands to
// show the Microsoft Secure Score evidence anchors + custom
// evidence anchors that contributed to the score.
// ────────────────────────────────────────────────────────────────────
function FrameworkBreakdownPanel({
  fc,
}: {
  fc: FrameworkComplianceDetail | undefined;
}) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [filterClass, setFilterClass] =
    useState<"" | "Governance" | "Operation" | "Assurance">("");
  const [filterStatus, setFilterStatus] = useState<
    "" | "failing" | "partial" | "passing" | "unscored"
  >("");

  if (!fc) {
    return null;
  }

  const target = fc.target / 100;
  const partialFloor = (fc.target - 20) / 100;

  // Same dynamic-name resolution as the headline card — the breakdown
  // panel title carries the framework name so it ties visually back
  // to the card it expands.
  const frameworkName = t(
    `branding.framework.${fc.frameworkId}` as DictKey,
  );

  const rows = fc.breakdown.filter((r) => {
    if (filterClass && !(r.classRefs ?? []).includes(filterClass)) return false;
    if (filterStatus === "unscored") return r.coverage === null;
    if (filterStatus === "passing") {
      return r.coverage !== null && r.coverage >= target;
    }
    if (filterStatus === "partial") {
      return (
        r.coverage !== null &&
        r.coverage >= partialFloor &&
        r.coverage < target
      );
    }
    if (filterStatus === "failing") {
      return r.coverage !== null && r.coverage < partialFloor;
    }
    return true;
  });

  // Class summary chips at the top so an operator scanning the panel
  // can see "Governance is fine, Assurance is weak" at a glance.
  const classBuckets: Array<{
    cls: "Governance" | "Operation" | "Assurance";
    avg: number | null;
    n: number;
  }> = (["Governance", "Operation", "Assurance"] as const).map((cls) => {
    const inCls = fc.breakdown.filter(
      (r) => (r.classRefs ?? []).includes(cls) && r.coverage !== null,
    );
    if (inCls.length === 0) return { cls, avg: null, n: 0 };
    const avg =
      inCls.reduce((a, b) => a + (b.coverage ?? 0), 0) / inCls.length;
    return { cls, avg, n: inCls.length };
  });

  return (
    <Card className="p-0">
      <div className="p-5 flex items-start justify-between gap-3 flex-wrap">
        <CardHeader
          title={t("entity.frameworkBreakdown.titleFor", {
            framework: frameworkName,
          })}
          subtitle={t("entity.frameworkBreakdown.subtitleFor", {
            framework: fc.frameworkVersion,
          })}
        />
        <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
          <span className="text-ink-3">
            {t("entity.frameworkBreakdown.filterBy")}
          </span>
          <select
            value={filterClass}
            onChange={(e) =>
              setFilterClass(
                e.target.value as
                  | ""
                  | "Governance"
                  | "Operation"
                  | "Assurance",
              )
            }
            className="h-7 px-2 rounded border border-border bg-surface-2 text-ink-1 text-[11.5px]"
          >
            <option value="">
              {t("entity.frameworkBreakdown.allClasses")}
            </option>
            <option value="Governance">Governance</option>
            <option value="Operation">Operation</option>
            <option value="Assurance">Assurance</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(
                e.target.value as
                  | ""
                  | "failing"
                  | "partial"
                  | "passing"
                  | "unscored",
              )
            }
            className="h-7 px-2 rounded border border-border bg-surface-2 text-ink-1 text-[11.5px]"
          >
            <option value="">
              {t("entity.frameworkBreakdown.allStatus")}
            </option>
            <option value="failing">
              {t("entity.frameworkBreakdown.statusFailing")}
            </option>
            <option value="partial">
              {t("entity.frameworkBreakdown.statusPartial")}
            </option>
            <option value="passing">
              {t("entity.frameworkBreakdown.statusPassing")}
            </option>
            <option value="unscored">
              {t("entity.frameworkBreakdown.statusUnscored")}
            </option>
          </select>
        </div>
      </div>

      {/* Class summary strip — three pills, one per ISR class.
          Communicates the macro story before the per-clause detail. */}
      <div className="px-5 pb-3 flex items-stretch gap-2 flex-wrap">
        {classBuckets.map((b) => {
          const tone =
            b.avg === null
              ? "border-border bg-surface-2 text-ink-3"
              : b.avg >= target
                ? "border-pos/40 bg-pos/10 text-pos"
                : b.avg >= partialFloor
                  ? "border-warn/40 bg-warn/10 text-warn"
                  : "border-neg/40 bg-neg/10 text-neg";
          return (
            <div
              key={b.cls}
              className={`flex-1 min-w-[120px] rounded-md border ${tone} px-3 py-2`}
            >
              <div className="text-[10.5px] uppercase tracking-[0.06em] font-semibold">
                {b.cls}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[20px] tabular font-semibold">
                  {b.avg === null ? "—" : `${fmt(Math.round(b.avg * 100))}%`}
                </span>
                <span className="text-[10.5px] opacity-70">
                  {t("entity.frameworkBreakdown.classClauseCount", {
                    n: fmt(b.n),
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-3 text-[11px] uppercase tracking-[0.06em]">
              <th className="py-2.5 ps-5 text-start font-semibold">
                {t("entity.frameworkBreakdown.col.clause")}
              </th>
              <th className="py-2.5 text-start font-semibold">
                {t("entity.frameworkBreakdown.col.class")}
              </th>
              <th className="py-2.5 text-end font-semibold">
                {t("entity.frameworkBreakdown.col.weight")}
              </th>
              <th className="py-2.5 text-end font-semibold">
                {t("entity.frameworkBreakdown.col.evidence")}
              </th>
              <th className="py-2.5 pe-5 font-semibold text-end">
                {t("entity.frameworkBreakdown.col.coverage")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-6 text-center text-[12px] text-ink-3"
                >
                  {t("entity.frameworkBreakdown.noRows")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const cov = r.coverage;
                const tone =
                  cov === null
                    ? "text-ink-3"
                    : cov >= target
                      ? "text-pos"
                      : cov >= partialFloor
                        ? "text-warn"
                        : "text-neg";
                return (
                  <tr
                    key={r.clauseId}
                    className="border-t border-border align-top"
                  >
                    <td className="ps-5 py-2.5">
                      <div className="text-ink-1 font-medium">
                        {locale === "ar" ? r.titleAr : r.titleEn}
                      </div>
                      <div className="text-[11px] text-ink-3 mt-0.5 keep-ltr">
                        {r.ref}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(r.classRefs ?? []).map((cls) => (
                          <span
                            key={cls}
                            className="text-[9.5px] uppercase tracking-[0.06em] font-semibold text-ink-2 border border-border rounded px-1.5 py-px keep-ltr"
                          >
                            {cls}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-end tabular">
                      {fmt(Math.round(r.weight * 10) / 10)}
                    </td>
                    <td className="py-2.5 text-end text-ink-2 text-[11px]">
                      <div className="keep-ltr">
                        {fmt(r.secureScoreControls.length)} M365
                        {r.customEvidenceCount > 0 ? (
                          <span className="ms-1 text-accent">
                            +{fmt(r.customEvidenceCount)} custom
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10.5px] text-ink-3">
                        {t("entity.frameworkBreakdown.samples", {
                          n: fmt(r.samples),
                        })}
                      </div>
                    </td>
                    <td className="pe-5 py-2.5 text-end">
                      <span className={`tabular font-semibold ${tone}`}>
                        {cov === null ? "—" : `${fmt(Math.round(cov * 100))}%`}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// FrameworkComplianceCard — primary metric, sits next to the Maturity
// Index. Shows the % alignment with the active framework (Dubai ISR
// for DESC, NESA for SCSC), with a target marker, a below/at/above
// indicator, and clauses-scored progress. Clicking the card scrolls
// to the breakdown panel below the row (separate component).
// ────────────────────────────────────────────────────────────────────
function FrameworkComplianceCard({
  fc,
}: {
  fc: FrameworkComplianceDetail | undefined;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();

  // No-data fallback — never happens on a fresh sync but covers tests
  // / brand-new deployments where the entity row has no signals yet.
  if (!fc) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader
          title={t("entity.frameworkCompliance.titleGeneric")}
          subtitle={t("entity.frameworkCompliance.subtitle")}
        />
        <div className="text-[12.5px] text-ink-3">
          {t("entity.frameworkCompliance.noData")}
        </div>
      </Card>
    );
  }

  // Resolve the framework's short name for the card title — the
  // dashboard becomes self-documenting per deployment ("Dubai ISR
  // compliance" instead of "Framework compliance").
  const frameworkName = t(
    `branding.framework.${fc.frameworkId}` as DictKey,
  );

  const pct = fc.percent ?? 0;
  const hasScore = fc.percent !== null;
  const aboveTarget = hasScore && pct >= fc.target;
  const tone = !hasScore
    ? "text-ink-3"
    : aboveTarget
      ? "text-pos"
      : pct >= fc.target - 15
        ? "text-warn"
        : "text-neg";
  const barTone = !hasScore
    ? "bg-surface-3"
    : aboveTarget
      ? "bg-pos"
      : pct >= fc.target - 15
        ? "bg-warn"
        : "bg-neg";

  return (
    <Card className="lg:col-span-1">
      <CardHeader
        title={t("entity.frameworkCompliance.titleFor", {
          framework: frameworkName,
        })}
        subtitle={
          <span>
            {t("entity.frameworkCompliance.subtitleFor", {
              framework: fc.frameworkVersion,
            })}
          </span>
        }
        right={
          <a
            href="#isr-breakdown"
            className="text-[11px] text-ink-3 hover:text-ink-1"
          >
            {t("entity.frameworkCompliance.viewBreakdown")} →
          </a>
        }
      />
      <div className="flex items-baseline gap-3">
        <span className={`text-[56px] leading-none font-semibold tabular ${tone}`}>
          {hasScore ? fmt(Math.round(pct)) : "—"}
        </span>
        {hasScore ? (
          <span className="text-[18px] text-ink-3 tabular">%</span>
        ) : null}
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full ${barTone}`}
          style={{ width: `${Math.min(100, hasScore ? pct : 0)}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3 tabular">
        <span>{fmt(0)}</span>
        <span>{t("entity.targetMarker", { target: fmt(fc.target) })}</span>
        <span>{fmt(100)}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <MiniStat
          label={t("entity.frameworkCompliance.clausesScored")}
          value={`${fmt(fc.clausesScored)} / ${fmt(fc.clausesTotal)}`}
        />
        <MiniStat
          label={t("entity.frameworkCompliance.unscoredClausesLabel")}
          value={fmt(Math.max(0, fc.clausesTotal - fc.clausesScored))}
          hint={
            fc.unscoredTreatment === "zero"
              ? t("entity.frameworkCompliance.treatmentZeroHint")
              : t("entity.frameworkCompliance.treatmentSkipHint")
          }
        />
      </div>
    </Card>
  );
}
