"use client";

export default function HeroAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Mock phone frame */}
      <div className="relative mx-auto w-[260px] h-[530px] rounded-[3rem] bg-gradient-to-b from-amber-400 to-amber-600 p-2 shadow-2xl shadow-amber-500/25 animate-float">
        <div className="w-full h-full rounded-[2.6rem] bg-white dark:bg-gray-950 overflow-hidden relative">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

          {/* Mock menu screen */}
          <div className="pt-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600" />
              <div>
                <div className="h-3 w-24 bg-amber-200 dark:bg-amber-800 rounded" />
                <div className="h-2 w-16 bg-amber-100 dark:bg-amber-900 rounded mt-1" />
              </div>
            </div>

            {/* Search */}
            <div className="h-8 bg-amber-100 dark:bg-amber-900/50 rounded-xl mb-4" />

            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-hidden">
              {[40, 60, 50, 45].map((w, i) => (
                <div
                  key={i}
                  className="h-7 rounded-full bg-amber-100 dark:bg-amber-900/50"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>

            {/* Menu items */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <div className="flex-1">
                  <div className="h-3 w-3/4 bg-amber-200 dark:bg-amber-800 rounded" />
                  <div className="h-2 w-full bg-amber-100 dark:bg-amber-900 rounded mt-1.5" />
                  <div className="h-2 w-1/2 bg-amber-100 dark:bg-amber-900 rounded mt-1" />
                </div>
                <div className="size-14 rounded-xl bg-amber-100 dark:bg-amber-900/50 shrink-0" />
              </div>
            ))}

            {/* Floating order button */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-10 w-32 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -right-4 glass rounded-xl px-3 py-2 text-xs font-medium shadow-lg animate-fade-in delay-500">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-500 animate-breath" />
          منيو رقمي احترافي
        </div>
      </div>
      <div className="absolute -bottom-4 -left-4 glass rounded-xl px-3 py-2 text-xs font-medium shadow-lg animate-fade-in delay-700">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-500">✓</span>
          طلب عبر واتساب
        </div>
      </div>
    </div>
  );
}
