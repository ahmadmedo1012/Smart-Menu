"use client";

import { UtensilsCrossed, ChefHat, Coffee, Pizza, Star, CakeSlice, Soup } from "lucide-react";

export default function LottieAnimation() {
  return (
    <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] md:w-[480px] md:h-[480px] flex items-center justify-center mx-auto">
      {/* Outer rotating gradient ring */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-300/30 via-primary/20 to-amber-600/30 animate-spin-slow" />

      {/* Pulsing glow */}
      <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-amber-500/10 via-transparent to-primary/10 animate-pulse-glow" />

      {/* Glass plate container */}
      <div className="relative z-10 w-[80%] h-[80%] rounded-full bg-white/70 dark:bg-amber-950/40 backdrop-blur-2xl shadow-2xl shadow-primary/20 border border-white/50 dark:border-amber-800/30 flex items-center justify-center overflow-hidden">
        {/* Inner gradient */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-amber-300/10" />

        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />

        {/* Floating particles inside */}
        <div className="absolute size-2 rounded-full bg-amber-400/40 top-[20%] left-[30%] animate-float" />
        <div className="absolute size-3 rounded-full bg-primary/30 top-[60%] right-[25%] animate-float-delayed" />
        <div className="absolute size-1.5 rounded-full bg-amber-300/50 bottom-[30%] left-[35%] animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute size-2 rounded-full bg-amber-500/30 bottom-[45%] right-[35%] animate-float-delayed" style={{ animationDelay: "0.5s" }} />

        {/* Central SVG plate */}
        <svg viewBox="0 0 200 200" className="w-[60%] h-[60%] drop-shadow-xl" aria-hidden="true">
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--primary)" strokeWidth="2" opacity="0.2" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.12" />
          <circle cx="100" cy="100" r="72" fill="oklch(0.98 0.015 75)" stroke="var(--border)" strokeWidth="1" className="dark:fill-amber-950/40" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="var(--primary)" strokeWidth="0.75" opacity="0.15" strokeDasharray="4 4" />

          {/* Decorative dots */}
          <circle cx="85" cy="82" r="6" fill="oklch(0.62 0.14 55 / 0.4)" />
          <circle cx="118" cy="78" r="5" fill="oklch(0.55 0.12 145 / 0.35)" />
          <circle cx="108" cy="108" r="7" fill="oklch(0.6 0.10 35 / 0.3)" />
          <circle cx="88" cy="102" r="5" fill="oklch(0.62 0.14 55 / 0.3)" />
          <circle cx="98" cy="92" r="4" fill="oklch(0.7 0.08 70 / 0.4)" />
          <circle cx="112" cy="95" r="3" fill="oklch(0.5 0.15 25 / 0.3)" />

          {/* Steam wisps */}
          <g opacity="0.25">
            <path d="M90 68 Q88 56 93 48" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="d" values="M90 68 Q88 56 93 48;M90 68 Q95 52 89 42;M90 68 Q88 56 93 48" dur="3s" repeatCount="indefinite" />
            </path>
            <path d="M108 64 Q110 52 104 44" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
              <animate attributeName="d" values="M108 64 Q110 52 104 44;M108 64 Q104 48 108 38;M108 64 Q110 52 104 44" dur="4s" repeatCount="indefinite" />
            </path>
            <path d="M100 60 Q98 50 102 42" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="d" values="M100 60 Q98 50 102 42;M100 60 Q102 46 99 36;M100 60 Q98 50 102 42" dur="3.5s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>

        {/* Spinning conic gradient ring */}
        <div className="absolute inset-[8%] rounded-full animate-spin-slow pointer-events-none opacity-40"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, var(--primary) 120deg, transparent 240deg, transparent 360deg)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px))",
          }}
        />
      </div>

      {/* Floating icons */}
      <div className="absolute -top-2 left-6 sm:left-10 animate-float text-primary/50"><UtensilsCrossed className="size-7 sm:size-8" /></div>
      <div className="absolute -top-1 right-4 sm:right-8 animate-float-delayed text-amber-500/50"><ChefHat className="size-8 sm:size-9" /></div>
      <div className="absolute bottom-8 -left-1 sm:left-2 animate-float text-amber-600/40" style={{ animationDelay: "1s" }}><Coffee className="size-8 sm:size-9" /></div>
      <div className="absolute bottom-2 -right-2 sm:right-3 animate-float-delayed text-primary/40" style={{ animationDelay: "0.5s" }}><Pizza className="size-7 sm:size-8" /></div>
      <div className="absolute top-[45%] -left-3 sm:-left-1 animate-float text-primary/30" style={{ animationDelay: "0.3s" }}><CakeSlice className="size-6 sm:size-7" /></div>
      <div className="absolute top-[40%] -right-2 sm:-right-1 animate-float-delayed text-amber-500/30" style={{ animationDelay: "0.8s" }}><Star className="size-6 sm:size-7" /></div>
    </div>
  );
}
