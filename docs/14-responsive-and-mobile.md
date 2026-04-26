# Responsive + Mobile Architecture

**Shipped:** v2.5.0 (2026-04-26).
**Goal:** the dashboard works on a phone without compromising the desktop experience that v2.4.x customers already trust.

This is the canonical reference for how Mizan handles device-class differences. Read it before:
- adding a new top-level page (you must register it in both shells)
- adding a new modal or table component
- changing layout chrome anywhere in `components/chrome/*`

---

## 1. Architectural principle: parallel chrome, shared bodies

The dashboard ships two layout shells:

- **`<DesktopShell>`** — `components/chrome/DesktopShell.tsx`
  Persistent left sidebar + topbar with URL pill + main content with `max-w-[1440px] px-8 py-7`. Identical to v2.4.x.
- **`<MobileShell>`** — `components/chrome/MobileShell.tsx`
  Compact topbar (hamburger + branding mark + theme/language/user) + off-canvas drawer + full-width main with `px-4 py-5`.

Page bodies (`app/(dashboard)/<page>/page.tsx`) are **the same code in both shells**. Where a page needs to reflow at narrow widths it does so via Tailwind responsive classes — but those classes only take effect inside `<MobileShell>` because that's where the viewport is small enough to trigger them.

This isolation is deliberate. The desktop chrome cannot change accidentally when we ship mobile improvements — `DesktopShell` is its own component, never touched by mobile work.

```
                    middleware.ts
                          │
                          ▼
                  classifies User-Agent
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          desktop      tablet       mobile
              │           │           │
              └─────┬─────┘           │
                    ▼                 ▼
             <DesktopShell>     <MobileShell>
                    │                 │
                    └────────┬────────┘
                             ▼
                    page body (shared)
```

---

## 2. Device classification (server-side)

`web/middleware.ts` runs on every page request (excluded: `_next/static`, `_next/image`, `/api/*`, favicon, robots, sitemap).

### 2.1 The cookie

Cookie name: `mizan-device`
Possible values: `"desktop" | "tablet" | "mobile"`
Lifetime: 1 year (max-age 31,536,000)
SameSite: `Lax`

