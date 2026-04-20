"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useRouter } from "next/navigation";
import type { Cluster } from "@/lib/data/clusters";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";

const BELOW = "#EF4444";
const AT = "#D4A24C";
const ABOVE = "#14B8A6";

function colorFor(value: number, target: number) {
  if (value < target) return BELOW;
  if (value < target + 5) return AT;
  return ABOVE;
}

export function ClusterBarChart({
  clusters,
  target,
}: {
  clusters: Cluster[];
  target: number;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const fmt = useFmtNum();

  const data = clusters.map((c) => ({
    id: c.id,
    name: locale === "ar" ? c.labelAr : c.labelShort,
    value: c.index,
  }));

  const targetLabel = t("chart.clusters.targetLabel", { target: fmt(target) });

  return (
    <div className="h-[320px] w-full" style={{ direction: "ltr" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 28, right: 12, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fontSize: 12 }}
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
          />
          <ReferenceLine
            y={target}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            label={{
              value: targetLabel,
              position: "insideTopLeft",
              fill: "var(--accent)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: locale === "ar" ? 0 : 1.2,
            }}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            barSize={44}
            style={{ cursor: "pointer" }}
            label={{
              position: "top",
              fill: "var(--ink-1)",
              fontSize: 12,
              fontWeight: 600,
              formatter: (v) => fmt(Number(v)),
            }}
          >
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={colorFor(d.value, target)}
                onClick={() => router.push(`/entities?cluster=${d.id}`)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
