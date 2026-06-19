import { UtensilsCrossed } from "lucide-react";

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

      {/* Loading spinner + text */}
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center gap-4">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center animate-pulse">
          <UtensilsCrossed className="size-6 text-muted-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm">جاري تحميل القائمة...</p>
      </div>

      {/* Shimmer skeleton cards */}
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="h-5 w-32 bg-muted animate-shimmer rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="size-14 rounded-lg bg-muted animate-shimmer shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 bg-muted animate-shimmer rounded" />
                    <div className="h-3 w-56 bg-muted animate-shimmer rounded" />
                    <div className="h-4 w-12 bg-muted animate-shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
