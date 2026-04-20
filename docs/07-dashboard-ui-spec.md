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
