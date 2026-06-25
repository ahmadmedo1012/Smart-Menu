"use client";

import { useState, useCallback, useRef } from "react";

interface PhoneMockupProps {
  showVideo?: boolean;
}

export default function PhoneMockup({ showVideo = true }: PhoneMockupProps) {
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

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Ambient glow — behind everything */}
      <div
        className="absolute -inset-6 md:-inset-10 rounded-full opacity-70 pointer-events-none"
        style={{
          background: "var(--frame-glow)",
          filter: "blur(60px)",
          transform: "translateZ(0)",
        }}
      />

      {/* Floating badge — top-right */}
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
          <svg
            className="size-3.5 text-blue-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            طلب عبر واتساب
          </span>
        </div>
      </div>

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
            {/* Bezel metallic shine */}
            <div
              className="absolute inset-0 rounded-[2.8rem] pointer-events-none z-10"
              style={{
                background: "var(--frame-highlight)",
              }}
            />

            {/* Camera lens bump — top-right */}
            <div className="absolute -top-[1px] -right-[1px] z-30 w-12 h-12 rounded-[2.8rem] bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center pointer-events-none">
              <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-blue-400 to-blue-900 border border-white/10 shadow-inner" />
            </div>

            {/* ——— Inner Screen ——— */}
            <div className="relative w-full h-[530px] rounded-[2.5rem] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
              {/* Glass reflection — subtle diagonal sweep */}
              <div
                className="absolute inset-0 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 60%, rgba(255,255,255,0.02) 100%)",
                }}
              />

              {/* Screen edge glow */}
              <div
                className="absolute inset-0 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              />

              {/* Dynamic Island */}
              <div className="absolute top-2.5 start-1/2 -translate-x-1/2 w-[88px] h-[24px] bg-black rounded-full z-30 border border-white/[0.06] shadow-sm">
                <div className="absolute end-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500/70" />
              </div>

              {/* ——— Screen Content ——— */}
              {/* Animated content — base layer (visible until video loads) */}
              <div
                className="relative z-0 pt-10 px-4 transition-opacity duration-700 ease-out"
                style={{ opacity: showAnim ? 1 : 0 }}
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
                  <svg
                    className="size-3 text-white/30 ms-1.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <span className="text-[10px] text-white/35">ابحث عن طبق...</span>
                </div>

                {/* Category pills */}
                <div className="flex gap-1.5 mb-4 overflow-hidden">
                  {["مشاوي", "مقبلات", "مشروبات", "حلويات"].map((label, i) => (
                    <div
                      key={i}
                      className="h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center px-2.5 border border-white/5"
                    >
                      <span className="text-[9px] font-semibold text-blue-300/90 truncate">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Menu items */}
                {[
                  { name: "شاورما دجاج", desc: "خبز صاج، ثوم، مخلل", price: "٢٥" },
                  { name: "كباب بندورة", desc: "لحم مفروم، بندورة، بصل", price: "٣٠" },
                  { name: "فتوش", desc: "خس، بندورة، نعناع، خبز", price: "١٥" },
                  { name: "عصير ليمون", desc: "ليمون طازج، نعناع", price: "١٢" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 mb-3 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-semibold text-white truncate">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-medium text-blue-400/90 shrink-0">
                          {item.price} د.ل
                        </span>
                      </div>
                      <div className="text-[8px] text-white/50 truncate mt-px">
                        {item.desc}
                      </div>
                      <div className="text-[8px] text-blue-400/70 mt-px ltr">
                        ★★★★☆
                      </div>
                    </div>
                    {/* Gradient circle thumbnail (replaces placeholder bg) */}
                    <div className="size-11 rounded-full bg-gradient-to-br from-blue-500/60 to-purple-500/40 shrink-0" />
                  </div>
                ))}

                {/* CTA button */}
                <div className="absolute bottom-6 start-1/2 -translate-x-1/2 h-10 w-36 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white text-[11px] font-semibold">
                  ابدأ الطلب
                </div>
              </div>

              {/* Video — overlays animated content when loaded */}
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
                  style={{
                    opacity: videoLoaded ? 1 : 0,
                    objectPosition: "center",
                  }}
                />
              )}

              {/* Bottom screen edge reflection */}
              <div
                className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none rounded-[2.5rem]"
                style={{
                  background:
                    "linear-gradient(to top, rgba(255,255,255,0.03) 0%, transparent 100%)",
                }}
              />
            </div>

            {/* Inner bezel rim — precision cut line */}
            <div className="absolute inset-[3px] rounded-[2.5rem] ring-1 ring-inset ring-white/[0.1] pointer-events-none z-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
