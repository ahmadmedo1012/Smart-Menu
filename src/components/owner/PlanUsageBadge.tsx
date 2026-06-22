"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";

export default function PlanUsageBadge({ restaurantId }: { restaurantId: number }) {
  const [usage, setUsage] = useState<{ current: number; max: number; planName: string } | null>(null)
  useEffect(() => {
    if (!restaurantId) return
    fetch(`/api/restaurants/${restaurantId}`).then(r => r.json()).then(rd => {
      const rest = rd.data ?? rd
      fetch(`/api/stats?restaurantId=${restaurantId}`).then(r => r.json()).then(d => {
        const data = d.data ?? d
        setUsage({ current: data.totalItems || 0, max: rest.maxItems || 50, planName: rest.plan?.nameAr || "مجاني" })
      }).catch(() => {})
    }).catch(() => {})
  }, [restaurantId])
  if (!usage) return null
  const pct = Math.min(100, Math.round((usage.current / usage.max) * 100))
  const isNear = usage.current >= usage.max * 0.8
  const isAt = usage.current >= usage.max
  return (
    <div className={cn("rounded-2xl p-4 border transition-all", isAt ? "bg-red-50 dark:bg-red-950/20 border-red-200/30" : isNear ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200/30" : "bg-card/50 border-border/30")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{usage.planName}</span>
          <span className="text-muted-foreground">ـ</span>
          <span className={cn("tabular-nums", isAt ? "text-destructive font-bold" : isNear ? "text-amber-600" : "")}>
            {toArabicNumber(usage.current)} / {usage.max === 9999 ? "∞" : toArabicNumber(usage.max)}
          </span>
          <span className="text-muted-foreground text-xs">صنف</span>
        </div>
        {isAt && <Link href="/pricing"><button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium shadow-lg shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700"><Crown className="size-3" /> ترقية</button></Link>}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", isAt ? "bg-destructive" : isNear ? "bg-amber-500" : "bg-gradient-to-r from-amber-500 to-amber-600")} style={{ width: `${pct}%` }} />
      </div>
      {isAt && <p className="text-xs text-destructive mt-2 flex items-center gap-1"><AlertTriangle className="size-3" /> وصلت للحد الأقصى. قم بترقية خطتك.</p>}
    </div>
  )
}
