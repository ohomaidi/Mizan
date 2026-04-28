"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Six-axis radar chart for the Maturity sub-score profile. The six axes
 * correspond 1:1 with `SubScores` from `lib/compute/maturity.ts`:
 * Secure Score / Identity / Device / Data / Threat / Compliance.
 *
 * Two render modes:
 *   - Single series — one polygon (e.g. an entity's own posture vs target).
 *   - Multi series — overlay of polygons (e.g. cluster comparison on the
 *     Council-wide /maturity page).
 *
 * v2.5.34 — primary visualization for DESC's per-entity posture
 * conversation. Designed to pair with the existing 6-sub-score weight
 * configuration so a glance at the radar tells operators where each
 * entity is strong vs weak across every dimension that drives the
 * Maturity Index.
 */

export type MaturityRadarSeries = {
  /** Display label (used in legend + tooltip). */
  name: string;
  /** Six sub-score values, each clamped to 0..100. */
  scores: {
    secureScore: number;
    identity: number;
    device: number;
    data: number;
    threat: number;
    compliance: number;
  };
  /** Polygon stroke + fill color. Falls back to council strong if absent. */
  color?: string;
  /** Render this series as a dashed reference line (e.g. target). */
  dashed?: boolean;
};

const FALLBACK_COLORS = [
  "var(--council-strong, #b8860b)",
  "#1f6feb",
  "#9333ea",
  "#0891b2",
  "#dc2626",
  "#16a34a",
];

export function MaturityRadar({
  series,
  height = 320,
  ariaLabel,
}: {
  series: MaturityRadarSeries[];
  height?: number;
  ariaLabel?: string;
}) {
  const { t } = useI18n();

  const data = useMemo(() => {
    const axes: Array<{ key: keyof MaturityRadarSeries["scores"]; labelKey: string }> = [
      { key: "secureScore", labelKey: "maturity.sub.secureScore" },
      { key: "identity", labelKey: "maturity.sub.identity" },
      { key: "device", labelKey: "maturity.sub.device" },
      { key: "data", labelKey: "maturity.sub.data" },
      { key: "threat", labelKey: "maturity.sub.threat" },
      { key: "compliance", labelKey: "maturity.sub.compliance" },
    ];
    return axes.map((a) => {
      const row: Record<string, number | string> = {
        axis: t(a.labelKey as Parameters<typeof t>[0]),
      };
      for (const s of series) {
        row[s.name] = Math.max(0, Math.min(100, Math.round(s.scores[a.key])));
      }
      return row;
    });
  }, [series, t]);

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? t("radar.ariaLabel")}
      style={{ width: "100%", height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--border, #2a2a2a)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: "var(--ink-2, #a0a0a0)" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--ink-3, #6a6a6a)" }}
            tickCount={5}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2, #1a1a1a)",
              border: "1px solid var(--border, #2a2a2a)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--ink-1, #fff)",
            }}
            formatter={(v) => (typeof v === "number" ? `${v}%` : String(v ?? ""))}
          />
          {series.map((s, i) => {
            const color = s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            return (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={color}
                fill={color}
                fillOpacity={s.dashed ? 0 : 0.2}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                strokeWidth={2}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
