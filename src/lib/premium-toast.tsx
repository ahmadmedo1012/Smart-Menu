"use client";

import { toast } from "sonner";
import { LottieAnimation } from "@/components/shared/LottieAnimation";
import {
  CheckCircle, AlertCircle, Info, ShoppingCart, LogOut,
  LogIn, Star, Gift, RefreshCw, Save, Trash2, Copy, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastIcon = "success" | "error" | "info" | "cart" | "login" | "logout" | "star" | "gift" | "refresh" | "save" | "trash" | "copy";

const iconConfig = {
  success: { icon: CheckCircle, bg: "bg-emerald-500/12", color: "var(--success, oklch(0.62 0.18 145))" },
  error: { icon: AlertCircle, bg: "bg-destructive/12", color: "var(--destructive, oklch(0.6 0.22 25))" },
  info: { icon: Info, bg: "bg-orange-muted", color: "var(--orange, oklch(0.55 0.19 45))" },
  cart: { icon: ShoppingCart, bg: "bg-orange-muted", color: "var(--orange, oklch(0.55 0.19 45))" },
  login: { icon: LogIn, bg: "bg-emerald-500/12", color: "var(--success, oklch(0.62 0.18 145))" },
  logout: { icon: LogOut, bg: "bg-muted", color: "var(--muted-foreground)" },
  star: { icon: Star, bg: "bg-amber-500/12", color: "var(--warning, oklch(0.7 0.16 80))" },
  gift: { icon: Gift, bg: "bg-orange-muted", color: "var(--orange, oklch(0.55 0.19 45))" },
  refresh: { icon: RefreshCw, bg: "bg-orange-muted", color: "var(--orange, oklch(0.55 0.19 45))" },
  save: { icon: Save, bg: "bg-emerald-500/12", color: "var(--success, oklch(0.62 0.18 145))" },
  trash: { icon: Trash2, bg: "bg-destructive/12", color: "var(--destructive, oklch(0.6 0.22 25))" },
  copy: { icon: Copy, bg: "bg-orange-muted", color: "var(--orange, oklch(0.55 0.19 45))" },
} as const;

function ToastIcon({ icon, anim }: { icon: ToastIcon; anim?: boolean }) {
  const cfg = iconConfig[icon];

  if (anim) {
    return (
      <div className="size-9 -my-1">
        <LottieAnimation src="/animations/restaurant-loading.lottie" autoplay loop={false} speed={1.5} />
      </div>
    );
  }

  const Icon = cfg.icon;
  return (
    <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
      <Icon className="size-[18px]" style={{ color: cfg.color }} />
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
        onClick={() => toast.dismiss(t)}
        className="pointer-events-auto flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/40 bg-card/95 p-3.5 shadow-xl backdrop-blur-xl rtl:flex-row-reverse animate-slide-up"
        style={{ animationDuration: "0.35s" }}
      >
        <ToastIcon icon={icon} anim={opts?.anim ?? icon === "cart"} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }}
          className="shrink-0 size-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors opacity-40 hover:opacity-100"
          aria-label="إغلاق"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    ),
    { duration: opts?.duration ?? 4000 },
  );
}
