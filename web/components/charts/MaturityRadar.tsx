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
import { useTheme } from "@/lib/theme/ThemeProvider";

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

// v2.7.7 — split fallbacks per theme. Bright palette for dark
// canvas, deeper palette for white canvas. Used only when the
// caller doesn't pass an explicit `color` on the series.
const FALLBACK_COLORS_DARK = [
  "#f8c022", // gold
  "#3b82f6", // blue
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ef4444", // red
  "#22c55e", // green
];
const FALLBACK_COLORS_LIGHT = [
  "#0d9488", // teal
  "#1f6feb", // blue
  "#7c3aed", // purple
  "#0891b2", // cyan
  "#dc2626", // red
  "#16a34a", // green
];

// v2.7.7 — concrete hex palettes per theme. Recharts injects stroke /
// fill into SVG attributes; CSS custom properties via `var()` work in
// modern browsers, but not consistently when recharts memoises the
// chart (some paths get the variable, the parent container doesn't,
// CSS-var inheritance breaks). Using literal hex tied to the active
// theme is bulletproof — colours always match what the user sees.
const PALETTE_DARK = {
  grid: "#3a4a6e",
  tick: "#cbd5e1",
  tickFaint: "#94a3b8",
  surface: "#131a2a",
  border: "#334261",
  ink1: "#f5f7fa",
  fallbackSeries: "#f8c022", // bright gold — readable on any dark background
};
const PALETTE_LIGHT = {
  grid: "#cbd5e1",
  tick: "#475569",
  tickFaint: "#94a3b8",
  surface: "#ffffff",
  border: "#c4ccd9",
  ink1: "#0b1220",
  fallbackSeries: "#0d9488", // teal — readable on white
};

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
  const { theme } = useTheme();
  const palette = theme === "light" ? PALETTE_LIGHT : PALETTE_DARK;

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
          {/* v2.7.7 — concrete hex from the active-theme palette.
              Earlier var(--chart-*) attempts didn't reliably reach
              recharts-injected SVG attributes; switching to literal
              hex tied to useTheme() guarantees the lift. */}
          <PolarGrid stroke={palette.grid} strokeWidth={1} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fontSize: 11.5,
              fill: palette.tick,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{
              fontSize: 9,
              fill: palette.tickFaint,
            }}
            tickCount={5}
            stroke={palette.grid}
          />
          <Tooltip
            contentStyle={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: palette.ink1,
            }}
            formatter={(v) => (typeof v === "number" ? `${v}%` : String(v ?? ""))}
          />
          {series.map((s, i) => {
            // Dark brand accents (DEWA teal, Etisalat plum, DA navy)
            // are too dark on the dark canvas. When the caller supplies
            // a brand color AND we're in dark mode, lighten it via the
            // palette fallback below — keeps the polygon visible while
            // still tinted toward the brand. Light mode uses brand color
            // verbatim (it's readable on white).
            const explicit = s.color;
            const usingFallbackPalette = !explicit;
            const color =
              explicit ??
              (theme === "light"
                ? FALLBACK_COLORS_LIGHT[i % FALLBACK_COLORS_LIGHT.length]
                : FALLBACK_COLORS_DARK[i % FALLBACK_COLORS_DARK.length]);
            void usingFallbackPalette;
            return (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={color}
                fill={color}
                fillOpacity={s.dashed ? 0 : 0.32}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                strokeWidth={2.5}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
