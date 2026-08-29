import { LoadingAnnouncer } from "@/components/ui/loading-announcer"

export default function OwnerRestaurantsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingAnnouncer loading message="جارٍ التحميل..." completedMessage="تم تحميل الصفحة" />
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-orange/30 border-t-orange animate-spin" />
        <p className="text-sm text-muted-foreground animate-breath">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
