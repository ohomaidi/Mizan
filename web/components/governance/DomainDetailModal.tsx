"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";

type ClauseDetail = Awaited<
  ReturnType<typeof api.getGovernanceClauses>
>["clauses"][number];

/**
 * Modal that surfaces the full detail of a compliance-framework clause
 * (Dubai ISR domain, NESA clause, etc.) when the operator taps a row on
 * the Governance page. Lazily fetches Council-wide rollup data on open
 * so the summary table itself stays fast.
 *
 * Three layers of depth:
 *   1. Static catalog metadata — domain title (EN/AR), reference,
 *      class chips (Governance/Operation/Assurance for ISR), full
 *      description, weight in framework.
 *   2. How the coverage number was computed — per-Microsoft-Secure-Score
 *      control rollup (each control's name, category, service, mean
 *      pass-rate across in-scope entities, count of entities passing /
 *      failing / unscored). Plus operator-managed custom evidence
 *      anchors.
 *   3. Per-entity coverage table — every consented + demo entity's
 *      coverage number on this clause, with an OOS chip when applicable
 *      and a "no evidence" badge when samples = 0. Operators can spot
 *      which entities are dragging the score in one glance.
 *
 * v2.5.32.
 */
export function DomainDetailModal({
  open,
  onClose,
  clauseId,
}: {
  open: boolean;
  onClose: () => void;
  clauseId: string | null;
}) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<ClauseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clauseId) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getGovernanceClauses()
      .then((r) => {
        if (!alive) return;
        const found = r.clauses.find((c) => c.clauseId === clauseId);
        setData(found ?? null);
        if (!found) setError("clause_not_found");
      })
      .catch((err) => {
        if (alive) setError((err as Error).message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, clauseId]);

  const title = data
    ? locale === "ar"
      ? data.titleAr
      : data.titleEn
    : t("gov.domainModal.loadingTitle");

  return (
    <Modal open={open} onClose={onClose} title={title} size="wide">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-ink-3" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-warn/40 bg-warn/[0.06] p-4 text-[12.5px] text-ink-2">
          {error}
        </div>
      ) : data ? (
        <DetailBody data={data} />
      ) : null}
    </Modal>
  );
}

