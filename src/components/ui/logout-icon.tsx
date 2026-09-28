"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m, useAnimate } from "motion/react";

function LogoutIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      await animate(
        ".logout-arrow, .logout-arrow-bottom",
        {
          x: [0, 6, 0],
        },
        {
          duration: 0.3,
          ease: "easeInOut",
        },
      );
      animate(
        ".logout-door",
        {
          x: [0, -2, 0],
        },
        {
          duration: 0.25,
          ease: "easeOut",
        },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(
        ".logout-arrow, .logout-arrow-bottom, .logout-door",
        { x: 0 },
        { duration: 0.2, ease: "easeInOut" },
      );
    }, [animate]);

    return (
      <m.div
        ref={scope}
        className={`inline-flex cursor-pointer ${className}`}
        onHoverStart={start}
        onHoverEnd={stop}
      >
        <svg
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
          <m.path
            className="logout-door"
            style={{ transformOrigin: "50% 50%" }}
            d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"
          />

          <m.path className="logout-arrow" d="M9 12h12" />

          <m.path className="logout-arrow-bottom" d="M18 15l3 -3l-3 -3" />
        </svg>
      </m.div>
    );
}

export default LogoutIcon;
