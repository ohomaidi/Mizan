# Runtime Configuration — Council-editable at runtime

**Five** pieces of runtime state can be edited by Council admins without touching code or redeploying. All live in the `app_config` SQLite table; the UI is under **Settings**.

| # | Key | Surface | Shipped |
|---|---|---|---|
| 1 | `maturity` | Maturity Index weights + Council target | 2026-04-19 |
| 2 | `pdf.onboarding` | Onboarding Letter PDF template | 2026-04-19 |
| 3 | `pdf.discovery` | Discovery Letter PDF template | 2026-04-19 |
| 4 | `azure.app` | Entra app registration credentials | 2026-04-19 |
| 5 | `nesa.mapping` | UAE NESA clause → Secure Score control mapping | 2026-04-19 |

---

## 1. Maturity Index configuration

**Stored at:** `app_config.key = 'maturity'`
**Type:** [`MaturityConfig`](../web/lib/config/maturity-config.ts)

```ts
{
  weights: {
    secureScore: 0.25,   // sum of all six keys = 1.0 after normalization
    identity:    0.20,
    device:      0.15,
    data:        0.15,
    threat:      0.15,
    compliance:  0.10,
  },
  target: 75,            // 0..100, clamped on save
  updatedAt: "..."       // written on save
}
```

### What reads this at runtime
- `lib/compute/maturity.ts` — uses `weights` in the final weighted sum.
- `lib/compute/aggregate.ts` — uses `target` for `belowTargetCount`, cluster rollups, and the chart reference line.
- `/faq` — renders weights dynamically into the formula table.
- Settings → Maturity Index UI — read + write.

### UI — Settings → Maturity Index
- Six range sliders (0–50 each), values shown as integer percentages.
- Live-updating "Weights total" indicator (goes green at 100%, amber otherwise).
- Target input (number 0–100).
- **Weight-sum guard (shipped 2026-04-20)** — Save button disabled until weights = 100%; inline "must equal 100% (N off)" banner; one-click **Normalize to 100%** rescales proportionally and absorbs rounding drift on the largest weight.
- **Save** persists and auto-normalizes server-side so `Σweights = 1.0` regardless of what the client sends.
- **Reset to defaults** restores the spec defaults (25/20/15/15/15/10, target 75).

### API
- `GET /api/config/maturity` → `{ config, defaults }`
- `PUT /api/config/maturity` with `{ weights, target }` → `{ config }`
- `PUT /api/config/maturity` with `{ reset: true }` → restores defaults

### Safety
- Weights are normalized on save — no matter what the UI sends, the stored values sum to 1.
- Target is clamped to 0..100.
- Any missing weight key falls back to the default.

---

## 2. Onboarding PDF template

**Stored at:** `app_config.key = 'pdf.onboarding'`
**Type:** [`PdfTemplate`](../web/lib/config/pdf-template.ts)

```ts
{
  councilEn, councilAr,
  taglineEn, taglineAr,
  titleEn, titleAr,
  subtitleEn, subtitleAr,
  contactName, contactEmail,
  sections: [{ titleEn, titleAr, en, ar, bullets?, bulletsTitleEn?, bulletsTitleAr?, noteEn?, noteAr? }, ... 5 total],
  sigRoles: [[en, ar], [en, ar], [en, ar]],
  footerEn, footerAr,
}
```

### What reads this at runtime
- `lib/pdf/OnboardingLetter.tsx` — renders every editable string from the template.
- `/api/tenants/{id}/onboarding-letter` — calls `getPdfTemplate()` before rendering.
- Settings → Onboarding PDF UI — read + write.

### UI — Settings → Onboarding PDF
Form grouped by section:
- **Council identity + header** (Council name + tagline, EN and AR)
- **Document title + subtitle** (EN and AR)
- **Council contact** (name + email)
- **Body sections** — five cards, each with EN+AR title, EN+AR body, optional EN+AR bullets, optional EN+AR note. Sections correspond to: 1 Overview · 2 Step 1 Consent · 3 Step 2 Roles · 4 Step 3 Notify · 5 Data scope.
- **Sign-off roles** — three bilingual role titles.
- **Footer** (EN + AR text).

Actions: **Save template**, **Reset to defaults**, **Preview PDF** (opens a fresh render in a new tab).

### API
- `GET /api/config/pdf-template` → `{ template, defaults }`
- `PUT /api/config/pdf-template` with full template → `{ template }`
- `PUT /api/config/pdf-template` with `{ reset: true }` → restores defaults

