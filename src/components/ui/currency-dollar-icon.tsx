"use client";
// r121-O-3: plain component — the forwardRef/useImperativeHandle imperative
// handle had zero external consumers (only shopping-cart-icon keeps one, for
// the cart-toast bounce in premium-toast). Hover animations are self-contained.
import type { AnimatedIconProps } from "./types";
import { m } from "motion/react";
import { useGuardedAnimate as useAnimate } from "./guarded-animate";

function CurrencyDollarIcon({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }: AnimatedIconProps) {
    const [scope, animate] = useAnimate();

    const start = async () => {
      await animate(
        ".usd-main, .usd-line",
        { pathLength: 0, opacity: 0 },
        { duration: 0 },
      );

      await animate(
        ".usd-line",
        { pathLength: 1, opacity: 1 },
        { duration: 0.25, ease: "easeOut" },
      );

      await animate(
        ".usd-main",
        { pathLength: 1, opacity: 1 },
        { duration: 0.4, ease: "easeOut" },
      );

      animate(
        ".usd-symbol",
        { scale: [0.96, 1] },
        { duration: 0.2, ease: "easeOut" },
      );
    };

    const stop = () => {
      animate(
        ".usd-main, .usd-line",
        { pathLength: 1, opacity: 1 },
        { duration: 0.2 },
      );
      animate(".usd-symbol", { scale: 1 }, { duration: 0.2 });
    };

    const handleHoverStart = () => {
      start();
    };

    const handleHoverEnd = () => {
      stop();
    };

    return (
      <m.div
        ref={scope}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
        className={`inline-flex cursor-pointer items-center justify-center ${className}`}
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
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <m.g
            className="usd-symbol"
            style={{ transformOrigin: "50% 50%" }}
          >
            <m.path
              className="usd-main"
              d="M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2"
              pathLength={1}
            />
            <m.path
              className="usd-line"
              d="M12 3v3m0 12v3"
              pathLength={1}
            />
          </m.g>
        </svg>
      </m.div>
    );
}

export default CurrencyDollarIcon;
