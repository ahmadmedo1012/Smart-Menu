"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function SaveIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(() => {
      // 1. Single Clean Vertical Pulse (The "Store" action)
      animate(
        scope.current,
        { y: [0, -1, 0] },
        { duration: 0.4, ease: "easeInOut" },
      );

      // 2. Coordinated Label Pulse (The "Write success" flash)
      animate(
        ".save-label",
        { opacity: [1, 0.4, 1] },
        { duration: 0.4, ease: "easeInOut" },
      );
    }, [animate, scope]);

    const stop = useCallback(() => {
      animate(scope.current, { y: 0 }, { duration: 0.3 });
      animate(".save-label", { opacity: 1 }, { duration: 0.3 });
    }, [animate, scope]);

    return (
      <m.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
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
        style={{ overflow: "visible" }}
      >
        <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path
          className="save-shutter"
          d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
        />
        <m.path
          className="save-label"
          d="M7 3v4a1 1 0 0 0 1 1h7"
          style={{ transformOrigin: "center" }}
        />
      </m.svg>
    );
}

export default SaveIcon;
