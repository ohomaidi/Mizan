"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Bug, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

type CveDrillResponse = {
  cveId: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  cvssScore: number | null;
  hasExploit: boolean;
  publishedDateTime: string | null;
  totalExposedDevices: number;
  totalRemediatedDevices: number;
  byEntity: Array<{
    entityId: string;
    entityName: string;
    exposedDevices: number;
    remediatedDevices: number;
    devices: Array<{
      deviceName: string;
      osPlatform: string | null;
      cveCount: number;
      critical: number;
      high: number;
      maxCvss: number | null;
    }>;
  }>;
};

type Rollup = Awaited<ReturnType<typeof api.getVulnerabilities>>;

type SeverityFilter = "all" | "Critical" | "High" | "Medium" | "Low";

export default function VulnerabilitiesPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<Rollup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("all");

  // CVE drill-down state — lazy-loaded per CVE. Cached so re-expanding
  // after collapse doesn't hit the endpoint twice.
  const [expandedCveId, setExpandedCveId] = useState<string | null>(null);
  const [cveCache, setCveCache] = useState<
    Record<string, CveDrillResponse | "loading" | { error: string }>
  >({});
  const toggleCve = (cveId: string) => {
    if (expandedCveId === cveId) {
      setExpandedCveId(null);
      return;
    }
    setExpandedCveId(cveId);
    if (cveCache[cveId]) return;
    setCveCache((prev) => ({ ...prev, [cveId]: "loading" }));
    fetch(`/api/signals/vulnerabilities/cve/${encodeURIComponent(cveId)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: CveDrillResponse) => {
        setCveCache((prev) => ({ ...prev, [cveId]: body }));
      })
      .catch((e) => {
        setCveCache((prev) => ({
          ...prev,
          [cveId]: { error: (e as Error).message },
        }));
      });
  };

  useEffect(() => {
    api.getVulnerabilities().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!data) return <Shell><LoadingState /></Shell>;

  const hasAnyData = data.totals.entitiesWithData > 0;

  // Pre-filter correlated + topOverall by severity.
  const correlated = sevFilter === "all"
    ? data.correlated
    : data.correlated.filter((c) => c.severity === sevFilter);
  const topOverall = sevFilter === "all"
    ? data.topOverall
    : data.topOverall.filter((c) => c.severity === sevFilter);

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div>
          <div className="eyebrow">
            <Bug size={11} className="inline -mt-0.5 me-1" />
            {t("vuln.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("vuln.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">{t("vuln.subtitle")}</p>
        </div>

        {!hasAnyData ? (
          <Card>
            <div className="text-[13px] text-ink-2">
              {t("vuln.empty.body")}
            </div>
          </Card>
        ) : (
          <>
            {/* Fleet-wide KPIs — exposed vs remediated side-by-side so the
                patching-progress ratio is immediately legible. */}
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
              <KpiTile
                label={t("vuln.kpi.totalCves")}
                value={fmt(data.totals.total)}
                accent={data.totals.total > 100 ? "warn" : "council"}
              />
              <KpiTile
                label={t("vuln.kpi.critical")}
                value={fmt(data.totals.critical)}
                accent={data.totals.critical > 0 ? "neg" : "council"}
              />
              <KpiTile
                label={t("vuln.kpi.high")}
                value={fmt(data.totals.high)}
                accent={data.totals.high > 0 ? "warn" : "council"}
              />
              <KpiTile
                label={t("vuln.kpi.exploitable")}
                value={fmt(data.totals.exploitable)}
                accent={data.totals.exploitable > 0 ? "neg" : "council"}
              />
              <KpiTile
                label={t("vuln.kpi.zeroDay")}
                value={fmt(data.totals.zeroDay)}
                accent={data.totals.zeroDay > 0 ? "neg" : "council"}
              />
              <KpiTile
                label={t("vuln.kpi.exposedDevices")}
                value={fmt(data.totals.affectedDevices)}
                accent="council"
              />
              <KpiTile
                label={t("vuln.kpi.remediatedDevices")}
                value={fmt(data.totals.remediatedDevices)}
                accent="council"
              />
            </div>

            {/* Severity filter pills for the cards below */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
                {t("vuln.severityFilter")}
              </span>
              {(["all", "Critical", "High", "Medium", "Low"] as SeverityFilter[]).map((s) => {
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cross-tenant correlated CVEs — unique to Council scope. */}
              <Card className="p-0 lg:col-span-2">
                <div className="p-5">
                  <CardHeader
                    title={t("vuln.correlated.title")}
                    subtitle={t("vuln.correlated.subtitle")}
                    right={
                      <div className="text-[12px] text-ink-2 tabular">
                        {t("vuln.correlated.summary", {
                          count: fmt(correlated.length),
                        })}
                      </div>
                    }
                  />
                </div>
                {correlated.length === 0 ? (
                  <div className="p-5 pt-0 text-[12.5px] text-ink-3">
                    {t("vuln.correlated.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                          <th className="py-2.5 ps-5 text-start font-semibold">{t("vuln.cols.cve")}</th>
                          <th className="py-2.5 text-start font-semibold">{t("vuln.cols.severity")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.cvss")}</th>
                          <th className="py-2.5 text-start font-semibold">{t("vuln.cols.exploit")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.correlated.entityCount")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.exposedDevices")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.remediatedDevices")}</th>
                          <th className="py-2.5 pe-5 text-start font-semibold">{t("vuln.correlated.affectedEntities")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correlated.map((c) => {
                          const expanded = expandedCveId === c.cveId;
                          const drill = cveCache[c.cveId] ?? null;
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
                                  <CveTagChips tags={c.tags} />
                                  {c.recommendedFix ? (
                                    <div className="text-[11px] text-ink-3 mt-0.5 max-w-[260px] truncate" title={c.recommendedFix}>
                                      {t("vuln.cols.fixPrefix")}: {c.recommendedFix}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="py-2.5">
                                  <SeverityBadge severity={c.severity} />
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
                                  <ExpandBtn
                                    expanded={expanded}
                                    onClick={() => toggleCve(c.cveId)}
                                    tone="ink"
                                  >
                                    {fmt(c.entityCount)}
                                  </ExpandBtn>
                                </td>
                                <td className="py-2.5 text-end tabular">
                                  <ExpandBtn
                                    expanded={expanded}
                                    onClick={() => toggleCve(c.cveId)}
                                    tone={
                                      c.severity === "Critical"
                                        ? "neg"
                                        : c.severity === "High"
                                          ? "warn"
                                          : "ink"
                                    }
                                  >
                                    {fmt(c.totalAffectedDevices)}
                                  </ExpandBtn>
                                </td>
                                <td className="py-2.5 text-end tabular text-pos font-semibold">
                                  {fmt(c.totalRemediatedDevices)}
                                </td>
                                <td className="py-2.5 pe-5 text-[12px]">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {c.entities.slice(0, 3).map((ent) => (
                                      <Link
                                        key={ent.id}
                                        href={`/entities/${ent.id}?tab=vulnerabilities&from=vulnerabilities`}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-ink-2 hover:text-ink-1 hover:bg-surface-3"
                                      >
                                        {ent.nameEn}
                                      </Link>
                                    ))}
                                    {c.entities.length > 3 ? (
                                      <span className="text-ink-3">
                                        +{fmt(c.entities.length - 3)}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                              {expanded ? (
                                <tr className="bg-surface-1">
                                  <td colSpan={8} className="ps-8 pe-5 py-3">
                                    <CveDrilldownPanel state={drill} />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Top overall CVEs */}
              <Card className="p-0 lg:col-span-2">
                <div className="p-5">
                  <CardHeader
                    title={t("vuln.topCves.title")}
                    subtitle={t("vuln.topCves.subtitle")}
                  />
                </div>
                {topOverall.length === 0 ? (
                  <div className="p-5 pt-0 text-[12.5px] text-ink-3">
                    {t("vuln.topCves.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                          <th className="py-2.5 ps-5 text-start font-semibold">{t("vuln.cols.cve")}</th>
                          <th className="py-2.5 text-start font-semibold">{t("vuln.cols.severity")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.cvss")}</th>
                          <th className="py-2.5 text-start font-semibold">{t("vuln.cols.exploit")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.exposedDevices")}</th>
                          <th className="py-2.5 text-end font-semibold">{t("vuln.cols.remediatedDevices")}</th>
                          <th className="py-2.5 pe-5 text-start font-semibold">{t("vuln.cols.published")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOverall.map((c) => {
                          const expanded = expandedCveId === c.cveId;
                          const drill = cveCache[c.cveId] ?? null;
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
                                  <CveTagChips tags={c.tags} />
                                  {c.recommendedFix ? (
                                    <div className="text-[11px] text-ink-3 mt-0.5 max-w-[260px] truncate" title={c.recommendedFix}>
                                      {t("vuln.cols.fixPrefix")}: {c.recommendedFix}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="py-2.5">
                                  <SeverityBadge severity={c.severity} />
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
                                  <ExpandBtn
                                    expanded={expanded}
                                    onClick={() => toggleCve(c.cveId)}
                                    tone={
                                      c.severity === "Critical"
                                        ? "neg"
                                        : c.severity === "High"
                                          ? "warn"
                                          : "ink"
                                    }
                                  >
                                    {fmt(c.totalAffectedDevices)}
                                  </ExpandBtn>
                                </td>
                                <td className="py-2.5 text-end tabular text-pos font-semibold">
                                  {fmt(c.totalRemediatedDevices)}
                                </td>
                                <td className="py-2.5 pe-5 text-ink-3 tabular keep-ltr text-[12px]">
                                  {c.publishedDateTime ? c.publishedDateTime.slice(0, 10) : "—"}
                                </td>
                              </tr>
                              {expanded ? (
                                <tr className="bg-surface-1">
                                  <td colSpan={7} className="ps-8 pe-5 py-3">
                                    <CveDrilldownPanel state={drill} />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* By entity table — kept at the bottom so the cross-tenant
                correlation (Council-unique view) stays above the fold. */}
            <Card className="p-0">
              <div className="p-5">
                <CardHeader
                  title={t("vuln.byEntity.title")}
                  subtitle={t("vuln.byEntity.subtitle")}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                      <th className="py-2.5 ps-5 text-start font-semibold">{t("cols.entity")}</th>
                      <th className="py-2.5 text-start font-semibold">{t("cols.cluster")}</th>
                      <th className="py-2.5 text-end font-semibold">{t("vuln.cols.total")}</th>
                      <th className="py-2.5 text-end font-semibold">{t("vuln.cols.critical")}</th>
                      <th className="py-2.5 text-end font-semibold">{t("vuln.cols.high")}</th>
                      <th className="py-2.5 text-end font-semibold">{t("vuln.cols.exploitable")}</th>
                      <th className="py-2.5 text-end font-semibold">{t("vuln.cols.exposedDevices")}</th>
                      <th className="py-2.5 pe-5 text-end font-semibold">{t("vuln.cols.remediatedDevices")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entities.map((e) => {
                      const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                      return (
                        <tr key={e.id} className="border-t border-border hover:bg-surface-3/40">
                          <td className="ps-5 py-2.5">
                            <Link
                              href={`/entities/${e.id}?tab=devices&from=vulnerabilities`}
                              className="text-ink-1 hover:text-council-strong"
                            >
                              {locale === "ar" ? e.nameAr : e.nameEn}
                            </Link>
                          </td>
                          <td className="py-2.5 text-ink-2">
                            {c ? (locale === "ar" ? c.labelAr : c.labelShort) : e.cluster}
                          </td>
                          <td className="py-2.5 text-end tabular">
                            {e.hasData ? fmt(e.total) : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="py-2.5 text-end tabular">
                            {e.critical > 0 ? (
                              <span className="text-neg font-semibold">{fmt(e.critical)}</span>
                            ) : e.hasData ? (
                              fmt(0)
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-end tabular">
                            {e.high > 0 ? (
                              <span className="text-warn font-semibold">{fmt(e.high)}</span>
                            ) : e.hasData ? (
                              fmt(0)
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-end tabular">
                            {e.exploitable > 0 ? (
                              <span className="text-neg font-semibold">{fmt(e.exploitable)}</span>
                            ) : e.hasData ? (
                              fmt(0)
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-end tabular">
                            {e.hasData ? fmt(e.affectedDevices) : <span className="text-ink-3">—</span>}
                          </td>
                          <td className="py-2.5 pe-5 text-end tabular">
                            {e.hasData && e.remediationTracked ? (
                              <span className="text-pos font-semibold">
                                {fmt(e.remediatedDevices)}
                              </span>
                            ) : (
                              <span
                                className="text-ink-3"
                                title={
                                  e.hasData
                                    ? "Not tracked — requires historical snapshot comparison"
                                    : undefined
                                }
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Renders Microsoft CveTags as small color-coded chips inline under the
 * CVE id. ZeroDay / Exploit-class tags get neg tone, NoSecurityUpdate
 * gets warn tone, the rest stay neutral. v2.5.32.
 */
function CveTagChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {tags.map((tag) => {
        const isZeroDay = /^zero.?day$/i.test(tag);
        const isExploit = /exploit/i.test(tag);
        const isNoFix = /nosecurityupdate/i.test(tag);
        const tone =
          isZeroDay || isExploit
            ? "bg-neg/15 text-neg"
            : isNoFix
              ? "bg-warn/15 text-warn"
              : "bg-surface-3 text-ink-2";
        return (
          <span
            key={tag}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.04em] ${tone}`}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
}) {
  const tone =
    severity === "Critical"
      ? "text-neg bg-neg/10 border-neg/40"
      : severity === "High"
        ? "text-warn bg-warn/10 border-warn/40"
        : severity === "Medium"
          ? "text-ink-2 bg-surface-3 border-border"
          : "text-ink-3 bg-surface-3 border-border";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] border ${tone}`}
    >
      {severity}
    </span>
  );
}

/**
 * Inline button that renders a count plus a chevron that rotates when expanded.
 * Used to turn "Entities" and "Exposed devices" table cells into drill-down
 * triggers without losing the numeric value.
 */
function ExpandBtn({
  expanded,
  onClick,
  tone,
  children,
}: {
  expanded: boolean;
  onClick: () => void;
  tone: "ink" | "neg" | "warn";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "neg"
      ? "text-neg font-semibold"
      : tone === "warn"
        ? "text-warn font-semibold"
        : "text-ink-1";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-3 transition-colors tabular ${toneCls}`}
      aria-expanded={expanded}
    >
      {children}
      <ChevronRight
        size={12}
        className={`text-ink-3 transition-transform ${
          expanded ? "rotate-90" : ""
        }`}
      />
    </button>
  );
}

