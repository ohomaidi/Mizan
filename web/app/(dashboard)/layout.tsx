import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DesktopShell } from "@/components/chrome/DesktopShell";
import { MobileShell } from "@/components/chrome/MobileShell";
import { requireUser } from "@/lib/auth/rbac";
import { getSetupState } from "@/lib/config/setup-config";

// Layout auth-gates all dashboard pages. Force dynamic so the requireUser()
// check runs on every request — otherwise Next.js caches the layout at build
// time while auth is still unconfigured, and enforcing auth later would never
// take effect for pre-rendered pages.
//
// v2.5.0 — also reads the `mizan-device` cookie set by middleware.ts and
// renders DesktopShell or MobileShell. The desktop branch is byte-for-byte
// the same chrome as v2.4.x; the mobile branch is the new parallel shell.
// Page bodies are shared between both shells (responsive within the page
// where needed). Tablets default to desktop chrome.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Fresh installs (non-demo) get bounced to /setup until the first-run
  // wizard is done. The demo seed marks setup completed automatically.
  if (!getSetupState().completed) redirect("/setup");
  // Gate every /(dashboard)/* page. In demo mode (MIZAN_DEMO_MODE=true) and
  // during the bootstrap window (no real admin yet) this resolves immediately
  // to `ok` with a null user so showcase deployments + fresh installs aren't
  // locked out. Otherwise an unauthenticated request is bounced to /login.
  const result = await requireUser("viewer");
  if (result.kind === "redirect") redirect(result.to);

  // Server-side device class. Falls back to "desktop" when the cookie
  // is missing (e.g. first request before middleware has written, or
  // a request that bypassed the matcher). The "missing → desktop"
  // fallback preserves the v2.4.x experience for any edge case we
  // haven't accounted for.
  const device = (await cookies()).get("mizan-device")?.value;
  const useMobile = device === "mobile";

  return useMobile ? (
    <MobileShell>{children}</MobileShell>
  ) : (
    <DesktopShell>{children}</DesktopShell>
  );
}
