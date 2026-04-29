import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "@/lib/config";
import { seedDemoTenantsIfEmpty } from "./seed";

let _db: Database.Database | null = null;
let _backupTimer: ReturnType<typeof setInterval> | null = null;
let _shutdownHooked = false;

/**
 * Detect whether the directory containing the SQLite file is on a networked
 * filesystem (NFS / SMB / CIFS). Returns `false` if detection fails for any
 * reason — the safer fallback assumes local disk.
 *
 * v2.5.17: kept as a defensive fallback. The recommended deployment topology
 * (introduced in v2.5.17) puts the SQLite file on the container's local
 * `EmptyDir` volume and uses Azure Files NFS only as a backup target —
 * meaning `isOnNetworkedFs(dbPath)` should return `false` on a properly
 * configured ACA install. If an operator misconfigures `SCSC_DB_PATH` to
 * point back at NFS, this detector still kicks in and falls back to the
 * slow-but-safe DELETE-journal mode rather than corrupting the database.
 */
function isOnNetworkedFs(dbPath: string): boolean {
  if ((process.env.MIZAN_DB_NETWORK_FS ?? "").toLowerCase() === "true") {
    return true;
  }
  if (process.platform !== "linux") return false;
  try {
    const mounts = fs.readFileSync("/proc/mounts", "utf8");
    const target = path.resolve(path.dirname(dbPath));
    let bestType = "";
    let bestLen = 0;
    for (const line of mounts.split("\n")) {
      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;
      const mountPoint = parts[1];
      const fsType = parts[2];
      const isPrefix =
        target === mountPoint ||
        target.startsWith(mountPoint + (mountPoint.endsWith("/") ? "" : "/"));
      if (isPrefix && mountPoint.length > bestLen) {
        bestLen = mountPoint.length;
        bestType = fsType;
      }
    }
    return /^(nfs|nfs4|cifs|smb|smb3|smbfs)$/i.test(bestType);
  } catch {
    return false;
  }
}

/**
 * Resolve the directory where periodic backups of the SQLite file are
 * written. Set via `MIZAN_DB_BACKUP_DIR` (the ACA Bicep wires this to the
 * existing Azure Files NFS mount at `/data` so backups persist across
 * pod restarts). Returns `null` to disable the backup loop entirely —
 * desirable for Mac / Docker self-hosted installs where the SQLite file
 * already lives on durable local disk.
 */
function backupDir(): string | null {
  const dir = (process.env.MIZAN_DB_BACKUP_DIR ?? "").trim();
  return dir.length > 0 ? dir : null;
}

function backupFilePath(): string | null {
  const dir = backupDir();
  return dir ? path.join(dir, "scsc.sqlite") : null;
}

/**
 * On boot: if the live DB file doesn't exist locally, restore from the
 * latest backup. Idempotent — does nothing when the local file already
 * exists or when no backup is configured.
 *
 * This is what makes the EmptyDir-volume strategy work: the container's
 * local disk is wiped on every revision swap, but the backup on Azure
 * Files NFS persists, so the new pod boots with the old pod's last good
 * snapshot.
 */
function restoreFromBackupIfNeeded(localDbPath: string): void {
  if (fs.existsSync(localDbPath)) return;
  const bkp = backupFilePath();
  if (!bkp || !fs.existsSync(bkp)) return;
  try {
    fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
    fs.copyFileSync(bkp, localDbPath);
    console.log(
      `[mizan/db] restored from backup: ${bkp} → ${localDbPath} (${fs.statSync(localDbPath).size} bytes)`,
    );
  } catch (e) {
    console.error(`[mizan/db] backup restore failed`, e);
  }
}

/**
 * Take an online backup using better-sqlite3's `db.backup()` API. The
 * backup is transactional + page-by-page, doesn't block writers, and
 * produces a consistent snapshot even mid-transaction. Atomic via
 * tmp-file + rename so a partially-written backup never replaces a good
 * one. Errors are logged but never thrown — backup failure must NEVER
 * interrupt a request flow.
 */
