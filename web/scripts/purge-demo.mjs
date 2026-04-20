#!/usr/bin/env node
// Purge every demo tenant (is_demo=1) and their cascade.
// Real onboarded tenants are untouched. Run with `npm run purge-demo`.

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
  console.log(`Nothing to purge — DB does not exist at ${dbPath}.`);
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const demos = db
  .prepare("SELECT id, name_en FROM tenants WHERE is_demo = 1")
  .all();

if (demos.length === 0) {
  console.log("No demo tenants in the database. Nothing to do.");
  db.close();
  process.exit(0);
}

console.log(`Deleting ${demos.length} demo tenant(s):`);
for (const d of demos) console.log(`  - ${d.id}  (${d.name_en})`);

const ids = demos.map((d) => d.id);
const placeholders = ids.map(() => "?").join(",");
db.prepare(`DELETE FROM tenants WHERE id IN (${placeholders})`).run(...ids);

console.log("Done. Real (non-demo) tenants are untouched.");
db.close();
