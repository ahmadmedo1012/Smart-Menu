"use client";

import { useRef, useEffect, memo } from "react";
import { useReducedMotion } from "motion/react";
import { DotLottiePlayer, type DotLottieCommonPlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

type LottieAnimationProps = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  /** When false, the animation is paused (imperative pause() on the player instance). */
  playing?: boolean;
  onComplete?: () => void;
};

const LottieAnimation = memo(function LottieAnimation({
  src,
  className = "",
  loop = false,
  autoplay = true,
  speed = 1,
  playing = true,
  onComplete,
}: LottieAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playerRef = useRef<DotLottieCommonPlayer | null>(null);
  // Canvas/WebGL — CSS prefers-reduced-motion doesn't stop it; gate explicitly.
  const reducedMotion = useReducedMotion();
  const effectiveLoop = reducedMotion ? false : loop;
  const effectiveAutoplay = reducedMotion ? false : autoplay;

  useEffect(() => {
    if (!playing) playerRef.current?.pause();
  }, [playing]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onComplete) return;

    const observer = new MutationObserver(() => {
      const completed = el.querySelector("[data-completed]");
      if (completed) onComplete();
    });

    observer.observe(el, { attributes: true, subtree: true });
    return () => observer.disconnect();
  }, [onComplete]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <DotLottiePlayer
        ref={playerRef}
        src={src}
        loop={effectiveLoop}
        autoplay={effectiveAutoplay}
        speed={speed}
      />
    </div>
  );
});

export { LottieAnimation, type LottieAnimationProps };
