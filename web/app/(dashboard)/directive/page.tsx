"use client";

import { useCallback, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Network,
  Package,
  Radar,
  Lock,
  Loader2,
  Send,
  RefreshCw,
  Undo2,
  Play,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Pencil,
  Trash2,
  Plus,
  Wand2,
  X,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
import { useFmtNum } from "@/lib/i18n/num";
import { api } from "@/lib/api/client";
import type { DictKey } from "@/lib/i18n/dict";

/**
 * /directive — top-level page only reachable in directive-mode deployments.
 *
 * Phase 2 surfaces: capability cards for the shipped Phase 2 actions flip
 * from "Planned" to "Available"; a threat-submission console and the
 * audit log table render below the roadmap.
 */

type Status = "available" | "in_progress" | "planned";

type Capability = {
  icon: typeof Gavel;
  titleKey:
    | "directive.cap.incidentOps.title"
    | "directive.cap.riskyUsers.title"
    | "directive.cap.threatSubmissions.title"
    | "directive.cap.caBaselines.title"
    | "directive.cap.intuneBaselines.title"
    | "directive.cap.iocPush.title"
    | "directive.cap.deviceIsolation.title"
    | "directive.cap.namedLocations.title";
  bodyKey:
    | "directive.cap.incidentOps.body"
    | "directive.cap.riskyUsers.body"
    | "directive.cap.threatSubmissions.body"
    | "directive.cap.caBaselines.body"
    | "directive.cap.intuneBaselines.body"
    | "directive.cap.iocPush.body"
    | "directive.cap.deviceIsolation.body"
    | "directive.cap.namedLocations.body";
  phase: 2 | 3 | 4 | 5;
  status: Status;
};

const CAPABILITIES: Capability[] = [
  {
    icon: ShieldAlert,
    titleKey: "directive.cap.incidentOps.title",
    bodyKey: "directive.cap.incidentOps.body",
    phase: 2,
    status: "available",
  },
  {
    icon: UserX,
    titleKey: "directive.cap.riskyUsers.title",
    bodyKey: "directive.cap.riskyUsers.body",
    phase: 2,
    status: "available",
  },
  {
    icon: Radar,
    titleKey: "directive.cap.threatSubmissions.title",
    bodyKey: "directive.cap.threatSubmissions.body",
    phase: 2,
    status: "available",
  },
  {
    icon: Lock,
    titleKey: "directive.cap.caBaselines.title",
    bodyKey: "directive.cap.caBaselines.body",
    phase: 3,
    status: "available",
  },
  {
    icon: Package,
    titleKey: "directive.cap.intuneBaselines.title",
    bodyKey: "directive.cap.intuneBaselines.body",
    phase: 4,
    status: "planned",
  },
  {
    icon: ShieldCheck,
    titleKey: "directive.cap.iocPush.title",
    bodyKey: "directive.cap.iocPush.body",
    phase: 5,
    status: "planned",
  },
  {
    icon: Network,
    titleKey: "directive.cap.deviceIsolation.title",
    bodyKey: "directive.cap.deviceIsolation.body",
    phase: 5,
    status: "planned",
  },
  {
    icon: Gavel,
    titleKey: "directive.cap.namedLocations.title",
    bodyKey: "directive.cap.namedLocations.body",
    phase: 3,
    status: "planned",
  },
];

type AuditRow = Awaited<ReturnType<typeof api.directiveAudit>>["actions"][number];

export default function DirectivePage() {
  const { t, locale } = useI18n();
  const fmtRelative = useFmtRelative();
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.whoami>> | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .whoami()
      .then((r) => {
        if (!alive) return;
        setMe(r);
        setChecked(true);
      })
      .catch(() => setChecked(true));
    return () => {
      alive = false;
    };
  }, []);

  if (checked && me && me.deploymentMode !== "directive") {
    redirect("/maturity");
  }

  const demoMode = me?.demoMode ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="eyebrow">
          <Gavel size={11} className="inline -mt-0.5 me-1" />
          {t("directive.eyebrow")}
        </div>
        <h1 className="text-2xl font-semibold text-ink-1 mt-1 tracking-tight">
          {t("directive.title")}
        </h1>
        <p className="text-ink-2 text-[13px] mt-1 max-w-3xl">
          {t("directive.subtitle")}
        </p>
      </div>

      {demoMode ? (
        <div className="rounded-md border border-accent/50 bg-accent/10 p-3 flex items-start gap-2.5">
          <ShieldAlert
            size={14}
            className="text-accent mt-0.5 shrink-0"
            strokeWidth={2.2}
          />
          <div className="text-[12.5px] text-ink-1 leading-relaxed">
            <div className="font-semibold">
              {t("directive.demoBanner.title")}
            </div>
            <div className="text-ink-2 mt-0.5">
              {t("directive.demoBanner.body")}
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={t("directive.roadmap.title")}
          subtitle={t("directive.roadmap.subtitle")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="rounded-md border border-border bg-surface-1 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-9 w-9 grid place-items-center rounded-md bg-surface-3 text-ink-1">
                    <Icon size={16} strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-semibold text-ink-1">
                        {t(c.titleKey)}
                      </h3>
                      <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-accent border border-accent/40 rounded px-1.5 py-px">
                        {t("directive.phase", { n: String(c.phase) })}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">
                      {t(c.bodyKey)}
                    </p>
                    <div className="mt-2">
                      <StatusChip status={c.status} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <BaselinesSection locale={locale} />

      <CustomPoliciesSection fmtRelative={fmtRelative} />

      <BaselinesStatusSection locale={locale} fmtRelative={fmtRelative} />

      <PushHistorySection fmtRelative={fmtRelative} />

      <ThreatSubmissionConsole locale={locale} />

      <AuditLogSection fmtRelative={fmtRelative} />

      <Card>
        <CardHeader
          title={t("directive.guardrails.title")}
          subtitle={t("directive.guardrails.subtitle")}
        />
        <ul className="flex flex-col gap-2 mt-2 text-[12.5px] text-ink-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.reportOnly")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.twoPerson")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.adminExclusion")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.rollback")}</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck
              size={14}
              className="text-pos mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <span>{t("directive.guardrails.consentGated")}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function ThreatSubmissionConsole({ locale }: { locale: "en" | "ar" }) {
  const { t } = useI18n();
  const [tenants, setTenants] = useState<
    Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      consentMode: string;
      isDemo: boolean;
    }>
  >([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [kind, setKind] = useState<"email" | "url" | "file">("url");
  const [urlStr, setUrlStr] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [messageUri, setMessageUri] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [category, setCategory] = useState<"phishing" | "malware" | "spam" | "notSpam">(
    "phishing",
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Incident context — pulls recent incidents for the selected tenant.
  // Lets the analyst pick an incident they're working on. DESC analysts
  // cannot reach the entity's Defender XDR portal (they sit outside the
  // entity's tenant), so Mizan surfaces the alert evidence directly: URLs,
  // email message URIs, and file hashes land inline with one-click
  // "submit this" buttons.
  type IncidentRow = Awaited<
    ReturnType<typeof api.directiveTenantIncidents>
  >["incidents"][number];
  type EvidenceItem = Awaited<
    ReturnType<typeof api.directiveTenantIncidentEvidence>
  >["evidence"][number];
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    api
      .getEntities()
      .then((r) => {
        const directive = r.entities.filter((e) => e.consentMode === "directive");
        setTenants(directive);
        if (directive.length > 0 && !tenantId) setTenantId(directive[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload incidents whenever the selected tenant changes. Empty tenantId
  // clears the list.
  useEffect(() => {
    if (!tenantId) {
      setIncidents([]);
      setSelectedIncidentId("");
      return;
    }
    setIncidentsLoading(true);
    let alive = true;
    api
      .directiveTenantIncidents(tenantId)
      .then((r) => {
        if (!alive) return;
        setIncidents(r.incidents);
        setSelectedIncidentId("");
      })
      .catch(() => {
        if (alive) setIncidents([]);
      })
      .finally(() => {
        if (alive) setIncidentsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId]);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // Load evidence whenever an incident is picked. Clears when the user
  // unpicks (selects the empty option).
  useEffect(() => {
    if (!tenantId || !selectedIncidentId) {
      setEvidence([]);
      return;
    }
    setEvidenceLoading(true);
    let alive = true;
    api
      .directiveTenantIncidentEvidence(tenantId, selectedIncidentId)
      .then((r) => {
        if (alive) setEvidence(r.evidence);
      })
      .catch(() => {
        if (alive) setEvidence([]);
      })
      .finally(() => {
        if (alive) setEvidenceLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId, selectedIncidentId]);

  // One-click prefill from an evidence row.
  const prefillFromEvidence = (ev: EvidenceItem) => {
    setKind(ev.kind);
    if (ev.kind === "url") {
      setUrlStr(ev.url ?? "");
      setCategory("phishing");
    } else if (ev.kind === "email") {
      setEmailRecipient(ev.emailRecipient ?? "");
      setMessageUri(ev.messageUri ?? "");
      setCategory("phishing");
    } else {
      setFileName(ev.fileName ?? "");
      // For file submissions, Microsoft's endpoint accepts either the raw
      // base64 content OR a file hash. We persist the hash here; the server
      // route treats the hash as the fileContent for demo/simulated
      // submissions. Real-tenant submissions of actual file bytes can
      // still use the manual form below.
      setFileBase64(ev.fileHash ?? "");
      setCategory("malware");
    }
  };

  const show = (msg: string, isError?: boolean) => {
    if (isError) {
      setErrorMsg(msg);
      setToast(null);
    } else {
      setToast(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setToast(null);
      setErrorMsg(null);
    }, 5000);
  };

  const submit = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      let r: Awaited<ReturnType<typeof api.directiveSubmitThreat>>;
      if (kind === "email") {
        r = await api.directiveSubmitThreat({
          kind: "email",
          tenantId,
          category,
          recipientEmailAddress: emailRecipient.trim(),
          messageUri: messageUri.trim(),
        });
      } else if (kind === "url") {
        r = await api.directiveSubmitThreat({
          kind: "url",
          tenantId,
          category,
          url: urlStr.trim(),
        });
      } else {
        r = await api.directiveSubmitThreat({
          kind: "file",
          tenantId,
          category: category === "notSpam" ? "notMalware" : "malware",
          fileName: fileName.trim(),
          fileContent: fileBase64.trim(),
        });
      }
      show(
        r.simulated
          ? t("directive.toast.simulated", { auditId: String(r.auditId) })
          : t("directive.toast.success", { auditId: String(r.auditId) }),
      );
      // Clear body fields but keep tenant / category so repeat submissions
      // are cheap.
      setUrlStr("");
      setEmailRecipient("");
      setMessageUri("");
      setFileName("");
      setFileBase64("");
    } catch (err) {
      show((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Send size={14} className="text-council-strong" />
            {t("directive.threat.title")}
          </span>
        }
        subtitle={t("directive.threat.subtitle")}
        right={
          toast ? (
            <span className="text-[11.5px] text-pos">{toast}</span>
          ) : errorMsg ? (
            <span className="text-[11.5px] text-neg truncate max-w-[50%]">
              {errorMsg}
            </span>
          ) : null
        }
      />
      {tenants.length === 0 ? (
        <div className="text-[12.5px] text-ink-3">
          {t("directive.threat.noDirectiveEntities")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("cols.entity")}
            </span>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="h-9 px-2 rounded border border-border bg-surface-1 text-[13px] text-ink-1"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {(locale === "ar" ? t.nameAr : t.nameEn) +
                    (t.isDemo ? " · DEMO (simulated)" : "")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("directive.threat.relatedIncident")}
            </span>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              disabled={incidentsLoading || incidents.length === 0}
              className="h-9 px-2 rounded border border-border bg-surface-1 text-[13px] text-ink-1 disabled:opacity-50"
            >
              <option value="">
                {incidentsLoading
                  ? t("state.loading")
                  : incidents.length === 0
                    ? t("directive.threat.noIncidents")
                    : t("directive.threat.pickIncident")}
              </option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {`[${i.severity}] ${i.displayName.slice(0, 60)}`}
                </option>
              ))}
            </select>
          </label>
          {selectedIncident ? (
            <div className="sm:col-span-2 rounded-md border border-border bg-surface-1 p-3 text-[12px]">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-ink-1 font-semibold">
                  {selectedIncident.displayName}
                </span>
                <span className="text-[10px] uppercase tracking-[0.06em] border border-border rounded px-1.5 py-0.5 text-ink-2">
                  {selectedIncident.severity}
                </span>
                <span className="text-[10px] uppercase tracking-[0.06em] border border-border rounded px-1.5 py-0.5 text-ink-2">
                  {selectedIncident.status}
                </span>
                <span className="text-ink-3 ms-auto keep-ltr tabular text-[11px]">
                  ID {selectedIncident.id}
                </span>
              </div>

              <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 font-semibold mb-2">
                {t("directive.threat.evidenceTitle")}
              </div>
              {evidenceLoading ? (
                <div className="text-[11.5px] text-ink-3">
                  {t("state.loading")}
                </div>
              ) : evidence.length === 0 ? (
                <div className="text-[11.5px] text-ink-3">
                  {t("directive.threat.noEvidence")}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {evidence.map((ev, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-2"
                    >
                      <span
                        className={`shrink-0 text-[10px] uppercase tracking-[0.06em] font-semibold rounded px-1.5 py-0.5 border ${
                          ev.kind === "url"
                            ? "text-warn border-warn/40 bg-warn/10"
                            : ev.kind === "email"
                              ? "text-accent border-accent/40 bg-accent/10"
                              : "text-neg border-neg/40 bg-neg/10"
                        }`}
                      >
                        {ev.kind}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-ink-1 text-[12px] keep-ltr truncate">
                          {ev.label}
                        </div>
                        {ev.detail ? (
                          <div className="text-ink-3 text-[10.5px] mt-0.5 truncate">
                            {ev.detail}
                          </div>
                        ) : null}
                      </div>
                      <button
                        onClick={() => prefillFromEvidence(ev)}
                        className="shrink-0 inline-flex items-center h-7 px-2.5 rounded-md bg-council-strong text-white text-[11px] font-semibold"
                      >
                        {t("directive.threat.useInForm")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-[10.5px] text-ink-3 mt-2 leading-relaxed">
                {t("directive.threat.evidenceHint")}
              </div>
            </div>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("directive.threat.kind")}
            </span>
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "email" | "url" | "file")
              }
              className="h-9 px-2 rounded border border-border bg-surface-1 text-[13px] text-ink-1"
            >
              <option value="url">URL</option>
              <option value="email">Email</option>
              <option value="file">File hash</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
              {t("directive.threat.category")}
            </span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as
                    | "phishing"
                    | "malware"
                    | "spam"
                    | "notSpam",
                )
              }
              className="h-9 px-2 rounded border border-border bg-surface-1 text-[13px] text-ink-1"
            >
              <option value="phishing">Phishing</option>
              <option value="malware">Malware</option>
              <option value="spam">Spam</option>
              <option value="notSpam">Not spam (false positive)</option>
            </select>
          </label>
          {kind === "url" ? (
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                {t("directive.threat.url")}
              </span>
              <input
                value={urlStr}
                onChange={(e) => setUrlStr(e.target.value)}
                dir="ltr"
                placeholder="https://suspicious.example.com/login"
                className="h-9 px-3 rounded border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
              />
            </label>
          ) : kind === "email" ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                  {t("directive.threat.recipient")}
                </span>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  dir="ltr"
                  placeholder="victim@entity.gov.ae"
                  className="h-9 px-3 rounded border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                  {t("directive.threat.messageUri")}
                </span>
                <input
                  value={messageUri}
                  onChange={(e) => setMessageUri(e.target.value)}
                  dir="ltr"
                  placeholder="https://graph.microsoft.com/v1.0/users/.../messages/..."
                  className="h-9 px-3 rounded border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                  {t("directive.threat.fileName")}
                </span>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  dir="ltr"
                  placeholder="suspicious.exe"
                  className="h-9 px-3 rounded border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                  {t("directive.threat.fileContent")}
                </span>
                <input
                  value={fileBase64}
                  onChange={(e) => setFileBase64(e.target.value)}
                  dir="ltr"
                  placeholder="base64-encoded file content"
                  className="h-9 px-3 rounded border border-border bg-surface-1 text-[13px] text-ink-1 keep-ltr"
                />
              </label>
            </>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={submit}
              disabled={
                saving ||
                !tenantId ||
                (kind === "url" && !urlStr.trim()) ||
                (kind === "email" &&
                  (!emailRecipient.trim() || !messageUri.trim())) ||
                (kind === "file" &&
                  (!fileName.trim() || !fileBase64.trim()))
              }
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              {t("directive.threat.submit")}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Phase 3 — Baselines (Conditional Access policy push + rollback)
// ---------------------------------------------------------------------------

type Baseline = Awaited<
  ReturnType<typeof api.directiveBaselines>
>["baselines"][number];
type PushRow = Awaited<
  ReturnType<typeof api.directivePushes>
>["pushes"][number];

function BaselinesSection({ locale }: { locale: "en" | "ar" }) {
  const { t } = useI18n();
  const [baselines, setBaselines] = useState<Baseline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Baseline | null>(null);

  useEffect(() => {
    api
      .directiveBaselines()
      .then((r) => setBaselines(r.baselines))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Lock size={14} className="text-council-strong" />
            {t("directive.baselines.title")}
          </span>
        }
        subtitle={t("directive.baselines.subtitle")}
      />
      {error ? (
        <div className="text-[12.5px] text-neg">{error}</div>
      ) : !baselines ? (
        <div className="text-[12.5px] text-ink-3">{t("state.loading")}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {baselines.map((b) => (
              <BaselineCard
                key={b.id}
                baseline={b}
                onPush={() => setSelected(b)}
              />
            ))}
          </div>
          <BaselinesRoadmapCard />
        </>
      )}

      {selected ? (
        <BaselinePushModal
          baseline={selected}
          onClose={() => setSelected(null)}
          locale={locale}
        />
      ) : null}
    </Card>
  );
}

function BaselineCard({
  baseline: b,
  onPush,
}: {
  baseline: Baseline;
  onPush: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border border-border bg-surface-1 p-3 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-[13.5px] font-semibold text-ink-1 min-w-0 break-words">
          {t(b.titleKey as DictKey)}
        </div>
        <RiskChip tier={b.riskTier} />
      </div>
      <div className="text-[12px] text-ink-2 leading-relaxed mb-2">
        {t(b.bodyKey as DictKey)}
      </div>
      <div className="text-[11px] text-ink-3 mb-1 leading-relaxed">
        <span className="font-semibold text-ink-2">
          {t("directive.baselines.target")}:
        </span>{" "}
        {b.targetSummary}
      </div>
      <div className="text-[11px] text-ink-3 mb-1 leading-relaxed">
        <span className="font-semibold text-ink-2">
          {t("directive.baselines.grant")}:
        </span>{" "}
        {b.grantSummary}
      </div>
      {b.initialState === "enabledForReportingButNotEnforced" ? (
        <div className="mb-2 rounded border border-warn/40 bg-warn/10 px-2 py-1.5">
          <div className="text-[11px] font-semibold text-warn inline-flex items-center gap-1">
            <Radar size={10} />
            {t("directive.baselines.reportOnlyChip")}
          </div>
          <div className="text-[10.5px] text-ink-2 leading-snug mt-0.5">
            {t("directive.baselines.reportOnlySubtitle")}
          </div>
        </div>
      ) : (
        <div className="text-[10.5px] text-ink-3 mb-2">
          <span className="font-semibold text-ink-2">
            {t("directive.baselines.initialState")}:
          </span>{" "}
          {b.initialState}
        </div>
      )}
      {b.excludesOwnAdmins ? (
        <div className="text-[10.5px] text-pos mb-2 inline-flex items-center gap-1">
          <ShieldCheck size={10} />
          {t("directive.baselines.excludesOwnAdmins")}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-1 mb-3 rounded border border-border/70 bg-surface-2 p-2.5 space-y-2">
          <DetailBlock
            label={t("directive.baselines.why")}
            body={t(b.whyKey as DictKey)}
          />
          <DetailBlock
            label={t("directive.baselines.impact")}
            body={t(b.impactKey as DictKey)}
          />
          <DetailBlock
            label={t("directive.baselines.prerequisites")}
            body={t(b.prerequisitesKey as DictKey)}
          />
          <DetailBlock
            label={t("directive.baselines.rollout")}
            body={t(b.rolloutAdviceKey as DictKey)}
          />
          <a
            href={b.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-council-strong hover:underline"
          >
            <ExternalLink size={10} />
            {t("directive.baselines.docsLink")}
          </a>
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          onClick={onPush}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[11.5px] font-semibold"
        >
          <Play size={11} />
          {t("directive.baselines.pushCta")}
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border bg-surface-1 text-ink-2 text-[11.5px] font-semibold hover:bg-surface-2"
        >
          {expanded ? (
            <>
              <ChevronUp size={11} />
              {t("directive.baselines.hideDetails")}
            </>
          ) : (
            <>
              <ChevronDown size={11} />
              {t("directive.baselines.details")}
            </>
          )}
        </button>
        <CloneBaselineButton baselineId={b.id} />
        <RollbackAllBaselineButton baselineId={b.id} />
      </div>
    </div>
  );
}

function CloneBaselineButton({ baselineId }: { baselineId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await api.directiveBaselineCloneToCustom(baselineId);
      router.push(`/directive/custom-policies/${r.id}/edit`);
    } catch (e) {
      window.alert((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border bg-surface-1 text-ink-2 text-[11.5px] font-semibold hover:bg-surface-2 disabled:opacity-50"
      title={t("custom.cloneFromBaseline")}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        <Copy size={11} />
      )}
      {t("custom.cloneFromBaseline")}
    </button>
  );
}

function RollbackAllBaselineButton({ baselineId }: { baselineId: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.directiveBaselineRollbackAll(baselineId);
      setLastResult(
        t("rollback.all.done", { count: String(r.affectedTenants) }),
      );
    } catch (e) {
      setLastResult((e as Error).message);
    } finally {
      setBusy(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={busy}
        className="ms-auto inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-neg/40 text-neg text-[11px] font-semibold hover:bg-neg/10 disabled:opacity-50"
        title={t("rollback.all.cta")}
      >
        {busy ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <Undo2 size={10} />
        )}
        {t("rollback.all.cta")}
      </button>
      {showConfirm ? (
        <Modal
          title={t("rollback.all.confirmTitle")}
          onClose={() => setShowConfirm(false)}
          open={true}
        >
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-ink-2 leading-relaxed">
              {t("rollback.all.confirmBody")}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={busy}
                className="h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[12.5px] font-semibold"
              >
                {t("rollback.cancel")}
              </button>
              <button
                onClick={() => void run()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-neg text-white text-[12.5px] font-semibold disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Undo2 size={11} />
                )}
                {t("rollback.all.confirmCta")}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {lastResult ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] p-2.5 shadow-lg">
          {lastResult}
          <button
            onClick={() => setLastResult(null)}
            className="ms-2 text-ink-3"
          >
            <X size={11} className="inline" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function DetailBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-2 mb-0.5">
        {label}
      </div>
      <div className="text-[11.5px] text-ink-2 leading-relaxed">{body}</div>
    </div>
  );
}

function BaselinesRoadmapCard() {
  // Retained export in case the roadmap card ever returns; the live
  // custom-policies section now lives in <CustomPoliciesSection />.
  const { t } = useI18n();
  return (
    <div className="mt-3 rounded-md border border-dashed border-border bg-surface-2 p-3">
      <div className="flex items-start gap-2">
        <Sparkles size={14} className="text-council-strong mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-ink-1 mb-1">
            {t("directive.baselines.roadmapTitle")}
          </div>
          <div className="text-[11.5px] text-ink-2 leading-relaxed">
            {t("directive.baselines.roadmapBody")}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomPoliciesSection({
  fmtRelative,
}: {
  fmtRelative: (iso: string) => string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Awaited<
    ReturnType<typeof api.directiveCustomPolicies>
  > | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .directiveCustomPolicies()
      .then(setDrafts)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const newDraft = async () => {
    setCreating(true);
    try {
      const r = await api.directiveCustomPolicyCreate({
        name: "Untitled policy",
      });
      router.push(`/directive/custom-policies/${r.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(t("custom.confirmDelete"))) return;
    try {
      await api.directiveCustomPolicyDelete(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Wand2 size={14} className="text-council-strong" />
            {t("custom.title")}
          </span>
        }
        subtitle={t("custom.subtitle")}
      />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[11px] text-ink-3">
          {drafts ? `${drafts.policies.length} draft(s)` : ""}
        </div>
        <button
          onClick={newDraft}
          disabled={creating}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-council-strong text-white text-[12px] font-semibold disabled:opacity-60"
        >
          {creating ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Plus size={11} />
          )}
          {t("custom.newDraft")}
        </button>
      </div>
      {error ? (
        <div className="text-[12px] text-neg mb-2">{error}</div>
      ) : null}
      {!drafts ? (
        <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
      ) : drafts.policies.length === 0 ? (
        <div className="text-[12px] text-ink-3 rounded-md border border-border bg-surface-1 p-3">
          {t("custom.noDrafts")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 px-3">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-ink-3 border-b border-border">
                <th className="py-1.5 pr-2">{t("custom.col.name")}</th>
                <th className="py-1.5 pr-2">{t("custom.col.risk")}</th>
                <th className="py-1.5 pr-2">{t("custom.col.scope")}</th>
                <th className="py-1.5 pr-2">{t("custom.col.state")}</th>
                <th className="py-1.5 pr-2">{t("custom.col.updated")}</th>
                <th className="py-1.5 pr-2 text-end">
                  {t("custom.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {drafts.policies.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 align-middle"
                >
                  <td className="py-2 pr-2 text-ink-1 font-medium">
                    {p.name}
                  </td>
                  <td className="py-2 pr-2">
                    <RiskChip tier={p.riskTier} />
                  </td>
                  <td className="py-2 pr-2 text-ink-2">
                    <span className="text-[11px]">
                      {t(
                        `custom.scopeUsers.${
                          p.usersKind === "guestsOrExternalUsers"
                            ? "guests"
                            : p.usersKind
                        }` as DictKey,
                      )}
                      {" · "}
                      {t(`custom.scopeApps.${p.appsTarget}` as DictKey)}
                      {" · "}
                      {t(`custom.grantKind.${p.grantKind}` as DictKey)}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <CaStateChip state={p.state} />
                  </td>
                  <td className="py-2 pr-2 text-ink-3 text-[11px]">
                    {fmtRelative(p.updatedAt)}
                  </td>
                  <td className="py-2 pr-2 text-end">
                    <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                      <button
                        onClick={() =>
                          router.push(
                            `/directive/custom-policies/${p.id}/edit`,
                          )
                        }
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface-1 text-ink-1 text-[11px] font-semibold hover:bg-surface-2"
                      >
                        <Pencil size={11} />
                        {t("custom.edit")}
                      </button>
                      <CloneDraftButton policyId={p.id} onCloned={load} />
                      <RollbackAllCustomButton policyId={p.id} />
                      <button
                        onClick={() => void remove(p.id)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface-1 text-neg text-[11px] font-semibold hover:bg-neg/10"
                      >
                        <Trash2 size={11} />
                        {t("custom.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CaStateChip({ state }: { state: string }) {
  const { t } = useI18n();
  const tone =
    state === "enabled"
      ? "text-warn border-warn/40 bg-warn/10"
      : state === "enabledForReportingButNotEnforced"
        ? "text-ink-2 border-border bg-surface-3"
        : state === "disabled"
          ? "text-ink-3 border-border bg-surface-3"
          : "text-ink-3 border-border bg-surface-3";
  const labelKey =
    state === "enabled"
      ? "directive.baselines.stateEnabled"
      : state === "enabledForReportingButNotEnforced"
        ? "directive.baselines.stateReportOnly"
        : state === "disabled"
          ? "directive.baselines.stateDisabled"
          : "directive.baselines.stateUnknown";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-[0.04em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}

function BaselinesStatusSection({
  locale,
  fmtRelative,
}: {
  locale: "en" | "ar";
  fmtRelative: (iso: string) => string;
}) {
  const { t } = useI18n();
  const [tenants, setTenants] = useState<
    Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      consentMode: string;
      isDemo: boolean;
    }>
  >([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [status, setStatus] = useState<null | Awaited<
    ReturnType<typeof api.directiveBaselineStatus>
  >>(null);
  const [loading, setLoading] = useState(false);
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

  const load = useCallback(
    async (tid: string) => {
      if (!tid) return;
      setLoading(true);
      setError(null);
      try {
        const r = await api.directiveBaselineStatus(tid);
        setStatus(r);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (tenantId) load(tenantId);
    else setStatus(null);
  }, [tenantId, load]);

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Radar size={14} className="text-council-strong" />
            {t("directive.status.title")}
          </span>
        }
        subtitle={t("directive.status.subtitle")}
      />
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <label className="flex flex-col gap-1 min-w-[260px]">
          <span className="text-[11px] text-ink-2 font-semibold uppercase tracking-[0.06em]">
            {t("directive.status.entityLabel")}
          </span>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface-1 text-ink-1 text-[12.5px] px-2"
          >
            <option value="">{t("directive.status.entityPlaceholder")}</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {locale === "ar" ? tenant.nameAr : tenant.nameEn}
                {tenant.isDemo ? " — demo" : ""}
              </option>
            ))}
          </select>
        </label>
        {tenantId ? (
          <button
            onClick={() => load(tenantId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <RefreshCw size={11} />
            )}
            {loading
              ? t("directive.status.refreshing")
              : t("directive.status.refresh")}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="text-[12px] text-neg mb-2">{error}</div>
      ) : null}

      {!tenantId ? (
        <div className="text-[12px] text-ink-3 rounded-md border border-border bg-surface-1 p-3">
          {t("directive.status.empty")}
        </div>
      ) : !status ? (
        <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px] text-ink-3">
            <span>
              {t("directive.status.generatedAt")}:{" "}
              {fmtRelative(status.generatedAt)}
            </span>
            <span>·</span>
            <span
              className={
                status.mode === "simulated"
                  ? "text-accent"
                  : "text-pos"
              }
            >
              {status.mode === "simulated"
                ? t("directive.status.modeSimulated")
                : t("directive.status.modeReal")}
            </span>
          </div>
          <div className="overflow-x-auto -mx-3 px-3">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-ink-3 border-b border-border">
                  <th className="py-1.5 pr-2">
                    {t("directive.status.col.baseline")}
                  </th>
                  <th className="py-1.5 pr-2">
                    {t("directive.status.col.present")}
                  </th>
                  <th className="py-1.5 pr-2">
                    {t("directive.status.col.state")}
                  </th>
                  <th className="py-1.5 pr-2">
                    {t("directive.status.col.observed")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {status.entries.map((e) => {
                  const flipped =
                    e.present && e.state === "enabled";
                  const stillReportOnly =
                    e.present &&
                    e.state === "enabledForReportingButNotEnforced";
                  return (
                    <tr
                      key={e.baselineId}
                      className="border-b border-border/50 align-top"
                    >
                      <td className="py-1.5 pr-2 text-ink-1">
                        {t(e.titleKey as DictKey)}
                      </td>
                      <td className="py-1.5 pr-2">
                        {e.present ? (
                          <span className="text-[10.5px] text-pos border border-pos/40 bg-pos/10 rounded px-1.5 py-0.5 font-semibold">
                            {t("directive.status.presentYes")}
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-ink-3 border border-border bg-surface-3 rounded px-1.5 py-0.5 font-semibold">
                            {t("directive.status.presentNo")}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        {e.state ? <CaStateChip state={e.state} /> : "—"}
                        {flipped ? (
                          <div className="text-[10px] text-warn mt-0.5">
                            {t("directive.status.flippedWarn")}
                          </div>
                        ) : null}
                        {stillReportOnly ? (
                          <div className="text-[10px] text-ink-3 mt-0.5">
                            {t("directive.status.stillReportOnly")}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-2 text-ink-3 text-[11px]">
                        {e.observedAt ? fmtRelative(e.observedAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function RollbackAllCustomButton({ policyId }: { policyId: number }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.directiveCustomPolicyRollbackAll(policyId);
      setLastResult(
        t("rollback.all.done", { count: String(r.affectedTenants) }),
      );
    } catch (e) {
      setLastResult((e as Error).message);
    } finally {
      setBusy(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={busy}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-neg/40 text-neg text-[11px] font-semibold hover:bg-neg/10 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <Undo2 size={10} />
        )}
        {t("rollback.all.cta")}
      </button>
      {showConfirm ? (
        <Modal
          title={t("rollback.all.confirmTitle")}
          onClose={() => setShowConfirm(false)}
          open={true}
        >
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-ink-2 leading-relaxed">
              {t("rollback.all.confirmBody")}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[12.5px] font-semibold"
              >
                {t("rollback.cancel")}
              </button>
              <button
                onClick={() => void run()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-neg text-white text-[12.5px] font-semibold disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Undo2 size={11} />
                )}
                {t("rollback.all.confirmCta")}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {lastResult ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-surface-1 text-ink-1 text-[12px] p-2.5 shadow-lg">
          {lastResult}
          <button
            onClick={() => setLastResult(null)}
            className="ms-2 text-ink-3"
          >
            <X size={11} className="inline" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function CloneDraftButton({
  policyId,
  onCloned,
}: {
  policyId: number;
  onCloned: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await api.directiveCustomPolicyClone(policyId);
      onCloned();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface-1 text-ink-1 text-[11px] font-semibold hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Copy size={10} />
      )}
      {t("custom.clone")}
    </button>
  );
}

function RiskChip({ tier }: { tier: "low" | "medium" | "high" }) {
  const { t } = useI18n();
  const tone =
    tier === "high"
      ? "text-neg border-neg/40 bg-neg/10"
      : tier === "medium"
        ? "text-warn border-warn/40 bg-warn/10"
        : "text-pos border-pos/40 bg-pos/10";
  const labelKey =
    tier === "high"
      ? "directive.baselines.risk.high"
      : tier === "medium"
        ? "directive.baselines.risk.medium"
        : "directive.baselines.risk.low";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}

function BaselinePushModal({
  baseline,
  onClose,
  locale,
}: {
  baseline: Baseline;
  onClose: () => void;
  locale: "en" | "ar";
}) {
  const { t } = useI18n();
  const [tenants, setTenants] = useState<
    Array<{
      id: string;
      nameEn: string;
      nameAr: string;
      consentMode: string;
      isDemo: boolean;
    }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrideState, setOverrideState] = useState<
    "enabled" | "disabled" | "enabledForReportingButNotEnforced"
  >(baseline.initialState);
  const [preview, setPreview] = useState<null | {
    displayName: string;
    state: string;
  }>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<null | Awaited<
    ReturnType<typeof api.directiveBaselinePush>
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
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setPreviewLoading(true);
    api
      .directiveBaselinePreview(baseline.id, { overrideState })
      .then((r) => {
        if (!alive) return;
        setPreview({
          displayName: r.preview.displayName,
          state: r.preview.state,
        });
      })
      .catch(() => {
        if (alive) setPreview(null);
      })
      .finally(() => {
        if (alive) setPreviewLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [baseline.id, overrideState]);

  const toggleTenant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(tenants.map((t) => t.id)));
  const selectNone = () => setSelectedIds(new Set());

  const onPush = async () => {
    if (selectedIds.size === 0) return;
    setPushing(true);
    setError(null);
    try {
      const r = await api.directiveBaselinePush(baseline.id, {
        targetTenantIds: Array.from(selectedIds),
        overrideState,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="wide"
      title={t(baseline.titleKey as DictKey)}
    >
      <div className="flex flex-col gap-4">
        {/* Preview block */}
        <div className="rounded-md border border-border bg-surface-1 p-3 text-[12px]">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3 mb-1">
            {t("directive.baselines.previewTitle")}
          </div>
          {previewLoading || !preview ? (
            <div className="text-ink-3">{t("state.loading")}</div>
          ) : (
            <>
              <div className="text-ink-1 font-mono text-[11.5px] break-all mb-1">
                {preview.displayName}
              </div>
              <div className="text-ink-2">
                <span className="text-ink-3">
                  {t("directive.baselines.stateLabel")}:
                </span>{" "}
                {preview.state === "enabledForReportingButNotEnforced"
                  ? t("directive.baselines.reportOnly")
                  : preview.state}
              </div>
            </>
          )}
          <label className="inline-flex items-center gap-2 mt-3 text-[11.5px] text-ink-2">
            <span>{t("directive.baselines.stateLabel")}</span>
            <select
              value={overrideState}
              onChange={(e) =>
                setOverrideState(
                  e.target.value as
                    | "enabled"
                    | "disabled"
                    | "enabledForReportingButNotEnforced",
                )
              }
              className="h-7 px-2 rounded border border-border bg-surface-2 text-[11.5px] text-ink-1"
            >
              <option value="enabledForReportingButNotEnforced">
                {t("directive.baselines.reportOnly")}
              </option>
              <option value="disabled">disabled</option>
              <option value="enabled">enabled</option>
            </select>
          </label>
        </div>

        {/* Target tenants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12.5px] font-semibold text-ink-1">
              {t("directive.baselines.targetsTitle")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={selectAll}
                className="h-6 px-2 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1"
              >
                {t("directive.baselines.selectAll")}
              </button>
              <button
                onClick={selectNone}
                className="h-6 px-2 rounded border border-border bg-surface-2 text-ink-2 hover:text-ink-1"
              >
                {t("directive.baselines.selectNone")}
              </button>
            </div>
          </div>
          {tenants.length === 0 ? (
            <div className="text-[12px] text-ink-3 rounded-md border border-border bg-surface-1 p-3">
              {t("directive.threat.noDirectiveEntities")}
            </div>
          ) : (
            <>
              <div
                className={`text-[11px] mb-1.5 ${
                  selectedIds.size === 0 ? "text-ink-3" : "text-ink-2"
                }`}
              >
                {selectedIds.size === 0
                  ? t("directive.baselines.noneSelected")
                  : t("directive.baselines.selectedCount", {
                      count: String(selectedIds.size),
                      total: String(tenants.length),
                    })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto">
              {tenants.map((tenant) => {
                const active = selectedIds.has(tenant.id);
                return (
                  <label
                    key={tenant.id}
                    className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                      active
                        ? "border-council-strong bg-council-strong/5"
                        : "border-border bg-surface-1 hover:border-council-strong/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTenant(tenant.id)}
                      className="h-3.5 w-3.5 accent-council-strong"
                    />
                    <span className="text-[12px] text-ink-1 flex-1 min-w-0 truncate">
                      {locale === "ar" ? tenant.nameAr : tenant.nameEn}
                    </span>
                    {tenant.isDemo ? (
                      <span className="text-[9.5px] uppercase tracking-[0.06em] border border-accent/50 text-accent rounded px-1.5 py-px font-semibold">
                        {t("demo.badge")}
                      </span>
                    ) : null}
                  </label>
                );
              })}
              </div>
            </>
          )}
        </div>

        {/* Result */}
        {error ? (
          <div className="rounded-md border border-neg/40 bg-neg/10 p-3 text-[12px] text-ink-1">
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="rounded-md border border-border bg-surface-1 p-3">
            <div className="text-[12.5px] font-semibold text-ink-1 mb-2">
              {t("directive.baselines.resultTitle", {
                pushId: String(result.pushRequestId),
              })}
            </div>
            {result.perTenant.some((r) => r.status === "already_applied") ? (
              <div className="text-[11px] text-ink-2 leading-relaxed mb-2 p-2 rounded border border-border bg-surface-2">
                {t("directive.baselines.alreadyAppliedExplain")}
              </div>
            ) : null}
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
                    {r.status === "already_applied" && r.currentState ? (
                      <CaStateChip state={r.currentState} />
                    ) : null}
                    <PushStatusChip status={r.status} />
                    {r.error ? (
                      <span className="text-[10.5px] text-neg max-w-[180px] truncate">
                        {r.error}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* Action bar */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {result ? (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[12.5px] font-semibold"
            >
              {t("directive.baselines.close")}
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={pushing}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-2 text-[12.5px] disabled:opacity-50"
              >
                {t("directive.baselines.cancel")}
              </button>
              <button
                onClick={onPush}
                disabled={pushing || selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-council-strong text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {pushing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} />
                )}
                {t("directive.baselines.executeCta", {
                  count: String(selectedIds.size),
                })}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function PushHistorySection({
  fmtRelative,
}: {
  fmtRelative: (s: string) => string;
}) {
  const { t } = useI18n();
  const fmt = useFmtNum();
  const [rows, setRows] = useState<PushRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<PushRow | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.directivePushes(50);
      setRows(r.pushes);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card className="p-0">
      <div className="p-5 border-b border-border">
        <CardHeader
          title={t("directive.baselines.historyTitle")}
          subtitle={t("directive.baselines.historySubtitle")}
          right={
            <button
              onClick={() => void load()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px] disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {t("directive.audit.refresh")}
            </button>
          }
        />
      </div>
      {rows === null ? (
        <div className="p-5 text-[12.5px] text-ink-3">
          {t("state.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-[12.5px] text-ink-3">
          {t("directive.baselines.historyEmpty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("directive.audit.col.when")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.baselines.col.baseline")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.baselines.col.targets")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.audit.col.status")}
                </th>
                <th className="py-2.5 pe-5 text-end font-semibold">
                  {t("directive.baselines.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-surface-3/40"
                >
                  <td className="py-2 ps-5 text-ink-2 tabular">
                    {fmtRelative(r.createdAt)}
                  </td>
                  <td className="py-2 text-ink-1 keep-ltr tabular">
                    {r.baselineId}
                  </td>
                  <td className="py-2 text-ink-3 text-[11.5px]">
                    {r.targetTenantIds.length === 0
                      ? "—"
                      : r.targetTenantNames
                          .slice(0, 3)
                          .map((t) => t.nameEn)
                          .join(", ") +
                        (r.targetTenantNames.length > 3
                          ? ` +${fmt(r.targetTenantNames.length - 3)}`
                          : "")}
                  </td>
                  <td className="py-2">
                    <PushRequestStatusChip status={r.status} />
                  </td>
                  <td className="py-2 pe-5 text-end">
                    {r.status === "complete" || r.status === "failed" ? (
                      <button
                        onClick={() => setRollbackTarget(r)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-surface-2 text-ink-1 text-[11px] font-semibold"
                      >
                        <Undo2 size={11} />
                        {t("directive.baselines.rollback")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rollbackTarget ? (
        <RollbackModal
          push={rollbackTarget}
          onClose={() => setRollbackTarget(null)}
          onDone={() => {
            setRollbackTarget(null);
            void load();
          }}
        />
      ) : null}
    </Card>
  );
}

function RollbackModal({
  push,
  onClose,
  onDone,
}: {
  push: PushRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<null | Awaited<
    ReturnType<typeof api.directivePushRollbackPreview>
  >>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .directivePushRollbackPreview(push.id)
      .then((r) => {
        if (!alive) return;
        setPreview(r);
        // Default-select every eligible entry so the operator just clicks
        // through for the common "roll it all back" case.
        const eligible = r.entries
          .filter((e) => !e.skipReason && !e.alreadyGone)
          .map((e) => e.actionId);
        setSelected(new Set(eligible));
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [push.id]);

  const toggle = (actionId: number) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(actionId)) n.delete(actionId);
      else n.add(actionId);
      return n;
    });

  const run = async (scope: "selected" | "all") => {
    setRollingBack(true);
    setError(null);
    try {
      const body =
        scope === "all"
          ? undefined
          : { actionIds: Array.from(selected) };
      await api.directivePushRollback(push.id, body);
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setRollingBack(false);
    }
  };

  return (
    <Modal
      title={t("rollback.preflightTitle")}
      onClose={onClose}
      open={true}
      size="wide"
    >
      <div className="flex flex-col gap-3">
        <div className="text-[12px] text-ink-2 leading-relaxed">
          {t("rollback.preflightIntro")}
        </div>

        {error ? (
          <div className="rounded-md border border-neg/40 bg-neg/10 p-2.5 text-[12px] text-ink-1">
            {error}
          </div>
        ) : null}

        {!preview ? (
          <div className="text-[12px] text-ink-3">{t("state.loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-ink-3 border-b border-border">
                  <th className="py-1.5 pr-2 w-6">&nbsp;</th>
                  <th className="py-1.5 pr-2">
                    {t("rollback.col.tenant")}
                  </th>
                  <th className="py-1.5 pr-2">
                    {t("rollback.col.currentState")}
                  </th>
                  <th className="py-1.5 pr-2">
                    {t("rollback.col.action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.map((e) => {
                  const tenantName =
                    push.targetTenantNames.find((x) => x.id === e.tenantId)
                      ?.nameEn ?? e.tenantId;
                  const canRollBack =
                    !e.skipReason && !e.alreadyGone;
                  const note = e.skipReason
                    ? t(
                        `rollback.skipReason.${e.skipReason}` as DictKey,
                      )
                    : e.alreadyGone
                      ? t("rollback.alreadyGone")
                      : e.wouldUnprotect
                        ? t("rollback.flipWarn")
                        : null;
                  return (
                    <tr
                      key={e.actionId}
                      className="border-b border-border/50 align-top"
                    >
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          disabled={!canRollBack}
                          checked={selected.has(e.actionId)}
                          onChange={() => toggle(e.actionId)}
                          className="accent-council-strong"
                        />
                      </td>
                      <td className="py-2 pr-2 text-ink-1">{tenantName}</td>
                      <td className="py-2 pr-2">
                        {e.currentState ? (
                          <CaStateChip state={e.currentState} />
                        ) : (
                          <span className="text-[11px] text-ink-3">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {canRollBack ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-neg">
                              {t("rollback.actionWillDelete")}
                            </span>
                            {e.wouldUnprotect ? (
                              <span className="text-[10.5px] text-warn">
                                {note}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-3">
                            {t("rollback.actionSkip")}
                            {note ? (
                              <span className="block text-[10.5px] text-ink-3">
                                {note}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={onClose}
            disabled={rollingBack}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface-2 text-ink-1 text-[12.5px] font-semibold disabled:opacity-60"
          >
            {t("rollback.cancel")}
          </button>
          <button
            onClick={() => void run("selected")}
            disabled={rollingBack || selected.size === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-neg text-white text-[12.5px] font-semibold disabled:opacity-60"
          >
            {rollingBack ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Undo2 size={11} />
            )}
            {t("rollback.perTenantCta", { count: String(selected.size) })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PushStatusChip({
  status,
}: {
  status:
    | "success"
    | "already_applied"
    | "failed"
    | "simulated"
    | "skipped_observation";
}) {
  const { t } = useI18n();
  const tone =
    status === "success"
      ? "text-pos border-pos/40 bg-pos/10"
      : status === "already_applied"
        ? "text-ink-2 border-border bg-surface-3"
        : status === "simulated"
          ? "text-accent border-accent/40 bg-accent/10"
          : status === "skipped_observation"
            ? "text-ink-3 border-border bg-surface-3"
            : "text-neg border-neg/40 bg-neg/10";
  const labelKey =
    status === "success"
      ? "directive.audit.status.success"
      : status === "already_applied"
        ? "directive.baselines.alreadyAppliedStatus"
        : status === "simulated"
          ? "directive.audit.status.simulated"
          : status === "skipped_observation"
            ? "directive.baselines.skippedObservation"
            : "directive.audit.status.failed";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}

function PushRequestStatusChip({
  status,
}: {
  status: "preview" | "executing" | "complete" | "failed" | "rolledback";
}) {
  const { t } = useI18n();
  const tone =
    status === "complete"
      ? "text-pos border-pos/40 bg-pos/10"
      : status === "failed"
        ? "text-neg border-neg/40 bg-neg/10"
        : status === "rolledback"
          ? "text-ink-3 border-border bg-surface-3"
          : "text-warn border-warn/40 bg-warn/10";
  const labelKey =
    status === "complete"
      ? "directive.audit.status.success"
      : status === "failed"
        ? "directive.audit.status.failed"
        : status === "rolledback"
          ? "directive.baselines.rolledbackStatus"
          : "directive.baselines.runningStatus";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}

// ---------------------------------------------------------------------------

function AuditLogSection({
  fmtRelative,
}: {
  fmtRelative: (s: string) => string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.directiveAudit({ limit: 50 });
      setRows(r.actions);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card className="p-0">
      <div className="p-5 border-b border-border">
        <CardHeader
          title={t("directive.audit.title")}
          subtitle={t("directive.audit.subtitle")}
          right={
            <button
              onClick={() => void load()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface-2 text-ink-2 hover:text-ink-1 text-[11.5px] disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {t("directive.audit.refresh")}
            </button>
          }
        />
      </div>
      {rows === null ? (
        <div className="p-5 text-[12.5px] text-ink-3">
          {t("state.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-[12.5px] text-ink-3">
          {t("directive.audit.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-3 text-[10.5px] uppercase tracking-[0.06em] border-t border-border">
                <th className="py-2.5 ps-5 text-start font-semibold">
                  {t("directive.audit.col.when")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.audit.col.entity")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.audit.col.action")}
                </th>
                <th className="py-2.5 text-start font-semibold">
                  {t("directive.audit.col.target")}
                </th>
                <th className="py-2.5 pe-5 text-start font-semibold">
                  {t("directive.audit.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-surface-3/40"
                >
                  <td className="py-2 ps-5 text-ink-2 tabular">
                    {fmtRelative(r.at)}
                  </td>
                  <td className="py-2 text-ink-1">{r.tenantNameEn}</td>
                  <td className="py-2 text-ink-2 keep-ltr tabular">
                    {r.actionType}
                  </td>
                  <td className="py-2 text-ink-3 keep-ltr tabular truncate max-w-[220px]">
                    {r.targetId ?? "—"}
                  </td>
                  <td className="py-2 pe-5">
                    <AuditStatusChip status={r.status} />
                    {r.status === "failed" && r.errorMessage ? (
                      <div className="text-[10.5px] text-neg mt-0.5 truncate max-w-[220px]">
                        {r.errorMessage}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StatusChip({ status }: { status: Status }) {
  const { t } = useI18n();
  const tone =
    status === "available"
      ? "text-pos border-pos/40 bg-pos/10"
      : status === "in_progress"
        ? "text-warn border-warn/40 bg-warn/10"
        : "text-ink-3 border-border bg-surface-3";
  const labelKey =
    status === "available"
      ? "directive.status.available"
      : status === "in_progress"
        ? "directive.status.inProgress"
        : "directive.status.planned";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}

function AuditStatusChip({
  status,
}: {
  status: "success" | "failed" | "simulated";
}) {
  const { t } = useI18n();
  const tone =
    status === "success"
      ? "text-pos border-pos/40 bg-pos/10"
      : status === "simulated"
        ? "text-accent border-accent/40 bg-accent/10"
        : "text-neg border-neg/40 bg-neg/10";
  const labelKey =
    status === "success"
      ? "directive.audit.status.success"
      : status === "simulated"
        ? "directive.audit.status.simulated"
        : "directive.audit.status.failed";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] border ${tone}`}
    >
      {t(labelKey as DictKey)}
    </span>
  );
}
