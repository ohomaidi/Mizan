"use client";

import { useCallback } from "react";
import { useI18n } from "./LocaleProvider";
import { useFmtNum } from "./num";

export function useFmtRelative() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  return useCallback(
    (iso: string) => {
      const delta = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(delta / 60_000);
      if (mins < 1) return t("time.justNow");
      if (mins < 60) return t("time.minutesAgo", { n: fmt(mins) });
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return t("time.hoursAgo", { n: fmt(hrs) });
      const days = Math.floor(hrs / 24);
      return t("time.daysAgo", { n: fmt(days) });
    },
    [t, fmt],
  );
}
