"use client";

import { useRef, useEffect, memo } from "react";
import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

type LottieAnimationProps = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  onComplete?: () => void;
};

const LottieAnimation = memo(function LottieAnimation({
  src,
  className = "",
  loop = false,
  autoplay = true,
  speed = 1,
  onComplete,
}: LottieAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);

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
        src={src}
        loop={loop}
        autoplay={autoplay}
        speed={speed}
      />
    </div>
  );
});

export { LottieAnimation, type LottieAnimationProps };
