"use client"

import { Sparkles, Star, Medal, Award } from "lucide-react"
import { cn } from "@/lib/utils"

const TIERS = [
  { key: "platinum", label: "بلاتيني", color: "text-cyan-600 dark:text-cyan-300", bg: "bg-gradient-to-br from-cyan-400 via-purple-400 to-cyan-500", bar: "bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-500", icon: Sparkles },
  { key: "gold", label: "ذهبي", color: "text-orange dark:text-orange", bg: "bg-gradient-to-br from-orange to-orange/80", bar: "bg-gradient-to-r from-orange to-orange/80", icon: Star },
  { key: "silver", label: "فضي", color: "text-slate-500 dark:text-slate-300", bg: "bg-gradient-to-br from-slate-300 to-slate-500", bar: "bg-gradient-to-r from-slate-300 to-slate-500", icon: Medal },
  { key: "bronze", label: "برونزي", color: "text-orange/70 dark:text-orange/60", bg: "bg-gradient-to-br from-orange/40 to-orange/60", bar: "bg-gradient-to-r from-orange/40 to-orange/60", icon: Award },
]

export function TierChart({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0) || 1

  return (
    <div className="space-y-3">
      {TIERS.map((tier) => {
        const count = distribution[tier.key] ?? 0
        const pct = Math.round((count / total) * 100)
        return (
          <div key={tier.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <tier.icon className={cn("size-4", tier.color)} />
                <span className="font-medium">{tier.label}</span>
              </div>
              <span className="text-muted-foreground tabular-nums">
                {count} <span className="text-xs">({pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", tier.bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
