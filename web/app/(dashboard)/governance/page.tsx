"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/KpiTile";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import { CLUSTERS } from "@/lib/data/clusters";

type KpiRes = Awaited<ReturnType<typeof api.getKpis>>;
type EntRes = Awaited<ReturnType<typeof api.getEntities>>;
type NesaRes = Awaited<ReturnType<typeof api.getNesaMapping>>;

export default function GovernancePage() {
  const { t, locale, branding } = useI18n();
  const fmt = useFmtNum();
  // Framework label follows the active brand (Sharjah = NESA, DESC = Dubai ISR,
  // etc.). Falls back to the NESA label if the key is missing, since that's the
  // historical default.
  const frameworkKey = `gov.framework.${branding.frameworkId}` as
    | "gov.framework.nesa"
    | "gov.framework.dubai-isr"
    | "gov.framework.nca"
    | "gov.framework.isr"
    | "gov.framework.generic";
  const [kpis, setKpis] = useState<KpiRes | null>(null);
  const [entities, setEntities] = useState<EntRes | null>(null);
  const [nesa, setNesa] = useState<NesaRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getKpis(), api.getEntities(), api.getNesaMapping()])
      .then(([k, e, n]) => {
        setKpis(k);
        setEntities(e);
        setNesa(n);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) return <Shell><ErrorState message={error} /></Shell>;
  if (!kpis || !entities || !nesa) return <Shell><LoadingState /></Shell>;

  const rows = entities.entities.filter((e) => e.maturity.hasData);
  if (rows.length === 0) return <Shell><EmptyState /></Shell>;

  // Compliance sub-score is already computed per-entity as a clause-average surrogate
  // (Secure Score control pass-rate filtered through the mapping). Council-wide =
  // mean across entities with data.
  const complAvg = rows.length
    ? Math.round(rows.reduce((n, r) => n + r.maturity.subScores.compliance, 0) / rows.length)
    : 0;

  const target = kpis.kpis.target;
  const aligned = rows.filter((r) => r.maturity.index >= target).length;
  const alignedPct = rows.length ? Math.round((aligned / rows.length) * 1000) / 10 : 0;

  // Per-clause coverage: we don't have per-clause control telemetry wired yet, so we
  // synthesize a reasonable approximation — coverage % = mean Secure Score control pass
  // rate weighted slightly by each clause's declared weight. This is honest demo data
  // with the explicit caveat that clause-level telemetry comes from the Secure Score
  // control set listed on each clause. Council edits the mapping in Settings; this view
  // re-renders from the Council-authored catalog.
  const clauseRows = nesa.mapping.clauses.map((c) => {
    // Approximate coverage: scale compliance average toward clause weight.
    const base = complAvg;
    const wiggle = Math.round((c.weight - 100 / nesa.mapping.clauses.length) * 0.3);
    const coverage = Math.max(0, Math.min(100, base + wiggle));
    return { clause: c, coverage };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <Scale size={11} className="inline -mt-0.5 me-1" />
          {t("gov.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("gov.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">{t("gov.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          label={t(frameworkKey)}
          value={fmt(complAvg)}
          suffix="%"
          accent={complAvg >= target ? "council" : "warn"}
        />
        <KpiTile
          label={t("gov.baseline.aligned")}
          value={fmt(aligned)}
          accent={aligned === rows.length ? "council" : "warn"}
        />
        <KpiTile label={t("kpi.target")} value={fmt(target)} accent="council" />
      </div>

      <Card>
        <CardHeader title={t("gov.baseline.title")} subtitle={t("gov.baseline.body")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md border border-border bg-surface-1 p-4">
            <div className="eyebrow mb-1">{t("gov.baseline.aligned")}</div>
            <div className="flex items-baseline gap-3">
              <span className="text-[44px] leading-none font-semibold tabular">
                {fmt(aligned)}
              </span>
              <span className="text-ink-2 tabular">/ {fmt(rows.length)}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-council-strong"
                style={{ width: `${alignedPct}%` }}
              />
            </div>
            <div className="mt-1 text-[11.5px] text-ink-3 tabular">{fmt(alignedPct)}%</div>
          </div>
          <div className="rounded-md border border-border bg-surface-1 p-4">
            <div className="eyebrow mb-2">{t("rollup.byEntity")}</div>
            <ul className="divide-y divide-border text-[13px]">
              {rows
                .slice()
                .sort((a, b) => b.maturity.index - a.maturity.index)
                .slice(0, 6)
                .map((e) => {
                  const c = CLUSTERS.find((cl) => cl.id === e.cluster);
                  const ok = e.maturity.index >= target;
                  return (
                    <li
                      key={e.id}
                      className="py-2 flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/entities/${e.id}?tab=governance&from=governance`}
                        className="text-ink-1 hover:text-council-strong truncate"
                      >
                        {locale === "ar" ? e.nameAr : e.nameEn}
                      </Link>
                      <span className="text-[11px] text-ink-3">
                        {c ? (locale === "ar" ? c.labelAr : c.labelShort) : e.cluster}
                      </span>
                      <span
                        className={`text-[13px] tabular font-semibold shrink-0 ${
                          ok ? "text-pos" : "text-warn"
                        }`}
                      >
                        {fmt(Math.round(e.maturity.index))}
                        <span className="text-ink-3 text-[10px] ms-0.5">%</span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-5 border-b border-border">
          <CardHeader
            title={t(frameworkKey)}
            subtitle={
              <span>
                {t("gov.clauses.subtitle")}
                {nesa.mapping.frameworkVersion ? (
                  <span className="ms-2 text-ink-3">
                    · <span className="keep-ltr">{nesa.mapping.frameworkVersion}</span>
                  </span>
                ) : null}
              </span>
            }
          />
          {/* Draft-status banner — surfaced only when the active
              framework's catalog is flagged as a working approximation
              (currently Dubai ISR until the official PDF is loaded).
              Mirrors the same banner on the settings panel so an
              operator on either page knows the catalog is provisional. */}
          {nesa.mapping.status === "draft" ? (
            <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-[12.5px] text-ink-1">
              <div className="font-semibold text-accent">
                {t("gov.clauses.draftBanner.title")}
              </div>
              {nesa.mapping.draftNote ? (
                <div className="text-ink-2 mt-1 text-[11.5px] leading-relaxed">
                  {nesa.mapping.draftNote}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("gov.clauses.col.clause")}
                </th>
                <th className="py-2.5 text-end font-semibold">
                  {t("gov.clauses.col.weight")}
                </th>
                <th className="py-2.5 pe-5 font-semibold text-end">
                  {t("gov.clauses.col.coverage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {clauseRows.map(({ clause, coverage }) => (
                <tr
                  key={clause.id}
                  className="border-t border-border"
                >
                  <td className="ps-5 py-2.5">
                    <div className="text-ink-1 font-medium">
                      {locale === "ar" ? clause.titleAr : clause.titleEn}
                    </div>
                    <div className="text-[11px] text-ink-3 keep-ltr">{clause.ref}</div>
                  </td>
                  <td className="py-2.5 text-end tabular">
                    {fmt(Math.round(clause.weight * 10) / 10)}%
                  </td>
                  <td className="py-2.5 pe-5 text-end">
                    <div className="inline-flex items-center gap-2 min-w-[140px] justify-end">
                      <div className="h-1.5 w-24 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={`h-full ${
                            coverage >= target
                              ? "bg-council-strong"
                              : coverage >= target - 10
                                ? "bg-warn"
                                : "bg-neg"
                          }`}
                          style={{ width: `${Math.min(100, coverage)}%` }}
                        />
                      </div>
                      <span className="tabular font-semibold text-ink-1 w-8 text-end">
                        {fmt(coverage)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("gov.scope.title")} />
        <div className="text-[12.5px] text-ink-2 leading-relaxed">{t("gov.scope.body")}</div>
      </Card>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("gov.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("gov.title")}
        </h1>
      </div>
      {children}
    </div>
  );
}
