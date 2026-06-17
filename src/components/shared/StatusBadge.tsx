import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled"

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" }
> = {
  new: { label: "جديد", variant: "default" },
  preparing: { label: "قيد التحضير", variant: "secondary" },
  ready: { label: "جاهز", variant: "outline" },
  completed: { label: "مكتمل", variant: "ghost" },
  cancelled: { label: "ملغي", variant: "destructive" },
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  if (!config) {
    return null
  }

  return (
    <Badge variant={config.variant} className={cn("px-2 py-0.5 text-xs", className)}>
      {config.label}
    </Badge>
  )
}
