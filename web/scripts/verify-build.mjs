#!/usr/bin/env node
/**
 * Post-build integrity check for the Next.js App Router output.
 *
 * Runs after `next build`. Validates that every server-rendered page has its
 * sibling `page_client-reference-manifest.js` on disk. This file is what the
 * runtime uses to wire client components into a server-rendered route;
 * Turbopack's incremental cache (Next 16) occasionally emits the page chunk
 * but drops the manifest, producing a runtime-only crash:
 *
 *   Invariant: The client reference manifest for route "/X" does not exist.
 *
 * The build otherwise reports "successful" — so without this check, a broken
 * deploy can ship and only the first user navigating to that route notices.
 *
 * If corruption is detected, the script exits with code 2 and prints a precise
 * list of affected routes plus the exact remedy command. Callers (npm, CI,
 * operators) can either run `npm run build:clean` or invoke this script with
 * --auto-heal to rm -rf .next and retry once automatically.
 *
 * Design choices:
 *   - No dependencies. Pure Node fs. Runs in <100ms on a fully-built app.
 *   - Fails the build — never silently auto-heals unless explicitly asked.
 *     A silent heal would mask regressions in Next/Turbopack; the failure
 *     itself is a useful signal.
 *   - --auto-heal exists for CI and local `npm run build:safe`, where retry
 *     is desired. It runs one retry, not a loop, and reports each attempt.
 */

import { readdir, stat, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const appDir = join(projectRoot, ".next/server/app");

const args = new Set(process.argv.slice(2));
const AUTO_HEAL = args.has("--auto-heal");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Walk `.next/server/app/` and yield every directory containing a `page.js` file. */
async function* walkPages(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return; // Directory doesn't exist — no pages at this level.
  }
  const hasPage = entries.some(
    (e) => e.isFile() && /^page\.(js|cjs|mjs)$/.test(e.name),
  );
  if (hasPage) yield root;
  for (const e of entries) {
    if (e.isDirectory()) yield* walkPages(join(root, e.name));
  }
}

/**
 * Check one page directory for manifest integrity.
 * Returns a list of problems (each a short description string) or [] if clean.
 */
async function checkPage(pageDir) {
  const problems = [];
  // Canonical manifest name for Next 16 App Router. If the naming changes in
  // a future Next, this is the one place to update.
  const manifest = join(pageDir, "page_client-reference-manifest.js");
  if (!(await exists(manifest))) {
    problems.push(`missing ${manifest.replace(projectRoot + "/", "")}`);
  }
  return problems;
}

async function verify() {
  if (!(await exists(appDir))) {
    console.error(
      `verify-build: build output not found at ${appDir}. Run \`next build\` first.`,
    );
    process.exit(1);
  }

  const problems = [];
  let pagesChecked = 0;
  for await (const pageDir of walkPages(appDir)) {
    pagesChecked++;
    const issues = await checkPage(pageDir);
    problems.push(...issues);
  }

  if (problems.length === 0) {
    console.log(
      `verify-build: ✓ ${pagesChecked} route(s) — all manifests present.`,
    );
    return { ok: true };
  }

  console.error("");
  console.error(
    "verify-build: ✗ Next.js build output is missing client reference manifests.",
  );
  console.error(
    "              These routes will return HTTP 500 at runtime:",
  );
  console.error("");
  for (const p of problems) console.error(`    ${p}`);
  console.error("");
  console.error(
    "This is a Turbopack incremental-cache corruption (Next 16). The build itself",
  );
  console.error(
    "reported success, but the output on disk is inconsistent.",
  );
  console.error("");
  console.error("Remedy — one clean rebuild:");
  console.error("    rm -rf .next && npm run build");
  console.error(
    "    (or: `npm run build:safe` — builds with --auto-heal enabled)",
  );
  console.error("");
  return { ok: false };
}

async function main() {
  const first = await verify();
  if (first.ok) return process.exit(0);

  if (!AUTO_HEAL) process.exit(2);

  // Auto-heal path: wipe .next and rebuild once, then re-verify. This is for
  // CI / `npm run build:safe` only — never silently invoked from `npm run build`.
  console.error("verify-build: --auto-heal active. Cleaning and rebuilding once...");
  await rm(join(projectRoot, ".next"), { recursive: true, force: true });
  const result = spawnSync("npx", ["next", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error("verify-build: rebuild failed. Giving up.");
    process.exit(3);
  }
  const second = await verify();
  if (!second.ok) {
    console.error(
      "verify-build: rebuild still produced a corrupt manifest. This is a Next/Turbopack bug worth reporting. Exit 4.",
    );
    process.exit(4);
  }
  console.log("verify-build: auto-heal succeeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error("verify-build: unexpected error:", err);
  process.exit(5);
});
