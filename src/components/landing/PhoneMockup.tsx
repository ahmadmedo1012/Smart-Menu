"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  showVideo?: boolean;
  tilt?: boolean;
}

const MENU_ITEMS = [
  { name: "شاورما دجاج", desc: "خبز صاج • ثوم • مخلل", price: "٢٥" },
  { name: "كباب بندورة", desc: "لحم مفروم • بندورة • بصل", price: "٣٠" },
  { name: "فتوش", desc: "خس • بندورة • نعناع • خبز", price: "١٥" },
  { name: "عصير ليمون", desc: "ليمون طازج • نعناع", price: "١٢" },
];

const CATEGORIES = ["مشاوي", "مقبلات", "مشروبات", "حلويات"];

/** Static menu screen — always visible, fades when video loads */
function MenuScreen({ show }: { show: boolean }) {
  return (
    <div
      className="relative z-0 pt-10 px-4 transition-opacity duration-700 ease-out"
      style={{ opacity: show ? 1 : 0 }}
    >
      {/* Restaurant header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shadow-sm shadow-blue-500/20">
          م
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-white leading-tight truncate">
            مطعم مذاق الشام
          </div>
          <div className="text-[9px] text-blue-400/80 mt-px">
            مفتوح الآن • ١٢:٠٠ م - ١٢:٠٠ ص
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="h-8 rounded-xl bg-white/8 backdrop-blur-sm flex items-center px-3 mb-4 border border-white/5">
        <svg className="size-3 text-white/30 ms-1.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <span className="text-[10px] text-white/35">ابحث عن طبق...</span>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 mb-4 overflow-hidden">
        {CATEGORIES.map((label, i) => (
          <div
            key={i}
            className="h-7 rounded-full backdrop-blur-sm flex items-center justify-center px-2.5 border"
            style={{
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-[9px] font-semibold text-blue-300/90 truncate">{label}</span>
          </div>
        ))}
      </div>

      {/* Menu items */}
      {MENU_ITEMS.map((item, i) => (
        <div key={i} className="flex gap-2.5 mb-3 items-center">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-1">
              <span className="text-[10px] font-semibold text-white truncate">{item.name}</span>
              <span className="text-[9px] font-medium text-blue-400/90 shrink-0">{item.price} د.ل</span>
            </div>
            <div className="text-[8px] text-white/50 truncate mt-px">{item.desc}</div>
            <div className="text-[8px] text-blue-400/70 mt-px ltr">★★★★☆</div>
          </div>
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/50 to-blue-700/30 shrink-0" />
        </div>
      ))}

      {/* CTA button */}
      <div className="absolute bottom-6 start-1/2 -translate-x-1/2 h-10 w-36 rounded-full bg-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white text-[11px] font-semibold">
        ابدأ الطلب
      </div>
    </div>
  );
}

/** Tilt wrapper — applies 3D perspective */
function TiltWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative"
      style={{ perspective: "1200px" }}
    >
      <div
        className="relative transition-transform duration-700 ease-out"
        style={{
          transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Cast shadow under tilted phone */}
        <div
          className="absolute -bottom-3 left-[5%] right-[5%] h-8 rounded-[50%] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0 0 0 / 0.2) 0%, transparent 70%)",
            filter: "blur(6px)",
            transform: "translateZ(-20px)",
          }}
        />
        {children}
      </div>
    </div>
  );
}

export default function PhoneMockup({ showVideo = true, tilt = false }: PhoneMockupProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = showVideo && !videoErrored;
  const showAnim = !isVideo || !videoLoaded;

  const handleCanPlay = useCallback(() => {
    requestAnimationFrame(() => setVideoLoaded(true));
  }, []);

  const handleError = useCallback(() => {
    setVideoErrored(true);
  }, []);

  const PhoneFrame = (
    <div className="relative mx-auto max-w-[260px] w-[82vw]">
      {/* Phone bezel */}
      <div
        className="relative w-full rounded-[3rem] p-[3px]"
        style={{
          background: "linear-gradient(145deg, #1a1d23 0%, #2c2f38 30%, #1a1d23 60%, #2c2f38 100%)",
          boxShadow: "var(--frame-shadow-premium)",
        }}
      >
        {/* Bezel metallic shine */}
        <div
          className="absolute inset-0 rounded-[3rem] pointer-events-none z-10"
          style={{
            background: "var(--frame-highlight)",
          }}
        />

        {/* Inner screen */}
        <div className="relative w-full h-[540px] rounded-[2.7rem] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
          {/* Glass reflection */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.7rem]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 35%, transparent 62%, rgba(255,255,255,0.02) 100%)",
            }}
          />

          {/* Screen edge glow */}
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[2.7rem]"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          />

          {/* Dynamic Island */}
          <div className="absolute top-2.5 start-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-black rounded-full z-30 border border-white/[0.05] shadow-sm">
            <div className="absolute end-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500/60" />
          </div>

          {/* Screen content (visible until video loads, or always if no video) */}
          <MenuScreen show={showAnim} />

          {/* Video overlay */}
          {isVideo && (
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
              style={{ opacity: videoLoaded ? 1 : 0, objectPosition: "center" }}
            />
          )}

          {/* Bottom edge reflection */}
          <div
            className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none rounded-[2.7rem]"
            style={{
              background:
                "linear-gradient(to top, rgba(255,255,255,0.03) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Inner bezel rim */}
        <div className="absolute inset-[3px] rounded-[2.7rem] ring-1 ring-inset ring-white/[0.08] pointer-events-none z-20" />
      </div>
    </div>
  );

  return (
    <div className={cn("relative w-full max-w-md mx-auto", tilt && "scale-105 md:scale-110 origin-center")}>
      {/* Ambient glow */}
      <div
        className="absolute -inset-10 md:-inset-16 rounded-full pointer-events-none"
        style={{
          background: "var(--frame-glow)",
          filter: "blur(80px)",
          transform: "translateZ(0)",
          opacity: 0.7,
        }}
      />

      {tilt ? <TiltWrapper>{PhoneFrame}</TiltWrapper> : PhoneFrame}
    </div>
  );
}
