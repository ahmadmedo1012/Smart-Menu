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

      {/* Skeleton grid matching MenuPageClient: 1 col mobile, 2 cols sm+ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3.5 rounded-sm border border-border/20 bg-card p-4"
            >
              {/* Image placeholder — matches MenuItemCard default (size-28 md:size-32) */}
              <div className="size-28 md:size-32 shrink-0 rounded-[4px] bg-muted animate-shimmer" />

              {/* Content lines */}
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                <div className="space-y-2.5">
                  <div className="h-5 w-3/5 bg-muted animate-shimmer rounded-md" />
                  <div className="h-3 w-full bg-muted animate-shimmer rounded" />
                  <div className="h-3 w-4/5 bg-muted animate-shimmer rounded" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="h-6 w-16 bg-muted animate-shimmer rounded-md" />
                  <div className="h-8 w-20 bg-muted animate-shimmer rounded-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
