"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

/*
 * r131-F4 (A1 P1-15 / R131 fleet ruling "toasts bottom-end + hairline +
 * 28px well"): the ONE Toaster shell for both route groups — the config was
 * duplicated inline with position="top-center" + richColors (sonner's own
 * off-family green/red palette on any default-rendered toast).
 *   · Bottom-end in an RTL app = the inline-end corner = physical
 *     bottom-LEFT (sonner's position prop is physical; dir=rtl flips the
 *     card internals, not the anchor) — madarek .toast-stack anchors
 *     inset-inline-end, which is the left edge under dir=rtl.
 *   · richColors dropped — branded cards (premiumToast) carry their own
 *     token styling; default-rendered toasts get the themed card below.
 *   · Arabic container label (sonner ships English "Notifications"),
 *     theme-aware for default cards, pinned to the --z-toast rung (sonner
 *     ships 999999999), entrance on the reveal token + --ease-out.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-left"
      dir="rtl"
      containerAriaLabel="الإشعارات"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      closeButton
      style={{ zIndex: "var(--z-toast, 500)" }}
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          animation:
            "slide-up var(--motion-duration-reveal, 360ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
          borderRadius: "var(--r-lg, 12px)",
          padding: "8px",
        },
      }}
    />
  );
}
