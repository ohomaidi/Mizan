"use client";

import { useEffect } from "react";
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

// Lightweight modal. No radix dep — the project pulls in radix selectively and we
// don't need focus-trap for an internal Council dashboard with keyboard-first users.
export function Modal({ open, onClose, title, children, footer, size = "default" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const width = size === "wide" ? "max-w-[560px]" : "max-w-[440px]";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
      />
      <div
        className={`relative w-full ${width} rounded-lg border border-border bg-surface-1 shadow-xl`}
      >
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[15px] font-semibold text-ink-1">{title}</div>
        </div>
        <div className="px-5 py-4 text-[13px] text-ink-2">{children}</div>
        {footer ? (
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
