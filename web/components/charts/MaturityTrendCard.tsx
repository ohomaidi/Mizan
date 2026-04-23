"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import type { DictKey } from "@/lib/i18n/dict";

type Range = "7d" | "30d" | "90d" | "all";
type Granularity = "daily" | "weekly" | "monthly";

type SeriesPoint = {
  date: string;
  overall: number;
  secureScore: number;
  identity: number;
  device: number;
  data: number;
  threat: number;
  compliance: number;
  delta: number;
};

type TrendPayload = {
  tenantId: string;
  range: Range;
  granularity: Granularity;
  series: SeriesPoint[];
  summary: {
    deltaOverall: number;
    direction: "up" | "down" | "flat";
    first: SeriesPoint | null;
    last: SeriesPoint | null;
  };
};

type SubScoreKey =
  | "secureScore"
  | "identity"
  | "device"
  | "data"
  | "threat"
  | "compliance";

const SUB_SCORE_COLORS: Record<SubScoreKey, string> = {
  secureScore: "#6366F1", // indigo
  identity: "#14B8A6", // teal
  device: "#F59E0B", // amber
  data: "#EC4899", // pink
  threat: "#EF4444", // red
  compliance: "#8B5CF6", // purple
};

// NOTE: the CSS variable is `--council-primary-strong`, NOT `--council-strong`.
// Recharts embeds this string as the SVG `stroke` / `fill` attribute — when
// `var()` fails to resolve, the browser falls back to default black (line
// invisible on dark theme) and dots render without their intended color.
// Keep this in sync with globals.css.
const OVERALL_COLOR = "var(--council-primary-strong)";

