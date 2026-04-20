#!/usr/bin/env node
// Purge demo tenants (is_demo=1) and trigger a reseed via HTTP.
// Real onboarded tenants are untouched.
// Run with `npm run reseed-demo`.

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
  console.log(`DB does not exist at ${dbPath}. Start the server once to initialize it.`);
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const demos = db
  .prepare("SELECT id, name_en FROM tenants WHERE is_demo = 1")
  .all();

if (demos.length > 0) {
  console.log(`Deleting ${demos.length} demo tenant(s):`);
  for (const d of demos) console.log(`  - ${d.id}  (${d.name_en})`);
  const ids = demos.map((d) => d.id);
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM tenants WHERE id IN (${placeholders})`).run(...ids);
} else {
  console.log("No existing demo tenants.");
}

db.close();

console.log("");
console.log("Demo tenants cleared. To reseed with the enriched catalog:");
console.log("  1. Confirm SCSC_SEED_DEMO=true in web/.env.local");
console.log("  2. Reload the server:");
console.log("       launchctl unload ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist");
console.log("       launchctl load ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist");
console.log("     or: npm run build && npm run start");
console.log("");
console.log("Real (non-demo) tenants are untouched.");
