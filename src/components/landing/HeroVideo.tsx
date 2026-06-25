"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HeroAnimation from "./HeroAnimation";

export default function HeroVideo() {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  const handleCanPlay = useCallback(() => {
    setLoaded(true);
    // Fade in smoothly
    requestAnimationFrame(() => setVideoOpacity(1));
  }, []);

  const handleError = useCallback(() => {
    setErrored(true);
  }, []);

  if (errored) {
    return <HeroAnimation />;
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Ambient glow behind phone — soft premium aura */}
      <div className="absolute -inset-6 md:-inset-10 rounded-full opacity-70 pointer-events-none"
        style={{
          background: "var(--frame-glow)",
          filter: "blur(60px)",
          transform: "translateZ(0)",
        }}
      />

      {/* Phone wrapper */}
      <div className="animate-float" style={{ animationDuration: "4.5s" }}>
        <div className="relative mx-auto max-w-[260px] w-[80vw]">
          {/* ——— Outer Bezel ——— */}
          <div
            className="relative w-full rounded-[2.8rem] p-[3px] shadow-frame-premium"
            style={{
              background: "var(--frame-gradient)",
            }}
          >
            {/* Bezel metallic shine overlay */}
            <div
              className="absolute inset-0 rounded-[2.8rem] pointer-events-none z-10"
              style={{
                background: "var(--frame-highlight)",
              }}
            />

            {/* Camera lens — top-right on screen */}
            <div className="absolute -top-[1px] -right-[1px] z-30 w-12 h-12 rounded-[2.8rem] bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center pointer-events-none">
              <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-blue-400 to-blue-900 border border-white/10 shadow-inner" />
            </div>

            {/* ——— Inner Screen / Bezel cutout ——— */}
            <div className="relative w-full h-[530px] rounded-[2.5rem] bg-black overflow-hidden">
              {/* Screen glass reflection — subtle diagonal sweep */}
              <div
                className="absolute inset-0 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 60%, rgba(255,255,255,0.02) 100%)",
                }}
              />

              {/* Screen edge glow — inner rim light */}
              <div
                className="absolute inset-0 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              />

              {/* Dynamic Island */}
              <div className="absolute top-2.5 start-1/2 -translate-x-1/2 w-[88px] h-[24px] bg-black rounded-full z-30 border border-white/[0.06] shadow-sm">
                {/* Camera dot */}
                <div className="absolute end-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500/70" />
              </div>

              {/* Loading skeleton */}
              {!loaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
                  <div className="skeleton size-16 rounded-full" />
                  <div className="skeleton h-3 w-32 rounded-full" />
                </div>
              )}

              {/* Video — fills inner screen */}
              <video
                ref={videoRef}
                src="/hero-intro.mp4"
                poster="/hero-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                onCanPlay={handleCanPlay}
                onError={handleError}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out"
                style={{
                  opacity: videoOpacity,
                  objectPosition: "center",
                }}
              />

              {/* Bottom screen edge reflection */}
              <div
                className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  background: "linear-gradient(to top, rgba(255,255,255,0.03) 0%, transparent 100%)",
                }}
              />
            </div>

            {/* Inner bezel rim — precision cut line */}
            <div
              className="absolute inset-[3px] rounded-[2.5rem] ring-1 ring-inset ring-white/[0.1] pointer-events-none z-20"
            />
          </div>
        </div>
      </div>

      {/* Floating badge — top-left */}
      <div className="absolute -top-4 -end-4 glass-card rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-500 border-blue-300/20 dark:border-blue-500/20">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500 animate-breath" />
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            مسح واطلب
          </span>
        </div>
      </div>

      {/* Floating badge — bottom-left */}
      <div className="absolute -bottom-4 -start-4 glass-card rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-[700ms] border-blue-300/20 dark:border-blue-500/20">
        <div className="flex items-center gap-1.5">
          <svg className="size-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            طلب عبر واتساب
          </span>
        </div>
      </div>
    </div>
  );
}
