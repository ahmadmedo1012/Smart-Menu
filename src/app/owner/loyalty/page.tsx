"use client"
import { toArabicNumber } from "@/lib/format";

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Users, Gift, TrendingUp, Award, Star, Medal, Sparkles,
  AlertCircle, RefreshCw, ChevronUp, ArrowUpRight, Search,
  Clock, ArrowRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { toast } from "sonner"

const LoyaltySettings = dynamic(
  () => import("@/components/loyalty/LoyaltySettings"),
  { ssr: false },
)

/* ---------- Types ---------- */

interface StatsData {
  totalLoyaltyCards: number
  totalReferrals: number
  convertedReferrals: number
  conversionRate: number
  topReferrers: { customerName: string; referralCount: number; rewardsGiven: number }[]
  tierDistribution: Record<string, number>
  recentTransactions: {
    id: number; type: string; points: number; description: string; createdAt: string
  }[]
}

interface TopReferrer {
  customerName: string; referralCount: number; rewardsGiven: number
}

/* ---------- Tier config (mirrors client-side) ---------- */

const TIERS = [
  { key: "platinum", label: "Platinum", color: "text-cyan-600 dark:text-cyan-300", bg: "bg-gradient-to-br from-cyan-400 via-purple-400 to-cyan-500", bar: "bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-500", icon: Sparkles },
  { key: "gold", label: "Gold", color: "text-amber-500 dark:text-amber-300", bg: "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600", bar: "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600", icon: Star },
  { key: "silver", label: "Silver", color: "text-slate-500 dark:text-slate-300", bg: "bg-gradient-to-br from-slate-300 to-slate-500", bar: "bg-gradient-to-r from-slate-300 to-slate-500", icon: Medal },
  { key: "bronze", label: "Bronze", color: "text-amber-700 dark:text-amber-400", bg: "bg-gradient-to-br from-amber-400 to-amber-600", bar: "bg-gradient-to-r from-amber-400 to-amber-600", icon: Award },
]

/* ---------- Stat Card ---------- */

function StatCard({
  label, value, suffix = "", icon: Icon, color, bg,
}: {
  label: string; value: number; suffix?: string; icon: typeof Users; color: string; bg: string
}) {
  return (
    <div className="group card-premium relative overflow-hidden rounded-2xl bg-white/70 p-5 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="pointer-events-none absolute -inset-full z-0 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:inset-0 group-hover:skew-x-0 dark:via-white/5" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{toArabicNumber(value)}{suffix}</p>
        </div>
        <div className={cn("rounded-2xl p-3.5 ring-1 ring-white/20 dark:ring-white/10", bg)}>
          <Icon className={cn("size-6", color)} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-amber-500/5 to-transparent dark:from-amber-400/5" />
      </div>
    </div>
  )
}

/* ---------- Tier Distribution Chart ---------- */

function TierChart({ distribution }: { distribution: Record<string, number> }) {
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
              <div
                className={cn("h-full rounded-full transition-all duration-700", tier.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Top Referrers ---------- */

function ReferrersList({ referrers }: { referrers: TopReferrer[] }) {
  if (referrers.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
          <Gift className="size-6 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No referrals yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Share referral links to get started</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/10">
      {referrers.map((r, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex size-7 items-center justify-center rounded-lg text-xs font-bold",
              i === 0 && "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
              i === 1 && "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
              i === 2 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
              i >= 3 && "bg-muted text-muted-foreground",
            )}>
              {i + 1}
            </span>
            <span className="text-sm font-medium">{r.customerName || "Anonymous"}</span>
          </div>
          <div className="flex items-center gap-4 text-sm tabular-nums">
            <span className="text-muted-foreground">{r.referralCount} refs</span>
            <span className="text-emerald-600 dark:text-emerald-400">{r.rewardsGiven} rewards</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Recent Transactions Table ---------- */

function TransactionsTable({ transactions }: { transactions: StatsData["recentTransactions"] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/50">
          <Clock className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Reward transactions will appear here</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/10">
      {transactions.map((tx) => {
        const isEarn = tx.type === "earn"
        return (
          <div key={tx.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-2 rounded-full shrink-0",
                isEarn ? "bg-emerald-500" : "bg-red-500",
              )} />
              <div>
                <p className="text-sm font-medium">{tx.description || (isEarn ? "Points earned" : "Points redeemed")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              isEarn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
            )}>
              {isEarn ? "+" : "-"}{tx.points}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================
   PAGE
   ================================================================ */

export default function OwnerLoyaltyPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/loyalty/stats")
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      if (json.success && json.data) setStats(json.data)
      else throw new Error("Invalid response")
    } catch {
      setError("Failed to load loyalty data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10 dark:bg-white/5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-white/10 dark:bg-white/5" />
        <div className="h-48 animate-pulse rounded-2xl bg-white/10 dark:bg-white/5" />
      </div>
    )
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="card-premium flex flex-col items-center justify-center rounded-2xl bg-white/50 px-6 py-20 text-center backdrop-blur-sm dark:bg-white/5 border border-white/20 dark:border-white/10">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-7 text-destructive" />
        </div>
        <p className="text-lg font-semibold">Error loading loyalty data</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-5" onClick={() => load()}>
          <RefreshCw className="size-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const statCards = [
    {
      label: "Total Members", value: stats?.totalLoyaltyCards ?? 0,
      icon: Users, color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Total Referrals", value: stats?.totalReferrals ?? 0,
      icon: Gift, color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Conversion Rate", value: stats?.conversionRate ?? 0,
      suffix: "%", icon: TrendingUp, color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* ---- Header ---- */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2">
        <ArrowRight className="ml-1 h-4 w-4" />
        العودة
      </Button>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Loyalty Program</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your loyalty program, tiers, and referral rewards
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/30 backdrop-blur-sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Award className="size-4" />
            {showSettings ? "Hide Settings" : "Settings"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/30 backdrop-blur-sm"
            onClick={() => load()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ---- Settings panel (collapsible) ---- */}
      {showSettings && (
        <div className="animate-fade-in">
          <LoyaltySettings onSaved={() => { setShowSettings(false); load() }} />
        </div>
      )}

      {/* ---- Stats Grid ---- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ---- Tier Distribution + Top Referrers ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tier Distribution */}
        <div className="card-premium relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tier Distribution</h3>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/20 bg-white/30 dark:bg-white/5">
              {stats?.totalLoyaltyCards ?? 0} total
            </Badge>
          </div>
          <div className="p-5">
            <TierChart distribution={stats?.tierDistribution ?? {}} />
          </div>
        </div>

        {/* Top Referrers */}
        <div className="card-premium relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Top Referrers</h3>
            </div>
          </div>
          <ReferrersList referrers={stats?.topReferrers ?? []} />
        </div>
      </div>

      {/* ---- Recent Reward Transactions ---- */}
      <div className="card-premium relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Reward Transactions</h3>
          </div>
        </div>
        <TransactionsTable transactions={stats?.recentTransactions ?? []} />
      </div>
    </div>
  )
}
