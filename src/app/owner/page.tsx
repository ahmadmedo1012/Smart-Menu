"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Store, ClipboardList, ShoppingCart, TrendingUp, Clock,
  AlertCircle, ExternalLink, Package, Award, Gift, Users,
  CheckCircle, ArrowLeft, Sparkles,
  BarChart3, QrCode, Copy, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import Link from "next/link"
import { toast } from "sonner"
import { useOrderNotifier } from "@/components/layout/OrderNotifier"

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

/* ---------- Status Config ---------- */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; indicator: string }> = {
  new:        { label: "جديد",       color: "text-orange dark:text-orange",       bg: "bg-orange-muted dark:bg-orange-muted",      indicator: "bg-orange" },
  preparing:  { label: "قيد التحضير", color: "text-orange dark:text-orange",    bg: "bg-orange-muted dark:bg-orange-muted",   indicator: "bg-orange" },
  ready:      { label: "جاهز",       color: "text-green-600 dark:text-green-400",     bg: "bg-green-50 dark:bg-green-950/20",   indicator: "bg-green-500" },
  completed:  { label: "مكتمل",      color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-50 dark:bg-gray-800/20",     indicator: "bg-gray-400" },
  cancelled:  { label: "ملغي",       color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-950/20",        indicator: "bg-red-500" },
}

/* ---------- Animated Counter ---------- */

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const start = performance.now()
    const from = display
    const to = value
    const duration = 800

    function tick(now: number) {
      if (!mounted.current) return
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { mounted.current = false; if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])

  return <span>{toArabicNumber(display)}{suffix}</span>
}

/* ---------- Stat Card ---------- */

function StatCard({ label, value, icon: Icon, subtitle, color, bg, onClick }: {
  label: string; value: number; icon: typeof ShoppingCart; subtitle?: string
  color: string; bg: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-all duration-300",
        onClick && "cursor-pointer hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5",
      )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight"><AnimatedCounter value={value} /></p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-xl p-3 ring-1 ring-border/30", bg)}>
          <Icon className={cn("size-5", color)} />
        </div>
      </div>
    </div>
  )
}

/* ---------- Order Row ---------- */

function OrderRow({ order }: { order: StatsData["recentOrders"][0] }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new

  return (
    <Link href={`/owner/orders/${order.id}`}
      className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30 group rounded-lg -mx-1">
      <div className="flex items-center gap-2.5">
        <div className={cn("size-2 rounded-full shrink-0", config.indicator)} />
        <div>
          <p className="text-sm font-medium">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">{order.customerName || "دون اسم"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold tabular-nums">{toArabicNumber(order.total.toFixed(1))} د.ل</span>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
          {config.label}
        </span>
      </div>
    </Link>
  )
}

/* ================================================================
   PAGE
   ================================================================ */

