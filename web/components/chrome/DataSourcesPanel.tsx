"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

const SOURCES = [
  { name: "Secure Score", detailKey: "ds.secureScore.detail" as const, status: "green" },
  { name: "Defender", detailKey: "ds.defender.detail" as const, status: "green" },
  { name: "Purview", detailKey: "ds.purview.detail" as const, status: "amber" },
  { name: "Entra ID", detailKey: "ds.entra.detail" as const, status: "green" },
  { name: "Intune", detailKey: "ds.intune.detail" as const, status: "green" },
  { name: "Compliance Mgr.", detailKey: "ds.compliance.detail" as const, status: "amber" },
] as const;

const DOT: Record<string, string> = {
  green: "bg-pos",
  amber: "bg-warn",
  red: "bg-neg",
};

export function DataSourcesPanel() {
  const { t } = useI18n();
  return (
    <div className="border-t border-border p-3 pb-4">
      <div className="eyebrow px-2 pt-1 pb-2 flex items-center gap-2">
        {t("sidebar.dataSources")}
        <span className="text-ink-3 normal-case tracking-normal font-normal">
          {t("sidebar.dataSources.suffix")}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 px-1">
        {SOURCES.map((s) => (
          <li key={s.name} className="flex items-start gap-2 px-1.5 py-1">
            <span
              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${DOT[s.status]}`}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="text-[12.5px] text-ink-1 leading-tight">{s.name}</div>
              <div className="text-[11px] text-ink-3 leading-snug">{t(s.detailKey)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
