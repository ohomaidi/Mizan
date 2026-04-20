"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

export default function IdentityPage() {
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
  if (data.totals.identity.totalUsers === 0) return <Shell><EmptyState /></Shell>;

  const rows = data.identity.filter((e) => e.payload);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <UserCog size={11} className="inline -mt-0.5 me-1" />
          {t("page.identity.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.identity.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
          {t("rollup.identity.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile label={t("rollup.totalUsers")} value={fmt(data.totals.identity.totalUsers)} />
        <KpiTile
          label={t("rollup.atRiskUsers")}
          value={fmt(data.totals.identity.atRisk)}
          accent="neg"
        />
        <KpiTile label={t("rollup.caPoliciesMfa")} value={fmt(data.totals.identity.caMfa)} accent="council" />
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
                <th className="py-2.5 text-end font-semibold">{t("rollup.totalUsers")}</th>
                <th className="py-2.5 text-end font-semibold">{t("rollup.atRiskUsers")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">{t("rollup.caPoliciesMfa")}</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => (b.payload?.atRisk ?? 0) - (a.payload?.atRisk ?? 0))
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
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
                      <td className="py-2.5 text-end tabular text-neg font-semibold">
                        {fmt(e.payload!.atRisk)}
                      </td>
                      <td className="py-2.5 pe-5 text-end tabular">
                        {fmt(e.payload!.caMfa)}/{fmt(e.payload!.caPolicies)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {depth ? <IdentityDepth depth={depth} locale={locale} /> : null}
    </div>
  );
}

function IdentityDepth({
  depth,
  locale,
}: {
  depth: Awaited<ReturnType<typeof api.getDefenderDepth>>;
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const pimRows = depth.entities
    .filter((e) => e.pim)
    .sort(
      (a, b) =>
        (b.pim!.privilegedRoleAssignments ?? 0) -
        (a.pim!.privilegedRoleAssignments ?? 0),
    )
    .slice(0, 12);
  const dfiRows = depth.entities
    .filter((e) => (e.dfi?.unhealthy ?? 0) > 0)
    .sort((a, b) => (b.dfi!.unhealthy ?? 0) - (a.dfi!.unhealthy ?? 0))
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2 p-0">
        <div className="p-5">
          <CardHeader
            title={t("identity.pim.title")}
            subtitle={t("identity.pim.subtitle")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("identity.pim.col.entity")}
                </th>
                <th className="py-2.5 text-end font-semibold">{t("identity.pim.col.standing")}</th>
                <th className="py-2.5 text-end font-semibold">{t("identity.pim.col.eligible")}</th>
                <th className="py-2.5 pe-5 text-end font-semibold">
                  {t("identity.pim.col.privileged")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pimRows.map(({ id, nameEn, nameAr, pim }) => (
                <tr key={id} className="border-t border-border hover:bg-surface-3/40">
                  <td className="ps-5 py-2.5">
                    <Link href={`/entities/${id}`} className="text-ink-1 hover:text-council-strong">
                      {locale === "ar" ? nameAr : nameEn}
                    </Link>
                  </td>
                  <td className="py-2.5 text-end tabular">{fmt(pim!.activeAssignments)}</td>
                  <td className="py-2.5 text-end tabular text-ink-3">
                    {fmt(pim!.eligibleAssignments)}
                  </td>
                  <td className="py-2.5 pe-5 text-end tabular text-neg font-semibold">
                    {fmt(pim!.privilegedRoleAssignments)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("identity.dfi.title")} subtitle={t("identity.dfi.subtitle")} />
        {dfiRows.length === 0 ? (
          <div className="text-pos text-[13px]">—</div>
        ) : (
          <ul className="flex flex-col gap-2 text-[13px]">
            {dfiRows.map(({ id, nameEn, nameAr, dfi }) => (
              <li key={id} className="flex items-center justify-between">
                <Link
                  href={`/entities/${id}`}
                  className="text-ink-1 hover:text-council-strong truncate"
                >
                  {locale === "ar" ? nameAr : nameEn}
                </Link>
                <span className="tabular font-semibold text-warn">{fmt(dfi!.unhealthy)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("page.identity.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("rollup.identity.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}
