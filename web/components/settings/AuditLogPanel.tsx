"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Loader2, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { useFmtRelative } from "@/lib/i18n/time";
import { api } from "@/lib/api/client";

type Row = {
  tenant_id: string;
  endpoint: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  call_count_24h: number;
  throttle_count_24h: number;
  updated_at: string;
  nameEn: string;
  nameAr: string;
  cluster: string | null;
  tenantGuid: string | null;
  isDemo: boolean;
};

type Filter = "all" | "ok" | "errors" | "throttled";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; rows: Row[] };

export function AuditLogPanel() {
  const { t, locale } = useI18n();
  const fmt = useFmtNum();
  const fmtRelative = useFmtRelative();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const r = await api.getAuditLog();
      setState({ kind: "ready", rows: r.rows });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setBusy(true);
    await load();
    setBusy(false);
  };

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [] as Row[];
    const q = search.trim().toLowerCase();
    return state.rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.nameEn.toLowerCase().includes(q) ||
        r.nameAr.toLowerCase().includes(q) ||
        r.endpoint.toLowerCase().includes(q) ||
        (r.last_error_message ?? "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filter === "all") return true;
      if (filter === "ok") return !r.last_error_at && r.call_count_24h > 0;
      if (filter === "errors") return !!r.last_error_at;
      if (filter === "throttled") return r.throttle_count_24h > 0;
      return true;
    });
  }, [state, search, filter]);

  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "error") return <ErrorState message={state.message} onRetry={load} />;
  if (state.rows.length === 0) {
    return (
      <Card>
        <CardHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />
        <div className="text-ink-3 text-[13px] py-10 text-center">{t("audit.empty")}</div>
      </Card>
    );
  }

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: t("audit.filter.all") },
    { id: "ok", label: t("audit.filter.ok") },
    { id: "errors", label: t("audit.filter.errors") },
    { id: "throttled", label: t("audit.filter.throttled") },
  ];

  return (
    <Card className="p-0">
      <div className="p-5 border-b border-border">
        <CardHeader
          title={t("audit.title")}
          subtitle={t("audit.subtitle")}
          right={
            <button
              onClick={onRefresh}
              disabled={busy}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 hover:bg-surface-3 text-[12.5px] disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {t("audit.refresh")}
            </button>
          }
        />
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2 h-8 px-3 rounded-md bg-surface-1 border border-border text-ink-2 text-[12.5px] flex-1 max-w-[360px]">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none flex-1 placeholder:text-ink-3 text-ink-1"
            placeholder={t("audit.search")}
          />
        </div>
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`h-7 px-2.5 text-[11.5px] rounded-md border transition-colors ${
                filter === f.id
                  ? "bg-surface-3 text-ink-1 border-border-strong"
                  : "text-ink-2 border-border hover:text-ink-1 hover:bg-surface-3"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="text-[12px] text-ink-3 tabular">
          {t("audit.showing", {
            shown: fmt(filtered.length),
            total: fmt(state.rows.length),
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em]">
              <th className="py-2.5 ps-5 text-start font-semibold">{t("audit.col.entity")}</th>
              <th className="py-2.5 text-start font-semibold">{t("audit.col.endpoint")}</th>
              <th className="py-2.5 text-start font-semibold">{t("audit.col.lastSuccess")}</th>
              <th className="py-2.5 text-start font-semibold">{t("audit.col.lastError")}</th>
              <th className="py-2.5 text-end font-semibold">{t("audit.col.calls")}</th>
              <th className="py-2.5 pe-5 text-end font-semibold">{t("audit.col.throttled")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={`${r.tenant_id}-${r.endpoint}`}
                className="border-t border-border hover:bg-surface-3/40"
              >
                <td className="ps-5 py-2.5">
                  <div className="text-ink-1">
                    {locale === "ar" ? r.nameAr : r.nameEn}
                    {r.isDemo ? (
                      <span className="text-[9.5px] uppercase tracking-[0.08em] border border-accent/50 text-accent rounded px-1.5 py-px font-semibold ms-1.5">
                        demo
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-ink-3 keep-ltr tabular">{r.tenantGuid}</div>
                </td>
                <td className="py-2.5 text-ink-2 keep-ltr">{r.endpoint}</td>
                <td className="py-2.5 text-ink-2 tabular">
                  {r.last_success_at ? fmtRelative(r.last_success_at) : "—"}
                </td>
                <td className="py-2.5 max-w-[280px]">
                  {r.last_error_at ? (
                    <div>
                      <div className="text-neg tabular text-[12px]">
                        {fmtRelative(r.last_error_at)}
                      </div>
                      <div className="text-[11.5px] text-ink-3 truncate">
                        {r.last_error_message ?? ""}
                      </div>
                    </div>
                  ) : (
                    <span className="text-pos">✓</span>
                  )}
                </td>
                <td className="py-2.5 text-end tabular">{fmt(r.call_count_24h)}</td>
                <td className="py-2.5 pe-5 text-end tabular">
                  {r.throttle_count_24h > 0 ? (
                    <span className="text-warn">{fmt(r.throttle_count_24h)}</span>
                  ) : (
                    <span className="text-ink-3">{fmt(0)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
