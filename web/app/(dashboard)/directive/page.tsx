"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Network,
  Package,
  Radar,
  Lock,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

/**
 * /directive — top-level page only reachable in directive-mode deployments.
 *
 * For Phase 1 this is a roadmap shell, NOT a working write surface. It exists
 * to (a) show Center admins what is coming, (b) exercise the env-gated routing
 * end to end, and (c) land the UI scaffolding so Phase 2+ plugs in without a
 * restructure. No write endpoint is called from this page in Phase 1.
 *
 * Observation-mode deployments (SCSC) should never render this page. The
 * route is defensive — if someone hits it directly on an observation
 * deployment the effect redirects them to /maturity.
 */

type Status = "available" | "in_progress" | "planned";

type Capability = {
  icon: typeof Gavel;
  titleKey:
    | "directive.cap.incidentOps.title"
    | "directive.cap.riskyUsers.title"
    | "directive.cap.threatSubmissions.title"
    | "directive.cap.caBaselines.title"
    | "directive.cap.intuneBaselines.title"
    | "directive.cap.iocPush.title"
    | "directive.cap.deviceIsolation.title"
    | "directive.cap.namedLocations.title";
  bodyKey:
    | "directive.cap.incidentOps.body"
    | "directive.cap.riskyUsers.body"
    | "directive.cap.threatSubmissions.body"
    | "directive.cap.caBaselines.body"
    | "directive.cap.intuneBaselines.body"
    | "directive.cap.iocPush.body"
    | "directive.cap.deviceIsolation.body"
    | "directive.cap.namedLocations.body";
  phase: 2 | 3 | 4 | 5;
  status: Status;
};

const CAPABILITIES: Capability[] = [
  {
    icon: ShieldAlert,
    titleKey: "directive.cap.incidentOps.title",
    bodyKey: "directive.cap.incidentOps.body",
    phase: 2,
    status: "planned",
  },
  {
    icon: UserX,
    titleKey: "directive.cap.riskyUsers.title",
    bodyKey: "directive.cap.riskyUsers.body",
    phase: 2,
    status: "planned",
  },
  {
    icon: Radar,
    titleKey: "directive.cap.threatSubmissions.title",
    bodyKey: "directive.cap.threatSubmissions.body",
    phase: 2,
    status: "planned",
  },
  {
    icon: Lock,
    titleKey: "directive.cap.caBaselines.title",
    bodyKey: "directive.cap.caBaselines.body",
    phase: 3,
    status: "planned",
  },
  {
    icon: Package,
    titleKey: "directive.cap.intuneBaselines.title",
    bodyKey: "directive.cap.intuneBaselines.body",
    phase: 4,
    status: "planned",
  },
  {
    icon: ShieldCheck,
    titleKey: "directive.cap.iocPush.title",
    bodyKey: "directive.cap.iocPush.body",
    phase: 5,
    status: "planned",
  },
  {
    icon: Network,
    titleKey: "directive.cap.deviceIsolation.title",
    bodyKey: "directive.cap.deviceIsolation.body",
    phase: 5,
    status: "planned",
  },
  {
    icon: Gavel,
    titleKey: "directive.cap.namedLocations.title",
    bodyKey: "directive.cap.namedLocations.body",
    phase: 3,
    status: "planned",
  },
];

export default function DirectivePage() {
  const { t } = useI18n();
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.whoami>> | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (!alive) return;
        setMe(r);
        setChecked(true);
      })
      .catch(() => setChecked(true));
    return () => {
      alive = false;
    };
  }, []);

  if (checked && me && me.deploymentMode !== "directive") {
    redirect("/maturity");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <Gavel size={11} className="inline -mt-0.5 me-1" />
          {t("directive.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("directive.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">
          {t("directive.subtitle")}
        </p>
      </div>

      {/* No "Directive app not provisioned" banner — this deployment uses a
          single Graph app registration whose scope list was set at /setup
          based on deployment mode. If we're on this page at all, the
          deployment already chose read+write and the app has the right
          scopes. */}

      <Card>
        <CardHeader
          title={t("directive.roadmap.title")}
          subtitle={t("directive.roadmap.subtitle")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="rounded-md border border-border bg-surface-1 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-9 w-9 grid place-items-center rounded-md bg-surface-3 text-ink-1">
                    <Icon size={16} strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-semibold text-ink-1">
                        {t(c.titleKey)}
                      </h3>
                      <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-accent border border-accent/40 rounded px-1.5 py-px">
                        {t("directive.phase", { n: String(c.phase) })}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">
                      {t(c.bodyKey)}
                    </p>
                    <div className="mt-2">
                      <StatusChip status={c.status} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t("directive.guardrails.title")}
          subtitle={t("directive.guardrails.subtitle")}
        />
        <ul className="flex flex-col gap-2 mt-2 text-[12.5px] text-ink-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.reportOnly")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.twoPerson")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.adminExclusion")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.rollback")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.consentGated")}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const { t } = useI18n();
  const tone =
    status === "available"
      ? "text-pos border-pos/40 bg-pos/10"
      : status === "in_progress"
        ? "text-warn border-warn/40 bg-warn/10"
        : "text-ink-3 border-border bg-surface-3";
  const labelKey =
    status === "available"
      ? "directive.status.available"
      : status === "in_progress"
        ? "directive.status.inProgress"
        : "directive.status.planned";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey)}
    </span>
  );
}
