"use client";

export default function HeroAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Ambient glow behind the phone */}
      <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Phone wrapper — slowed float for subtle lift */}
      <div
        className="relative mx-auto w-[260px] h-[530px] animate-float"
        style={{ animationDuration: "4s" }}
      >
        {/* Bezel — metallic gradient with depth */}
        <div className="relative w-full h-full rounded-[3rem] bg-gradient-to-b from-blue-500 via-blue-600 to-blue-800 p-[3px] shadow-2xl shadow-blue-500/30">
          {/* Screen — dark glass */}
          <div className="relative w-full h-full rounded-[2.6rem] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 overflow-hidden z-0">
            {/* Subtle scanline texture at 2% opacity for realism */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(1 0 0 / 0.02) 2px, oklch(1 0 0 / 0.02) 4px)",
              }}
            />

            {/* Screen glass reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/[0.04] pointer-events-none z-10" />

            {/* Dynamic Island */}
            <div className="absolute top-3 start-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 border border-white/[0.07]" />

            {/* Screen content */}
            <div className="relative z-0 pt-10 px-4">
              {/* Restaurant header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  م
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white leading-tight truncate">
                    مطعم مذاق الشام
                  </div>
                  <div className="text-[9px] text-blue-400 mt-px">
                    مفتوح الآن • ١٢:٠٠ م - ١٢:٠٠ ص
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center px-3 mb-4 border border-white/5">
                <span className="text-[10px] text-white/40">ابحث عن طبق...</span>
              </div>

              {/* Category pills — soft glass */}
              <div className="flex gap-1.5 mb-4 overflow-hidden">
                {["مشاوي", "مقبلات", "مشروبات", "حلويات"].map((label, i) => (
                  <div
                    key={i}
                    className="h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center px-2.5 border border-white/5"
                  >
                    <span className="text-[9px] font-semibold text-blue-300 truncate">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Menu items — premium dark-mode restaurant listing */}
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
                      <span className="text-[9px] font-medium text-blue-400 shrink-0">
                        {item.price} د.ل
                      </span>
                    </div>
                    <div className="text-[8px] text-white/50 truncate mt-px">
                      {item.desc}
                    </div>
                    <div className="text-[8px] text-blue-400 mt-px ltr">
                      ★★★★☆
                    </div>
                  </div>
                  <div className="size-11 rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 shrink-0" />
                </div>
              ))}

              {/* CTA button */}
              <div className="absolute bottom-6 start-1/2 -translate-x-1/2 h-10 w-36 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white text-[11px] font-semibold">
                ابدأ الطلب
              </div>
            </div>
          </div>

          {/* Bezel inner rim highlight — where bezel meets screen */}
          <div className="absolute inset-[3px] rounded-[2.6rem] ring-1 ring-inset ring-white/[0.08] pointer-events-none" />
        </div>
      </div>

      {/* Floating badges — glass-card replaces banned gradient-border */}
      <div className="absolute -top-4 -end-4 glass-card rounded-xl px-3 py-2 animate-fade-in delay-500">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary animate-breath" />
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            مسح واطلب
          </span>
        </div>
      </div>
      <div className="absolute -bottom-4 -start-4 glass-card rounded-xl px-3 py-2 animate-fade-in delay-700">
        <div className="flex items-center gap-1.5">
          <span className="text-primary text-[11px]">✓</span>
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            طلب عبر واتساب
          </span>
        </div>
      </div>
    </div>
  );
}
