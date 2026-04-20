"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import type { DictKey } from "@/lib/i18n/dict";
import { api } from "@/lib/api/client";

export default function FaqPage() {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [cfg, setCfg] = useState<{
    weights: Record<string, number>;
    target: number;
  } | null>(null);

  useEffect(() => {
    api
      .getMaturityConfig()
      .then((r) => setCfg(r.config))
      .catch(() => {});
  }, []);

  const w = cfg?.weights ?? {
    secureScore: 0.25,
    identity: 0.2,
    device: 0.15,
    data: 0.15,
    threat: 0.15,
    compliance: 0.1,
  };
  const target = cfg?.target ?? 75;

  const pct = (n: number) => `${fmt(Math.round((n ?? 0) * 100))}%`;
  const weightedFormula =
    `Index = ${pct(w.secureScore)}·SecureScore + ${pct(w.identity)}·Identity + ${pct(w.device)}·Device + ${pct(w.data)}·Data + ${pct(w.threat)}·Threat + ${pct(w.compliance)}·Framework`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">{t("faq.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("faq.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">{t("faq.subtitle")}</p>
      </div>

      <Q id="whatIsDashboard" titleKey="faq.q.whatIsDashboard.title" bodyKey="faq.q.whatIsDashboard.body" />

      <Q id="flow" titleKey="faq.q.flow.title" bodyKey="faq.q.flow.body" />

      <Q id="whatIsIndex" titleKey="faq.q.whatIsIndex.title" bodyKey="faq.q.whatIsIndex.body" />

      <Card>
        <CardHeader title={t("faq.q.howCalculated.title")} subtitle={t("faq.q.howCalculated.intro")} />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-[0.06em] border-b border-border">
                <th className="py-2 pe-3 text-start font-semibold">{t("faq.q.howCalculated.colSub")}</th>
                <th className="py-2 pe-3 text-start font-semibold">{t("faq.q.howCalculated.colWeight")}</th>
                <th className="py-2 text-start font-semibold">{t("faq.q.howCalculated.colSource")}</th>
              </tr>
            </thead>
            <tbody>
              <FormulaRow name="faq.q.howCalculated.row.ss.name" weight={pct(w.secureScore)} src="faq.q.howCalculated.row.ss.src" />
              <FormulaRow name="faq.q.howCalculated.row.identity.name" weight={pct(w.identity)} src="faq.q.howCalculated.row.identity.src" />
              <FormulaRow name="faq.q.howCalculated.row.device.name" weight={pct(w.device)} src="faq.q.howCalculated.row.device.src" />
              <FormulaRow name="faq.q.howCalculated.row.data.name" weight={pct(w.data)} src="faq.q.howCalculated.row.data.src" />
              <FormulaRow name="faq.q.howCalculated.row.threat.name" weight={pct(w.threat)} src="faq.q.howCalculated.row.threat.src" />
              <FormulaRow name="faq.q.howCalculated.row.compliance.name" weight={pct(w.compliance)} src="faq.q.howCalculated.row.compliance.src" />
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-md border border-border bg-surface-1 p-4">
          <div className="eyebrow mb-2">{t("faq.q.howCalculated.formula.title")}</div>
          <code className="text-[13px] text-ink-1 tabular keep-ltr block leading-relaxed">
            {weightedFormula}
          </code>
          <div className="text-[11.5px] text-ink-3 mt-3">
            Council target: <span className="tabular text-ink-1">{fmt(target)}</span>.
            Weights and target are editable in Settings → Maturity Index.
          </div>
        </div>
      </Card>

      <Q id="target" titleKey="faq.q.target.title" bodyKey="faq.q.target.body" />

      <Card>
        <CardHeader title={t("faq.q.signals.title")} subtitle={t("faq.q.signals.body")} />
        <ul className="text-[13px] text-ink-2 space-y-2 ms-5 list-disc marker:text-council-strong">
          <li>{t("faq.q.signals.ss")}</li>
          <li>{t("faq.q.signals.ca")}</li>
          <li>{t("faq.q.signals.ru")}</li>
          <li>{t("faq.q.signals.dev")}</li>
          <li>{t("faq.q.signals.inc")}</li>
        </ul>
      </Card>

      <Q id="cadence" titleKey="faq.q.cadence.title" bodyKey="faq.q.cadence.body" />
      <Q id="belowTarget" titleKey="faq.q.belowTarget.title" bodyKey="faq.q.belowTarget.body" />
      <Q id="data" titleKey="faq.q.data.title" bodyKey="faq.q.data.body" />

      <Card>
        <CardHeader title={t("faq.q.limits.title")} subtitle={t("faq.q.limits.body")} />
        <ul className="text-[13px] text-ink-2 space-y-2 ms-5 list-disc marker:text-warn">
          <li>{t("faq.q.limits.a")}</li>
          <li>{t("faq.q.limits.b")}</li>
          <li>{t("faq.q.limits.c")}</li>
          <li>{t("faq.q.limits.d")}</li>
        </ul>
      </Card>

      <Q id="demo" titleKey="faq.q.demo.title" bodyKey="faq.q.demo.body" />

      <Card>
        <CardHeader title={t("faq.q.glossary.title")} />
        <dl className="text-[13px] space-y-3">
          <GlossaryRow termKey="faq.q.glossary.tenant" />
          <GlossaryRow termKey="faq.q.glossary.cluster" />
          <GlossaryRow termKey="faq.q.glossary.consent" />
          <GlossaryRow termKey="faq.q.glossary.secureScore" />
        </dl>
      </Card>
    </div>
  );
}

function Q({
  id,
  titleKey,
  bodyKey,
}: {
  id: string;
  titleKey: DictKey;
  bodyKey: DictKey;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <a id={id} className="block" style={{ scrollMarginTop: 80 }}>
        <CardHeader title={t(titleKey)} />
        <p className="text-[13px] text-ink-2 leading-relaxed max-w-3xl whitespace-pre-line">
          {t(bodyKey)}
        </p>
      </a>
    </Card>
  );
}

function FormulaRow({
  name,
  weight,
  src,
}: {
  name: DictKey;
  weight: string;
  src: DictKey;
}) {
  const { t } = useI18n();
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pe-3 text-ink-1 font-medium align-top">{t(name)}</td>
      <td className="py-3 pe-3 text-council-strong font-semibold tabular align-top">{weight}</td>
      <td className="py-3 text-ink-2 align-top">{t(src)}</td>
    </tr>
  );
}

function GlossaryRow({ termKey }: { termKey: DictKey }) {
  const { t } = useI18n();
  const raw = t(termKey);
  const dash = raw.indexOf(" — ");
  const term = dash > 0 ? raw.slice(0, dash) : raw;
  const def = dash > 0 ? raw.slice(dash + 3) : "";
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
      <dt className="text-ink-1 font-semibold min-w-[160px]">{term}</dt>
      <dd className="text-ink-2">{def}</dd>
    </div>
  );
}
