"use client";

import { useEffect, useState } from "react";
import { Target, Plus, Trash2, Loader2, Wand2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CustomKpiBuilderModal } from "@/components/scorecard/CustomKpiBuilderModal";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import type { DictKey } from "@/lib/i18n/dict";

/**
 * CISO scorecard — pinned KPIs vs board commitments. v2.6.0.
 *
 * Top of page: 1-3 row grid of pinned KPI tiles, each showing
 * current vs target + commitment + status (green met / amber atRisk
 * / red missed / grey unknown).
 *
 * Below: empty-state when nothing pinned, plus "Pin a KPI" button
 * that opens a picker modal listing the 10 catalog KPIs.
 */

type CatalogEntry = {
  kind: string;
  labelKey: string;
  descriptionKey: string;
  defaultTarget: number;
  unit: "percent" | "count" | "hours" | "boolean";
  direction: "higherBetter" | "lowerBetter";
  /** v2.7.0 — custom (operator-authored) KPIs use the labelKey /
   *  descriptionKey fields as raw human strings, not dict keys. */
  isCustom?: boolean;
};

type Pin = {
  id: number;
  kpi_kind: string;
  label: string;
  target: number;
  commitment: string | null;
  due_date: string | null;
  owner: string | null;
  pinned_at: string;
  direction: "higherBetter" | "lowerBetter";
  unit: "percent" | "count" | "hours" | "boolean";
  current: number | null;
  status: "onTrack" | "atRisk" | "met" | "missed" | "unknown";
};

