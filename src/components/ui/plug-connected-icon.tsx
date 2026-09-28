"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import { useCallback } from "react";
import type { AnimatedIconProps } from "./types";
import { m, useAnimate } from "motion/react";

function PlugConnectedIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = useCallback(async () => {
      animate(
        ".plug-upper-part",
        {
          y: 2,
          x: -2,
        },
        {
          duration: 0.35,
          ease: "easeOut",
        },
      );

      animate(
        ".plug-lower-leg",
        {
          opacity: 0,
        },
        {
          duration: 0.35,
          ease: "easeOut",
        },
      );

      animate(
        ".plug-lower-part",
        {
          y: -2,
          x: 2,
        },
        {
          duration: 0.35,
          ease: "easeOut",
        },
      );
    }, [animate]);

    const stop = useCallback(async () => {
      animate(
        ".plug-upper-part, .plug-lower-leg, .plug-lower-part",
        {
          y: 0,
          x: 0,
          opacity: 1,
        },
        {
          duration: 0.3,
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
        <m.path stroke="none" d="M0 0h24v24H0z" fill="none" />
        {/* <m.path d="M20 16l-4 4" /> */}
        <m.path
          d="M7 12l5 5l-1.5 1.5a3.536 3.536 0 1 1 -5 -5l1.5 -1.5z"
          className="plug-lower-part"
        />
        <m.path
          d="M17 12l-5 -5l1.5 -1.5a3.536 3.536 0 1 1 5 5l-1.5 1.5z"
          className="plug-upper-part"
        />
        <m.path d="M3 21l2.5 -2.5" className="plug-lower-part" />
        <m.path d="M18.5 5.5l2.5 -2.5" className="plug-upper-part" />
        <m.path
          d="M10 11l-2 2"
          className="plug-lower-part plug-lower-leg"
        />
        <m.path
          d="M13 14l-2 2"
          className="plug-lower-part plug-lower-leg"
        />
        {/* <m.path d="M16 16l4 4" /> */}
      </m.svg>
    );
}

export default PlugConnectedIcon;
