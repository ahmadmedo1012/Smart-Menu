"use client";

import { useRef, useCallback, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  tilt?: boolean;
  className?: string;
}

const CINEMATIC_EASE = [0.16, 1, 0.2, 1] as const;

/** Premium tilted phone mockup — black frame, orange accents, cinematic video.
 *  Double-bezel architecture, Dynamic Island, restaurant menu screen.
 *  Static content always base layer, video crossfades on top — no poster flash. */
export function PhoneMockup({ tilt = false, className }: PhoneMockupProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleCanPlay = useCallback(() => {
    requestAnimationFrame(() => setVideoLoaded(true));
  }, []);

  const handleError = useCallback(() => {
    setVideoError(true);
  }, []);

  const frame = (
    <div className={cn("relative mx-auto max-w-[280px] w-[75vw] lg:w-[22vw]", className)}>
      {/* Ambient glow — breathing */}
      <motion.div
        className="absolute -inset-20 rounded-full pointer-events-none"
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: CINEMATIC_EASE }}
        style={{
          background: "radial-gradient(ellipse at 50% 80%, oklch(0.68 0.19 45 / 0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Outer shell — double-bezel orange architecture */}
      <div
        className="relative w-full rounded-[3rem] p-[3px]"
        style={{
          background: "var(--frame-gradient)",
          boxShadow: "var(--frame-shadow-premium)",
        }}
      >
        {/* Bezel highlight edge */}
        <div
          className="absolute inset-0 rounded-[3rem] pointer-events-none z-10"
          style={{ background: "var(--frame-highlight)" }}
        />

        {/* Inner screen */}
        <div className="relative w-full aspect-[9/19.5] rounded-[2.8rem] bg-black overflow-hidden">
          {/* Glass reflection overlay */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.8rem]"
            style={{
              background:
                "linear-gradient(135deg, oklch(1 0 0 / 0.06) 0%, transparent 40%, transparent 60%, oklch(1 0 0 / 0.015) 100%)",
            }}
          />

          {/* Inner rim light */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.8rem]"
            style={{ boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.05)" }}
          />

          {/* Dynamic Island — camera dot */}
          <div className="absolute top-3 start-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-full z-30 border border-white/[0.03] shadow-sm">
            <div className="absolute end-[18px] top-1/2 -translate-y-1/2 size-[7px] rounded-full bg-orange/50" />
          </div>

          {/* Static screen content — always visible */}
          <ScreenContent />

          {/* Hero video — crossfades over static once loaded */}
          <motion.video
            ref={videoRef}
            src="/hero-intro.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={handleCanPlay}
            onError={handleError}
            className="absolute inset-0 w-full h-full z-15"
            style={{ objectFit: "contain" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: videoLoaded ? 1 : 0 }}
            transition={{ duration: 1.2, ease: CINEMATIC_EASE }}
          />

          {/* Fallback poster on error */}
          {videoError && (
            <img
              src="/hero-poster.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-contain z-15"
              loading="lazy"
            />
          )}

          {/* Bottom reflection gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none rounded-[2.8rem]"
            style={{
              background:
                "linear-gradient(to top, oklch(1 0 0 / 0.03) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Inner bezel rim */}
        <div className="absolute inset-[3px] rounded-[2.8rem] ring-1 ring-inset ring-white/[0.06] pointer-events-none z-20" />
      </div>
    </div>
  );

  if (!tilt) return frame;

  return (
    <div className={cn("relative w-full mx-auto", tilt && "md:scale-105 origin-center")}>
      <TiltWrapper>{frame}</TiltWrapper>
    </div>
  );
}

/** 3D tilt wrapper — ~12deg rotateY, 1000px perspective, 8s Y-axis float */
function TiltWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      <motion.div
        className="relative animate-hero-float"
        style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
      >
        {/* Cast shadow under tilted phone */}
        <motion.div
          className="absolute -bottom-1 left-[10%] right-[25%] h-20 rounded-[50%] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, oklch(0 0 0 / 0.15) 0%, transparent 70%)",
            filter: "blur(20px)",
            transform: "translateZ(-40px)",
          }}
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: CINEMATIC_EASE }}
        />
        {children}
      </motion.div>
    </div>
  );
}

/** Dark restaurant menu screen — orange accents, Arabic */
function ScreenContent() {
  return (
    <div className="absolute inset-0 z-10 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between pt-3 px-5">
        <span className="text-[9px] text-white/40 font-medium">٩:٤١</span>
        <div className="flex items-center gap-1.5">
          <svg className="size-2.5 text-white/40" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="10" width="4" height="12" rx="0.5" />
            <rect x="8" y="6" width="4" height="16" rx="0.5" />
            <rect x="14" y="2" width="4" height="20" rx="0.5" />
          </svg>
          <svg className="size-2.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 17a4.5 4.5 0 0 1-1-3 4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1-1 3" />
            <path d="M8 12a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2" />
          </svg>
        </div>
      </div>

      {/* Restaurant header */}
      <div className="relative z-10 px-5 mt-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center text-orange text-sm font-bold border border-white/10">
            م
          </div>
          <div>
            <div className="text-xs font-semibold text-white">مطعم مذاق الشام</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-green-400/80">مفتوح الآن</span>
            </div>
          </div>
        </div>

        {/* Featured dish */}
        <div className="h-28 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4 overflow-hidden border border-white/5">
          <div className="text-center">
            <svg viewBox="0 0 48 48" className="size-7 mx-auto" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6v12c0 3.3-2.7 6-6 6s-6-2.7-6-6V6"/>
              <path d="M42 6v36"/>
              <path d="M30 6v12c0 3.3 2.7 6 6 6s6-2.7 6-6V6"/>
            </svg>
            <div className="text-[9px] text-white/50 mt-1">تشكيلة المشاوي الملكية</div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 mb-4">
          {["مشاوي", "مقبلات", "مشروبات", "حلويات"].map((label) => (
            <div
              key={label}
              className={cn(
                "h-7 rounded-full flex items-center justify-center px-3 text-[9px] font-semibold transition-colors",
                label === "مشاوي"
                  ? "bg-orange text-black"
                  : "bg-white/5 text-white/50 border border-white/5"
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Menu items */}
        {[
          { name: "شاورما دجاج", desc: "خبز صاج • ثوم • مخلل", price: "٢٥" },
          { name: "كباب بندورة", desc: "لحم مفروم • بندورة • بصل", price: "٣٠" },
          { name: "فتوش", desc: "خس • بندورة • نعناع • خبز", price: "١٥" },
          { name: "عصير ليمون", desc: "ليمون طازج • نعناع", price: "١٢" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 mb-2.5 py-1.5">
            <div className="size-9 shrink-0 rounded-xl bg-neutral-800 border border-white/5" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-white">{item.name}</span>
                <span className="text-[9px] font-medium text-orange/80">{item.price} د.ل</span>
              </div>
              <div className="text-[8px] text-white/40 truncate mt-px">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="h-11 rounded-full bg-orange flex items-center justify-center text-black text-[11px] font-semibold shadow-xl">
          ابدأ الطلب
        </div>
      </div>
    </div>
  );
}
