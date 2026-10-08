/**
 * r129-F5: CountUp for the landing trust band — the RN twin of the web
 * src/components/ui/CountUp.tsx (itself the Madarek port), semantics kept:
 *
 *   · the REAL value renders by default and is the guaranteed fallback —
 *     animation only ever replaces it temporarily; it can never stick at 0
 *     and never fabricates a figure (the never-fake rule, r82);
 *   · numeric part animated with the web's eased cubic `1 - (1 - p)^3`
 *     over 1100ms (the web default duration);
 *   · formatting rides ONE cached Intl.NumberFormat('ar-LY') per decimal
 *     count — the same locale the web trust band counts with. Hermes'
 *     Intl covers ar-LY; if a host ever lacks it the formatter degrades
 *     to plain rounding (still the REAL number, never fake);
 *   · prefers-reduced-motion → the real value, no animation (web parity).
 *
 * RN adaptation: no IntersectionObserver — the count runs when the live
 * value first arrives (React Query resolves), which on this screen is the
 * band's entrance anyway.
 */
import { useEffect, useState } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";

/** The web CountUp default duration (ms). */
export const COUNTUP_DURATION_MS = 1100;

const formatters = new Map<number, Intl.NumberFormat>();

function formatterFor(decimals: number): Intl.NumberFormat | null {
  try {
    let fmt = formatters.get(decimals);
    if (!fmt) {
      fmt = new Intl.NumberFormat("ar-LY", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      formatters.set(decimals, fmt);
    }
    return fmt;
  } catch {
    // Intl or the ar-LY locale unavailable on this host — degrade to plain
    // rounding below; the real figure still renders.
    return null;
  }
}

function formatNumber(n: number, decimals: number, fmt: Intl.NumberFormat | null): string {
  if (fmt) return fmt.format(n);
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

/**
 * Returns the string to render for a marketing stat value (e.g. "+42").
 * Non-numeric values ("—") pass through untouched (the honest fallback).
 */
export function useCountUp(value: string, duration: number = COUNTUP_DURATION_MS): string {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const m = value.match(/([^\d]*)([\d.,]+)(.*)/);
    // Reduced motion or no numeric part → keep the real value, no animation.
    if (!m || !m[2] || reducedMotion) {
      setDisplay(value);
      return;
    }

    const prefix = m[1] ?? "";
    const numStr = m[2];
    const suffix = m[3] ?? "";
    const target = parseFloat(numStr.replace(/,/g, ""));
    const decimals = numStr.includes(".") ? (numStr.split(".")[1]?.length ?? 0) : 0;
    if (Number.isNaN(target)) {
      setDisplay(value);
      return;
    }
    const fmt = formatterFor(decimals);

    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      // always settle on the real value
      setDisplay(p < 1 ? `${prefix}${formatNumber(target * eased, decimals, fmt)}${suffix}` : value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reducedMotion]);

  return display;
}

/**
 * LTR isolate — the plain-text bidi-control twin of the web `.ln-mono`
 * `direction: ltr` rule: keeps "+42" (and its ar-LY digits) in left-to-
 * right order inside the RTL paragraph on BOTH platforms (RN has no
 * direction style on Android).
 */
export function ltrIsolate(text: string): string {
  return `\u2066${text}\u2069`;
}
