"use client"

import { useEffect, useRef, useState, memo } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { ShoppingCart, TrendingUp, Clock, ClipboardList, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span>{toArabicNumber(display)}{suffix}</span>
}

/* ---------- Loading skeleton (matches StatCard shape exactly) ---------- */

export function OwnerKpiGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-md border border-border/30 bg-card/60 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="size-11 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Stat Card ---------- */

const StatCard = memo(function StatCard({ label, value, icon: Icon, subtitle, color, bg, href, index = 0 }: {
  label: string; value: number; icon: typeof ShoppingCart; subtitle?: string
  color: string; bg: string; href?: string; index?: number
}) {
  const reduceMotion = useReducedMotion();
  const card = (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-normal"><AnimatedCounter value={value} /></p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-md p-3 ring-1 ring-border/30", bg)}>
          <Icon className={cn("size-5", color)} aria-hidden="true" />
        </div>
      </div>
    </>
  );

  /* Entrance: soft fade/slide ≤300ms with a light stagger per card.
     Disabled entirely under prefers-reduced-motion. */
  const entranceTransition = reduceMotion
    ? undefined
    : { duration: 0.28, ease: "easeOut" as const, delay: index * 0.06 };

  /* a11y (4.1.2 / keyboard): clickable cards are real stretched Links — a native
     anchor gives role=link + Enter activation + focus for free, instead of a
     div with an unannounced onClick. */
  if (href) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={entranceTransition}
        className={cn(
          "group relative rounded-md bg-card/60 backdrop-blur-sm border border-border/30 shadow-sm transition-all duration-300",
          "hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5",
        )}>
        {/* stretched-link pattern: whole card is one link target */}
        <Link
          href={href}
          className="absolute inset-0 z-10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
        >
          <span className="sr-only">{label}</span>
        </Link>
        <div className="p-5">{card}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={entranceTransition}
      className={cn(
        "group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-all duration-300",
      )}>
      {card}
    </motion.div>
  );
})

interface StatsData {
  totalOrders: number; todayOrders: number; todayRevenue?: number; totalItems: number
  popularItems: { itemId: number; name: string; totalSold: number }[]
  recentOrders: { id: number; orderNo: string; customerName: string; status: string; total: number; createdAt: string }[]
  statusBreakdown: Record<string, number>
}

interface OwnerKpiGridProps {
  stats: StatsData | null
  /** True while the dashboard fetch is in flight — shows card-shaped skeletons. */
  isLoading?: boolean
  /** Load-failure message; with no stats, renders an inline retry state. */
  error?: string | null
  onRetry?: () => void
}

export function OwnerKpiGrid({ stats, isLoading = false, error = null, onRetry }: OwnerKpiGridProps) {
  if (isLoading && !stats) return <OwnerKpiGridSkeleton />

  if (error && !stats) {
    return (
      <div className="rounded-md border border-border/30 bg-card/50 shadow-sm">
        <EmptyState
          icon={AlertCircle}
          title={error}
          description="تعذّر تحميل مؤشرات لوحة التحكم. تحقق من الاتصال ثم أعد المحاولة."
          className="py-8"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              إعادة المحاولة
            </Button>
          }
        />
      </div>
    )
  }

  const pendingOrders = stats ? (stats.statusBreakdown["new"] ?? 0) + (stats.statusBreakdown["preparing"] ?? 0) : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard index={0} label="إجمالي الطلبات" value={stats?.totalOrders ?? 0} icon={ShoppingCart} subtitle="كل الوقت"
        color="text-night" bg="bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] shadow-lg shadow-orange/15 group-hover:shadow-orange/25"
        href="/owner/orders" />
      <StatCard index={1} label="طلبات اليوم" value={stats?.todayOrders ?? 0} icon={TrendingUp}
        subtitle={stats?.todayRevenue ? `${toArabicNumber(stats.todayRevenue.toFixed(1))} د.ل` : undefined}
        color="text-success" bg="bg-success/10"
        href="/owner/orders" />
      <StatCard index={2} label="قيد الانتظار" value={pendingOrders} icon={Clock}
        subtitle={stats ? `${toArabicNumber(stats.statusBreakdown["new"] ?? 0)} جديد • ${toArabicNumber(stats.statusBreakdown["preparing"] ?? 0)} تحضير` : ""}
        color="text-flame dark:text-saffron" bg="bg-orange-muted dark:bg-orange-muted"
        href="/owner/orders" />
      <StatCard index={3} label="الأصناف" value={stats?.totalItems ?? 0} icon={ClipboardList}
        color="text-ember" bg="bg-orange-muted dark:bg-orange-muted"
        href="/owner/menu" />
    </div>
  )
}
