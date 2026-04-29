# Mizan Executive Mode — roadmap

**Decision date:** 2026-04-29
**Triggering customer:** Dubai Airports (da.zaatarlabs.com demo)
**Status:** v2.6.0 in flight

This document is the canonical scope + deferred-work registry for the
Executive variant of Mizan. Anything dropped from v2.6.0 lands here so
no item gets lost between releases.

## Architecture decision

**One repo, one Docker image, one version line.** A new `deploymentKind`
flag (`council` | `executive`) selectable at first-run `/setup` decides
which chrome the same image renders. The flag is locked after first
write — same semantics as the existing `deploymentMode`.

Why not fork the repo:

- Engine is shared (Microsoft Graph signals, MTP advanced hunting, CA
  baselines, framework registry, directive engine, audit-driven
  notifications). Forking = fixing every Microsoft change twice.
- The split is positioning + chrome, not engine. Single-tenant is just
  N=1 of the multi-tenant data model.
- Distribution can still feel like two products: separate marketing
  pages, separate installers, separate SKUs — all built from the same
  image with `MIZAN_DEPLOYMENT_KIND` baked at install time.

When to actually fork: if Executive ever grows a meaningfully different
backend (hosted SaaS, third-party data ingestion). Not yet — defer
until the divergence is real.

## Two independent dimensions

| | Council | Executive |
|---|---|---|
| Observation | Regulator watching N entities, read-only (SCSC) | Single-org CISO dashboard, read-only |
| Directive | Regulator + push policies (DESC) | Single-org CISO dashboard + push to self |

Dubai Airports demo = `executive + directive`.

## v2.6.0 scope (this release — non-stop ship)

### A. Chrome split

- New `deploymentKind` config (`lib/config/deployment-kind.ts`,
  mirrors `deployment-mode.ts`).
  - Stored in `app_config.deployment.kind`.
  - Env fallback: `MIZAN_DEPLOYMENT_KIND` (used by Mac Mini demos to
    boot straight into a kind without running the wizard).
  - Default: `council` (preserves backward compat for every existing
    deployment).
  - Locked after first write.
- `/api/whoami` returns `deploymentKind`. Frontend reads it to branch.
- Setup wizard inserts a new step "Who is this dashboard for?":
  - **Regulator / oversight body** — "I oversee multiple Microsoft
    tenants. Mizan ranks and audits each one."
  - **Single organization** — "I manage one Microsoft tenant — my
    own. Mizan is my CISO dashboard."

### B. Conditional UI in Executive mode

| Surface | Council behavior | Executive behavior |
|---|---|---|
| Sidebar — "Entities" link | Visible | **Hidden** |
| Sidebar — "Maturity" | Label "Maturity overview" | Label "**Posture overview**" |
| Sidebar — "Governance" | Label "Governance" | Label "**Compliance**" |
| Sidebar order | current | **Posture overview · Identity · Devices · Data · Threats · Compliance · Vulnerabilities · Directive · ── Risk management ── Risk register · Cyber insurance readiness · ── Reports ── Board report · ── Bottom ── Settings · FAQ** |
| `/` (root redirect) | → `/maturity` | → entity dashboard for the single tenant |
| `/maturity` cluster radar | Cluster polygons + dashed target | **Single-entity radar with historical-self overlay** (this quarter vs last quarter) |
| `/maturity` "movers" panel | Top 5 movers | **Hide** — replace with own trend over 90/180 days (already exists) |
| `/maturity` cluster bar chart | All entities ranked | **Hide** (N=1) |
| `/governance` "By entity" rollup | Per-entity table | **Hide** |
| `/vulnerabilities` cross-tenant correlation card | Top 50 CVEs across entities | **Replace with patching velocity over time** |
| `/settings` Onboarded entities + wizard | Visible | **Hidden** |
| Notification bell | Federation feed | Single-tenant feed (same code, fewer items) |
| Demo banner / "Demo entity" toggle | Visible per existing rules | Same |

### C. New chart components

- `components/charts/HistoricalRadar.tsx` — six axes, polygons for
  this quarter vs last vs two-quarters-ago. Reads
  `maturity_snapshots` history (already in schema, migration v9).
- `components/charts/PatchingVelocityChart.tsx` — line chart, weekly
  buckets, computed from `vulnerabilities` snapshots over time. CVEs
  added vs remediated.

### D. Risk register module

- New table `risk_register` (migration v14):
  - id, title, description, impact (1-5), likelihood (1-5),
    residualRating (auto-computed), owner, dueDate, status
    (open/mitigated/accepted), mitigationNotes, source
    (manual/auto-cve/auto-deactivation), relatedSignal (free-text
    pointer), createdAt, updatedAt.
