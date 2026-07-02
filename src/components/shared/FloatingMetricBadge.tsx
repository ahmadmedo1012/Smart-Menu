"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { toArabicNumber } from "@/lib/format"

interface FloatingMetricBadgeProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: string
  suffix?: string
  trend?: number
}

export function FloatingMetricBadge({
  label, value, icon: Icon, color = "text-orange", suffix = "", trend,
}: FloatingMetricBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-glass p-3 md:p-4",
        "flex items-center gap-3 min-w-0"
      )}
    >
      <div className={cn(
        "rounded-xl p-2.5 shrink-0 bg-gradient-to-br from-orange/15 to-orange/5",
      )}>
        <Icon className={cn("size-4 md:size-5", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg md:text-xl font-bold tracking-tight truncate">
            {typeof value === "number" ? toArabicNumber(value) : value}{suffix}
          </p>
          {trend !== undefined && (
            <span className={cn(
              "text-[10px] md:text-xs font-medium shrink-0",
              trend >= 0 ? "text-success" : "text-destructive"
            )}>
              {trend >= 0 ? "↑" : "↓"} {toArabicNumber(Math.abs(trend))}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
