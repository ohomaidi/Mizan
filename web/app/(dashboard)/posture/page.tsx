import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { MaturityRadar } from "@/components/charts/MaturityRadar";
import { getTranslator, type ServerTranslator } from "@/lib/i18n/dict.server";
import type { DictKey } from "@/lib/i18n/dict";
import {
  buildPostureData,
  POSTURE_TABS,
  type PostureKpi,
  type PostureTab,
  type PostureTabContent,
} from "@/lib/posture/data";
import { cn } from "@/lib/utils";

/**
 * Posture — Executive Mode whole-estate signal view.
 *
 * Replaces Council's flat list of Identity / Devices / Data /
 * Threats / Vulnerabilities sidebar entries with a single tabbed
 * page. The CISO sees the radar (six-axis sub-score breakdown) at
 * a glance, then taps a tab to see the headline metrics for one
 * domain. Each tab carries a "Drill down" link to the existing
 * detailed page (which still exists; it just isn't a primary nav
 * stop in Executive mode).
 *
 * Tabs are URL-driven via `?tab=identity` so the back button works,
 * deep-links share, and there's no client-side state ambiguity. The
 * page is a server component — radar + tab content all render at
 * request time from snapshots.
 *
 * v2.6.1 — Executive-mode polish.
 */
export const dynamic = "force-dynamic";

const ORDER: PostureTab[] = POSTURE_TABS;
const DEFAULT_TAB: PostureTab = "identity";

function isPostureTab(v: string | undefined): v is PostureTab {
  return !!v && (ORDER as string[]).includes(v);
}

export default async function PosturePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const active: PostureTab = isPostureTab(raw) ? raw : DEFAULT_TAB;

  const data = buildPostureData();
  const t = await getTranslator();

  if (!data.tenant) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader
            title={t("posture.empty.title")}
            subtitle={t("posture.empty.subtitle")}
          />
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-council-strong text-white font-medium text-sm"
          >
            <ArrowRight size={14} />
            {t("posture.empty.cta")}
          </Link>
        </Card>
      </div>
    );
  }

  const content = data.tabs[active];

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto space-y-6">
      <header className="space-y-1">
        <div className="eyebrow">
          {t("posture.eyebrow", { org: data.tenant.name_en })}
        </div>
        <h1 className="text-[28px] leading-tight font-semibold text-ink-1">
          {t("posture.title")}
        </h1>
        <p className="text-ink-2 text-[13.5px]">{t("posture.subtitle")}</p>
      </header>

      {/* ── Estate radar ─────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("posture.radar.title")}
          subtitle={
            data.radar.index !== null
              ? t("posture.radar.subtitle", {
                  index: data.radar.index.toFixed(1),
                })
              : t("posture.radar.empty")
          }
        />
        {data.radar.scores ? (
          <MaturityRadar
            series={[
              {
                name: data.tenant.name_en,
                scores: data.radar.scores,
                color: "var(--council-strong)",
              },
            ]}
            height={300}
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-ink-3 text-sm">
            {t("posture.radar.empty")}
          </div>
        )}
      </Card>

      {/* ── Tab pills ────────────────────────────────────────── */}
      <nav
        aria-label={t("posture.tabs.aria")}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {ORDER.map((tab) => {
          const isActive = tab === active;
          return (
            <Link
              key={tab}
              href={`/posture?tab=${tab}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "px-4 py-2 -mb-px border-b-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-council-strong text-ink-1"
                  : "border-transparent text-ink-2 hover:text-ink-1",
              )}
            >
              {t(data.tabs[tab].labelKey as DictKey)}
            </Link>
          );
        })}
      </nav>

      {/* ── Tab content ──────────────────────────────────────── */}
      <PostureTabPanel content={content} t={t} />
    </div>
  );
}

function PostureTabPanel({
  content,
  t,
}: {
  content: PostureTabContent;
  t: ServerTranslator;
}) {
  return (
    <Card>
      <CardHeader
        title={t(content.labelKey as DictKey)}
        subtitle={t(content.subtitleKey as DictKey)}
        right={
          <Link
            href={content.drillHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-3 text-ink-1 text-[12.5px] font-medium hover:bg-surface-3/80"
          >
            {t(content.drillLabelKey as DictKey)} <ArrowRight size={12} />
          </Link>
        }
      />
      {content.kpis.length === 0 ? (
        <div className="text-ink-3 text-sm py-6">{t("posture.tabEmpty")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {content.kpis.map((kpi, i) => (
            <KpiBlock key={i} kpi={kpi} t={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

function KpiBlock({
  kpi,
  t,
}: {
  kpi: PostureKpi;
  t: ServerTranslator;
}) {
  const tone = kpi.tone ?? "neutral";
  const accent =
    tone === "pos"
      ? "bg-pos"
      : tone === "warn"
        ? "bg-warn"
        : tone === "neg"
          ? "bg-neg"
          : "bg-border-strong";
  return (
    <div className="relative rounded-lg border border-border bg-surface-1 p-4 overflow-hidden">
      <span
        aria-hidden
        className={cn("absolute start-0 top-0 bottom-0 w-[3px]", accent)}
      />
      <div className="eyebrow text-[10px]">{t(kpi.labelKey as DictKey)}</div>
      <div className="mt-2 text-3xl font-semibold tabular text-ink-1">
        {kpi.value}
      </div>
      {kpi.hint ? (
        <div className="text-[11px] text-ink-3 mt-1">{kpi.hint}</div>
      ) : null}
    </div>
  );
}
