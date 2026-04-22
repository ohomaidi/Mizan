#!/usr/bin/env node
// One-shot: inject a vulnerabilities snapshot for every demo tenant already
// in the DB. Idempotent — skips any tenant that already has one. Matches the
// server-side generateVulnerabilities() logic but standalone so it runs on
// environments where the seed has already completed.

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

const CVE_CATALOG = [
  { cveId: "CVE-2024-38063", severity: "Critical", cvssScore: 9.8, hasExploit: true, published: "2024-08-13" },
  { cveId: "CVE-2024-26169", severity: "Critical", cvssScore: 9.8, hasExploit: true, published: "2024-03-12" },
  { cveId: "CVE-2023-36884", severity: "Critical", cvssScore: 9.3, hasExploit: true, published: "2023-07-11" },
  { cveId: "CVE-2024-21412", severity: "Critical", cvssScore: 8.1, hasExploit: true, published: "2024-02-13" },
  { cveId: "CVE-2023-24932", severity: "Critical", cvssScore: 6.7, hasExploit: true, published: "2023-05-09" },
  { cveId: "CVE-2024-30088", severity: "High", cvssScore: 7.0, hasExploit: false, published: "2024-06-11" },
  { cveId: "CVE-2024-38080", severity: "High", cvssScore: 7.8, hasExploit: true, published: "2024-07-09" },
  { cveId: "CVE-2024-29988", severity: "High", cvssScore: 8.8, hasExploit: true, published: "2024-04-09" },
  { cveId: "CVE-2024-30078", severity: "High", cvssScore: 8.8, hasExploit: false, published: "2024-06-11" },
  { cveId: "CVE-2024-38178", severity: "High", cvssScore: 7.5, hasExploit: true, published: "2024-08-13" },
  { cveId: "CVE-2024-37085", severity: "High", cvssScore: 6.8, hasExploit: false, published: "2024-06-25" },
  { cveId: "CVE-2023-44487", severity: "High", cvssScore: 7.5, hasExploit: true, published: "2023-10-10" },
  { cveId: "CVE-2024-35250", severity: "Medium", cvssScore: 6.4, hasExploit: false, published: "2024-06-11" },
  { cveId: "CVE-2023-38545", severity: "Medium", cvssScore: 5.3, hasExploit: false, published: "2023-10-11" },
  { cveId: "CVE-2024-23334", severity: "Medium", cvssScore: 5.9, hasExploit: false, published: "2024-01-28" },
  { cveId: "CVE-2024-27198", severity: "Medium", cvssScore: 6.8, hasExploit: true, published: "2024-03-04" },
  { cveId: "CVE-2023-50164", severity: "Medium", cvssScore: 6.2, hasExploit: false, published: "2023-12-07" },
  { cveId: "CVE-2024-4577", severity: "Medium", cvssScore: 6.4, hasExploit: true, published: "2024-06-06" },
  { cveId: "CVE-2024-28121", severity: "Low", cvssScore: 3.5, hasExploit: false, published: "2024-03-12" },
  { cveId: "CVE-2023-21709", severity: "Low", cvssScore: 3.6, hasExploit: false, published: "2023-08-08" },
];

const OS_PLATFORMS = ["Windows11", "Windows10", "Windows Server 2019", "Windows Server 2022", "macOS", "iOS"];

// Maturity indices match lib/db/seed.ts DEMO catalog.
const INDEX_BY_ID = {
  "shj-police-ghq": 87,
  "shj-health-authority": 74,
  "shj-municipality": 68,
  "shj-electricity-water": 71,
  "shj-ports-customs": 65,
  "shj-edu-authority": 78,
  "shj-finance-dept": 82,
  "shj-dubai-culture": 61,
  "shj-social-services": 56,
  "shj-sports-council": 73,
  "shj-transport-authority": 69,
  "shj-tourism-commerce": 64,
};

function seedRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}