The cookie is set on the first visit, trusted on subsequent visits (so we don't re-classify every request), and overridable via query string.

### 2.2 Classification rules

Order matters — tablet check runs before mobile because Android tablet UAs typically include the substring "Mobile".

1. **Sec-CH-UA-Mobile Client Hint**: `?1` → mobile (or tablet if UA also matches a tablet pattern); `?0` → desktop. Chromium browsers send this; Safari does not.
2. **Tablet UA patterns**: `iPad`, `Tablet`, `PlayBook`, `Nexus 7`, `Nexus 10`, `KFAPWI`, `SM-T*` (Samsung tablets), `GT-P*` (older Samsung tablets) → tablet.
3. **Mobile UA patterns**: `Android.+Mobile`, `iPhone`, `iPod`, `webOS`, `BlackBerry`, `IEMobile`, `Opera Mini` → mobile.
4. **Plain `Android` without `Mobile`** → tablet (Android convention: tablets drop the "Mobile" token).
5. Default → desktop.

### 2.3 Why tablets default to desktop chrome

iPad portrait at 768px and Android tablets at similar widths read the desktop dashboard cleanly — the persistent sidebar + main content layout fits, and operators using a tablet typically expect a desktop-grade experience. A tablet user who prefers mobile chrome can opt in via `?device=mobile`.

### 2.4 The override

Query string: `?device=desktop`, `?device=mobile`, or `?device=tablet`
Behavior:
1. Middleware writes the cookie with the override value (if it changed).
2. Middleware redirects to the same URL with the `?device=` query string stripped.
3. The cookie persists, so subsequent navigation respects the choice.

Use cases:
- **QA**: testing both shells from a single browser without UA spoofing.
- **Demo presenters**: forcing mobile chrome on a projector for a "what your phone sees" walkthrough.
- **Customer escalations**: replicating a customer's reported bug at the same shell they're seeing.
- **iPadOS quirk**: iPadOS 13+ Safari sends a Mac UA. Real iPads classify as tablet by other signals; if a specific iPad needs mobile chrome, the override handles it.

---

## 3. Shell components

### 3.1 `<DesktopShell>` — `components/chrome/DesktopShell.tsx`

Static aside (260px sidebar) + topbar + main with max-width container. **Never modified for mobile work**. If a desktop change is needed, it lands here and only here.

### 3.2 `<MobileShell>` — `components/chrome/MobileShell.tsx`

```
┌─────────────────────────────────────────┐
│ ☰  [LOGO] CSC                  ☀ EN 🔔 ▼│  ← MobileTopBar (h-14)
├─────────────────────────────────────────┤
│                                         │
│           page body (px-4 py-5)         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

Children:
- `<MobileTopBar>` — `components/chrome/MobileTopBar.tsx`. 56px tall. Hamburger on the start edge, brand mark + short name in the middle, theme/language/notifications/user-menu on the end. Sync-All + URL pill from desktop are intentionally dropped (Settings → Council holds the full sync controls).
- `<MobileDrawer>` — `components/chrome/MobileDrawer.tsx`. Off-canvas panel that slides in from the start edge. Width: `min(80vw, 300px)`. Closes on backdrop tap, Escape key, link click, or viewport widening past `lg`.
- `<main>` — full-width with `px-4 py-5` content gutter and safe-area padding on left/right/bottom.

### 3.3 Adding a new top-level page

You must register it in **two places**:

1. `components/chrome/Sidebar.tsx` → add to `NAV` const (desktop nav).
2. `components/chrome/MobileDrawer.tsx` → add to `NAV` const (mobile drawer).

The duplication is deliberate friction. It's small, but big enough that adding a third or fourth top-level surface doesn't sneak past mobile review. If at some point that friction outweighs the safety, the two NAV constants can merge into a shared module — but **only** if the desktop chrome stays in its own file.

---

## 4. Responsive page bodies

Page bodies use Tailwind responsive classes. The only breakpoint that matters for our parallel-shell pattern is **`lg:` (1024px)** — that's the divide between mobile-shell layouts and desktop-shell layouts in the page body's reflow.

Common patterns shipped in v2.5.0:

### 4.1 Tab strips that overflow

Multi-tab navigation (e.g. `/directive`, `/settings`, entity detail) uses:

```tsx
<nav className="flex gap-1 border-b border-border overflow-x-auto scroll-x lg:flex-wrap whitespace-nowrap">
```

Mobile: scrolls horizontally on a single row. Desktop: wraps onto multiple rows when there are many tabs.

### 4.2 Filter bars that wrap

The entities filter bar (`/entities`) wraps onto multiple rows on mobile via `flex-wrap`, with the search input growing to fill the first row and chips/filters wrapping to the second:

```tsx
<div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border flex-wrap">
  <div className="...flex-1 lg:max-w-[320px] min-w-[200px]">…search…</div>
  <div className="overflow-x-auto scroll-x w-full lg:w-auto">…chips…</div>
  <div className="hidden lg:block flex-1" /> {/* spacer hidden on mobile */}
  <div className="ms-auto lg:ms-0">…counter…</div>
</div>
```

### 4.3 KPI grids

KPI rows use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` so they stack on phones, two-up on tablets, N-up on desktop.

### 4.4 Tables

All tables sit inside an `overflow-x-auto` wrapper so a wide table (e.g. the entities grid with 9+ columns) scrolls horizontally on mobile rather than overflowing the viewport.

### 4.5 Modals

`components/ui/Modal.tsx` switches to a bottom-sheet pattern at `<sm`:
- Aligns to the bottom of the viewport instead of centered.
- Rounded top corners only.
- Body scrolls inside `max-h-90vh` so the close edge stays visible.
- `safe-area-pb` so iOS home indicator doesn't overlap content.

Desktop is unchanged — same centered card.

### 4.6 Charts

Recharts uses `ResponsiveContainer` for fluid resizing. The entity bar chart sets `minWidth` on its container and wraps in `overflow-x-auto`, so 14+ entities scroll horizontally on mobile rather than squishing.

---

## 5. CSS utilities (`app/globals.css`)

### 5.1 Safe-area utilities

```
.safe-area-pt   →  padding-top:    env(safe-area-inset-top)
.safe-area-pb   →  padding-bottom: env(safe-area-inset-bottom)
.safe-area-pl   →  padding-left:   env(safe-area-inset-left)
.safe-area-pr   →  padding-right:  env(safe-area-inset-right)
```

Pair with `viewport-fit=cover` (declared in `app/layout.tsx`) so the layout extends under iOS notches and the home indicator instead of leaving a white bar.

### 5.2 `.scroll-x`

Horizontal scroll wrapper with momentum scrolling on iOS and a thin scrollbar:

```css
overflow-x: auto;
-webkit-overflow-scrolling: touch;
scrollbar-width: thin;
```

### 5.3 `.touch-target`

Forces a 44×44 minimum hit area (iOS HIG). Used on small icon-only buttons that would otherwise be 32×32.

### 5.4 16-pixel input on mobile

```css
@media (max-width: 640px) {
  input, select, textarea { font-size: 16px; }
}
```

iOS Safari auto-zooms when an input < 16px is focused. Forcing 16px on mobile suppresses that behavior without changing desktop typography.

### 5.5 Body-scroll lock

```css
html[data-scroll-locked="true"] { overflow: hidden; touch-action: none; }
```

Toggled by `<MobileDrawer>` while open so the underlying page doesn't track the user's gesture.

---

## 6. Viewport meta

`app/layout.tsx` exports a `Viewport` config (Next 16 native pattern):

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};
```

`viewportFit: "cover"` is what enables the safe-area utilities above. `themeColor` keys both schemes so iOS Safari's chrome color matches the app theme without flashing.

---

## 7. Testing matrix

| Device                       | Cookie        | Shell    | Notes |
|------------------------------|---------------|----------|---|
| iPhone SE 1st gen (320×568)  | `mobile`      | Mobile   | Smallest current target. Drawer max-width caps at 80vw = 256px. |
| iPhone 17 Pro Max            | `mobile`      | Mobile   | Safe-area top + bottom inset. |
| iPad portrait (768×1024)     | `tablet`      | Desktop  | Desktop chrome at 768px is the design target. |
| iPad landscape (1024×768)    | `tablet`      | Desktop  | Same as portrait, more width. |
| Galaxy Tab S9                | `tablet`      | Desktop  | Same. |
| Pixel 8 (412×915)            | `mobile`      | Mobile   | Android Chrome with Sec-CH-UA-Mobile=?1. |
| Surface Pro / desktop Chrome | `desktop`     | Desktop  | Full chrome. |
| Anything via `?device=desktop` | `desktop`   | Desktop  | Override. |
| Anything via `?device=mobile`  | `mobile`    | Mobile   | Override. |
| Arabic (`dir=rtl`) on mobile | mobile        | Mobile   | Drawer slides from RIGHT (rtl:translate-x-full); ms/me logical props handle padding. |

For local QA, you don't need real devices — just navigate to any page with `?device=mobile` to flip the shell. Combine with browser devtools' device emulation for a realistic preview.

---

## 8. What's NOT shipped in v2.5.0 (intentional)

- **Mobile-specific page logic.** Page bodies are shared. If a future page needs a fundamentally different mobile layout (e.g. a wizard that's a single-screen form on desktop but a multi-step on mobile), that's an additive future feature — `useDeviceClass()` hook reading the cookie + branching. We didn't need it for the v2.5.0 surfaces.
- **Native app.** This is a responsive web app. iOS / Android native shells are not on the roadmap.
- **Offline mode.** No service worker. Mobile users still need network access.
- **Push notifications.** Not implemented at any tier.
- **Reduced data shapes for mobile.** API responses are the same on every shell.

---

## 9. Maintenance rules

1. **Never touch `DesktopShell.tsx` for a mobile fix.** If you find yourself wanting to, the fix belongs in the page body (with a `lg:` breakpoint) or in `MobileShell.tsx`.
2. **Always register a new top-level page in BOTH `Sidebar.tsx` and `MobileDrawer.tsx`.** The duplication is deliberate.
3. **Test every new modal at <`sm` width.** The bottom-sheet treatment in `Modal.tsx` covers most cases, but custom modal-like overlays (e.g. dropdown menus that aren't `<Modal>`) need explicit responsive treatment.
4. **`lg:` is the breakpoint that matters.** `sm:` and `md:` are fine to use within page bodies, but the desktop-vs-mobile divide is `lg:`. Don't introduce a custom breakpoint unless there's a strong reason.
5. **Verify the `mizan-device` cookie path.** Any new public route under `/(...)` should be matched by `middleware.ts` so it gets the cookie. The matcher excludes `_next/static`, `_next/image`, `/api/*`, `favicon.ico`, `robots.txt`, `sitemap.xml` — everything else flows through.
