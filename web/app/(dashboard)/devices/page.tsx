"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

export default function DevicesPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getRollup>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getRollup().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!data) return <Shell><LoadingState /></Shell>;
  if (data.totals.devices.total === 0) return <Shell><EmptyState /></Shell>;

  const rows = data.devices.filter((e) => e.payload);
  const overallPct =
    data.totals.devices.total > 0
      ? Math.round((data.totals.devices.compliant / data.totals.devices.total) * 1000) / 10
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <MonitorSmartphone size={11} className="inline -mt-0.5 me-1" />
          {t("page.devices.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.devices.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">{t("rollup.devices.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile label={t("rollup.totalDevices")} value={fmt(data.totals.devices.total)} />
        <KpiTile
          label={t("rollup.compliantDevices")}
          value={fmt(overallPct)}
          suffix="%"
          accent="council"
        />
        <KpiTile
          label={t("compliance.noncompliant")}
          value={fmt(data.totals.devices.nonCompliant)}
          accent={data.totals.devices.nonCompliant > 0 ? "warn" : "default"}
        />
      </div>

      <Card>
        <CardHeader title="Breakdown by OS" subtitle="Across consented entities" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(data.totals.devices.byOs).map(([os, count]) => (
            <div key={os} className="rounded-md border border-border bg-surface-1 p-3 text-center">
              <div className="text-[22px] font-semibold tabular text-ink-1">{fmt(count)}</div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 mt-0.5">{os}</div>
            </div>
          ))}
        </div>
      </Card>

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
                <th className="py-2.5 text-end font-semibold">{t("rollup.totalDevices")}</th>
                <th className="py-2.5 text-end font-semibold">{t("rollup.compliantDevices")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">{t("compliance.noncompliant")}</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => (a.payload?.compliancePct ?? 0) - (b.payload?.compliancePct ?? 0))
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                  const pct = e.payload!.compliancePct;
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
                      <td className="py-2.5 text-end tabular">{fmt(e.payload!.total)}</td>
                      <td className="py-2.5 text-end tabular">
                        <span
                          className={
                            pct >= 90
                              ? "text-pos font-semibold"
                              : pct >= 80
                                ? "text-ink-1"
                                : "text-warn font-semibold"
                          }
                        >
                          {fmt(pct)}%
                        </span>
                      </td>
                      <td className="py-2.5 pe-5 text-end tabular text-neg">
                        {fmt(e.payload!.nonCompliant)}
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

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("page.devices.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.devices.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}
