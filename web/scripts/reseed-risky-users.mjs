#!/usr/bin/env node
// One-shot: regenerate risky_users snapshots for every demo tenant so the
// new `detections` field is populated. Safe — only touches is_demo=1 rows.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir =
  process.env.DATA_DIR && process.env.DATA_DIR.trim() !== ""
    ? process.env.DATA_DIR
    : path.join(projectRoot, "data");
const dbPath = process.env.SCSC_DB_PATH ?? path.join(dataDir, "scsc.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// Tenants and their domain. Pull from the `tenants` table.
const demos = db
  .prepare(
    "SELECT id, name_en, domain FROM tenants WHERE is_demo = 1",
  )
  .all();

// Per-entity at-risk count — best-effort synthesis: 2–4 users per tenant.
const FIRST_NAMES = ["Khalid", "Aisha", "Omar", "Maryam", "Saeed", "Noura", "Hassan", "Fatima", "Rashid", "Layla", "Ahmed", "Hind"];
const LAST_NAMES = ["Al Suwaidi", "Al Maktoum", "Al Nahyan", "Al Qasimi", "Al Mansouri", "Al Falasi", "Al Hashemi", "Al Zaabi"];

const DEMO_RISK_EVENTS = [
  { type: "unfamiliarFeatures", detail: "Sign-in properties (device, browser, ASN) the user hasn't used before" },
  { type: "atypicalTravel", detail: "Sign-in from a location unusual for this user given their recent activity" },
  { type: "maliciousIPAddress", detail: "Sign-in attempted from an IP flagged in Microsoft threat intel feeds" },
  { type: "leakedCredentials", detail: "The user's credentials were found in a public leaked-password dump" },
  { type: "passwordSpray", detail: "Account targeted by a password-spray attack pattern" },
  { type: "anonymousIPAddress", detail: "Sign-in from a Tor / anonymising proxy IP" },
  { type: "impossibleTravel", detail: "Two successful sign-ins from geographically far-apart locations within a short window" },
  { type: "suspiciousInboxManipulation", detail: "Post-compromise mailbox-rule behaviour observed" },
];
const DEMO_COUNTRIES = [
  { city: "Istanbul", country: "Turkey" },
  { city: "Minsk", country: "Belarus" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Caracas", country: "Venezuela" },
  { city: "Moscow", country: "Russia" },
  { city: "Pyongyang", country: "DPR Korea" },
  { city: "Tehran", country: "Iran" },
  { city: "Manila", country: "Philippines" },
];
function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}
function rndIp(seed) {
  const a = ((seed * 31 + 17) % 254) + 1;
  const b = ((seed * 47 + 5) % 254) + 1;
  const c = ((seed * 59 + 3) % 254) + 1;
  const d = ((seed * 13 + 11) % 254) + 1;
  return `${a}.${b}.${c}.${d}`;
}

function generate(atRiskCount, domain) {
  const historical = Math.max(5, Math.round(atRiskCount * 1.3));
  const total = atRiskCount + historical;
  const out = [];
  for (let i = 0; i < total; i++) {
    const first = pick(FIRST_NAMES, i * 7 + 11);
    const last = pick(LAST_NAMES, i * 13 + 3);
    const upn = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}@${domain}`;
    const atRisk = i < atRiskCount;
    const lvlSeed = i * 17 + 5;
    const level = atRisk ? (lvlSeed % 10 < 2 ? "high" : lvlSeed % 10 < 5 ? "medium" : "low") : "low";
    const state = atRisk ? "atRisk" : lvlSeed % 10 < 7 ? "remediated" : "dismissed";
    const lastUpdatedMs = Date.now() - ((i * 37 + 11) % (60 * 24 * 30)) * 60_000;
    const detections = [];
    if (atRisk) {
      const nDet = (lvlSeed % 3) + 1;
      for (let d = 0; d < nDet; d++) {
        const ev = DEMO_RISK_EVENTS[(i * 5 + d * 13 + 2) % DEMO_RISK_EVENTS.length];
        const loc = DEMO_COUNTRIES[(i * 3 + d * 7 + 5) % DEMO_COUNTRIES.length];
        const detAgo = (i * 11 + d * 17 + 5) % (60 * 24 * 7);
        detections.push({
          id: `rd-${i.toString(16)}-${d}`,
          riskEventType: ev.type,
          riskDetail: ev.detail,
          riskLevel:
            ev.type === "leakedCredentials" || ev.type === "maliciousIPAddress"
              ? "high"
              : ev.type === "atypicalTravel" || ev.type === "impossibleTravel"
                ? "medium"
                : "low",
          source: "IdentityProtection",
          activity: "signin",
          ipAddress: rndIp(i * 7 + d * 11),
          city: loc.city,
          countryOrRegion: loc.country,
          detectedDateTime: new Date(lastUpdatedMs - detAgo * 60_000).toISOString(),
        });
      }
    }
    out.push({
      id: `ru-${i.toString(16)}-${first[0].toLowerCase()}${last[0].toLowerCase()}`,
      userPrincipalName: upn,
      displayName: `${first} ${last}`,
      riskLevel: level,
      riskState: state,
      riskLastUpdatedDateTime: new Date(lastUpdatedMs).toISOString(),
      detections,
    });
  }
  return out;
}

const wipe = db.prepare(
  "DELETE FROM signal_snapshots WHERE tenant_id = ? AND signal_type = 'riskyUsers'",
);
const insert = db.prepare(
  "INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, payload) VALUES (?, 'riskyUsers', 1, 200, ?)",
);

let wiped = 0;
let inserted = 0;
for (const t of demos) {
  // Best-effort at-risk count per tenant — 2–6 based on name hash.
  const seed = Array.from(t.id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const atRiskCount = 2 + (seed % 5);
  const users = generate(atRiskCount, t.domain ?? "demo.local");
  const payload = {
    total: users.length,
    highRisk: users.filter((u) => u.riskLevel === "high").length,
    mediumRisk: users.filter((u) => u.riskLevel === "medium").length,
    lowRisk: users.filter((u) => u.riskLevel === "low").length,
    atRisk: users.filter(
      (u) => u.riskState === "atRisk" || u.riskState === "confirmedCompromised",
    ).length,
    users,
  };
  wipe.run(t.id);
  wiped++;
  insert.run(t.id, JSON.stringify(payload));
  inserted++;
}

console.log(`Re-seeded riskyUsers for ${inserted} demo tenant(s). Wiped ${wiped} old snapshots.`);
db.close();
