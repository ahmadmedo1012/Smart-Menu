"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ClipboardList,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Stats {
  totalOrders: number
  totalItems: number
  pendingOrders: number
  recentOrders: {
    id: number
    orderNo: string
    customerName: string
    status: string
    total: number
    createdAt: string
  }[]
  popularItems: { name: string; nameAr: string; orderCount: number }[]
}

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "قيد التحضير", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready: { label: "جاهز", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  completed: { label: "مكتمل", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error("فشل تحميل الإحصائيات")
        return r.json()
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-28 animate-pulse" />
          ))}
        </div>
        <Card className="h-64 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">عذراً، حدث خطأ</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const statCards = [
    {
      label: "إجمالي الطلبات",
      value: stats?.totalOrders ?? 0,
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "إجمالي الأصناف",
      value: stats?.totalItems ?? 0,
      icon: ShoppingCart,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "طلبات معلقة",
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">لوحة التحكم</h2>
        <Badge variant="outline" className="gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          نظرة عامة
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-5">
                <div className={cn("rounded-xl p-3", card.bg)}>
                  <card.icon className={cn("h-6 w-6", card.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">آخر الطلبات</h3>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="divide-y">
                {stats.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{order.orderNo}</span>
                      <span className="text-muted-foreground">
                        {order.customerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{order.total} ر.س</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          statusMap[order.status]?.color ??
                            "bg-gray-100 text-gray-700"
                        )}
                      >
                        {statusMap[order.status]?.label ?? order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                لا توجد طلبات بعد
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">الأصناف الأكثر طلباً</h3>
          </CardHeader>
          <CardContent className="p-0">
            {stats?.popularItems && stats.popularItems.length > 0 ? (
              <div className="divide-y">
                {stats.popularItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {item.nameAr || item.name}
                    </span>
                    <span className="text-muted-foreground">
                      {item.orderCount} طلب
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                لا توجد إحصائيات بعد
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