- API: `GET/POST/PUT/DELETE /api/risk-register` + `/[id]`.
- UI page `/risk-register` (Executive mode only):
  - Table with severity heat (color by residualRating).
  - "+ New risk" modal.
  - Per-row Edit / Delete.
  - "Auto-suggested" panel at top with suggestions Mizan generated
    from posture signals — accept (moves to register) or dismiss
    (30-day cooldown).
- **Auto-suggest rules (v2.6.0 hardcoded; v2.6.x slider in Settings):**
  1. Critical CVE > 30 days unpatched on > 1 device.
  2. Admin deactivation event in last 7 days.
  3. MFA coverage on admins drops below 100%.
  4. Maturity Index drops > 5 points week-over-week.
  5. Active high-severity incident open > 24h.
- **Setting:** "Auto-promote suggestions to register" toggle (default
  off — start with suggest-only, operator opts into full automation).

### E. CISO scorecard module

- New table `ciso_scorecard_pins` (migration v14 same as register):
  - id, kpiKind, label, target, commitment (board-promise text),
    dueDate, owner, currentValue (computed), status
    (onTrack/atRisk/met/missed), createdAt, updatedAt.
- 10 pinnable KPIs from a catalog:
  1. Maturity Index ≥ target
  2. Framework compliance ≥ X%
  3. MFA coverage on admins = 100%
  4. Critical CVEs > 30 days = 0
  5. Privileged role count ≤ Microsoft baseline
  6. Incident MTTR ≤ X hours
  7. Device compliance ≥ 90%
  8. High-risk users = 0
  9. Audit findings closed within SLA = 100%
  10. Quarterly board-report delivered: yes/no
- API: `GET/POST/DELETE /api/scorecard/pins`.
- UI: Surfaces on the home page (top of `/` in Executive mode).
- **Custom user-defined KPI formulas: deferred to v2.7.**

### F. Cyber insurance readiness module

- Aviation-specific questionnaire template, ~30 questions, JSON
  catalog at `lib/config/insurance-questionnaires/aviation.ts`.
  References IATA Cybersecurity Toolkit + ICAO Doc 8973 + FAA
  AC 119-1A.
- Question shape:
  ```ts
  {
    id, category, question,
    autoFromSignal?: SignalAutoMapper,  // links to a Mizan computation
    requiresEvidence: boolean,           // free-text justification
    requiresUpload?: boolean,            // file attachment (deferred)
  }
  ```
- New table `insurance_answers` (migration v14):
  - questionId, value (yes/no/na), evidence (text), answeredAt,
    answeredBy, signalSnapshot (auto-captured at answer time).
- API: `GET/POST /api/insurance/answers`.
- UI: page `/insurance` (Executive mode only). Renders questionnaire
  with auto-answered questions pre-populated (with the signal evidence
  shown inline) and manual questions as a checklist with notes.
- **Demo data ships with ~80% answered + 6 deliberate gaps to demo
  the "you have work to do" UX.**
- **Other industry templates (finance / healthcare / generic
  enterprise) deferred to v2.7.**
- **File-upload evidence per question deferred to v2.7.**

### G. Board PDF report

- On-demand generation: button on home page in Executive mode →
  "Generate this quarter's board report" → PDF download.
- Auto-drafted weekly into a "Drafts" folder; CISO reviews + signs
  off + downloads. Implemented as a new launchd timer (Mac demos)
  + a cron-equivalent endpoint hit by the existing /api/sync
  scheduler infrastructure.
- Sections (in order):
  1. Cover page with org branding (Dubai Airports logo + tagline +
     report period).
  2. Executive summary — Maturity Index trend, framework alignment %,
     top 5 unresolved risks (from Risk register).
  3. Posture trend — radar chart embedded as PNG, this quarter vs
     last quarter.
  4. Key incidents handled — table from incidents signal.
  5. Top 5 unresolved CVEs — from Vulnerabilities signal.
  6. CISO scorecard status — current vs target for each pinned KPI.
  7. Risk register summary — open / mitigated / accepted counts +
     top 5 by residual rating.
  8. Insurance readiness summary — % answered + open gaps.
  9. Planned actions — manual free-text section the CISO fills in
     pre-export.
- New table `board_report_drafts` (migration v14):
  - id, generatedAt, period (quarter), status (draft/signed),
    signedBy, signedAt, plannedActionsText, pdfBlob (or path).

### H. Dubai Airports branding + da.zaatarlabs.com demo

- Logo: `~/Desktop/dubaiairports-dxb-logo.png` → copy into
  `web/public/branding/dubaiairports.png`. Reference in branding
  config under a new pre-built brand `dubaiairports`.
