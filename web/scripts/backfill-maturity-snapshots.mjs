#!/usr/bin/env node
// Reconstruct historical maturity_snapshots from existing signal_snapshots.
// Calls the POST /api/admin/backfill-maturity endpoint on the local server.
// Run with `npm run backfill-maturity-snapshots`.
//
// Requires the dashboard to be running (dev or prod) at PORT (default 8787)
// so the handler can use the same in-process DB and compute logic the
// runtime uses. A headless DB-direct backfill would duplicate the
// maturity-compute weighting logic and drift over time.

const port = process.env.PORT ?? "8787";
const host = process.env.BACKFILL_HOST ?? `http://127.0.0.1:${port}`;
const url = `${host}/api/admin/backfill-maturity`;

const headers = { "Content-Type": "application/json" };
if (process.env.SCSC_SYNC_SECRET) {
  headers["Authorization"] = `Bearer ${process.env.SCSC_SYNC_SECRET}`;
}

console.log(`→ POST ${url}`);

const res = await fetch(url, { method: "POST", headers });

if (!res.ok) {
  const body = await res.text();
  console.error(`Backfill failed: HTTP ${res.status}`);
  console.error(body);
  process.exit(1);
}

const body = await res.json();
console.log("Backfill complete:");
console.log(`  tenants processed: ${body.tenantsProcessed}`);
console.log(`  rows inserted:     ${body.rowsInserted}`);
console.log(`  days skipped:      ${body.daysSkipped}  (already had a snapshot)`);
