import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { apiRequireRole } from "@/lib/auth/rbac";
import {
  getSystemConfig,
  setSystemConfig,
} from "@/lib/config/system-config";
import { resolveAppBaseUrl } from "@/lib/config/base-url";

/**
 * System config — domain / base URL override + redirect-URI hints.
 *
 *   GET  → current effective base URL + the stored override (if any)
 *          + the request's "auto-detected" host so the operator sees
 *          what /setup would have used + the redirect URIs each Azure
 *          app needs to point at.
 *   POST → patch the override (e.g. a new custom domain).
 *
 * Domain change wizard at Settings → System reads / writes this.
 *
 * v2.7.0.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  baseUrl: z.string().trim().max(300),
});

export async function GET() {
  const auth = await apiRequireRole("viewer");
  if (!auth.ok) return auth.response;

  const stored = getSystemConfig();
  const effective = await resolveAppBaseUrl();

  // What the request itself looks like — useful when the operator
  // is inspecting "what would auto-detect choose if I clear the
  // override?". Built without going through the override.
  let detected: string | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (/^(localhost|127\.)/i.test(host) ? "http" : "https");
      detected = `${proto}://${host}`;
    }
  } catch {
    /* not a request context — leave null */
  }

  return NextResponse.json({
    config: stored,
    effective,
    detected,
    redirectUris: {
      consent: `${effective}/api/auth/consent-callback`,
      userAuth: `${effective}/api/auth/user-callback`,
      directiveConsent: `${effective}/api/auth/directive-consent-callback`,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await apiRequireRole("admin");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const next = setSystemConfig(parsed.data);
  return NextResponse.json({ config: next });
}
