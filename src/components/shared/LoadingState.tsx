import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
  className?: string
  size?: "sm" | "default" | "lg"
}

export function LoadingState({
  message = "جار التحميل...",
  className,
  size = "default",
}: LoadingStateProps) {
  const sizeMap = {
    sm: "size-4",
    default: "size-8",
    lg: "size-12",
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin", sizeMap[size])} />
      {message && <p className="text-sm">{message}</p>}
      <span className="sr-only">Loading</span>
    </div>
  )
}
