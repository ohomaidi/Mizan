"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { api } from "@/lib/api/client";

type Me = Awaited<ReturnType<typeof api.whoami>>;

export function UserMenu() {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (alive) setMe(r);
      })
      .catch(() => {
        if (alive) setMe(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // No /api/auth/me response yet — show a neutral placeholder. This is the
  // briefest of moments on first paint.
  if (!me) {
    return (
      <div
        className="h-8 w-8 rounded-full bg-surface-4 text-ink-1 text-xs font-semibold grid place-items-center border border-border-strong"
        aria-hidden
      />
    );
  }

  // Demo-mode deployments: the whole auth gate is off at the env level so
  // prospects can browse freely. Show a read-only "Demo mode" pill instead of
  // a sign-in CTA (there is nowhere to sign in to).
  if (me.demoMode) {
    return (
      <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-accent/40 bg-accent/10 text-accent text-[11px] font-semibold uppercase tracking-[0.08em]">
        {t("topbar.demo")}
      </span>
    );
  }

  // Auth isn't configured yet (fresh install before the wizard has finished).
  // Nothing to show — the dashboard layout will have bounced to /setup anyway.
  if (!me.configured) {
    return (
      <div
        className="h-8 w-8 rounded-full bg-surface-4 text-ink-1 text-xs font-semibold grid place-items-center border border-border-strong"
        aria-hidden
      >
        SA
      </div>
    );
  }

  // Auth is configured but this request is unauthenticated. Surface the Sign
  // in button — happens during the bootstrap window before the first admin
  // has completed their first login.
  if (!me.authenticated || !me.user) {
    return (
      <a
        href="/login"
        className="h-8 px-3 grid place-items-center rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[12px]"
      >
        {t("login.signIn")}
      </a>
    );
  }

  const u = me.user;
  const initials = (u.displayName || u.email || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = t(
    `authCfg.role.${u.role}` as
      | "authCfg.role.admin"
      | "authCfg.role.analyst"
      | "authCfg.role.viewer",
  );

  const onSignOut = async () => {
    try {
      await api.signOut();
    } catch {
      /* ignore; cookie still cleared client-side on reload */
    }
    window.location.href = "/login";
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-8 pl-0.5 pr-2 rounded-full border border-border-strong bg-surface-2 hover:bg-surface-3"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="h-7 w-7 rounded-full bg-surface-4 text-ink-1 text-[11px] font-semibold grid place-items-center">
          {initials}
        </span>
        <span className="text-[11.5px] text-ink-2 hidden md:inline">{roleLabel}</span>
        <ChevronDown size={12} className="text-ink-3" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-surface-2 shadow-lg z-50 p-2">
          <div className="px-2 py-1.5">
            <div className="text-[13px] text-ink-1 font-semibold truncate">
              {u.displayName || u.email}
            </div>
            <div
              className="text-[11px] text-ink-3 truncate keep-ltr"
              dir="ltr"
            >
              {u.email}
            </div>
            <div className="mt-1 text-[10px] text-council-strong uppercase tracking-[0.08em]">
              {roleLabel}
            </div>
          </div>
          <div className="border-t border-border my-1" />
          <button
            onClick={onSignOut}
            className="w-full text-start inline-flex items-center gap-2 h-8 px-2 rounded text-[12.5px] text-ink-2 hover:text-ink-1 hover:bg-surface-3"
          >
            <LogOut size={13} /> {t("authCfg.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
