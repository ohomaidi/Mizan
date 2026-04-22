import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/chrome/TopBar";
import { Sidebar } from "@/components/chrome/Sidebar";
import { requireUser } from "@/lib/auth/rbac";
import { getSetupState } from "@/lib/config/setup-config";

// Layout auth-gates all dashboard pages. Force dynamic so the requireUser()
// check runs on every request — otherwise Next.js caches the layout at build
// time while auth is still unconfigured, and enforcing auth later would never
// take effect for pre-rendered pages.
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
  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
