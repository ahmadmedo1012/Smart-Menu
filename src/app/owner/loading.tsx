export default function OwnerLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-40 skeleton rounded-lg" />
        <div className="h-6 w-28 skeleton rounded-full" />
      </div>
      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 skeleton rounded" />
                <div className="h-3 w-1/3 skeleton rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full skeleton rounded" />
              <div className="h-3 w-5/6 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
