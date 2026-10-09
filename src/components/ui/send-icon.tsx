"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function SendIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      await animate(
        ".send-icon",
        {
          x: [0, 24],
          y: [0, -24],
          opacity: [1, 0],
        },
        { duration: 0.25, ease: "easeIn" },
      );

      // instant reset
      await animate(".send-icon", { x: -24, y: 24 }, { duration: 0 });

      // come back
      await animate(
        ".send-icon",
        {
          x: [-24, 0],
          y: [24, 0],
          opacity: [0, 1],
        },
        { duration: 0.25, ease: "easeOut" },
      );
    }, [animate]);

    const stop = useCallback(() => {
      animate(".send-icon", { x: 0, y: 0, opacity: 1 }, { duration: 0.2 });
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
        <m.g className="send-icon" style={{ transformOrigin: "center" }}>
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M10 14l11 -11" />
          <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
        </m.g>
      </m.svg>
    );
}

export default SendIcon;
