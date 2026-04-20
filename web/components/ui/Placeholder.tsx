"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";

export function Placeholder({
  eyebrowKey,
  titleKey,
  subtitleKey,
  icon: Icon,
  signals,
}: {
  eyebrowKey: DictKey;
  titleKey: DictKey;
  subtitleKey: DictKey;
  icon: LucideIcon;
  signals: { name: string; source: string }[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t(eyebrowKey)}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t(titleKey)}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-2xl">{t(subtitleKey)}</p>
      </div>
      <Card>
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-md bg-surface-3 grid place-items-center shrink-0">
            <Icon size={20} className="text-council-strong" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <div className="text-ink-1 font-semibold text-[14px]">
              {t("placeholder.phase2.title")}
            </div>
            <div className="text-ink-2 text-[12.5px] mt-1">
              {t("placeholder.phase2.body")}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {signals.map((s) => (
            <div
              key={s.name}
              className="rounded-md border border-border bg-surface-1 p-3"
            >
              <div className="text-[12.5px] text-ink-1">{s.name}</div>
              <div className="text-[11px] text-ink-3 mt-0.5 tabular keep-ltr">{s.source}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
