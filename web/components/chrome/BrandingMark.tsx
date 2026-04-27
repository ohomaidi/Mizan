"use client";

import { useState } from "react";

/**
 * Shows the customer's uploaded logo if one is available, and otherwise falls
 * back to a 2-letter monogram built from the branding's short form. Used on
 * TopBar, consent pages, first-run wizard — anywhere we need a consistent
 * "customer mark" with automatic fallback.
 */
export function BrandingMark({
  branding,
  size = 12,
  className = "",
}: {
  branding: { shortEn: string; nameEn: string };
  /** Monogram font-size in px. The container scales with size (`size * 4`). */
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const monogram = branding.shortEn.slice(0, 2).toUpperCase() || "SP";
  const containerPx = size * 4;
  if (failed) {
    return (
      <div
        className={`shrink-0 rounded-md bg-[color:var(--council-primary-strong)] text-white grid place-items-center font-semibold tracking-wide ${className}`}
        style={{ height: containerPx, width: containerPx, fontSize: size }}
        aria-hidden
      >
        {monogram}
      </div>
    );
  }
  // Logo tile — the customer's logo renders on a small white rounded card in
  // every theme. This is deliberate: many government emblems (red shields,
  // dark heraldic emblems, etc.) are designed to sit on a light background
  // and contain their own interior fill. Presenting them on a white card in
  // dark mode looks intentional rather than "the logo has a bug." The card
  // picks up a subtle border in light mode so it doesn't disappear into the
  // light surface.
  return (
    <div
      className={`shrink-0 bg-white rounded-md overflow-hidden dark:border-0 border border-border/60 ${className}`}
      style={{ height: containerPx, width: containerPx, padding: Math.max(2, Math.round(size / 4)) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={branding.nameEn}
        src="/api/config/branding/logo"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
