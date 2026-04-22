# Branding & RBAC

White-label customization (organization name, logo, colors, framework) plus the user-authentication and role-based access layer. Both land in `app_config` as JSON rows, so they're safe to export/import per customer.

## Branding config

Stored under the `branding` key in `app_config`. Loaded via `lib/config/branding.ts` with generic defaults; the demo seed path writes Sharjah Cybersecurity Council values into the same row so the Mac Mini demo stays visually unchanged after the rebrand refactor.

### Fields

| Field | Used in | Notes |
|---|---|---|
| `nameEn`, `nameAr` | TopBar, login, PDF letterheads, consent pages, HTML `<title>` | Full organization name |
| `shortEn`, `shortAr` | TopBar logo monogram fallback, compact badges | Defaults to first 2 letters of `nameEn` |
| `taglineEn`, `taglineAr` | PDF subtitle, HTML meta description | Short one-liner |
| `accentColor`, `accentColorStrong` | Dashboard accent (`--council-primary` + `--council-primary-strong`) | Hex `#RRGGBB` |
| `logoPath` | Logo file name (relative to `DATA_DIR/branding/`) | Null = text monogram fallback |
| `logoBgRemoved` | UI flag | Tells the Branding panel what the "Keep background" checkbox should default to on re-upload |
| `frameworkId` | Governance page + PDF titles | `nesa` · `nca` · `isr` · `generic` |

### i18n integration

The `LocaleProvider` auto-injects `{orgName}`, `{orgShort}`, `{tagline}` into every `t()` interpolation so dict strings can reference the customer identity without each call-site passing it:

```tsx
// dict.ts
"maturity.subtitle": "Live posture across all {count} connected entities for {orgShort}."

// In component:
t("maturity.subtitle", { count: 42 });
// → "Live posture across all 42 connected entities for SCSC."
```

### Logo storage + background removal

Logos live at `DATA_DIR/branding/logo.png`, served at `GET /api/config/branding/logo`. Uploads go through `POST /api/config/branding/logo` (multipart) — the `keepBackground` flag decides whether the file is re-encoded as-is or run through `lib/branding/remove-bg.ts`, which pipelines U-2-Netp (a 4.7 MB ONNX model at `public/models/u2netp.onnx`) through `onnxruntime-node`.

Pipeline:

1. `sharp(input).png().toBuffer()` — normalize format
2. Resize to 320×320, normalize channels, feed to U-2-Netp
3. Decode mask, resize to original dimensions, blur edges
4. Composite RGB × mask → RGBA PNG

~300 ms end-to-end on a 2020 MacBook Air, including the first-call model warmup. No Python, no network.

## RBAC & user auth

Stored under `auth.user` in `app_config`. See `docs/08-phase2-setup.md §2` for the companion Entra app registration walk-through.

### Flow at a glance

```
browser → /login → /api/auth/user-login (PKCE redirect state in cookie)
       → login.microsoftonline.com (OIDC authorization code)
       → /api/auth/user-callback (validate state, exchange code, upsert user, create session)
       → dashboard
```

### Session management

- Opaque token (32-byte random) in an `httpOnly`, `secure`, `sameSite=lax` cookie — `scsc_session`.
- DB-backed: `sessions` table with `expires_at`.
- **Sliding window.** On every authenticated request past the midpoint of the current window, `currentUser()` pushes `expires_at` forward by another full `sessionTimeoutMinutes` and re-writes the cookie. Active users never see an interruption; idle sessions expire cleanly.
- **Absolute cap.** No session lives longer than `created_at + 30 days` regardless of how much sliding extension happens. Force re-auth at the 30-day mark closes a stale-session risk.
- **Configurable lifetime.** `sessionTimeoutMinutes` is exposed in Settings → Authentication as a dropdown (8 h / 24 h / 7 d / 30 d). Default is 7 days — long enough that the common case is silent Microsoft SSO re-auth (no password prompt), short enough that a revoked account stops reading within a week.

### Role resolution (first login)

Priority order:

1. **Entra app roles** — if the ID token carries a `roles` claim, `resolveAppRole()` maps it:
   - `Posture.Admin` / `.admin` / `admin` → admin
   - `Posture.Analyst` / `.analyst` / `analyst` → analyst
   - `Posture.Viewer` / `.viewer` / `viewer` → viewer
