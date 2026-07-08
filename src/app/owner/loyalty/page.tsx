"use client"
import { toArabicNumber } from "@/lib/format";

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users, Gift, TrendingUp, Award, Sparkles,
  AlertCircle, RefreshCw, Clock, ArrowRight, Copy, Check, MessageCircle, Share2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { premiumToast } from "@/lib/premium-toast"
import { TierChart } from "./TierChart"
import { ReferrerList } from "./ReferrerList"
import { TransactionTable } from "./TransactionTable"
import { ReferralQR } from "./ReferralQR"

const LoyaltySettings = dynamic(() => import("@/components/loyalty/LoyaltySettings"), { ssr: false })

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
  recentTransactions: { id: number; type: string; points: number; description: string; createdAt: string }[]
  recentReferrals: {
    id: number; referredName: string; referredPhone: string; status: string;
    discountPercent: number; referrerRewardPct: number; createdAt: string;
    convertedAt: string | null; referrer: { customerName: string }
  }[]
}

/* ---------- Animated Count Up ---------- */

function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current; const end = value; const duration = 800; const startTime = performance.now()
    if (start === end) { setDisplay(end); return }
    const tick = (now: number) => {
      const elapsed = now - startTime; const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick); prev.current = end
  }, [value])

  return <span className="tabular-nums">{toArabicNumber(display)}{suffix}</span>
}

/* ---------- Stat Card ---------- */

function StatCard({ label, value, suffix = "", icon: Icon, color, bg }: {
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
        <div className="h-full rounded-full bg-gradient-to-r from-orange to-orange/80 transition-all duration-1000 ease-out" style={{ width: `${rate}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{toArabicNumber(converted)} تم التحويل</span>
        <span>{toArabicNumber(total)} إجمالي</span>
      </div>
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
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/loyalty/stats")
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      if (json.success && json.data) setStats(json.data)
      else throw new Error("Invalid response")
    } catch { setError("فشل تحميل بيانات الولاء") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCopyReferralLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ownerRefUrl)
      setCopied(true); premiumToast("copy", "تم نسخ رابط الإحالة")
      setTimeout(() => setCopied(false), 2000)
    } catch { premiumToast("error", "فشل نسخ الرابط") }
  }, [ownerRefUrl])

  /* ---------- Loading ---------- */
  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />)}</div>
      <div className="h-64 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
      <div className="h-48 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
      <div className="h-48 animate-pulse rounded-md bg-white/10 dark:bg-white/5" />
    </div>
  )

  /* ---------- Error ---------- */
  if (error) return (
    <div className="card-premium flex flex-col items-center justify-center rounded-md bg-white/50 px-6 py-20 text-center backdrop-blur-sm dark:bg-white/5 border border-white/20 dark:border-border/20">
      <div className="mb-4 flex size-16 items-center justify-center rounded-md bg-destructive/10"><AlertCircle className="size-7 text-destructive" /></div>
      <p className="text-lg font-semibold">خطأ في تحميل بيانات الولاء</p>
      <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" className="mt-5" onClick={() => load()}><RefreshCw className="size-4 me-2" /> إعادة المحاولة</Button>
    </div>
  )

  const statCards = [
    { label: "إجمالي الأعضاء", value: stats?.totalLoyaltyCards ?? 0, icon: Users, color: "text-orange dark:text-orange", bg: "bg-orange/10" },
    { label: "إجمالي الإحالات", value: stats?.totalReferrals ?? 0, icon: Gift, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "تم التحويل", value: stats?.convertedReferrals ?? 0, icon: TrendingUp, color: "text-orange dark:text-orange", bg: "bg-orange/10" },
    { label: "النقاط المكتسبة", value: stats?.totalRewardPoints ?? 0, icon: Award, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  ]

  const rbs = stats?.referralsByStatus ?? { pending: 0, converted: 0, expired: 0 }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* ---- Header ---- */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2">
        <ArrowRight className="size-4 me-1" /> العودة
      </Button>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">برنامج الولاء</h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة برنامج الولاء والإحالات والمكافآت</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-white/30 backdrop-blur-sm" onClick={() => setShowSettings(!showSettings)}>
            <Award className="size-4" />{showSettings ? "إخفاء الإعدادات" : "الإعدادات"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-white/30 backdrop-blur-sm" onClick={() => load()}>
            <RefreshCw className="size-4" /> تحديث
          </Button>
        </div>
      </div>

      {/* ---- Settings panel ---- */}
      {showSettings && (
        <div className="animate-fade-in"><LoyaltySettings onSaved={() => { setShowSettings(false); load() }} /></div>
      )}

      {/* ---- Stats Grid ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* ---- Referral Dashboard ---- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ConversionRate rate={stats?.conversionRate ?? 0} total={stats?.totalReferrals ?? 0} converted={stats?.convertedReferrals ?? 0} />

        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" /> الإحالات حسب الحالة
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

        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Share2 className="size-4 text-muted-foreground" /> مشاركة رابط الإحالة
          </h3>
          <div className="flex flex-col items-center gap-3">
            <ReferralQR url={ownerRefUrl} />
            <div className="w-full flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`ادعوك لتجربة المنيو الذكي\n${ownerRefUrl}`)}`, "_blank")}>
                <MessageCircle className="size-3.5" /> واتساب
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={handleCopyReferralLink}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "تم النسخ!" : "نسخ الرابط"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Referrals + Transactions ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">الإحالات</h3>
            </div>
            <Badge variant="outline" className="text-[10px] border-white/20 bg-white/30 dark:bg-white/5">{stats?.totalReferrals ?? 0} إجمالي</Badge>
          </div>
          <ReferrerList referrals={stats?.recentReferrals ?? []} />
        </div>

        <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
          <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">آخر المعاملات</h3>
            </div>
          </div>
          <TransactionTable transactions={stats?.recentTransactions ?? []} />
        </div>
      </div>

      {/* ---- Tier Distribution ---- */}
      <div className="card-premium relative overflow-hidden rounded-md bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-border/20">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">توزيع المستويات</h3>
          </div>
          <Badge variant="outline" className="text-[10px] border-white/20 bg-white/30 dark:bg-white/5">{stats?.totalLoyaltyCards ?? 0} إجمالي</Badge>
        </div>
        <div className="p-5">
          <TierChart distribution={stats?.tierDistribution ?? {}} />
        </div>
      </div>
    </div>
  )
}
