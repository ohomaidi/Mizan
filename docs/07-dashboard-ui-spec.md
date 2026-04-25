# Dashboard UI Specification

**Source of truth for visual design:** slide 6 of `~/Desktop/Sharjah-Council-Executive-Briefing-final.pptx` — the "Maturity overview" mock. This document translates that mock into an implementable UI spec, adds the per-entity drill-down (Entities tab), and defines the shared layout chrome.

---

## 1. Global layout

Three zones, consistent across all tabs.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TopBar: SHARJAH COUNCIL · SECURITY POSTURE               URL · AR/EN · SA │
├────────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar    │                                                              │
│            │                                                              │
│ Nav tabs   │                      Main content                            │
│            │                                                              │
│ Data       │                                                              │
│ Sources    │                                                              │
│ panel      │                                                              │
└────────────┴──────────────────────────────────────────────────────────────┘
```

### 1.1 TopBar
- Left: Council identity lockup — small seal/coat-of-arms, Arabic name `مجلس الشارقة للأمن السيبراني` on line 1, English name `SHARJAH COUNCIL · SECURITY POSTURE` on line 2 in eyebrow caps.
- Center: URL-bar-style breadcrumb showing the current logical URL (`council.posture.shj.gov.ae/maturity`, `/entities`, etc.). This mirrors the mock's browser-window aesthetic and makes the demo feel like the production product.
- Right: language toggle (AR/EN), notifications bell, user avatar (initials badge, e.g., `SA`).

### 1.2 Sidebar
Fixed-width vertical rail, two sections.

**Nav tabs (top):**
1. Maturity overview — default route
2. Entities
3. Identity
4. Threats
5. Data Protection
6. Devices
7. Governance
8. Settings

**Data Sources panel (bottom):** static informational panel taken verbatim from slide 6, establishes credibility of signal provenance.

```
DATA SOURCES · GRAPH APIS
—
Secure Score         tenant & control-level
Defender             Endpoint / Identity / O365
Purview              DLP, labels, insider risk
Entra ID             identity posture, CA, PIM
Intune               device compliance, MAM
Compliance Mgr.      UAE NESA (synthesized)
```

Each row has a subtle live-status dot (green/amber/red) reflecting the data source's health across all entities.

### 1.3 Main content
Per-route. Specified below.

---

## 2. Route: Maturity overview (default)

**Directly mirrors slide 6.** This is the "hero" view that the Council president sees on login.

### 2.1 Page header
- H1: **Maturity overview**
- Time-range pill group (segmented control), right-aligned: `7D` · `30D` · `QTD` · `YTD`. Default `7D`. **Shipped 2026-04-20**: localized labels (7D→٧ أيام, QTD→منذ الربع, etc.); selection controls the Δ shown in the MATURITY INDEX tile. QTD uses the snapshot ~90 days back, YTD ~180 days back; demo seed writes dated Secure Score snapshots at 7/30/90/180 days so all four ranges render real deltas in demos.

### 2.2 KPI tile row — **shipped 2026-04-19/20**
Four equal tiles, horizontal. Each tile: label (uppercase eyebrow), large numeric value, delta pill (signed, colored green/red) when applicable.

| Tile | Source | Delta |
|---|---|---|
| **MATURITY INDEX** | Mean across consented entities with data | Δ for the selected time range (7D/30D/QTD/YTD) |
| **ENTITIES** | Tenant registry count | — |
| **BELOW TARGET** | Count where `maturity.index < target` | — |
| **CONTROLS PASSING** | % of Secure Score controls where `score === maxScore` across all tenants | — |

**Important fix 2026-04-20**: `controlsPassingPct` previously filtered by the literal string match `implementationStatus === "Implemented"`, which never matched real Graph responses (they return natural-language status like "Modern authentication is enabled"). Classification now uses the score/maxScore ratio, falling back to the string match only when `maxScore` is absent.

### 2.3 Maturity by entity — main chart — **shipped 2026-04-20**
Replaces the earlier cluster-level chart ([`EntityBarChart.tsx`](../web/components/charts/EntityBarChart.tsx)).

- Title: **Maturity by entity**
- Subtitle: `One bar per consented entity vs Council target {N}. Click a bar to drill in.`
- One bar per consented entity, not per cluster. Bar width 110 px, chart height 380 px.
- **Sort pills** above the chart: Maturity · high first (default) · Maturity · low first · Name (i18n collator).
- **Horizontal scroll**: chart min-width = max(8 × bar width, entities × bar width + padding). Card wraps in `overflow-x-auto` so tenants beyond ~10 entities scroll into view sideways.
- **X-axis labels always rotated 35°** with entity-name shortening (≤ 18 chars + `…`).
- **Clickable bars** → navigate to `/entities/{id}` detail page. Cursor: pointer.
- Target line at Council target rendered as a horizontal accented reference line; bars below it colored red, within 5 points above gold, further above teal.
- Tooltip shows full entity name + cluster + Maturity value on hover.

### 2.4 Secondary panels (shipped 2026-04-19/20)
- **Biggest movers — last 7 days** — top 5 entities sorted by `|Δ7d|`. Shows Δ value with up/down color + cluster + current index. Uses `delta7d` from the entities API; falls back to an "Not enough history yet" copy when the dashboard hasn't accumulated a week of snapshots.
- **Controls dragging the index down** — Council-wide aggregation of Secure Score controls that missed points, ranked by total `missedScore = Σ (maxScore − score)` across affected entities. Backed by the new [`/api/signals/dragging-controls`](../web/app/api/signals/dragging-controls/route.ts) endpoint. Each row shows: humanized title, entities-affected count, Microsoft service, user-impact label, and the total missed-score value (e.g. `−45`).

---

## 3. Route: Entities — per-entity drill-down

The tab the user asked for. Two levels: list view, then detail.

### 3.1 Entities list

**Purpose:** ranked, filterable, exportable view of all 100+ entities with status.

**Columns:**

| Column | Type | Sort/filter |
|---|---|---|
| Entity | string (EN + AR secondary) | Sort, search |
| Cluster | enum | Filter |
| Maturity index | numeric 0–100 with mini-bar | Sort |
| Δ (7D) | signed delta | Sort |
| Target met | boolean (✓ / ✗) | Filter |
| Controls passing | % with color | Sort |
| Open incidents | count (clickable) | Sort |
| Risky users | count | Sort |
| Device compliance | % | Sort |
| Label coverage | % | Sort |
| Connection | health dot (green/amber/red) | Filter |
| Last sync | timestamp | Sort |

**Top filters:**
- Cluster chips (Police / Health / Edu / Municip. / Utilities / Transport)
- Maturity band chips (0–50 / 51–74 / 75+)
- Connection health
- Free-text search

**Top actions:**
- Export CSV / XLSX
- Bulk: send reminder to below-target CISOs
- Ranking view toggle (table vs leaderboard cards)

**Row click → Entity detail.**

### 3.2 Entity detail

Per-entity page, three-pane layout:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Entity header: Name EN/AR · Cluster · Maturity Index 82 (+1.3)           │
│                 Tenant ID · CISO · Target met ✓ · [Actions ▾]            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Section tabs: Overview | Controls | Incidents | Identity | Data |       │
│                Devices | Governance | Connection                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Overview tab (default):**
- Maturity Index big number + 30-day trend sparkline
- Sub-score breakdown (radial or bar): Identity / Device / Data / Threat / Compliance framework
- 3-up snapshot: open incidents, risky users, non-compliant devices
- Benchmark strip: where this entity ranks in its cluster and overall
- Recent changes feed (last 10 signals that moved the index)

**Controls tab:** every Secure Score control in this tenant, pass/fail, weight, drill to Microsoft recommendation.

**Incidents tab:** live list from `/security/incidents` for this tenant, severity + age.

**Identity tab:** risky users, CA policy drift, PIM standing-access count.

**Data tab:** label adoption, DLP alert density, IRM alerts, SRR throughput.

**Devices tab:** Intune compliance breakdown, attestation failures.

**Governance tab:** UAE NESA framework alignment (NCA / ISR deferred).

**Connection tab:** per-endpoint call health, permission checklist, audit-of-access log (PS role membership deferred with PS tier).

**Entity header actions:** View in Defender portal (SSO deep-link) · Export entity card (PDF) · Schedule review · Suspend connection.

---

## 4. Shared visual system

### 4.1 Color palette (brand-informed, cybersecurity-credible)

| Role | Token | Hex | Usage |
|---|---|---|---|
| Surface dark | `--surface-1` | `#0B0F1A` | App background |
| Surface raised | `--surface-2` | `#131A2A` | Cards, tiles |
| Surface overlay | `--surface-3` | `#1B2436` | Hover, selected |
| Council primary | `--council-primary` | `#0F766E` | Maturity Index fill, primary CTAs *(reference Sharjah Cyber Council teal — confirm with Council brand team)* |
| Accent gold | `--accent` | `#D4A24C` | Target line, highlight states *(Sharjah flag-adjacent)* |
| Positive | `--pos` | `#22C55E` | Positive deltas, healthy |
| Negative | `--neg` | `#EF4444` | Negative deltas, critical |
| Warning | `--warn` | `#F59E0B` | Amber status |
| Text primary | `--ink-1` | `#F5F7FA` | Body text on dark |
| Text secondary | `--ink-2` | `#A3B0C2` | Labels, captions |
| Border | `--border` | `#243049` | Card borders, gridlines |

