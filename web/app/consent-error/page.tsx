"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { BrandingMark } from "@/components/chrome/BrandingMark";

// Standalone consent-error page.
// Rendered OUTSIDE the (dashboard) route group — entity admin never sees
// the dashboard chrome even when their consent fails.

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

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center px-6 py-10 bg-surface-1"
    >
      <div className="max-w-[600px] w-full">
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
