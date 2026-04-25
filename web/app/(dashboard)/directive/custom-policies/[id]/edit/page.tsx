"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  ShieldAlert,
  Check,
  Play,
  Send,
  X,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import type { DictKey } from "@/lib/i18n/dict";

/**
 * Custom CA Policy Wizard.
 *
 * A 6-step flow with an always-visible Review panel. Autosaves on every
 * edit via a 600ms debounced PATCH. Final action is a push-to-entities
 * that reuses the baseline push infrastructure end-to-end.
 *
 * Authoring is tenant-agnostic on purpose — the wizard only exposes
 * cross-tenant-stable fields so one draft can be pushed to many entities
 * without per-tenant ID resolution. Per-tenant targeting (specific
 * users/groups/named locations) is deferred to a future "scope mode".
 */

type Spec = {
  name: string;
  description?: string;
  state: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  referenceTenantId: string | null;
  users: {
    include: {
      kind: "all" | "none" | "roles" | "guestsOrExternalUsers";
      roleIds: string[];
      userIds: string[];
      groupIds: string[];
      guestTypes: string[];
      externalTenantMembershipKind: "all" | "enumerated";
    };
    exclude: {
      roleIds: string[];
      userIds: string[];
      groupIds: string[];
      excludeGlobalAdmins: boolean;
    };
  };
  apps: {
    target:
      | "all"
      | "office365"
      | "adminPortals"
      | "azureManagement"
      | "specific";
    includeAppIds: string[];
    excludeAppIds: string[];
  };
  conditions: {
    userRiskLevels: string[];
    signInRiskLevels: string[];
    platforms: string[];
    clientAppTypes: string[];
    locations: "any" | "trustedOnly" | "specific";
    includeLocations: string[];
    excludeLocations: string[];
    deviceFilter: {
      enabled: boolean;
      mode: "include" | "exclude";
      rules: Array<{
        attr: "trustType" | "isCompliant" | "mdmAppId" | "operatingSystem";
        op: "-eq" | "-ne" | "-contains";
        value: string;
      }>;
    };
  };
  grant: {
    kind: "block" | "grantWithRequirements";
    operator: "AND" | "OR";
    requireMfa: boolean;
    requireCompliantDevice: boolean;
    requireHybridJoinedDevice: boolean;
    requireApprovedClientApp: boolean;
    requireCompliantApplication: boolean;
    requirePasswordChange: boolean;
    authenticationStrengthId?: string;
    termsOfUseIds: string[];
  };
  session: {
    signInFrequency: {
      enabled: boolean;
      type: "hours" | "days";
      value: number;
    };
    persistentBrowser: "default" | "never" | "always";
    applicationEnforcedRestrictions: boolean;
  };
};

type Reference = Awaited<
  ReturnType<typeof api.directiveCustomPolicyReference>
>;

const STEPS = [
  "identify",
  "users",
  "apps",
  "conditions",
  "grant",
  "session",
  "review",
] as const;
type StepKey = (typeof STEPS)[number];

export default function CustomPolicyWizardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const id = Number(params.id);

  const [spec, setSpec] = useState<Spec | null>(null);
  const [reference, setReference] = useState<Reference | null>(null);
  const [meta, setMeta] = useState<{
    name: string;
    description: string | null;
    riskTier: "low" | "medium" | "high";
    previewBody: unknown;
  } | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("identify");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Directive tenants the operator can pick as the reference tenant for
  // tenant-local fields (users, groups, named locations, ToU, custom auth
  // strengths). Loaded once — the full list rarely changes while a draft
  // is being edited.
  const [directiveTenants, setDirectiveTenants] = useState<
    Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      isDemo: boolean;
    }>
  >([]);
  useEffect(() => {
    api
      .getEntities()
      .then((r) =>
        setDirectiveTenants(
          r.entities
            .filter((e) => e.consentMode === "directive")
            .map((e) => ({
              id: e.id,
              nameEn: e.nameEn,
              nameAr: e.nameAr,
              isDemo: e.isDemo,
            })),
        ),
      )
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  // Initial load.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.directiveCustomPolicyGet(id),
      api.directiveCustomPolicyReference(),
    ])
      .then(([policy, ref]) => {
        if (!alive) return;
        setSpec(policy.spec as Spec);
        setMeta({
          name: policy.name,
          description: policy.description,
          riskTier: policy.riskTier,
          previewBody: policy.previewBody,
        });
        setReference(ref);
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [id]);

  // Debounced autosave.
  const scheduleSave = useCallback(
    (next: Spec) => {
      setSavingState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void api
          .directiveCustomPolicyPatch(id, { name: next.name, spec: next })
          .then((r) => {
            setMeta((prev) =>
              prev
                ? {
                    ...prev,
                    name: next.name,
                    riskTier: r.riskTier,
                    previewBody: r.previewBody,
                  }
                : prev,
            );
            setSavingState("saved");
            setTimeout(() => setSavingState("idle"), 1500);
          })
          .catch((e) => {
            setError((e as Error).message);
            setSavingState("idle");
          });
      }, 600);
    },
    [id],
  );

  const update = useCallback(
    (mut: (s: Spec) => Spec) => {
      setSpec((prev) => {
        if (!prev) return prev;
        const next = mut(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/directive")}
          className="inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-ink-1"
        >
          <ArrowLeft size={12} />
          {t("wizard.back")}
        </button>
        <div className="text-neg text-[13px]">{error}</div>
      </div>
    );
  }

  if (!spec || !reference || !meta) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-ink-3 text-[12.5px]">{t("state.loading")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push("/directive")}
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-1 mb-2"
          >
            <ArrowLeft size={12} />
            {t("wizard.back")}
          </button>
          <h1 className="text-2xl font-semibold text-ink-1 tracking-tight">
            {t("wizard.title")}
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">{t("wizard.subtitle")}</p>
        </div>
        <SaveIndicator state={savingState} />
      </div>

      <StepNav activeStep={activeStep} onSelect={setActiveStep} />

      <ScopeBanner spec={spec} directiveTenants={directiveTenants} locale={locale} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            {activeStep === "identify" ? (
              <IdentifyStep
                spec={spec}
                update={update}
                directiveTenants={directiveTenants}
                locale={locale}
              />
            ) : activeStep === "users" ? (
              <UsersStep spec={spec} update={update} reference={reference} />
            ) : activeStep === "apps" ? (
              <AppsStep spec={spec} update={update} reference={reference} />
            ) : activeStep === "conditions" ? (
              <ConditionsStep spec={spec} update={update} />
            ) : activeStep === "grant" ? (
              <GrantStep spec={spec} update={update} reference={reference} />
            ) : activeStep === "session" ? (
              <SessionStep spec={spec} update={update} />
            ) : (
              <ReviewStep
                policyId={id}
                spec={spec}
                meta={meta}
                locale={locale}
              />
            )}
          </Card>
        </div>
        <div className="lg:col-span-1">
          <ReviewPanel spec={spec} meta={meta} onJump={setActiveStep} />
        </div>
      </div>
    </div>
  );
}

// ========================================================================
// Step nav
// ========================================================================

function StepNav({
  activeStep,
  onSelect,
}: {
  activeStep: StepKey;
  onSelect: (s: StepKey) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-1 p-1">
      {STEPS.map((s, idx) => {
        const active = s === activeStep;
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-[12px] font-semibold transition-colors ${
              active
                ? "bg-council-strong text-white"
                : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            <span className="text-[10px] opacity-70">{idx + 1}</span>
            {t(`wizard.step.${s}` as DictKey)}
          </button>
        );
      })}
    </div>
  );
}

function SaveIndicator({
  state,
}: {
  state: "idle" | "saving" | "saved";
}) {
  const { t } = useI18n();
  // role="status" + aria-live="polite" → screen readers announce the
  // "Saved" / "Saving" transitions without interrupting whatever the user
  // is typing. Critical for keyboard + AT users in the wizard.
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`inline-flex items-center gap-1.5 text-[11.5px] ${
        state === "saved" ? "text-pos" : "text-ink-3"
      }`}
    >
      {state === "saving" ? (
        <>
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          {t("wizard.saving")}
        </>
      ) : state === "saved" ? (
        <>
          <Check size={12} aria-hidden="true" />
          {t("wizard.saved")}
        </>
      ) : (
        <Save size={12} aria-hidden="true" />
      )}
    </span>
  );
}

