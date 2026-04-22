import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "@/lib/config";
import { seedDemoTenantsIfEmpty } from "./seed";

let _db: Database.Database | null = null;

/**
 * Singleton SQLite connection. Lazy — created on first call, migrations applied, demo data
 * seeded if DB is empty.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = config.dbPath;
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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