- Color theme: navy (#1E2761) + yellow (#F8C022) — extracted from
  the DXB logo. Wire into the CSS-variable theme so cards / accents
  pick it up.
- New Mac Mini demo `dademo`:
  | | Value |
  |---|---|
  | Port | **8789** |
  | LaunchAgent | `com.zaatarlabs.dademo.plist` |
  | `MIZAN_DEPLOYMENT_MODE` | `directive` |
  | `MIZAN_DEPLOYMENT_KIND` | `executive` |
  | `DATA_DIR` | `~/da-data/dademo` |
  | Hostname | `da.zaatarlabs.com` (Cloudflare tunnel — user wires manually) |
- `web/deploy/restart-demos.sh` extended to handle the third demo.
- New seed in `lib/db/seed.ts` for the Dubai Airports executive
  fixture:
  - Single tenant "Dubai Airports", domain `dubaiairports.ae`,
    pre-consented (demo flag).
  - Posture: Maturity Index ~74, Dubai ISR alignment ~68%.
  - Risk register: 10 entries spanning operational / vendor / insider
    / regulatory / IT categories.
  - Vendor list: 10 plausible airport vendors (SITA, Amadeus, Sabre,
    OEM ground handling, IT MSP, payment processor, sensor providers,
    ANSP integration, baggage system OEM, security scanner vendor).
  - **Note:** vendor-risk MODULE was dropped from v2.6 (see Out of
    scope below). The vendor names will appear inside risk register
    entries instead, not as a standalone register.
  - CISO Scorecard: 5 pinned KPIs out of the 10 catalog.
  - Insurance questionnaire: ~80% answered, 6 deliberate gaps.

## v2.6.x patches (small follow-ups, ~1 week post-v2.6.0)

1. **Mobile-shell polish on new modules** — Risk register, Insurance
   questionnaire, CISO scorecard. v2.6.0 ships desktop-first.
2. **Board PDF visual polish** — branded cover-page templates,
   optional logo watermark, signed-off-by signature block, richer
   in-PDF charts (trend lines, severity-distribution donuts).
3. **Auto-suggest sensitivity slider** in Settings — currently
   hardcoded thresholds; expose as config.
4. **CISO scorecard sparklines** — per-KPI 12-week trend line on each
   pinned tile.

## v2.7.0 — extensions

5. **Additional industry questionnaire templates** — finance (PCI /
   DORA), healthcare (HIPAA), generic enterprise. Engine ships in
   v2.6.0; templates are JSON drops.
6. **Risk register heat map** — 5×5 impact-likelihood matrix grid
   view alongside the table.
7. **Risk treatment plans** — per-risk mitigation steps with owners /
   due dates / status (currently v2.6.0 has only free-text
   `mitigationNotes`).
8. **Custom CISO scorecard KPI formulas** — user-defined beyond the
   10-pin catalog.
9. **Insurance questionnaire — file-upload evidence** per question
   (e.g., attach IR plan PDF).

## v2.8.0+ — integrations

10. **Risk register import** from CSV, JIRA, ServiceNow.
11. **Email digest** — weekly to a configurable list.
12. **Slack / Teams webhook** — push notifications to a channel.
13. **Insurance questionnaire export** — standalone PDF for brokers.
14. **Quarterly board-report scheduler** — beyond weekly auto-draft;
    per-quarter, per-month, custom-cron.
15. **Audit-trail evidence storage** with expiry tracking.
16. **Multi-org hierarchical Executive view** — for groups like
    Emaar / Dubai Holding where a parent oversees subsidiaries.
17. **Public API** for CISO scorecard — embed in Power BI / Tableau.

## Out of scope (decisions, do not re-litigate)

- **Vendor risk module** — Dubai Airports' Mizan focus is E5
  components only (Microsoft 365 estate). 3rd-party vendor data
  doesn't come from Graph and would require external API integrations
  (HaveIBeenPwned, Recorded Future, etc.). Vendors are acknowledged
  inside the Risk register as risk subjects but there's no dedicated
  vendor module.
- **ML-driven risk scoring** — rules-based is honest and explainable.
  ML adds magic without trust.
- **Native mobile apps** — responsive web shell is enough.
- **Forking the Mizan repo** — see Architecture decision above.

## Open architecture decisions made (locked)

- Sidebar order in Executive: Posture overview · Identity · Devices ·
  Data · Threats · Compliance · Vulnerabilities · Directive · Risk
  register · Cyber insurance · Board report · Settings · FAQ.
- Framework default for Executive demo: Dubai ISR (NESA still
  available in registry).
- Auto-suggest default behavior: suggest-only (CISO accepts/dismisses).
  Toggle in Settings to flip into auto-promote.
- Board PDF: both on-demand (button) AND auto-drafted weekly into
  Drafts.
- Insurance template ships: aviation-only.
- Demo organization: Dubai Airports, mid-maturity (~74), Dubai ISR
  ~68%.