// ========================================================================
// Step 1: Identify
// ========================================================================

function ScopeBanner({
  spec,
  directiveTenants,
  locale,
}: {
  spec: Spec;
  directiveTenants: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
    isDemo: boolean;
  }>;
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  if (!spec.referenceTenantId) {
    return (
      <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-[11.5px] text-ink-2 inline-flex items-center gap-2">
        <Check size={11} className="text-pos" />
        {t("wizard.scope.crossTenant")}
      </div>
    );
  }
  const tenant = directiveTenants.find((x) => x.id === spec.referenceTenantId);
  const name = tenant
    ? locale === "ar"
      ? tenant.nameAr
      : tenant.nameEn
    : spec.referenceTenantId;
  return (
    <div className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-[11.5px] text-ink-1 inline-flex items-start gap-2">
      <ShieldAlert size={12} className="text-warn mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">
          {t("wizard.scope.scopedTitle", { tenant: name })}
        </span>
        <span className="block text-[10.5px] text-ink-2 mt-0.5">
          {t("wizard.scope.scopedBody")}
        </span>
      </span>
    </div>
  );
}

function IdentifyStep({
  spec,
  update,
  directiveTenants,
  locale,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
  directiveTenants: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
    isDemo: boolean;
  }>;
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <CardHeader
        title={t("wizard.step.identify")}
        subtitle={t("wizard.subtitle")}
      />

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.identify.name")}
        </span>
        <input
          value={spec.name}
          onChange={(e) =>
            update((s) => ({ ...s, name: e.target.value }))
          }
          className="h-9 rounded-md border border-border bg-surface-1 text-ink-1 text-[13px] px-2.5"
        />
        <span className="text-[10.5px] text-ink-3">
          {t("wizard.identify.nameHint")}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.identify.description")}
        </span>
        <textarea
          value={spec.description ?? ""}
          onChange={(e) =>
            update((s) => ({ ...s, description: e.target.value }))
          }
          rows={3}
          className="rounded-md border border-border bg-surface-1 text-ink-1 text-[12.5px] px-2.5 py-2"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.identify.state")}
        </span>
        {(
          [
            "enabledForReportingButNotEnforced",
            "disabled",
            "enabled",
          ] as const
        ).map((value) => {
          const active = spec.state === value;
          const labelKey =
            value === "enabledForReportingButNotEnforced"
              ? "wizard.identify.stateReportOnly"
              : value === "disabled"
                ? "wizard.identify.stateDisabled"
                : "wizard.identify.stateEnabled";
          return (
            <label
              key={value}
              className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                name="state"
                checked={active}
                onChange={() => update((s) => ({ ...s, state: value }))}
                className="mt-0.5 accent-council-strong"
              />
              <span className="text-[12.5px] text-ink-1 leading-snug">
                {t(labelKey as DictKey)}
              </span>
            </label>
          );
        })}
        {spec.state === "enabled" ? (
          <div className="rounded-md border border-neg/40 bg-neg/10 p-2.5 text-[12px] text-ink-1 inline-flex items-start gap-2">
            <ShieldAlert size={14} className="text-neg mt-0.5 shrink-0" />
            <span>{t("wizard.identify.enabledWarn")}</span>
          </div>
        ) : null}
      </div>

      <hr className="border-border" />

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.identify.scope")}
        </span>
        <p className="text-[10.5px] text-ink-3 leading-relaxed">
          {t("wizard.identify.scopeHint")}
        </p>
        <div className="flex flex-col gap-2">
          <label
            className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
              !spec.referenceTenantId
                ? "border-council-strong bg-council-strong/5"
                : "border-border hover:border-council-strong/60"
            }`}
          >
            <input
              type="radio"
              name="scope"
              checked={!spec.referenceTenantId}
              onChange={() =>
                update((s) => ({ ...s, referenceTenantId: null }))
              }
              className="mt-0.5 accent-council-strong"
            />
            <span className="text-[12.5px] text-ink-1 leading-snug">
              <span className="font-semibold">
                {t("wizard.identify.scopeCrossTenant")}
              </span>
              <span className="block text-[10.5px] text-ink-3 mt-0.5">
                {t("wizard.identify.scopeCrossTenantHint")}
              </span>
            </span>
          </label>
          <label
            className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
              spec.referenceTenantId
                ? "border-warn bg-warn/10"
                : "border-border hover:border-council-strong/60"
            }`}
          >
            <input
              type="radio"
              name="scope"
              checked={!!spec.referenceTenantId}
              onChange={() =>
                update((s) => ({
                  ...s,
                  referenceTenantId:
                    directiveTenants[0]?.id ?? null,
                }))
              }
              className="mt-0.5 accent-council-strong"
            />
            <span className="text-[12.5px] text-ink-1 leading-snug flex-1">
              <span className="font-semibold">
                {t("wizard.identify.scopeTenantScoped")}
              </span>
              <span className="block text-[10.5px] text-ink-3 mt-0.5">
                {t("wizard.identify.scopeTenantScopedHint")}
              </span>
              {spec.referenceTenantId ? (
                <select
                  value={spec.referenceTenantId}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      referenceTenantId: e.target.value,
                    }))
                  }
                  className="mt-2 h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] px-2"
                >
                  {directiveTenants.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {locale === "ar" ? tt.nameAr : tt.nameEn}
                      {tt.isDemo ? " — demo" : ""}
                    </option>
                  ))}
                </select>
              ) : null}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ========================================================================
// Step 2: Users
// ========================================================================

