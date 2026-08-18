export default function Loading() {
  return (
    <div className="space-y-4 animate-fade-in" aria-live="polite">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )
}
