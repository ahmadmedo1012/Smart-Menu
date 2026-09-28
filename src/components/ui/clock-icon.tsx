"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.

import type { AnimatedIconProps } from "./types";
import { m, useAnimate } from "motion/react";

function ClockIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = async () => {
      await animate(
        ".clock-hands",
        {
          rotate: 360,
        },
        {
          duration: 1,
          ease: "easeInOut",
        },
      );
    };

    const stop = async () => {
      await animate(
        ".clock-hands",
        {
          rotate: 0,
        },
        {
          duration: 1,
          ease: "easeInOut",
        },
      );
    };

    const handleHoverStart = () => {
      start();
    };

    const handleHoverEnd = () => {
      stop();
    };

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
        className={`${className} cursor-pointer`}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      >
        <m.path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <m.path
          d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
          className="clock-body"
        />
        <m.path d="M12 7v5l3 3" className="clock-hands" />
      </m.svg>
    );
}

export default ClockIcon;
