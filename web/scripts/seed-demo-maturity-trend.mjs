#!/usr/bin/env node
// One-shot: populate maturity_snapshots for every existing demo tenant so
// Entity Detail trend charts show real shape right away on an environment
// that was seeded before v1.1 introduced the table. Idempotent — skips
// any demo tenant that already has rows.

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

// Read each demo tenant's current Maturity Index from the latest
// secureScore snapshot as a rough baseline — that's what the v1.0 demo
// seed uses as the per-entity target too. Falls back to 70 if unreadable.
const demoTenants = db
  .prepare("SELECT id, name_en FROM tenants WHERE is_demo = 1")
  .all();

if (demoTenants.length === 0) {
  console.log("No demo tenants in DB. Run the demo seed first or onboard tenants.");
  db.close();
  process.exit(0);
}

// Per-tenant "current index" — pre-baked values that match the demo
// catalog in lib/db/seed.ts (kept in sync by hand; if a tenant isn't
// listed we fall back to 70 so the chart still renders).
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

const DAYS = 90;
const RAMP = 5;

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
const clamp = (n) => Math.max(0, Math.min(100, n));
const round1 = (n) => Math.round(n * 10) / 10;

const hasAny = db.prepare("SELECT 1 FROM maturity_snapshots WHERE tenant_id = ? LIMIT 1");
const insert = db.prepare(`
  INSERT INTO maturity_snapshots
    (tenant_id, captured_at, overall, secure_score, identity, device, data, threat, compliance)
  VALUES
    (@tenant_id, @captured_at, @overall, @secure_score, @identity, @device, @data, @threat, @compliance)
`);

const offsets = {
  secureScore: -2,
  identity: -1,
  device: 4,
  data: -6,
  threat: 2,
  compliance: 0,
};

let seeded = 0;
let skipped = 0;
const tx = db.transaction(() => {
  for (const t of demoTenants) {
    if (hasAny.get(t.id)) {
      skipped++;
      continue;
    }
    const latest = INDEX_BY_ID[t.id] ?? 70;
    const earliest = Math.max(0, latest - RAMP);
    const rng = seedRandom(`${t.id}:trend`);
    for (let i = DAYS - 1; i >= 0; i--) {
      const pct = (DAYS - 1 - i) / (DAYS - 1);
      const overall = clamp(earliest + RAMP * pct + (rng() - 0.5) * 1.6);
      const sub = (off) => clamp(overall + off + (rng() - 0.5) * 2.2);
      insert.run({
        tenant_id: t.id,
        captured_at: new Date(Date.now() - i * 86_400_000).toISOString(),
        overall: round1(overall),
        secure_score: round1(sub(offsets.secureScore)),
        identity: round1(sub(offsets.identity)),
        device: round1(sub(offsets.device)),
        data: round1(sub(offsets.data)),
        threat: round1(sub(offsets.threat)),
        compliance: round1(sub(offsets.compliance)),
      });
      seeded++;
    }
  }
});
tx();

console.log(`Seeded ${seeded} maturity_snapshots rows across ${demoTenants.length - skipped} demo tenant(s).`);
console.log(`Skipped ${skipped} that already had trend data.`);
db.close();
