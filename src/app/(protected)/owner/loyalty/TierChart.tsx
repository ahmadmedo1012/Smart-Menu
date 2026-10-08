"use client"

import { Sparkles, Star, Medal, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from '@/lib/format';

const TIERS = [
  { key: "platinum", label: "بلاتيني", color: "text-info", bg: "bg-gradient-to-br from-info to-info/70", bar: "bg-gradient-to-r from-info to-info/70", icon: Sparkles },
  { key: "gold", label: "ذهبي", color: "text-ember dark:text-saffron", bg: "bg-gradient-to-br from-saffron to-ember", bar: "bg-gradient-to-r from-saffron to-ember", icon: Star },
  { key: "silver", label: "فضي", color: "text-muted-foreground", bg: "bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/70", bar: "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/70", icon: Medal },
  { key: "bronze", label: "برونزي", color: "text-ember/80 dark:text-saffron/80", bg: "bg-gradient-to-br from-ember/60 to-ember/85", bar: "bg-gradient-to-r from-ember/60 to-ember/85", icon: Award },
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
                {toArabicNumber(count)} <span className="text-xs">({toArabicNumber(pct)}%)</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-[width] duration-cinema", tier.bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
