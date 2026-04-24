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
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useFmtRelative } from "@/lib/i18n/time";
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
    status: "planned",
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
