"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Store, ClipboardList, ShoppingCart, TrendingUp, Clock,
  AlertCircle, ExternalLink, Package, Award, Gift, Users,
  CheckCircle, ArrowLeft, Sparkles,
  BarChart3, QrCode, Copy, Settings, Activity, DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import Link from "next/link"
import { premiumToast } from "@/lib/premium-toast"
import { useOrderNotifier } from "@/components/layout/OrderNotifier"
import { OwnerKpiGrid } from "./OwnerKpiGrid"
import { StatusBreakdown, PopularItems, RecentOrders } from "./OwnerOrdersList"
import { AnalyticsTab } from "./OwnerCharts"

/* ---------- Types ---------- */

interface RestaurantData {
  id: number; name: string; slug: string; description: string
  _count: { orders: number; categories: number }
}

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

interface LoyaltyStats {
  totalLoyaltyCards?: number; totalReferrals?: number; convertedReferrals?: number; conversionRate?: number
}

interface AdvancedStats {
  revenue7d: { date: string; revenue: number }[]
  orders7d: { date: string; count: number }[]
  topItems: { itemId: number; name: string; totalSold: number; growth: number }[]
  hourlyDistribution: { hour: number; count: number }[]
  aovTrend: { date: string; aov: number }[]
  growthPct: number
}

/* ================================================================
   PAGE
   ================================================================ */

