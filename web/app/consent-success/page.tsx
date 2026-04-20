"use client";

import { Suspense, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { BrandingMark } from "@/components/chrome/BrandingMark";

// Standalone consent-success page.
// Rendered OUTSIDE the (dashboard) route group so the entity admin never sees
// the Council dashboard chrome (sidebar, nav, other entities' posture data).
// This is the ONLY page the entity admin should land on after granting consent;
// from here they are expected to close the browser tab.

export default function ConsentSuccessPage() {
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
            <div className="h-10 w-10 rounded-full bg-pos/15 text-pos grid place-items-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <h1 className="text-[22px] font-semibold text-ink-1 leading-tight">
              {t("Consent received. Thank you.", "تم استلام الموافقة. شكرًا لكم.")}
            </h1>
          </div>

          <p className="text-[13.5px] text-ink-2 leading-relaxed mb-4">
            {tTpl(
              "Your tenant has been successfully linked to the {orgName}'s Posture & Maturity Dashboard. The organization's read-only service principal has been provisioned in your Entra ID directory.",
              "تم ربط مستأجركم بنجاح بلوحة الوضع الأمني والنضج الخاصة بـ{orgName}. تم إنشاء حساب الخدمة للقراءة فقط في دليل Entra ID الخاص بكم.",
              { orgName },
            )}
          </p>

          <div className="rounded-md border border-border bg-surface-1 p-4 mb-4">
            <div className="text-[11.5px] uppercase tracking-[0.08em] text-ink-3 mb-2">
              {t("What happens next", "ما يحدث بعد ذلك")}
            </div>
            <ul className="text-[12.5px] text-ink-2 space-y-2 leading-relaxed">
              <li>
                •{" "}
                {t(
                  "An initial sync against your tenant starts now and completes within ~10 minutes. Only read-only posture signals are collected — see the Onboarding Letter Section 5 for the full data scope.",
                  "تبدأ المزامنة الأولى مع مستأجركم الآن وتكتمل خلال ١٠ دقائق تقريبًا. تُجمع إشارات الوضع الأمني للقراءة فقط — راجع القسم ٥ من خطاب الإعداد لنطاق البيانات الكامل.",
                )}
              </li>
              <li>
                •{" "}
                {tTpl(
                  "The {orgName} onboarding team will email you a 'Connection live' confirmation with your entity's initial Secure Score reading.",
                  "سيرسل لكم فريق تسجيل {orgName} بريدًا إلكترونيًا بعنوان 'الاتصال نشط' يتضمن قراءة Secure Score الأولية لجهتكم.",
                  { orgName },
                )}
              </li>
              <li>
                •{" "}
                {t(
                  "You can inspect the organization's service principal and the granted read-only permissions at any time in your Entra admin center → Enterprise applications.",
                  "يمكنكم فحص حساب الخدمة والأذونات الممنوحة للقراءة فقط في أي وقت عبر مركز إدارة Entra ← Enterprise applications.",
                )}
              </li>
              <li>
                •{" "}
                {t(
                  "Consent can be revoked at any time from the same location. The dashboard auto-detects revocation within one sync cycle.",
                  "يمكن سحب الموافقة في أي وقت من نفس الموقع. تكتشف اللوحة السحب تلقائيًا خلال دورة مزامنة واحدة.",
                )}
              </li>
            </ul>
          </div>

          <p className="text-[12.5px] text-ink-3 leading-relaxed">
            {tTpl(
              "You can close this browser tab now. If you have questions about what was granted or need to revoke, contact your {orgName} onboarding representative.",
              "يمكنكم إغلاق هذا التبويب الآن. إذا كانت لديكم أسئلة حول ما تم منحه أو تحتاجون لسحب الموافقة، تواصلوا مع ممثل التسجيل في {orgName}.",
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
