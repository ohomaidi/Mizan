-- Sharjah Council Posture Dashboard — SQLite schema
-- Versioned via schema_migrations. Never drop columns in place; add + migrate.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tenants = entities the Council monitors. One row per onboarded entity.
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,                       -- slug (e.g. shj-police-ghq), stable
  tenant_id TEXT NOT NULL UNIQUE,            -- Entra tenant GUID
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  cluster TEXT NOT NULL,                     -- police|health|edu|municipality|utilities|transport|other
  domain TEXT NOT NULL,
  ciso TEXT NOT NULL DEFAULT '',
  ciso_email TEXT NOT NULL DEFAULT '',
  consent_status TEXT NOT NULL DEFAULT 'pending',  -- pending|consented|revoked|failed
  consented_at TEXT,
  consent_state TEXT,                        -- opaque state echoed back from consent redirect
  last_sync_at TEXT,
  last_sync_ok INTEGER NOT NULL DEFAULT 0,   -- 0 = unknown/failed, 1 = last sync succeeded
  last_sync_error TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,        -- 1 = stub/demo tenant, skipped by sync
  suspended_at TEXT,                         -- if set, sync skips this tenant until resumed
  scheduled_review_at TEXT,                  -- ISO date for next posture review; informational
  scheduled_review_note TEXT,                -- freeform note paired with scheduled_review_at
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_cluster ON tenants(cluster);
CREATE INDEX IF NOT EXISTS idx_tenants_consent ON tenants(consent_status);

-- Signal snapshots: one row per (tenant × signal_type × fetched_at).
-- We keep a short history so we can compute deltas + audit.
CREATE TABLE IF NOT EXISTS signal_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,                   -- FK to tenants.id (our slug, not Entra GUID)
  signal_type TEXT NOT NULL,                 -- secureScore|conditionalAccess|riskyUsers|devices|incidents
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL,                       -- 1 = fetch succeeded, 0 = failed
  http_status INTEGER,
  error_message TEXT,
  payload TEXT,                              -- JSON: summarized fields ready for UI
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_tenant_type_fetched
  ON signal_snapshots(tenant_id, signal_type, fetched_at DESC);

-- Council-editable configuration. Keyed store; value is JSON.
-- Keys in use:
--   maturity       — { weights: {...}, target: number }
--   pdf.onboarding — full onboarding-letter template payload
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Async Graph queries (audit log queries, etc.) that take multiple minutes to complete.
-- Submitted in one sync cycle, polled and stored in a later one. Each row is a pending
-- or completed query for a specific tenant + query_kind pair.
CREATE TABLE IF NOT EXISTS audit_log_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  query_kind TEXT NOT NULL,
  graph_query_id TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  results_json TEXT,
  error_message TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_queries_tenant_kind_submitted
  ON audit_log_queries(tenant_id, query_kind, submitted_at DESC);

-- Operator dashboard users + sessions, keyed on the Entra OID. `role` is the
-- application RBAC role (admin|analyst|viewer). Auto-provisioned on first
-- successful login if auth is configured; see lib/auth/session.ts.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                       -- uuid
  entra_oid TEXT NOT NULL UNIQUE,            -- Entra object ID (stable across tenants)
  tenant_id TEXT NOT NULL,                   -- the operator's Entra tenant GUID
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',       -- admin|analyst|viewer
  is_active INTEGER NOT NULL DEFAULT 1,      -- 0 = disabled, 1 = active
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                       -- opaque token, stored in cookie
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,                  -- absolute expiry; enforced server-side
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Per-call health audit: last call + 24h counts + 429s for the Connection Health view.
CREATE TABLE IF NOT EXISTS endpoint_health (
  tenant_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,                    -- e.g. /security/secureScores
  last_success_at TEXT,
  last_error_at TEXT,
  last_error_message TEXT,
  call_count_24h INTEGER NOT NULL DEFAULT 0,
  throttle_count_24h INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, endpoint),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
