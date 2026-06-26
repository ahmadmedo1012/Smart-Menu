"use client"

export default function AdminSubscriptionsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-orange/30 border-t-orange animate-spin" />
        <p className="text-sm text-muted-foreground animate-breath">جاري التحميل...</p>
      </div>
    </div>
  );
}
