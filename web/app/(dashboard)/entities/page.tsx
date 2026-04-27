"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { HealthDot } from "@/components/ui/HealthDot";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { CLUSTERS, type ClusterId } from "@/lib/data/clusters";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { useFmtRelative } from "@/lib/i18n/time";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import type { EntityRow } from "@/lib/compute/aggregate";

type Params = { cluster?: string };
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; entities: EntityRow[] };

type SortKey =
  | "entity"
  | "cluster"
  | "maturity"
  | "frameworkCompliance"
  | "controls"
  | "incidents"
  | "riskyUsers"
  | "deviceCompl"
  | "connection"
  | "lastSync";

type SortDir = "asc" | "desc";

// Connection order for ranking by severity (worst first when desc).
const CONNECTION_RANK: Record<EntityRow["connection"], number> = {
  red: 0,
  amber: 1,
  pending: 2,
  green: 3,
};

export default function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = use(searchParams);
  const { t, locale } = useI18n();
  const fmtRelative = useFmtRelative();
  const fmt = useFmtNum();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("maturity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.getEntities();
        if (alive) setState({ kind: "ready", entities: r.entities });
      } catch (err) {
        if (alive) setState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const clusterFilter = (sp.cluster as ClusterId | undefined) ?? undefined;

  const rows = useMemo(() => {
    if (state.kind !== "ready") return [] as EntityRow[];
    const q = search.trim().toLowerCase();
    const byCluster = clusterFilter
      ? state.entities.filter((e) => e.cluster === clusterFilter)
      : state.entities;
    const bySearch = q
      ? byCluster.filter(
          (e) =>
            e.nameEn.toLowerCase().includes(q) ||
            e.nameAr.toLowerCase().includes(q) ||
            e.domain.toLowerCase().includes(q) ||
            e.ciso.toLowerCase().includes(q) ||
            e.cisoEmail.toLowerCase().includes(q),
        )
      : byCluster;
    return sortRows(bySearch, sortKey, sortDir, locale);
  }, [state, search, sortKey, sortDir, clusterFilter, locale]);

  if (state.kind === "loading") return <Shell><LoadingState /></Shell>;
  if (state.kind === "error") return <Shell><ErrorState message={state.message} /></Shell>;
  if (state.entities.length === 0) return <Shell><EmptyState /></Shell>;

  const clusterLabel = clusterFilter
    ? (locale === "ar"
        ? CLUSTERS.find((c) => c.id === clusterFilter)?.labelAr
        : CLUSTERS.find((c) => c.id === clusterFilter)?.label)
    : null;
  const filterSuffix = clusterLabel
    ? t("entities.filterSuffix", { cluster: clusterLabel })
    : "";
  const belowTarget = state.entities.filter(
    (e) => e.maturity.hasData && e.maturity.index < 75,
  ).length;

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default directions: numerical cols default desc, text cols default asc.
      setSortDir(
        key === "entity" || key === "cluster" || key === "connection" ? "asc" : "desc",
      );
    }
  };

  const onExportCsv = () => {
    const csv = buildCsv(rows, locale);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCsv(csv, `scsc-entities-${ts}.csv`);
  };

  const onCancelled = (id: string) => {
    setState((s) =>
      s.kind === "ready"
        ? { kind: "ready", entities: s.entities.filter((e) => e.id !== id) }
        : s,
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("entities.eyebrow")}</div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("entities.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
            {t("entities.subtitle", {
              shown: fmt(rows.length),
              total: fmt(state.entities.length),
              filterSuffix,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            {t("entities.exportCsv")}
          </button>
        </div>
      </div>

      <Card className="p-0">
        {/* Filter bar — wraps to multiple rows on narrow viewports.
            Search field stays full-width on mobile (flex-1, no max-w
            cap until lg+); cluster chips wrap to a new row underneath
            via the parent's flex-wrap; below-target counter wraps
            last so it doesn't fight for space. */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-2 h-9 sm:h-8 px-3 rounded-md bg-surface-1 border border-border text-ink-2 text-[12.5px] flex-1 lg:max-w-[320px] min-w-[200px]">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1 placeholder:text-ink-3 text-ink-1"
              placeholder={t("entities.search")}
            />
          </div>
          <div className="flex items-center gap-2 text-[12px] overflow-x-auto scroll-x w-full lg:w-auto">
            <ClusterChips active={clusterFilter} />
          </div>
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-2 text-ink-2 text-[12px] ms-auto lg:ms-0">
            <Filter size={13} />
            <span>
              {t("entities.belowTargetLabel")}&nbsp;
              <span className="text-neg font-semibold tabular">{fmt(belowTarget)}</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                <Th sortKey="entity" current={sortKey} dir={sortDir} onSort={onSort} className="ps-5">{t("cols.entity")}</Th>
                <Th sortKey="cluster" current={sortKey} dir={sortDir} onSort={onSort}>{t("cols.cluster")}</Th>
                <Th sortKey="maturity" current={sortKey} dir={sortDir} onSort={onSort} align="end">{t("cols.maturity")}</Th>
                {/* Framework column — hidden when no framework is
                    selected. Header uses the framework's short name
                    (e.g. "Dubai ISR") rather than the generic phrase
                    "Framework", so the column self-identifies. */}
                {rows.length > 0 &&
                rows[0].frameworkCompliance.frameworkId !== "generic" ? (
                  <Th
                    sortKey="frameworkCompliance"
                    current={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    align="end"
                  >
                    {t(
                      `branding.framework.${rows[0].frameworkCompliance.frameworkId}` as DictKey,
                    )}
                  </Th>
                ) : null}
                <Th sortKey="controls" current={sortKey} dir={sortDir} onSort={onSort} align="end">{t("cols.controls")}</Th>
                <Th sortKey="incidents" current={sortKey} dir={sortDir} onSort={onSort} align="end">{t("cols.incidents")}</Th>
                <Th sortKey="riskyUsers" current={sortKey} dir={sortDir} onSort={onSort} align="end">{t("cols.riskyUsers")}</Th>
                <Th sortKey="deviceCompl" current={sortKey} dir={sortDir} onSort={onSort} align="end">{t("cols.deviceCompl")}</Th>
                <Th sortKey="connection" current={sortKey} dir={sortDir} onSort={onSort}>{t("cols.connection")}</Th>
                <Th sortKey="lastSync" current={sortKey} dir={sortDir} onSort={onSort} className="pe-5">{t("cols.lastSync")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-ink-3">
                    {t("entities.noMatches")}
                  </td>
                </tr>
              ) : (
                rows.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border hover:bg-surface-3/40 transition-colors align-top"
                  >
                    <td className="ps-5 py-3 align-top">
                      <Link
                        href={`/entities/${e.id}`}
                        className="block text-ink-1 hover:text-council-strong"
                      >
                        <div className="font-medium leading-tight inline-flex items-center gap-2 flex-wrap">
                          <span>{locale === "ar" ? e.nameAr : e.nameEn}</span>
                          {e.isDemo ? (
                            <span className="text-[9.5px] uppercase tracking-[0.08em] border border-accent/50 text-accent rounded px-1.5 py-px font-semibold">
                              {t("demo.badge")}
                            </span>
                          ) : null}
                          {e.consentMode === "directive" ? (
                            <span className="text-[9.5px] uppercase tracking-[0.08em] border border-council-strong/60 text-council-strong rounded px-1.5 py-px font-semibold">
                              {t("mode.directive")}
                            </span>
                          ) : null}
                        </div>
                        {/* Secondary-script name. Suppressed when EN and AR
                            collapse to the same string (test tenants and
                            English-named real entities) — otherwise it
                            renders as a confusing duplicate that visually
                            collides with the next column's content. */}
                        {e.nameEn !== e.nameAr ? (
                          <div
                            className="text-[11.5px] text-ink-3 leading-tight mt-0.5"
                            dir={locale === "ar" ? "ltr" : "rtl"}
                          >
                            {locale === "ar" ? e.nameEn : e.nameAr}
                          </div>
                        ) : null}
                        <div className="text-[11px] text-ink-3 tabular keep-ltr mt-0.5">
                          {e.domain}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 align-top">
                      <span className="inline-flex text-[11px] uppercase tracking-[0.06em] text-ink-2 border border-border rounded px-1.5 py-0.5">
                        {(() => {
                          const c = CLUSTERS.find((c) => c.id === e.cluster);
                          return locale === "ar" ? c?.labelAr : c?.labelShort;
                        })()}
                      </span>
                    </td>
                    <td className="py-3 text-end pe-2 align-top">
                      <MaturityCell value={e.maturity.index} hasData={e.maturity.hasData} />
                    </td>
                    {/* Framework column — same gate as the header. */}
                    {e.frameworkCompliance.frameworkId !== "generic" ? (
                      <td className="py-3 text-end tabular align-top">
                        {e.frameworkCompliance.percent !== null ? (
                          <span
                            className={
                              e.frameworkCompliance.percent >= 70
                                ? "text-pos font-semibold"
                                : e.frameworkCompliance.percent >= 50
                                  ? "text-warn font-semibold"
                                  : "text-neg font-semibold"
                            }
                          >
                            {fmt(e.frameworkCompliance.percent)}%
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="py-3 text-end tabular align-top">
                      {e.maturity.hasData ? `${fmt(e.maturity.controlsPassingPct)}%` : "—"}
                    </td>
                    <td className="py-3 text-end tabular align-top">
                      {e.maturity.hasData ? fmt(e.maturity.openIncidents) : "—"}
                    </td>
                    <td className="py-3 text-end tabular align-top">
                      {e.maturity.hasData ? fmt(e.maturity.riskyUsers) : "—"}
                    </td>
                    <td className="py-3 text-end tabular align-top">
                      {e.maturity.hasData ? `${fmt(e.maturity.deviceCompliancePct)}%` : "—"}
                    </td>
                    <td className="py-3 align-top">
                      {e.consentStatus === "pending" ? (
                        <PendingActions
                          tenantId={e.id}
                          onCancelled={() => onCancelled(e.id)}
                        />
                      ) : e.connection === "pending" ? (
                        <span className="text-[11.5px] text-ink-3">
                          {t("consent.status.pending")}
                        </span>
                      ) : (
                        <HealthDot status={e.connection} showLabel />
                      )}
                    </td>
                    <td className="py-3 pe-5 text-ink-3 tabular align-top">
                      {e.lastSyncAt ? fmtRelative(e.lastSyncAt) : t("sync.never")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function sortRows(
  rows: EntityRow[],
  key: SortKey,
  dir: SortDir,
  locale: "en" | "ar",
): EntityRow[] {
  const mul = dir === "asc" ? 1 : -1;
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  // Rows without data land at the bottom regardless of sort direction, for numeric cols.
  const push = (a: EntityRow, b: EntityRow, extractor: (r: EntityRow) => number | null) => {
    const va = extractor(a);
    const vb = extractor(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * mul;
  };
  return [...rows].sort((a, b) => {
    switch (key) {
      case "entity": {
        const av = locale === "ar" ? a.nameAr : a.nameEn;
        const bv = locale === "ar" ? b.nameAr : b.nameEn;
        return collator.compare(av, bv) * mul;
      }
      case "cluster":
        return collator.compare(a.cluster, b.cluster) * mul;
      case "connection":
        return (CONNECTION_RANK[a.connection] - CONNECTION_RANK[b.connection]) * mul;
      case "maturity":
        return push(a, b, (r) => (r.maturity.hasData ? r.maturity.index : null));
      case "frameworkCompliance":
        return push(a, b, (r) => r.frameworkCompliance.percent);
      case "controls":
        return push(a, b, (r) => (r.maturity.hasData ? r.maturity.controlsPassingPct : null));
      case "incidents":
        return push(a, b, (r) => (r.maturity.hasData ? r.maturity.openIncidents : null));
      case "riskyUsers":
        return push(a, b, (r) => (r.maturity.hasData ? r.maturity.riskyUsers : null));
      case "deviceCompl":
        return push(a, b, (r) => (r.maturity.hasData ? r.maturity.deviceCompliancePct : null));
      case "lastSync":
        return push(a, b, (r) => (r.lastSyncAt ? Date.parse(r.lastSyncAt) : null));
    }
  });
}

function buildCsv(rows: EntityRow[], locale: "en" | "ar"): string {
  const header = [
    "id",
    "tenant_id",
    "name_en",
    "name_ar",
    "cluster",
    "domain",
    "ciso",
    "ciso_email",
    "consent_status",
    "is_demo",
    "connection",
    "maturity_index",
    "controls_passing_pct",
    "open_incidents",
    "risky_users",
    "device_compliance_pct",
    "last_sync_at",
    "last_sync_ok",
  ];
  const esc = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    // Always quote — simpler and locale-safe. Escape embedded quotes.
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const m = r.maturity;
    lines.push(
      [
        r.id,
        r.tenantId,
        r.nameEn,
        r.nameAr,
        r.cluster,
        r.domain,
        r.ciso,
        r.cisoEmail,
        r.consentStatus,
        r.isDemo ? 1 : 0,
        r.connection,
        m.hasData ? m.index.toFixed(1) : "",
        m.hasData ? m.controlsPassingPct : "",
        m.hasData ? m.openIncidents : "",
        m.hasData ? m.riskyUsers : "",
        m.hasData ? m.deviceCompliancePct : "",
        r.lastSyncAt ?? "",
        r.lastSyncOk ? 1 : 0,
      ].map(esc).join(","),
    );
  }
  // BOM so Excel opens UTF-8 with Arabic correctly in both locales.
  void locale;
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("entities.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("entities.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}

function Th({
  children,
  align = "start",
  sortKey,
  current,
  dir,
  onSort,
  className = "",
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === current;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`py-2.5 font-semibold ${align === "end" ? "text-end" : "text-start"} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] ${
          isActive ? "text-ink-1" : "text-ink-3 hover:text-ink-2"
        }`}
      >
        {children}
        <Icon size={11} />
      </button>
    </th>
  );
}

function MaturityCell({ value, hasData }: { value: number; hasData: boolean }) {
  const fmt = useFmtNum();
  if (!hasData) return <span className="text-ink-3">—</span>;
  const pct = Math.min(100, value);
  const target = 75;
  const color =
    value >= target
      ? "bg-council-strong"
      : value >= target - 10
        ? "bg-warn"
        : "bg-neg";
  return (
    <div className="inline-flex items-center gap-2 min-w-[120px] justify-end">
      <div className="h-1.5 w-16 rounded-full bg-surface-3 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-ink-1 font-semibold tabular w-12 text-end">
        {fmt(Math.round(value))}
        <span className="text-ink-3 text-[10px] ms-0.5">%</span>
      </span>
    </div>
  );
}

function PendingActions({
  tenantId,
  onCancelled,
}: {
  tenantId: string;
  onCancelled: () => void;
}) {
  const { t } = useI18n();
  const [copyState, setCopyState] = useState<
    "idle" | "loading" | "copied" | "unavailable"
  >("idle");
  const [cancelling, setCancelling] = useState(false);

  const onCopy = async () => {
    setCopyState("loading");
    try {
      const r = await api.getConsentUrl(tenantId);
      if (!r.consentUrl) {
        setCopyState("unavailable");
        setTimeout(() => setCopyState("idle"), 2500);
        return;
      }
      await navigator.clipboard.writeText(r.consentUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("unavailable");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const onCancel = async () => {
    if (!window.confirm(t("entities.pending.cancelConfirm"))) return;
    setCancelling(true);
    try {
      await api.deleteTenant(tenantId);
      onCancelled();
    } catch {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 items-start">
      <span className="text-[11px] uppercase tracking-[0.06em] text-warn">
        {t("consent.status.pending")}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCopy}
          disabled={copyState === "loading"}
          title={
            copyState === "unavailable"
              ? t("entities.pending.linkUnavailable")
              : t("entities.pending.copyLink")
          }
          className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11px] disabled:opacity-50"
        >
          {copyState === "loading" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : copyState === "copied" ? (
            <Check size={11} className="text-pos" />
          ) : (
            <Copy size={11} />
          )}
          {copyState === "copied"
            ? t("entities.pending.copied")
            : t("entities.pending.copyLink")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          title={t("entities.pending.cancel")}
          className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border bg-surface-2 text-ink-3 hover:text-neg hover:border-neg/40 text-[11px] disabled:opacity-50"
        >
          {cancelling ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
          {t("entities.pending.cancel")}
        </button>
      </div>
    </div>
  );
}

function ClusterChips({ active }: { active?: ClusterId }) {
  const { t, locale } = useI18n();
  return (
    // shrink-0 on each chip so the parent flex (which is wrapped in
    // overflow-x-auto on mobile) renders chips in a single horizontally
    // scrollable row rather than wrapping mid-flow. Each chip stays at
    // its natural width.
    <div className="flex items-center gap-1">
      <Link
        href="/entities"
        className={`h-8 sm:h-7 px-2.5 text-[11.5px] rounded-md border transition-colors shrink-0 inline-flex items-center ${!active ? "bg-surface-3 text-ink-1 border-border-strong" : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"}`}
      >
        {t("cols.all")}
      </Link>
      {CLUSTERS.map((c) => (
        <Link
          key={c.id}
          href={`/entities?cluster=${c.id}`}
          className={`h-8 sm:h-7 px-2.5 text-[11.5px] rounded-md border transition-colors inline-flex items-center shrink-0 ${
            active === c.id
              ? "bg-surface-3 text-ink-1 border-border-strong"
              : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
          }`}
        >
          {locale === "ar" ? c.labelAr : c.labelShort}
        </Link>
      ))}
    </div>
  );
}
