import { NextResponse, type NextRequest } from "next/server";

/**
 * Device-class detection middleware (v2.5.0).
 *
 * Sets a `mizan-device` cookie on every request based on the User-Agent
 * header. The dashboard layout reads this cookie server-side and renders
 * either the desktop chrome (untouched from v2.4.x) or the mobile chrome
 * (drawer + compact topbar). Page bodies are shared — only the shell
 * differs, which keeps maintenance to one codebase.
 *
 *   `mizan-device` ∈ { "desktop", "tablet", "mobile" }
 *
 * Tablets get desktop chrome by default — the layout reads naturally on
 * iPad portrait at 768px and the customer base sees them on full
 * dashboards. An operator who prefers mobile chrome on a tablet can
 * override with `?device=mobile` (see below).
 *
 * Override via query string: `?device=desktop|mobile|tablet` writes the
 * cookie with that value and persists across navigation. Useful for:
 *   - QA: testing both shells from a single browser without spoofing UA
 *   - Demo presenters who want the mobile shell on a projector
 *   - Customer escalations: "show me what your phone sees"
 *
 * Cookie is HttpOnly: false on purpose — client components occasionally
 * need to read it (e.g. a future "you're viewing the mobile site, switch
 * to desktop" link in the topbar). SameSite: Lax + a 1-year max-age so
 * the choice survives a session restart but the auth gate still drives
 * actual access control.
 *
 * The matcher excludes static assets, the Next internal `_next/*` path,
 * API routes (cookie isn't useful there), and the favicon. Everything
 * else flows through, including the auth pages (login/setup) so the
 * mobile chrome wraps those too.
 */

const COOKIE_NAME = "mizan-device";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type DeviceClass = "desktop" | "tablet" | "mobile";

/**
 * UA classification — kept deliberately simple. Most "fancy" UA parsers
 * pull in 100+ KB of regex tables; for our needs three substring checks
 * + a tablet override is enough. iPadOS 13+ identifies as Mac in the UA
 * string, so we additionally fall back to the `Sec-CH-UA-Mobile` Client
 * Hint when present (Chromium-based browsers send it; Safari does not).
 *
 * Order matters: tablet must be checked BEFORE mobile because Android
 * tablets typically include the word "Mobile" in their UA too.
 */
function classifyUserAgent(req: NextRequest): DeviceClass {
  const ua = req.headers.get("user-agent") ?? "";
  const chMobile = req.headers.get("sec-ch-ua-mobile");

  // Explicit Client Hint trumps UA sniffing when present.
  if (chMobile === "?1") {
    // Browser self-reports as mobile. Could still be a tablet — check UA.
    if (/iPad|Tablet|PlayBook|Nexus 7|Nexus 10|KFAPWI/i.test(ua)) {
      return "tablet";
    }
    return "mobile";
  }
  if (chMobile === "?0") {
    return "desktop";
  }

  // iPad on iOS 13+: UA says "Macintosh; Intel Mac OS X" with multi-touch
  // points. We don't have access to navigator.maxTouchPoints in middleware,
  // so we trust the UA — desktop classification is the safe fallback for
  // any "Mac OS" UA. Real iPads in Chrome/Edge get the chMobile hint.
  if (
    /iPad|Tablet|PlayBook|Nexus 7|Nexus 10|KFAPWI|SM-T|GT-P/i.test(ua)
  ) {
    return "tablet";
  }
  if (/Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile";
  }
  // Plain "Android" without "Mobile" → tablet on Android convention.
  if (/Android/i.test(ua)) {
    return "tablet";
  }
  return "desktop";
}

function isValidOverride(v: string | null): v is DeviceClass {
  return v === "desktop" || v === "tablet" || v === "mobile";
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const override = url.searchParams.get("device");
  const existing = req.cookies.get(COOKIE_NAME)?.value;

  let device: DeviceClass;
  let mustWrite = false;

  if (isValidOverride(override)) {
    device = override;
    mustWrite = device !== existing;
  } else if (existing && isValidOverride(existing)) {
    // Trust the existing cookie — avoids re-classifying every request.
    device = existing;
  } else {
    device = classifyUserAgent(req);
    mustWrite = true;
  }

  // If a `?device=` override was used, strip it from the visible URL
  // (cosmetic — the cookie now carries the choice). Skip this when
  // there's no override to avoid an unnecessary redirect roundtrip.
  if (override && isValidOverride(override)) {
    const cleanUrl = url.clone();
    cleanUrl.searchParams.delete("device");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, device, {
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  const res = NextResponse.next();
  if (mustWrite) {
    res.cookies.set(COOKIE_NAME, device, {
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}

/**
 * Match every page request, skip:
 *   - _next/* (build assets)
 *   - api/* (server-only, cookie irrelevant)
 *   - favicon, robots.txt, sitemap.xml, public assets
 *
 * The negative lookahead pattern is the Next.js-recommended exclusion;
 * it's evaluated at edge runtime per request so stays cheap.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
