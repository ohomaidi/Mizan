"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { CLUSTERS } from "@/lib/data/clusters";
import type { EntityRow } from "@/lib/compute/aggregate";

const BELOW = "#EF4444";
const AT = "#D4A24C";
const ABOVE = "#14B8A6";

function colorFor(value: number, target: number) {
  if (value < target) return BELOW;
  if (value < target + 5) return AT;
  return ABOVE;
}

type SortMode = "maturityHigh" | "maturityLow" | "name";

// Per-bar horizontal footprint. Wide enough for a ~20-character rotated label
// without colliding with the neighbor's label. Always-angled so the chart reads
// cleanly even with longer entity names. Beyond ~10 entities the chart needs to
// scroll — the min-width below forces horizontal overflow.
const BAR_WIDTH_PX = 110;
const CHART_HEIGHT = 380;
const LEFT_PAD = 48; // axis label column
const RIGHT_PAD = 20;

export function EntityBarChart({
  entities,
  target,
}: {
  entities: EntityRow[];
  target: number;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const fmt = useFmtNum();
  const [sort, setSort] = useState<SortMode>("maturityHigh");

  const rows = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    const scoped = entities.filter((e) => e.maturity.hasData);
    const sorted = [...scoped];
    if (sort === "maturityHigh") {
      sorted.sort((a, b) => b.maturity.index - a.maturity.index);
    } else if (sort === "maturityLow") {
      sorted.sort((a, b) => a.maturity.index - b.maturity.index);
    } else {
      sorted.sort((a, b) => {
        const an = locale === "ar" ? a.nameAr : a.nameEn;
        const bn = locale === "ar" ? b.nameAr : b.nameEn;
        return collator.compare(an, bn);
      });
    }
    return sorted.map((e) => {
      const cluster = CLUSTERS.find((c) => c.id === e.cluster);
      return {
        id: e.id,
        name: locale === "ar" ? e.nameAr : e.nameEn,
        shortName: shortenName(locale === "ar" ? e.nameAr : e.nameEn),
        clusterLabel: cluster
          ? locale === "ar"
            ? cluster.labelAr
            : cluster.labelShort
          : e.cluster,
        value: Math.round(e.maturity.index * 10) / 10,
      };
    });
  }, [entities, sort, locale]);

  // Ensure the chart is always at least `BAR_WIDTH_PX * 8` wide so short lists still
  // look intentional; beyond that, it grows linearly and the parent's overflow-x-auto
  // triggers horizontal scroll.
  const minChartWidth = Math.max(
    8 * BAR_WIDTH_PX,
    LEFT_PAD + RIGHT_PAD + rows.length * BAR_WIDTH_PX,
  );

  const pills: Array<{ id: SortMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: "maturityHigh", label: t("chart.sort.maturityHigh"), icon: ArrowDown },
    { id: "maturityLow", label: t("chart.sort.maturityLow"), icon: ArrowUp },
    { id: "name", label: t("chart.sort.name"), icon: ArrowUpDown },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {pills.map((p) => {
          const active = sort === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setSort(p.id)}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                active
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              <Icon size={11} />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto" style={{ direction: "ltr" }}>
        <div style={{ height: CHART_HEIGHT, minWidth: minChartWidth }}>
          <BarChart
            width={minChartWidth}
            height={CHART_HEIGHT}
            data={rows}
            margin={{ top: 28, right: RIGHT_PAD, bottom: 8, left: -8 }}
          >
            <CartesianGrid strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="shortName"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: "var(--ink-2)" }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={96}
              dy={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => fmt(v as number)}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ink-1)",
              }}
              labelStyle={{ color: "var(--ink-2)" }}
              formatter={(v) => [fmt(Number(v)), t("kpi.maturityIndex")] as [string, string]}
              labelFormatter={(_label, items) => {
                const it = Array.isArray(items) && items[0] ? items[0] : null;
                const p = (it as { payload?: { name: string; clusterLabel: string } } | null)?.payload;
                if (!p) return String(_label);
                return `${p.name} · ${p.clusterLabel}`;
              }}
            />
            <ReferenceLine
              y={target}
              stroke="var(--accent)"
              strokeDasharray="4 4"
              label={{
                value: t("chart.clusters.targetLabel", { target: fmt(target) }),
                position: "insideTopLeft",
                fill: "var(--accent)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: locale === "ar" ? 0 : 1.2,
              }}
            />
            <Bar
              dataKey="value"
              radius={[5, 5, 0, 0]}
              barSize={52}
              onClick={(payload: { id?: string } | undefined) => {
                if (payload?.id) router.push(`/entities/${payload.id}`);
              }}
              style={{ cursor: "pointer" }}
              label={{
                position: "top",
                fill: "var(--ink-1)",
                fontSize: 11,
                fontWeight: 600,
                formatter: (v) => fmt(Number(v)),
              }}
            >
              {rows.map((d) => (
                <Cell
                  key={d.id}
                  fill={colorFor(d.value, target)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>
    </div>
  );
}

/** Shorten long entity names for X-axis labels. Keeps the first words that fit in ~18 chars
 *  so rotated labels at 35° stay inside the allotted axis height without overlapping the
 *  neighbouring bar. Names shorter than the limit pass through unchanged. */
function shortenName(name: string): string {
  const collapsed = name.replace(/\s+/g, " ").trim();
  const LIMIT = 18;
  if (collapsed.length <= LIMIT) return collapsed;
  const words = collapsed.split(" ");
  const out: string[] = [];
  let len = 0;
  for (const w of words) {
    if (len + w.length + 1 > LIMIT) break;
    out.push(w);
    len += w.length + 1;
  }
  return out.length > 0 ? out.join(" ") + "…" : collapsed.slice(0, LIMIT - 1) + "…";
}
