import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import { getTenant } from "@/lib/db/tenants";
import { graphFetch } from "@/lib/graph/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/tenant-incident-evidence?tenantId=X&incidentId=Y
 *
 * Returns the alert evidence attached to this incident, flattened into a
 * list the threat-submission console can render as one-click "Submit this"
 * items. DESC analysts cannot reach the entity's Defender XDR portal — the
 * regulator lives OUTSIDE the entity's tenant — so Mizan is the only place
 * where they can see the URL / email / file they want to forward to
 * Microsoft. This endpoint is what makes that possible.
 *
 * Two paths:
 *
 *   1. Real tenants: Graph GET /security/incidents/{id}?$expand=alerts,
 *      then flatten each alert's `evidence[]` into our canonical shape.
 *      Uses the read-only Signals app (same one the dashboard already reads
 *      incidents with), so no new permission is required.
 *
 *   2. Demo tenants (is_demo = 1): synthesize evidence deterministically
 *      from the incident ID + displayName. Keeps the DESC demo usable
 *      against fake tenants where real Graph calls would fail.
 */

export type EvidenceItem = {
  kind: "url" | "email" | "file";
  /** Short label for the list row. */
  label: string;
  /** One-line description shown in the UI. */
  description: string;
  /** Pre-filled values for the submission form, keyed by kind. */
  url?: string;
  emailRecipient?: string;
  messageUri?: string;
  fileName?: string;
  fileHash?: string;
  /** Free-form detail the UI can render in a secondary line. */
  detail?: string;
};

// ---------------------------------------------------------------------------
// Demo synthesis — deterministic per-incident. Seeded on the incident's ID
// so the evidence list is stable across refreshes and matches what the
// Center analyst would expect to see for that incident by name.
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    // Use full unsigned range as divisor; avoid `& 0xffffffff` which returns
    // a signed int in JS and can push the result negative.
    return s / 0x100000000;
  };
}

const MALICIOUS_URLS = [
  "https://secure-dubaigov-login.app/auth?session=",
  "https://micr0soft-teams-meeting.com/join/",
  "https://dewa-billing-update.click/login",
  "https://office365-docupdate.net/signin",
  "https://dubai-police-notice.online/case/",
];
const SENDERS = [
  "admin@dubaigov-alerts.app",
  "it-helpdesk@dewa-notice.click",
  "hr@corp-bonus2026.online",
  "billing@rta-violations.net",
  "security@entra-verify.app",
];
const FILES = [
  { name: "Invoice_2026_Q2.xlsx.exe", hash: "3a7bd3e2360a3d8d0a9e2f1b9c8e7d6f" },
  { name: "ScannedDocument.pdf.scr", hash: "9f8e7d6c5b4a3928192837465abcdef0" },
  { name: "Salary_Adjustment.docm", hash: "cafebabe1337deadbeef0123456789ab" },
  { name: "Meeting_Recording.zip", hash: "f00dfacec0ffee00112233445566778899" },
];
const MAILBOX_USERS = [
  "aisha.alkhoury",
  "omar.shamsi",
  "fatima.zayed",
  "khalid.rashidi",
];

