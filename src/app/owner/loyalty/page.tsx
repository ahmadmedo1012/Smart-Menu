"use client"
import { toArabicNumber } from "@/lib/format";

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users, Gift, TrendingUp, Award, Star, Medal, Sparkles,
  AlertCircle, RefreshCw, Search,
  Clock, ArrowRight, Copy, Check, MessageCircle, Share2,
  FilterX,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import QRCode from "qrcode"

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
  totalRewardPoints: number
  referralsByStatus: { pending: number; converted: number; expired: number }
  topReferrers: { customerName: string; referralCount: number; rewardsGiven: number }[]
  tierDistribution: Record<string, number>
  recentTransactions: {
    id: number; type: string; points: number; description: string; createdAt: string
  }[]
  recentReferrals: {
    id: number
    referredName: string
    referredPhone: string
    status: string
    discountPercent: number
    referrerRewardPct: number
    createdAt: string
    convertedAt: string | null
    referrer: { customerName: string }
  }[]
}

interface ReferralRow {
  id: number
  referredName: string
  referredPhone: string
  status: string
  discountPercent: number
  createdAt: string
  convertedAt: string | null
  referrer: { customerName: string }
}

/* ---------- Animated Count Up ---------- */

function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    const duration = 800
    const startTime = performance.now()

    if (start === end) { setDisplay(end); return }

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    prev.current = end
  }, [value])

  return <span className="tabular-nums">{toArabicNumber(display)}{suffix}</span>
}

/* ---------- Tier config ---------- */

const TIERS = [
  { key: "platinum", label: "بلاتيني", color: "text-cyan-600 dark:text-cyan-300", bg: "bg-gradient-to-br from-cyan-400 via-purple-400 to-cyan-500", bar: "bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-500", icon: Sparkles },
  { key: "gold", label: "ذهبي", color: "text-orange dark:text-orange", bg: "bg-gradient-to-br from-orange to-orange/80", bar: "bg-gradient-to-r from-orange to-orange/80", icon: Star },
  { key: "silver", label: "فضي", color: "text-slate-500 dark:text-slate-300", bg: "bg-gradient-to-br from-slate-300 to-slate-500", bar: "bg-gradient-to-r from-slate-300 to-slate-500", icon: Medal },
  { key: "bronze", label: "برونزي", color: "text-orange/70 dark:text-orange/60", bg: "bg-gradient-to-br from-orange/40 to-orange/60", bar: "bg-gradient-to-r from-orange/40 to-orange/60", icon: Award },
]

/* ---------- Stat Card ---------- */

function StatCard({
  label, value, suffix = "", icon: Icon, color, bg,
}: {
  label: string; value: number; suffix?: string; icon: typeof Users; color: string; bg: string
}) {
  return (
    <div className="group card-premium relative overflow-hidden rounded-md bg-white/70 p-5 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-2xl border border-white/30 dark:border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="pointer-events-none absolute -inset-full z-0 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:inset-0 group-hover:skew-x-0 dark:via-white/5" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight"><AnimatedCount value={value} suffix={suffix} /></p>
        </div>
        <div className={cn("rounded-md p-3.5 ring-1 ring-white/20 dark:ring-white/10", bg)}>
          <Icon className={cn("size-6", color)} />
        </div>
      </div>
    </div>
  )
}

/* ---------- Conversion Rate Bar ---------- */

function ConversionRate({ rate, total, converted }: { rate: number; total: number; converted: number }) {
  return (
    <div className="card-premium relative overflow-hidden rounded-md bg-white/60 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-orange dark:text-orange" />
          <span className="text-sm font-semibold">معدل التحويل</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-orange dark:text-orange">{rate}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange to-orange/80 transition-all duration-1000 ease-out"
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{toArabicNumber(converted)} تم التحويل</span>
        <span>{toArabicNumber(total)} إجمالي</span>
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

/* ---------- Referral Status Badge ---------- */

function ReferralStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending: { label: "معلق", classes: "bg-orange/10 text-orange dark:bg-orange/10 dark:text-orange" },
    converted: { label: "تم التحويل", classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    expired: { label: "منتهي", classes: "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" },
  }
  const m = map[status] ?? { label: status, classes: "bg-muted text-muted-foreground" }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", m.classes)}>
      <span className={cn(
        "size-1.5 rounded-full",
        status === "pending" && "bg-orange",
        status === "converted" && "bg-emerald-500",
        status === "expired" && "bg-slate-400",
      )} />
      {m.label}
    </span>
  )
}

