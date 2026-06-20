export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="h-8 w-24 skeleton rounded-lg" />
      </div>
      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-5">
            <div className="h-4 w-24 skeleton rounded mb-3" />
            <div className="h-8 w-16 skeleton rounded" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-border/50">
        <div className="p-5 border-b border-border/50">
          <div className="h-5 w-32 skeleton rounded" />
        </div>
        <div className="divide-y divide-border/50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
              <div className="h-8 w-20 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
