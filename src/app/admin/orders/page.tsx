"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ClipboardList,
  Search,
  AlertCircle,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Order {
  id: number
  orderNo: string
  customerName: string
  customerPhone: string
  status: string
  total: number
  subtotal: number
  items: { quantity: number }[]
  createdAt: string
}

const statusTabs = [
  { value: "", label: "الكل" },
  { value: "new", label: "جديد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
]

const statusBadge: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  preparing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ready:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const statusLabel: Record<string, string> = {
  new: "جديد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  completed: "مكتمل",
  cancelled: "ملغي",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const router = useRouter()

  const fetchOrders = useCallback(async (status: string) => {
    try {
      setLoading(true)
      setError(null)
      const url = status ? `/api/orders?status=${status}` : "/api/orders"
      const res = await fetch(url)
      if (!res.ok) throw new Error("فشل تحميل الطلبات")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders(statusFilter)
  }, [statusFilter, fetchOrders])

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("فشل تحديث الحالة")
      toast.success(`تم تغيير الحالة إلى ${statusLabel[status] || status}`)
      fetchOrders(statusFilter)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    )
  })

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-16 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">عذراً، حدث خطأ</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" onClick={() => fetchOrders(statusFilter)}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">الطلبات</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ClipboardList className="h-12 w-12" />
          <p className="text-lg font-medium">
            {search ? "لا توجد نتائج للبحث" : "لا توجد طلبات"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/admin/orders/${order.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{order.orderNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {order.items?.length ?? 0} أصناف
                      </p>
                      <p className="font-semibold">{order.total} ر.س</p>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        statusBadge[order.status] ??
                          "bg-gray-100 text-gray-700"
                      )}
                    >
                      {statusLabel[order.status] || order.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