/* ---------- Referrals Table ---------- */

function ReferralsTable({ referrals }: { referrals: ReferralRow[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.referredName.toLowerCase().includes(q) ||
      r.referredPhone.includes(q)
    )
  })

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-orange/10">
          <Gift className="size-6 text-orange" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">لا توجد إحالات بعد</p>
        <p className="text-xs text-muted-foreground/60 mt-1">شارك رابط الإحالة للبدء</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 px-5 pb-3 border-b border-border/20">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pr-9 text-sm rounded-xl"
          />
        </div>
        <div className="flex gap-1">
          {["all", "pending", "converted", "expired"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-9 rounded-lg px-3 text-xs font-medium transition-all",
                statusFilter === s
                  ? "bg-orange/10 text-orange dark:text-orange border border-orange/20"
                  : "text-muted-foreground hover:bg-muted/50 border border-transparent",
              )}
            >
              {s === "all" ? "الكل" : s === "pending" ? "معلق" : s === "converted" ? "تم التحويل" : s === "expired" ? "منتهي" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <FilterX className="size-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد إحالات مطابقة</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.referredName || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{r.referredPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ReferralStatusBadge status={r.status} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(r.createdAt).toLocaleDateString("ar-LY", { month: "short", day: "numeric" })}
                </span>
                {r.status === "converted" && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{r.discountPercent}%
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 && filtered.length < referrals.length && (
        <div className="px-5 py-2 text-center text-xs text-muted-foreground border-t border-border/20">
          عرض {filtered.length} من {referrals.length}
        </div>
      )}
    </div>
  )
}

/* ---------- Recent Transactions ---------- */