### Safety
- Section count is enforced (always 5). Missing fields fall back to defaults via `mergeWithDefaults`.
- Signature row count is enforced (always 3).
- The PDF renderer always gets a fully-populated template — the editor can't ship a half-broken file.

---

---

## 3. Discovery letter template

**Stored at:** `app_config.key = 'pdf.discovery'`
**Type:** [`DiscoveryTemplate`](../web/lib/config/discovery-template.ts)

The **pre-onboarding** letter — generic (not tied to any tenant), sent to every entity at the start of the engagement. Tells each entity what the Council needs (Tenant ID, primary domain, E5 licensing confirmation, Global Administrator, CISO contact) and where in Microsoft 365 to find each item.

```ts
{
  councilEn, councilAr, taglineEn, taglineAr,
  titleEn, titleAr, subtitleEn, subtitleAr,
  contactName, contactEmail, contactPhone?,
  overviewEn, overviewAr,
  steps: [{ titleEn, titleAr, whatEn, whatAr, whereEn, whereAr }, ... 5 total],
  sendBackEn, sendBackAr,
  nextEn, nextAr,
  footerEn, footerAr,
}
```

### What reads this at runtime
- `lib/pdf/DiscoveryLetter.tsx` — renders every string from the template.
- `/api/discovery-letter` — calls `getDiscoveryTemplate()` before rendering.
- Settings → Discovery PDF UI — read + write.

### UI — Settings → Discovery PDF
Same shape as the Onboarding template editor: EN/AR pairs for Council identity + header, title + subtitle, reply-to contact (name + email + optional phone), overview narrative, five checklist steps (each with title, "what to send", and "where to find it"), send-back instructions, "what happens next" narrative, footer.

### API
- `GET /api/config/discovery-template` → `{ template, defaults }`
- `PUT /api/config/discovery-template` with full template → `{ template }`
- `PUT /api/config/discovery-template` with `{ reset: true }` → restores defaults

### Entry points in the app
- **Entities tab banner** — gold-accented callout at the top of `/settings` with **Download Discovery Letter** and **Preview** buttons. Makes the two-stage flow visually obvious.
- **Settings → Discovery PDF** tab — full editor.
- **Public download URL** — `/api/discovery-letter` always returns the current stored template rendered to PDF.

---

---

## 4. Azure app registration — shipped 2026-04-19

**Stored at:** `app_config.key = 'azure.app'`
**Type:** [`AzureAppConfig`](../web/lib/config/azure-config.ts)

```ts
{
  clientId: string;          // Entra Application (client) ID
  clientSecret: string;      // client secret value — masked on GET
  authorityHost: string;     // default https://login.microsoftonline.com
  consentRedirectUri: string; // blank = derive from APP_BASE_URL
  updatedAt: string;
}
```

### What reads this at runtime
- `lib/graph/msal.ts` — reads through `getAzureConfig()` to build per-tenant MSAL clients.
- `/api/tenants` (`POST`) — embeds `client_id` in the admin-consent URL.
- `/api/auth/consent-callback` — uses `consentRedirectUri` to redirect back.
- Settings → App Registration UI — read (masked) + write.

### UI — Settings → App Registration
- 6-step inline walkthrough with one-click Copy for the exact redirect URI to register in Entra.
- **Source pill** on every field: "from DB" (stored override) / "from env" (fallback) / "not set".
- Client secret field is write-only. Masked placeholder when a value is stored; typing replaces it.
- Status pill at the top: "Ready — Graph token acquisition should work" / "Not configured — real-tenant syncs will return 412".

### API
- `GET /api/config/azure` → `{ config }` where `clientSecret` is always masked to `clientSecretSet: true|false`. Secret value never leaves the server.
- `PUT /api/config/azure` with any subset of `{ clientId, clientSecret, authorityHost, consentRedirectUri }` → `{ config }`.
- `PUT /api/config/azure` with `{ clear: true }` → wipes the DB override (env fallback takes over if present).