2. **Pending invite** — admin pre-seeds a user by email in Settings → Users. On that user's first successful sign-in, the pending row is adopted (role preserved, real Entra OID linked).
3. **Bootstrap admin** — first-ever login with an empty users table is auto-promoted to admin, regardless of the above.
4. **Fallback** — `defaultRole` from `auth.user` config.

### Role hierarchy

```
viewer (0) < analyst (1) < admin (2)
```

API routes use `apiRequireRole("admin")` etc. Pages use `requireUser(role)` in the `(dashboard)/layout.tsx`.

### Bootstrap escape hatch

While no *real* admin exists (i.e. `countRealAdmins() === 0` — pending-invite rows with `entra_oid LIKE 'pending:%'` do **not** count), both `requireUser()` and `apiRequireRole()` return `{ ok: true, user: null }` regardless of the request's session state. This is what keeps `/setup` reachable on a fresh container until the device-code-flow admin sign-in completes. The window closes the instant the first real admin lands.

The pending-invite exclusion is deliberate: pre-seeding a user invite before the first real sign-in (a reasonable admin workflow) would otherwise slam the bootstrap window shut and leave the operator locked out until the invited user completed their sign-in.

### Demo mode (`MIZAN_DEMO_MODE=true`)

Showcase deployments (e.g. `scscdemo.zaatarlabs.com`) set `MIZAN_DEMO_MODE=true` in the container environment. That env var — not a DB toggle, not a UI switch — short-circuits every RBAC gate to "open." Prospects can browse the dashboard without signing in. The top-bar shows a "DEMO" pill and the user menu renders a "Demo mode" chip instead of a sign-out control.

Production customers never set this. It is intentionally an env var rather than a UI flag: the previous design (a `enforce` boolean in DB config) was a footgun — deployments left it off indefinitely and the whole dashboard rendered anonymously.

### In-app user management

Settings → Authentication → **Dashboard users** panel (component: `components/settings/UsersPanel.tsx`):

- List every user (active + pending + disabled), sorted by display name.
- Change role via dropdown (safeguarded — can't demote the last active admin).
- Enable/disable without deleting — preserves audit trail.
- Delete outright (same safeguard).
- Invite-by-email — creates a row with `entra_oid = 'pending:<uuid>'`. When that email later completes a sign-in, the real Entra OID is linked in place.

### First-run onboarding

Fresh installs — any dashboard request hits `getSetupState().completed === false` and gets redirected to `/setup`. The wizard walks through:

1. Organization name + short form + framework
2. Logo upload (optional)
3. **Graph-signals app** — *Create for me* (device-code auto-provision) or paste manual credentials
4. **User-auth app** — *Create for me* (device-code auto-provision) or paste manual credentials
5. Bootstrap sign-in — one click triggers the OIDC round-trip; on return, the first user becomes admin

Marking setup complete (`app_config.setup.completed = true`) is idempotent — the demo seed stamps it so the Mac Mini never sees the wizard.

### Admin consent after auto-provisioning

The *Create for me* buttons spin up both app registrations through the device-code flow (`lib/auth/graph-app-provisioner.ts`) — 18 Graph application permissions wired on the signals app, OIDC delegated scopes wired on the user-auth app, 2-year client secrets generated, all credentials persisted to `app_config`. MSAL caches are invalidated so the new creds are live immediately.

**Manual step the wizard cannot perform:** Microsoft does not expose an API to grant admin consent programmatically. Right after the wizard finishes, the operator must:

1. Entra portal → **App registrations** → find each newly-created app.
2. **API permissions → Grant admin consent for &lt;tenant&gt;** on *both* apps.
3. *(Optional, user-auth app only)* — assign users / a group in *Enterprise applications* if the tenant enforces App assignment.
4. *(Optional, user-auth app only)* — add App roles (`Posture.Admin`, `Posture.Analyst`, `Posture.Viewer`) if using Entra-managed role separation.

Until consent is granted, sign-in fails with `AADSTS65001` and per-entity consent URLs won't authorize. This is covered in the wizard's Step 5 success banner and in `docs/08-phase2-setup.md §0`.
