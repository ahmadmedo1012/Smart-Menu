"use client";

import { useState, useCallback } from "react";
import HeroAnimation from "./HeroAnimation";

export default function HeroVideo() {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleCanPlay = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setErrored(true), []);

  if (errored) {
    return <HeroAnimation />;
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Skeleton placeholder — shown until video loads */}
      {!loaded && (
        <div className="relative mx-auto w-[260px] h-[530px] rounded-[3rem] bg-muted/30 animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground/50 text-sm font-medium">
            Hero Video
          </div>
        </div>
      )}

      {/* Video element — renders once MP4 is available */}
      <video
        src="/hero-intro.mp4"
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={handleCanPlay}
        onError={handleError}
        className={`mx-auto w-[260px] h-[530px] rounded-[3rem] object-cover shadow-2xl shadow-amber-500/25 transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
        style={{ display: loaded ? "block" : "none" }}
      />
    </div>
  );
}
