# scsc-posture-dashboard (web)

Next.js 16 app that renders the Sharjah Cybersecurity Council posture dashboard and pulls live Microsoft Graph signals from consented government-entity tenants.

## Stack
- Next.js 16 (App Router, Turbopack)
- Tailwind v4 (design tokens in [`app/globals.css`](app/globals.css))
- Recharts (KPI + cluster charts)
- Radix UI primitives + lucide-react + i18n context (EN/AR with full RTL)
- **Phase 2:** better-sqlite3 (tenant + signal registry), @azure/msal-node (per-tenant app-only tokens), native `fetch` against Microsoft Graph

## Routes

### Pages
| Path | What |
|---|---|
| `/` → `/maturity` | Redirect |
| `/maturity` | Council KPI hero + cluster bar chart (real data when tenants are consented; empty state otherwise) |
| `/entities` | Ranked list of all connected entities (`?cluster=…` filter) |
| `/entities/[id]` | Per-entity drill-down with Sync Now + sub-tabs |
| `/settings` | Onboard form + tenants table + per-row sync/delete + consent-callback banner |
| `/identity`, `/threats`, `/data`, `/devices`, `/governance` | Stub placeholders with target Graph endpoints (Phase 3) |

### API
| Path | What |
|---|---|
| `GET /api/signals/kpi` | Council-level aggregate (maturity index, target, below-target count, cluster rollups) |
| `GET /api/signals/entities` | Entity list with latest computed maturity per row |
| `POST /api/tenants` | Onboard a new tenant (returns consent URL) |
| `GET /api/tenants` | List tenants |
| `GET /api/tenants/{id}` | Tenant detail + snapshots + endpoint health + maturity breakdown |
| `DELETE /api/tenants/{id}` | Remove a tenant |
| `POST /api/tenants/{id}/sync` | Run signal sync for one tenant |
| `POST /api/sync` | Run sync for all consented tenants (optionally protected by `SCSC_SYNC_SECRET`) |
| `GET /api/auth/consent-callback` | Admin-consent redirect target |

## Configuration

All deployment-specific values live in `.env.local` — never committed. Copy [`.env.example`](.env.example) and fill in. See [`docs/08-phase2-setup.md`](../docs/08-phase2-setup.md) for the full Entra app registration guide.

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
```

## Scripts

```bash
npm install            # from a fresh clone
npm run dev            # dev server, default port 3000
npm run build          # production build
npm run start          # production server; respects PORT + HOSTNAME
```

For production you should always use `npm run build && npm run start -- -H 0.0.0.0 -p 8787` (or similar) behind a reverse proxy.

## Data model

SQLite at `${DATA_DIR}/scsc.sqlite`. Schema in [`lib/db/schema.sql`](lib/db/schema.sql). Tables:
- `tenants` — one row per onboarded entity (EN + AR names, tenant GUID, cluster, consent status, last sync).
- `signal_snapshots` — append-only history of per-signal fetches (secureScore / conditionalAccess / riskyUsers / devices / incidents), keyed by `(tenant, signal_type, fetched_at)`.
- `endpoint_health` — per-tenant per-endpoint telemetry (last success, throttle count, error message) for the Connection Health view.

Migrations are schema-file-based and idempotent; the DB file is created on first call.

## Running in Docker

```bash
docker build -t scsc-posture-dashboard .
docker run -p 8787:8787 \
  -e APP_BASE_URL=https://your.host \
  -e AZURE_CLIENT_ID=... \
  -e AZURE_CLIENT_SECRET=... \
  -v scsc_data:/data \
  scsc-posture-dashboard
```

Or with docker-compose (`docker-compose.yml` shipped). In production (Azure App Service / Container Apps), swap the volume for Azure Files and put Front Door or App Gateway in front.

## Demo deployment (ZaatarLabs Mac)

> **Dev-only.** Production deployment targets Azure in the Council's tenant — see [`docs/08-phase2-setup.md`](../docs/08-phase2-setup.md) §6.

The dashboard is served at **https://scscdemo.zaatarlabs.com** via two LaunchAgents:

- `~/Library/LaunchAgents/com.zaatarlabs.tunnel-dev.plist` — runs the pre-existing `zaatarlabs-dev` cloudflared tunnel with `scscdemo.zaatarlabs.com → http://127.0.0.1:8787` routing (see `~/.cloudflared/dev-dashboard.yml`).
- `~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist` — runs `next start -H 127.0.0.1 -p 8787` with `RunAtLoad` + `KeepAlive`.

Reloading after a code change:
```bash
npm run build
launchctl unload ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist
launchctl load   ~/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist
```

Logs: `~/Library/Logs/scscdemo.{out,err}.log` · `~/Library/Logs/tunnel-dev.{out,err}.log`.

Cloudflare Zero Trust Access must be wired in front of the demo URL — it's publicly resolvable otherwise.

## Localization rules

- **Translates** (EN/AR): all content — page titles, descriptions, column headers, KPI labels, buttons, status words, time strings, numeric formatting (Arabic-Indic digits in AR).
- **Stays English even in AR:** Microsoft product names (Secure Score, Defender, Purview, Entra ID, Intune, Compliance Mgr.), Graph endpoint paths shown in the signals panel, nav icon codes.
- Full RTL via `dir` on `<html>`, logical CSS (`start/end`), Noto Kufi Arabic webfont.

## Phase 2 — what's wired, what's next

Wired:
- Real Graph calls with MSAL client-credentials flow, per-tenant token cache, `Retry-After`-aware backoff.
- 5 signal fetchers (Secure Score, CA policies, risky users, devices, incidents).
- Maturity Index computed from real signals with documented weights (see [`lib/compute/maturity.ts`](lib/compute/maturity.ts)).
- End-to-end onboarding: form submit → consent URL → admin consent → auto initial sync → data appears.

Deferred to Phase 3:
- Purview signals (DLP alerts, Insider Risk, retention labels).
- Advanced Hunting KQL packs.
- Council-staff named auth (MSAL login) — currently trusting Cloudflare Access.
- Historical deltas for 7D / 30D / QTD / YTD comparisons (snapshots are stored; aggregation pending).
- PowerShell automation tier for policy CRUD.
