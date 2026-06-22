export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-amber-50/20 to-background dark:via-amber-950/10">
      {/* Nav */}
      <nav className="sticky top-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-4 skeleton rounded" />
            <div className="h-5 w-24 skeleton rounded-lg" />
          </div>
          <div className="h-9 w-28 skeleton rounded-xl" />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <div className="h-8 w-52 skeleton rounded-full mx-auto" />
          <div className="h-14 w-80 skeleton rounded-lg mx-auto" />
          <div className="h-5 w-64 skeleton rounded mx-auto" />
          <div className="h-10 w-48 skeleton rounded-full mx-auto" />
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-24">
        <div className="max-w-2xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-3xl border border-border/50 bg-card/50 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-11 skeleton rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 skeleton rounded" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                </div>
                <div className="h-10 w-32 skeleton rounded mb-6" />
                <div className="space-y-2 mb-6">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-4 w-20 skeleton rounded" />
                      <div className="h-4 w-16 skeleton rounded" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 mb-8">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="size-4 skeleton rounded" />
                      <div className="h-4 flex-1 skeleton rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-12 skeleton rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
