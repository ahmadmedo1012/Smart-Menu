"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"

const BarChart = dynamic(() => import("@/components/shared/BarChart"), { ssr: false })

import {
  Store, ShoppingCart, TrendingUp, AlertCircle,
  Crown, Users, ArrowUpRight, Sparkles, Plus
} from "lucide-react"

interface Restaurant { id: number; name: string; slug: string; _count: { orders: number; categories: number }; plan: { name: string; nameAr: string; price: number } | null }
interface Plan { id: number; name: string; nameAr: string; price: number }

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const [restRes, plansRes] = await Promise.all([
        fetch("/api/restaurants"), fetch("/api/plans"),
      ])
      const restData = await restRes.json()
      const plansData = await plansRes.json()
      setRestaurants(restData.data?.restaurants ?? restData.data ?? [])
      setPlans(plansData.data ?? [])
    } catch { setError("فشل تحميل البيانات") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const totalOrders = restaurants.reduce((a, r) => a + r._count.orders, 0)
  const paidCount = restaurants.filter(r => r.plan && r.plan.price > 0).length
  const monthlyRevenue = restaurants.reduce((s, r) => s + (r.plan?.price ?? 0), 0)

  const chartData = plans.map(p => ({
    label: p.nameAr,
    value: restaurants.filter(r => r.plan?.name === p.name).length,
    color: p.name === "Free" ? "#9ca3af" : p.name === "Basic" ? "#f59e0b" : p.name === "Pro" ? "#d97706" : "#8b5cf6",
  }))

  if (loading) return (
    <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
      {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-breath" />)}
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle className="size-10 text-destructive" />
      <p>{error}</p>
      <Button variant="outline" onClick={load}>إعادة المحاولة</Button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">لوحة التحكم</h2>
          <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على شبكة المطاعم</p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-white/30 dark:bg-white/5 backdrop-blur-sm">
          <TrendingUp className="size-3.5" />
          مباشر
        </Badge>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "إجمالي المطاعم", value: restaurants.length, icon: Store, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "على خطة مدفوعة", value: paidCount, icon: Crown, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "الإيراد الشهري", value: monthlyRevenue, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", suffix: " د.ل" },
          { label: "إجمالي الطلبات", value: totalOrders, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white/70 p-5 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-premium group">
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {toArabicNumber(card.value)}{(card as any).suffix || ""}
                  </p>
                </div>
                <div className={cn("rounded-2xl p-3.5 ring-1 ring-white/20", card.bg + "/50")}>
                  <Icon className={cn("size-6", card.color)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Plan distribution chart */}
      <div className="rounded-2xl bg-white/50 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 p-6 shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground">توزيع الخطط</h3>
          <Link href="/admin/restaurants">
            <Button variant="ghost" size="xs" className="text-xs">إدارة</Button>
          </Link>
        </div>
        <Suspense fallback={<div className="h-[180px] rounded-2xl skeleton" />}>
          <BarChart data={chartData} height={180} />
        </Suspense>
      </div>

      {/* Restaurants + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Restaurants */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-premium">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">المطاعم</h3>
            </div>
            <Link href="/admin/restaurants"><Button variant="ghost" size="xs" className="text-xs">إدارة</Button></Link>
          </div>
          {restaurants.length > 0 ? (
            <div className="divide-y divide-white/10">
              {restaurants.slice(0, 6).map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center">
                      <Store className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r._count.orders} طلب · {r._count.categories} قسم</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.plan ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white">{r.plan.nameAr}</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">مجاني</span>
                    )}
                    <Link href={`/menu/${r.slug}`} target="_blank">
                      <ArrowUpRight className="size-3 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Store className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا توجد مطاعم بعد</p>
              <Link href="/admin/restaurants">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                  <Plus className="size-3.5" /> أضف أول مطعم
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl bg-white/60 backdrop-blur-xl dark:bg-white/5 border border-white/30 dark:border-white/10 p-5 shadow-premium">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "إضافة مطعم", href: "/admin/restaurants", icon: Store, color: "text-amber-600" },
              { label: "الطلبات", href: "/admin/orders", icon: ShoppingCart, color: "text-blue-600" },
              { label: "المستخدمين", href: "/admin/users", icon: Users, color: "text-purple-600" },
              { label: "QR كود", href: "/admin/qr", icon: Crown, color: "text-emerald-600" },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <Link key={i} href={item.href}>
                  <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all group">
                    <Icon className={cn("size-5 group-hover:scale-110 transition-transform", item.color)} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
