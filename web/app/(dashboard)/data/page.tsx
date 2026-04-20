"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Files } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

type PurviewRollup = Awaited<ReturnType<typeof api.getPurviewRollup>>;

export default function DataProtectionPage() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<PurviewRollup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPurviewRollup().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!data) return <Shell><LoadingState /></Shell>;
  if (data.entities.length === 0) return <Shell><EmptyState /></Shell>;

  const entities = data.entities;
  const sharingLabels: Record<string, string> = {
    disabled: locale === "ar" ? "تعطيل" : "Disabled",
    existingExternalUserSharingOnly: locale === "ar" ? "ضيوف حاليون فقط" : "Existing guests only",
    externalUserSharingOnly: locale === "ar" ? "ضيوف" : "External users",
    externalUserAndGuestSharing: locale === "ar" ? "أي شخص" : "Anyone",
    unknown: locale === "ar" ? "غير معروف" : "Unknown",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <Files size={11} className="inline -mt-0.5 me-1" />
          {t("dataProt.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("dataProt.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">{t("dataProt.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile
          label={t("dataProt.dlpAlerts")}
          value={fmt(data.totals.dlp.total)}
          accent={data.totals.dlp.active > 0 ? "warn" : "council"}
        />
        <KpiTile
          label={t("dataProt.irmAlerts")}
          value={fmt(data.totals.irm.total)}
          accent={data.totals.irm.active > 0 ? "warn" : "council"}
        />
        <KpiTile
          label={t("dataProt.commComp.title")}
          value={fmt(data.totals.commComp.total)}
          accent={data.totals.commComp.active > 0 ? "warn" : "council"}
        />
        <KpiTile
          label={t("dataProt.srr")}
          value={fmt(data.totals.srrs.total)}
          accent={data.totals.srrs.overdue > 0 ? "neg" : "council"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader title={t("dataProt.labels.title")} subtitle={t("dataProt.labels.subtitle")} />
          <ul className="flex flex-col gap-2 text-[13px]">
            <Stat label={t("dataProt.labels.sensitivityActive")} value={fmt(data.totals.sensitivity.avgActive)} />
            <Stat label={t("dataProt.labels.retentionAvg")} value={fmt(data.totals.retention.avgLabels)} />
            <Stat label={t("dataProt.labels.recordLabels")} value={fmt(data.totals.retention.recordLabels)} />
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dataProt.sharing.title")}
            subtitle={t("dataProt.sharing.subtitle")}
          />
          <ul className="flex flex-col gap-2 text-[13px]">
            {Object.entries(data.totals.sharing).map(([key, count]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="text-ink-2">{sharingLabels[key] ?? key}</span>
                <span
                  className={`tabular font-semibold ${
                    key === "externalUserAndGuestSharing"
                      ? "text-neg"
                      : key === "externalUserSharingOnly"
                        ? "text-warn"
                        : "text-pos"
                  }`}
                >
                  {fmt(count)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-5">
          <CardHeader title={t("dataProt.byEntity.title")} subtitle={t("dataProt.byEntity.subtitle")} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">{t("cols.entity")}</th>
                <th className="py-2.5 text-start font-semibold">{t("cols.cluster")}</th>
                <th className="py-2.5 text-end font-semibold">{t("dataProt.col.dlp")}</th>
                <th className="py-2.5 text-end font-semibold">{t("dataProt.col.irm")}</th>
                <th className="py-2.5 text-end font-semibold">{t("dataProt.col.commComp")}</th>
                <th className="py-2.5 text-end font-semibold">{t("dataProt.col.srrs")}</th>
                <th className="py-2.5 pe-5 text-start font-semibold">{t("dataProt.col.sharing")}</th>
              </tr>
            </thead>
            <tbody>
              {entities
                .slice()
                .sort((a, b) => (b.dlp?.active ?? 0) - (a.dlp?.active ?? 0))
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                  const sh = e.sharepoint?.sharingCapability ?? "unknown";
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
                        {fmt(e.dlp?.total ?? 0)}
                        {e.dlp?.active ? <span className="text-warn ms-1">({fmt(e.dlp.active)})</span> : null}
                      </td>
                      <td className="py-2.5 text-end tabular">{fmt(e.irm?.total ?? 0)}</td>
                      <td className="py-2.5 text-end tabular">{fmt(e.commComp?.total ?? 0)}</td>
                      <td className="py-2.5 text-end tabular">
                        {fmt(e.srrs?.total ?? 0)}
                        {e.srrs?.overdue ? <span className="text-neg ms-1">({fmt(e.srrs.overdue)})</span> : null}
                      </td>
                      <td className="py-2.5 pe-5 text-ink-2 text-[11.5px]">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded border ${
                            sh === "externalUserAndGuestSharing"
                              ? "text-neg border-neg/40 bg-neg/10"
                              : sh === "externalUserSharingOnly"
                                ? "text-warn border-warn/40 bg-warn/10"
                                : "text-pos border-pos/40 bg-pos/10"
                          }`}
                        >
                          {sharingLabels[sh] ?? sh}
                        </span>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <span className="tabular font-semibold text-ink-1">{value}</span>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("dataProt.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("dataProt.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}