async function takeBackup(db: Database.Database): Promise<void> {
  const bkp = backupFilePath();
  if (!bkp) return;
  const tmp = `${bkp}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.mkdirSync(path.dirname(bkp), { recursive: true });
    await db.backup(tmp);
    fs.renameSync(tmp, bkp);
  } catch (e) {
    console.error(`[mizan/db] backup failed`, e);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* tmp may not exist */
    }
  }
}

/**
 * Schedule the periodic backup loop + a final-backup-on-SIGTERM hook.
 * Idempotent — safe to call multiple times; only the first call wires
 * timers.
 */
function startBackupLoop(db: Database.Database): void {
  if (!backupDir()) return;
  if (_backupTimer || _shutdownHooked) return;

  // Periodic backup. 5-minute interval is the bound on data-loss-window for
  // a pod hard-crash (SIGKILL with no grace period). Soft restarts (SIGTERM)
  // get a final backup via the shutdown hook below, so they lose nothing.
  const intervalMs = Math.max(
    60_000, // floor: never less than 1 minute (avoid accidental tight loops)
    Number(process.env.MIZAN_DB_BACKUP_INTERVAL_MS ?? 5 * 60_000),
  );
  _backupTimer = setInterval(() => {
    takeBackup(db).catch(() => {
      /* takeBackup already logs */
    });
  }, intervalMs);
  // Don't keep the event loop alive just for the timer.
  if (typeof _backupTimer.unref === "function") _backupTimer.unref();

  // Final backup on graceful shutdown. ACA sends SIGTERM with a 30s grace
  // period before SIGKILL — plenty of time for one backup. Re-emit the
  // signal at the end so any other shutdown handlers still run.
  const onShutdown = (signal: NodeJS.Signals) => {
    if (_backupTimer) {
      clearInterval(_backupTimer);
      _backupTimer = null;
    }
    takeBackup(db)
      .catch(() => {
        /* logged */
      })
      .finally(() => {
        // Re-raise the signal so the process actually exits.
        process.removeListener(signal, onShutdown);
        process.kill(process.pid, signal);
      });
  };
  process.once("SIGTERM", onShutdown);
  process.once("SIGINT", onShutdown);
  _shutdownHooked = true;

  console.log(
    `[mizan/db] backup loop started: every ${Math.round(intervalMs / 1000)}s → ${backupFilePath()}`,
  );
}

/**
 * Singleton SQLite connection. Lazy — created on first call, migrations
 * applied, demo data seeded if DB is empty, periodic backup scheduled.
 *
 * **v2.5.17 architecture (the perf fix):** the SQLite file lives on the
 * container's local filesystem (an `EmptyDir` volume on ACA, or the host
 * filesystem on Mac / Docker), where it gets full POSIX semantics + WAL
 * mode + microsecond locks. The Azure Files NFS share — which used to host
 * the live DB and was the root of every perf and corruption issue — is
 * relegated to a backup target.
 *
 * Boot sequence:
 *   1. If no local DB exists yet, copy the latest snapshot from
 *      `MIZAN_DB_BACKUP_DIR` (the NFS mount) into place.
 *   2. Open the local DB. WAL mode for speed; safe because the storage is
 *      genuinely local.
 *   3. Schedule periodic `db.backup()` to the NFS share every 5 minutes
 *      (configurable via `MIZAN_DB_BACKUP_INTERVAL_MS`).
 *   4. Register a SIGTERM hook that takes one final backup before exit.
 *
 * Failure modes:
 *   - Pod hard-crashes (SIGKILL): up to N minutes of writes lost (default 5).
 *   - Pod soft-restarts (SIGTERM via revision swap, deploy, scale event):
 *     no data loss — the shutdown hook backs up before exit.
 *   - Backup write fails: logged, retried on next tick. The live DB is
 *     unaffected; only the backup target is degraded.
 *
 * Self-hosted Mac / Docker installs typically don't set
 * `MIZAN_DB_BACKUP_DIR` — the SQLite file already lives on durable local
 * disk and doesn't need a separate backup target. The backup loop short-
 * circuits in that case.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = config.dbPath;
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  // Restore from backup BEFORE opening — `new Database(path)` creates an
  // empty file at the path if it doesn't exist, which would defeat the
  // restore-when-missing check.
  restoreFromBackupIfNeeded(dbPath);

  const db = new Database(dbPath);

  if (isOnNetworkedFs(dbPath)) {
    // Defensive: this code path should never fire in v2.5.17+ deployments
    // (the SQLite file should be on local disk). Kept as a safety net for
    // misconfigurations — falls back to the v2.5.16 slow-but-safe pragmas.
    db.pragma("journal_mode = DELETE");
    db.pragma("synchronous = FULL");
    db.pragma("busy_timeout = 30000");
    console.warn(
      `[mizan/db] WARNING: SQLite file is on a networked filesystem (${dbPath}). ` +
        `Performance will be poor and concurrent writes may corrupt the database. ` +
        `Set SCSC_DB_PATH to a local-disk path and configure MIZAN_DB_BACKUP_DIR for persistence.`,
    );
  } else {
    // Local disk — WAL mode for fast concurrent reads + writes.
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
  }
  db.pragma("foreign_keys = ON");

  applyMigrations(db);
  seedDemoTenantsIfEmpty(db);

  _db = db;

  // Schedule backups AFTER migrations land so the very first backup
  // already includes the schema at the current version.
  startBackupLoop(db);

  return db;
}

type Migration = {
  version: number;
  name: string;
  run: (db: Database.Database) => void;
};

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    name: "add_is_demo_column",
    run: (db) => {
      const cols = db
        .prepare("PRAGMA table_info(tenants)")
        .all() as Array<{ name: string }>;
      if (!cols.find((c) => c.name === "is_demo")) {
        db.exec(
          "ALTER TABLE tenants ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0",
        );
      }
    },
  },
  {
    version: 3,
    name: "add_suspension_and_review_columns",
    run: (db) => {
      const cols = db
        .prepare("PRAGMA table_info(tenants)")
        .all() as Array<{ name: string }>;
      const has = (n: string) => cols.some((c) => c.name === n);
      if (!has("suspended_at")) {
        db.exec("ALTER TABLE tenants ADD COLUMN suspended_at TEXT");
      }
      if (!has("scheduled_review_at")) {
        db.exec("ALTER TABLE tenants ADD COLUMN scheduled_review_at TEXT");
      }
      if (!has("scheduled_review_note")) {
        db.exec("ALTER TABLE tenants ADD COLUMN scheduled_review_note TEXT");
      }
    },
  },
  {
    version: 4,
    name: "add_audit_log_queries_table",
    run: (db) => {
      db.exec(`CREATE TABLE IF NOT EXISTS audit_log_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        query_kind TEXT NOT NULL,            -- 'labelAdoption' etc.
        graph_query_id TEXT NOT NULL,         -- ID returned by /security/auditLog/queries
        status TEXT NOT NULL,                 -- notStarted|running|succeeded|failed
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        results_json TEXT,
        error_message TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_audit_queries_tenant_kind_submitted ON audit_log_queries(tenant_id, query_kind, submitted_at DESC)",
      );
    },
  },
  {
    version: 5,
    name: "add_users_and_sessions",
    run: (db) => {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        entra_oid TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
      db.exec(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)");
    },
  },
  {
    version: 6,
    name: "add_maturity_snapshots",
    run: (db) => {
      // One row per successful sync per tenant. Stores the six sub-scores +
      // overall index so Entity Detail can render a trend chart without
      // re-computing from the raw signal payloads on every request.
      // Retention matches signal_snapshots (see pruneOldMaturitySnapshots).
      db.exec(`CREATE TABLE IF NOT EXISTS maturity_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        captured_at TEXT NOT NULL DEFAULT (datetime('now')),
        overall REAL NOT NULL,
        secure_score REAL NOT NULL,
        identity REAL NOT NULL,
        device REAL NOT NULL,
        data REAL NOT NULL,
        threat REAL NOT NULL,
        compliance REAL NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_maturity_snapshots_tenant_captured ON maturity_snapshots(tenant_id, captured_at DESC)",
      );
    },
  },
  {
    version: 7,
    name: "add_directive_consent_mode",
    run: (db) => {
      // Per-entity consent mode. Only meaningful in directive-mode deployments
      // (DESC-style regulators); observation-mode deployments (SCSC-style)
      // never read or write this column — every entity is observation by
      // default. Value stays `observation` until an entity explicitly consents
      // to the Directive app, at which point it flips to `directive`.
      //
      // We use defensive PRAGMA checks because older demo DBs may already have
      // the column from manual fixups; `ALTER TABLE ADD COLUMN` throws on
      // duplicate.
      const cols = db.prepare("PRAGMA table_info(tenants)").all() as Array<{ name: string }>;
      const have = (c: string) => cols.some((col) => col.name === c);
      if (!have("consent_mode")) {
        db.exec(
          "ALTER TABLE tenants ADD COLUMN consent_mode TEXT NOT NULL DEFAULT 'observation'",
        );
      }
      if (!have("directive_app_consented_at")) {
        db.exec("ALTER TABLE tenants ADD COLUMN directive_app_consented_at TEXT");
      }
      if (!have("directive_app_consent_state")) {
        db.exec("ALTER TABLE tenants ADD COLUMN directive_app_consent_state TEXT");
      }
      if (!have("directive_app_consent_error")) {
        db.exec("ALTER TABLE tenants ADD COLUMN directive_app_consent_error TEXT");
      }

      // Audit trail for every mode change — upgrade, downgrade, or revocation.
      // Never deleted. Rolled into the tenant's history view in Settings later.
      db.exec(`CREATE TABLE IF NOT EXISTS consent_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        action TEXT NOT NULL,
        from_mode TEXT,
        to_mode TEXT,
        actor_user_id TEXT,
        note TEXT,
        at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_consent_history_tenant_at ON consent_history(tenant_id, at DESC)",
      );
    },
  },
  {
    version: 8,
    name: "add_directive_actions",
    run: (db) => {
      // Every directive write attempt is captured here. Never deleted. This
      // is the single source of truth for "what did the Center do, to whom,
      // when, and did it succeed." Powers /directive → Audit.
      //
      //   action_type   e.g. 'incident.classify', 'user.revoke_sessions'
      //   target_id     the Graph resource ID we targeted (incident id,
      //                 user id, etc.)
      //   status        'success' | 'failed' | 'simulated'
      //                 'simulated' is what demo/is_demo tenants get — the
      //                 UI surfaces this as a SIMULATED chip so nothing gets
      //                 confused with a real write.
      //   input_json    the parameters the Center user passed
      //   result_json   Graph response summary on success
      //   error_message truncated error string on failure
      //   actor_user_id the Mizan user who triggered the action
      db.exec(`CREATE TABLE IF NOT EXISTS directive_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('success','failed','simulated')),
        input_json TEXT,
        result_json TEXT,
        error_message TEXT,
        actor_user_id TEXT,
        at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_actions_tenant_at ON directive_actions(tenant_id, at DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_actions_at ON directive_actions(at DESC)",
      );
    },
  },
  {
    version: 9,
    name: "add_directive_push_requests",
    run: (db) => {
      // Phase 3 — baseline push requests. One row per push attempt; each
      // row fans out to N per-tenant rows in directive_push_actions. Never
      // deleted. Powers /directive → Baselines → push history + rollback.
      //
      //   status        preview -> executing -> complete | failed | rolledback
      //   target_tenant_ids_json  JSON array of tenant ids in scope for this push
      //   options_json            per-baseline parameters (e.g. admin email to exclude)
      //   summary_json            per-tenant outcome tally
      //   pushed_by_user_id       Mizan user who triggered the push
      db.exec(`CREATE TABLE IF NOT EXISTS directive_push_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        baseline_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('preview','executing','complete','failed','rolledback')),
        pushed_by_user_id TEXT,
        target_tenant_ids_json TEXT NOT NULL,
        options_json TEXT,
        summary_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        executed_at TEXT,
        rolledback_at TEXT
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_push_requests_created ON directive_push_requests(created_at DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_push_requests_baseline ON directive_push_requests(baseline_id, created_at DESC)",
      );

      // One row per tenant per push. The graph_policy_id is what powers
      // rollback — DELETE /identity/conditionalAccess/policies/{id} uses it.
      db.exec(`CREATE TABLE IF NOT EXISTS directive_push_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        push_request_id INTEGER NOT NULL,
        tenant_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success','failed','simulated','rolledback')),
        graph_policy_id TEXT,
        error_message TEXT,
        at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (push_request_id) REFERENCES directive_push_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_push_actions_request ON directive_push_actions(push_request_id)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_push_actions_tenant_at ON directive_push_actions(tenant_id, at DESC)",
      );
    },
  },
  {
    version: 10,
    name: "add_custom_ca_policies",
    run: (db) => {
      // Phase 4 — custom Conditional Access policy drafts authored through
      // the /directive/custom-policies wizard. One row per draft. spec_json
      // carries the UI-oriented spec (users/apps/conditions/grant/session)
      // which the server translates to a Graph CA body at preview + push
      // time. Pushes reuse directive_push_requests / directive_push_actions
      // — the baseline_id column stores "custom:<id>" for tracing.
      db.exec(`CREATE TABLE IF NOT EXISTS custom_ca_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_user_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        spec_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft','archived')) DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_custom_ca_policies_updated ON custom_ca_policies(updated_at DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_custom_ca_policies_status ON custom_ca_policies(status, updated_at DESC)",
      );
    },
  },
  {
    version: 11,
    name: "add_iocs_table",
    run: (db) => {
      // Phase 14b — operator-authored Threat Intelligence Indicators.
      // One row per IOC the operator submits. Each push fans the IOC out
      // to selected entities; the per-tenant write lives on the existing
      // directive_push_actions table (baseline_id stamped as "ioc:<id>"
      // on directive_push_requests). This top-level row lets the IOC
      // list view show what an operator authored without joining
      // through push_requests.
      db.exec(`CREATE TABLE IF NOT EXISTS directive_iocs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_user_id TEXT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        action TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        internal_note TEXT,
        expiration_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_iocs_created ON directive_iocs(created_at DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_directive_iocs_value ON directive_iocs(type, value)",
      );
    },
  },
  {
    version: 12,
    name: "add_compliance_out_of_scope",
    run: (db) => {
      // v2.4.0 — Out-of-Scope (OOS) markers for the active compliance
      // framework. Two tiers:
      //   * tenant_id = NULL   → GLOBAL OOS. The clause/control is treated
      //                          as not applicable across every entity
      //                          (e.g. covered by a 3rd-party product the
      //                          Center accepts). Clauses marked global
      //                          are subtracted from the denominator on
      //                          every tenant's framework-compliance %.
      //   * tenant_id = TEXT   → PER-ENTITY OOS. The clause is removed
      //                          from THIS entity's denominator only —
      //                          used when a specific entity has a
      //                          legitimate carve-out the Center has
      //                          accepted in writing.
      //
      // scope_kind is currently always 'clause' — per-control OOS is a
      // possible future expansion, hence the column rather than encoding
      // kind into scope_id. The UNIQUE constraint allows the same scope
      // to be marked at both global and per-tenant levels (different
      // tenant_id values), and prevents duplicate marks at the same level.
      //
      // Never auto-deleted; an "unmark" is a DELETE row, captured nowhere
      // beyond the marked_by/marked_at timestamps you see here. (We don't
      // need an audit ledger for this — push_requests + directive_actions
      // already carry the heavyweight audit trail; OOS marks are a config.)
      db.exec(`CREATE TABLE IF NOT EXISTS compliance_out_of_scope (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT,
        framework_id TEXT NOT NULL,
        scope_kind TEXT NOT NULL CHECK (scope_kind IN ('clause','control')),
        scope_id TEXT NOT NULL,
        reason TEXT,
        marked_by_user_id TEXT,
        marked_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
      // SQLite UNIQUE doesn't include NULLs the way you'd expect — two rows
      // with the same (NULL, fw, kind, id) are NOT considered duplicates.
      // That's actually what we want here: the global row uses NULL, and
      // the app-side helpers enforce single-row-per-key on the global tier.
      db.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_oos_tenant_unique ON compliance_out_of_scope(tenant_id, framework_id, scope_kind, scope_id) WHERE tenant_id IS NOT NULL",
      );
      db.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_oos_global_unique ON compliance_out_of_scope(framework_id, scope_kind, scope_id) WHERE tenant_id IS NULL",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_oos_tenant_fw ON compliance_out_of_scope(tenant_id, framework_id)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_oos_global_fw ON compliance_out_of_scope(framework_id) WHERE tenant_id IS NULL",
      );
    },
  },
  {
    version: 13,
    name: "add_consented_scope_hash",
    run: (db) => {
      // v2.5.24 — track which scope-set version each entity was last
      // consented under, so the dashboard can flag tenants that need to be
      // re-prompted to grant consent after a release adds new scopes (the
      // v2.5.22 `AdvancedQuery.Read.All` situation).
      //
      // NULL = unknown (existing tenant onboarded before this column
      // existed, or onboarded by a code path that hasn't been updated to
      // stamp the hash). Treated as "needs verification" — the next
      // successful Verify call backfills it.
      const cols = db
        .prepare("PRAGMA table_info(tenants)")
        .all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === "consented_scope_hash")) {
        db.exec("ALTER TABLE tenants ADD COLUMN consented_scope_hash TEXT");
      }
    },
  },
  {
    version: 14,
    name: "executive_mode_tables",
    run: (db) => {
      // v2.6.0 — Executive mode unlocks four new modules. Each gets one
      // table here. None of the tables touch existing rows; they're
      // additive and safe on Council deployments (which simply never
      // INSERT into them).

      // Risk register — board-grade risk list. Auto-source values:
      //   "auto-cve"           — auto-suggested from a critical CVE > 30d
      //   "auto-deactivation"  — admin deactivation in last 7d
      //   "auto-mfa-coverage"  — MFA coverage on admins < 100%
      //   "auto-maturity-drop" — Maturity Index dropped > 5 points week-on-week
      //   "auto-incident"      — high-severity incident open > 24h
      //   "manual"             — operator entered directly
      // suggestions land with status='suggested'; operator promotes to
      // status='open' (CISO accepted) or 'dismissed' (30-day cooldown).
      db.exec(`CREATE TABLE IF NOT EXISTS risk_register (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
        likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
        residual_rating INTEGER NOT NULL CHECK (residual_rating BETWEEN 1 AND 25),
        owner TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open'
          CHECK (status IN ('suggested','open','mitigated','accepted','dismissed')),
        mitigation_notes TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        related_signal TEXT,
        suggested_at TEXT,
        accepted_at TEXT,
        dismissed_at TEXT,
        cooldown_until TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_risk_register_status ON risk_register(status, residual_rating DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_risk_register_source ON risk_register(source, status)",
      );

      // CISO scorecard — pinned KPIs. The catalog of 10 KPI kinds lives
      // in code (lib/scorecard/catalog.ts); this table just stores
      // which ones the operator has pinned + their target / commitment.
      db.exec(`CREATE TABLE IF NOT EXISTS ciso_scorecard_pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kpi_kind TEXT NOT NULL,
        label TEXT NOT NULL,
        target REAL NOT NULL,
        commitment TEXT,
        due_date TEXT,
        owner TEXT,
        pinned_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(kpi_kind)
      )`);

      // Cyber insurance — answers to questionnaire questions. The
      // questionnaire template (aviation, ~30 questions) is JSON in
      // lib/config/insurance-questionnaires/aviation.ts; this table
      // just stores the operator's answers + auto-captured signal
      // evidence at answer time.
      db.exec(`CREATE TABLE IF NOT EXISTS insurance_answers (
        question_id TEXT PRIMARY KEY,
        value TEXT NOT NULL CHECK (value IN ('yes','no','na')),
        evidence TEXT,
        signal_snapshot TEXT,
        answered_at TEXT NOT NULL DEFAULT (datetime('now')),
        answered_by TEXT
      )`);

      // Board report drafts — auto-generated weekly + on-demand.
      // pdf_blob is a BLOB so the report can be re-downloaded after
      // the source data changes; we don't regenerate from scratch
      // when an operator clicks Download on an old draft.
      db.exec(`CREATE TABLE IF NOT EXISTS board_report_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','signed','superseded')),
        signed_by TEXT,
        signed_at TEXT,
        planned_actions TEXT,
        pdf_blob BLOB
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_board_drafts_period ON board_report_drafts(period DESC, generated_at DESC)",
      );
    },
  },
  {
    version: 15,
    name: "risk_treatment_plans_and_kpi_formulas",
    run: (db) => {
      // v2.7.0 — two new additive tables on top of the v14 Executive
      // surface. Both are operator-managed; Council deployments
      // simply never INSERT into them.

      // Risk treatment plans — per-risk steps with owner / due / status.
      // v2.6.0 risk_register stored only a free-text `mitigation_notes`
      // column; that's not enough for accountability tracking on
      // multi-step mitigations. Each risk now owns 0..N treatment_steps.
      db.exec(`CREATE TABLE IF NOT EXISTS risk_treatment_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        risk_id INTEGER NOT NULL,
        step_text TEXT NOT NULL,
        owner TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open'
          CHECK (status IN ('open','in_progress','done','blocked')),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (risk_id) REFERENCES risk_register(id) ON DELETE CASCADE
      )`);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_treatment_steps_risk ON risk_treatment_steps(risk_id, sort_order)",
      );

      // Custom CISO scorecard KPI formulas — the v2.6.0 catalog is
      // 10 hard-coded KPIs. v2.7.0 lets operators define their own
      // beyond the catalog. Each row is a custom KPI: a label, a
      // unit, a higher/lower-better direction, a target, and a
      // formula expressed as a small JSON spec the eval engine
      // understands (see lib/scorecard/custom-formula.ts). Pinned
      // alongside built-ins on the scorecard page.
      db.exec(`CREATE TABLE IF NOT EXISTS custom_kpi_formulas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kpi_kind TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        unit TEXT NOT NULL CHECK (unit IN ('percent','count','hours','boolean')),
        direction TEXT NOT NULL CHECK (direction IN ('higherBetter','lowerBetter')),
        target REAL NOT NULL,
        formula_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
    },
  },
];

function applyMigrations(db: Database.Database): void {
  // Base schema — idempotent `CREATE TABLE IF NOT EXISTS` for every table.
  const schemaPath = path.resolve(process.cwd(), "lib/db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  db.exec(sql);

  const current = (
    db
      .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations")
      .get() as { v: number }
  ).v;

  // v1 == base schema applied.
  if (current < 1) {
    db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(1);
  }

  // Delta migrations — run in order if not yet applied.
  const marker = db.prepare(
    "INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)",
  );
  for (const m of MIGRATIONS) {
    const applied = (
      db
        .prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE version = ?")
        .get(m.version) as { n: number }
    ).n;
    if (applied === 0) {
      m.run(db);
      marker.run(m.version);
    }
  }
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
