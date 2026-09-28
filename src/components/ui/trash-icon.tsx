"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m, useAnimate } from "motion/react";

/**
 * Resolve a CSS token (e.g. "--destructive") into a concrete color string that
 * framer-motion can interpolate. Uses a detached probe element + canvas
 * normalization; falls back to the :root token value for SSR/no-DOM contexts.
 */
function resolveTokenColor(token: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return fallback;
  try {
    const probe = document.createElement("span");
    probe.style.color = `var(${token})`;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    if (!computed) return fallback;
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.fillStyle = computed;
      return ctx.fillStyle; // normalized rgb/hex — safe for motion interpolation
    }
    return computed;
  } catch {
    return fallback;
  }
}

export interface TrashIconProps extends AnimatedIconProps {
  shakeOnClick?: boolean;
  dangerHover?: boolean;
  keepOpenOnDelete?: boolean;
}

function TrashIcon({ shakeOnClick = false, dangerHover = false, keepOpenOnDelete = false, size = 24, color = "currentColor", strokeWidth = 2, className = "", }: TrashIconProps) {
    const [scope, animate] = useAnimate();

    const openLid = useCallback(async () => {
      await Promise.all([
        animate(
          ".trash-lid-lower",
          { rotate: -25, y: -4 },
          { duration: 0.25, ease: "easeOut" },
        ),
        animate(
          ".trash-lid-upper",
          { rotate: -35, y: -6, x: -2 },
          { duration: 0.25, ease: "easeOut" },
        ),
      ]);
    }, [animate]);

    const closeLid = useCallback(async () => {
      await Promise.all([
        animate(
          ".trash-lid-lower",
          { rotate: 0, y: 0 },
          { duration: 0.2, ease: "easeInOut" },
        ),
        animate(
          ".trash-lid-upper",
          { rotate: 0, y: 0, x: 0 },
          { duration: 0.2, ease: "easeInOut" },
        ),
      ]);
    }, [animate]);

    const dangerHoverAnimation = useCallback(async () => {
      if (!dangerHover) return;

      await animate(
        ".trash-icon",
        { stroke: resolveTokenColor("--destructive", "oklch(0.6 0.22 25)") },
        { duration: 0.2, delay: 0.1, ease: "easeInOut" },
      );
    }, [animate, dangerHover]);

    const resetColor = useCallback(async () => {
      if (!dangerHover) return;

      await animate(
        ".trash-icon",
        { stroke: "currentColor" },
        { duration: 0.2, ease: "easeInOut" },
      );
    }, [animate, dangerHover]);

    const hoverAnimation = useCallback(async () => {
      await openLid();
      await dangerHoverAnimation();
    }, [openLid, dangerHoverAnimation]);

    const hoverEndAnimation = useCallback(async () => {
      resetColor();
      closeLid();
    }, [resetColor, closeLid]);

    const clickAnimation = useCallback(async () => {
      if (shakeOnClick) {
        await animate(
          ".trash-icon",
          { x: [0, -2, 2, -1, 0] },
          { duration: 0.25, ease: "easeInOut" },
        );
      }

      if (keepOpenOnDelete) {
        await openLid();
      }
    }, [shakeOnClick, keepOpenOnDelete, animate, openLid]);

    return (
      <m.svg
        ref={scope}
        className={`cursor-pointer ${className} trash-icon`}
        onHoverStart={hoverAnimation}
        onHoverEnd={hoverEndAnimation}
        onTap={clickAnimation}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />

        <m.path
          d="M4 7l16 0"
          className="trash-lid-lower"
          style={{ transformOrigin: "50% 100%" }}
        />

        <path d="M10 11l0 6" />
        <path d="M14 11l0 6" />
        <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />

        <m.path
          d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"
          className="trash-lid-upper"
          style={{ transformOrigin: "50% 100%" }}
        />
      </m.svg>
    );
}

export default TrashIcon;