function generateVulns(tenantId, index, intuneDevices) {
  const rng = seedRandom(`${tenantId}:vulns`);
  const scale = Math.max(0.3, (100 - index) / 100);
  const remediationRatio = Math.min(0.6, 0.1 + (index / 100) * 0.4);
  const cveCountTarget = Math.floor(8 + scale * 20 + rng() * 6);
  const chosenCves = CVE_CATALOG.slice(0, Math.min(CVE_CATALOG.length, cveCountTarget))
    .slice()
    .sort(() => rng() - 0.5)
    .slice(0, cveCountTarget);

  // Prefer Intune devices with worse compliance state so the drill-down
  // "noncompliant device → has CVEs" narrative lands.
  const intuneSorted = (intuneDevices ?? []).slice().sort((a, b) => {
    const rank = (s) =>
      s === "noncompliant" ? 3 : s === "error" ? 2 : s === "inGracePeriod" ? 1 : 0;
    return rank(b.complianceState) - rank(a.complianceState);
  });
  const deviceCount = Math.min(
    intuneSorted.length || 1,
    Math.max(1, Math.floor(6 + scale * 18 + rng() * 4)),
  );
  const byDevice = [];
  const devicesByCve = new Map();
  for (let i = 0; i < deviceCount; i++) {
    const src = intuneSorted[i];
    const picked = Math.floor(2 + rng() * 7);
    const assigned = chosenCves.slice().sort(() => rng() - 0.5).slice(0, picked);
    const critical = assigned.filter((c) => c.severity === "Critical").length;
    const high = assigned.filter((c) => c.severity === "High").length;
    const medium = assigned.filter((c) => c.severity === "Medium").length;
    const low = assigned.filter((c) => c.severity === "Low").length;
    const maxCvss = assigned.reduce((m, c) => Math.max(m, c.cvssScore), 0);
    const deviceName = src
      ? src.deviceName
      : `${tenantId.toUpperCase()}-WS-${String(i + 1).padStart(3, "0")}`;
    byDevice.push({
      deviceId: src ? src.id : `${tenantId}-dev-${i + 1}`,
      deviceName,
      osPlatform: src ? src.operatingSystem : OS_PLATFORMS[Math.floor(rng() * OS_PLATFORMS.length)],
      cveCount: assigned.length,
      critical, high, medium, low,
      maxCvss: maxCvss || null,
      cveIds: assigned.map((c) => c.cveId),
    });
    for (const c of assigned) {
      const arr = devicesByCve.get(c.cveId) ?? [];
      arr.push(deviceName);
      devicesByCve.set(c.cveId, arr);
    }
  }
  byDevice.sort((a, b) => b.critical - a.critical || b.high - a.high || b.cveCount - a.cveCount);

  const topCves = chosenCves.map((c) => {
    const exposed = devicesByCve.get(c.cveId)?.length ?? 0;
    const simulatedUniverse = Math.max(
      exposed,
      Math.round(exposed / Math.max(0.01, 1 - remediationRatio)),
    );
    const remediated = simulatedUniverse - exposed;
    return {
      cveId: c.cveId,
      severity: c.severity,
      cvssScore: c.cvssScore,
      affectedDevices: exposed,
      remediatedDevices: remediated,
      hasExploit: c.hasExploit,
      publishedDateTime: c.published + "T00:00:00Z",
    };
  });

  const critical = topCves.filter((c) => c.severity === "Critical").length;
  const high = topCves.filter((c) => c.severity === "High").length;
  const medium = topCves.filter((c) => c.severity === "Medium").length;
  const low = topCves.filter((c) => c.severity === "Low").length;
  const exploitable = topCves.filter((c) => c.hasExploit).length;

  return {
    total: topCves.length,
    critical, high, medium, low, exploitable,
    affectedDevices: byDevice.length,
    remediationTracked: true,
    byDevice: byDevice.slice(0, 50),
    topCves: topCves
      .sort((a, b) => b.affectedDevices - a.affectedDevices || (b.cvssScore ?? 0) - (a.cvssScore ?? 0))
      .slice(0, 50),
    error: null,
  };
}

const demos = db.prepare("SELECT id FROM tenants WHERE is_demo = 1").all();
// Re-seed mode: --force wipes existing snapshots so new payload shape lands.
const FORCE = process.argv.includes("--force");
const wipe = db.prepare(
  "DELETE FROM signal_snapshots WHERE tenant_id = ? AND signal_type = 'vulnerabilities'",
);
const has = db.prepare(
  "SELECT 1 FROM signal_snapshots WHERE tenant_id = ? AND signal_type = 'vulnerabilities' LIMIT 1",
);
const insert = db.prepare(
  "INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, payload) VALUES (?, 'vulnerabilities', 1, 200, ?)",
);
const getDevicesSnap = db.prepare(
  "SELECT payload FROM signal_snapshots WHERE tenant_id = ? AND signal_type = 'devices' AND ok = 1 ORDER BY fetched_at DESC LIMIT 1",
);

let seeded = 0;
let skipped = 0;
let wiped = 0;
for (const { id } of demos) {
  if (has.get(id)) {
    if (!FORCE) {
      skipped++;
      continue;
    }
    wipe.run(id);
    wiped++;
  }
  const index = INDEX_BY_ID[id] ?? 70;
  // Pull the tenant's Intune device list so vulnerability device names
  // match what the Devices tab renders.
  let intuneDevices = [];
  const dev = getDevicesSnap.get(id);
  if (dev && dev.payload) {
    try {
      const parsed = JSON.parse(dev.payload);
      intuneDevices = Array.isArray(parsed?.devices) ? parsed.devices : [];
    } catch {
      /* malformed — fall back to synthetic names */
    }
  }
  const payload = JSON.stringify(generateVulns(id, index, intuneDevices));
  insert.run(id, payload);
  seeded++;
}

console.log(
  `Seeded vulnerabilities for ${seeded} demo tenant(s). ${wiped > 0 ? `Wiped ${wiped} old snapshots. ` : ""}Skipped ${skipped} that already had a snapshot.`,
);
db.close();