Final palette is subject to Council brand team sign-off. Colors above are placeholders compatible with executive/gov aesthetic and legible on the dark chrome implied by the mock.

### 4.2 Typography

- Display (KPIs, headline numbers): **Inter**, 48–64px, weight 600. Tabular figures.
- Headings: Inter, 18–28px, weight 600.
- Body: Inter, 14–15px, weight 400.
- Eyebrow / label: Inter, 11–12px, weight 600, uppercase, tracking +0.06em.
- Arabic: **IBM Plex Sans Arabic** or **Noto Sans Arabic**, matched weights.

### 4.3 Motion
- Route transitions: 150ms opacity + 4px Y slide
- KPI deltas: count-up animation 600ms ease-out on first paint, subtle pulse on value change
- Chart reveal: 400ms stagger bars left-to-right

### 4.4 RTL
Full RTL mirroring when AR is selected. All layouts use logical CSS properties (`inline-start`, `inline-end`) from day one.

### 4.5 Accessibility
- WCAG 2.2 AA contrast on all text
- Keyboard nav across tabs, KPI tiles, table rows
- Screen reader labels on sparklines, charts, deltas
- Motion-reduction media query respected

---

## 5. Frontend stack decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for fast first paint, mature MSAL Node integration, Microsoft-stack-friendly |
| UI library | Tailwind CSS + Radix UI primitives | Fast iteration, accessibility baked in |
| Charts | Recharts or Visx | Recharts for KPI sparklines + bar; Visx if we need custom compositions |
| State | React Server Components + server actions for data; TanStack Query for client fetches | Minimal client state |
| Auth | MSAL Node (Entra ID, Council tenant) for Council staff; Cloudflare Access in front as defense-in-depth | Two-layer identity |
| i18n | next-intl | AR/EN with RTL |
| Icons | Lucide | Clean, consistent |

