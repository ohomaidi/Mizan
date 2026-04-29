"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * 5×5 risk heat map — impact × likelihood grid where each cell
 * shows the count of risks that map to that score combination.
 * Hovering / tapping a cell reveals the title list.
 *
 * Cell colour follows the same threshold as the rating chip on the
 * register table: 1–6 green, 7–14 amber, 15–25 red. Same residual
 * rating semantics, same colours — operators read both views with
 * the same mental model.
 *
 * v2.7.0.
 */

export type HeatMapRisk = {
  id: number;
  title: string;
  impact: number;
  likelihood: number;
  residual_rating: number;
  status: string;
};

const SIZE = 5; // 5×5 matrix

function ratingTone(rating: number): "low" | "med" | "high" {
  if (rating >= 15) return "high";
  if (rating >= 7) return "med";
  return "low";
}

const TONE_BG: Record<"low" | "med" | "high" | "empty", string> = {
  low: "bg-pos/15 hover:bg-pos/25",
  med: "bg-warn/20 hover:bg-warn/30",
  high: "bg-neg/25 hover:bg-neg/35",
  empty: "bg-surface-2 hover:bg-surface-3/40",
};

const TONE_RING: Record<"low" | "med" | "high" | "empty", string> = {
  low: "ring-pos/30",
  med: "ring-warn/40",
  high: "ring-neg/40",
  empty: "ring-border",
};

export function RiskHeatMap({ risks }: { risks: HeatMapRisk[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState<{
    impact: number;
    likelihood: number;
  } | null>(null);

  // Bin risks into the 25 cells.
  const cells: HeatMapRisk[][][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [] as HeatMapRisk[]),
  );
  for (const r of risks) {
    const i = Math.max(0, Math.min(SIZE - 1, r.impact - 1));
    const l = Math.max(0, Math.min(SIZE - 1, r.likelihood - 1));
    cells[i][l].push(r);
  }

  // Top-down rows (impact 5 → 1) so the high-risk corner is top-right.
  const rows = Array.from({ length: SIZE }, (_, i) => SIZE - i);

  const activeCell =
    active &&
    cells[active.impact - 1][active.likelihood - 1]
      ? cells[active.impact - 1][active.likelihood - 1]
      : [];

  return (
    <div className="p-5">
      <div className="flex flex-col-reverse md:flex-row gap-5">
        {/* Matrix */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11.5px] uppercase tracking-[0.06em] text-ink-3 w-24">
              {t("risk.heat.impact")}
            </div>
          </div>
          <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1">
            <div></div>
            {[1, 2, 3, 4, 5].map((l) => (
              <div
                key={`xh-${l}`}
                className="text-center text-[10.5px] tabular text-ink-3 font-semibold"
              >
                {l}
              </div>
            ))}
            {rows.map((impact) => (
              // For each impact row, render the row label + 5 cells.
              <RowFragment
                key={`r-${impact}`}
                impact={impact}
                cells={cells}
                active={active}
                onClick={(impact, likelihood) =>
                  setActive((prev) =>
                    prev?.impact === impact && prev?.likelihood === likelihood
                      ? null
                      : { impact, likelihood },
                  )
                }
              />
            ))}
            <div></div>
            <div className="col-span-5 text-center text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mt-1">
              {t("risk.heat.likelihood")}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="md:w-[280px] shrink-0">
          {active ? (
            <div className="rounded-md border border-border bg-surface-1 p-4">
              <div className="text-[11.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
                {t("risk.heat.cell", {
                  impact: active.impact,
                  likelihood: active.likelihood,
                })}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular text-ink-1">
                {activeCell.length}
              </div>
              <div className="text-[11px] text-ink-3 mb-3">
                {t("risk.heat.cellSub", {
                  rating: active.impact * active.likelihood,
                })}
              </div>
              {activeCell.length === 0 ? (
                <div className="text-[12px] text-ink-3">
                  {t("risk.heat.empty")}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {activeCell.slice(0, 8).map((r) => (
                    <li
                      key={r.id}
                      className="text-[12px] text-ink-1 leading-snug"
                    >
                      <span className="text-ink-3 me-1">·</span>
                      {r.title}
                    </li>
                  ))}
                  {activeCell.length > 8 ? (
                    <li className="text-[11px] text-ink-3 italic mt-1">
                      {t("risk.heat.more", { n: activeCell.length - 8 })}
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-[12px] text-ink-3">
              {t("risk.heat.tip")}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-pos/40" />
          {t("risk.heat.legend.low")} (1–6)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-warn/40" />
          {t("risk.heat.legend.med")} (7–14)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-neg/40" />
          {t("risk.heat.legend.high")} (15–25)
        </span>
      </div>
    </div>
  );
}

function RowFragment({
  impact,
  cells,
  active,
  onClick,
}: {
  impact: number;
  cells: HeatMapRisk[][][];
  active: { impact: number; likelihood: number } | null;
  onClick: (impact: number, likelihood: number) => void;
}) {
  return (
    <>
      <div className="text-[10.5px] tabular text-ink-3 font-semibold flex items-center justify-center w-8">
        {impact}
      </div>
      {[1, 2, 3, 4, 5].map((likelihood) => {
        const list = cells[impact - 1][likelihood - 1];
        const rating = impact * likelihood;
        const tone = list.length === 0 ? "empty" : ratingTone(rating);
        const isActive =
          active?.impact === impact && active?.likelihood === likelihood;
        return (
          <button
            type="button"
            key={`c-${impact}-${likelihood}`}
            onClick={() => onClick(impact, likelihood)}
            className={`aspect-square rounded-md flex items-center justify-center text-[15px] font-semibold tabular transition-colors ring-1 ${
              TONE_BG[tone]
            } ${TONE_RING[tone]} ${
              isActive ? "ring-2 ring-council-strong" : ""
            }`}
            aria-label={`Impact ${impact} likelihood ${likelihood}, ${list.length} risks`}
          >
            {list.length || ""}
          </button>
        );
      })}
    </>
  );
}