export default function OwnerDashboard() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me")
      if (!meRes.ok) { router.push("/login"); return }
      const userData = await meRes.json()
      if (!userData.data?.restaurantId) { setError("لا يوجد مطعم مرتبط"); setLoading(false); return }

      const rid = userData.data?.restaurantId

      const [restRes, statsRes, loyaltyRes] = await Promise.all([
        fetch(`/api/restaurants/${rid}`),
        fetch(`/api/stats?restaurantId=${rid}`),
        fetch("/api/loyalty/stats"),
      ])

      if (restRes.ok) { const restData = await restRes.json(); setRestaurant(restData.data ?? restData) }
      if (statsRes.ok) { const statsData = await statsRes.json(); setStats(statsData.data ?? statsData) }
      if (loyaltyRes.ok) { const l = await loyaltyRes.json(); if (l.success && l.data) setLoyaltyStats(l.data) }
    } catch { setError("فشل تحميل البيانات") }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])
  useOrderNotifier(restaurant?.id)

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-card/50 border border-border/20 p-5 space-y-3 animate-pulse">
            <div className="h-3 w-20 rounded-full bg-muted/70" />
            <div className="h-8 w-28 rounded-lg bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-52 rounded-2xl bg-card/50 border border-border/20 p-4 space-y-3 animate-pulse">
            <div className="h-3 w-24 rounded-full bg-muted/70" />
            <div className="h-3 w-full rounded-full bg-muted/50 mt-4" />
            <div className="h-3 w-3/4 rounded-full bg-muted/50" />
            <div className="h-3 w-1/2 rounded-full bg-muted/50" />
          </div>
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-card/50 border border-border/20 p-4 animate-pulse">
        <div className="h-3 w-20 rounded-full bg-muted/70" />
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="empty-state-icon"><AlertCircle className="size-6 text-destructive/60" /></div>
      <p className="text-base font-semibold">{error}</p>
      <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl">إعادة المحاولة</Button>
    </div>
  )

  const statusTotal = stats ? Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0) : 0
  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-page-enter">

      {/* Welcome banner (new owners) */}
      {restaurant && stats && stats.totalOrders === 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-muted/70 to-white dark:from-orange-muted/20 dark:to-card border border-orange/20 dark:border-orange/15 p-5 animate-fade-in">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="size-6 text-white" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h3 className="text-base font-bold mb-1">مرحباً بك في الربط الذكي! 👋</h3>
              <p className="text-xs text-muted-foreground mb-3 max-w-md leading-relaxed">
                ابدأ بإضافة أصنافك في المنيو، ثم شارك الرابط مع زبائنك. أول طلب سيصل هنا مباشرة!
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link href="/owner/menu"><Button size="sm" className="rounded-xl gap-1.5 text-xs bg-gradient-to-r from-orange to-orange/80"><ClipboardList className="size-3.5" /> أضف أصنافك</Button></Link>
                <Link href="/owner/qr"><Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs"><QrCode className="size-3.5" /> احصل على QR</Button></Link>
                <Link href={`/menu/${restaurant.slug}`} target="_blank"><Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs"><ExternalLink className="size-3.5" /> عرض المنيو</Button></Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant header */}
      {restaurant && (
        <div className="relative overflow-hidden rounded-2xl bg-card/50 border border-border/30 p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20 shrink-0">
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
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
                <ExternalLink className="size-3.5" /> عرض المنيو
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={stats?.totalOrders ?? 0} icon={ShoppingCart} subtitle="كل الوقت"
          color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
          onClick={() => router.push("/owner/orders")} />
        <StatCard label="طلبات اليوم" value={stats?.todayOrders ?? 0} icon={TrendingUp}
          subtitle={stats?.todayRevenue ? `${toArabicNumber(stats.todayRevenue.toFixed(1))} د.ل` : undefined}
          color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/20" />
        <StatCard label="قيد الانتظار" value={pendingOrders} icon={Clock}
          subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
          color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
          onClick={() => router.push("/owner/orders")} />
        <StatCard label="الأصناف" value={stats?.totalItems ?? 0} icon={ClipboardList}
          color="text-orange dark:text-orange" bg="bg-orange-muted dark:bg-orange-muted"
          onClick={() => router.push("/owner/menu")} />
      </div>

      {/* Status bar + Popular + Recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status breakdown bar */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-card/50 border border-border/30 p-4 shadow-sm h-full">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">حالة الطلبات</h3>
            {stats && Object.keys(stats.statusBreakdown).length > 0 ? (
              <>
                <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden flex ring-1 ring-inset ring-black/5">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = stats.statusBreakdown[status] ?? 0
                    if (count === 0) return null
                    const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0
                    return <div key={status} className={cn("h-full first:rounded-r-full last:rounded-l-full transition-all duration-500", config.bg)}
                      style={{ width: `${pct}%` }} title={`${config.label}: ${count}`} />
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = stats.statusBreakdown[status] ?? 0
                    if (count === 0 && status !== "new") return null
                    return (
                      <div key={status} className="flex items-center gap-1.5 text-xs">
                        <div className={cn("size-2.5 rounded-full ring-1 ring-inset ring-black/5", config.indicator)} />
                        <span className="text-muted-foreground">{config.label}</span>
                        <span className="font-bold">{toArabicNumber(count)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">لا توجد طلبات بعد</p>
            )}
          </div>
        </div>

        {/* Popular items */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-card/50 border border-border/30 p-4 shadow-sm h-full">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">الأكثر طلباً</h3>
            {stats?.popularItems && stats.popularItems.length > 0 ? (
              <div className="space-y-1">
                {stats.popularItems.slice(0, 8).map((item, idx) => (
                  <div key={item.itemId} className="flex items-center justify-between py-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                        idx === 0 ? "bg-gradient-to-br from-orange to-orange/80 text-white" :
                        idx < 3 ? "bg-orange-muted text-orange" :
                        "bg-muted text-muted-foreground"
                      )}>{toArabicNumber(idx + 1)}</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{toArabicNumber(item.totalSold)} طلب</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="empty-state-icon"><BarChart3 /></div>
                <p className="text-xs font-medium text-muted-foreground">لا توجد بيانات بعد</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-card/50 border border-border/30 p-4 shadow-sm h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground">آخر الطلبات</h3>
              <Link href="/owner/orders"><span className="text-xs text-primary font-medium">عرض الكل</span></Link>
            </div>
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-0.5">
                {stats.recentOrders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="empty-state-icon"><ShoppingCart /></div>
                <p className="text-xs font-medium text-muted-foreground">لا توجد طلبات بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl bg-card/50 border border-border/30 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link href="/owner/menu">
            <div className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-orange/10 hover:-translate-y-0.5 hover:border-orange/40 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/0 to-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col items-center gap-1.5">
                <ClipboardList className="size-4 text-orange dark:text-orange group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300" />
                <span className="text-xs font-medium">إدارة المنيو</span>
              </div>
            </div>
          </Link>
          <Link href="/owner/orders">
            <div className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-orange/10 hover:-translate-y-0.5 hover:border-orange/40 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/0 to-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col items-center gap-1.5">
                <ShoppingCart className="size-4 text-orange dark:text-orange group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300" />
                <span className="text-xs font-medium">الطلبات</span>
              </div>
            </div>
          </Link>
          <Link href="/owner/qr">
            <div className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 hover:border-emerald-300/40 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col items-center gap-1.5">
                <QrCode className="size-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300" />
                <span className="text-xs font-medium">رمز QR</span>
              </div>
            </div>
          </Link>
          <Link href="/owner/settings">
            <div className="group relative overflow-hidden rounded-xl border border-border/20 bg-card/40 p-3.5 transition-all duration-300 hover:shadow-lg hover:shadow-orange/10 hover:-translate-y-0.5 hover:border-orange/40 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/0 to-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex flex-col items-center gap-1.5">
                <Settings className="size-4 text-orange dark:text-orange group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300" />
                <span className="text-xs font-medium">الإعدادات</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Share your menu card */}
      {restaurant && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-muted/60 to-orange-muted/30 dark:from-orange-muted/20 dark:to-orange-muted/10 border border-orange/20 dark:border-orange/10 p-5 animate-fade-in">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/20 shrink-0">
                <QrCode className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1">شارك منيو مطعمك</h3>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                  امسح رمز QR أو شارك الرابط مع زبائنك ليصبح بإمكانهم الطلب مباشرة
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-muted-foreground bg-card/50 rounded-full px-3 py-1.5 font-mono border border-border/20"
                    dir="ltr" style={{ direction: "ltr" }}>
                    {typeof window !== "undefined" ? `${window.location.origin}/menu/${restaurant.slug}` : `.../menu/${restaurant.slug}`}
                  </span>
                  <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5" onClick={() => {
                    const url = `${window.location.origin}/menu/${restaurant.slug}`
                    navigator.clipboard.writeText(url).then(() => toast.success("تم نسخ الرابط"))
                  }}>
                    <Copy className="size-3" />
                    نسخ
                  </Button>
                </div>
              </div>
            </div>
            <Link href="/owner/qr">
              <Button size="sm" className="rounded-xl h-8 text-xs gap-1.5 bg-gradient-to-r from-orange to-orange/80 text-white">
                <QrCode className="size-3.5" />
                عرض QR
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Loyalty quick stats */}
      {(loyaltyStats.totalLoyaltyCards ?? 0) > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-orange/5 to-orange/5 border border-orange/20 dark:border-orange/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-orange dark:text-orange" />
              <h3 className="text-xs font-semibold">برنامج الولاء والإحالات</h3>
            </div>
            <Link href="/owner/loyalty">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-orange to-orange/80 text-white rounded-xl text-xs shadow-sm h-8">
                إدارة <ArrowLeft className="size-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-4">
            <div className="flex items-center gap-2.5 rounded-xl bg-card/50 p-3">
              <div className="size-9 rounded-xl bg-orange-muted dark:bg-orange-muted flex items-center justify-center"><Users className="size-4 text-orange dark:text-orange" /></div>
              <div><p className="text-[11px] text-muted-foreground">الأعضاء</p><p className="text-base font-bold">{toArabicNumber(loyaltyStats.totalLoyaltyCards ?? 0)}</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-card/50 p-3">
              <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center"><Gift className="size-4 text-emerald-600 dark:text-emerald-400" /></div>
              <div><p className="text-[11px] text-muted-foreground">الإحالات</p><p className="text-base font-bold">{toArabicNumber(loyaltyStats.totalReferrals ?? 0)}</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-card/50 p-3">
              <div className="size-9 rounded-xl bg-orange-muted dark:bg-orange-muted flex items-center justify-center"><Award className="size-4 text-orange dark:text-orange" /></div>
              <div><p className="text-[11px] text-muted-foreground">تحويل</p><p className="text-base font-bold">{loyaltyStats.conversionRate ? `${toArabicNumber(loyaltyStats.conversionRate)}%` : "-"}</p></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-card/50 p-3">
              <div className="size-9 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center"><CheckCircle className="size-4 text-green-600 dark:text-green-400" /></div>
              <div><p className="text-[11px] text-muted-foreground">محولة</p><p className="text-base font-bold">{toArabicNumber(loyaltyStats.convertedReferrals ?? 0)}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