### Safety
- Save triggers `invalidateAllTokens()` — clears both MSAL client cache and per-tenant token cache, so the next Graph call uses the fresh credential.
- Env vars (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_AUTHORITY_HOST`) still work as a fallback for fresh installs.

---

## 5. UAE NESA clause mapping — shipped 2026-04-19

**Stored at:** `app_config.key = 'nesa.mapping'`
**Type:** [`NesaMapping`](../web/lib/config/nesa-mapping.ts)

```ts
{
  frameworkVersion: "UAE NESA IAS 1.0",
  clauses: [
    {
      id: "T.1",
      ref: "T.1 — Identification & Authentication",
      titleEn, titleAr,
      descriptionEn, descriptionAr,
      secureScoreControls: ["MFARegisteredPct", "BlockLegacyAuth"],
      weight: 20,
    },
    ... 8 default clauses (T.1 – T.8)
  ],
  updatedAt: string;
}
```

Clauses cover: Identification & Authentication, Access Control, Information Classification, DLP, Endpoint Security, Incident Detection & Response, Audit & Accountability, Data Residency.

### What reads this at runtime
- `/governance` page — renders per-clause coverage bars, weighted average drives the compliance sub-score view.
- Settings → NESA mapping UI — read + write.

### UI — Settings → NESA mapping
- One card per clause; each card has bilingual title, weight input, and a comma-separated Secure Score control list.
- Add / remove clauses.
- Weights auto-normalize to 100 on save (sum of all clause weights).
- Reset to defaults.

### API
- `GET /api/config/nesa` → `{ mapping, defaults }`
- `PUT /api/config/nesa` with full mapping → `{ mapping }`
- `PUT /api/config/nesa` with `{ reset: true }` → defaults

### Safety
- Array shape validated with zod (min 1 clause, max 40).
- Each clause's `weight` clamped 0–100; total normalized to 100 on save.

---

## Packaging notes
- Config is in SQLite — no separate config file on disk, no environment variable for content.
- A fresh customer install starts with **defaults baked into source** (`DEFAULT_MATURITY` / `DEFAULT_PDF_TEMPLATE` / `DEFAULT_DISCOVERY` / `DEFAULT_NESA_MAPPING`). First Settings edit persists the override.
- Azure app credentials are the one exception — they are a **secret** and live in `app_config.key = 'azure.app'` (observation) / `app_config.key = 'azure.directive'` (directive mode second app) with the same SQLite-at-rest encryption posture as the rest. Backups should be encrypted or the credential column redacted before archival. Prefer cert-based MSAL (production hardening) when moving off the demo environment — swap the `client_secret` for a `.pfx` reference resolved via Azure Key Vault.
- Exporting / migrating a customer's config = backing up the `app_config` table (one SQL dump).
- **AR template strings** pass through `sanitizeArabic` on every getter — stylistic Tatweels (U+0640) that precede whitespace+Latin are stripped to avoid a bidi-reorder crash in `@react-pdf/textkit`. Safe to write Arabic freely in the UI editors; the sanitizer keeps the renderer happy.

---

## Environment variables (install-time, not Settings-editable)

These are set on the container / LaunchAgent / Windows Service at install time. They are **intentionally not in the SQLite config** — each requires a restart to take effect, and flipping them at runtime would be dangerous (e.g. a directive deployment suddenly becoming observation mid-push).

| Variable | Values | Purpose |
|---|---|---|
| `MIZAN_DEPLOYMENT_MODE` | `observation` (default) / `directive` | Controls the whole directive stack. Observation builds don't register `/directive/*` routes at all. Changing it = redeploy. |
| `MIZAN_DEMO_MODE` | `true` / `false` (default) | Enables the auth bypass for demo deployments + synthesized demo tenants. `tenant.is_demo=1` tenants short-circuit directive writes to a simulated success. |
| `DATA_DIR` | any absolute path | Where SQLite + uploaded logo live. Defaults to `web/data/` in dev, `/data` in Azure, `~/Library/Application Support/mizan/` on macOS, `%ProgramData%\Mizan\data\` on Windows. |
| `APP_BASE_URL` | any HTTPS URL | Forces outbound URLs (OIDC callback, consent-URL generation, PDF links) to a specific origin. Use when behind a reverse proxy that doesn't forward `Host` cleanly. |
| `SCSC_SYNC_CONCURRENCY` | integer 1–20 (default 5) | Number of tenants synced in parallel by the per-tenant worker pool. |
| `SCSC_SEED_DEMO` | `true` / `false` (default false in packaged releases) | If true + DB is empty, seeds demo tenants + signal snapshots. Each of the Mac Mini demos sets this true. |
| `NODE_ENV` | `production` / `development` | Standard Next.js. |

### Intentionally not wired

Don't add the following env vars without the user's approval — the absence is deliberate.

| Var | Why not |
|---|---|
| `DIRECTIVE_APPROVAL_DISABLED` / `DIRECTIVE_APPROVAL_ALLOW_SELF` | Two-person approval workflow is deferred (2026-04-24). No env vars today — the code path doesn't exist. |