function TransactionsTable({ transactions }: { transactions: StatsData["recentTransactions"] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted/50">
          <Clock className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">لا توجد معاملات بعد</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto">
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
                <p className="text-sm font-medium">{tx.description || (isEarn ? "نقاط مكتسبة" : "نقاط مستردة")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString("ar-LY", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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

/* ---------- QR Code Section ---------- */

function ReferralQR({ url }: { url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 180,
      margin: 2,
      color: { dark: "#000", light: "#fff" },
    }).then(setQrDataUrl).catch(() => {})
  }, [url])

  if (!qrDataUrl) return <div className="size-[180px] animate-pulse rounded-xl bg-muted" />

  return (
    <div className="flex flex-col items-center gap-2">
      { }
      <img
        src={qrDataUrl}
        alt="Referral QR"
        className="rounded-xl border border-white/20"
        width={180}
        height={180}
      />
      <p className="text-[10px] text-muted-foreground">امسح للمشاركة</p>
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
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const ownerRefUrl = `${origin}/owner/loyalty?ref=share`

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
      setError("فشل تحميل بيانات الولاء")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCopyReferralLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ownerRefUrl)
      setCopied(true)
      toast.success("تم نسخ رابط الإحالة")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("فشل نسخ الرابط")
    }
  }, [ownerRefUrl])

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
        <div className="h-48 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
        <div className="h-48 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
      </div>
    )
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="card-premium flex flex-col items-center justify-center rounded-md bg-white/50 px-6 py-20 text-center backdrop-blur-sm dark:bg-white/5 border border-white/20 dark:border-border/20">
        <div className="mb-4 flex size-16 items-center justify-center rounded-md bg-destructive/10">
          <AlertCircle className="size-7 text-destructive" />
        </div>
        <p className="text-lg font-semibold">خطأ في تحميل بيانات الولاء</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-5" onClick={() => load()}>
          <RefreshCw className="size-4 mr-2" />
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const statCards = [
    {
      label: "إجمالي الأعضاء", value: stats?.totalLoyaltyCards ?? 0,
      icon: Users, color: "text-orange dark:text-orange",
      bg: "bg-orange/10",
    },
    {
      label: "إجمالي الإحالات", value: stats?.totalReferrals ?? 0,
      icon: Gift, color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "تم التحويل", value: stats?.convertedReferrals ?? 0,
      icon: TrendingUp, color: "text-orange dark:text-orange",
      bg: "bg-orange/10",
    },
    {
      label: "النقاط المكتسبة", value: stats?.totalRewardPoints ?? 0,
      icon: Award, color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ]

  const rbs = stats?.referralsByStatus ?? { pending: 0, converted: 0, expired: 0 }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* ---- Header ---- */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2">
        <ArrowRight className="size-4 me-1" />
        العودة
      </Button>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">برنامج الولاء</h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة برنامج الولاء والإحالات والمكافآت
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
            {showSettings ? "إخفاء الإعدادات" : "الإعدادات"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/30 backdrop-blur-sm"
            onClick={() => load()}
          >
            <RefreshCw className="size-4" />
            تحديث
          </Button>
        </div>
      </div>

      {/* ---- Settings panel (collapsible) ---- */}
      {showSettings && (
        <div className="animate-fade-in">
          <LoyaltySettings onSaved={() => { setShowSettings(false); load() }} />
        </div>
      )}

      {/* ---- Stats Grid (4 cards) ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ---- Referral Dashboard Section ---- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversion Rate */}
        <ConversionRate
          rate={stats?.conversionRate ?? 0}
          total={stats?.totalReferrals ?? 0}
          converted={stats?.convertedReferrals ?? 0}
        />

        {/* Status Breakdown */}
        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" />
            الإحالات حسب الحالة
          </h3>
          <div className="space-y-3">
            {[
              { label: "معلق", count: rbs.pending, color: "bg-orange" },
              { label: "تم التحويل", count: rbs.converted, color: "bg-emerald-500" },
              { label: "منتهي", count: rbs.expired, color: "bg-slate-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", s.color)} />
                  <span className="text-sm">{s.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{toArabicNumber(s.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share Section */}
        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Share2 className="size-4 text-muted-foreground" />
            مشاركة رابط الإحالة
          </h3>
          <div className="flex flex-col items-center gap-3">
            <ReferralQR url={ownerRefUrl} />
            <div className="w-full flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1 text-xs"
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`ادعوك لتجربة المنيو الذكي\n${ownerRefUrl}`)}`, "_blank")
                }}
              >
                <MessageCircle className="size-3.5" />
                واتساب
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1 text-xs"
                onClick={handleCopyReferralLink}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "تم النسخ!" : "نسخ الرابط"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Referrals + Transactions ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Referrals Table */}
        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">الإحالات</h3>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/20 bg-white/30 dark:bg-white/5">
              {stats?.totalReferrals ?? 0} إجمالي
            </Badge>
          </div>
          <ReferralsTable referrals={stats?.recentReferrals ?? []} />
        </div>

        {/* Recent Transactions */}
        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">آخر المعاملات</h3>
            </div>
          </div>
          <TransactionsTable transactions={stats?.recentTransactions ?? []} />
        </div>
      </div>

      {/* ---- Tier Distribution ---- */}
      <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">توزيع المستويات</h3>
          </div>
          <Badge variant="outline" className="text-[10px] border-white/20 bg-white/30 dark:bg-white/5">
            {stats?.totalLoyaltyCards ?? 0} إجمالي
          </Badge>
        </div>
        <div className="p-5">
          <TierChart distribution={stats?.tierDistribution ?? {}} />
        </div>
      </div>
    </div>
  )
}
