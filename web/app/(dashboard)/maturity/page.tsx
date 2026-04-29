"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { KpiTile } from "@/components/ui/KpiTile";
import { TimeRangePills, type Range } from "@/components/ui/TimeRangePills";
import { Card, CardHeader } from "@/components/ui/Card";
import { EntityBarChart } from "@/components/charts/EntityBarChart";
import { MaturityRadar, type MaturityRadarSeries } from "@/components/charts/MaturityRadar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { CLUSTERS } from "@/lib/data/clusters";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { useFmtNum, useFmtDelta } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import type { ClusterSummary, CouncilKpis, EntityRow } from "@/lib/compute/aggregate";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; kpis: CouncilKpis; clusters: ClusterSummary[]; entities: EntityRow[] };

export default function MaturityPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const fmtD = useFmtDelta();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [range, setRange] = useState<Range>("7D");
  // v2.6.0 — Posture overview branches on deploymentKind. In Council
  // mode this is the multi-tenant landing page (bar chart of all
  // entities, cluster radar, movers list). In Executive mode the
  // entity-detail page is the home (see app/page.tsx redirect); this
  // page should only be reached in Executive mode if the operator
  // navigates here directly, in which case we collapse the Council-
  // only chrome and show a single-tenant view.
  const [isExecutive, setIsExecutive] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [k, e, who] = await Promise.all([
          api.getKpis(),
          api.getEntities(),
          api.whoami().catch(() => null),
        ]);
        if (!alive) return;
        setState({ kind: "ready", kpis: k.kpis, clusters: k.clusters, entities: e.entities });
        if (who && (who as { deploymentKind?: string }).deploymentKind === "executive") {
          setIsExecutive(true);
        }
      } catch (err) {
        if (!alive) return;
        setState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "loading") return <PageShell loading />;
  if (state.kind === "error") return <PageShell error={state.message} />;

  const { kpis, entities } = state;
  const hasConsented = kpis.entitiesConsented > 0;

  if (!hasConsented) return <PageShell empty />;

  // Biggest movers over the last 7 days — sorted by the absolute magnitude of Δ7d so
  // dramatic drops AND dramatic gains both surface. Sign decides color + arrow direction.
  const movers = [...entities]
    .filter((e) => e.maturity.hasData && e.delta7d != null)
    .sort((a, b) => Math.abs(b.delta7d ?? 0) - Math.abs(a.delta7d ?? 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{t("maturity.eyebrow")}</div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("maturity.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
            {t("maturity.subtitle", { count: fmt(kpis.entitiesConsented) })}
          </p>
          <Link
            href="/faq#howCalculated"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-council-strong hover:underline"
          >
            <HelpCircle size={12} /> {t("maturity.howCalculated")}
          </Link>
        </div>
        <TimeRangePills value={range} onChange={setRange} />
      </div>

      {(() => {
        // Hide the Framework Compliance KPI tile when no framework is
        // active (branding.frameworkId === "generic"). When hidden,
        // collapse the grid back to 4 cols so the remaining tiles fill.
        const hideFw = kpis.frameworkCompliance.frameworkId === "generic";
        // Resolve the active framework's short name (e.g. "Dubai ISR",
        // "UAE NESA") so the KPI tile label is the regulation itself
        // rather than the generic phrase "Framework compliance". The
        // dashboard becomes self-documenting per deployment.
        const fwLabel = t(
          `branding.framework.${kpis.frameworkCompliance.frameworkId}` as DictKey,
        );
        return (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              hideFw ? "lg:grid-cols-4" : "lg:grid-cols-5"
            } gap-4`}
          >
            <KpiTile
              label={t("kpi.maturityIndex")}
              value={fmt(kpis.maturityIndex)}
              suffix="%"
              accent="council"
              delta={deltaForRange(kpis, range) ?? undefined}
              deltaSuffix={captionForRange(range, t)}
            />
            {/* Framework Compliance — separate primary KPI alongside
                the Maturity Index. Hidden entirely when no framework
                is selected. The Council answers two questions in this
                row when active: "how protected are entities?" + "how
                aligned are they with our framework?". */}
            {!hideFw ? (
              <KpiTile
                label={fwLabel}
                value={fmt(kpis.frameworkCompliance.percent)}
                suffix="%"
                accent={
                  kpis.frameworkCompliance.percent <
                  kpis.frameworkCompliance.target
                    ? "warn"
                    : "council"
                }
              />
            ) : null}
            <KpiTile
              label={t("kpi.entities")}
              value={fmt(kpis.entitiesCount)}
            />
            <KpiTile
              label={t("kpi.belowTarget")}
              value={fmt(kpis.belowTargetCount)}
              accent={kpis.belowTargetCount > 10 ? "warn" : "default"}
            />
            <KpiTile
              label={t("kpi.controlsPassing")}
              value={fmt(kpis.controlsPassingPct)}
              suffix="%"
            />
          </div>
        );
      })()}

      {/*
       * Cross-entity bar chart — Council-only. In Executive mode (N=1)
       * a horizontal-bar comparison degenerates to a single bar, so
       * we hide it and let the cluster radar + the entity-detail
       * radar do the heavy lifting.
       */}
      {!isExecutive ? (
        <Card>
          <CardHeader
            title={t("chart.entities.title")}
            subtitle={t("chart.entities.subtitle", { target: fmt(kpis.target) })}
            right={
              <div className="flex items-center gap-4 text-[12px] text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-council-strong" />
                  {t("chart.legend.current")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[2px] w-4 bg-accent" />
                  {t("chart.legend.target")}
                </span>
              </div>
            }
          />
          <EntityBarChart entities={entities} target={kpis.target} />
        </Card>
      ) : null}

      {/* v2.5.34 — Cluster-level radar of the 6 Maturity sub-scores. Shows
          where each cluster is strong vs. weak across every dimension that
          drives the Maturity Index, with the Council target as a dashed
          reference. Only renders if at least one cluster has data. v2.6.0:
          hidden in Executive mode (no clusters when N=1). */}
      {!isExecutive ? (() => {
        const series: MaturityRadarSeries[] = state.clusters
          .map((c) => {
            const cohort = entities.filter(
              (e) => e.cluster === c.id && e.maturity.hasData,
            );
            if (cohort.length === 0) return null;
            const mean = (k: keyof EntityRow["maturity"]["subScores"]) =>
              Math.round(
                cohort.reduce((n, e) => n + e.maturity.subScores[k], 0) /
                  cohort.length,
              );
            const cluster = CLUSTERS.find((cl) => cl.id === c.id);
            return {
              name:
                locale === "ar"
                  ? cluster?.labelAr ?? c.id
                  : cluster?.label ?? c.id,
              scores: {
                secureScore: mean("secureScore"),
                identity: mean("identity"),
                device: mean("device"),
                data: mean("data"),
                threat: mean("threat"),
                compliance: mean("compliance"),
              },
            };
          })
          .filter((s): s is MaturityRadarSeries => s !== null);
        // Always overlay the council target as a dashed reference.
        series.push({
          name: t("radar.councilTarget"),
          scores: {
            secureScore: kpis.target,
            identity: kpis.target,
            device: kpis.target,
            data: kpis.target,
            threat: kpis.target,
            compliance: kpis.target,
          },
          color: "var(--accent, #f59e0b)",
          dashed: true,
        });
        if (series.length <= 1) return null; // only target, nothing to chart
        return (
          <Card>
            <CardHeader
              title={t("radar.councilOverview.title")}
              subtitle={t("radar.councilOverview.subtitle", {
                target: fmt(kpis.target),
              })}
            />
            <MaturityRadar series={series} height={360} />
          </Card>
        );
      })() : null}

      {/* v2.6.0 — Movers panel + Drag-down panel are Council-only.
          Single-org operators don't have peers to rank against. */}
      {!isExecutive ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title={t("maturity.movers.title")}
            subtitle={t("maturity.movers.subtitle")}
          />
          {movers.length === 0 ? (
            <div className="text-ink-3 text-[12.5px] py-4">
              {t("maturity.movers.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {movers.map((m) => {
                const cluster = CLUSTERS.find((c) => c.id === m.cluster);
                const delta = m.delta7d ?? 0;
                const up = delta >= 0;
                return (
                  <li
                    key={m.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] text-ink-1 truncate">
                        {locale === "ar" ? m.nameAr : m.nameEn}
                      </div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">
                        {cluster
                          ? locale === "ar"
                            ? cluster.labelAr
                            : cluster.label
                          : m.cluster}
                        <span className="text-ink-3/80 keep-ltr">
                          {" "}· {fmt(m.maturity.index)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-[14px] tabular font-semibold shrink-0 ${
                        up ? "text-pos" : "text-neg"
                      }`}
                    >
                      {fmtD(delta)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader
            title={t("maturity.dragging.title")}
            subtitle={t("maturity.dragging.subtitle")}
          />
          <DraggingControls />
        </Card>
      </div>
      ) : null}
    </div>
  );
}

function DraggingControls() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<
    | Awaited<ReturnType<typeof api.getDraggingControls>>
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDraggingControls()
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return <div className="text-ink-3 text-[12.5px] py-4">{error}</div>;
  }
  if (!data) {
    return <div className="text-ink-3 text-[12.5px] py-4">…</div>;
  }
  if (data.controls.length === 0) {
    return (
      <div className="text-ink-3 text-[12.5px] py-4">
        {t("maturity.dragging.empty")}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {data.controls.slice(0, 5).map((c) => (
        <li key={c.id} className="py-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-ink-1 leading-snug">{c.title}</div>
            <div className="text-[11.5px] text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                {t("maturity.dragging.entitiesAffected", {
                  n: fmt(c.affectedCount),
                })}
              </span>
              {c.service ? (
                <>
                  <span className="text-ink-3/60">·</span>
                  <span className="keep-ltr">{c.service}</span>
                </>
              ) : null}
              {c.userImpact ? (
                <>
                  <span className="text-ink-3/60">·</span>
                  <span>
                    {t("tab.controls.userImpact")}:{" "}
                    <span className="text-ink-2">{c.userImpact}</span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="text-[13px] tabular font-semibold shrink-0 text-neg">
            −{fmt(c.missedScore)}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Pull the right delta off the KPIs for the selected range. Demo seed populates all four.
function deltaForRange(kpis: CouncilKpis, range: Range): number | null {
  switch (range) {
    case "7D":
      return kpis.maturityDelta7d;
    case "30D":
      return kpis.maturityDelta30d;
    case "QTD":
      return kpis.maturityDelta90d;
    case "YTD":
      return kpis.maturityDelta180d;
  }
}

function captionForRange(
  range: Range,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (range) {
    case "7D":
      return t("time.range.caption.7d");
    case "30D":
      return t("time.range.caption.30d");
    case "QTD":
      return t("time.range.caption.qtd");
    case "YTD":
      return t("time.range.caption.ytd");
  }
}

function PageShell({
  loading,
  error,
  empty,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("maturity.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("maturity.title")}
        </h1>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {empty ? <EmptyState /> : null}
    </div>
  );
}
