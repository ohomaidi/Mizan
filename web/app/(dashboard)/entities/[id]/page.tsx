"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  CalendarClock,
  Ban,
  Play,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
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
  ConditionalAccessPayload,
  DevicesPayload,
  IncidentsPayload,
  RiskyUsersPayload,
  SecureScorePayload,
} from "@/lib/graph/signals";

type Signals = {
  secureScore: { payload: SecureScorePayload } | null;
  conditionalAccess: { payload: ConditionalAccessPayload } | null;
  riskyUsers: { payload: RiskyUsersPayload } | null;
  devices: { payload: DevicesPayload } | null;
  incidents: { payload: IncidentsPayload } | null;
};

type EndpointHealth = {
  endpoint: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  call_count_24h: number;
  throttle_count_24h: number;
};

type Detail = {
  tenant: TenantRow;
  maturity: MaturityBreakdown;
  signals: Signals;
  health: EndpointHealth[];
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing" }
  | { kind: "ready"; detail: Detail };

type SubTab = "overview" | "controls" | "incidents" | "identity" | "data" | "devices" | "governance" | "connection";

export default function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const fmtRelative = useFmtRelative();
  const fmt = useFmtNum();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<SubTab>("overview");
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

  const { tenant, maturity, signals, health } = state.detail;
  const cluster = CLUSTERS.find((c) => c.id === tenant.cluster);
  const clusterLabel = cluster ? (locale === "ar" ? cluster.labelAr : cluster.label) : tenant.cluster;

  const SUB_TABS: Array<{ id: SubTab; labelKey: DictKey }> = [
    { id: "overview", labelKey: "tab.overview" },
    { id: "controls", labelKey: "tab.controls" },
    { id: "incidents", labelKey: "tab.incidents" },
    { id: "identity", labelKey: "tab.identity" },
    { id: "data", labelKey: "tab.data" },
    { id: "devices", labelKey: "tab.devices" },
    { id: "governance", labelKey: "tab.governance" },
    { id: "connection", labelKey: "tab.connection" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/entities"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink-1"
        >
          <ArrowLeft size={13} className="rtl:rotate-180" /> {t("entity.backToAll")}
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
          <h1 className="mt-2 text-[26px] font-semibold text-ink-1 tracking-tight leading-tight">
            {locale === "ar" ? tenant.name_ar : tenant.name_en}
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
              {t(sub.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" ? (
        <OverviewTab maturity={maturity} clusterIndex={cluster?.index ?? 0} />
      ) : null}
      {tab === "controls" ? <ControlsTab payload={signals.secureScore?.payload ?? null} /> : null}
      {tab === "incidents" ? <IncidentsTab payload={signals.incidents?.payload ?? null} /> : null}
      {tab === "identity" ? <IdentityTab payload={signals.riskyUsers?.payload ?? null} /> : null}
      {tab === "devices" ? <DevicesTab payload={signals.devices?.payload ?? null} /> : null}
      {tab === "connection" ? <ConnectionTab health={health} /> : null}
      {tab === "data" || tab === "governance" ? (
        <Card>
          <CardHeader title={t("subtabs.more.title")} subtitle={t("subtabs.more.subtitle")} />
          <div className="text-[12.5px] text-ink-3">{t("subtabs.more.body")}</div>
        </Card>
      ) : null}
    </div>
  );

  function OverviewTab({
    maturity,
    clusterIndex,
  }: {
    maturity: MaturityBreakdown;
    clusterIndex: number;
  }) {
    const target = 75;
    const subScores = [
      { key: "subscores.identity" as const, value: maturity.subScores.identity },
      { key: "subscores.device" as const, value: maturity.subScores.device },
      { key: "subscores.data" as const, value: maturity.subScores.data },
      { key: "subscores.threatResponse" as const, value: maturity.subScores.threat },
      { key: "subscores.compliance" as const, value: maturity.subScores.compliance },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader
            title={t("entity.maturityTitle")}
            subtitle={t("entity.maturitySubtitle", { target: fmt(target) })}
          />
          <div className="flex items-baseline gap-3">
            <span className="text-[56px] leading-none font-semibold tabular">
              {fmt(Math.round(maturity.index))}
            </span>
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

        <Card className="lg:col-span-2">
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
      </div>
    );
  }

  function ControlsTab({ payload }: { payload: SecureScorePayload | null }) {
    if (!payload || payload.controls.length === 0) {
      return (
        <Card>
          <div className="text-ink-3 text-[13px]">{t("sync.never")}</div>
        </Card>
      );
    }

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

    const totals = { passed: 0, partial: 0, failed: 0, unknown: 0 };
    for (const c of payload.controls) totals[classify(c)]++;

    // Sort: failed first, then partial, then unknown, then passed. Within group,
    // sort by category ascending then control id.
    const rank = { failed: 0, partial: 1, unknown: 2, passed: 3 } as const;
    const rows = [...payload.controls].sort((a, b) => {
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "41%" }} />
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
                <th className="py-2.5 pe-5 text-start font-semibold">
                  {t("tab.controls.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
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
                return (
                  <tr
                    key={c.id}
                    className="border-t border-border align-top hover:bg-surface-3/40"
                  >
                    <td className="ps-5 py-3 text-ink-1 align-top">
                      <div className="font-medium leading-snug">
                        {displayTitle}
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
                    <td className="py-3 pe-5 align-top">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function IncidentsTab({ payload }: { payload: IncidentsPayload | null }) {
    if (!payload) return <Card><div className="text-ink-3 text-[13px]">{t("sync.never")}</div></Card>;
    return (
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
                <tr key={i.id} className="border-t border-border">
                  <td className="ps-5 py-2.5 text-ink-1">{i.displayName}</td>
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
    );
  }

  function IdentityTab({ payload }: { payload: RiskyUsersPayload | null }) {
    if (!payload) return <Card><div className="text-ink-3 text-[13px]">{t("sync.never")}</div></Card>;
    return (
      <Card className="p-0">
        <div className="p-5">
          <CardHeader
            title={t("tab.identity.title")}
            subtitle={t("tab.identity.subtitle")}
            right={
              <div className="text-[12px] text-ink-2 tabular">
                {t("tab.identity.summary", {
                  atRisk: fmt(payload.atRisk),
                  total: fmt(payload.total),
                })}
              </div>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("tab.identity.col.user")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.identity.col.level")}</th>
                <th className="py-2.5 text-start font-semibold">{t("tab.identity.col.state")}</th>
                <th className="py-2.5 pe-5 text-start font-semibold">{t("tab.identity.col.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {payload.users.slice(0, 100).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="ps-5 py-2.5">
                    <div className="text-ink-1">{u.displayName ?? u.userPrincipalName}</div>
                    <div className="text-[11.5px] text-ink-3 keep-ltr">{u.userPrincipalName}</div>
                  </td>
                  <td className="py-2.5"><RiskChip level={u.riskLevel} /></td>
                  <td className="py-2.5"><RiskStateChip state={u.riskState} /></td>
                  <td className="py-2.5 pe-5 text-ink-3 tabular">{fmtRelative(u.riskLastUpdatedDateTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function DevicesTab({ payload }: { payload: DevicesPayload | null }) {
    if (!payload) return <Card><div className="text-ink-3 text-[13px]">{t("sync.never")}</div></Card>;
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
                <th className="py-2.5 pe-5 text-start font-semibold">{t("tab.devices.col.lastSync")}</th>
              </tr>
            </thead>
            <tbody>
              {payload.devices.slice(0, 100).map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="ps-5 py-2.5 text-ink-1 keep-ltr">{d.deviceName}</td>
                  <td className="py-2.5 text-ink-2">{d.operatingSystem}{d.osVersion ? ` · ${d.osVersion}` : ""}</td>
                  <td className="py-2.5 text-ink-3 keep-ltr">{d.userPrincipalName ?? "—"}</td>
                  <td className="py-2.5"><ComplianceChip state={d.complianceState} /></td>
                  <td className="py-2.5">
                    {d.isEncrypted === true ? <span className="text-pos">✓</span> : d.isEncrypted === false ? <span className="text-neg">✗</span> : <span className="text-ink-3">—</span>}
                  </td>
                  <td className="py-2.5 pe-5 text-ink-3 tabular">
                    {d.lastSyncDateTime ? fmtRelative(d.lastSyncDateTime) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
}: {
  label: string;
  value: React.ReactNode;
  tone: "pos" | "warn" | "neg";
}) {
  const c = tone === "pos" ? "text-pos" : tone === "warn" ? "text-warn" : "text-neg";
  return (
    <div className="rounded-md border border-border bg-surface-1 py-2.5">
      <div className={`text-[20px] font-semibold tabular ${c}`}>{value}</div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mt-0.5">
        {label}
      </div>
    </div>
  );
}
