"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {CheckCircle, AlertCircle, Info, ShoppingCart, LogOut, LogIn, Star, Gift, RefreshCw, Save, Trash2, Copy} from 'lucide-react';
import AnimatedX from '@/components/ui/x-icon';
import ShoppingCartIcon from '@/components/ui/shopping-cart-icon';
import type { AnimatedIconHandle } from '@/components/ui/types';
import { cn } from "@/lib/utils";

// round86-B1: the animated cart toast used to render LottieAnimation here —
// the FIRST add-to-cart tap lazily pulled the dotlottie runtime (~172KB JS /
// ~55KB gz) plus the .lottie asset, exactly at the moment a phone customer
// first interacts with the menu. The lightweight motion-based ShoppingCartIcon
// (~2KB) keeps the same delightful bounce with zero network cost.

type ToastIcon = "success" | "error" | "info" | "cart" | "login" | "logout" | "star" | "gift" | "refresh" | "save" | "trash" | "copy";

const iconConfig = {
  success: { icon: CheckCircle, bg: "bg-success/12", color: "var(--success, #7FD39A)" },
  error: { icon: AlertCircle, bg: "bg-destructive/12", color: "var(--destructive, #F0938F)" },
  info: { icon: Info, bg: "bg-orange-muted", color: "var(--orange, #E9B44C)" },
  cart: { icon: ShoppingCart, bg: "bg-orange-muted", color: "var(--orange, #E9B44C)" },
  login: { icon: LogIn, bg: "bg-success/12", color: "var(--success, #7FD39A)" },
  logout: { icon: LogOut, bg: "bg-muted", color: "var(--muted-foreground)" },
  star: { icon: Star, bg: "bg-warning/12", color: "var(--warning, #ECC97D)" },
  gift: { icon: Gift, bg: "bg-orange-muted", color: "var(--orange, #E9B44C)" },
  refresh: { icon: RefreshCw, bg: "bg-orange-muted", color: "var(--orange, #E9B44C)" },
  save: { icon: Save, bg: "bg-success/12", color: "var(--success, #7FD39A)" },
  trash: { icon: Trash2, bg: "bg-destructive/12", color: "var(--destructive, #F0938F)" },
  copy: { icon: Copy, bg: "bg-orange-muted", color: "var(--orange, #E9B44C)" },
} as const;

function ToastIcon({ icon, anim }: { icon: ToastIcon; anim?: boolean }) {
  const cfg = iconConfig[icon];

  // round86-B1: animated cart = lightweight motion icon (no dotlottie download)
  if (anim && icon === "cart") {
    return <AnimatedCartToastIcon />;
  }

  const Icon = cfg.icon;
  return (
    <div className={cn("size-10 min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
      <Icon className="size-[18px]" style={{ color: cfg.color }} aria-hidden="true" />
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
    <div className="size-10 min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center shrink-0 bg-orange-muted">
      <ShoppingCartIcon
        ref={ref}
        size={22}
        className="text-[var(--orange, #E9B44C)]"
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
        role="alert"
        /* r119-S5-P2: role="alert" already implies aria-live="assertive" —
           the previous explicit aria-live="polite" contradicted it and made
           AT behavior browser-dependent. role=alert alone is the correct,
           unambiguous contract for actionable toasts. */
        onClick={() => toast.dismiss(t)}
        className="pointer-events-auto flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/40 bg-card/95 p-4 shadow-xl backdrop-blur-xl rtl:flex-row-reverse animate-slide-up"
        style={{ animationDuration: "0.35s" }}
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
    { duration: opts?.duration ?? 4000 },
  );
}
