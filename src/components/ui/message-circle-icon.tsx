"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function MessageCircleIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = async () => {
      // reset first
      animate(".message-path", { pathLength: 0, opacity: 0 }, { duration: 0 });

      await animate(
        ".message-path",
        { pathLength: [0, 1], opacity: [0, 1] },
        { duration: 0.6, ease: "easeInOut" },
      );

      animate(
        ".message-path",
        { scale: [1, 1.05, 1] },
        { duration: 0.3, ease: "easeOut" },
      );
    };

    const stop = () => {
      animate(
        ".message-path",
        { pathLength: 1, opacity: 1, scale: 1 },
        { duration: 0.2 },
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
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
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
        <m.path
          className="message-path"
          d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
          initial={{ pathLength: 1, opacity: 1 }}
          style={{ transformOrigin: "center" }}
        />
      </m.svg>
    );
}

export default MessageCircleIcon;
