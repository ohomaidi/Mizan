"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";

/**
 * Confirmation modal for deleting a consented entity from Mizan. Replaces
 * the bare `confirm()` prompt that didn't tell operators about the orphan
 * service principal that gets left behind in the entity tenant — every
 * "delete and re-onboard" workflow used to silently land on AADSTS650051
 * because the SP wasn't cleaned up first. v2.5.24.
 */
export function DeleteEntityModal({
  open,
  onClose,
  entity,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  entity: { id: string; nameEn: string; nameAr: string; tenantId: string } | null;
  onConfirmed: (id: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);

  if (!entity) return null;
  const name = locale === "ar" ? entity.nameAr : entity.nameEn;
  const enterpriseAppsUrl = `https://entra.microsoft.com/${entity.tenantId}/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview`;

  async function onConfirm() {
    if (!entity) return;
    setBusy(true);
    try {
      await onConfirmed(entity.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={t("settings.deleteEntity.title", { name })}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-9 px-3 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-[12.5px] text-ink-1 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-neg text-white hover:bg-neg/90 text-[12.5px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            {t("settings.deleteEntity.confirm")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-[13px] text-ink-1 leading-relaxed">
        <p>{t("settings.deleteEntity.summary", { name })}</p>

        <div className="rounded-md border border-warn/40 bg-warn/[0.06] p-4">
          <div className="text-[12px] font-semibold text-ink-1 mb-2 uppercase tracking-[0.06em]">
            {t("settings.deleteEntity.spWarning.heading")}
          </div>
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            {t("settings.deleteEntity.spWarning.body", { name })}
          </p>
          <a
            href={enterpriseAppsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface-1 hover:bg-surface-3 text-[12px] text-ink-1 font-medium transition"
          >
            <ExternalLink size={13} />
            {t("settings.deleteEntity.spWarning.openLink")}
          </a>
        </div>

        <p className="text-[12px] text-ink-3">
          {t("settings.deleteEntity.alternative")}
        </p>
      </div>
    </Modal>
  );
}
