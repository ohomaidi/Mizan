"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { BrandingMark } from "@/components/chrome/BrandingMark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { t, branding, locale } = useI18n();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/";
  const error = sp.get("error");
  const reason = sp.get("reason");
  const [submitting, setSubmitting] = useState(false);

  const onSignIn = () => {
    setSubmitting(true);
    window.location.href = `/api/auth/user-login?next=${encodeURIComponent(next)}`;
  };

  const isAr = locale === "ar";
  const orgName = isAr ? branding.nameAr : branding.nameEn;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center px-6 py-10 bg-surface-1"
    >
      <div className="max-w-[420px] w-full">
        <div className="flex items-center gap-3 mb-8">
          <BrandingMark branding={branding} size={12} />
          <div>
            <div className="text-[13px] font-semibold text-ink-1 leading-tight">
              {orgName}
            </div>
            <div className="text-[11px] text-ink-3 mt-0.5">
              {t("login.subtitle")}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-md bg-council-strong/15 text-council-strong grid place-items-center">
              <Lock size={16} />
            </div>
            <h1 className="text-[18px] font-semibold text-ink-1">
              {t("login.title")}
            </h1>
          </div>
          <p className="text-[12.5px] text-ink-2 mb-5 leading-relaxed">
            {t("login.body")}
          </p>
          <button
            onClick={onSignIn}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-council-strong text-white text-[13px] font-semibold disabled:opacity-50"
          >
            <LogIn size={14} />
            {t("login.signIn")}
          </button>
          {error ? (
            <div className="mt-4 rounded-md border border-neg/40 bg-neg/10 p-3 text-[11.5px] text-ink-1">
              <div className="font-semibold text-neg">
                {t(
                  `login.error.${error}` as
                    | "login.error.forbidden"
                    | "login.error.state_mismatch"
                    | "login.error.token_exchange"
                    | "login.error.missing_params",
                  {},
                ) || error}
              </div>
              {reason ? (
                <div className="text-ink-3 mt-1 keep-ltr">{reason}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-center text-[11px] text-ink-3">
          {t("login.footer")}
        </div>
      </div>
    </div>
  );
}
