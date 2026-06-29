"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BarItem {
  label: string
  value: number
  color?: string
  subtitle?: string
}

interface HorizontalBarProps {
  data: BarItem[]
  maxItems?: number
  className?: string
  barHeight?: number
}

export default function HorizontalBar({
  data,
  maxItems = 10,
  className,
  barHeight = 28,
}: HorizontalBarProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems)
  const maxVal = Math.max(...sorted.map((d) => d.value), 1)

  if (sorted.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {sorted.map((item, i) => {
        const pct = (item.value / maxVal) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <span className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
              i === 0 ? "bg-orange text-white" :
              i < 3 ? "bg-orange-muted text-orange" :
              "bg-muted text-muted-foreground"
            )}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 mr-2">
                  {item.value}
                  {item.subtitle && <span className="text-[10px] mr-1">{item.subtitle}</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: item.color || "#f66d0f" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