export function MaturityTrendCard({
  tenantId,
  target,
}: {
  tenantId: string;
  target: number;
}) {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();

  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<TrendPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<SubScoreKey, boolean>>({
    secureScore: false,
    identity: false,
    device: false,
    data: false,
    threat: false,
    compliance: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/maturity-trend?range=${range}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as TrendPayload);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const formattedSeries = useMemo(() => {
    if (!data) return [];
    return data.series.map((p) => ({
      ...p,
      label: formatXLabel(p.date, data.granularity, locale),
    }));
  }, [data, locale]);

  const pills: Array<{ id: Range; label: string }> = [
    { id: "7d", label: t("trend.range.7d") },
    { id: "30d", label: t("trend.range.30d") },
    { id: "90d", label: t("trend.range.90d") },
    { id: "all", label: t("trend.range.all") },
  ];

  const subScorePills: Array<{ key: SubScoreKey; label: string }> = [
    { key: "secureScore", label: t("maturity.sub.secureScore") },
    { key: "identity", label: t("maturity.sub.identity") },
    { key: "device", label: t("maturity.sub.device") },
    { key: "data", label: t("maturity.sub.data") },
    { key: "threat", label: t("maturity.sub.threat") },
    { key: "compliance", label: t("maturity.sub.compliance") },
  ];

  // ---- empty states ----

  if (loading && !data) {
    return (
      <Card>
        <CardHeader
          title={t("trend.title")}
          subtitle={t("trend.subtitle")}
        />
        <div className="h-[280px] flex items-center justify-center text-ink-3 text-[12.5px] gap-2">
          <Loader2 size={14} className="animate-spin" />
          {t("state.loading")}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader
          title={t("trend.title")}
          subtitle={t("trend.subtitle")}
        />
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[13px] text-ink-1">
          {error}
        </div>
      </Card>
    );
  }

  if (!data || data.series.length === 0) {
    return (
      <Card>
        <CardHeader
          title={t("trend.title")}
          subtitle={t("trend.subtitle")}
        />
        <div className="h-[200px] flex flex-col items-center justify-center text-ink-3 text-[12.5px] gap-2">
          <span>{t("trend.empty.title")}</span>
          <span className="text-[11.5px]">{t("trend.empty.body")}</span>
        </div>
      </Card>
    );
  }

  const { summary } = data;
  const deltaChip =
    summary.direction === "up"
      ? { icon: ArrowUp, color: "text-pos", bg: "bg-pos/10 border-pos/40" }
      : summary.direction === "down"
        ? { icon: ArrowDown, color: "text-neg", bg: "bg-neg/10 border-neg/40" }
        : { icon: Minus, color: "text-ink-3", bg: "bg-surface-2 border-border" };
  const DeltaIcon = deltaChip.icon;

  return (
    <Card>
      <CardHeader
        title={t("trend.title")}
        subtitle={t("trend.subtitle")}
      />

      {/* Top row: range pills + delta chip */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-1.5">
          {pills.map((p) => {
            const active = range === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`inline-flex items-center h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                  active
                    ? "bg-surface-3 text-ink-1 border-border-strong"
                    : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div
          className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[11.5px] ${deltaChip.bg}`}
        >
          <DeltaIcon size={11} className={deltaChip.color} />
          <span className={`${deltaChip.color} font-semibold tabular`}>
            {summary.deltaOverall >= 0 ? "+" : ""}
            {fmt(summary.deltaOverall)}
          </span>
          <span className="text-ink-3">{t(`trend.overSpan.${range}`)}</span>
        </div>
      </div>

      {/* Sub-score toggle pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className="text-[11px] text-ink-3 uppercase tracking-wide me-1">
          {t("trend.overlay")}
        </span>
        {subScorePills.map((p) => {
          const active = visible[p.key];
          const color = SUB_SCORE_COLORS[p.key];
          return (
            <button
              key={p.key}
              onClick={() =>
                setVisible((v) => ({ ...v, [p.key]: !v[p.key] }))
              }
              className={`inline-flex items-center gap-1.5 h-6 px-2 text-[11px] rounded border transition-colors ${
                active
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-3 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: color, opacity: active ? 1 : 0.4 }}
              />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* The chart */}
      <div style={{ direction: "ltr", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedSeries}
            margin={{ top: 10, right: 16, bottom: 0, left: -12 }}
          >
            <CartesianGrid strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--ink-3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: "var(--ink-3)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmt(v as number)}
              width={34}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeDasharray: "2 4" }}
              contentStyle={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ink-1)",
              }}
              labelStyle={{ color: "var(--ink-2)" }}
              formatter={(value, name) =>
                [fmt(Number(value)), labelFor(String(name), t)] as [string, string]
              }
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <ReferenceLine
              y={target}
              stroke="var(--accent)"
              strokeDasharray="4 4"
              label={{
                value: t("chart.clusters.targetLabel", { target: fmt(target) }),
                position: "insideTopRight",
                fill: "var(--accent)",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Sub-score lines (opt-in) */}
            {subScorePills.map((p) =>
              visible[p.key] ? (
                <Line
                  key={p.key}
                  type="monotone"
                  dataKey={p.key}
                  stroke={SUB_SCORE_COLORS[p.key]}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name={p.key}
                />
              ) : null,
            )}

            {/* Overall — drawn last so it's on top */}
            <Line
              type="monotone"
              dataKey="overall"
              stroke={OVERALL_COLOR}
              strokeWidth={2.25}
              dot={{ r: 2.5, fill: OVERALL_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              name="overall"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-ink-3 mt-3 flex items-center justify-between">
        <span>
          {t("trend.points", { count: fmt(data.series.length) })} ·{" "}
          {t(`trend.granularity.${data.granularity}`)}
        </span>
        {summary.last ? (
          <span>
            {t("trend.latest")}:{" "}
            <span className="text-ink-2 font-medium">
              {fmt(summary.last.overall)}
            </span>
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/** Tooltip name lookup — matches dict keys. */
function labelFor(
  name: string,
  t: (k: DictKey, params?: Record<string, string | number>) => string,
): string {
  const k = name as SubScoreKey | "overall";
  if (k === "overall") return t("trend.series.overall");
  return t(`maturity.sub.${k}` as DictKey);
}

function formatXLabel(
  iso: string,
  granularity: Granularity,
  locale: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat(locale, {
      year: "2-digit",
      month: "short",
    }).format(d);
  }
  if (granularity === "weekly") {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(d);
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(d);
}
