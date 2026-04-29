"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Loader2,
  Mail,
  Shield,
  Globe2,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { HealthDot } from "@/components/ui/HealthDot";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
import { api } from "@/lib/api/client";
import type { EntityRow } from "@/lib/compute/aggregate";

/**
 * Organization — Executive-Mode replacement for the Council
 * "Entities" tab on Settings. The Council tab is a multi-tenant
 * onboarding workshop (wizard, list, sync controls per row, delete
 * button per row). For an Executive deployment there is exactly one
 * tenant — the deployment's own organisation — and none of that
 * surface is meaningful: you don't onboard yourself, you don't have
 * peers to list, you don't delete your own row.
 *
 * What an Executive operator actually needs from this tab:
 *   1. Confirm the org profile that's wired up (name / domain /
 *      tenant ID / CISO contact).
 *   2. See the live Microsoft Graph connection health (last sync,
 *      success / failure, scope-stale flag if a release added new
 *      permissions).
 *   3. Trigger a manual sync.
 *   4. A pointer to where the framework / branding / Azure / etc.
 *      live (the existing tabs to the right of this one).
 *
 * v2.6.3.
 */
export function OrganizationPanel() {
  const { t, locale } = useI18n();
  const fmtRelative = useFmtRelative();
  const [tenant, setTenant] = useState<EntityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getEntities();
      // In Executive there is only one consented tenant — pick the
      // first non-suspended one, falling back to any row so a fresh
      // install with no consent yet still shows something.
      const ts = r.entities;
      const primary =
        ts.find((e) => e.consentStatus === "consented") ??
        ts.find((e) => e.isDemo) ??
        ts[0] ??
        null;
      setTenant(primary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSync = async () => {
    if (!tenant) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const r = await api.syncTenant(tenant.id);
      if (r.ok) {
        setSyncMessage(t("organization.sync.ok"));
      } else {
        setSyncMessage(
          t("organization.sync.partial", { count: r.errors.length }),
        );
      }
      await load();
    } catch (err) {
      setSyncMessage(
        t("organization.sync.failed", { msg: (err as Error).message }),
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-ink-3 text-sm">{t("organization.loading")}</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-neg text-sm">{error}</div>
      </Card>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardHeader
          title={t("organization.empty.title")}
          subtitle={t("organization.empty.subtitle")}
        />
      </Card>
    );
  }

  const orgName = locale === "ar" ? tenant.nameAr : tenant.nameEn;
  const consentLabel =
    tenant.consentStatus === "consented"
      ? t("organization.consent.consented")
      : tenant.consentStatus === "pending"
        ? t("organization.consent.pending")
        : tenant.consentStatus === "revoked"
          ? t("organization.consent.revoked")
          : t("organization.consent.failed");

  return (
    <div className="flex flex-col gap-5">
      {/* ── Profile card ─────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Shield size={16} className="text-council-strong" />
              {t("organization.profile.title")}
            </span>
          }
          subtitle={t("organization.profile.subtitle")}
        />
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <ProfileRow
            label={t("organization.field.name")}
            value={orgName}
            icon={null}
          />
          <ProfileRow
            label={t("organization.field.domain")}
            value={tenant.domain}
            icon={<Globe2 size={13} className="text-ink-3" />}
            mono
          />
          <ProfileRow
            label={t("organization.field.tenantId")}
            value={tenant.tenantId}
            icon={<Shield size={13} className="text-ink-3" />}
            mono
            wrap
          />
          <ProfileRow
            label={t("organization.field.ciso")}
            value={tenant.ciso || "—"}
            icon={null}
          />
          <ProfileRow
            label={t("organization.field.cisoEmail")}
            value={tenant.cisoEmail || "—"}
            icon={<Mail size={13} className="text-ink-3" />}
            mono
          />
          <ProfileRow
            label={t("organization.field.consentMode")}
            value={
              tenant.consentMode === "directive"
                ? t("organization.consentMode.directive")
                : t("organization.consentMode.observation")
            }
            icon={null}
          />
        </dl>
      </Card>

      {/* ── Connection health card ───────────────────────────── */}
      <Card>
        <CardHeader
          title={t("organization.connection.title")}
          subtitle={t("organization.connection.subtitle")}
          right={
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-council-strong text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {syncing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {t("organization.sync.button")}
            </button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <HealthCard
            label={t("organization.health.consent")}
            value={consentLabel}
            tone={
              tenant.consentStatus === "consented"
                ? "pos"
                : tenant.consentStatus === "pending"
                  ? "warn"
                  : "neg"
            }
            icon={
              tenant.consentStatus === "consented" ? (
                <CheckCircle2 size={14} />
              ) : (
                <XCircle size={14} />
              )
            }
          />
          <HealthCard
            label={t("organization.health.connection")}
            value={
              tenant.connection === "green"
                ? t("organization.health.green")
                : tenant.connection === "amber"
                  ? t("organization.health.amber")
                  : tenant.connection === "red"
                    ? t("organization.health.red")
                    : t("organization.health.pending")
            }
            tone={
              tenant.connection === "green"
                ? "pos"
                : tenant.connection === "amber"
                  ? "warn"
                  : tenant.connection === "red"
                    ? "neg"
                    : "neutral"
            }
            icon={
              tenant.connection === "pending" ? null : (
                <HealthDot status={tenant.connection} />
              )
            }
          />
          <HealthCard
            label={t("organization.health.lastSync")}
            value={
              tenant.lastSyncAt
                ? fmtRelative(tenant.lastSyncAt)
                : t("organization.health.neverSynced")
            }
            tone={tenant.lastSyncOk ? "pos" : "warn"}
            icon={<CalendarClock size={14} />}
          />
        </div>

        {tenant.scopeStale ? (
          <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 p-3 text-[12.5px] text-ink-1">
            {t("organization.scopeStale")}
          </div>
        ) : null}

        {syncMessage ? (
          <div className="mt-3 text-[12.5px] text-ink-2">{syncMessage}</div>
        ) : null}
      </Card>

      {/* ── Pointer card to other tabs ───────────────────────── */}
      <Card>
        <CardHeader
          title={t("organization.elsewhere.title")}
          subtitle={t("organization.elsewhere.subtitle")}
        />
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
          <PointerLink
            href="/settings?tab=branding"
            title={t("organization.elsewhere.branding")}
            body={t("organization.elsewhere.brandingBody")}
          />
          <PointerLink
            href="/settings?tab=azure"
            title={t("organization.elsewhere.azure")}
            body={t("organization.elsewhere.azureBody")}
          />
          <PointerLink
            href="/settings?tab=nesa"
            title={t("organization.elsewhere.framework")}
            body={t("organization.elsewhere.frameworkBody")}
          />
          <PointerLink
            href="/settings?tab=auth"
            title={t("organization.elsewhere.auth")}
            body={t("organization.elsewhere.authBody")}
          />
        </ul>
      </Card>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  icon,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <dt className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold mb-0.5">
          {label}
        </dt>
        <dd
          className={`text-ink-1 ${
            mono ? "font-mono text-[12.5px]" : "text-[13.5px]"
          } ${wrap ? "break-all" : ""}`}
        >
          {icon ? <span className="me-1.5 align-text-bottom">{icon}</span> : null}
          {value}
        </dd>
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "pos" | "warn" | "neg" | "neutral";
  icon: React.ReactNode;
}) {
  const accent =
    tone === "pos"
      ? "bg-pos"
      : tone === "warn"
        ? "bg-warn"
        : tone === "neg"
          ? "bg-neg"
          : "bg-border-strong";
  return (
    <div className="relative rounded-lg border border-border bg-surface-1 p-3 overflow-hidden">
      <span aria-hidden className={`absolute start-0 top-0 bottom-0 w-[3px] ${accent}`} />
      <div className="text-[10px] uppercase tracking-[0.06em] text-ink-3 font-semibold">
        {label}
      </div>
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-1">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

function PointerLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="block rounded-md border border-border bg-surface-1 p-3 hover:bg-surface-3/40"
      >
        <div className="text-ink-1 font-medium">{title}</div>
        <div className="text-[12px] text-ink-2 mt-0.5">{body}</div>
      </a>
    </li>
  );
}
