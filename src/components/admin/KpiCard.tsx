"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import MiniSparkline from "@/components/shared/MiniSparkline"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  suffix?: string
  trend?: number
  sparklineData?: number[]
  onClick?: () => void
}

export default function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, suffix = "",
  trend, sparklineData, onClick,
}: KpiCardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-all duration-300",
        onClick && "cursor-pointer hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      {/* Ambient glow on hover */}
      <div className="absolute -inset-2 bg-gradient-radial from-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">
            {toArabicNumber(value)}{suffix}
          </p>
          <div className="flex items-center gap-2">
            {sparklineData && sparklineData.length > 1 && (
              <MiniSparkline data={sparklineData} />
            )}
            {trend !== undefined && (
              <span className={cn(
                "text-xs font-medium flex items-center gap-0.5",
                trend >= 0 ? "text-success" : "text-red-500"
              )}>
                {trend >= 0 ? "↑" : "↓"} {toArabicNumber(Math.abs(trend))}%
              </span>
            )}
          </div>
        </div>
        <div className={cn("rounded-xl p-3 shrink-0", iconBg || "bg-orange-muted")}>
          <Icon className={cn("size-5", iconColor || "text-orange")} />
        </div>
      </div>
    </motion.div>
  )
}
