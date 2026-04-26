"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  // Wider variant for forms.
  size?: "default" | "wide";
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight modal with WCAG-compliant focus management:
 *   - Focus moves to the first focusable element inside the modal on open.
 *   - Tab cycles within the modal (focus trap).
 *   - Esc closes (existing behaviour).
 *   - Focus returns to the previously-focused element on close.
 *   - aria-labelledby points at the title element so screen readers
 *     announce the modal's name on open.
 *   - role="dialog" + aria-modal="true" keep the page's content treated
 *     as inert by AT.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
}: Props) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Save the element that had focus before the modal opened so we can
    // restore it on close (WCAG 2.4.3 Focus Order + 2.4.7 Focus Visible).
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const focusFirst = () => {
      const el = containerRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? el).focus();
    };
    // Defer one frame so the DOM is committed before we look for focusables.
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const el = containerRef.current;
      if (!el) return;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((n) => !n.hasAttribute("data-modal-skip-focus"));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to where it came from. Guard against the previously-
      // focused element being unmounted while the modal was open.
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus();
        } catch {
          /* element no longer focusable — fine */
        }
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  // Desktop width caps. On mobile (<sm) the modal goes full-bleed so
  // long forms have room to breathe and small screens don't have a
  // tiny floating card with horizontal scrollbars. The breakpoint is
  // viewport-based (CSS-only) rather than cookie-based so the modal
  // stays correct in both shells AND if a desktop user resizes a
  // window narrow.
  const width = size === "wide" ? "sm:max-w-[560px]" : "sm:max-w-[440px]";

  return createPortal(
    <div
      // Mobile: align to bottom + no padding (full-bleed sheet).
      // Desktop (sm+): center in viewport with safe inset.
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        // Background dimmer doubles as the click-outside-to-close target.
        // It's reachable by Tab too (so keyboard users can close without
        // hunting for an X button), but we mark it `data-modal-skip-focus`
        // so the focus trap doesn't include it in its first/last computation
        // — that prevents the dimmer from being the "first" focused thing.
        data-modal-skip-focus="true"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />
      <div
        ref={containerRef}
        // Mobile: sticks to the bottom with rounded top corners (sheet
        // pattern), max height of 90vh so the user can always see the
        // backdrop / drag-handle area to dismiss. Body scrolls if
        // content overflows.
        // Desktop: original centered card unchanged.
        className={`relative w-full ${width} max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-lg border border-border bg-surface-1 shadow-xl safe-area-pb sm:pb-0`}
        tabIndex={-1}
      >
        <div className="px-5 py-4 border-b border-border shrink-0">
          <h2
            id={titleId}
            className="text-[15px] font-semibold text-ink-1 m-0"
          >
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 text-[13px] text-ink-2 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
        {footer ? (
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
