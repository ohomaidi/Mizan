#!/usr/bin/env node
// Regenerate incidents snapshots for every demo tenant so the new
// assignedTo / determination / tags / incidentWebUrl fields are populated.
// Idempotent with --force to overwrite existing rows.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dbPath =
  process.env.SCSC_DB_PATH ??
  path.join(
    process.env.DATA_DIR && process.env.DATA_DIR.trim() !== ""
      ? process.env.DATA_DIR
      : path.join(projectRoot, "data"),
    "scsc.sqlite",
  );

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const SEVERITIES = ["high", "medium", "low", "informational"];
const INCIDENT_TEMPLATES = [
  "Suspicious sign-in from anonymous IP",
  "Possible credential theft detected",
  "Attempted brute-force on admin account",
  "Malware detected on managed device",
  "Unusual file exfiltration pattern",
  "OAuth consent grant for risky app",
  "Conditional Access policy bypass attempt",
  "Mass download from SharePoint",
  "Suspicious inbox rule created",
  "Legacy authentication from foreign country",
];
const DETERMINATIONS = [
  "apt", "malware", "phishing", "unwantedSoftware",
  "compromisedAccount", "maliciousUserActivity", "insufficientInformation",
];
const ANALYSTS = [
  "khalid.almaktoum@council.local",
  "noura.alzaabi@council.local",
  "ahmed.alsuwaidi@council.local",
];
const TAGS = [
  "priority-review", "after-hours", "external-source",
  "privileged-account", "phishing-campaign", "malware-detected",
];
function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

function generate(activeCount) {
  const resolvedCount = Math.max(activeCount, Math.round(activeCount * 5.67));
  const total = activeCount + resolvedCount;
  const out = [];
  for (let i = 0; i < total; i++) {
    const active = i < activeCount;
    const sevSeed = i * 11 + 7;
    const sev = active
      ? (sevSeed % 10 < 2 ? "high" : sevSeed % 10 < 6 ? "medium" : "low")
      : SEVERITIES[sevSeed % SEVERITIES.length];
    const status = active ? (sevSeed % 10 < 3 ? "inProgress" : "active") : "resolved";
    const createdMinsAgo = active ? (i * 41 + 13) % (60 * 24 * 7) : (i * 53 + 23) % (60 * 24 * 30);
    const updatedMinsAgo = active ? Math.floor(createdMinsAgo / 2) : createdMinsAgo;
    const classification =
      status === "resolved"
        ? pick(["truePositive", "informationalExpectedActivity", "falsePositive"], i * 7)
        : null;
    const determination =
      classification === "truePositive" ? pick(DETERMINATIONS, i * 23 + 5)
        : classification === "falsePositive" ? "other" : null;
    const tagCount = sevSeed % 4;
    const tags = [];
    for (let k = 0; k < tagCount; k++) {
      const tag = TAGS[(i * 13 + k * 7 + 3) % TAGS.length];
      if (!tags.includes(tag)) tags.push(tag);
    }
    const id = `inc-${i.toString(16).padStart(5, "0")}`;
    out.push({
      id,
      displayName: pick(INCIDENT_TEMPLATES, i * 17 + 3),
      severity: sev,
      status,
      classification,
      determination,
      createdDateTime: new Date(Date.now() - createdMinsAgo * 60_000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - updatedMinsAgo * 60_000).toISOString(),
      alertCount: 1 + (i * 3 + 1) % 5,
      assignedTo:
        status === "active" || status === "inProgress" ? pick(ANALYSTS, i * 19 + 3) : null,
      tags,
      incidentWebUrl: `https://security.microsoft.com/incident2/${encodeURIComponent(id)}/summary`,
    });
  }
  return out;
}

const demos = db.prepare("SELECT id FROM tenants WHERE is_demo = 1").all();
const wipe = db.prepare(
  "DELETE FROM signal_snapshots WHERE tenant_id = ? AND signal_type = 'incidents'",
);
const insert = db.prepare(
  "INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, payload) VALUES (?, 'incidents', 1, 200, ?)",
);

let rewritten = 0;
for (const { id } of demos) {
  // Active count per tenant — 1-4 based on name hash.
  const seed = Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const active = 1 + (seed % 4);
  const incidents = generate(active);
  const bySev = {};
  for (const inc of incidents) bySev[inc.severity] = (bySev[inc.severity] ?? 0) + 1;
  const payload = {
    total: incidents.length,
    active: incidents.filter((i) => i.status !== "resolved").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    bySeverity: bySev,
    incidents,
  };
  wipe.run(id);
  insert.run(id, JSON.stringify(payload));
  rewritten++;
}

console.log(`Re-seeded incidents for ${rewritten} demo tenant(s) with new fields.`);
db.close();
