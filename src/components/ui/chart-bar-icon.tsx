"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function ChartBarIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      animate(".bar-1", { scaleY: [0, 1] }, { duration: 0.3, ease: "easeOut" });
      animate(
        ".bar-2",
        { scaleY: [0, 1] },
        { duration: 0.3, ease: "easeOut", delay: 0.1 },
      );
      animate(
        ".bar-3",
        { scaleY: [0, 1] },
        { duration: 0.3, ease: "easeOut", delay: 0.2 },
      );
      animate(
        ".base-line",
        { scaleX: [1, 1.05, 1] },
        { duration: 0.4, ease: "easeInOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(
        ".bar-1 , .bar-2 , .bar-3",
        { scaleY: 1 },
        { duration: 0.2, ease: "easeInOut" },
      );
      animate(
        ".base-line",
        { scaleX: 1 },
        { duration: 0.2, ease: "easeInOut" },
      );
    }, [animate]);

    return (
      <m.svg
        ref={scope}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`cursor-pointer ${className}`}
        onHoverStart={start}
        onHoverEnd={stop}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />

        <m.path
          d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
          className="bar-1"
          style={{ transformOrigin: "6px 20px" }}
        />

        <m.path
          d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
          className="bar-2"
          style={{ transformOrigin: "12px 20px" }}
        />

        <m.path
          d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
          className="bar-3"
          style={{ transformOrigin: "18px 20px" }}
        />

        <m.path
          d="M4 20h14"
          className="base-line"
          style={{ transformOrigin: "11px 20px" }}
        />
      </m.svg>
    );
}

export default ChartBarIcon;
