"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from "@/lib/format"
import CountUp from "@/components/landing/CountUp"

const BarChart = dynamic(() => import("@/components/shared/BarChart"), { ssr: false })

import {
  Store, ShoppingCart, TrendingUp, AlertCircle,
  Crown, Users, ArrowUpRight, Sparkles, Plus,
  RefreshCw, UserPlus, LogIn, Bell, ShieldAlert,
  Activity, DollarSign, MapPin,
} from "lucide-react"

interface StatsData {
  totalUsers: number
  totalRestaurants: number
  totalOrders: number
  freePlanCount: number
  paidPlanCount: number
  monthlyRevenue: number
  recentSignups: { id: number; name: string; slug: string; createdAt: string; owner: { id: number; name: string; username: string } | null }[]
  recentLogins: { id: number; name: string; username: string; lastLoginAt: string; restaurant: { id: number; name: string } | null }[]
  ordersToday: { count: number; revenue: number }
  systemEvents: { id: number; eventType: string; title: string; message: string; severity: string; createdAt: string; read: boolean }[]
  linkedRestaurants: number
}

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  error: { label: "خطأ", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  warning: { label: "تحذير", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  info: { label: "معلومة", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  success: { label: "نجاح", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("فشل تحميل البيانات")
      const json = await res.json()
      setStats(json.data)
    } catch {
      setError("فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll every 30s
  useEffect(() => {
    if (error) return
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load, error])

  const chartData = stats
    ? [
        { label: "مجاني", value: stats.freePlanCount, color: "#9ca3af" },
        { label: "مدفوع", value: stats.paidPlanCount, color: "#f59e0b" },
      ]
    : []

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div aria-live="polite" aria-label="جارٍ التحميل" className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 skeleton rounded-lg" />
            <div className="h-4 w-32 skeleton rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-breath" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-muted/50 animate-breath" />
          <div className="h-64 rounded-2xl bg-muted/50 animate-breath" />
        </div>
      </div>
    )
  }

  // ---------- Error state ----------
  if (error) {
    return (
      <div aria-live="assertive" className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="relative mb-2">
          <div className="size-16 rounded-full glass flex items-center justify-center">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10" />
        </div>
        <p className="text-lg font-medium">{error}</p>
        <p className="text-sm text-muted-foreground">تحقق من الاتصال وحاول مرة أخرى</p>
        <Button variant="gradient-outline" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  // ---------- Empty state ----------
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <Store className="size-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">لا توجد بيانات</p>
        <Button variant="gradient-outline" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="size-4" />
          تحميل
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على شبكة المطاعم</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={load} aria-label="تحديث">
            <RefreshCw className="size-4" />
          </Button>
          <Badge variant="outline" className="gap-1.5 bg-white/30 dark:bg-white/5 backdrop-blur-sm">
            <Activity className="size-3.5 text-emerald-500" />
            مباشر
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "إجمالي المطاعم", value: stats.totalRestaurants, icon: Store, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "الإيراد الشهري", value: stats.monthlyRevenue, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", suffix: " د.ل" },
          { label: "إجمالي الطلبات", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white/70 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-sm group">
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold tracking-tight">
                    <CountUp value={card.value} suffix={card.suffix || ""} />
                  </p>
                </div>
                <div className={cn("rounded-2xl p-3.5 ring-1 ring-white/20", card.bg + "/50")} aria-hidden="true">
                  <Icon className={cn("size-6", card.color)} aria-hidden="true" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sub-stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">مدفوع</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
            {toArabicNumber(stats.paidPlanCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/20 border border-gray-200/30 p-4">
          <p className="text-xs text-muted-foreground">مجاني</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(stats.freePlanCount)}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/30 p-4">
          <p className="text-xs text-blue-600 dark:text-blue-400">مرتبط</p>
          <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">
            {toArabicNumber(stats.linkedRestaurants)}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30 p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">طلبات اليوم</p>
          <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
            {toArabicNumber(stats.ordersToday.count)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan distribution chart */}
        <div className="rounded-2xl bg-white/50 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-muted-foreground">توزيع الخطط</h3>
            </div>
            <Link href="/admin/restaurants">
              <Button variant="ghost" size="xs" className="text-xs">إدارة</Button>
            </Link>
          </div>
          {chartData.length > 0 && chartData.some(d => d.value > 0) ? (
            <Suspense fallback={<div className="h-[180px] rounded-2xl skeleton" />}>
              <BarChart data={chartData} height={180} />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px] gap-2 text-muted-foreground/50">
              <TrendingUp className="size-8" aria-hidden="true" />
              <p className="text-sm">لا توجد بيانات للخطط</p>
            </div>
          )}
        </div>

        {/* System alerts */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">تنبيهات النظام</h3>
            </div>
          </div>
          {stats.systemEvents.length > 0 ? (
            <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto">
              {stats.systemEvents.map((ev) => {
                const sev = SEVERITY_STYLES[ev.severity] || SEVERITY_STYLES.info
                return (
                  <div key={ev.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", sev.bg)} aria-hidden="true">
                      <ShieldAlert className={cn("size-4", sev.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <Badge className={cn("text-[10px] px-1.5 py-0", sev.bg, sev.color)}>
                          {sev.label}
                        </Badge>
                      </div>
                      {ev.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {formatDate(new Date(ev.createdAt))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Bell className="size-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">لا توجد تنبيهات</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent signups */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">آخر الاشتراكات</h3>
            </div>
          </div>
          {stats.recentSignups.length > 0 ? (
            <div className="divide-y divide-white/10">
              {stats.recentSignups.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center" aria-hidden="true">
                      <Store className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.owner ? r.owner.name : "—"}
                        <span className="mr-1 text-[10px] opacity-60">
                          {formatDate(new Date(r.createdAt))}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Link href={`/menu/${r.slug}`} target="_blank" aria-label={`عرض منيو ${r.name}`}>
                    <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <UserPlus className="size-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">لا توجد اشتراكات حديثة</p>
            </div>
          )}
        </div>

        {/* Recent logins */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <LogIn className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">آخر تسجيلات الدخول</h3>
            </div>
          </div>
          {stats.recentLogins.length > 0 ? (
            <div className="divide-y divide-white/10">
              {stats.recentLogins.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center" aria-hidden="true">
                      <Users className="size-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.restaurant?.name || "—"}
                        <span className="mr-1 text-[10px] opacity-60">
                          {u.lastLoginAt ? formatDate(new Date(u.lastLoginAt)) : ""}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <LogIn className="size-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">لا توجد تسجيلات دخول حديثة</p>
            </div>
          )}
        </div>

        {/* Active restaurants */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">المطاعم النشطة</h3>
            </div>
          </div>
          {stats.recentSignups.length > 0 ? (
            <div className="divide-y divide-white/10">
              {stats.recentSignups.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 flex items-center justify-center" aria-hidden="true">
                      <Store className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">/{r.slug}</p>
                    </div>
                  </div>
                  <Link href={`/menu/${r.slug}`} target="_blank" aria-label={`عرض منيو ${r.name}`}>
                    <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <MapPin className="size-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">لا توجد مطاعم نشطة</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "إضافة مطعم", href: "/admin/restaurants", icon: Store, color: "text-amber-600" },
            { label: "الطلبات", href: "/admin/orders", icon: ShoppingCart, color: "text-blue-600" },
            { label: "المستخدمين", href: "/admin/users", icon: Users, color: "text-purple-600" },
            { label: "سجل التدقيق", href: "/admin/audit-logs", icon: Activity, color: "text-emerald-600" },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <Link key={i} href={item.href}>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group"
                >
                  <Icon className={cn("size-5 group-hover:scale-110 transition-transform", item.color)} aria-hidden="true" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50 pb-4">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
        يتم التحديث تلقائياً كل 30 ثانية
      </div>
    </div>
  )
}