/**
 * Per-CVE drill-down — renders the lazy-loaded endpoint response grouped by
 * entity, with one inner table of affected devices per entity. Handles
 * loading / error / empty states so the outer table row stays stable.
 */
function CveDrilldownPanel({
  state,
}: {
  state: CveDrillResponse | "loading" | { error: string } | null;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();

  if (state === null || state === "loading") {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-2 py-2">
        <Loader2 size={13} className="animate-spin" />
        {t("vuln.drill.loading")}
      </div>
    );
  }
  if ("error" in state) {
    return (
      <div className="text-[12.5px] text-neg py-2">
        {t("vuln.drill.error", { error: state.error })}
      </div>
    );
  }
  if (state.byEntity.length === 0) {
    return (
      <div className="text-[12.5px] text-ink-3 py-2">
        {t("vuln.drill.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-1">
      {state.byEntity.map((ent) => (
        <div key={ent.entityId} className="border border-border rounded-md overflow-hidden bg-surface-2">
          <div className="px-3 py-2 bg-surface-3 text-[12px] text-ink-1 font-semibold flex items-center justify-between gap-3">
            <Link
              href={`/entities/${ent.entityId}?tab=devices&from=vulnerabilities`}
              className="hover:text-council-strong"
            >
              {ent.entityName}
            </Link>
            <span className="text-ink-3 font-normal tabular">
              {fmt(ent.exposedDevices)} exposed
              {ent.remediatedDevices > 0
                ? ` · ${fmt(ent.remediatedDevices)} remediated`
                : ""}
            </span>
          </div>
          {ent.devices.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-ink-3">
              {t("vuln.drill.empty")}
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em] border-t border-border">
                  <th className="px-3 py-1.5 text-start font-semibold">
                    {t("vuln.drill.col.device")}
                  </th>
                  <th className="py-1.5 text-start font-semibold">
                    {t("vuln.drill.col.os")}
                  </th>
                  <th className="py-1.5 text-end font-semibold">
                    {t("vuln.drill.col.totalCves")}
                  </th>
                  <th className="py-1.5 text-end font-semibold">
                    {t("vuln.drill.col.critical")}
                  </th>
                  <th className="py-1.5 text-end font-semibold">
                    {t("vuln.drill.col.high")}
                  </th>
                  <th className="px-3 py-1.5 text-end font-semibold">
                    {t("vuln.drill.col.maxCvss")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ent.devices.map((d, i) => (
                  <tr
                    key={`${ent.entityId}-${d.deviceName}-${i}`}
                    className="border-t border-border"
                  >
                    <td className="px-3 py-1.5 text-ink-1 keep-ltr">
                      {d.deviceName}
                    </td>
                    <td className="py-1.5 text-ink-2">{d.osPlatform ?? "—"}</td>
                    <td className="py-1.5 text-end tabular text-ink-1">
                      {fmt(d.cveCount)}
                    </td>
                    <td className="py-1.5 text-end tabular">
                      {d.critical > 0 ? (
                        <span className="text-neg font-semibold">
                          {fmt(d.critical)}
                        </span>
                      ) : (
                        <span className="text-ink-3">0</span>
                      )}
                    </td>
                    <td className="py-1.5 text-end tabular">
                      {d.high > 0 ? (
                        <span className="text-warn font-semibold">
                          {fmt(d.high)}
                        </span>
                      ) : (
                        <span className="text-ink-3">0</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-end tabular keep-ltr">
                      {d.maxCvss != null ? d.maxCvss.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
