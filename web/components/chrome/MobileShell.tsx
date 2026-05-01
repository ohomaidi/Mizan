"use client";

import { useState, type ReactNode } from "react";
import { MobileTopBar } from "./MobileTopBar";
import { MobileDrawer } from "./MobileDrawer";

/**
 * Mobile chrome (v2.5.0).
 *
 * Selected by the dashboard layout when the `mizan-device` cookie is
 * `mobile`. Tablets default to DesktopShell (the layout reads better
 * at 768px+); a tablet user can opt into mobile chrome via the
 * `?device=mobile` URL override (see middleware.ts).
 *
 * Component shape mirrors DesktopShell — same children prop, same
 * outer flex column + main element. Only the chrome differs:
 *   - Desktop: TopBar + persistent Sidebar
 *   - Mobile:  MobileTopBar with hamburger + off-canvas Drawer
 *
 * Page bodies are SHARED between the two shells. A page like
 * `/maturity/page.tsx` renders identically inside either shell —
 * the responsive reflow within the page body is handled by Tailwind
 * `lg:` breakpoints (so the same DOM works for both desktop and
 * mobile shells without duplication).
 */
export function MobileShell({
  children,
  initialDeploymentKind,
  initialDeploymentMode,
}: {
  children: ReactNode;
  /** v2.7.8 — server-resolved kind/mode threaded through to the
   *  drawer so its first paint carries the right Council/Executive
   *  nav and the directive entry shows correctly. Without this, the
   *  mobile drawer defaulted to a Council-only NAV regardless of
   *  deployment kind, and the directive entry only appeared after
   *  whoami() resolved on the client. */
  initialDeploymentKind: "council" | "executive";
  initialDeploymentMode: "observation" | "directive";
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-council-strong focus:text-white focus:px-3 focus:py-2 focus:rounded-md focus:text-[12px] focus:font-semibold"
      >
        Skip to content
      </a>

      <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialDeploymentKind={initialDeploymentKind}
        initialDeploymentMode={initialDeploymentMode}
      />

      {/* Mobile main: full-width, narrower padding than desktop. The
          extra safe-area-pb covers the iOS home indicator on
          notch-free phones. min-h-0 lets the content scroll inside
          the flex column rather than the page. */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 min-h-0 focus:outline-none safe-area-pl safe-area-pr safe-area-pb"
      >
        <div className="px-4 py-5">{children}</div>
      </main>
    </div>
  );
}