function UsersStep({
  spec,
  update,
  reference,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
  reference: Reference;
}) {
  const { t } = useI18n();
  const tenantScoped = !!spec.referenceTenantId;
  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.step.users")} />

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.users.includeTitle")}
        </span>
        {(
          [
            { v: "all", label: t("wizard.users.includeAll") },
            { v: "none", label: t("wizard.users.includeNone") },
            { v: "roles", label: t("wizard.users.includeRoles") },
            {
              v: "guestsOrExternalUsers",
              label: t("wizard.users.includeGuests"),
            },
          ] as const
        ).map(({ v, label }) => {
          const active = spec.users.include.kind === v;
          return (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    users: {
                      ...s.users,
                      include: { ...s.users.include, kind: v },
                    },
                  }))
                }
                className="accent-council-strong"
              />
              <span className="text-[12.5px] text-ink-1">{label}</span>
            </label>
          );
        })}
      </div>

      {spec.users.include.kind === "roles" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
            {t("wizard.users.rolesPickerLabel")}
          </span>
          <div className="text-[10.5px] text-ink-3 mb-1">
            {t("wizard.users.rolesPickerHint")}
          </div>
          <RolePicker
            roles={reference.roles}
            value={spec.users.include.roleIds}
            onChange={(roleIds) =>
              update((s) => ({
                ...s,
                users: {
                  ...s.users,
                  include: { ...s.users.include, roleIds },
                },
              }))
            }
          />
        </div>
      ) : null}

      {spec.users.include.kind === "guestsOrExternalUsers" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
            {t("wizard.users.guestTypesLabel")}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {reference.guestTypes.map((g) => {
              const active = spec.users.include.guestTypes.includes(g.value);
              return (
                <label
                  key={g.value}
                  className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                    active
                      ? "border-council-strong bg-council-strong/5"
                      : "border-border hover:border-council-strong/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      update((s) => ({
                        ...s,
                        users: {
                          ...s.users,
                          include: {
                            ...s.users.include,
                            guestTypes: active
                              ? s.users.include.guestTypes.filter(
                                  (x) => x !== g.value,
                                )
                              : [...s.users.include.guestTypes, g.value],
                          },
                        },
                      }))
                    }
                    className="accent-council-strong"
                  />
                  <span className="text-[12px] text-ink-1">{g.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {tenantScoped ? (
        <div className="flex flex-col gap-3 p-3 rounded-md border border-warn/40 bg-warn/5">
          <div className="text-[11px] text-ink-2 leading-relaxed">
            {t("wizard.users.tenantLocalHint")}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
              {t("wizard.users.specificUsersLabel")}
            </span>
            <TenantTypeaheadPicker
              referenceTenantId={spec.referenceTenantId!}
              kind="users"
              value={spec.users.include.userIds}
              onChange={(ids) =>
                update((s) => ({
                  ...s,
                  users: {
                    ...s.users,
                    include: { ...s.users.include, userIds: ids },
                  },
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
              {t("wizard.users.specificGroupsLabel")}
            </span>
            <TenantTypeaheadPicker
              referenceTenantId={spec.referenceTenantId!}
              kind="groups"
              value={spec.users.include.groupIds}
              onChange={(ids) =>
                update((s) => ({
                  ...s,
                  users: {
                    ...s.users,
                    include: { ...s.users.include, groupIds: ids },
                  },
                }))
              }
            />
          </div>
        </div>
      ) : null}

      <hr className="border-border" />

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.users.excludeTitle")}
        </span>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={spec.users.exclude.excludeGlobalAdmins}
            onChange={(e) =>
              update((s) => ({
                ...s,
                users: {
                  ...s.users,
                  exclude: {
                    ...s.users.exclude,
                    excludeGlobalAdmins: e.target.checked,
                  },
                },
              }))
            }
            className="accent-council-strong mt-0.5"
          />
          <span className="text-[12.5px] text-ink-1">
            <span className="font-semibold inline-flex items-center gap-1">
              <ShieldCheck size={11} className="text-pos" />
              {t("wizard.users.excludeGaLabel")}
            </span>
            <span className="block text-[10.5px] text-ink-3 mt-0.5">
              {t("wizard.users.excludeGaHint")}
            </span>
          </span>
        </label>
        <div className="text-[11.5px] text-ink-2 mt-2">
          {t("wizard.users.excludeRolesLabel")}
        </div>
        <RolePicker
          roles={reference.roles}
          value={spec.users.exclude.roleIds}
          onChange={(roleIds) =>
            update((s) => ({
              ...s,
              users: { ...s.users, exclude: { ...s.users.exclude, roleIds } },
            }))
          }
        />
        {tenantScoped ? (
          <>
            <div className="text-[11.5px] text-ink-2 mt-2">
              {t("wizard.users.excludeSpecificUsersLabel")}
            </div>
            <TenantTypeaheadPicker
              referenceTenantId={spec.referenceTenantId!}
              kind="users"
              value={spec.users.exclude.userIds}
              onChange={(ids) =>
                update((s) => ({
                  ...s,
                  users: {
                    ...s.users,
                    exclude: { ...s.users.exclude, userIds: ids },
                  },
                }))
              }
            />
            <div className="text-[11.5px] text-ink-2 mt-2">
              {t("wizard.users.excludeSpecificGroupsLabel")}
            </div>
            <TenantTypeaheadPicker
              referenceTenantId={spec.referenceTenantId!}
              kind="groups"
              value={spec.users.exclude.groupIds}
              onChange={(ids) =>
                update((s) => ({
                  ...s,
                  users: {
                    ...s.users,
                    exclude: { ...s.users.exclude, groupIds: ids },
                  },
                }))
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function TenantTypeaheadPicker({
  referenceTenantId,
  kind,
  value,
  onChange,
}: {
  referenceTenantId: string;
  kind: "users" | "groups";
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; displayName: string; subtitle?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .directiveCustomPolicyTenantRef(referenceTenantId, kind, query)
        .then((r) => {
          if (!alive) return;
          const rows = (r.items as Array<Record<string, unknown>>).map(
            (raw) => {
              const id = String(raw.id);
              const displayName = String(raw.displayName ?? "");
              const subtitle =
                kind === "users"
                  ? String(raw.userPrincipalName ?? "")
                  : raw.memberCount !== undefined
                    ? `${raw.memberCount} members`
                    : "";
              return { id, displayName, subtitle };
            },
          );
          setResults(rows);
          // Cache display names for items already selected.
          setLabels((prev) => {
            const next = { ...prev };
            for (const r of rows) next[r.id] = r.displayName;
            return next;
          });
        })
        .catch(() => {
          if (!alive) return;
          setResults([]);
        })
        .finally(() => {
          if (!alive) return;
          setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [referenceTenantId, kind, query]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            kind === "users" ? "Search users…" : "Search groups…"
          }
          className="flex-1 h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] px-2.5"
        />
        {loading ? (
          <Loader2 size={12} className="text-ink-3 animate-spin" />
        ) : null}
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 h-6 px-2 rounded bg-council-strong/10 text-council-strong text-[11px]"
            >
              {labels[id] ?? id}
              <button
                onClick={() => toggle(id)}
                className="hover:text-neg"
                type="button"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {results.length > 0 ? (
        <div className="max-h-[180px] overflow-y-auto rounded-md border border-border bg-surface-1">
          {results.map((r) => {
            const active = value.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer border-b border-border/60 last:border-b-0 ${
                  active ? "bg-council-strong/5" : "hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(r.id)}
                  className="accent-council-strong"
                />
                <span className="text-[12px] text-ink-1 flex-1">
                  {r.displayName}
                </span>
                {r.subtitle ? (
                  <span className="text-[10.5px] text-ink-3 truncate max-w-[180px]">
                    {r.subtitle}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: Reference["roles"];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);
  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search roles…"
        className="h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] px-2.5"
      />
      <div className="max-h-[240px] overflow-y-auto rounded-md border border-border bg-surface-1">
        {filtered.map((r) => {
          const active = value.includes(r.id);
          return (
            <label
              key={r.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer border-b border-border/60 last:border-b-0 ${
                active ? "bg-council-strong/5" : "hover:bg-surface-2"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() =>
                  onChange(
                    active ? value.filter((x) => x !== r.id) : [...value, r.id],
                  )
                }
                className="accent-council-strong"
              />
              <span className="text-[12px] text-ink-1 flex-1">{r.name}</span>
              <span
                className={`text-[9.5px] uppercase tracking-[0.06em] font-semibold ${
                  r.tier === "critical"
                    ? "text-neg"
                    : r.tier === "high"
                      ? "text-warn"
                      : "text-ink-3"
                }`}
              >
                {r.tier}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ========================================================================
// Step 3: Apps
// ========================================================================

function AppsStep({
  spec,
  update,
  reference,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
  reference: Reference;
}) {
  const { t } = useI18n();
  const [customGuid, setCustomGuid] = useState("");

  const options: Array<{ v: Spec["apps"]["target"]; key: DictKey }> = [
    { v: "all", key: "wizard.apps.targetAll" },
    { v: "office365", key: "wizard.apps.targetOffice365" },
    { v: "adminPortals", key: "wizard.apps.targetAdminPortals" },
    { v: "azureManagement", key: "wizard.apps.targetAzureManagement" },
    { v: "specific", key: "wizard.apps.targetSpecific" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.step.apps")} />

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.apps.targetTitle")}
        </span>
        {options.map(({ v, key }) => {
          const active = spec.apps.target === v;
          return (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    apps: { ...s.apps, target: v },
                  }))
                }
                className="accent-council-strong"
              />
              <span className="text-[12.5px] text-ink-1">{t(key)}</span>
            </label>
          );
        })}
      </div>

      {spec.apps.target === "specific" ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10.5px] text-ink-3">
            {t("wizard.apps.specificHint")}
          </div>
          <AppPicker
            apps={reference.apps.filter((a) => a.id.length === 36)}
            value={spec.apps.includeAppIds}
            onChange={(ids) =>
              update((s) => ({
                ...s,
                apps: { ...s.apps, includeAppIds: ids },
              }))
            }
          />
          <div className="flex items-end gap-2 mt-1">
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-[11px] text-ink-2">
                {t("wizard.apps.addCustomGuid")}
              </span>
              <input
                value={customGuid}
                onChange={(e) => setCustomGuid(e.target.value)}
                placeholder={t("wizard.apps.addCustomPlaceholder")}
                className="h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[11.5px] px-2 keep-ltr"
              />
            </label>
            <button
              onClick={() => {
                if (!customGuid.trim()) return;
                update((s) => ({
                  ...s,
                  apps: {
                    ...s.apps,
                    includeAppIds: Array.from(
                      new Set([...s.apps.includeAppIds, customGuid.trim()]),
                    ),
                  },
                }));
                setCustomGuid("");
              }}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-council-strong text-white text-[11.5px] font-semibold"
            >
              <Plus size={10} />
              {t("wizard.apps.add")}
            </button>
          </div>
        </div>
      ) : null}

      <hr className="border-border" />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.apps.excludeTitle")}
        </span>
        <AppPicker
          apps={reference.apps.filter((a) => a.id.length === 36)}
          value={spec.apps.excludeAppIds}
          onChange={(ids) =>
            update((s) => ({ ...s, apps: { ...s.apps, excludeAppIds: ids } }))
          }
        />
      </div>
    </div>
  );
}

function AppPicker({
  apps,
  value,
  onChange,
}: {
  apps: Reference["apps"];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="max-h-[260px] overflow-y-auto rounded-md border border-border bg-surface-1">
      {apps.map((app) => {
        const active = value.includes(app.id);
        return (
          <label
            key={app.id}
            className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer border-b border-border/60 last:border-b-0 ${
              active ? "bg-council-strong/5" : "hover:bg-surface-2"
            }`}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() =>
                onChange(
                  active
                    ? value.filter((x) => x !== app.id)
                    : [...value, app.id],
                )
              }
              className="accent-council-strong"
            />
            <span className="text-[12px] text-ink-1 flex-1">{app.name}</span>
            <span className="text-[9.5px] text-ink-3 keep-ltr tabular truncate max-w-[220px]">
              {app.id}
            </span>
          </label>
        );
      })}
      {value
        .filter((v) => !apps.some((a) => a.id === v))
        .map((extra) => (
          <div
            key={extra}
            className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60 last:border-b-0 bg-surface-2"
          >
            <button
              onClick={() => onChange(value.filter((x) => x !== extra))}
              className="text-ink-3 hover:text-neg"
              title="Remove"
            >
              <X size={12} />
            </button>
            <span className="text-[12px] text-ink-2 flex-1 italic">
              (custom)
            </span>
            <span className="text-[9.5px] text-ink-3 keep-ltr tabular truncate max-w-[260px]">
              {extra}
            </span>
          </div>
        ))}
    </div>
  );
}

// ========================================================================
// Step 4: Conditions
// ========================================================================

const RISK_VALUES = ["low", "medium", "high"] as const;
const PLATFORMS = [
  { value: "android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "windows", label: "Windows" },
  { value: "macOS", label: "macOS" },
  { value: "linux", label: "Linux" },
  { value: "windowsPhone", label: "Windows Phone" },
] as const;
const CLIENT_APP_TYPES = [
  { value: "browser", label: "Browser" },
  {
    value: "mobileAppsAndDesktopClients",
    label: "Mobile apps & desktop clients",
  },
  { value: "exchangeActiveSync", label: "Exchange ActiveSync (legacy)" },
  { value: "other", label: "Other legacy (IMAP/POP/SMTP)" },
] as const;

function ConditionsStep({
  spec,
  update,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.step.conditions")} />
      <p className="text-[11.5px] text-ink-3">
        {t("wizard.conditions.title")}
      </p>

      <CheckboxGroup
        title={t("wizard.conditions.userRisk")}
        options={RISK_VALUES.map((v) => ({ value: v, label: v }))}
        value={spec.conditions.userRiskLevels}
        onChange={(next) =>
          update((s) => ({
            ...s,
            conditions: { ...s.conditions, userRiskLevels: next },
          }))
        }
      />
      <CheckboxGroup
        title={t("wizard.conditions.signInRisk")}
        options={RISK_VALUES.map((v) => ({ value: v, label: v }))}
        value={spec.conditions.signInRiskLevels}
        onChange={(next) =>
          update((s) => ({
            ...s,
            conditions: { ...s.conditions, signInRiskLevels: next },
          }))
        }
      />
      <CheckboxGroup
        title={t("wizard.conditions.platforms")}
        options={[...PLATFORMS]}
        value={spec.conditions.platforms}
        onChange={(next) =>
          update((s) => ({
            ...s,
            conditions: { ...s.conditions, platforms: next },
          }))
        }
      />
      <CheckboxGroup
        title={t("wizard.conditions.clientAppTypes")}
        options={[...CLIENT_APP_TYPES]}
        value={spec.conditions.clientAppTypes}
        onChange={(next) =>
          update((s) => ({
            ...s,
            conditions: { ...s.conditions, clientAppTypes: next },
          }))
        }
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.conditions.locations")}
        </span>
        {(
          [
            { v: "any", label: t("wizard.conditions.locationsAny") },
            { v: "trustedOnly", label: t("wizard.conditions.locationsTrusted") },
            ...(spec.referenceTenantId
              ? [{ v: "specific" as const, label: t("wizard.conditions.locationsSpecific") }]
              : []),
          ] as Array<{ v: Spec["conditions"]["locations"]; label: string }>
        ).map(({ v, label }) => {
          const active = spec.conditions.locations === v;
          return (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    conditions: { ...s.conditions, locations: v },
                  }))
                }
                className="accent-council-strong"
              />
              <span className="text-[12.5px] text-ink-1">{label}</span>
            </label>
          );
        })}
      </div>

      {spec.conditions.locations === "specific" && spec.referenceTenantId ? (
        <NamedLocationsPicker
          referenceTenantId={spec.referenceTenantId}
          include={spec.conditions.includeLocations}
          exclude={spec.conditions.excludeLocations}
          onChangeInclude={(ids) =>
            update((s) => ({
              ...s,
              conditions: { ...s.conditions, includeLocations: ids },
            }))
          }
          onChangeExclude={(ids) =>
            update((s) => ({
              ...s,
              conditions: { ...s.conditions, excludeLocations: ids },
            }))
          }
        />
      ) : null}

      <hr className="border-border" />

      <DeviceFilterSection
        filter={spec.conditions.deviceFilter}
        onChange={(df) =>
          update((s) => ({
            ...s,
            conditions: { ...s.conditions, deviceFilter: df },
          }))
        }
      />
    </div>
  );
}

function NamedLocationsPicker({
  referenceTenantId,
  include,
  exclude,
  onChangeInclude,
  onChangeExclude,
}: {
  referenceTenantId: string;
  include: string[];
  exclude: string[];
  onChangeInclude: (ids: string[]) => void;
  onChangeExclude: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const [locations, setLocations] = useState<
    Array<{ id: string; displayName: string; isTrusted: boolean; kind: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .directiveCustomPolicyTenantRef(referenceTenantId, "namedLocations")
      .then((r) => {
        if (!alive) return;
        setLocations(
          r.items.map((x) => ({
            id: String(x.id),
            displayName: String(x.displayName ?? ""),
            isTrusted: !!x.isTrusted,
            kind: String(x.kind ?? "other"),
          })),
        );
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [referenceTenantId]);

  const toggle = (
    id: string,
    current: string[],
    setter: (ids: string[]) => void,
  ) => {
    setter(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md border border-warn/40 bg-warn/5">
      <div className="text-[11px] text-ink-2">
        {t("wizard.conditions.namedLocationsHint")}
      </div>
      {loading ? (
        <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
      ) : locations.length === 0 ? (
        <div className="text-[12px] text-ink-3">
          {t("wizard.conditions.namedLocationsEmpty")}
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto rounded-md border border-border bg-surface-1">
          {locations.map((loc) => {
            const incl = include.includes(loc.id);
            const excl = exclude.includes(loc.id);
            return (
              <div
                key={loc.id}
                className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60 last:border-b-0"
              >
                <span className="text-[12px] text-ink-1 flex-1">
                  {loc.displayName}
                  {loc.isTrusted ? (
                    <span className="ms-1 text-[10px] text-pos">
                      (trusted)
                    </span>
                  ) : null}
                </span>
                <label className="inline-flex items-center gap-1 text-[11px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={incl}
                    onChange={() => toggle(loc.id, include, onChangeInclude)}
                    className="accent-council-strong"
                  />
                  include
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={excl}
                    onChange={() => toggle(loc.id, exclude, onChangeExclude)}
                    className="accent-neg"
                  />
                  exclude
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeviceFilterSection({
  filter,
  onChange,
}: {
  filter: Spec["conditions"]["deviceFilter"];
  onChange: (df: Spec["conditions"]["deviceFilter"]) => void;
}) {
  const { t } = useI18n();
  const addRule = () =>
    onChange({
      ...filter,
      rules: [
        ...filter.rules,
        { attr: "trustType", op: "-eq", value: "AzureAD" },
      ],
    });
  const removeRule = (idx: number) =>
    onChange({
      ...filter,
      rules: filter.rules.filter((_, i) => i !== idx),
    });
  const updateRule = (
    idx: number,
    patch: Partial<Spec["conditions"]["deviceFilter"]["rules"][number]>,
  ) =>
    onChange({
      ...filter,
      rules: filter.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
        {t("wizard.conditions.deviceFilter")}
      </span>
      <div className="text-[10.5px] text-ink-3">
        {t("wizard.conditions.deviceFilterHint")}
      </div>
      <label className="inline-flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={filter.enabled}
          onChange={(e) =>
            onChange({ ...filter, enabled: e.target.checked })
          }
          className="accent-council-strong"
        />
        <span className="text-ink-1">
          {t("wizard.conditions.deviceFilterEnable")}
        </span>
      </label>
      {filter.enabled ? (
        <div className="flex flex-col gap-2 ms-6">
          <div className="flex gap-2">
            {(["include", "exclude"] as const).map((m) => (
              <label
                key={m}
                className={`inline-flex items-center gap-1.5 h-7 px-2 rounded border text-[11px] cursor-pointer ${
                  filter.mode === m
                    ? "border-council-strong bg-council-strong/5 text-ink-1"
                    : "border-border text-ink-2 hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  checked={filter.mode === m}
                  onChange={() => onChange({ ...filter, mode: m })}
                  className="accent-council-strong"
                />
                {m}
              </label>
            ))}
          </div>
          {filter.rules.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 flex-wrap"
            >
              <span className="text-[11px] text-ink-3">device.</span>
              <select
                value={rule.attr}
                onChange={(e) =>
                  updateRule(idx, { attr: e.target.value as typeof rule.attr })
                }
                className="h-7 rounded border border-border bg-surface-1 text-[11.5px] px-2"
              >
                <option value="trustType">trustType</option>
                <option value="isCompliant">isCompliant</option>
                <option value="mdmAppId">mdmAppId</option>
                <option value="operatingSystem">operatingSystem</option>
              </select>
              <select
                value={rule.op}
                onChange={(e) =>
                  updateRule(idx, { op: e.target.value as typeof rule.op })
                }
                className="h-7 rounded border border-border bg-surface-1 text-[11.5px] px-2"
              >
                <option value="-eq">-eq</option>
                <option value="-ne">-ne</option>
                <option value="-contains">-contains</option>
              </select>
              <input
                value={rule.value}
                onChange={(e) => updateRule(idx, { value: e.target.value })}
                placeholder={
                  rule.attr === "isCompliant"
                    ? "true or false"
                    : rule.attr === "trustType"
                      ? 'AzureAD | ServerAD | Workplace'
                      : rule.attr === "operatingSystem"
                        ? 'Windows | iOS | Android | macOS | Linux'
                        : ""
                }
                className="h-7 rounded border border-border bg-surface-1 text-[11.5px] px-2 flex-1 min-w-[160px]"
              />
              <button
                onClick={() => removeRule(idx)}
                className="text-ink-3 hover:text-neg"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addRule}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11.5px] text-ink-1 hover:bg-surface-2 self-start"
          >
            <Plus size={11} />
            {t("wizard.conditions.deviceFilterAdd")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CheckboxGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
        {title}
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={`flex items-center gap-2 rounded-md border p-1.5 px-2 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() =>
                  onChange(
                    active
                      ? value.filter((x) => x !== o.value)
                      : [...value, o.value],
                  )
                }
                className="accent-council-strong"
              />
              <span className="text-[12px] text-ink-1 capitalize">
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ========================================================================
// Step 5: Grant
// ========================================================================

function GrantStep({
  spec,
  update,
  reference,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
  reference: Reference;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.step.grant")} />
      <div className="text-[11.5px] text-ink-3">{t("wizard.grant.title")}</div>

      <div className="flex flex-col gap-2">
        {(
          [
            { v: "block", label: t("wizard.grant.block") },
            {
              v: "grantWithRequirements",
              label: t("wizard.grant.grantWithRequirements"),
            },
          ] as const
        ).map(({ v, label }) => {
          const active = spec.grant.kind === v;
          return (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer ${
                active
                  ? v === "block"
                    ? "border-neg bg-neg/10"
                    : "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    grant: { ...s.grant, kind: v },
                  }))
                }
                className="accent-council-strong"
              />
              <span className="text-[12.5px] text-ink-1">{label}</span>
            </label>
          );
        })}
      </div>

      {spec.grant.kind === "grantWithRequirements" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
              {t("wizard.grant.operatorTitle")}
            </span>
            <div className="flex gap-2">
              {(["OR", "AND"] as const).map((op) => {
                const active = spec.grant.operator === op;
                return (
                  <label
                    key={op}
                    className={`flex-1 flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                      active
                        ? "border-council-strong bg-council-strong/5"
                        : "border-border hover:border-council-strong/60"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={active}
                      onChange={() =>
                        update((s) => ({
                          ...s,
                          grant: { ...s.grant, operator: op },
                        }))
                      }
                      className="accent-council-strong"
                    />
                    <span className="text-[12px] text-ink-1">
                      {op === "AND"
                        ? t("wizard.grant.operatorAnd")
                        : t("wizard.grant.operatorOr")}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <AuthStrengthSelect
            spec={spec}
            update={update}
            builtIn={reference.authStrengths}
          />

          {spec.referenceTenantId ? (
            <TermsOfUsePicker
              referenceTenantId={spec.referenceTenantId}
              value={spec.grant.termsOfUseIds}
              onChange={(ids) =>
                update((s) => ({
                  ...s,
                  grant: { ...s.grant, termsOfUseIds: ids },
                }))
              }
            />
          ) : null}

          <GrantCheckbox
            label={t("wizard.grant.requireMfa")}
            checked={spec.grant.requireMfa}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requireMfa: next },
              }))
            }
            disabled={!!spec.grant.authenticationStrengthId}
          />
          <GrantCheckbox
            label={t("wizard.grant.requireCompliantDevice")}
            checked={spec.grant.requireCompliantDevice}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requireCompliantDevice: next },
              }))
            }
          />
          <GrantCheckbox
            label={t("wizard.grant.requireHybridJoined")}
            checked={spec.grant.requireHybridJoinedDevice}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requireHybridJoinedDevice: next },
              }))
            }
          />
          <GrantCheckbox
            label={t("wizard.grant.requireApprovedApp")}
            checked={spec.grant.requireApprovedClientApp}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requireApprovedClientApp: next },
              }))
            }
          />
          <GrantCheckbox
            label={t("wizard.grant.requireCompliantApp")}
            checked={spec.grant.requireCompliantApplication}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requireCompliantApplication: next },
              }))
            }
          />
          <GrantCheckbox
            label={t("wizard.grant.requirePasswordChange")}
            checked={spec.grant.requirePasswordChange}
            onChange={(next) =>
              update((s) => ({
                ...s,
                grant: { ...s.grant, requirePasswordChange: next },
              }))
            }
          />
        </>
      ) : null}
    </div>
  );
}

