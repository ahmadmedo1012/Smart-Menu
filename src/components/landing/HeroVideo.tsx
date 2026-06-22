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
      {/* Phone mockup frame — gradient border, shadow, same shape as HeroAnimation */}
      <div className="relative mx-auto w-[260px] h-[530px] rounded-[3rem] bg-gradient-to-b from-amber-400 to-amber-600 p-[3px] shadow-2xl shadow-amber-500/25 animate-float">
        {/* Frame depth overlay — subtle metallic shine */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-black/5 via-transparent to-white/10 pointer-events-none z-10" />

        {/* Inner screen — dark background, video fills it */}
        <div className="w-full h-full rounded-[2.6rem] bg-black overflow-hidden relative">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20 border border-white/[0.07]" />

          {/* Video fills the phone screen, hidden until loaded */}
          <video
            src="/hero-intro.mp4"
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={handleCanPlay}
            onError={handleError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: "center" }}
          />
        </div>
      </div>

      {/* Floating badges — same as HeroAnimation */}
      <div className="absolute -top-4 -right-4 gradient-border glass rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-500">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-400 animate-breath" />
          <span className="text-gray-800 dark:text-gray-100 text-[11px] font-semibold">
            مسح واطلب
          </span>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-4 gradient-border glass rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-700">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-500 text-[11px]">✓</span>
          <span className="text-gray-800 dark:text-gray-100 text-[11px] font-semibold">
            طلب عبر واتساب
          </span>
        </div>
      </div>
    </div>
  );
}
