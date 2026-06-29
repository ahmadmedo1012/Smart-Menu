"use client";

import { toast } from "sonner";
import { LottieAnimation } from "@/components/shared/LottieAnimation";
import {
  CheckCircle, AlertCircle, Info, ShoppingCart, LogOut,
  LogIn, Star, Gift, RefreshCw, Save, Trash2, Copy, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastIcon = "success" | "error" | "info" | "cart" | "login" | "logout" | "star" | "gift" | "refresh" | "save" | "trash" | "copy";

function ToastIcon({ icon, anim }: { icon: ToastIcon; anim?: boolean }) {
  const iconMap: Record<ToastIcon, { icon: typeof CheckCircle; color: string }> = {
    success: { icon: CheckCircle, color: "text-emerald-500" },
    error: { icon: AlertCircle, color: "text-red-500" },
    info: { icon: Info, color: "text-orange" },
    cart: { icon: ShoppingCart, color: "text-orange" },
    login: { icon: LogIn, color: "text-emerald-500" },
    logout: { icon: LogOut, color: "text-muted-foreground" },
    star: { icon: Star, color: "text-amber-400" },
    gift: { icon: Gift, color: "text-orange" },
    refresh: { icon: RefreshCw, color: "text-orange" },
    save: { icon: Save, color: "text-emerald-500" },
    trash: { icon: Trash2, color: "text-red-500" },
    copy: { icon: Copy, color: "text-orange" },
  };

  const m = iconMap[icon];

  if (anim) {
    return (
      <div className="size-9 -my-1">
        <LottieAnimation src="/animations/restaurant-loading.lottie" autoplay loop={false} speed={1.5} />
      </div>
    );
  }

  const Icon = m.icon;
  return (
    <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", icon === "error" || icon === "trash" ? "bg-red-500/10" : icon === "success" ? "bg-emerald-500/10" : "bg-orange-muted")}>
      <Icon className={cn("size-4.5", m.color)} />
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
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }}
          className="shrink-0 size-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="إغلاق"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    ),
    { duration: opts?.duration ?? 4000 },
  );
}