export default function ScorecardPage() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [data, setData] = useState<{ catalog: CatalogEntry[]; pins: Pin[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetch("/api/scorecard", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { catalog: CatalogEntry[]; pins: Pin[] };
      setData(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onUnpin = async (id: number) => {
    setBusyId(id);
    try {
      await fetch(`/api/scorecard/pins/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">
            <Target size={11} className="inline -mt-0.5 me-1" />
            {t("scorecard.eyebrow")}
          </div>
          <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
            {t("scorecard.title")}
          </h1>
          <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">
            {t("scorecard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* v2.7.0 — operator-defined custom KPI builder. */}
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border text-ink-1 text-[12.5px] font-medium hover:bg-surface-3"
          >
            <Wand2 size={14} />
            {t("scorecard.customKpi")}
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
          >
            <Plus size={14} />
            {t("scorecard.pinKpi")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12.5px] text-ink-1">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-[12.5px] text-ink-3">{t("state.loading")}</div>
      ) : !data || data.pins.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Target
              size={32}
              className="mx-auto text-ink-3 mb-3"
              strokeWidth={1.5}
            />
            <div className="text-[14px] font-semibold text-ink-1 mb-1">
              {t("scorecard.empty.title")}
            </div>
            <p className="text-[12.5px] text-ink-2 max-w-xl mx-auto leading-relaxed">
              {t("scorecard.empty.body")}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.pins.map((p) => (
            <KpiTile
              key={p.id}
              pin={p}
              busy={busyId === p.id}
              onUnpin={() => onUnpin(p.id)}
            />
          ))}
        </div>
      )}

      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalog={data?.catalog ?? []}
        pinned={new Set((data?.pins ?? []).map((p) => p.kpi_kind))}
        onPinned={async () => {
          setPickerOpen(false);
          await load();
        }}
      />

      <CustomKpiBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={async () => {
          // Custom KPIs land in the catalog; the picker is the same
          // place to pin them so we just refresh.
          await load();
        }}
      />
    </div>
  );
}

function KpiTile({
  pin,
  busy,
  onUnpin,
}: {
  pin: Pin;
  busy: boolean;
  onUnpin: () => void;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const tone =
    pin.status === "met"
      ? "border-pos/40 bg-pos/[0.04]"
      : pin.status === "atRisk"
        ? "border-warn/40 bg-warn/[0.04]"
        : pin.status === "missed"
          ? "border-neg/40 bg-neg/[0.04]"
          : "border-border bg-surface-2";
  const valueTone =
    pin.status === "met"
      ? "text-pos"
      : pin.status === "atRisk"
        ? "text-warn"
        : pin.status === "missed"
          ? "text-neg"
          : "text-ink-2";
  const unitSuffix =
    pin.unit === "percent"
      ? "%"
      : pin.unit === "hours"
        ? "h"
        : pin.unit === "boolean"
          ? ""
          : "";
  return (
    <div className={`rounded-lg border p-4 relative ${tone}`}>
      <button
        type="button"
        onClick={onUnpin}
        disabled={busy}
        className="absolute top-2 end-2 h-6 w-6 grid place-items-center text-ink-3 hover:text-neg disabled:opacity-50"
        aria-label={t("scorecard.unpin")}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
      <div className="text-[11px] uppercase tracking-[0.06em] text-ink-3 pe-7">
        {pin.label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-[36px] leading-none font-semibold tabular ${valueTone}`}>
          {pin.current === null
            ? "—"
            : pin.unit === "boolean"
              ? pin.current >= 1
                ? "✓"
                : "✗"
              : fmt(pin.current)}
        </span>
        {pin.unit !== "boolean" && pin.current !== null ? (
          <span className="text-[14px] text-ink-3 tabular">{unitSuffix}</span>
        ) : null}
      </div>
      <div className="mt-2 text-[11px] text-ink-3 tabular">
        {t("scorecard.tile.target", {
          target: fmt(pin.target),
          unit: unitSuffix,
        })}{" "}
        ·{" "}
        <span
          className={`uppercase tracking-[0.05em] font-semibold ${valueTone}`}
        >
          {t(`scorecard.status.${pin.status}` as DictKey)}
        </span>
      </div>
      {pin.commitment ? (
        <div className="mt-2 text-[11px] text-ink-2 leading-relaxed line-clamp-2">
          {pin.commitment}
        </div>
      ) : null}
    </div>
  );
}

function PickerModal({
  open,
  onClose,
  catalog,
  pinned,
  onPinned,
}: {
  open: boolean;
  onClose: () => void;
  catalog: CatalogEntry[];
  pinned: Set<string>;
  onPinned: () => void;
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState<string | null>(null);

  const onPick = async (entry: CatalogEntry) => {
    setPicking(entry.kind);
    try {
      // Custom KPIs ship the literal label inline; built-ins use a
      // dict key that we translate. The pin row gets a stable
      // human label either way.
      const label = entry.isCustom
        ? entry.labelKey
        : t(entry.labelKey as DictKey);
      await fetch("/api/scorecard/pins", {
        method: "POST",
        body: JSON.stringify({
          kpiKind: entry.kind,
          label,
          target: entry.defaultTarget,
        }),
      });
      onPinned();
    } finally {
      setPicking(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("scorecard.picker.title")}
      size="wide"
    >
      <div className="text-[12.5px] text-ink-2 mb-4 leading-relaxed">
        {t("scorecard.picker.subtitle")}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {catalog.map((entry) => {
          const already = pinned.has(entry.kind);
          return (
            <li
              key={entry.kind}
              className={`rounded-md border p-3 ${already ? "border-border opacity-50" : "border-border bg-surface-1 hover:bg-surface-3 cursor-pointer"}`}
              onClick={() => {
                if (!already) onPick(entry);
              }}
            >
              <div className="text-[12.5px] font-semibold text-ink-1 inline-flex items-center gap-1.5">
                {entry.isCustom
                  ? entry.labelKey
                  : t(entry.labelKey as DictKey)}
                {entry.isCustom ? (
                  <span className="text-[9.5px] uppercase tracking-[0.06em] text-council-strong bg-council-strong/10 rounded px-1.5 py-0.5">
                    {t("scorecard.picker.custom")}
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-ink-3 leading-relaxed mt-1">
                {entry.isCustom
                  ? entry.descriptionKey || ""
                  : t(entry.descriptionKey as DictKey)}
              </div>
              <div className="text-[10.5px] text-ink-3 tabular mt-1">
                {t("scorecard.picker.defaultTarget", {
                  target: String(entry.defaultTarget),
                  unit:
                    entry.unit === "percent"
                      ? "%"
                      : entry.unit === "hours"
                        ? "h"
                        : "",
                })}
              </div>
              {already ? (
                <div className="mt-2 text-[10px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
                  {t("scorecard.picker.alreadyPinned")}
                </div>
              ) : picking === entry.kind ? (
                <div className="mt-2 text-[11px] text-council-strong">
                  <Loader2 className="inline animate-spin" size={11} /> Pinning…
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
