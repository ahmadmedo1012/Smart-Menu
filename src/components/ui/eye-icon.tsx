"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function EyeIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      // Pupil contracts (blink effect)
      animate(
        ".eye-pupil",
        {
          scale: 0.7,
        },
        {
          duration: 0.15,
          ease: "easeOut",
        },
      );

      // Eye shape slightly narrows
      animate(
        ".eye-shape",
        {
          scaleY: 0.9,
        },
        {
          duration: 0.15,
          ease: "easeOut",
        },
      );
    }, [animate]);

    const stop = useCallback(async () => {
      animate(
        ".eye-pupil, .eye-shape",
        {
          scale: 1,
          scaleY: 1,
        },
        {
          duration: 0.2,
          ease: "easeInOut",
        },
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

        {/* Pupil */}
        <m.path
          d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"
          className="eye-pupil"
          style={{ transformOrigin: "50% 50%" }}
        />

        {/* Eye shape */}
        <m.path
          d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"
          className="eye-shape"
          style={{ transformOrigin: "50% 50%" }}
        />
      </m.svg>
    );
}

export default EyeIcon;
