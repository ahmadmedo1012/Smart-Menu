"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {CheckCircle2, AlertCircle, Info, ShoppingCart, LogOut, LogIn, Star, Gift, RefreshCw, Save, Trash2, Copy} from 'lucide-react';
import AnimatedX from '@/components/ui/x-icon';
import ShoppingCartIcon from '@/components/ui/shopping-cart-icon';
import type { AnimatedIconHandle } from '@/components/ui/types';
import { cn } from "@/lib/utils";

// round86-B1: the animated cart toast used to render LottieAnimation here —
// the FIRST add-to-cart tap lazily pulled the dotlottie runtime (~172KB JS /
// ~55KB gz) plus the .lottie asset, exactly at the moment a phone customer
// first interacts with the menu. The lightweight motion-based ShoppingCartIcon
// (~2KB) keeps the same delightful bounce with zero network cost.

/* r131-F4 (A1 P0-9 + A11 SM-4 — fleet toast canon):
 *   · icon well 28px (size-7) r-md, PASTEL solid —soft ground + -ink glyph
 *     (was a 40px /12 translucent wash well).
 *   · status coding = the 1px inline-start HAIRLINE (v22 ruling #4: the card
 *     border stays 1px; only border-inline-start-color flips per kind —
 *     success/error/warning → status inks, gold kinds → accent, logout
 *     stays neutral).
 *   · solid surface card (bg-card), r-lg 16, --elev-3.
 *   · error/trash (the role=alert family) are MANUAL-DISMISS ONLY
 *     (duration Infinity — the failure reason never auto-vanishes).
 *   · rtl:flex-row-reverse dropped — DOM order is logical, sonner's dir=rtl
 *     lays the icon at inline-START; the old physical flip double-reversed
 *     the card (icon parked on the inline-END edge, A1 P1-15).
 *   · entrance rides the ladder: --t-slow 380ms on the slide-up keyframe
 *     (reduced-motion zeroing flows through the token automatically).
 *
 * Phase 5 (r152): the var() fallbacks match the :root LIGHT roster (the
 * default theme) — sage/amber/warm-steel/deep-rose inks, never the retired
 * night luminous values. */

type ToastIcon = "success" | "error" | "info" | "cart" | "login" | "logout" | "star" | "gift" | "refresh" | "save" | "trash" | "copy";

const iconConfig = {
  success: { icon: CheckCircle2, bg: "bg-(--success-soft)", color: "var(--success-ink, #2E5230)", hairline: "var(--success)" },
  error:   { icon: AlertCircle,  bg: "bg-(--danger-soft)",  color: "var(--danger-ink, #8E2F3D)",   hairline: "var(--destructive)" },
  info:    { icon: Info,         bg: "bg-(--gold-soft)",    color: "var(--gold-ink, #7A5210)",     hairline: "var(--orange)" },
  cart:    { icon: ShoppingCart, bg: "bg-(--gold-soft)",    color: "var(--gold-ink, #7A5210)",     hairline: "var(--orange)" },
  login:   { icon: LogIn,        bg: "bg-(--success-soft)", color: "var(--success-ink, #2E5230)", hairline: "var(--success)" },
  logout:  { icon: LogOut,       bg: "bg-muted",            color: "var(--muted-foreground)",     hairline: undefined },
  star:    { icon: Star,         bg: "bg-(--warning-soft)", color: "var(--warning-ink, #7A5210)", hairline: "var(--warning)" },
  gift:    { icon: Gift,         bg: "bg-(--gold-soft)",    color: "var(--gold-ink, #7A5210)",     hairline: "var(--orange)" },
  refresh: { icon: RefreshCw,    bg: "bg-(--gold-soft)",    color: "var(--gold-ink, #7A5210)",     hairline: "var(--orange)" },
  save:    { icon: Save,         bg: "bg-(--success-soft)", color: "var(--success-ink, #2E5230)", hairline: "var(--success)" },
  trash:   { icon: Trash2,       bg: "bg-(--danger-soft)",  color: "var(--danger-ink, #8E2F3D)",   hairline: "var(--destructive)" },
  copy:    { icon: Copy,         bg: "bg-(--gold-soft)",    color: "var(--gold-ink, #7A5210)",     hairline: "var(--orange)" },
} as const;

/** The assertive family — role=alert + manual-dismiss (never auto-vanish). */
const ALERT_ICONS: readonly ToastIcon[] = ["error", "trash"];

function ToastIcon({ icon, anim }: { icon: ToastIcon; anim?: boolean }) {
  const cfg = iconConfig[icon];

  // round86-B1: animated cart = lightweight motion icon (no dotlottie download)
  if (anim && icon === "cart") {
    return <AnimatedCartToastIcon />;
  }

  const Icon = cfg.icon;
  return (
    // r131-F4: 28px pastel well (was size-10/40px) — madarek .toast-icon.
    <div className={cn("flex size-7 min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-md", cfg.bg)}>
      <Icon className="size-4" style={{ color: cfg.color }} aria-hidden="true" />
    </div>
  );
}

/** Cart toast icon that plays its bounce once on mount. */
function AnimatedCartToastIcon() {
  const ref = useRef<AnimatedIconHandle>(null);
  useEffect(() => {
    ref.current?.startAnimation();
  }, []);
  return (
    <div className="flex size-7 min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-md bg-(--gold-soft)">
      <ShoppingCartIcon
        ref={ref}
        size={18}
        className="text-[var(--gold-ink, #7A5210)]"
      />
    </div>
  );
}

export function premiumToast(
  icon: ToastIcon,
  title: string,
  description?: string,
  opts?: { duration?: number; anim?: boolean },
) {
  return toast.custom(
    (t) => (
      <div
        role={icon === 'error' || icon === 'trash' ? 'alert' : 'status'}
        /* r127-F3 (K-10): assertiveness is now tiered by kind. Blanket
           role="alert" made all 12 toast kinds assertive — routine
           confirmations (success/save/copy/cart/…) interrupted screen-reader
           users mid-task. Only error/trash (destructive outcomes needing
           immediate attention) stay role=alert (implies aria-live=assertive);
           every other kind is role=status (polite). No explicit aria-live —
           it would only contradict the implicit live politeness of each role
           (r119-S5-P2). */
        onClick={() => toast.dismiss(t)}
        className="pointer-events-auto flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-[var(--elev-3)] animate-slide-up"
        /* r131-F4: 1px status hairline on the inline-start edge (madarek v22
           ruling #4 — border stays 1px, only the inline-start COLOR flips by
           kind) + the ladder-timed entrance (--t-slow 380ms). */
        style={{
          animationDuration: 'var(--t-slow, 380ms)',
          borderInlineStartColor: iconConfig[icon].hairline,
        }}
      >
        <ToastIcon icon={icon} anim={opts?.anim ?? icon === "cart"} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }}
          className="shrink-0 size-8 min-h-[32px] min-w-[32px] rounded-md flex items-center justify-center hover:bg-muted transition-colors opacity-40 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-label="إغلاق"
        >
          <AnimatedX className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    ),
    /* r131-F4 (A11 SM-4): the alert family is manual-dismiss — the reason a
       save failed must stay on screen until the user reads it. */
    { duration: opts?.duration ?? (ALERT_ICONS.includes(icon) ? Infinity : 4000) },
  );
}
