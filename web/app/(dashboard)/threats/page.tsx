"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { useFmtRelative } from "@/lib/i18n/time";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

type WindowDays = 30 | 60 | 90;

export default function ThreatsPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getRollup>> | null>(null);
  const [depth, setDepth] = useState<Awaited<ReturnType<typeof api.getDefenderDepth>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<WindowDays>(30);

  useEffect(() => {
    Promise.all([api.getRollup(), api.getDefenderDepth()])
      .then(([r, d]) => {
        setData(r);
        setDepth(d);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!data) return <Shell><LoadingState /></Shell>;
  if (data.totals.threats.total === 0) return <Shell><EmptyState /></Shell>;

  // Apply the time-window filter client-side. The payload holds all
  // incidents Graph returned this sync; we re-bucket in-memory so the
  // 30/60/90d pill updates instantly without a round-trip.
  const cutoffMs = Date.now() - window * 86_400_000;

  const rows = data.threats
    .filter((e) => e.payload)
    .map((e) => {
      const incidents = (e.payload?.incidents ?? []).filter(
        (i) => Date.parse(i.lastUpdateDateTime) >= cutoffMs,
      );
      const active = incidents.filter((i) => i.status !== "resolved").length;
      const resolved = incidents.filter((i) => i.status === "resolved").length;
      const bySeverity: Record<string, number> = {};
      for (const i of incidents) {
        bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
      }
      return {
        ...e,
        windowedPayload: {
          total: incidents.length,
          active,
          resolved,
          bySeverity,
        },
      };
    })
    .filter((e) => e.windowedPayload.total > 0);

  // Fleet totals from the same windowed slice.
  const fleetTotals = rows.reduce(
    (acc, r) => {
      acc.active += r.windowedPayload.active;
      acc.resolved += r.windowedPayload.resolved;
      for (const [sev, n] of Object.entries(r.windowedPayload.bySeverity)) {
        acc.bySev[sev] = (acc.bySev[sev] ?? 0) + n;
      }
      return acc;
    },
    { active: 0, resolved: 0, bySev: {} as Record<string, number> },
  );
  const bySev = fleetTotals.bySev;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <ShieldAlert size={11} className="inline -mt-0.5 me-1" />
          {t("page.threats.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.threats.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">{t("rollup.threats.subtitle")}</p>
      </div>

      {/* Time-window filter — applies to the KPI tiles + by-entity table.
          Attack Simulation and Threat Intelligence below have their own
          time-bounding at the signal level so they aren't re-filtered here. */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
          {t("threats.window.label")}
        </span>
        {([30, 60, 90] as WindowDays[]).map((d) => {
          const active = window === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setWindow(d)}
              className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                active
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              {t(`threats.window.${d}d` as "threats.window.30d" | "threats.window.60d" | "threats.window.90d")}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiTile
          label={t("rollup.activeIncidents")}
          value={fmt(fleetTotals.active)}
          accent={fleetTotals.active > 0 ? "warn" : "default"}
        />
        <KpiTile label={t("severity.high")} value={fmt(bySev.high ?? 0)} accent={bySev.high ? "neg" : "default"} />
        <KpiTile label={t("severity.medium")} value={fmt(bySev.medium ?? 0)} accent={bySev.medium ? "warn" : "default"} />
        <KpiTile label={t("severity.low")} value={fmt(bySev.low ?? 0)} />
      </div>

      <Card className="p-0">
        <div className="p-5">
          <CardHeader title={t("rollup.byEntity")} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("cols.entity")}</th>
                <th className="py-2.5 text-start font-semibold">{t("cols.cluster")}</th>
                <th className="py-2.5 text-end font-semibold">{t("tab.incidents.col.severity")}</th>
                <th className="py-2.5 text-end font-semibold">{t("rollup.activeIncidents")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">{t("status.resolved")}</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => b.windowedPayload.active - a.windowedPayload.active)
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                  const high = e.windowedPayload.bySeverity.high ?? 0;
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-surface-3/40">
                      <td className="ps-5 py-2.5">
                        <Link
                          href={`/entities/${e.id}?tab=incidents&from=threats`}
                          className="text-ink-1 hover:text-council-strong"
                        >
                          {locale === "ar" ? e.nameAr : e.nameEn}
                        </Link>
                      </td>
                      <td className="py-2.5 text-ink-2">
                        {c ? (locale === "ar" ? c.labelAr : c.labelShort) : e.cluster}
                      </td>
                      <td className="py-2.5 text-end tabular">
                        <span className={high > 0 ? "text-neg font-semibold" : "text-ink-3"}>
                          {high > 0 ? `${fmt(high)} ${t("severity.high")}` : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 text-end tabular text-warn font-semibold">
                        {fmt(e.windowedPayload.active)}
                      </td>
                      <td className="py-2.5 pe-5 text-end tabular text-ink-3">
                        {fmt(e.windowedPayload.resolved)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {depth ? <DefenderDepth depth={depth} locale={locale} windowDays={window} /> : null}
    </div>
  );
}

type TiArticle = {
  id: string;
  title: string;
  createdDateTime: string;
  summary: string | null;
};

function DefenderDepth({
  depth,
  locale,
  windowDays,
}: {
  depth: Awaited<ReturnType<typeof api.getDefenderDepth>>;
  locale: "en" | "ar";
  windowDays: WindowDays;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [tiDrill, setTiDrill] = useState<TiArticle | null>(null);

  const attackRanked = depth.entities
    .filter((e) => e.attackSim && e.attackSim.totalAttempts > 0)
    .sort((a, b) => (b.attackSim!.clickRatePct ?? 0) - (a.attackSim!.clickRatePct ?? 0))
    .slice(0, 10);

  // TI articles — window-filtered + deduplicated across entities.
  const cutoffMs = Date.now() - windowDays * 86_400_000;
  const tiArticles = useMemo(() => {
    const seen = new Map<string, TiArticle>();
    for (const e of depth.entities) {
      if (!e.ti?.recentArticles) continue;
      for (const a of e.ti.recentArticles) {
        if (Date.parse(a.createdDateTime) < cutoffMs) continue;
        if (!seen.has(a.id)) {
          seen.set(a.id, a);
        }
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => Date.parse(b.createdDateTime) - Date.parse(a.createdDateTime),
    );
  }, [depth, cutoffMs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader
          title={t("threats.attackSim.title")}
          subtitle={t("threats.attackSim.subtitle")}
        />
        {attackRanked.length === 0 ? (
          <div className="text-ink-3 text-[13px]">—</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {attackRanked.map(({ id, nameEn, nameAr, attackSim }) => {
              const rate = attackSim!.clickRatePct ?? 0;
              return (
                <li key={id} className="flex items-center gap-3 text-[13px]">
                  <Link
                    href={`/entities/${id}?tab=attackSimulation&from=threats`}
                    className="flex-1 text-ink-1 hover:text-council-strong truncate"
                  >
                    {locale === "ar" ? nameAr : nameEn}
                  </Link>
                  <div className="h-1.5 w-24 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className={`h-full ${
                        rate >= 20 ? "bg-neg" : rate >= 10 ? "bg-warn" : "bg-council-strong"
                      }`}
                      style={{ width: `${Math.min(100, rate * 2.5)}%` }}
                    />
                  </div>
                  <span className="tabular font-semibold text-ink-1 w-10 text-end">
                    {fmt(rate)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("threats.ti.title")}
          subtitle={t("threats.ti.subtitle30d")}
          right={
            <div className="text-[11.5px] text-ink-3 tabular">
              {t("threats.ti.count", { count: fmt(tiArticles.length) })}
            </div>
          }
        />
        {tiArticles.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {tiArticles.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="border-l-2 border-council-strong ps-3 cursor-pointer hover:bg-surface-3/30 rounded-r-sm py-1"
                onClick={() => setTiDrill(a)}
              >
                <div className="text-[13px] text-ink-1 hover:text-council-strong">
                  {a.title}
                </div>
                {a.summary ? (
                  <div className="text-[12px] text-ink-3 mt-0.5 line-clamp-2">
                    {a.summary}
                  </div>
                ) : null}
                <div className="text-[11px] text-ink-3 tabular mt-0.5 keep-ltr">
                  {a.createdDateTime.slice(0, 10)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-ink-3 text-[13px]">{t("threats.ti.empty")}</div>
        )}
      </Card>

      {tiDrill ? (
        <TiArticleModal article={tiDrill} onClose={() => setTiDrill(null)} />
      ) : null}
    </div>
  );
}

function TiArticleModal({
  article,
  onClose,
}: {
  article: TiArticle;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();
  const portalUrl = `https://security.microsoft.com/threatanalytics3/${encodeURIComponent(article.id)}/overview`;

  return (
    <Modal open onClose={onClose} size="wide" title={article.title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-[11.5px] text-ink-3">
          <span className="text-ink-3 uppercase tracking-wide text-[10.5px]">
            {t("threats.ti.modal.published")}
          </span>
          <span className="text-ink-2 tabular">
            {fmtRelative(article.createdDateTime)}
          </span>
          <span className="text-ink-3">·</span>
          <span className="keep-ltr tabular">{article.createdDateTime.slice(0, 10)}</span>
          <span className="text-ink-3 ms-auto keep-ltr">ID {article.id}</span>
        </div>

        {article.summary ? (
          <div className="rounded-md border border-border bg-surface-1 p-3 text-[13px] text-ink-1 leading-relaxed">
            {article.summary}
          </div>
        ) : (
          <div className="text-[12.5px] text-ink-3">
            {t("threats.ti.modal.noSummary")}
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
          >
            <ExternalLink size={13} />
            {t("threats.ti.modal.openInDefender")}
          </a>
          <div className="text-[11px] text-ink-3 mt-2">
            {t("threats.ti.modal.portalHint")}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("page.threats.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.threats.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}
