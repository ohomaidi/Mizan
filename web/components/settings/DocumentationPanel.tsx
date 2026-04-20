"use client";

import { FileDown, FileText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import type { DictKey } from "@/lib/i18n/dict";

type DocEntry = {
  id: string;
  titleKey: DictKey;
  bodyKey: DictKey;
};

const DOCS: DocEntry[] = [
  {
    id: "installation-guide",
    titleKey: "docs.doc.install.title",
    bodyKey: "docs.doc.install.body",
  },
  {
    id: "operator-manual",
    titleKey: "docs.doc.operator.title",
    bodyKey: "docs.doc.operator.body",
  },
  {
    id: "security-privacy",
    titleKey: "docs.doc.security.title",
    bodyKey: "docs.doc.security.body",
  },
  {
    id: "architecture-overview",
    titleKey: "docs.doc.arch.title",
    bodyKey: "docs.doc.arch.body",
  },
  {
    id: "handoff-checklist",
    titleKey: "docs.doc.handoff.title",
    bodyKey: "docs.doc.handoff.body",
  },
];

export function DocumentationPanel() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader title={t("docs.title")} subtitle={t("docs.subtitle")} />
      <div className="flex flex-col gap-3">
        {DOCS.map((d) => (
          <div
            key={d.id}
            className="rounded-md border border-border bg-surface-2 p-4 flex items-start gap-3"
          >
            <div className="h-9 w-9 rounded-md bg-council-strong/15 text-council-strong grid place-items-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-ink-1">
                {t(d.titleKey)}
              </div>
              <p className="text-[12.5px] text-ink-2 leading-relaxed mt-0.5">
                {t(d.bodyKey)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/docs/${d.id}?lang=en`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-1 text-ink-2 hover:text-ink-1 text-[12px]"
              >
                <FileDown size={12} /> {t("docs.open.en")}
              </a>
              <a
                href={`/api/docs/${d.id}?lang=ar`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-1 text-ink-2 hover:text-ink-1 text-[12px]"
              >
                <FileDown size={12} /> {t("docs.open.ar")}
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