---

## 6. Demo-vs-production URL handling

- Production URL (aspirational): `council.posture.shj.gov.ae/maturity`
- Demo URL (today): `scscdemo.zaatarlabs.com`
- The TopBar shows the **production-style breadcrumb** regardless of the real hostname, so screenshots and demos look like the final product. The actual hostname is visible in a subtle "Demo environment" chip.

---

## 7. Build scope for v0 (today)

What goes live at `scscdemo.zaatarlabs.com` this session:

- Global layout (TopBar, Sidebar with Data Sources panel)
- Maturity overview route matching slide 6 with **stub data** (the mock's 6 clusters and values, so the Council sees the design intent immediately)
- Entities list route with stub data for ~12 representative entities
- Entity detail page (Overview tab only; other tabs scaffolded as "coming in Phase 2")
- All other tabs stubbed with "in development" placeholders + what signals they'll contain
- AR/EN toggle working on the chrome (content translations come later)
- Connected to nothing real yet — pure UI shell with stub JSON; the Graph wiring is Phase 2

This gives the Council a clickable, demo-able UI immediately. Real signals slot in behind the same components in Phase 2 without UI changes.

---

## 8. Phase 2 scope (after v0 lands)

- MSAL auth for Council staff
- Tenant registry backing store
- First real Graph integration: Secure Score per tenant → populates Maturity Index tile
- Live Entities list pulling real tenant data
- Connection health for pilot entities
- Cloudflare Access wired in front (handled by you in the CF dashboard)

---

## 9. Route: `/directive` (directive-mode deployments only)

Mounted only when `MIZAN_DEPLOYMENT_MODE=directive`. Observation-mode builds do not register the route — 404 at the loader. Full operator flow in [`12-operating-manual.md §B`](12-operating-manual.md).

### 9.1 Page structure (v2.0+)

Top-to-bottom stack of cards. Scrolls naturally, no tabs.

1. **Capability cards** — a row of icons representing Phase 2 + Phase 3 directive actions, each flipping from "Planned" chip to "Available" chip based on deployment state.
2. **Conditional Access baselines** — grid of 12 baseline cards (see §9.2).
3. **Intune device-posture baselines** — grid of 13 baseline cards (compliance + MAM + ASR rules) with platform filter chips (All / iOS / Android / Windows / macOS).
4. **SharePoint tenant external-sharing baselines** — 4 baseline cards. Yellow "singleton model — no rollback button" caveat banner above the grid.
5. **Threat Intelligence — IOC push** — operator console with form (indicator type / value / action / severity / description / expiry) + tenant picker + recent IOCs table.
6. **Coming-soon catalogs** — 6 sections rendered with accent "Coming soon" banner + dimmed cards + disabled push button: DLP, Sensitivity Labels, Attack Simulation Training, PIM + Identity Governance, App Consent Policies, Tenant Identity Defaults.
7. **Custom CA policies** — drafts list + "+ New custom policy" button. Routes into the wizard at `/directive/custom-policies/[id]/edit`.
8. **Baseline status per entity** — entity dropdown + matrix of current state per baseline.
9. **Push history** — last 50 push_requests with per-row Roll back button.
10. **Threat submission console** — in-line form for submitting email / URL / file threats.
11. **Audit log** — last 500 directive_actions rows with filter + per-row "View details" drawer.
12. **Guardrails panel** — inline reminder of the safety rails: report-only default, Global Admin exclusion, idempotency, rollback.

### 9.2 Baseline card

Each of the 12 baseline cards renders in a 2-column grid with:

- Title + risk chip (`LOW` / `MEDIUM` / `HIGH` risk) in top-right
- Body description
- `Targets:` / `Grant:` / `Initial state:` one-liners
- Prominent yellow **"Ships report-only"** chip + one-line explainer
- Green **"Automatically excludes the entity's own Global Administrators"** chip when applicable
- Three buttons at the bottom: **Push to entities** (primary), **Details** (expand), **Clone as custom draft** (secondary)
- Red **Remove from ALL entities** button in the card's lower-right

Expanded Details shows Why / User impact / Prerequisites / Rollout advice + a Microsoft Learn reference link.

### 9.3 Push modal

Opens on **Push to entities**. Contents:

- Preview panel with the exact Graph body (collapsible)
- State override dropdown (Report-only / Disabled / Enabled)
- Tenant picker (multi-select checkboxes, grid layout, max-height scrolling)
- Selection count chip — *"3 of 14 entities selected"*
- **Push** button disabled until selection ≥ 1
- Result rows render inline after push with per-tenant chip: Success / Already applied / Simulated / Failed / Skipped (observation)
- "Already applied" rows also show a CaStateChip (Report-only / Enabled / Disabled)

### 9.4 Rollback modal (pre-flight preview)

Opens on **Roll back** in Push history. Contents:

- Intro paragraph explaining what will happen
- Table: per-tenant rows with checkbox + tenant name + current-state chip + action column
- Action column shows **Will DELETE** (red) or **Skip** (grey) with reason
- Yellow *"Entity has flipped this to Enabled — rollback will un-enforce"* below rows where `wouldUnprotect: true`
- Pre-selects every eligible row; operator deselects to scope
- Two buttons: **Cancel** + red **Roll back selected (N)**

### 9.5 Wizard route

`/directive/custom-policies/[id]/edit` — full-page replacement for the dashboard layout.

- Header: back-link to `/directive`, policy name h1, Saving… / Saved indicator
- 7-tab step nav (Identify / Users / Apps / Conditions / Access / Session / Review)
- Scope banner below step nav — green ("Cross-tenant") or yellow ("Tenant-scoped to X")
- 2-column layout below: active step on the left (2/3 width), always-visible Review panel on the right (1/3 width)
- Review panel shows 5 one-line summaries of the other steps — clickable to jump
- Large "Push to entities" button at the bottom of the Review panel

### 9.6 Status view details

`/directive → Baseline status per entity`:

- Entity picker dropdown (directive entities only)
- "Snapshot taken" timestamp + mode chip (accent "Simulated" for demo tenants, green "Live from Entra tenant" for real)
- 12-row table: Baseline name / Present (green Yes or grey Not present) / Current state (chip) / Observed timestamp
- Drift annotations inline under each row: yellow "flipped to Enabled" warning, grey "still in report-only" info

### 9.7 Intune card structure

Same overall shape as a CA baseline card but with three distinguishing elements:

- Platform pill in the title row (`iOS` / `Android` / `Windows` / `macOS`)
- Yellow **"Ships un-assigned"** banner explaining the Intune analogue of CA's report-only state — policy is created but no users/devices are assigned until the entity admin opens Intune
- Effect summary describes ASR rules in audit mode, BitLocker enforcement, etc. Cards are filterable by platform via the chip row at the section top.

### 9.8 SharePoint card + push modal

SharePoint baselines look like CA / Intune cards but the push modal is different:

- Renders the **exact JSON patch** that will be PATCHed to `/admin/sharepoint/settings`
- Yellow **"Singleton — no rollback button"** banner explains the audit-only revert path
- No "Already applied" chip across pushes — instead, the push GETs the current settings, diffs the intended patch, and skips (returning `already_applied`) when every key already matches

### 9.9 IOC push console

Form-based, not card-grid. Top-to-bottom:

1. Indicator type dropdown (file hash / URL / domain / IPv4 / IPv6) + value input with type-aware placeholder
2. Action dropdown (alertAndBlock recommended / alert / block / allow)
3. Severity dropdown (informational / low / medium / high)
4. Free-text description (Mizan auto-prefixes with `[Mizan IOC <id>]` for rollback lookup)
5. Internal note (Mizan-only, not sent to Defender)
6. Expiration days (default 90)
7. Multi-select tenant picker
8. Push button — disabled until value + description + at least one tenant
9. Recent IOCs table below: type / value / action / severity / expires / created

### 9.10 Coming-soon catalog sections

Six identical sections (DLP, Labels, Attack Sim, PIM, App Consent, Tenant Identity Defaults). Each renders:

- Title with phase-appropriate icon
- Subtitle explaining the catalog
- Accent **"Coming soon"** banner with the Microsoft Graph coverage gap explanation
- Dimmed (75% opacity) baseline cards in a 2-col grid
- Each card has a disabled grey **Push to entities** button (cursor: not-allowed)

When Microsoft moves the relevant Graph authoring API to GA, flipping `pushEnabled: true` on the API route is the only change needed to unlock push.

### 9.11 Wizard accessibility (v2.0+)

The custom CA wizard ships the WCAG-compliant Modal pattern across every step:

- Modal `aria-labelledby` points at each section title
- Tab cycles inside the modal; Esc closes; focus restores to the previously-focused trigger
- Wizard's **Saving / Saved** indicator wrapped in `role="status"` + `aria-live="polite"` so AT announces autosave transitions without interrupting typing
- Sidebar nav uses `aria-current="page"` on the active link
- Top-of-layout skip-to-content link jumps focus to `<main>` (WCAG 2.4.1 Bypass Blocks)
