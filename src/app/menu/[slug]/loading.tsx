export default function MenuSlugLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Shimmer header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="size-16 rounded-full bg-muted animate-shimmer mx-auto mb-4" />
          <div className="h-9 w-48 bg-muted animate-shimmer mx-auto mb-2 rounded-md" />
          <div className="h-5 w-72 bg-muted animate-shimmer mx-auto rounded-md" />
        </div>
      </div>

      {/* Skeleton cards — 6 individual cards with 96x96 image */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="size-24 rounded-lg bg-muted animate-shimmer shrink-0" />
            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="h-5 w-3/5 bg-muted animate-shimmer rounded-md" />
              <div className="h-3.5 w-4/5 bg-muted animate-shimmer rounded" />
              <div className="h-3.5 w-2/3 bg-muted animate-shimmer rounded" />
              <div className="h-5 w-16 bg-muted animate-shimmer rounded-md mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
