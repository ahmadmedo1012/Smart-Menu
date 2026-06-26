export default function CartLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-slide-down">
        <div className="size-5 rounded skeleton" />
        <div className="h-7 w-28 skeleton rounded-lg" />
        <div className="h-7 w-16 skeleton rounded-full" />
      </div>

      {/* Pickup type selector */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-14 skeleton rounded-2xl" />
        ))}
      </div>

      {/* Cart items */}
      <div className="space-y-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-card/60 border border-border/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="size-10 skeleton rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-3 w-20 skeleton rounded" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-9 skeleton rounded-xl" />
                <div className="h-6 w-10 skeleton rounded" />
                <div className="size-9 skeleton rounded-xl" />
                <div className="size-9 skeleton rounded-xl mr-1" />
              </div>
            </div>
            <div className="h-9 skeleton rounded-xl" />
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-5 mb-6">
        <div className="h-5 w-32 skeleton rounded mb-3" />
        <div className="h-16 skeleton rounded-xl" />
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mb-8">
        <div className="h-4 w-24 skeleton rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between mb-2">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-4 w-16 skeleton rounded" />
          </div>
        ))}
        <div className="h-px bg-border/30 my-3" />
        <div className="flex justify-between">
          <div className="h-5 w-20 skeleton rounded" />
          <div className="h-7 w-24 skeleton rounded" />
        </div>
      </div>

      {/* Button */}
      <div className="h-14 skeleton rounded-2xl" />
    </div>
  );
}
