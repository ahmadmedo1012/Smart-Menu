"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback, useRef } from "react";
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function MapPinIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();
    const isAnimatingRef = useRef(false);

    const start = useCallback(async () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      while (isAnimatingRef.current) {
        // High-Intensity Beacon Pulse (Opacity ONLY, NO Scale, NO Motion)
        await animate(
          ".pin-dot",
          { opacity: [1, 0.4, 1] },
          { duration: 0.6, ease: "easeInOut" },
        );
        if (!isAnimatingRef.current) break;
      }
    }, [animate]);

    const stop = useCallback(() => {
      isAnimatingRef.current = false;
      animate(".pin-dot", { opacity: 1 }, { duration: 0.3 });
    }, [animate]);

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
        {/* Pin Body - Perfectly Static */}
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />

        {/* Inner Dot - The Beacon */}
        <m.circle className="pin-dot" cx="12" cy="10" r="3" />
      </m.svg>
    );
}

export default MapPinIcon;