export default function OwnerDashboard() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [stats, setStats] = useState<StatsData & { advancedStats?: AdvancedStats } | null>(null)
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"overview" | "analytics">("overview")

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me")
      if (!meRes.ok) { router.push("/login"); return }
      const userData = await meRes.json()
      if (!userData.data?.restaurantId) {
        setError("لم يتم تفعيل حسابك بعد. يرجى الانتظار حتى يتم تأكيد الدفع من الإدارة.")
        setLoading(false); return
      }

      const rid = userData.data?.restaurantId
      const [restRes, statsRes, loyaltyRes, advancedRes] = await Promise.all([
        fetch(`/api/restaurants/${rid}`),
        fetch(`/api/stats?restaurantId=${rid}`),
        fetch("/api/loyalty/stats"),
        fetch(`/api/stats/advanced?restaurantId=${rid}`),
      ])

      if (restRes.ok) { const restData = await restRes.json(); setRestaurant(restData.data ?? restData) }
      if (statsRes.ok) { const statsData = await statsRes.json(); setStats(statsData.data ?? statsData) }
      if (loyaltyRes.ok) { const l = await loyaltyRes.json(); if (l.success && l.data) setLoyaltyStats(l.data) }
      if (advancedRes.ok) { const advData = await advancedRes.json(); setStats(prev => prev ? { ...prev, advancedStats: advData.data } : prev) }
    } catch { setError("فشل تحميل البيانات") }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])
  useOrderNotifier(restaurant?.id)

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-md bg-card/50 border border-border/20 p-5 space-y-3 animate-pulse">
            <div className="h-3 w-20 rounded-full bg-muted/70" />
            <div className="h-8 w-28 rounded-sm bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-52 rounded-md bg-card/50 border border-border/20 p-4 space-y-3 animate-pulse">
            <div className="h-3 w-24 rounded-full bg-muted/70" />
            <div className="h-3 w-full rounded-full bg-muted/50 mt-4" />
            <div className="h-3 w-3/4 rounded-full bg-muted/50" />
            <div className="h-3 w-1/2 rounded-full bg-muted/50" />
          </div>
        ))}
      </div>
      <div className="h-28 rounded-md bg-card/50 border border-border/20 p-4 animate-pulse">
        <div className="h-3 w-20 rounded-full bg-muted/70" />
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="empty-state-icon"><AlertCircle className="size-6 text-destructive/60" /></div>
      <p className="text-base font-semibold">{error}</p>
      <Button variant="outline" size="sm" onClick={() => load()}>إعادة المحاولة</Button>
    </div>
  )

  const statusTotal = stats ? Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-page-enter">

      {/* Welcome banner (new owners) */}
      {restaurant && stats && stats.totalOrders === 0 && (
        <div className="rounded-md bg-gradient-to-br from-orange-muted/70 to-white dark:from-orange-muted/20 dark:to-card border border-orange/20 dark:border-orange/15 p-5 animate-fade-in">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="size-12 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h3 className="text-base font-bold mb-1">مرحباً بك في الربط الذكي!</h3>
              <p className="text-xs text-muted-foreground mb-3 max-w-md leading-relaxed">
                ابدأ بإضافة أصنافك في المنيو، ثم شارك الرابط مع زبائنك. أول طلب سيصل هنا مباشرة!
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link href="/owner/menu"><Button size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-orange to-orange/80"><ClipboardList className="size-3.5" /> أضف أصنافك</Button></Link>
                <Link href="/owner/qr"><Button size="sm" variant="outline" className="gap-1.5 text-xs"><QrCode className="size-3.5" /> احصل على QR</Button></Link>
                <Link href={`/menu/${restaurant.slug}`} target="_blank"><Button size="sm" variant="outline" className="gap-1.5 text-xs"><ExternalLink className="size-3.5" /> عرض المنيو</Button></Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "overview", label: "نظرة عامة", icon: Activity },
          { id: "analytics", label: "تحليلات", icon: BarChart3 },
        ].map((t) => {
          const TIcon = t.icon
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id as any)}
              className={cn("snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2",
                tab === t.id ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange" : "border-border/30 hover:border-orange/20")}>
              <TIcon className="size-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Restaurant header */}
      {restaurant && (
        <div className="relative overflow-hidden rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20 shrink-0">
                <Store className="size-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{restaurant.name}</h2>
                <p className="text-xs text-muted-foreground">{restaurant.description || "مطعمك على الربط الذكي"}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Package className="size-3" /> {restaurant._count.categories} أقسام</span>
                  <span className="flex items-center gap-1"><ClipboardList className="size-3" /> {stats?.totalItems ?? 0} صنف</span>
                  <span className="flex items-center gap-1"><ShoppingCart className="size-3" /> {stats?.totalOrders ?? 0} طلب</span>
                </div>
              </div>
            </div>
            <Link href={`/menu/${restaurant.slug}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ExternalLink className="size-3.5" /> عرض المنيو</Button>
            </Link>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <>
          <OwnerKpiGrid stats={stats} />

          <div className="grid gap-6 lg:grid-cols-3">
            <StatusBreakdown stats={stats} statusTotal={statusTotal} />
            <PopularItems items={stats?.popularItems ?? []} />
            <RecentOrders orders={stats?.recentOrders ?? []} />
          </div>

          {/* Quick actions */}
          <div className="rounded-md bg-card/50 border border-border/30 p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { href: "/owner/menu", icon: ClipboardList, label: "إدارة المنيو" },
                { href: "/owner/orders", icon: ShoppingCart, label: "الطلبات" },
                { href: "/owner/qr", icon: QrCode, label: "رمز QR", color: "emerald" },
                { href: "/owner/settings", icon: Settings, label: "الإعدادات" },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}>
                  <div className="group relative overflow-hidden rounded-md border border-border/20 bg-card/40 p-3.5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    style={{ borderColor: color === "emerald" ? undefined : undefined }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-orange/0 to-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-1.5">
                      <Icon className="size-4 text-orange dark:text-orange group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300" />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Analytics tab */}
      {tab === "analytics" && stats?.advancedStats && (
        <AnalyticsTab advancedStats={stats.advancedStats} />
      )}

      {/* Share your menu card */}
      {restaurant && (
        <div className="rounded-md bg-gradient-to-br from-orange-muted/60 to-orange-muted/30 dark:from-orange-muted/20 dark:to-orange-muted/10 border border-orange/20 dark:border-orange/10 p-5 animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20 shrink-0">
                <QrCode className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1">شارك منيو مطعمك</h3>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">امسح رمز QR أو شارك الرابط مع زبائنك ليصبح بإمكانهم الطلب مباشرة</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-muted-foreground bg-card/50 rounded-full px-3 py-1.5 font-mono border border-border/20" dir="ltr" style={{ direction: "ltr" }}>
                    {typeof window !== "undefined" ? `${window.location.origin}/menu/${restaurant.slug}` : `.../menu/${restaurant.slug}`}
                  </span>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => {
                    const url = `${window.location.origin}/menu/${restaurant.slug}`
                    navigator.clipboard.writeText(url).then(() => premiumToast("copy", "تم نسخ الرابط"))
                  }}>
                    <Copy className="size-3" /> نسخ
                  </Button>
                </div>
              </div>
            </div>
            <Link href="/owner/qr">
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-orange to-orange/80 text-white">
                <QrCode className="size-3.5" /> عرض QR
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Loyalty quick stats */}
      {(loyaltyStats.totalLoyaltyCards ?? 0) > 0 && (
        <div className="rounded-md bg-gradient-to-br from-orange/5 to-orange/5 border border-orange/20 dark:border-orange/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-orange dark:text-orange" />
              <h3 className="text-xs font-semibold">برنامج الولاء والإحالات</h3>
            </div>
            <Link href="/owner/loyalty">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-orange to-orange/80 text-white text-xs shadow-sm h-8">
                إدارة <ArrowLeft className="size-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-4">
            {[
              { label: "الأعضاء", value: loyaltyStats.totalLoyaltyCards ?? 0, icon: Users, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
              { label: "الإحالات", value: loyaltyStats.totalReferrals ?? 0, icon: Gift, color: "text-success", bg: "bg-success/10" },
              { label: "تحويل", value: loyaltyStats.conversionRate ? `${toArabicNumber(loyaltyStats.conversionRate)}%` : "-", icon: Award, color: "text-orange dark:text-orange", bg: "bg-orange-muted dark:bg-orange-muted" },
              { label: "محولة", value: loyaltyStats.convertedReferrals ?? 0, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-md bg-card/50 p-3">
                <div className={`size-9 rounded-md ${bg} flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-base font-bold">{typeof value === "number" ? toArabicNumber(value) : value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
