"use client";

import {
  Smartphone,
  ShieldCheck,
  Network,
  Mail,
  Cloud,
  Tag,
  FileWarning,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { useFmtRelative } from "@/lib/i18n/time";
import { useFmtNum } from "@/lib/i18n/num";
import type { TenantRow } from "@/lib/db/tenants";
import type {
  WorkloadCoveragePayload,
  CoverageStatus,
} from "@/lib/graph/workload-coverage";

/**
 * Phase 16 — Workload Coverage card. Shown at the top of every entity's
 * overview page. Surfaces "what Microsoft security tools is this entity
 * actually using" without forcing the operator to drill into seven
 * separate sub-pages.
 *
 * Each tool tile carries an availability badge:
 *   ✅ Live  — fully discoverable on Graph v1.0
 *   ⚠️ Beta  — pulled from Graph beta (schema may shift)
 *   🕐 Coming soon — license-presence + activity proxy only; full
 *                   deployment details require a Microsoft surface
 *                   we don't have access to (PowerShell, MDCA portal)
 *
 * The headline correlation — Intune-vs-MDE coverage gap — is rendered as
 * a callout strip directly under the MDE tile so it can't be missed.
 */
export function WorkloadCoverageCard({
  coverage,
  tenant,
}: {
  coverage: WorkloadCoveragePayload | null;
  tenant: TenantRow;
}) {
  const { t } = useI18n();
  const fmtRelative = useFmtRelative();
  const fmt = useFmtNum();

  if (!coverage) {
    return (
      <Card>
        <CardHeader
          title={t("workloadCoverage.title")}
          subtitle={t("workloadCoverage.subtitle")}
        />
        <div className="text-[12.5px] text-ink-3">
          {tenant.last_sync_at
            ? t("workloadCoverage.notYetCollected")
            : t("workloadCoverage.awaitingFirstSync")}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("workloadCoverage.title")}
        subtitle={t("workloadCoverage.subtitle")}
        right={
          <div className="text-[11px] text-ink-3 tabular text-end">
            {coverage.collectedAt
              ? t("workloadCoverage.collectedAt", {
                  when: fmtRelative(coverage.collectedAt),
                })
              : null}
          </div>
        }
      />

      {/* Tile grid — 3 cols on lg, 2 on md, stacks on mobile. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Intune ───── */}
        <Tile
          icon={Smartphone}
          name={t("workloadCoverage.tool.intune.name")}
          subtitle={t("workloadCoverage.tool.intune.subtitle")}
          status={coverage.intune.available}
          licensed={coverage.intune.license.licensed}
          licenseSeats={coverage.intune.license.totalSeats}
          licenseConsumed={coverage.intune.license.consumedSeats}
          metrics={[
            coverage.mdmAuthority
              ? {
                  label: t("workloadCoverage.intune.mdmAuthority"),
                  value: coverage.mdmAuthority,
                  emphasis: coverage.mdmAuthority === "intune",
                }
              : null,
            coverage.intune.enrolledDevices !== null
              ? {
                  label: t("workloadCoverage.intune.enrolled"),
                  value: fmt(coverage.intune.enrolledDevices),
                }
              : null,
            coverage.intune.percentCompliant !== null
              ? {
                  label: t("workloadCoverage.intune.compliant"),
                  value: `${fmt(coverage.intune.percentCompliant)}%`,
                  emphasis: coverage.intune.percentCompliant >= 80,
                }
              : null,
            coverage.intune.compliancePolicyCount !== null
              ? {
                  label: t("workloadCoverage.intune.compliancePolicies"),
                  value: fmt(coverage.intune.compliancePolicyCount),
                }
              : null,
            coverage.intune.configurationProfileCount !== null
              ? {
                  label: t("workloadCoverage.intune.configProfiles"),
                  value: fmt(coverage.intune.configurationProfileCount),
                }
              : null,
            coverage.intune.settingsCatalogProfileCount !== null
              ? {
                  label: t("workloadCoverage.intune.settingsCatalog"),
                  value: fmt(coverage.intune.settingsCatalogProfileCount),
                }
              : null,
          ]}
          breakdown={
            Object.keys(coverage.intune.devicesByPlatform).length > 0
              ? coverage.intune.devicesByPlatform
              : null
          }
          breakdownLabel={t("workloadCoverage.intune.byPlatform")}
        />

        {/* MDE ───── */}
        <Tile
          icon={ShieldCheck}
          name={t("workloadCoverage.tool.mde.name")}
          subtitle={t("workloadCoverage.tool.mde.subtitle")}
          status={coverage.mde.available}
          licensed={coverage.mde.license.licensed}
          licenseSeats={coverage.mde.license.totalSeats}
          licenseConsumed={coverage.mde.license.consumedSeats}
          metrics={[
            coverage.mde.onboardedDevices !== null
              ? {
                  label: t("workloadCoverage.mde.onboarded"),
                  value: fmt(coverage.mde.onboardedDevices),
                }
              : null,
            coverage.mde.activeLast7Days !== null
              ? {
                  label: t("workloadCoverage.mde.activeLast7d"),
                  value: fmt(coverage.mde.activeLast7Days),
                  emphasis: true,
                }
              : null,
            coverage.mde.staleOver30Days !== null &&
            coverage.mde.staleOver30Days > 0
              ? {
                  label: t("workloadCoverage.mde.staleOver30d"),
                  value: fmt(coverage.mde.staleOver30Days),
                  warn: true,
                }
              : null,
          ]}
          breakdown={
            Object.keys(coverage.mde.devicesByOs).length > 0
              ? coverage.mde.devicesByOs
              : null
          }
          breakdownLabel={t("workloadCoverage.mde.byOs")}
          callout={
            coverage.mde.intuneCoverageGap !== null &&
            coverage.mde.intuneCoverageGap > 0
              ? {
                  tone: "warn",
                  text: t("workloadCoverage.mde.coverageGap", {
                    n: fmt(coverage.mde.intuneCoverageGap),
                  }),
                }
              : null
          }
        />

        {/* MDI ───── */}
        <Tile
          icon={Network}
          name={t("workloadCoverage.tool.mdi.name")}
          subtitle={t("workloadCoverage.tool.mdi.subtitle")}
          status={coverage.mdi.available}
          licensed={coverage.mdi.license.licensed}
          licenseSeats={coverage.mdi.license.totalSeats}
          licenseConsumed={coverage.mdi.license.consumedSeats}
          metrics={[
            coverage.mdi.sensorCount !== null
              ? {
                  label: t("workloadCoverage.mdi.sensors"),
                  value: fmt(coverage.mdi.sensorCount),
                }
              : null,
            coverage.mdi.openHealthIssues !== null
              ? {
                  label: t("workloadCoverage.mdi.openHealth"),
                  value: fmt(coverage.mdi.openHealthIssues),
                  warn: coverage.mdi.openHealthIssues > 0,
                }
              : null,
            coverage.mdi.criticalHealthIssues !== null &&
            coverage.mdi.criticalHealthIssues > 0
              ? {
                  label: t("workloadCoverage.mdi.criticalHealth"),
                  value: fmt(coverage.mdi.criticalHealthIssues),
                  warn: true,
                }
              : null,
          ]}
        />

        {/* Sensitivity Labels ───── */}
        <Tile
          icon={Tag}
          name={t("workloadCoverage.tool.labels.name")}
          subtitle={t("workloadCoverage.tool.labels.subtitle")}
          status={coverage.labels.available}
          licensed={coverage.labels.license.licensed}
          licenseSeats={coverage.labels.license.totalSeats}
          licenseConsumed={coverage.labels.license.consumedSeats}
          metrics={[
            coverage.labels.publishedLabelCount !== null
              ? {
                  label: t("workloadCoverage.labels.published"),
                  value: fmt(coverage.labels.publishedLabelCount),
                }
              : null,
            coverage.labels.labelEventsLast30d !== null
              ? {
                  label: t("workloadCoverage.labels.eventsLast30d"),
                  value: fmt(coverage.labels.labelEventsLast30d),
                  emphasis: coverage.labels.labelEventsLast30d > 0,
                }
              : null,
          ]}
          breakdown={
            coverage.labels.labelNames.length > 0
              ? Object.fromEntries(
                  coverage.labels.labelNames.map((n) => [n, 1]),
                )
              : null
          }
          breakdownLabel={t("workloadCoverage.labels.catalog")}
          breakdownAsList
        />

        {/* MDO ───── */}
        <Tile
          icon={Mail}
          name={t("workloadCoverage.tool.mdo.name")}
          subtitle={t("workloadCoverage.tool.mdo.subtitle")}
          status={coverage.mdo.available}
          licensed={coverage.mdo.license.licensed}
          licenseSeats={coverage.mdo.license.totalSeats}
          licenseConsumed={coverage.mdo.license.consumedSeats}
          metrics={[
            coverage.mdo.alertsLast30d !== null
              ? {
                  label: t("workloadCoverage.mdo.alertsLast30d"),
                  value: fmt(coverage.mdo.alertsLast30d),
                  emphasis: coverage.mdo.alertsLast30d > 0,
                }
              : null,
            coverage.mdo.submissionsLast30d !== null
              ? {
                  label: t("workloadCoverage.mdo.submissionsLast30d"),
                  value: fmt(coverage.mdo.submissionsLast30d),
                }
              : null,
          ]}
          comingSoonNote={t("workloadCoverage.mdo.comingSoonNote")}
        />

        {/* MDCA ───── */}
        <Tile
          icon={Cloud}
          name={t("workloadCoverage.tool.mdca.name")}
          subtitle={t("workloadCoverage.tool.mdca.subtitle")}
          status={coverage.mdca.available}
          licensed={coverage.mdca.license.licensed}
          licenseSeats={coverage.mdca.license.totalSeats}
          licenseConsumed={coverage.mdca.license.consumedSeats}
          metrics={[
            coverage.mdca.alertsLast30d !== null
              ? {
                  label: t("workloadCoverage.mdca.alertsLast30d"),
                  value: fmt(coverage.mdca.alertsLast30d),
                  emphasis: coverage.mdca.alertsLast30d > 0,
                }
              : null,
          ]}
          comingSoonNote={t("workloadCoverage.mdca.comingSoonNote")}
        />

        {/* DLP ───── */}
        <Tile
          icon={FileWarning}
          name={t("workloadCoverage.tool.dlp.name")}
          subtitle={t("workloadCoverage.tool.dlp.subtitle")}
          status={coverage.dlp.available}
          licensed={coverage.dlp.license.licensed}
          licenseSeats={coverage.dlp.license.totalSeats}
          licenseConsumed={coverage.dlp.license.consumedSeats}
          metrics={[
            coverage.dlp.policyCountBeta !== null
              ? {
                  label: t("workloadCoverage.dlp.policiesBeta"),
                  value: fmt(coverage.dlp.policyCountBeta),
                }
              : null,
            coverage.dlp.alertsLast30d !== null
              ? {
                  label: t("workloadCoverage.dlp.alertsLast30d"),
                  value: fmt(coverage.dlp.alertsLast30d),
                  emphasis: coverage.dlp.alertsLast30d > 0,
                }
              : null,
          ]}
          comingSoonNote={t("workloadCoverage.dlp.comingSoonNote")}
        />
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Tile primitive
// ────────────────────────────────────────────────────────────────────

type Metric = {
  label: string;
  value: string;
  emphasis?: boolean;
  warn?: boolean;
} | null;

function Tile({
  icon: Icon,
  name,
  subtitle,
  status,
  licensed,
  licenseSeats,
  licenseConsumed,
  metrics,
  breakdown,
  breakdownLabel,
  breakdownAsList,
  callout,
  comingSoonNote,
}: {
  icon: typeof Smartphone;
  name: string;
  subtitle: string;
  status: CoverageStatus;
  licensed: boolean;
  licenseSeats: number;
  licenseConsumed: number;
  metrics: Metric[];
  breakdown?: Record<string, number> | null;
  breakdownLabel?: string;
  breakdownAsList?: boolean;
  callout?: { tone: "warn" | "info"; text: string } | null;
  comingSoonNote?: string;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const visibleMetrics = metrics.filter(
    (m): m is NonNullable<Metric> => m !== null,
  );

  return (
    <div className="rounded-md border border-border bg-surface-1 p-3 flex flex-col gap-2">
      {/* Header row: icon + name + status badge. */}
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 h-8 w-8 grid place-items-center rounded-md bg-surface-3 text-ink-1">
          <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-[13px] font-semibold text-ink-1">{name}</h3>
            <StatusBadge status={status} licensed={licensed} />
          </div>
          <p className="text-[11.5px] text-ink-2 mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Licensing line — always present so the operator sees seat math. */}
      {licensed ? (
        <div className="text-[10.5px] text-ink-3 leading-snug">
          <span className="font-semibold text-ink-2">
            {t("workloadCoverage.licensed")}
          </span>{" "}
          {licenseConsumed > 0 || licenseSeats > 0
            ? t("workloadCoverage.seatMath", {
                consumed: fmt(licenseConsumed),
                total: fmt(licenseSeats),
              })
            : t("workloadCoverage.licenseNoSeatData")}
        </div>
      ) : (
        <div className="text-[10.5px] text-ink-3 leading-snug">
          <span className="font-semibold text-ink-3">
            {t("workloadCoverage.notLicensed")}
          </span>
        </div>
      )}

      {/* Metrics list — only render the keys the API actually returned. */}
      {visibleMetrics.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] mt-1">
          {visibleMetrics.map((m, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <dt className="text-ink-3">{m.label}</dt>
              <dd
                className={`tabular font-semibold ${
                  m.warn
                    ? "text-warn"
                    : m.emphasis
                      ? "text-pos"
                      : "text-ink-1"
                }`}
              >
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* Optional breakdown — OS distribution, label catalog, etc. */}
      {breakdown && Object.keys(breakdown).length > 0 ? (
        <div className="mt-1 pt-2 border-t border-border/60">
          {breakdownLabel ? (
            <div className="text-[10.5px] uppercase tracking-[0.06em] font-semibold text-ink-3 mb-1">
              {breakdownLabel}
            </div>
          ) : null}
          {breakdownAsList ? (
            <ul className="text-[11px] text-ink-2 leading-snug list-disc ms-3.5">
              {Object.keys(breakdown)
                .slice(0, 6)
                .map((k) => (
                  <li key={k}>{k}</li>
                ))}
              {Object.keys(breakdown).length > 6 ? (
                <li className="text-ink-3">
                  {t("workloadCoverage.andMore", {
                    n: fmt(Object.keys(breakdown).length - 6),
                  })}
                </li>
              ) : null}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
              {Object.entries(breakdown).map(([k, v]) => (
                <div
                  key={k}
                  className="inline-flex items-baseline gap-1 text-ink-2"
                >
                  <span className="text-ink-3">{k}</span>
                  <span className="tabular font-semibold text-ink-1">
                    {fmt(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Headline correlation callout (currently only used for MDE coverage gap). */}
      {callout ? (
        <div
          className={`mt-1 rounded border px-2 py-1.5 ${
            callout.tone === "warn"
              ? "border-warn/40 bg-warn/10"
              : "border-accent/40 bg-accent/10"
          }`}
        >
          <div
            className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
              callout.tone === "warn" ? "text-warn" : "text-accent"
            }`}
          >
            <AlertTriangle size={11} aria-hidden="true" />
            {callout.text}
          </div>
        </div>
      ) : null}

      {/* Coming-soon explanatory line for tools where deeper details require
          a Microsoft surface we don't have access to. */}
      {comingSoonNote && status === "coming_soon" ? (
        <div className="mt-1 rounded border border-border/70 bg-surface-2 px-2 py-1.5">
          <div className="text-[10.5px] text-ink-3 leading-snug inline-flex items-start gap-1">
            <Info
              size={10}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{comingSoonNote}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  licensed,
}: {
  status: CoverageStatus;
  licensed: boolean;
}) {
  const { t } = useI18n();
  if (status === "live") {
    return (
      <span className="text-[9.5px] uppercase tracking-[0.08em] font-semibold text-pos border border-pos/40 bg-pos/10 rounded px-1.5 py-px whitespace-nowrap">
        {t("workloadCoverage.badge.live")}
      </span>
    );
  }
  if (status === "beta") {
    return (
      <span className="text-[9.5px] uppercase tracking-[0.08em] font-semibold text-accent border border-accent/40 bg-accent/10 rounded px-1.5 py-px whitespace-nowrap">
        {t("workloadCoverage.badge.beta")}
      </span>
    );
  }
  return (
    <span className="text-[9.5px] uppercase tracking-[0.08em] font-semibold text-ink-3 border border-border bg-surface-2 rounded px-1.5 py-px whitespace-nowrap">
      {licensed
        ? t("workloadCoverage.badge.comingSoonLicensed")
        : t("workloadCoverage.badge.comingSoon")}
    </span>
  );
}
