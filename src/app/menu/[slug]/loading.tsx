export default function MenuSlugLoading() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background glow matching page.tsx */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.55_0.19_45/0.06),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.55_0.19_45/0.08),transparent_70%)] pointer-events-none" />

      {/* Sticky header skeleton — premium glass */}
      <div className="fixed inset-x-0 top-0 z-30 h-14 flex items-center px-4 gap-3 glass-strong">
        <div className="size-8 rounded-xl shimmer-advanced shrink-0" />
        <div className="flex-1">
          <div className="h-4 w-24 shimmer-advanced rounded-md" />
        </div>
      </div>
      <div className="fixed inset-x-0 top-14 z-30 h-[2px] bg-gradient-to-r from-orange/60 to-orange" />

      {/* Hero area — decorative orbs match MenuClientSection */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange/12 via-background to-background">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange/5 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange/3 blur-[120px] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-8 md:pt-14 md:pb-12 text-center">
          <div className="size-28 md:size-32 rounded-md mx-auto mb-5 shimmer-advanced" />
          <div className="h-9 md:h-11 w-48 shimmer-advanced mx-auto mb-2 rounded-md" />
          <div className="h-5 w-72 shimmer-advanced mx-auto rounded-md" />
          <div className="mx-auto mt-4 w-20 h-[2px] rounded-full bg-gradient-to-r from-orange/0 via-orange/60 to-orange/0" />
        </div>
      </div>

      {/* Toolbar skeleton — rounded-xl premium */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2 space-y-4">
        <div className="h-10 w-full shimmer-advanced rounded-xl glass-card" />

        {/* Category chip skeletons */}
        <div className="flex gap-2 overflow-hidden">
          <div className="h-8 w-20 shimmer-advanced rounded-full shrink-0" />
          <div className="h-8 w-24 shimmer-advanced rounded-full shrink-0" />
          <div className="h-8 w-16 shimmer-advanced rounded-full shrink-0" />
          <div className="h-8 w-28 shimmer-advanced rounded-full shrink-0" />
        </div>
      </div>

      {/* Premium card grid — vertical layout with aspect-4/3 image area */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const delay = `${i * 100}ms`;
            return (
              <div key={i} className="glass-card overflow-hidden">
                {/* aspect-4/3 image area with staggered shimmer */}
                <div
                  className="aspect-[4/3] w-full shimmer-advanced"
                  style={{ animationDelay: delay }}
                />
                {/* Text content */}
                <div className="p-4 space-y-3">
                  <div
                    className="h-5 w-3/5 shimmer-advanced rounded-md"
                    style={{ animationDelay: delay }}
                  />
                  <div className="space-y-2">
                    <div className="h-3 w-full shimmer-advanced rounded" />
                    <div className="h-3 w-4/5 shimmer-advanced rounded" />
                  </div>
                  {/* CTA row — price + button placeholder */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-6 w-16 shimmer-advanced rounded-md" />
                    <div className="h-9 w-[88px] shimmer-advanced rounded-md" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
