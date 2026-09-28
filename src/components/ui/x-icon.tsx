"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m, useAnimate } from "motion/react";

function XIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      // Rotate the X icon slightly and add a scale effect
      animate(
        ".x-line-1",
        {
          rotate: 15,
          scale: 1.1,
        },
        {
          duration: 0.2,
          ease: "easeOut",
        },
      );

      animate(
        ".x-line-2",
        {
          rotate: -15,
          scale: 1.1,
        },
        {
          duration: 0.2,
          ease: "easeOut",
        },
      );
    }, [animate]);

    const stop = useCallback(async () => {
      animate(
        ".x-line-1",
        {
          rotate: 0,
          scale: 1,
        },
        {
          duration: 0.2,
          ease: "easeInOut",
        },
      );

      animate(
        ".x-line-2",
        {
          rotate: 0,
          scale: 1,
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

        {/* First line (top-left to bottom-right) */}
        <m.path
          d="M18 6l-12 12"
          className="x-line-1"
          style={{ transformOrigin: "50% 50%" }}
        />

        {/* Second line (bottom-left to top-right) */}
        <m.path
          d="M6 6l12 12"
          className="x-line-2"
          style={{ transformOrigin: "50% 50%" }}
        />
      </m.svg>
    );
}

export default XIcon;