function DetailBody({ data }: { data: ClauseDetail }) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const description =
    locale === "ar" ? data.descriptionAr : data.descriptionEn;

  return (
    <div className="flex flex-col gap-5 text-[13px] text-ink-1 leading-relaxed">
      {/* Header strip — ref + class chips + weight + headline coverage */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded border border-border bg-surface-1 px-2 py-0.5 text-[11px] tabular keep-ltr text-ink-2">
            {data.ref}
          </span>
          {data.classRefs.map((c) => (
            <span
              key={c}
              className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[11px] text-ink-1"
            >
              {t(`gov.class.${c.toLowerCase()}` as
                | "gov.class.governance"
                | "gov.class.operation"
                | "gov.class.assurance")}
            </span>
          ))}
          <span className="text-[11.5px] text-ink-3">
            {t("gov.domainModal.weight", {
              pct: fmt(Math.round(data.weight * 10) / 10),
            })}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[11.5px] uppercase tracking-[0.06em] text-ink-3">
            {t("gov.domainModal.coverageHeadline")}
          </span>
          <span className="text-[24px] font-semibold tabular text-ink-1">
            {data.meanCoverage === null ? "—" : `${fmt(data.meanCoverage)}%`}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-md border border-border bg-surface-1 p-4">
        <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 mb-2">
          {t("gov.domainModal.descriptionHeading")}
        </div>
        <p className="text-[13px] text-ink-1 leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* How coverage is calculated */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 mb-2 flex items-center gap-1.5">
          <Info size={11} />
          {t("gov.domainModal.calcHeading")}
        </div>
        <p className="text-[12.5px] text-ink-2 leading-relaxed mb-3">
          {t("gov.domainModal.calcExplanation", {
            scored: fmt(data.scoredEntities),
            total: fmt(data.totalEntities),
            controls: fmt(data.controls.length),
            evidence: fmt(data.customEvidence.length),
          })}
        </p>

        {/* Microsoft Secure Score controls */}
        {data.controls.length > 0 ? (
          <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
            <div className="px-4 py-2 bg-surface-2 text-[11px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
              {t("gov.domainModal.controlsHeading")}
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
                  <th className="py-2 ps-4 text-start font-semibold">
                    {t("gov.domainModal.controls.col.control")}
                  </th>
                  <th className="py-2 text-start font-semibold">
                    {t("gov.domainModal.controls.col.service")}
                  </th>
                  <th className="py-2 pe-4 text-end font-semibold">
                    {t("gov.domainModal.controls.col.passRate")}
                  </th>
                  <th className="py-2 pe-4 text-end font-semibold">
                    {t("gov.domainModal.controls.col.entities")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.controls.map((c) => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="py-2 ps-4">
                      <div className="text-ink-1">{c.title ?? c.id}</div>
                      <div className="text-[10.5px] text-ink-3 keep-ltr">
                        {c.id}
                      </div>
                    </td>
                    <td className="py-2 text-ink-2">{c.service ?? "—"}</td>
                    <td className="py-2 pe-4 text-end tabular">
                      {c.meanPassRate === null
                        ? "—"
                        : `${fmt(c.meanPassRate)}%`}
                    </td>
                    {/*
                     * v2.5.33 — three-bucket histogram. Microsoft Secure
                     * Score is partial-credit; binary pass/fail at 100%
                     * misreads 88% as "failing". Now: full-pass · partial
                     * · fail · (no-data) so operators can see whether
                     * entities are making progress vs. not started.
                     */}
                    <td className="py-2 pe-4 text-end text-[11.5px] tabular">
                      <span
                        className="text-pos"
                        title={t("gov.domainModal.controls.fullPassTip")}
                      >
                        {fmt(c.entitiesFullPass)}
                      </span>
                      <span className="text-ink-3 mx-1">·</span>
                      <span
                        className="text-warn"
                        title={t("gov.domainModal.controls.partialTip")}
                      >
                        {fmt(c.entitiesPartial)}
                      </span>
                      <span className="text-ink-3 mx-1">·</span>
                      <span
                        className="text-neg"
                        title={t("gov.domainModal.controls.failTip")}
                      >
                        {fmt(c.entitiesFail)}
                      </span>
                      {c.entitiesUnscored > 0 ? (
                        <span className="text-ink-3 ms-1">
                          ({fmt(c.entitiesUnscored)}{" "}
                          {t("gov.domainModal.controls.unscoredShort")})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-[10.5px] text-ink-3 leading-relaxed border-t border-border bg-surface-2">
              {t("gov.domainModal.controls.legend")}
            </div>
          </div>
        ) : null}

        {/* Custom evidence */}
        {data.customEvidence.length > 0 ? (
          <div className="mt-4 rounded-md border border-border bg-surface-1 overflow-hidden">
            <div className="px-4 py-2 bg-surface-2 text-[11px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
              {t("gov.domainModal.customEvidenceHeading")}
            </div>
            <ul className="divide-y divide-border">
              {data.customEvidence.map((ev) => (
                <li key={ev.id} className="px-4 py-2 text-[12.5px]">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-ink-1">{ev.label}</span>
                    <span className="tabular text-ink-3">
                      {fmt(ev.manualPassRate)}%
                    </span>
                    <span className="text-[11px] text-ink-3 keep-ltr ms-auto">
                      {ev.reviewedAt}
                    </span>
                  </div>
                  {ev.reviewerNote ? (
                    <div className="text-[11.5px] text-ink-3 mt-0.5 leading-relaxed">
                      {ev.reviewerNote}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Per-entity table */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 mb-2">
          {t("gov.domainModal.perEntityHeading")}
        </div>
        <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em]">
                <th className="py-2 ps-4 text-start font-semibold">
                  {t("gov.domainModal.perEntity.col.entity")}
                </th>
                <th className="py-2 text-end font-semibold">
                  {t("gov.domainModal.perEntity.col.samples")}
                </th>
                <th className="py-2 pe-4 text-end font-semibold">
                  {t("gov.domainModal.perEntity.col.coverage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.perEntity.map((r) => {
                const pct =
                  r.coverage === null
                    ? null
                    : Math.round(r.coverage * 1000) / 10;
                return (
                  <tr
                    key={r.entityId}
                    className={`border-t border-border ${r.oosState !== "in-scope" ? "opacity-60" : ""}`}
                  >
                    <td className="py-2 ps-4">
                      <Link
                        href={`/entities/${r.entityId}`}
                        className="text-ink-1 hover:text-council-strong inline-flex items-center gap-1"
                      >
                        {locale === "ar" ? r.entityNameAr : r.entityNameEn}
                        <ExternalLink size={11} className="text-ink-3" />
                      </Link>
                      {r.oosState !== "in-scope" ? (
                        <span className="ms-2 inline-flex items-center text-[10.5px] rounded-full bg-warn/15 text-warn px-1.5 py-0.5">
                          {r.oosState === "global-oos"
                            ? t("gov.domainModal.perEntity.globalOos")
                            : t("gov.domainModal.perEntity.tenantOos")}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-end tabular text-ink-3">
                      {fmt(r.samples)}
                    </td>
                    <td className="py-2 pe-4 text-end tabular">
                      {pct === null ? (
                        <span className="text-ink-3">
                          {t("gov.domainModal.perEntity.noEvidence")}
                        </span>
                      ) : (
                        <span className="text-ink-1 font-semibold">
                          {fmt(pct)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
