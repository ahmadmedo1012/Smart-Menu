"use client";

export default function HeroAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Mock phone frame */}
      <div className="relative mx-auto w-[260px] h-[530px] rounded-[3rem] bg-gradient-to-b from-amber-400 to-amber-600 p-2 shadow-2xl shadow-amber-500/25 animate-float">
        {/* Frame depth overlay — subtle metallic shine */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-t from-black/5 via-transparent to-white/10 pointer-events-none z-10" />

        <div className="w-full h-full rounded-[2.6rem] bg-white dark:bg-gray-950 overflow-hidden relative">
          {/* Dynamic Island */}
          <div className="absolute top-3 start-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

          {/* Mock menu screen */}
          <div className="pt-10 px-4">
            {/* Header — restaurant identity */}
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                م
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground dark:text-foreground leading-tight truncate">
                  مطعم مذاق الشام
                </div>
                <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-px">
                  مفتوح الآن • ١٢:٠٠ م - ١٢:٠٠ ص
                </div>
              </div>
            </div>

            {/* Search bar */}
            <div className="h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center px-3 mb-4">
              <span className="text-[10px] text-amber-500 dark:text-amber-300">ابحث عن طبق...</span>
            </div>

            {/* Category chips */}
            <div className="flex gap-1.5 mb-4 overflow-hidden">
              {["مشاوي", "مقبلات", "مشروبات", "حلويات"].map((label, i) => (
                <div
                  key={i}
                  className="h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center px-2.5"
                >
                  <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Menu items — realistic Arabic restaurant listing */}
            {[
              { name: "شاورما دجاج", desc: "خبز صاج، ثوم، مخلل", price: "٢٥" },
              { name: "كباب بندورة", desc: "لحم مفروم، بندورة، بصل", price: "٣٠" },
              { name: "فتوش", desc: "خس، بندورة، نعناع، خبز", price: "١٥" },
              { name: "عصير ليمون", desc: "ليمون طازج، نعناع", price: "١٢" },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 mb-3 items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-semibold text-foreground dark:text-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                      {item.price} ر.س
                    </span>
                  </div>
                  <div className="text-[8px] text-muted-foreground dark:text-muted-foreground truncate mt-px">
                    {item.desc}
                  </div>
                  <div className="text-[8px] text-amber-300 dark:text-amber-600 mt-px ltr">
                    ★★★★☆
                  </div>
                </div>
                <div className="size-11 rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 dark:from-amber-800 dark:to-amber-600 shrink-0" />
              </div>
            ))}

            {/* Floating CTA button */}
            <div className="absolute bottom-6 start-1/2 -translate-x-1/2 h-10 w-36 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg flex items-center justify-center text-white text-[11px] font-semibold">
              ابدأ الطلب
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges — gradient-border premium glass */}
      <div className="absolute -top-4 -end-4 gradient-border glass rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-500">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary animate-breath" />
          <span className="text-foreground dark:text-foreground text-[11px] font-semibold">
            مسح واطلب
          </span>
        </div>
      </div>
      <div className="absolute -bottom-4 -start-4 gradient-border glass rounded-xl px-3 py-2 shadow-lg animate-fade-in delay-700">
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
