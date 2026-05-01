import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

/**
 * Desktop chrome — extracted verbatim from the v2.4.x dashboard layout.
 *
 * The mobile shell (`MobileShell`) is a sibling of this component;
 * the dashboard layout (`app/(dashboard)/layout.tsx`) reads the
 * `mizan-device` cookie set by middleware and renders one or the
 * other. Tablets default to this shell — see middleware.ts comments.
 *
 * NOTHING about this component should change to support mobile.
 * Mobile changes live in MobileShell. That separation is the entire
 * point of the parallel-shell architecture introduced in v2.5.0.
 */
export function DesktopShell({
  children,
  initialDeploymentKind,
  initialDeploymentMode,
}: {
  children: ReactNode;
  /** v2.7.8 — server-resolved kind so the sidebar's first paint
   *  carries the right Council/Executive nav. Without this the
   *  Sidebar defaulted to Council and swapped after whoami(),
   *  visible as a 1-second flash on Executive deployments. */
  initialDeploymentKind: "council" | "executive";
  /** v2.7.8 — same idea for the directive entry. */
  initialDeploymentMode: "observation" | "directive";
}) {
  return (
    <div className="flex flex-col h-screen">
      {/*
        Skip-to-content link for keyboard / screen-reader users. WCAG 2.4.1
        Bypass Blocks. Visually hidden until focused; first focus stop on
        every page. Pressing Enter scrolls + focuses the main element.
      */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-council-strong focus:text-white focus:px-3 focus:py-2 focus:rounded-md focus:text-[12px] focus:font-semibold"
      >
        Skip to content
      </a>
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          initialDeploymentKind={initialDeploymentKind}
          initialDeploymentMode={initialDeploymentMode}
        />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto max-w-[1440px] px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