function synthesizeDemoEvidence(
  incidentId: string,
  displayName: string,
  domain: string,
): EvidenceItem[] {
  const rng = seededRng(hashStr(incidentId));
  const nameLower = displayName.toLowerCase();
  const out: EvidenceItem[] = [];

  // Figure out what KIND of evidence this incident would plausibly have, so
  // a "phishing email campaign" incident shows an email + URL, while an
  // "unusual file" incident shows a file + hash. Deterministic but driven
  // by the incident's display name.
  const wantsEmail =
    /phish|email|inbox|message|credential|spray|consent/i.test(nameLower);
  const wantsUrl =
    /phish|url|domain|malicious.*ip|token|consent|campaign/i.test(nameLower);
  const wantsFile = /file|malware|process|ransomware|payload/i.test(
    nameLower,
  );

  // URL evidence
  if (wantsUrl || (!wantsEmail && !wantsFile)) {
    const urlBase = MALICIOUS_URLS[Math.floor(rng() * MALICIOUS_URLS.length)];
    const url = `${urlBase}${incidentId.slice(0, 8)}`;
    out.push({
      kind: "url",
      label: url,
      description:
        "Malicious URL observed in alert evidence. Pick to pre-fill the URL submission form.",
      url,
      detail:
        "Observed in 1 alert · flagged by Microsoft Defender SmartScreen · first seen 2h ago",
    });
  }

  // Email evidence — a suspicious message with a Graph messageUri an analyst
  // would normally need to copy from Defender XDR.
  if (wantsEmail) {
    const sender = SENDERS[Math.floor(rng() * SENDERS.length)];
    const recipientLocal =
      MAILBOX_USERS[Math.floor(rng() * MAILBOX_USERS.length)];
    const recipient = `${recipientLocal}@${domain}`;
    // Graph message URIs follow this shape: /users/{oid}/messages/{id}
    const userOid = `${incidentId.slice(0, 8)}-0000-4000-8000-${incidentId
      .slice(8, 20)
      .padEnd(12, "0")}`;
    const messageId = `AAMkA${incidentId.slice(0, 10)}${Math.floor(
      rng() * 1e8,
    ).toString(36)}`;
    const messageUri = `https://graph.microsoft.com/v1.0/users/${userOid}/messages/${messageId}`;
    out.push({
      kind: "email",
      label: `${sender} → ${recipient}`,
      description:
        "Suspicious email. Pick to pre-fill the Email submission form with recipient + Graph message URI.",
      emailRecipient: recipient,
      messageUri,
      detail: `Subject: "Urgent: account action required" · delivered 3h ago`,
    });
  }

  // File evidence.
  if (wantsFile) {
    const file = FILES[Math.floor(rng() * FILES.length)];
    out.push({
      kind: "file",
      label: file.name,
      description:
        "Suspicious file. Pick to pre-fill the File submission form with file name + SHA256 hash.",
      fileName: file.name,
      fileHash: file.hash,
      detail: `SHA256 ${file.hash.slice(0, 16)}… · executed on 1 endpoint · quarantined`,
    });
  }

  // Every incident gets at least one item.
  if (out.length === 0) {
    const url = `${MALICIOUS_URLS[0]}${incidentId.slice(0, 8)}`;
    out.push({
      kind: "url",
      label: url,
      description: "Observed URL in alert evidence.",
      url,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Real-Graph evidence extraction for live tenants.
// ---------------------------------------------------------------------------

type GraphEvidence = Record<string, unknown> & { "@odata.type"?: string };
type GraphAlert = {
  id?: string;
  title?: string;
  evidence?: GraphEvidence[];
};
type GraphIncidentWithAlerts = {
  id?: string;
  displayName?: string;
  alerts?: GraphAlert[];
};

function extractFromGraphEvidence(
  alert: GraphAlert,
  evidence: GraphEvidence,
): EvidenceItem[] {
  const type = String(evidence["@odata.type"] ?? "");
  const out: EvidenceItem[] = [];

  if (type.includes("urlEvidence")) {
    const url = String(evidence.url ?? "");
    if (url) {
      out.push({
        kind: "url",
        label: url,
        description: alert.title ?? "URL observed in alert evidence",
        url,
      });
    }
  } else if (
    type.includes("mailboxEvidence") ||
    type.includes("messageEvidence") ||
    type.includes("emailEvidence")
  ) {
    const userOid = String(
      (evidence.userAccount as Record<string, string>)?.userPrincipalName ??
        evidence.primaryAddress ??
        "",
    );
    const messageId = String(
      evidence.internetMessageId ?? evidence.networkMessageId ?? "",
    );
    if (userOid && messageId) {
      out.push({
        kind: "email",
        label: `${userOid} · ${messageId.slice(0, 24)}…`,
        description: alert.title ?? "Email observed in alert evidence",
        emailRecipient: userOid,
        messageUri: `https://graph.microsoft.com/v1.0/users/${userOid}/messages/${messageId}`,
      });
    }
  } else if (type.includes("fileEvidence") || type.includes("processEvidence")) {
    const fileName = String(evidence.fileName ?? evidence.imageFile ?? "");
    const hashes = (evidence.fileHashes as Array<Record<string, string>>) ?? [];
    const sha256 = hashes.find((h) => h.algorithm?.toLowerCase() === "sha256")
      ?.value;
    const hash = sha256 ?? hashes[0]?.value ?? "";
    if (fileName || hash) {
      out.push({
        kind: "file",
        label: fileName || hash.slice(0, 16),
        description: alert.title ?? "File observed in alert evidence",
        fileName: fileName || "unknown.bin",
        fileHash: hash,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const incidentId = req.nextUrl.searchParams.get("incidentId");
  if (!tenantId || !incidentId) {
    return NextResponse.json(
      { error: "missing_params" },
      { status: 400 },
    );
  }
  const tenant = getTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  // Demo path: synthesize evidence so the DESC Tuesday demo shows realistic
  // URLs / emails / file hashes instead of empty lists.
  if (tenant.is_demo === 1) {
    // We need the incident's display name to bias the synthesis. It lives
    // in the cached incidents snapshot — lazy-import to avoid a cycle at
    // module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLatestSnapshot } = require("@/lib/db/signals") as {
      getLatestSnapshot: <T>(
        tid: string,
        type: string,
      ) => { payload: T } | null;
    };
    type IncRow = {
      id: string;
      displayName: string;
    };
    const snap = getLatestSnapshot<{ incidents: IncRow[] }>(
      tenantId,
      "incidents",
    );
    const inc = snap?.payload.incidents.find((i) => i.id === incidentId);
    const displayName = inc?.displayName ?? "Suspicious activity";
    return NextResponse.json({
      tenantId,
      incidentId,
      simulated: true,
      evidence: synthesizeDemoEvidence(incidentId, displayName, tenant.domain),
    });
  }

  // Real path — Graph $expand=alerts, flatten evidence.
  try {
    const incident = await graphFetch<GraphIncidentWithAlerts>({
      tenantGuid: tenant.tenant_id,
      ourTenantId: tenant.id,
      path: `/security/incidents/${encodeURIComponent(incidentId)}?$expand=alerts`,
    });
    const evidence: EvidenceItem[] = [];
    for (const alert of incident.alerts ?? []) {
      for (const ev of alert.evidence ?? []) {
        evidence.push(...extractFromGraphEvidence(alert, ev));
      }
    }
    return NextResponse.json({
      tenantId,
      incidentId,
      simulated: false,
      evidence,
    });
  } catch (err) {
    return NextResponse.json(
      {
        tenantId,
        incidentId,
        simulated: false,
        evidence: [],
        error: (err as Error).message,
      },
      { status: 502 },
    );
  }
}
