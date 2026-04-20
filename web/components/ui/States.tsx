"use client";

import Link from "next/link";
import { Building2, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Card } from "./Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";

export function LoadingState() {
  const { t } = useI18n();
  return (
    <Card className="flex items-center justify-center min-h-[200px]">
      <div className="flex items-center gap-3 text-ink-2 text-[13px]">
        <Loader2 size={16} className="animate-spin text-council-strong" />
        {t("state.loading")}
      </div>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
      <AlertTriangle size={22} className="text-warn" />
      <div className="text-ink-1 text-[13.5px] font-medium">{t("state.error")}</div>
      {message ? (
        <div className="text-ink-3 text-[12px] max-w-md">{message}</div>
      ) : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-1 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
        >
          {t("state.retry")}
        </button>
      ) : null}
    </Card>
  );
}

export function EmptyState() {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center justify-center gap-3 min-h-[280px] text-center">
      <div className="h-12 w-12 rounded-md bg-surface-3 grid place-items-center">
        <Building2 size={22} className="text-council-strong" />
      </div>
      <div className="text-ink-1 font-semibold text-[15px]">{t("state.empty.title")}</div>
      <div className="text-ink-2 text-[12.5px] max-w-md">{t("state.empty.body")}</div>
      <Link
        href="/settings"
        className="mt-2 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
      >
        {t("state.empty.cta")}
      </Link>
    </Card>
  );
}

export function NotConfiguredState() {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-center justify-center gap-3 min-h-[200px] text-center">
      <ShieldAlert size={22} className="text-warn" />
      <div className="text-ink-1 font-semibold text-[15px]">
        {t("state.notConfigured.title")}
      </div>
      <div className="text-ink-2 text-[12.5px] max-w-lg keep-ltr">
        {t("state.notConfigured.body")}
      </div>
    </Card>
  );
}
