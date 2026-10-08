'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatDate, formatPrice } from '@/lib/format';
import { KpiCard } from '@/components/admin/KpiCard';
import { AreaChart } from '@/components/shared/AreaChart';
import { HorizontalBar } from '@/components/shared/HorizontalBar';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';

import { Store, TrendingUp, AlertCircle, Users, ArrowUpRight, UserPlus, Activity, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import AnimatedShoppingCart from '@/components/ui/shopping-cart-icon';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { MotionLogIn } from '@/components/ui/motion-icons';
import AnimatedBarChart3 from '@/components/ui/chart-bar-icon';
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';

interface StatsData {
        totalUsers: number;
        totalRestaurants: number;
        totalOrders: number;
        freePlanCount: number;
        paidPlanCount: number;
        monthlyRevenue: number;
        recentSignups: {
                id: number;
                name: string;
                slug: string;
                createdAt: string;
                owner: { id: number; name: string; username: string } | null;
        }[];
        recentLogins: {
                id: number;
                name: string;
                username: string;
                lastLoginAt: string;
                restaurant: { id: number; name: string } | null;
        }[];
        ordersToday: { count: number; revenue: number };
        systemEvents: {
                id: number;
                eventType: string;
                title: string;
                message: string;
                severity: string;
                createdAt: string;
                read: boolean;
        }[];
        linkedRestaurants: number;
        revenueTrend: { date: string; revenue: number }[];
        orderVolumeTrend: { date: string; count: number }[];
        topItems: { itemId: number; name: string; totalSold: number }[];
        userGrowthPct: number;
        restaurantGrowthPct: number;
        avgOrderValue: number;
        avgOrderValuePrev: number;
        topRestaurants: {
                restaurant: { id: number; name: string; isActive: boolean; slug: string } | null;
                orderCount: number;
        }[];
}

export default function AdminDashboard() {
        const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'VIEW_ANALYTICS'));


        const [stats, setStats] = useState<StatsData | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        const load = useCallback(async () => {
                try {
                        setError(null);
                        const res = await fetch('/api/admin/stats');
                        if (!res.ok) throw new Error('فشل تحميل البيانات');
                        const json = await res.json();
                        setStats(json.data);
                } catch {
                        setError('فشل تحميل البيانات');
                } finally {
                        setLoading(false);
                }
        }, []);

        useEffect(() => {
                // r121: a denied viewer never fetches — previously the stats poll
                // fired (and 403'd) before the access check rendered AccessDenied,
                // showing the misleading «فشل تحميل البيانات» to a zero-permission
                // sub_admin whose real state is «غير مصرح».
                if (access === 'denied') return;
                load();
        }, [load, access]);

        // Poll every 30s (paused while tab is hidden)
        // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
        usePollWhenVisible(
                () => {
                        if (error || access === 'denied') return;
                        void load();
                },
                30000,
                [load, error, access]
        );

        // ---------- Access denied (r121: FIRST — no point loading/denying twice) ----------
        if (access === 'denied') return <AccessDenied />;

        // ---------- Loading skeleton ----------
        if (loading) {
                return (
                        <div
                                aria-live="polite"
                                aria-label="جارٍ التحميل"
                                className="max-w-6xl mx-auto space-y-8 animate-fade-in"
                        >
                                <LoadingAnnouncer loading message="جارٍ تحميل لوحة التحكم..." />
                                <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                                <div className="h-8 w-48 skeleton rounded-lg" />
                                                <div className="h-4 w-32 skeleton rounded-lg" />
                                        </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="h-28 rounded-md skeleton" />
                                        ))}
                                </div>
                                <div className="grid gap-6 lg:grid-cols-2">
                                        <div className="h-[300px] rounded-md skeleton" />
                                        <div className="h-[300px] rounded-md skeleton" />
                                </div>
                                <div className="grid gap-6 lg:grid-cols-3">
                                        {[1, 2, 3].map((i) => (
                                                <div key={i} className="h-[260px] rounded-md skeleton" />
                                        ))}
                                </div>
                        </div>
                );
        }

        // ---------- Error state ----------
        if (error) {
                return (
                        <div
                                aria-live="assertive"
                                className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in"
                        >
                                <div className="relative mb-2">
                                        <div className="size-16 rounded-full glass flex items-center justify-center">
                                                <AlertCircle className="size-8 text-destructive" />
                                        </div>
                                        <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10" />
                                </div>
                                <p className="text-lg font-medium">{error}</p>
                                <p className="text-sm text-muted-foreground">تحقق من الاتصال وحاول مرة أخرى</p>
                                <Button variant="outline" onClick={load} className="gap-2">
                                        <AnimatedRefreshCw className="size-4" />
                                        إعادة المحاولة
                                </Button>
                        </div>
                );
        }

        // ---------- Empty state ----------
        if (!stats) {
                return (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                                <AnimatedBarChart3 className="size-12 text-muted-foreground/50" />
                                <p className="text-lg font-medium">لا توجد بيانات</p>
                                <Button variant="outline" onClick={load} className="gap-2">
                                        <AnimatedRefreshCw className="size-4" />
                                        تحميل
                                </Button>
                        </div>
                );
        }

        return (
                <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                                <div>
                                        <h1 className="text-2xl font-bold tracking-normal">لوحة التحكم</h1>
                                        <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على شبكة المطاعم</p>
                                </div>
                                <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={load} aria-label="تحديث البيانات">
                                                <AnimatedRefreshCw className="size-4" aria-hidden="true" />
                                        </Button>
                                        <Badge variant="outline" className="gap-1.5 bg-success/10 dark:bg-success/15">
                                                <Activity className="size-3.5 text-success" aria-hidden="true" />
                                                مباشر
                                        </Badge>
                                </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <KpiCard
                                        label="إجمالي المطاعم"
                                        value={stats.totalRestaurants}
                                        icon={Store}
                                        iconBg="bg-orange-muted"
                                        iconColor="text-orange"
                                        trend={stats.restaurantGrowthPct}
                                        href="/admin/restaurants"
                                />
                                <KpiCard
                                        label="إجمالي المستخدمين"
                                        value={stats.totalUsers}
                                        icon={Users}
                                        iconBg="bg-info/10 dark:bg-info/15"
                                        iconColor="text-info"
                                        trend={stats.userGrowthPct}
                                        href="/admin/users"
                                />
                                <KpiCard
                                        label="الإيراد الشهري"
                                        value={stats.monthlyRevenue}
                                        icon={DollarSign}
                                        iconBg="bg-success/10"
                                        iconColor="text-success"
                                        suffix=" د.ل"
                                />
                                <KpiCard
                                        label="إجمالي الطلبات"
                                        value={stats.totalOrders}
                                        icon={ShoppingCart}
                                        iconBg="bg-orange-muted/80"
                                        iconColor="text-orange"
                                        sparklineData={stats.orderVolumeTrend.slice(-7).map((d) => d.count)}
                                />
                        </div>

                        {/* Charts: Revenue + Order Volume */}
                        <div className="grid gap-6 lg:grid-cols-2">
                                {/* Revenue trend */}
                                <div className="rounded-xl bg-card/70 border border-border/30 p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                        <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
                                                        <h2 className="text-sm font-semibold">اتجاه الإيرادات (30 يوم)</h2>
                                                </div>
                                        </div>
                                        {stats.revenueTrend.length > 0 ? (
                                                <AreaChart
                                                        data={stats.revenueTrend.map((d) => ({
                                                                label: d.date.slice(5),
                                                                value: Number(d.revenue),
                                                        }))}
                                                        height={220}
                                                        /* r121-K-5: data-bearing SR name (was the generic «مخطط مساحي») */
                                                        ariaLabel={`اتجاه الإيرادات آخر 30 يومًا: من ${formatPrice(
                                                                Number(stats.revenueTrend[0]?.revenue ?? 0)
                                                        )} إلى ${formatPrice(
                                                                Number(stats.revenueTrend[stats.revenueTrend.length - 1]?.revenue ?? 0)
                                                        )}`}
                                                />
                                        ) : (
                                                <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-muted-foreground/50">
                                                        <TrendingUp className="size-8" />
                                                        <p className="text-sm">لا توجد بيانات</p>
                                                </div>
                                        )}
                                </div>

                                {/* Order volume trend */}
                                <div className="rounded-xl bg-card/70 border border-border/30 p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                        <AnimatedShoppingCart className="size-4 text-muted-foreground" aria-hidden="true" />
                                                        <h2 className="text-sm font-semibold">حجم الطلبات (30 يوم)</h2>
                                                </div>
                                        </div>
                                        {stats.orderVolumeTrend.length > 0 ? (
                                                <AreaChart
                                                        data={stats.orderVolumeTrend.map((d) => ({ label: d.date.slice(5), value: d.count }))}
                                                        height={220}
                                                        color="var(--chart-2)" /* r130 (W2-3): theme-aware mint series (was night-only #7FD39A) */
                                                        gradientId="order-gradient"
                                                        /* r121-K-5: data-bearing SR name (was the generic «مخطط مساحي») */
                                                        ariaLabel={`حجم الطلبات آخر 30 يومًا: من ${toArabicNumber(
                                                                stats.orderVolumeTrend[0]?.count ?? 0
                                                        )} إلى ${toArabicNumber(
                                                                stats.orderVolumeTrend[stats.orderVolumeTrend.length - 1]?.count ?? 0
                                                        )} طلب`}
                                                />
                                        ) : (
                                                <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-muted-foreground/50">
                                                        <AnimatedShoppingCart className="size-8" />
                                                        <p className="text-sm">لا توجد بيانات</p>
                                                </div>
                                        )}
                                </div>
                        </div>

                        {/* Charts: Top items + Quick metrics */}
                        <div className="grid gap-6 lg:grid-cols-2">
                                {/* Top items */}
                                <div className="rounded-xl bg-card/70 border border-border/30 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                                <AnimatedBarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
                                                <h2 className="text-sm font-semibold">الأصناف الأكثر طلباً</h2>
                                        </div>
                                        {stats.topItems.length > 0 ? (
                                                <HorizontalBar
                                                        data={stats.topItems.map((i) => ({ label: i.name, value: i.totalSold }))}
                                                />
                                        ) : (
                                                <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground/50">
                                                        <AnimatedBarChart3 className="size-8" />
                                                        <p className="text-sm">لا توجد بيانات</p>
                                                </div>
                                        )}
                                </div>

                                {/* Quick metrics */}
                                <div className="rounded-xl bg-card/70 border border-border/30 p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                                <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
                                                <h2 className="text-sm font-semibold">مؤشرات سريعة</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-md bg-orange-muted/50 p-4">
                                                        <p className="text-xs text-muted-foreground">معدل الطلب</p>
                                                        <p className="text-2xl font-bold mt-1 tabular-nums">{formatPrice(stats.avgOrderValue, { decimals: 2 })}</p>
                                                        <p className="text-2xs text-muted-foreground mt-0.5">متوسط قيمة الطلب</p>
                                                </div>
                                                <div className="rounded-md bg-success/10 dark:bg-success/15 p-4">
                                                        <p className="text-xs text-success">مدفوع</p>
                                                        <p className="text-2xl font-bold mt-1 text-success tabular-nums">
                                                                {toArabicNumber(stats.paidPlanCount)}
                                                        </p>
                                                        <p className="text-2xs text-muted-foreground mt-0.5">اشتراك مدفوع</p>
                                                </div>
                                                <div className="rounded-md bg-orange-muted/50 p-4">
                                                        <p className="text-xs text-accent-foreground">مرتبط</p>
                                                        <p className="text-2xl font-bold mt-1 tabular-nums">{toArabicNumber(stats.linkedRestaurants)}</p>
                                                        <p className="text-2xs text-muted-foreground mt-0.5">مطعم مرتبط</p>
                                                </div>
                                                <div className="rounded-md bg-orange-muted/50 p-4">
                                                        <p className="text-xs text-accent-foreground">طلبات اليوم</p>
                                                        <p className="text-2xl font-bold mt-1 tabular-nums">{toArabicNumber(stats.ordersToday.count)}</p>
                                                        <p className="text-2xs text-muted-foreground mt-0.5">
                                                                {formatPrice(stats.ordersToday.revenue, { suffix: ' د.ل إيراد' })}
                                                        </p>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                                {/* Recent signups */}
                                <div className="rounded-xl bg-card/70 border border-border/30 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                        <UserPlus className="size-4 text-muted-foreground" aria-hidden="true" />
                                                        <h2 className="text-sm font-semibold">آخر الاشتراكات</h2>
                                                </div>
                                        </div>
                                        {stats.recentSignups.length > 0 ? (
                                                <div className="divide-y divide-border/20">
                                                        {stats.recentSignups.map((r) => (
                                                                <div
                                                                        key={r.id}
                                                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                                                                >
                                                                        <div className="flex items-center gap-3">
                                                                                <div
                                                                                        className="size-9 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center"
                                                                                        aria-hidden="true"
                                                                                >
                                                                                        <Store className="size-4 text-primary" />
                                                                                </div>
                                                                                <div>
                                                                                        <p className="text-sm font-medium">{r.name}</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                {r.owner ? r.owner.name : '—'}
                                                                                                <span className="ms-1 text-xs">
                                                                                                        {formatDate(new Date(r.createdAt))}
                                                                                                </span>
                                                                                        </p>
                                                                                </div>
                                                                        </div>
                                                                        <Link href={`/menu/${r.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`عرض منيو ${r.name}`}>
                                                                                <ArrowUpRight className="size-3 text-muted-foreground rtl:-scale-x-100" aria-hidden="true" />
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
                                <div className="rounded-xl bg-card/70 border border-border/30 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                        <MotionLogIn className="size-4 text-muted-foreground" aria-hidden="true" />
                                                        <h2 className="text-sm font-semibold">آخر تسجيلات الدخول</h2>
                                                </div>
                                        </div>
                                        {stats.recentLogins.length > 0 ? (
                                                <div className="divide-y divide-border/20">
                                                        {stats.recentLogins.map((u) => (
                                                                <div
                                                                        key={u.id}
                                                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                                                                >
                                                                        <div className="flex items-center gap-3">
                                                                                <div
                                                                                        className="size-9 rounded-xl bg-info/10 dark:bg-info/15 flex items-center justify-center"
                                                                                        aria-hidden="true"
                                                                                >
                                                                                        <Users className="size-4 text-info" />
                                                                                </div>
                                                                                <div>
                                                                                        <p className="text-sm font-medium">{u.name}</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                {u.restaurant?.name || '—'}
                                                                                                <span className="ms-1 text-xs">
                                                                                                        {u.lastLoginAt ? formatDate(new Date(u.lastLoginAt)) : ''}
                                                                                                </span>
                                                                                        </p>
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        ))}
                                                </div>
                                        ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                                        <MotionLogIn className="size-10 text-muted-foreground/40" aria-hidden="true" />
                                                        <p className="text-sm text-muted-foreground">لا توجد تسجيلات دخول حديثة</p>
                                                </div>
                                        )}
                                </div>

                                {/* Top Restaurants by Orders */}
                                <div className="rounded-xl bg-card/70 border border-border/30 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                        <AnimatedBarChart3 className="size-4 text-muted-foreground" />
                                                        <h2 className="text-sm font-semibold">المطاعم الأكثر طلباً</h2>
                                                </div>
                                        </div>
                                        {stats.topRestaurants && stats.topRestaurants.length > 0 ? (
                                                <HorizontalBar
                                                        data={stats.topRestaurants.map((r) => ({
                                                                label: r.restaurant?.name ?? '—',
                                                                value: r.orderCount,
                                                        }))}
                                                />
                                        ) : (
                                                <EmptyState
                                                        icon={BarChart3}
                                                        title="لا توجد بيانات بعد"
                                                        description="ستظهر المطاعم هنا بعد تسجيل أول الطلبات"
                                                />
                                        )}
                                </div>
                        </div>

                        {/* Quick actions */}
                        <div className="rounded-xl bg-card/70 border border-border/30 p-5 shadow-sm">
                                <h2 className="text-sm font-semibold text-muted-foreground mb-4">إجراءات سريعة</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                                { label: 'إضافة مطعم', href: '/admin/restaurants', icon: Store, color: 'text-orange' },
                                                { label: 'الطلبات', href: '/admin/orders', icon: ShoppingCart, color: 'text-orange' },
                                                { label: 'المستخدمين', href: '/admin/users', icon: Users, color: 'text-info' },
                                                {
                                                        label: 'سجل التدقيق',
                                                        href: '/admin/audit-logs',
                                                        icon: Activity,
                                                        color: 'text-success',
                                                },
                                        ].map((item, i) => {
                                                const Icon = item.icon;
                                                return (
                                                        <Link
                                                                key={i}
                                                                href={item.href}
                                                                className="flex w-full flex-col items-center gap-2 rounded-xl border border-border/20 bg-muted/30 p-4 hover:bg-orange-muted/30 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                        >
                                                                <Icon
                                                                        className={cn('size-5 group-hover:scale-110 transition-transform', item.color)}
                                                                        aria-hidden="true"
                                                                />
                                                                <span className="text-xs font-medium">{item.label}</span>
                                                        </Link>
                                                );
                                        })}
                                </div>
                        </div>

                        {/* Live indicator */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50 pb-4">
                                <span className="size-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                                يتم التحديث تلقائياً كل 30 ثانية
                        </div>
                </div>
        );
}
