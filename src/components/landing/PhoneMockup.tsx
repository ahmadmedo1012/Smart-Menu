"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  showVideo?: boolean;
  tilt?: boolean;
  videoSrc?: string;
  posterSrc?: string;
}

/** Premium menu screen — fallback while video loads */
function MenuScreen() {
  return (
    <div className="absolute inset-0 z-10 bg-gray-950 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" />

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

      {/* Restaurant card */}
      <div className="relative z-10 px-5 mt-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20">
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

        {/* Hero dish image */}
        <div className="h-28 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-gray-800 flex items-center justify-center mb-4 overflow-hidden border border-white/5">
          <div className="text-center">
            <svg viewBox="0 0 48 48" className="size-7 mx-auto" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6v12c0 3.3-2.7 6-6 6s-6-2.7-6-6V6"/>
              <path d="M42 6v36"/>
              <path d="M30 6v12c0 3.3 2.7 6 6 6s6-2.7 6-6V6"/>
            </svg>
            <div className="text-[9px] text-white/60">تشكيلة المشاوي الملكية</div>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 mb-4">
          {["مشاوي", "مقبلات", "مشروبات", "حلويات", "سلطات"].map((label) => (
            <div
              key={label}
              className={cn(
                "h-7 rounded-full flex items-center justify-center px-3 text-[9px] font-semibold transition-colors",
                label === "مشاوي"
                  ? "text-white shadow-lg"
                  : "bg-white/8 text-blue-300/70 border border-white/5",
                label === "مشاوي" ? "bg-[oklch(0.7_0.12_65)] shadow-[oklch(0.7_0.12_65)/0.3]" : undefined,
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Menu items */}
        {[
          { name: "شاورما دجاج", desc: "خبز صاج • ثوم • مخلل", price: "٢٥", stars: 5 },
          { name: "كباب بندورة", desc: "لحم مفروم • بندورة • بصل", price: "٣٠", stars: 4 },
          { name: "فتوش", desc: "خس • بندورة • نعناع • خبز", price: "١٥", stars: 4 },
          { name: "عصير ليمون", desc: "ليمون طازج • نعناع", price: "١٢", stars: 5 },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 mb-2.5 py-1.5">
            <div className="size-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500/40 to-blue-700/20 border border-white/5" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-white">{item.name}</span>
                <span className="text-[9px] font-medium text-amber-400/80">{item.price} د.ل</span>
              </div>
              <div className="text-[8px] text-white/40 truncate mt-px">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="h-11 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 flex items-center justify-center text-white text-[11px] font-semibold shadow-xl shadow-amber-600/30">
          ابدأ الطلب
        </div>
      </div>
    </div>
  );
}

/** Tilt wrapper — natural 3D perspective */
function TiltWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ perspective: "1400px" }}>
      <div
        className="relative"
        style={{
          transform:
            "perspective(1400px) rotateY(-5.5deg) rotateX(1.5deg) rotateZ(-0.5deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Cast shadow under tilted phone */}
        <div
          className="absolute -bottom-2 left-[10%] right-[10%] h-10 rounded-[50%] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0 0 0 / 0.25) 0%, transparent 70%)",
            filter: "blur(8px)",
            transform: "translateZ(-30px)",
          }}
        />
        {children}
      </div>
    </div>
  );
}

/** Primary export — premium phone mockup */
export default function PhoneMockup({
  showVideo = true,
  tilt = false,
  videoSrc,
  posterSrc,
}: PhoneMockupProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = showVideo && !videoErrored;

  const handleCanPlay = useCallback(() => {
    requestAnimationFrame(() => setVideoLoaded(true));
  }, []);

  const handleError = useCallback(() => {
    setVideoErrored(true);
  }, []);

  const PhoneFrame = (
    <div className="relative mx-auto max-w-[280px] w-[80vw]">
      {/* External ambient glow */}
      <div
        className="absolute -inset-12 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, oklch(0.52 0.14 264 / 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translateZ(0)",
        }}
      />

      {/* Bezel */}
      <div
        className="relative w-full rounded-[3.2rem] p-[4px]"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.3 0.04 265) 0%, oklch(0.45 0.06 268) 30%, oklch(0.25 0.03 262) 55%, oklch(0.4 0.05 265) 80%, oklch(0.28 0.04 268) 100%)",
          boxShadow:
            "0 35px 80px -20px oklch(0 0 0 / 0.45), 0 0 70px oklch(0.45 0.14 265 / 0.12), inset 0 0 0 1px oklch(1 1 0 / 0.04)",
        }}
      >
        {/* Bezel metallic highlight */}
        <div
          className="absolute inset-0 rounded-[3.2rem] pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(170deg, oklch(1 1 0 / 0.1) 0%, transparent 35%, transparent 65%, oklch(0 0 0 / 0.06) 100%)",
          }}
        />

        {/* Screen */}
        <div className="relative w-full aspect-[9/19.5] rounded-[2.9rem] bg-gray-950 overflow-hidden">
          {/* Glass reflection */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.9rem]"
            style={{
              background:
                "linear-gradient(135deg, oklch(1 1 0 / 0.06) 0%, transparent 40%, transparent 60%, oklch(1 1 0 / 0.015) 100%)",
            }}
          />

          {/* Screen edge rim */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.9rem]"
            style={{ boxShadow: "inset 0 0 0 1px oklch(1 1 0 / 0.06)" }}
          />

          {/* Dynamic Island */}
          <div className="absolute top-3 start-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-full z-30 border border-white/[0.04] shadow-sm">
            <div className="absolute end-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500/50" />
          </div>

          {/* Content */}
          <MenuScreen />

          {/* Video overlay */}
          {isVideo && (
            <video
              ref={videoRef}
              src={videoSrc || "/hero-intro.mp4"}
              poster={posterSrc || "/hero-poster.jpg"}
              autoPlay
              loop
              muted
              playsInline
              onCanPlay={handleCanPlay}
              onError={handleError}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-out z-5"
              style={{ opacity: videoLoaded ? 1 : 0 }}
            />
          )}

          {/* Bottom edge reflection */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 z-20 pointer-events-none rounded-[2.9rem]"
            style={{
              background:
                "linear-gradient(to top, oklch(1 1 0 / 0.03) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Inner bezel accent rim */}
        <div className="absolute inset-[4px] rounded-[2.9rem] ring-1 ring-inset ring-white/[0.07] pointer-events-none z-20" />
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full max-w-md mx-auto",
        tilt && "scale-[1.02] md:scale-105 origin-center animate-phone-float",
      )}
    >
      {tilt ? <TiltWrapper>{PhoneFrame}</TiltWrapper> : PhoneFrame}
    </div>
  );
}
