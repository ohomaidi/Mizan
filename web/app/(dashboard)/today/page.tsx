import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  FileText,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { MaturityRadar } from "@/components/charts/MaturityRadar";
import { buildTodayData, type TodayPinnedKpi } from "@/lib/today/data";
import type { ChangeFeedEvent } from "@/lib/today/change-feed";
import type { RiskRow } from "@/lib/db/risk-register";
import { getTranslator, type ServerTranslator } from "@/lib/i18n/dict.server";
import type { DictKey } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

/**
 * Today — Executive Mode home page.
 *
 * The CISO's daily driver. Single scroll, no navigation needed to
 * answer "what's the state of my estate this morning?":
 *
 *   1. Hero — Maturity Index + 7d delta + sub-score mini-radar.
 *   2. Two columns — top risks (left) + open incidents + quick
 *      actions (right).
 *   3. Pinned KPI tiles — the 3-5 numbers the CISO committed to.
 *   4. Change feed — derived 7-day deltas across signals (CVE
 *      additions, admin role drift, incidents opened, MFA drops).
 *
 * Server component — all data resolution happens at request time
 * via `lib/today/data.ts`. Client interactivity is reserved for the
 * radar (recharts) which is wrapped in its own client component.
 *
 * v2.6.1 — Executive-mode polish in response to the navigation
 * complaint that landing on Entity detail and bouncing to /maturity
 * left users with no clear "home". Today is the home now.
 */
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = buildTodayData();
  const t = await getTranslator();

  if (!data.tenant) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader
            title={t("today.empty.title")}
            subtitle={t("today.empty.subtitle")}
          />
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-council-strong text-white font-medium text-sm"
          >
            <ArrowRight size={14} />
            {t("today.empty.cta")}
          </Link>
        </Card>
      </div>
    );
  }

  const orgName = data.tenant.name_en;
  const updated = data.hero.capturedAt
    ? new Date(data.hero.capturedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : t("today.neverSynced");

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto space-y-6">
      {/* ── Page eyebrow ─────────────────────────────────────── */}
      <header className="space-y-1">
        <div className="eyebrow">{t("today.eyebrow", { org: orgName })}</div>
        <h1 className="text-[28px] leading-tight font-semibold text-ink-1">
          {t("today.title")}
        </h1>
        <p className="text-ink-2 text-[13.5px]">
          {t("today.subtitle", { updated })}
        </p>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <Card className="!p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-0">
          {/* Left half — Maturity number */}
          <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-e border-border">
            <div className="eyebrow">{t("today.hero.eyebrow")}</div>
            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-[72px] leading-none font-semibold tabular text-ink-1">
                {data.hero.index !== null
                  ? data.hero.index.toFixed(1)
                  : "—"}
              </span>
              <span className="text-2xl text-ink-2 tabular">/100</span>
              {data.hero.delta7d !== null ? (
                <DeltaChip delta={data.hero.delta7d} t={t} />
              ) : null}
            </div>
            <p className="mt-3 text-ink-2 text-[13px] max-w-md">
              {t("today.hero.body")}
            </p>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <Link
                href="/posture"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-3 text-ink-1 text-[12.5px] font-medium hover:bg-surface-3/80"
              >
                {t("today.hero.viewPosture")} <ArrowRight size={13} />
              </Link>
              <Link
                href="/board-report"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-council-strong text-white text-[12.5px] font-medium hover:opacity-90"
              >
                <FileText size={13} />
                {t("today.hero.generateReport")}
              </Link>
            </div>
          </div>

          {/* Right half — mini-radar */}
          <div className="p-4 lg:p-6 bg-surface-1">
            {data.hero.subScores ? (
              <MaturityRadar
                series={[
                  {
                    name: orgName,
                    scores: data.hero.subScores,
                    color: "var(--council-strong)",
                  },
                ]}
                height={260}
                ariaLabel={t("today.hero.radarAlt")}
              />
            ) : (
              <div className="h-[260px] flex items-center justify-center text-ink-3 text-sm">
                {t("today.hero.noRadar")}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Top risks + Incidents/Actions ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <TopRisksCard risks={data.topRisks} t={t} />
        <div className="space-y-6">
          <IncidentsCard
            active={data.openIncidents.active}
            high={data.openIncidents.high}
            total={data.openIncidents.total}
            t={t}
          />
          <QuickActionsCard t={t} />
        </div>
      </div>

      {/* ── Pinned KPIs ──────────────────────────────────────── */}
      {data.pinnedKpis.length > 0 ? (
        <section className="space-y-3">
          <header className="flex items-end justify-between">
            <div>
              <div className="eyebrow">{t("today.scorecard.eyebrow")}</div>
              <h2 className="text-lg font-semibold text-ink-1 mt-1">
                {t("today.scorecard.title")}
              </h2>
            </div>
            <Link
              href="/scorecard"
              className="text-[12.5px] text-ink-2 hover:text-ink-1 inline-flex items-center gap-1"
            >
              {t("today.scorecard.manage")} <ArrowRight size={12} />
            </Link>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.pinnedKpis.map((k) => (
              <PinnedKpiTile key={k.pin.id} kpi={k} t={t} />
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <CardHeader
            title={t("today.scorecard.empty.title")}
            subtitle={t("today.scorecard.empty.subtitle")}
            right={
              <Link
                href="/scorecard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-3 text-ink-1 text-[12.5px] font-medium hover:bg-surface-3/80"
              >
                {t("today.scorecard.empty.cta")}
                <ArrowRight size={12} />
              </Link>
            }
          />
        </Card>
      )}

      {/* ── 7-day change feed ───────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("today.feed.title")}
          subtitle={t("today.feed.subtitle")}
        />
        {data.changeFeed.length === 0 ? (
          <div className="text-ink-3 text-sm py-6 flex items-center gap-2">
            <Minus size={14} /> {t("today.feed.noChanges")}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.changeFeed.map((ev) => (
              <ChangeFeedRow key={ev.id} event={ev} t={t} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ───── Sub-components (server) ─────────────────────────────

function DeltaChip({ delta, t }: { delta: number; t: ServerTranslator }) {
  const good = delta >= 0;
  const neutral = delta === 0;
  const Icon = neutral ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const color = neutral
    ? "text-ink-3 bg-surface-3"
    : good
      ? "text-pos bg-pos/10"
      : "text-neg bg-neg/10";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular",
        color,
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {Math.abs(delta).toFixed(1)}
      <span className="text-[10px] opacity-80 ms-0.5">
        {t("today.hero.vs7d")}
      </span>
    </span>
  );
}

function TopRisksCard({
  risks,
  t,
}: {
  risks: RiskRow[];
  t: ServerTranslator;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} className="text-warn" />
            {t("today.risks.title")}
          </span>
        }
        subtitle={t("today.risks.subtitle")}
        right={
          <Link
            href="/risk-register"
            className="text-[12.5px] text-ink-2 hover:text-ink-1 inline-flex items-center gap-1"
          >
            {t("today.risks.viewAll")} <ArrowRight size={12} />
          </Link>
        }
      />
      {risks.length === 0 ? (
        <div className="text-ink-3 text-sm py-4 flex items-center gap-2">
          <ShieldCheck size={14} className="text-pos" />
          {t("today.risks.empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {risks.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 p-3 rounded-md bg-surface-1 hover:bg-surface-3/40"
            >
              <RiskRatingBadge rating={r.residual_rating} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] text-ink-1 font-medium leading-tight">
                  {r.title}
                </div>
                <div className="text-[11.5px] text-ink-3 mt-0.5 flex items-center gap-2">
                  <span>
                    {t("today.risks.impact")} {r.impact} ·{" "}
                    {t("today.risks.likelihood")} {r.likelihood}
                  </span>
                  {r.status === "suggested" ? (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Sparkles size={10} /> {t("today.risks.suggested")}
                    </span>
                  ) : null}
                  {r.owner ? <span>· {r.owner}</span> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RiskRatingBadge({ rating }: { rating: number }) {
  const tone =
    rating >= 15
      ? "bg-neg text-white"
      : rating >= 7
        ? "bg-warn text-ink-1"
        : "bg-pos/20 text-pos";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md text-[13px] font-semibold tabular w-9 h-9 shrink-0",
        tone,
      )}
    >
      {rating}
    </span>
  );
}

function IncidentsCard({
  active,
  high,
  total,
  t,
}: {
  active: number;
  high: number;
  total: number;
  t: ServerTranslator;
}) {
  const tone = high > 0 ? "text-neg" : active > 0 ? "text-warn" : "text-pos";
  const Icon = high > 0 ? ShieldAlert : ShieldCheck;
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon size={16} className={tone} />
            {t("today.incidents.title")}
          </span>
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("today.incidents.active")} value={active} tone={tone} />
        <Stat label={t("today.incidents.high")} value={high} tone="text-neg" />
        <Stat label={t("today.incidents.total")} value={total} />
      </div>
      <Link
        href="/posture?tab=threats"
        className="mt-4 text-[12.5px] text-ink-2 hover:text-ink-1 inline-flex items-center gap-1"
      >
        {t("today.incidents.drill")} <ArrowRight size={12} />
      </Link>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div>
      <div className="eyebrow text-[10px]">{label}</div>
      <div
        className={cn(
          "text-2xl font-semibold tabular mt-1",
          tone ?? "text-ink-1",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function QuickActionsCard({ t }: { t: ServerTranslator }) {
  return (
    <Card>
      <CardHeader title={t("today.actions.title")} />
      <ul className="space-y-1.5">
        <ActionRow
          href="/risk-register"
          icon={<Plus size={14} />}
          label={t("today.actions.addRisk")}
        />
        <ActionRow
          href="/insurance"
          icon={<ShieldCheck size={14} />}
          label={t("today.actions.updateInsurance")}
        />
        <ActionRow
          href="/board-report"
          icon={<FileText size={14} />}
          label={t("today.actions.generateBoard")}
        />
      </ul>
    </Card>
  );
}

function ActionRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 px-2.5 h-9 rounded-md text-[13px] text-ink-1 hover:bg-surface-3/60"
      >
        <span className="text-ink-3">{icon}</span>
        <span className="flex-1">{label}</span>
        <ArrowRight size={12} className="text-ink-3" />
      </Link>
    </li>
  );
}

function PinnedKpiTile({
  kpi,
  t,
}: {
  kpi: TodayPinnedKpi;
  t: ServerTranslator;
}) {
  const valueDisplay =
    kpi.current === null
      ? "—"
      : kpi.unit === "boolean"
        ? kpi.current >= 1
          ? t("today.kpi.boolYes")
          : t("today.kpi.boolNo")
        : kpi.unit === "percent"
          ? `${kpi.current.toFixed(1)}%`
          : kpi.unit === "hours"
            ? `${kpi.current.toFixed(1)}h`
            : kpi.current.toString();

  const ringTone =
    kpi.status === "met"
      ? "bg-pos"
      : kpi.status === "atRisk"
        ? "bg-warn"
        : kpi.status === "missed"
          ? "bg-neg"
          : "bg-border-strong";

  const labelText =
    kpi.pin.label || (kpi.labelKey ? t(kpi.labelKey as DictKey) : "—");

  return (
    <div className="relative rounded-lg border border-border bg-surface-2 p-4 overflow-hidden">
      <span
        aria-hidden
        className={cn("absolute start-0 top-0 bottom-0 w-[3px]", ringTone)}
      />
      <div className="eyebrow text-[10px]">{labelText}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular text-ink-1">
          {valueDisplay}
        </span>
        <span className="text-[11px] text-ink-3">
          {t("today.kpi.target")}{" "}
          {kpi.unit === "percent"
            ? `${kpi.pin.target}%`
            : kpi.unit === "hours"
              ? `${kpi.pin.target}h`
              : kpi.pin.target}
        </span>
      </div>
      {kpi.pin.commitment ? (
        <div className="text-[11px] text-ink-2 mt-2 line-clamp-2">
          {kpi.pin.commitment}
        </div>
      ) : null}
    </div>
  );
}

function ChangeFeedRow({
  event,
  t,
}: {
  event: ChangeFeedEvent;
  t: ServerTranslator;
}) {
  const Icon =
    event.direction === "up"
      ? ArrowUp
      : event.direction === "down"
        ? ArrowDown
        : Minus;
  const tone =
    event.severity === "alert"
      ? "text-neg bg-neg/10"
      : event.severity === "warn"
        ? "text-warn bg-warn/10"
        : "text-ink-2 bg-surface-3";
  const when = new Date(event.capturedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Translate using the dict.
  const headline = t(event.titleKey as DictKey, event.args);

  const Content = (
    <div className="flex items-start gap-3 py-3 px-1">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md w-8 h-8 shrink-0",
          tone,
        )}
      >
        <Icon size={14} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-ink-1">{headline}</div>
        <div className="text-[11.5px] text-ink-3 mt-0.5">{when}</div>
      </div>
      {event.href ? (
        <ArrowRight size={14} className="text-ink-3 mt-2.5" />
      ) : null}
    </div>
  );

  return (
    <li>
      {event.href ? (
        <Link
          href={event.href}
          className="block hover:bg-surface-3/40 rounded-md"
        >
          {Content}
        </Link>
      ) : (
        Content
      )}
    </li>
  );
}
