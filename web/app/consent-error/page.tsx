"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ExternalLink, Copy, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { BrandingMark } from "@/components/chrome/BrandingMark";

// Standalone consent-error page.
// Rendered OUTSIDE the (dashboard) route group — entity admin never sees
// the dashboard chrome even when their consent fails.
//
// v2.5.15: detects AADSTS650051 ("service principal already exists in tenant")
// and renders an actionable recovery path instead of the generic "contact your
// onboarding rep" copy. The error happens when the entity tenant already has
// a service principal for Mizan's app — usually because someone ran the
// consent flow before, hit a transient failure, retried, and the second
// attempt collided with the orphan SP from the first. The recovery is to
// grant consent on the existing SP via Enterprise Applications, which doesn't
// require deleting anything or re-issuing the consent URL.

export default function ConsentErrorPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const isAr = lang === "ar";
  const { branding } = useI18n();
  const orgName = isAr ? branding.nameAr : branding.nameEn;
  const tagline = isAr
    ? (branding.taglineAr ?? "رقابة أمنية موحدة")
    : (branding.taglineEn ?? "Unified security oversight");
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const tTpl = (en: string, ar: string, params: Record<string, string>) => {
    const s = isAr ? ar : en;
    return s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  };

  const sp = useSearchParams();
  const reason = sp.get("reason") ?? "";
  const description = sp.get("description") ?? "";
  const tenantGuid = sp.get("tenantGuid") ?? "";
  const appId = sp.get("appId") ?? "";

  // AADSTS650051 — "service principal already present for the tenant".
  // We match on the error code itself rather than the prose because Microsoft
  // localizes the description but the AADSTS code is stable.
  const isOrphanSp =
    /AADSTS650051/i.test(description) ||
    /already present for the tenant/i.test(description);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center px-6 py-10 bg-surface-1"
    >
      <div className="max-w-[680px] w-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BrandingMark branding={branding} size={12} />
            <div>
              <div className="text-[13px] font-semibold text-ink-1 leading-tight">
                {orgName}
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">{tagline}</div>
            </div>
          </div>
          <button
            onClick={() => setLang(isAr ? "en" : "ar")}
            className="text-[11.5px] text-ink-3 hover:text-ink-1 uppercase tracking-[0.08em]"
          >
            {isAr ? "EN" : "العربية"}
          </button>
        </div>

        {isOrphanSp ? (
          <OrphanSpRecovery
            tenantGuid={tenantGuid}
            appId={appId}
            description={description}
            reason={reason}
            orgName={orgName}
            isAr={isAr}
            t={t}
            tTpl={tTpl}
          />
        ) : (
          <GenericError
            reason={reason}
            description={description}
            orgName={orgName}
            isAr={isAr}
            t={t}
            tTpl={tTpl}
          />
        )}

        <div className="mt-6 text-center text-[11px] text-ink-3">
          {tTpl(
            "Confidential · {orgName} · in partnership with Microsoft Security",
            "سري · {orgName} · بالشراكة مع Microsoft Security",
            { orgName },
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Generic error card — what we used to render for all consent failures.
// Still used for everything except the AADSTS650051 case below.
// ────────────────────────────────────────────────────────────────────────

function GenericError({
  reason,
  description,
  orgName,
  isAr,
  t,
  tTpl,
}: {
  reason: string;
  description: string;
  orgName: string;
  isAr: boolean;
  t: (en: string, ar: string) => string;
  tTpl: (en: string, ar: string, params: Record<string, string>) => string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-warn/15 text-warn grid place-items-center shrink-0">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-[22px] font-semibold text-ink-1 leading-tight">
          {t("Consent could not be completed.", "تعذّر إكمال الموافقة.")}
        </h1>
      </div>

      <p className="text-[13.5px] text-ink-2 leading-relaxed mb-4">
        {tTpl(
          "The admin-consent flow did not complete successfully. Your tenant has NOT been linked to the {orgName} platform. You can safely retry using the same consent link.",
          "لم يكتمل مسار موافقة المسؤول بنجاح. لم يتم ربط مستأجركم بمنصة {orgName}. يمكنكم إعادة المحاولة بأمان باستخدام نفس رابط الموافقة.",
          { orgName },
        )}
      </p>

      {reason ? (
        <div className="rounded-md border border-border bg-surface-1 p-4 mb-4">
          <div className="text-[11.5px] uppercase tracking-[0.08em] text-ink-3 mb-2">
            {t("Error details", "تفاصيل الخطأ")}
          </div>
          <div className="text-[12.5px] text-ink-1 tabular keep-ltr mb-1">
            {reason}
          </div>
          {description ? (
            <div className="text-[11.5px] text-ink-3 leading-relaxed">
              {description}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-[12.5px] text-ink-3 leading-relaxed">
        {tTpl(
          "If this keeps happening, please contact your {orgName} onboarding representative. They will verify the consent URL and walk you through the next steps.",
          "إذا استمر حدوث ذلك، يرجى التواصل مع ممثل التسجيل في {orgName}. سيتحقق من رابط الموافقة وسيرشدكم إلى الخطوات التالية.",
          { orgName },
        )}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// AADSTS650051 recovery card — the actionable path for the orphan-SP case.
// ────────────────────────────────────────────────────────────────────────

function OrphanSpRecovery({
  tenantGuid,
  appId,
  description,
  reason,
  orgName,
  isAr,
  t,
  tTpl,
}: {
  tenantGuid: string;
  appId: string;
  description: string;
  reason: string;
  orgName: string;
  isAr: boolean;
  t: (en: string, ar: string) => string;
  tTpl: (en: string, ar: string, params: Record<string, string>) => string;
}) {
  // Deep-link straight to the Enterprise Applications "All applications" view
  // in the entity's own tenant, with a search filter prefilling the appId.
  // The portal honors `searchKeyword` on the EnterpriseApplicationsList blade,
  // so the admin lands one click away from the orphan SP.
  const enterpriseAppsUrl = tenantGuid
    ? `https://entra.microsoft.com/${tenantGuid}/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview`
    : "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview";

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-warn/15 text-warn grid place-items-center shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 leading-tight">
            {t(
              "Almost there — one manual step left",
              "اقتربتم — تبقّت خطوة يدوية واحدة",
            )}
          </h1>
          <div className="text-[12px] text-ink-3 mt-1 tabular">
            AADSTS650051
          </div>
        </div>
      </div>

      <p className="text-[13.5px] text-ink-2 leading-relaxed mb-4">
        {tTpl(
          "{orgName}'s app already exists in your Microsoft Entra tenant — it just needs admin consent granted directly, instead of through the consent URL. Microsoft blocks re-running the consent URL when an app is already registered. The fix takes about 60 seconds.",
          "تطبيق {orgName} مسجَّل بالفعل في مستأجر Microsoft Entra لديكم — يحتاج فقط إلى منح موافقة المسؤول مباشرة بدلاً من رابط الموافقة. يمنع Microsoft إعادة تشغيل رابط الموافقة عندما يكون التطبيق مسجَّلاً مسبقًا. الإصلاح يستغرق ٦٠ ثانية تقريبًا.",
          { orgName },
        )}
      </p>

      {/* Step-by-step recovery */}
      <div className="rounded-md border border-pos/40 bg-pos/[0.04] p-5 mb-5">
        <div className="text-[11.5px] uppercase tracking-[0.08em] text-pos mb-3 font-semibold">
          {t("Recovery steps", "خطوات الإصلاح")}
        </div>
        <ol className="space-y-3 text-[13px] text-ink-1 leading-relaxed list-decimal pl-5">
          <li>
            {t(
              "Open Enterprise Applications in your tenant",
              "افتحوا التطبيقات المؤسسية في مستأجركم",
            )}
            <div className="mt-2">
              <a
                href={enterpriseAppsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface-1 hover:bg-surface-3 text-[12px] text-ink-1 font-medium transition"
              >
                <ExternalLink size={13} />
                {t(
                  "Open Entra → Enterprise apps",
                  "فتح Entra ← التطبيقات المؤسسية",
                )}
              </a>
            </div>
          </li>
          <li>
            {t(
              "Set the filter to “All applications”, then paste this App ID into the search:",
              "اضبطوا الفلتر على «كل التطبيقات»، ثم الصقوا معرّف التطبيق التالي في خانة البحث:",
            )}
            {appId ? (
              <div className="mt-2">
                <CopyField value={appId} label={t("Copy App ID", "نسخ معرّف التطبيق")} />
              </div>
            ) : null}
          </li>
          <li>
            {t(
              "Click the matching application, then go to Permissions → Grant admin consent for your tenant → confirm.",
              "اضغطوا على التطبيق المطابق، ثم انتقلوا إلى Permissions ← Grant admin consent لمستأجركم ← تأكيد.",
            )}
          </li>
          <li>
            {tTpl(
              "Once every permission row reads “Granted for {tenant}”, the link to {orgName} is live. No further action needed.",
              "عندما تظهر كل صلاحية بحالة «مَمنوحة لـ{tenant}»، يصبح الربط مع {orgName} نشطًا. لا حاجة لأي خطوة إضافية.",
              {
                tenant: t("your tenant", "مستأجركم"),
                orgName,
              },
            )}
          </li>
        </ol>
      </div>

      {/* Tenant ID + App ID — for the admin's reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {tenantGuid ? (
          <CopyTile
            label={t("Your Tenant ID", "معرّف المستأجر")}
            value={tenantGuid}
          />
        ) : null}
        {appId ? (
          <CopyTile label={t("App ID", "معرّف التطبيق")} value={appId} />
        ) : null}
      </div>

      {/* Why it happened — collapsed by default */}
      <details className="text-[12px] text-ink-3 mb-4">
        <summary className="cursor-pointer hover:text-ink-1 transition">
          {t(
            "Why does this happen?",
            "لماذا يحدث هذا؟",
          )}
        </summary>
        <p className="mt-2 leading-relaxed">
          {tTpl(
            "A service principal for {orgName}'s app already exists in your tenant. The most common cause is a previous consent attempt that failed mid-flight (network blip, timeout) and registered the app without completing consent. Microsoft's consent endpoint refuses to register the same app twice — even though the second attempt would have completed correctly. Granting consent on the existing registration produces an identical end state.",
            "يوجد بالفعل service principal لتطبيق {orgName} في مستأجركم. السبب الأكثر شيوعًا هو محاولة موافقة سابقة فشلت في منتصفها (انقطاع شبكة، انتهاء مهلة) وسجّلت التطبيق دون استكمال الموافقة. ترفض نقطة موافقة Microsoft تسجيل التطبيق نفسه مرتين — حتى لو كانت المحاولة الثانية ستكتمل بشكل صحيح. منح الموافقة على التسجيل الحالي ينتج الحالة النهائية نفسها.",
            { orgName },
          )}
        </p>
      </details>

      {/* Raw error — collapsed */}
      {reason || description ? (
        <details className="text-[11.5px] text-ink-3">
          <summary className="cursor-pointer hover:text-ink-1 transition">
            {t("Show original error from Microsoft", "إظهار الخطأ الأصلي من Microsoft")}
          </summary>
          <div className="mt-2 rounded-md border border-border bg-surface-1 p-3">
            {reason ? (
              <div className="text-[12px] text-ink-1 tabular keep-ltr mb-1">
                {reason}
              </div>
            ) : null}
            {description ? (
              <div className="text-[11.5px] text-ink-3 leading-relaxed keep-ltr">
                {description}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <p className="text-[12px] text-ink-3 mt-5 leading-relaxed">
        {tTpl(
          "Stuck? Forward this page (with the URL bar) to your {orgName} onboarding representative — every detail they need is in the URL.",
          "لم تنجح الخطوات؟ أعيدوا توجيه هذه الصفحة (مع شريط العنوان) إلى ممثل التسجيل في {orgName} — كل التفاصيل المطلوبة موجودة في الرابط.",
          { orgName },
        )}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Small helpers — copy-to-clipboard widgets used inside the recovery card.
// ────────────────────────────────────────────────────────────────────────

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — value is selectable in the input */
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-border bg-surface-1 text-[12px] tabular keep-ltr text-ink-1"
      />
      <button
        onClick={onCopy}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface-1 hover:bg-surface-3 text-[11.5px] text-ink-2 transition"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "" : label}
      </button>
    </div>
  );
}

function CopyTile({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button
      onClick={onCopy}
      className="text-left rounded-md border border-border bg-surface-1 hover:bg-surface-3 p-3 transition group"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          {label}
        </div>
        <span className="text-ink-3 group-hover:text-ink-1 transition">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </span>
      </div>
      <div className="text-[12px] text-ink-1 tabular keep-ltr mt-1 break-all">
        {value}
      </div>
    </button>
  );
}
