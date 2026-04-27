"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";
import { api } from "@/lib/api/client";

type SourceKey =
  | "secureScore"
  | "defender"
  | "purview"
  | "entra"
  | "intune"
  | "compliance";

type Health = "green" | "amber" | "red" | "unavailable";

type HealthResponse = {
  lookbackHours: number;
  consentedTenants: number;
  sources: Record<
    SourceKey,
    { status: Health; coverage: number; licenseGated?: number }
  >;
};

type FrameworkId = "nesa" | "dubai-isr" | "nca" | "isr" | "generic";

/**
 * The sidebar's data-sources panel.
 *
 * Previously each row had a hardcoded green/amber status. That lied to
 * operators — Purview and Compliance Manager showed "Degraded" even
 * when all 12 demo tenants were delivering full Purview signals. Now
 * we fetch live coverage from /api/signals/data-source-health and
 * render a real indicator per row.
 *
 * Rows are defined here (not server-side) so the sidebar can render
 * immediately with a loading-state amber dot before the fetch resolves.
 */
const ROWS: Array<{
  key: SourceKey;
  name: string;
  detailKey:
    | "ds.secureScore.detail"
    | "ds.defender.detail"
    | "ds.purview.detail"
    | "ds.entra.detail"
    | "ds.intune.detail"
    | "ds.compliance.detail";
}> = [
  { key: "secureScore", name: "Secure Score", detailKey: "ds.secureScore.detail" },
  { key: "defender", name: "Defender", detailKey: "ds.defender.detail" },
  { key: "purview", name: "Purview", detailKey: "ds.purview.detail" },
  { key: "entra", name: "Entra ID", detailKey: "ds.entra.detail" },
  { key: "intune", name: "Intune", detailKey: "ds.intune.detail" },
  { key: "compliance", name: "Compliance Mgr.", detailKey: "ds.compliance.detail" },
];

// Colour-coded dot per status. v2.5.11+ — `unavailable` is its own
// state for license-gated sources (every consented tenant returned
// 4xx, meaning the SKU isn't owned). It renders dim grey because
// "we don't read this" isn't a problem to alarm on, just a fact.
const DOT: Record<Health, string> = {
  green: "bg-pos",
  amber: "bg-warn",
  red: "bg-neg",
  unavailable: "bg-ink-3/50",
};

export function DataSourcesPanel() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  // The "Compliance Mgr." row's detail line used to be a hardcoded
  // "UAE NESA". With v2.4.0 the active framework is selectable per
  // deployment, so the label tracks branding.frameworkId at runtime.
  const [frameworkId, setFrameworkId] = useState<FrameworkId | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/signals/data-source-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body) setHealth(body as HealthResponse);
      })
      .catch(() => {
        /* swallow — panel stays at amber, which is the right hedge. */
      });
    api
      .whoami()
      .then((r) => {
        if (!cancelled) setFrameworkId(r.frameworkId);
      })
      .catch(() => {
        /* whoami failures don't block the rest of the panel. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve the active framework's display name from the dict
  // (`branding.framework.dubai-isr` → "Dubai ISR", etc.). Falls back to
  // the legacy "UAE NESA" string while whoami is in flight so the row
  // never renders blank.
  const complianceDetail = frameworkId
    ? frameworkId === "generic"
      ? t("ds.compliance.detail.generic")
      : t(`branding.framework.${frameworkId}` as DictKey)
    : t("ds.compliance.detail");

  return (
    <div className="border-t border-border p-3 pb-4">
      <div className="eyebrow px-2 pt-1 pb-2 flex items-center gap-2">
        {t("sidebar.dataSources")}
        <span className="text-ink-3 normal-case tracking-normal font-normal">
          {t("sidebar.dataSources.suffix")}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 px-1">
        {ROWS.map((s) => {
          // Default while the fetch is in flight: amber (honest "unknown").
          const entry = health?.sources[s.key];
          const status: Health = entry?.status ?? "amber";
          const coverage = entry?.coverage;
          const licenseGated = entry?.licenseGated ?? 0;
          // Tooltip text is status-aware: "unavailable" sources get a
          // human explanation rather than a percent that would always
          // read 0%.
          const tooltip =
            status === "unavailable"
              ? `Not provisioned in ${licenseGated} consented entit${licenseGated === 1 ? "y" : "ies"}. The Microsoft SKU for this data source isn't owned — Mizan can't read what isn't there.`
              : coverage != null
                ? `${coverage}% of provisioned entities returned data in the last ${health?.lookbackHours ?? 72}h`
                : undefined;
          return (
            <li key={s.key} className="flex items-start gap-2 px-1.5 py-1">
              <span
                className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${DOT[status]}`}
                aria-hidden
                title={tooltip}
              />
              <div className="min-w-0">
                <div
                  className={`text-[12.5px] leading-tight ${
                    status === "unavailable" ? "text-ink-3" : "text-ink-1"
                  }`}
                >
                  {s.name}
                </div>
                <div className="text-[11px] text-ink-3 leading-snug">
                  {s.key === "compliance"
                    ? complianceDetail
                    : status === "unavailable"
                      ? "not provisioned"
                      : t(s.detailKey)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
