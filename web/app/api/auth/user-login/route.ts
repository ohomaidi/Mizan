import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getLoginUrl } from "@/lib/auth/msal-user";
import { isAuthEnforced } from "@/lib/config/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Initiates the OIDC authorization-code flow. Stores a random `state` value
 * in a short-lived cookie that `/api/auth/user-callback` verifies, closing
 * the CSRF-on-callback loophole. Also records a `next` cookie so the post-
 * login redirect lands wherever the user was trying to reach.
 */
export async function GET(req: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const state = crypto.randomBytes(16).toString("base64url");
  const next = req.nextUrl.searchParams.get("next") ?? "/";

  const url = await getLoginUrl(state);
  const jar = await cookies();
  jar.set("scsc_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min — plenty for the round-trip
  });
  jar.set("scsc_oauth_next", next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