function AuthStrengthSelect({
  spec,
  update,
  builtIn,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
  builtIn: Reference["authStrengths"];
}) {
  const { t } = useI18n();
  const [customStrengths, setCustomStrengths] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);

  useEffect(() => {
    if (!spec.referenceTenantId) {
      setCustomStrengths([]);
      return;
    }
    let alive = true;
    api
      .directiveCustomPolicyTenantRef(spec.referenceTenantId, "authStrengths")
      .then((r) => {
        if (!alive) return;
        setCustomStrengths(
          r.items
            .filter((x) => x.isBuiltIn === false)
            .map((x) => ({
              id: String(x.id),
              name: String(x.displayName ?? ""),
              description: String(x.description ?? ""),
            })),
        );
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, [spec.referenceTenantId]);

  const all = [
    ...builtIn.map((x) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      isBuiltIn: true,
    })),
    ...customStrengths.map((x) => ({ ...x, isBuiltIn: false })),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
        {t("wizard.grant.authStrengthLabel")}
      </span>
      <select
        value={spec.grant.authenticationStrengthId ?? ""}
        onChange={(e) =>
          update((s) => ({
            ...s,
            grant: {
              ...s.grant,
              authenticationStrengthId:
                e.target.value === "" ? undefined : e.target.value,
            },
          }))
        }
        className="h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12.5px] px-2"
      >
        <option value="">{t("wizard.grant.authStrengthNone")}</option>
        <optgroup label="Built-in">
          {builtIn.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
        {customStrengths.length > 0 ? (
          <optgroup label="Custom (from reference tenant)">
            {customStrengths.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {spec.grant.authenticationStrengthId ? (
        <div className="text-[10.5px] text-ink-3">
          {
            all.find((a) => a.id === spec.grant.authenticationStrengthId)
              ?.description
          }
        </div>
      ) : null}
    </div>
  );
}

function TermsOfUsePicker({
  referenceTenantId,
  value,
  onChange,
}: {
  referenceTenantId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const [tou, setTou] = useState<
    Array<{ id: string; displayName: string; isEnabled: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .directiveCustomPolicyTenantRef(referenceTenantId, "termsOfUse")
      .then((r) => {
        if (!alive) return;
        setTou(
          r.items.map((x) => ({
            id: String(x.id),
            displayName: String(x.displayName ?? ""),
            isEnabled: !!x.isEnabled,
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [referenceTenantId]);

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-md border border-warn/40 bg-warn/5">
      <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
        {t("wizard.grant.touLabel")}
      </span>
      <p className="text-[10.5px] text-ink-3">{t("wizard.grant.touHint")}</p>
      {loading ? (
        <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
      ) : tou.length === 0 ? (
        <div className="text-[12px] text-ink-3">
          {t("wizard.grant.touEmpty")}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {tou.map((t1) => {
            const active = value.includes(t1.id);
            return (
              <label
                key={t1.id}
                className={`flex items-center gap-2 rounded border p-1.5 px-2 cursor-pointer ${
                  active
                    ? "border-council-strong bg-council-strong/5"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() =>
                    onChange(
                      active
                        ? value.filter((x) => x !== t1.id)
                        : [...value, t1.id],
                    )
                  }
                  className="accent-council-strong"
                />
                <span className="text-[12px] text-ink-1 flex-1">
                  {t1.displayName}
                </span>
                {!t1.isEnabled ? (
                  <span className="text-[10px] text-warn">disabled</span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrantCheckbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
        checked
          ? "border-council-strong bg-council-strong/5"
          : "border-border hover:border-council-strong/60"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-council-strong"
        disabled={disabled}
      />
      <span className="text-[12.5px] text-ink-1">{label}</span>
    </label>
  );
}

// ========================================================================
// Step 6: Session
// ========================================================================

function SessionStep({
  spec,
  update,
}: {
  spec: Spec;
  update: (mut: (s: Spec) => Spec) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.step.session")} />
      <div className="text-[11.5px] text-ink-3">{t("wizard.session.title")}</div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={spec.session.signInFrequency.enabled}
            onChange={(e) =>
              update((s) => ({
                ...s,
                session: {
                  ...s.session,
                  signInFrequency: {
                    ...s.session.signInFrequency,
                    enabled: e.target.checked,
                  },
                },
              }))
            }
            className="accent-council-strong"
          />
          <span className="text-[12.5px] text-ink-1">
            {t("wizard.session.signInFrequencyEnable")}
          </span>
        </label>
        {spec.session.signInFrequency.enabled ? (
          <div className="ms-6 flex items-center gap-2">
            <span className="text-[12px] text-ink-2">
              {t("wizard.session.signInFrequencyValue")}
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={spec.session.signInFrequency.value}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  session: {
                    ...s.session,
                    signInFrequency: {
                      ...s.session.signInFrequency,
                      value: Number(e.target.value),
                    },
                  },
                }))
              }
              className="h-8 w-20 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] px-2"
            />
            <select
              value={spec.session.signInFrequency.type}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  session: {
                    ...s.session,
                    signInFrequency: {
                      ...s.session.signInFrequency,
                      type: e.target.value as "hours" | "days",
                    },
                  },
                }))
              }
              className="h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] px-2"
            >
              <option value="hours">
                {t("wizard.session.signInFrequencyTypeHours")}
              </option>
              <option value="days">
                {t("wizard.session.signInFrequencyTypeDays")}
              </option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
          {t("wizard.session.persistentBrowser")}
        </span>
        {(
          [
            { v: "default", key: "wizard.session.persistentDefault" },
            { v: "never", key: "wizard.session.persistentNever" },
            { v: "always", key: "wizard.session.persistentAlways" },
          ] as const
        ).map(({ v, key }) => {
          const active = spec.session.persistentBrowser === v;
          return (
            <label
              key={v}
              className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                active
                  ? "border-council-strong bg-council-strong/5"
                  : "border-border hover:border-council-strong/60"
              }`}
            >
              <input
                type="radio"
                checked={active}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    session: { ...s.session, persistentBrowser: v },
                  }))
                }
                className="accent-council-strong"
              />
              <span className="text-[12px] text-ink-1">
                {t(key as DictKey)}
              </span>
            </label>
          );
        })}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={spec.session.applicationEnforcedRestrictions}
          onChange={(e) =>
            update((s) => ({
              ...s,
              session: {
                ...s.session,
                applicationEnforcedRestrictions: e.target.checked,
              },
            }))
          }
          className="accent-council-strong"
        />
        <span className="text-[12.5px] text-ink-1">
          {t("wizard.session.appEnforced")}
        </span>
      </label>
    </div>
  );
}

// ========================================================================
// Step 7: Review + push
// ========================================================================

function ReviewStep({
  policyId,
  spec,
  meta,
  locale,
}: {
  policyId: number;
  spec: Spec;
  meta: {
    name: string;
    description: string | null;
    riskTier: "low" | "medium" | "high";
    previewBody: unknown;
  };
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  const [showBody, setShowBody] = useState(false);
  const [tenants, setTenants] = useState<
    Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      consentMode: string;
      isDemo: boolean;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    // When tenant-scoped, pre-select the reference tenant so the push
    // button is active immediately.
    spec.referenceTenantId ? new Set([spec.referenceTenantId]) : new Set(),
  );
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<null | Awaited<
    ReturnType<typeof api.directiveCustomPolicyPush>
  >>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEntities()
      .then((r) =>
        setTenants(
          r.entities.filter((e) => e.consentMode === "directive"),
        ),
      )
      .catch((e) => setError((e as Error).message));
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const doPush = async () => {
    setPushing(true);
    setError(null);
    try {
      const r = await api.directiveCustomPolicyPush(policyId, {
        targetTenantIds: Array.from(selectedIds),
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CardHeader title={t("wizard.review.title")} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-surface-1 p-3">
          <div className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-semibold mb-1">
            {t("wizard.review.riskTier")}
          </div>
          <RiskChip tier={meta.riskTier} />
        </div>
        <div className="rounded-md border border-border bg-surface-1 p-3">
          <div className="text-[11px] text-ink-3 uppercase tracking-[0.06em] font-semibold mb-1">
            {t("wizard.review.grant")}
          </div>
          <div className="text-[12px] text-ink-1 leading-relaxed">
            {describeGrantForDisplay(spec)}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowBody((v) => !v)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-1 text-ink-2 text-[11.5px] font-semibold hover:bg-surface-2 self-start"
      >
        {showBody
          ? t("wizard.review.hideBody")
          : t("wizard.review.showBody")}
      </button>
      {showBody ? (
        <pre className="text-[11px] text-ink-1 bg-surface-2 rounded-md border border-border p-3 overflow-x-auto keep-ltr">
          {JSON.stringify(meta.previewBody, null, 2)}
        </pre>
      ) : null}

      <hr className="border-border" />

      <div>
        <div className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-[0.06em] mb-2">
          {t("wizard.review.targetPickerTitle")}
        </div>
        {spec.referenceTenantId ? (
          <div className="text-[11px] text-warn mb-2">
            {t("wizard.review.scopedTargetOnly")}
          </div>
        ) : null}
        {tenants.length === 0 ? (
          <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
            {tenants.map((tenant) => {
              const active = selectedIds.has(tenant.id);
              // In tenant-scoped mode, only the reference tenant is selectable.
              const blocked =
                !!spec.referenceTenantId &&
                tenant.id !== spec.referenceTenantId;
              return (
                <label
                  key={tenant.id}
                  className={`flex items-center gap-2 rounded-md border p-2 ${
                    blocked
                      ? "border-border bg-surface-3 opacity-50 cursor-not-allowed"
                      : active
                        ? "border-council-strong bg-council-strong/5 cursor-pointer"
                        : "border-border bg-surface-1 hover:border-council-strong/60 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={blocked}
                    onChange={() => toggle(tenant.id)}
                    className="accent-council-strong"
                  />
                  <span className="text-[12px] text-ink-1 flex-1 min-w-0 truncate">
                    {locale === "ar" ? tenant.nameAr : tenant.nameEn}
                  </span>
                  {tenant.isDemo ? (
                    <span className="text-[9.5px] uppercase tracking-[0.06em] border border-accent/50 text-accent rounded px-1.5 py-px font-semibold">
                      demo
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12px] text-ink-1">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-md border border-border bg-surface-1 p-3">
          <div className="text-[12.5px] font-semibold text-ink-1 mb-2">
            Push #{result.pushRequestId} complete
          </div>
          <ul className="flex flex-col gap-1 text-[12px]">
            {result.perTenant.map((r) => {
              const tenant = tenants.find((t) => t.id === r.tenantId);
              const name = tenant
                ? locale === "ar"
                  ? tenant.nameAr
                  : tenant.nameEn
                : r.tenantId;
              return (
                <li
                  key={r.tenantId}
                  className="flex items-center gap-2 justify-between"
                >
                  <span className="text-ink-1 truncate flex-1 min-w-0">
                    {name}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-semibold tracking-[0.06em] px-1.5 py-0.5 rounded border ${
                      r.status === "success"
                        ? "text-pos border-pos/40 bg-pos/10"
                        : r.status === "already_applied"
                          ? "text-ink-2 border-border bg-surface-3"
                          : r.status === "simulated"
                            ? "text-accent border-accent/40 bg-accent/10"
                            : "text-neg border-neg/40 bg-neg/10"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <button
        onClick={doPush}
        disabled={pushing || selectedIds.size === 0}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-60 self-start"
      >
        {pushing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Send size={12} />
        )}
        {t("wizard.review.pushCta", { count: String(selectedIds.size) })}
      </button>
    </div>
  );
}

// ========================================================================
// Side panel: always-visible review
// ========================================================================

function ReviewPanel({
  spec,
  meta,
  onJump,
}: {
  spec: Spec;
  meta: {
    name: string;
    description: string | null;
    riskTier: "low" | "medium" | "high";
    previewBody: unknown;
  };
  onJump: (s: StepKey) => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader title={spec.name || "(unnamed policy)"} />
      <div className="flex items-center gap-2 mb-3">
        <RiskChip tier={meta.riskTier} />
        <StateChip state={spec.state} />
      </div>
      <dl className="text-[11.5px] text-ink-2 space-y-2">
        <PanelRow
          onClick={() => onJump("users")}
          label={t("wizard.step.users")}
        >
          {describeUsers(spec)}
        </PanelRow>
        <PanelRow onClick={() => onJump("apps")} label={t("wizard.step.apps")}>
          {describeApps(spec)}
        </PanelRow>
        <PanelRow
          onClick={() => onJump("conditions")}
          label={t("wizard.step.conditions")}
        >
          {describeConditions(spec)}
        </PanelRow>
        <PanelRow
          onClick={() => onJump("grant")}
          label={t("wizard.step.grant")}
        >
          {describeGrantForDisplay(spec)}
        </PanelRow>
        <PanelRow
          onClick={() => onJump("session")}
          label={t("wizard.step.session")}
        >
          {describeSession(spec)}
        </PanelRow>
      </dl>
      <button
        onClick={() => onJump("review")}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold"
      >
        <Play size={12} />
        {t("wizard.pushCta")}
      </button>
    </Card>
  );
}

function PanelRow({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-surface-2 rounded px-1 -mx-1"
      onClick={onClick}
    >
      <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-[0.06em]">
        {label}
      </dt>
      <dd className="text-[11.5px] text-ink-1 mt-0.5">{children}</dd>
    </div>
  );
}

function describeUsers(spec: Spec): string {
  const inc = spec.users.include;
  let s = "";
  if (inc.kind === "all") s = "All users";
  else if (inc.kind === "none") s = "No users";
  else if (inc.kind === "roles")
    s = `${inc.roleIds.length} directory role(s)`;
  else s = `Guests (${inc.guestTypes.length} type${inc.guestTypes.length === 1 ? "" : "s"})`;
  const excl = spec.users.exclude;
  const extras: string[] = [];
  if (excl.excludeGlobalAdmins) extras.push("excl. GAs");
  if (excl.roleIds.length > 0)
    extras.push(`excl. ${excl.roleIds.length} role(s)`);
  return extras.length ? `${s} (${extras.join(", ")})` : s;
}

function describeApps(spec: Spec): string {
  switch (spec.apps.target) {
    case "all":
      return "All cloud apps";
    case "office365":
      return "Office 365";
    case "adminPortals":
      return "Admin portals";
    case "azureManagement":
      return "Azure management";
    case "specific":
      return `${spec.apps.includeAppIds.length} specific app(s)`;
  }
}

function describeConditions(spec: Spec): string {
  const c = spec.conditions;
  const parts: string[] = [];
  if (c.userRiskLevels.length) parts.push(`user risk: ${c.userRiskLevels.join(",")}`);
  if (c.signInRiskLevels.length)
    parts.push(`sign-in risk: ${c.signInRiskLevels.join(",")}`);
  if (c.platforms.length) parts.push(`platforms: ${c.platforms.length}`);
  if (c.clientAppTypes.length)
    parts.push(`client apps: ${c.clientAppTypes.length}`);
  if (c.locations === "trustedOnly") parts.push("trusted locations only");
  return parts.length ? parts.join(" · ") : "none";
}

function describeGrantForDisplay(spec: Spec): string {
  if (spec.grant.kind === "block") return "BLOCK";
  const parts: string[] = [];
  if (spec.grant.authenticationStrengthId) {
    parts.push(
      spec.grant.authenticationStrengthId.endsWith("003")
        ? "phishing-resistant MFA"
        : spec.grant.authenticationStrengthId.endsWith("002")
          ? "passwordless MFA"
          : "MFA",
    );
  } else if (spec.grant.requireMfa) parts.push("MFA");
  if (spec.grant.requireCompliantDevice) parts.push("compliant device");
  if (spec.grant.requireHybridJoinedDevice) parts.push("hybrid-joined");
  if (spec.grant.requireApprovedClientApp) parts.push("approved app");
  if (spec.grant.requireCompliantApplication) parts.push("app protection");
  if (spec.grant.requirePasswordChange) parts.push("password change");
  if (!parts.length) return "Grant (no requirements)";
  return parts.join(spec.grant.operator === "AND" ? " AND " : " OR ");
}

function describeSession(spec: Spec): string {
  const parts: string[] = [];
  if (spec.session.signInFrequency.enabled)
    parts.push(
      `sign-in every ${spec.session.signInFrequency.value} ${spec.session.signInFrequency.type}`,
    );
  if (spec.session.persistentBrowser !== "default")
    parts.push(`persistent: ${spec.session.persistentBrowser}`);
  if (spec.session.applicationEnforcedRestrictions)
    parts.push("app-enforced restrictions");
  return parts.length ? parts.join(" · ") : "none";
}

function RiskChip({ tier }: { tier: "low" | "medium" | "high" }) {
  const tone =
    tier === "high"
      ? "text-neg border-neg/40 bg-neg/10"
      : tier === "medium"
        ? "text-warn border-warn/40 bg-warn/10"
        : "text-pos border-pos/40 bg-pos/10";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {tier}
    </span>
  );
}

function StateChip({ state }: { state: Spec["state"] }) {
  const tone =
    state === "enabled"
      ? "text-warn border-warn/40 bg-warn/10"
      : state === "enabledForReportingButNotEnforced"
        ? "text-ink-2 border-border bg-surface-3"
        : "text-ink-3 border-border bg-surface-3";
  const label =
    state === "enabled"
      ? "ENABLED"
      : state === "enabledForReportingButNotEnforced"
        ? "REPORT-ONLY"
        : "DISABLED";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-[0.04em] border ${tone}`}
    >
      {label}
    </span>
  );
}
