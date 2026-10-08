"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/*
 * r131-F4 (A10 F2/SM-2 — Smart-Link pattern port): the browser/PWA chrome
 * tint follows the USER'S in-app theme, not the OS preference. The
 * media-bound theme-color metas in the group layouts keep their media
 * attributes (SSR + no-JS stay correct for the OS-matching case); this
 * component re-points their content to the resolved theme after mount.
 * Renders null — zero SSR markup, no flash, no LCP/CLS impact (SL
 * theme-color-sync.tsx, madarek index.html does the same at runtime).
 * Values are the FAMILY night/cream pair (#070B16 / #FBFAF9) — SM was the
 * only member tinting #191918 (A10 SM-2); manifest.json + lib/brand.ts now
 * carry the same pair.
 */
const BAR = { dark: "#070B16", light: "#FBFAF9" } as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    // resolvedTheme is undefined pre-hydration — silent skip (no flash).
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") return;
    const color = BAR[resolvedTheme];
    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]'
    )) {
      if (meta.content !== color) meta.content = color;
    }
  }, [resolvedTheme]);
  return null;
}
