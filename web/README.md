# Mizan — web

Next.js 16 app that renders the Mizan posture dashboard and pulls live Microsoft Graph signals from consented entity tenants.

> Mizan is a federated security-posture platform white-labeled per customer. The Sharjah Cybersecurity Council was the first customer; the codebase has since been generalized so any organization (regulator, holding company, ministry) can deploy it under their own brand. Branding, framework selection, and deployment mode are config-driven — see [`../README.md`](../README.md) for the product overview.

## Stack
- Next.js 16 (App Router, Turbopack)
- Tailwind v4 (design tokens in [`app/globals.css`](app/globals.css))
- Recharts (KPI + entity charts)
- Radix UI primitives + lucide-react + i18n context (EN/AR with full RTL)
- better-sqlite3 (tenant + signal registry), @azure/msal-node (per-tenant app-only tokens), native `fetch` against Microsoft Graph

## Routes

### Pages
| Path | What |
|---|---|
| `/` → `/maturity` | Redirect |
| `/maturity` | Council KPI hero + entity bar chart + biggest movers + dragging controls |
| `/entities` | Ranked list of all consented entities (`?cluster=…` filter, search, sort, CSV export) |
| `/entities/[id]` | Per-entity drill-down with sync now + 11 sub-tabs (overview, controls, incidents, identity, data, devices, governance, framework, vulnerabilities, attack simulation, connection) |
| `/identity`, `/threats`, `/data`, `/devices`, `/governance`, `/vulnerabilities` | Cross-entity rollups |
| `/directive` | (directive-mode only) baseline push planning + audit + IOC console + per-framework gap analysis |
| `/settings` | Branding, app registration, framework mapping, users, audit log, documentation downloads |
| `/setup` | First-run wizard for branding, deployment mode, app registrations, bootstrap admin |
| `/login` | Entra OIDC sign-in |

### API (selection)
| Path | What |
|---|---|
| `GET /api/signals/kpi` | Council-level aggregate (maturity index, target, below-target, framework compliance rollup) |
| `GET /api/signals/entities` | Entity list with latest computed maturity per row |
| `POST /api/tenants` | Onboard a new tenant (returns consent URL) |
| `GET /api/tenants/{id}` | Tenant detail + signals + endpoint health + maturity + framework breakdown |
| `POST /api/tenants/{id}/sync` | Run signal sync for one tenant |
| `POST /api/sync` | Run sync for all consented tenants (optionally protected by `SCSC_SYNC_SECRET`) |
| `GET /api/auth/me` | Current user, deployment mode, framework id, demo flag |
| `GET\|POST\|DELETE /api/config/compliance-oos` | Out-of-Scope marks (global + per-entity) |
| `GET /api/directive/compliance-gap` | Per-clause coverage rollup with baseline push suggestions |

## Configuration

All deployment-specific values live in `.env.local` — never committed. Copy [`.env.example`](.env.example) and fill in. See [`../docs/08-phase2-setup.md`](../docs/08-phase2-setup.md) for the full Entra app registration guide (with separate read-vs-write permission tables for observation vs directive deployments).

Minimum for real Graph calls:
```env
APP_BASE_URL=https://<your-host>
AZURE_CLIENT_ID=<app id>
AZURE_CLIENT_SECRET=<client secret>
```

Optional:
```env
AZURE_AUTHORITY_HOST=https://login.microsoftonline.com
DATA_DIR=./data                # SQLite lives here; mount as volume in prod
SCSC_SYNC_SECRET=              # bearer token required on POST /api/sync
SCSC_SEED_DEMO=false           # opt-in demo seed (12 sample entities + signals)
SCSC_SYNC_CONCURRENCY=5        # parallel tenant workers (clamped 1–20)
SCSC_RETENTION_DAYS=90         # snapshot retention window
MIZAN_DEPLOYMENT_MODE=observation  # or "directive" — locked at first install
MIZAN_DEMO_MODE=false          # auth bypass for showcase deployments
```

> The `SCSC_*` prefix is historical — kept for backward compatibility with existing deployments. New env vars use `MIZAN_*`.

## Scripts

```bash
npm install            # from a fresh clone
npm run dev            # dev server, default port 3000
npm run build          # production build
npm run start          # production server; respects PORT + HOSTNAME
```

For production: `npm run build && npm run start -- -H 0.0.0.0 -p 8787` (or similar) behind a reverse proxy.

## Data model

SQLite at `${DATA_DIR}/mizan.sqlite` (override via `SCSC_DB_PATH`). Schema in [`lib/db/schema.sql`](lib/db/schema.sql) plus 12 migrations in [`lib/db/client.ts`](lib/db/client.ts). Tables:
- `tenants` — one row per onboarded entity (EN + AR names, tenant GUID, cluster, consent status, consent mode, last sync, suspension state).
- `signal_snapshots` — append-only history of per-signal fetches (18 signal types), keyed by `(tenant, signal_type, fetched_at)`.
- `endpoint_health` — per-tenant per-endpoint telemetry (last success, throttle count, error message) for the Connection Health view.
- `maturity_snapshots` — per-tenant daily Maturity Index snapshots driving 30/90/180-day trend chart.
- `audit_log_queries` — async Graph audit-log query state (label adoption telemetry).
- `users`, `sessions` — Mizan-native RBAC.
- `consent_history`, `directive_actions`, `directive_push_requests`, `directive_push_actions`, `custom_ca_policies`, `directive_iocs` — directive-mode write surface audit + state.
- `compliance_out_of_scope` — global + per-entity OOS marks (v2.4.0+).
- `app_config` — branding, framework mappings, maturity weights, PDF templates, etc.

Migrations are schema-file + version-array based and idempotent; the DB file is created on first call.

## Running in Docker

```bash
docker build -t mizan .
docker run -p 8787:8787 \
  -e APP_BASE_URL=https://your.host \
  -e AZURE_CLIENT_ID=... \
  -e AZURE_CLIENT_SECRET=... \
  -v mizan_data:/data \
  mizan
```

Or with docker-compose (`docker-compose.yml` shipped). In production (Azure App Service / Container Apps), swap the volume for Azure Files and put Front Door or App Gateway in front.

## Reference demos

The maintainer runs two reference deployments on a Mac Mini behind Cloudflare tunnels — the SCSC observation-mode demo (UAE NESA framework) and the DESC directive-mode demo (Dubai ISR framework). Restart script: [`deploy/restart-demos.sh`](deploy/restart-demos.sh). These are dev-only; production deployments target Azure in the customer's tenant.

## Localization rules

- **Translates** (EN/AR): all content — page titles, descriptions, column headers, KPI labels, buttons, status words, time strings, numeric formatting (Arabic-Indic digits in AR).
- **Stays English even in AR:** Microsoft product names (Secure Score, Defender, Purview, Entra ID, Intune, Compliance Mgr.), Graph endpoint paths shown in the signals panel, nav icon codes.
- Full RTL via `dir` on `<html>`, logical CSS (`start/end`), Noto Kufi Arabic webfont.

## Mobile shell (v2.5.0+)

Middleware ([`middleware.ts`](middleware.ts)) classifies device class on every request and writes a `mizan-device` cookie. The dashboard layout reads it server-side and renders [`<DesktopShell>`](components/chrome/DesktopShell.tsx) for desktop + tablet, or [`<MobileShell>`](components/chrome/MobileShell.tsx) for mobile. Page bodies are shared. Override via `?device=desktop|mobile|tablet`. Full architecture: [`../docs/14-responsive-and-mobile.md`](../docs/14-responsive-and-mobile.md).
