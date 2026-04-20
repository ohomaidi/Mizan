"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

export default function ThreatsPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getRollup>> | null>(null);
  const [depth, setDepth] = useState<Awaited<ReturnType<typeof api.getDefenderDepth>> | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const rows = data.threats.filter((e) => e.payload);
  const bySev = data.totals.threats.bySeverity;

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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiTile
          label={t("rollup.activeIncidents")}
          value={fmt(data.totals.threats.active)}
          accent={data.totals.threats.active > 0 ? "warn" : "default"}
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
                .sort((a, b) => (b.payload?.active ?? 0) - (a.payload?.active ?? 0))
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                  const high = e.payload?.bySeverity?.high ?? 0;
                  return (
                    <tr key={e.id} className="border-t border-border hover:bg-surface-3/40">
                      <td className="ps-5 py-2.5">
                        <Link href={`/entities/${e.id}`} className="text-ink-1 hover:text-council-strong">
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
                        {fmt(e.payload!.active)}
                      </td>
                      <td className="py-2.5 pe-5 text-end tabular text-ink-3">
                        {fmt(e.payload!.resolved)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {depth ? <DefenderDepth depth={depth} locale={locale} /> : null}
    </div>
  );
}

function DefenderDepth({
  depth,
  locale,
}: {
  depth: Awaited<ReturnType<typeof api.getDefenderDepth>>;
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const attackRanked = depth.entities
    .filter((e) => e.attackSim && e.attackSim.totalAttempts > 0)
    .sort((a, b) => (b.attackSim!.clickRatePct ?? 0) - (a.attackSim!.clickRatePct ?? 0))
    .slice(0, 10);

  const huntingRows = depth.entities
    .map((e) => {
      const totalHits =
        e.hunting?.packs.reduce((s, p) => s + p.rowCount, 0) ?? 0;
      return { entity: e, totalHits };
    })
    .sort((a, b) => b.totalHits - a.totalHits)
    .slice(0, 10);

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
                    href={`/entities/${id}`}
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
          subtitle={t("threats.ti.subtitle")}
        />
        {depth.entities[0]?.ti?.recentArticles?.length ? (
          <ul className="flex flex-col gap-2.5">
            {depth.entities[0].ti.recentArticles.slice(0, 5).map((a) => (
              <li key={a.id} className="border-l-2 border-council-strong ps-3">
                <div className="text-[13px] text-ink-1">{a.title}</div>
                {a.summary ? (
                  <div className="text-[12px] text-ink-3 mt-0.5">{a.summary}</div>
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

      <Card className="lg:col-span-2 p-0">
        <div className="p-5">
          <CardHeader
            title={t("threats.hunting.title")}
            subtitle={t("threats.hunting.subtitle")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("cols.entity")}</th>
                {huntingRows[0]?.entity.hunting?.packs.map((p) => (
                  <th key={p.packId} className="py-2.5 text-end font-semibold max-w-[160px] truncate">
                    {p.name}
                  </th>
                )) ?? null}
              </tr>
            </thead>
            <tbody>
              {huntingRows.map(({ entity }) => (
                <tr key={entity.id} className="border-t border-border hover:bg-surface-3/40">
                  <td className="ps-5 py-2.5">
                    <Link
                      href={`/entities/${entity.id}`}
                      className="text-ink-1 hover:text-council-strong"
                    >
                      {locale === "ar" ? entity.nameAr : entity.nameEn}
                    </Link>
                  </td>
                  {entity.hunting?.packs.map((p) => (
                    <td key={p.packId} className="py-2.5 text-end tabular">
                      {p.error ? (
                        <span className="text-neg text-[11px]">{t("threats.hunting.failed")}</span>
                      ) : p.rowCount === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        <span className={p.rowCount > 20 ? "text-warn" : "text-ink-1"}>
                          {fmt(p.rowCount)}
                        </span>
                      )}
                    </td>
                  )) ?? null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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
