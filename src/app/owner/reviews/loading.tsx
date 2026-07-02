export default function ReviewsLoading() {
  return (
    <div className="space-y-4 animate-fade-in" aria-live="polite" aria-label="جارٍ تحميل التقييمات">
      <div className="h-8 w-48 skeleton rounded-lg" />
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )
}
