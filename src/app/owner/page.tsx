"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Store, ClipboardList, ShoppingCart, TrendingUp, Clock,
  AlertCircle, ExternalLink, Package, Award, Gift, Users,
  ChefHat, CheckCircle, XCircle, ArrowLeft, Sparkles,
  BarChart3, QrCode, Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import Link from "next/link"
import { useOrderNotifier } from "@/components/layout/OrderNotifier"

/* ---------- Types ---------- */

interface RestaurantData {
  id: number; name: string; slug: string; description: string
  _count: { orders: number; categories: number }
}

interface StatsData {
  totalOrders: number; todayOrders: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

interface LoyaltyStats {
  totalLoyaltyCards?: number; totalReferrals?: number
}

/* ---------- Status Config ---------- */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new: { label: "جديد", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", icon: Clock },
  preparing: { label: "قيد التحضير", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", icon: ChefHat },
  ready: { label: "جاهز", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", icon: CheckCircle },
  completed: { label: "مكتمل", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-800/30", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", icon: XCircle },
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
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white/70 p-5 backdrop-blur-xl dark:bg-white/5 dark:backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-premium",
        onClick && "cursor-pointer",
      )}
    >
      <div className="pointer-events-none absolute -inset-full z-0 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:inset-0 group-hover:skew-x-0 dark:via-white/5" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">
            <AnimatedCounter value={value} />
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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

/* ---------- Mini Order Row ---------- */

function OrderRow({ order }: { order: StatsData["recentOrders"][0] }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new
  const Icon = config.icon

  return (
    <Link href={`/owner/orders/${order.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/20 group">
      <div className="flex items-center gap-3">
        <div className={cn("size-2 rounded-full shrink-0", order.status === "new" && "bg-blue-500", order.status === "preparing" && "bg-amber-500", order.status === "ready" && "bg-green-500", order.status === "completed" && "bg-gray-400", order.status === "cancelled" && "bg-red-500")} />
        <div>
          <p className="text-sm font-medium">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">{order.customerName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">{toArabicNumber(order.total.toFixed(1))} د.ل</span>
        <Badge className={cn("text-xs", config.bg, config.color)}>{config.label}</Badge>
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
      if (!userData.restaurantId) { setError("لا يوجد مطعم مرتبط"); setLoading(false); return }

      const rid = userData.restaurantId

      const [restRes, statsRes, loyaltyRes] = await Promise.all([
        fetch(`/api/restaurants/${rid}`),
        fetch(`/api/stats?restaurantId=${rid}`),
        fetch("/api/loyalty/stats"),
      ])

      if (restRes.ok) {
        const restData = await restRes.json()
        setRestaurant(restData.data ?? restData)
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data ?? statsData)
      }
      if (loyaltyRes.ok) {
        const l = await loyaltyRes.json()
        if (l.success && l.data) setLoyaltyStats(l.data)
      }
    } catch {
      setError("فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])
  useOrderNotifier(restaurant?.id)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 animate-breath rounded-2xl bg-muted/50" />)}
        </div>
        <div className="h-64 animate-breath rounded-2xl bg-muted/50" />
        <div className="h-48 animate-breath rounded-2xl bg-muted/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <AlertCircle className="size-12 text-destructive/60" />
        <p className="text-lg font-semibold">{error}</p>
        <Button variant="outline" onClick={() => load()}>إعادة المحاولة</Button>
      </div>
    )
  }

  const statusTotal = stats ? Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0) : 0
  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* Onboarding welcome for new owners */}
      {restaurant && stats && stats.totalOrders === 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/20 dark:to-card border border-amber-200/30 dark:border-amber-500/20 p-6 animate-fade-in">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="size-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">مرحباً بك في الربط الذكي! 👋</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-lg leading-relaxed">
                ابدأ بإضافة أصنافك في المنيو، ثم شارك الرابط مع زبائنك. أول طلب سيصل هنا مباشرة!
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/owner/menu">
                  <Button size="sm" className="rounded-xl gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600">
                    <ClipboardList className="size-4" />
                    أضف أصنافك
                  </Button>
                </Link>
                <Link href="/owner/qr">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                    <QrCode className="size-4" />
                    احصل على QR
                  </Button>
                </Link>
                <Link href={`/menu/${restaurant.slug}`} target="_blank">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1.5">
                    <ExternalLink className="size-4" />
                    عرض المنيو العام
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Header */}
      {restaurant && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/30 p-6 backdrop-blur-xl dark:from-white/8 dark:to-white/3 border border-white/30 dark:border-white/10 shadow-lg">
          <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30">
                <Store className="size-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{restaurant.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{restaurant.description || "مطعمك على الربط الذكي"}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Package className="size-3.5" />
                    {restaurant._count.categories} أقسام
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="size-3.5" />
                    {stats?.totalItems ?? 0} صنف
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShoppingCart className="size-3.5" />
                    {stats?.totalOrders ?? 0} طلب
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/menu/${restaurant.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5 border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl">
                  <ExternalLink className="size-3.5" />
                  عرض المنيو
                </Button>
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="إجمالي الطلبات" value={stats?.totalOrders ?? 0}
          icon={ShoppingCart} subtitle="كل الوقت"
          color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30"
          onClick={() => router.push("/owner/orders")}
        />
        <StatCard
          label="طلبات اليوم" value={stats?.todayOrders ?? 0}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          label="قيد الانتظار" value={pendingOrders}
          icon={Clock} subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
          color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30"
          onClick={() => router.push("/owner/orders")}
        />
        <StatCard
          label="الأصناف" value={stats?.totalItems ?? 0}
          icon={ClipboardList}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-950/30"
          onClick={() => router.push("/owner/menu")}
        />
      </div>

      {/* Status Breakdown Bar */}
      {stats && Object.keys(stats.statusBreakdown).length > 0 && (
        <div className="rounded-2xl bg-white/50 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-premium p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">حالة الطلبات</h3>
          <div className="h-4 rounded-full bg-muted/50 overflow-hidden flex">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.statusBreakdown[status] ?? 0
              if (count === 0) return null
              const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0
              return (
                <div
                  key={status}
                  className={cn("h-full first:rounded-r-full last:rounded-l-full transition-all duration-700", config.bg)}
                  style={{ width: `${pct}%` }}
                  title={`${config.label}: ${count}`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats.statusBreakdown[status] ?? 0
              if (count === 0 && status !== "new") return null
              return (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <div className={cn("size-2.5 rounded-full", status === "new" && "bg-blue-500", status === "preparing" && "bg-amber-500", status === "ready" && "bg-green-500", status === "completed" && "bg-gray-400", status === "cancelled" && "bg-red-500")} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-bold">{toArabicNumber(count)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Popular Items */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Items Card */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-premium">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">الأصناف الأكثر طلباً</h3>
            </div>
          </div>

          {stats?.popularItems && stats.popularItems.length > 0 ? (
            <div className="divide-y divide-white/10">
              {stats.popularItems.slice(0, 8).map((item, idx) => (
                <div key={item.itemId} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      idx === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white" :
                      idx < 3 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {toArabicNumber(idx + 1)}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {toArabicNumber(item.totalSold)} طلب
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">لا توجد بيانات بعد</p>
              <p className="text-xs text-muted-foreground/60 mt-1">ستظهر هنا الأصناف الأكثر طلباً</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-premium">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">آخر الطلبات</h3>
            </div>
            <Link href="/owner/orders">
              <Button variant="ghost" size="xs" className="text-xs">عرض الكل</Button>
            </Link>
          </div>

          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="divide-y divide-white/10">
              {stats.recentOrders.slice(0, 6).map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <ShoppingCart className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">لا توجد طلبات بعد</p>
              <p className="text-xs text-muted-foreground/60 mt-1">عندما يطلب الزبائن، ستظهر هنا</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/owner/menu">
            <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group">
              <ClipboardList className="size-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">إدارة المنيو</span>
            </button>
          </Link>
          <Link href="/owner/orders">
            <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group">
              <ShoppingCart className="size-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">الطلبات</span>
            </button>
          </Link>
          <Link href="/owner/qr">
            <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group">
              <QrCode className="size-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">رمز QR</span>
            </button>
          </Link>
          <Link href={`/menu/${restaurant?.slug}`} target="_blank">
            <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group">
              <ExternalLink className="size-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">المنيو العام</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Loyalty Quick Stats */}
      {(loyaltyStats.totalLoyaltyCards ?? 0) > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/5 to-amber-600/5 backdrop-blur-xl dark:from-amber-400/5 dark:to-amber-500/5 border border-amber-200/30 dark:border-amber-500/10 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">برنامج الولاء</h3>
            </div>
            <Link href="/owner/loyalty">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20 rounded-xl">
                إدارة
                <ArrowLeft className="size-3.5" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/50 dark:bg-white/5 p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <Users className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الأعضاء</p>
                <p className="text-xl font-bold">{toArabicNumber(loyaltyStats.totalLoyaltyCards ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/50 dark:bg-white/5 p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <Gift className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الإحالات</p>
                <p className="text-xl font-bold">{toArabicNumber(loyaltyStats.totalReferrals ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/50 dark:bg-white/5 p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                <Award className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">نقاط الممنوحة</p>
                <p className="text-xl font-bold">-</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
