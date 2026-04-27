import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "@/lib/config";
import { seedDemoTenantsIfEmpty } from "./seed";

let _db: Database.Database | null = null;

/**
 * Detect whether the directory containing the SQLite file is on a networked
 * filesystem (NFS / SMB / CIFS). Returns `false` if detection fails for any
 * reason — the safer fallback assumes local disk.
 *
 * Why this matters: SQLite's WAL journal mode uses `mmap`'d shared memory
 * (`*.sqlite-shm`) which is documented incompatible with networked
 * filesystems by the SQLite project itself. When two processes (e.g. two ACA
 * pods during a revision swap) both have the file open over NFS, their
 * shared-memory views diverge and writes corrupt the database
 * (`SQLITE_IOERR_SHORT_READ` → `SQLITE_NOTADB`). DELETE mode (the SQLite
 * default — per-write rollback journal, no shared memory) works correctly
 * on networked FS at the cost of slightly slower writes. For Mizan's write
 * volume (a few writes per sync cycle, single-replica deployment) the
 * performance delta is invisible.
 *
 * Detection reads `/proc/mounts` and finds the longest mount-point prefix
 * that contains the DB directory, then checks if the filesystem type starts
 * with `nfs`, `cifs`, or `smb`. ACA's `nfsAzureFile` storage type mounts as
 * `nfs4` — caught by the prefix match. Mac/Windows hosts (`darwin`/`win32`)
 * never have `/proc/mounts` and short-circuit to `false`.
 *
 * Operators on exotic setups can force the safe mode via
 * `MIZAN_DB_NETWORK_FS=true` env var.
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
      // Mount must be a path-prefix of our target directory. Avoid spurious
      // matches like /data2 matching /data — require an exact-or-followed-by-/
      // boundary.
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
 * Singleton SQLite connection. Lazy — created on first call, migrations applied, demo data
 * seeded if DB is empty.
 *
 * Journal mode is auto-tuned based on storage type:
 *   - **Local disk** (Mac, Docker w/ local volume): WAL mode for speed.
 *   - **Networked FS** (ACA's NFS Azure Files mount): DELETE mode for safety.
 *
 * v2.5.16 fix: prior versions hard-coded WAL, which corrupted the database
 * on ACA deployments whenever two pods briefly co-existed during a revision
 * swap (rolling-update overlap window). DELETE mode + `synchronous = FULL`
 * + `busy_timeout = 30000` makes concurrent access safe — the second
 * writer blocks on the lock instead of corrupting via shared-memory drift.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = config.dbPath;
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);

  if (isOnNetworkedFs(dbPath)) {
    // Networked FS — must NOT use WAL. Rollback journal is the only safe
    // mode. FULL synchronous gives the strongest durability guarantee at
    // the cost of one extra fsync per write — acceptable on Mizan's write
    // volume. busy_timeout makes concurrent writers wait for the lock
    // instead of erroring with SQLITE_BUSY.
    db.pragma("journal_mode = DELETE");
    db.pragma("synchronous = FULL");
    db.pragma("busy_timeout = 30000");
  } else {
    // Local disk — WAL is faster and safe.
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
  }
  db.pragma("foreign_keys = ON");

  applyMigrations(db);
  seedDemoTenantsIfEmpty(db);

  _db = db;
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
