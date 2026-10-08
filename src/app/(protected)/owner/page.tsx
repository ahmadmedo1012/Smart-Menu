'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {Store, ClipboardList, AlertCircle, Package, Award, Gift, Users, CheckCircle, BarChart3, Settings, Activity, ShoppingCart, QrCode, Clock} from 'lucide-react';
import AnimatedQrCode from '@/components/ui/qrcode-icon';
import PlugConnectedIcon from '@/components/ui/plug-connected-icon';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import AnimatedShoppingCart from '@/components/ui/shopping-cart-icon';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import AnimatedExternalLink from '@/components/ui/external-link-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatDate } from '@/lib/format';
import Link from 'next/link';
import { premiumToast } from '@/lib/premium-toast';
import { useOrderNotifier } from '@/components/layout/OrderNotifier';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
// r121-P-4: حالة ما قبل التفعيل — تاريخ طلب الدفع المعلّق يصل من التخطيط
// الخادمي (owner/layout.tsx) عبر سياق الجلسة، بلا أي استعلام إضافي.
import { useOwnerSession } from './OwnerShell';
// round86-C4: active-restaurant resolution via the shared hook (this page
// previously hand-rolled it WITHOUT the switch event subscription — a
// restaurant switch left stale data until reload)
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { EmptyState } from '@/components/ui/empty-state';
import { OwnerKpiGrid } from './OwnerKpiGrid';
import { StatusBreakdown, PopularItems, RecentOrders } from './OwnerOrdersList';
import { AnalyticsTab } from './OwnerCharts';

/* ---------- Types ---------- */

interface RestaurantData {
        id: number;
        name: string;
        slug: string;
        description: string;
        _count: { orders: number; categories: number };
}

interface StatsData {
        totalOrders: number;
        todayOrders: number;
        todayRevenue?: number;
        totalItems: number;
        popularItems: { itemId: number; name: string; totalSold: number }[];
        recentOrders: {
                id: number;
                orderNo: string;
                customerName: string;
                status: string;
                total: number;
                createdAt: string;
        }[];
        statusBreakdown: Record<string, number>;
}

interface LoyaltyStats {
        totalLoyaltyCards?: number;
        totalReferrals?: number;
        convertedReferrals?: number;
        conversionRate?: number;
}

interface AdvancedStats {
        range?: 'today' | 'week' | 'month';
        revenue7d: { date: string; revenue: number }[];
        orders7d: { date: string; count: number }[];
        topItems: { itemId: number; name: string; totalSold: number; growth: number }[];
        hourlyDistribution: { hour: number; count: number }[];
        aovTrend: { date: string; aov: number }[];
        growthPct: number;
        categoryBreakdown?: { categoryId: number; name: string; count: number; pct: number }[];
        dailyActivity?: {
                current: { date: string; count: number }[];
                previous: { date: string; count: number }[];
        };
}

/* ================================================================
   PAGE
   ================================================================ */

export default function OwnerDashboard() {
        const router = useRouter();
        const { activeId, loaded: activeLoaded } = useActiveRestaurant();
        // r121-P-4: { pendingPaymentSince } — مُغذّى من owner/layout.tsx (الخادم)
        const ownerSession = useOwnerSession();
        const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
        const [stats, setStats] = useState<(StatsData & { advancedStats?: AdvancedStats }) | null>(null);
        const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({});
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [tab, setTab] = useState<'overview' | 'analytics'>('overview');

        const load = useCallback(async (rid: number) => {
                try {
                        const [restRes, statsRes, loyaltyRes, advancedRes] = await Promise.all([
                                fetch(`/api/restaurants/${rid}`),
                                fetch(`/api/stats?restaurantId=${rid}`),
                                fetch(`/api/loyalty/stats?restaurantId=${rid}`),
                                fetch(`/api/stats/advanced?restaurantId=${rid}`),
                        ]);

                        if (statsRes.status === 401) {
                                router.push('/login');
                                return;
                        }
                        if (restRes.ok) {
                                const restData = await restRes.json();
                                setRestaurant(restData.data ?? restData);
                        }
                        if (statsRes.ok) {
                                const statsData = await statsRes.json();
                                setStats(statsData.data ?? statsData);
                        }
                        if (loyaltyRes.ok) {
                                const l = await loyaltyRes.json();
                                if (l.success && l.data) setLoyaltyStats(l.data);
                        }
                        if (advancedRes.ok) {
                                const advData = await advancedRes.json();
                                setStats((prev) => (prev ? { ...prev, advancedStats: advData.data } : prev));
                        }
                } catch {
                        setError('فشل تحميل البيانات');
                } finally {
                        setLoading(false);
                }
        }, [router]);

        useEffect(() => {
                if (!activeLoaded) return;
                if (!activeId) {
                        /* r121-P-4: حالة ما قبل التفعيل لم تعد «خطأ» عامًا — انظر بطاقة
                           الانتظار الصادقة أسفل فرع التحميل. قبل هذا كان المصدر يضبط
                           رسالة خطأ عامة وزر «إعادة المحاولة» لا يفعل شيئًا
                           (activeId لا وجود له أصلًا). */
                        setLoading(false);
                        return;
                }
                load(activeId);
        }, [activeLoaded, activeId, load, router]);
        useOrderNotifier(restaurant?.id);

        if (loading)
                return (
                        <div
                                aria-live="polite"
                                aria-label="جارٍ تحميل بيانات لوحة التحكم"
                                className="space-y-5 animate-fade-in"
                        >
                                <LoadingAnnouncer loading={true} message="جارٍ تحميل بيانات لوحة التحكم..." />
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {[1, 2, 3, 4].map((i) => (
                                                <div
                                                        key={i}
                                        className="h-32 rounded-xl border border-border/60 bg-card p-5 space-y-3 animate-pulse"
                                                        aria-hidden="true"
                                                >
                                                        <div className="h-3 w-20 rounded-full bg-muted/70" />
                                                        <div className="h-8 w-28 rounded-sm bg-muted/60" />
                                                </div>
                                        ))}
                                </div>
                                <div className="grid gap-6 lg:grid-cols-3">
                                        {[1, 2, 3].map((i) => (
                                                <div
                                                        key={i}
                                                        className="h-52 rounded-xl border border-border/60 bg-card p-4 space-y-3 animate-pulse"
                                                        aria-hidden="true"
                                                >
                                                        <div className="h-3 w-24 rounded-full bg-muted/70" />
                                                        <div className="h-3 w-full rounded-full bg-muted/50 mt-4" />
                                                        <div className="h-3 w-3/4 rounded-full bg-muted/50" />
                                                        <div className="h-3 w-1/2 rounded-full bg-muted/50" />
                                                </div>
                                        ))}
                                </div>
                                <div className="h-28 rounded-xl border border-border/60 bg-card p-4 animate-pulse" aria-hidden="true">
                                        <div className="h-3 w-20 rounded-full bg-muted/70" />
                                </div>
                        </div>
                );

        if (!activeId && activeLoaded)
                // r121-P-4: بطاقة الانتظار الصادقة — كان المالك العائد (أغلق التبويب وذهب
                // للبنك) يصل إلى رسالة خطأ عامة وزر إعادة محاولة لا يفعل شيئًا. الآن:
                // طلب معلّق ⇒ تاريخه + شرح منع الإرسال المزدوج + وعد إشعار صادق (لافتة
                // subscription_approved في UserBannerNotifier)؛ لا طلب ⇒ مسار إكمال الدفع.
                return (
                        <EmptyState
                                icon={ownerSession?.pendingPaymentSince ? Clock : AlertCircle}
                                title={
                                        ownerSession?.pendingPaymentSince
                                                ? 'طلب الدفع قيد المراجعة'
                                                : 'لم يتم تفعيل حسابك بعد'
                                }
                                description={
                                        ownerSession?.pendingPaymentSince
                                                ? `أرسلت طلب الدفع في ${formatDate(new Date(ownerSession.pendingPaymentSince))}. تتحقق الإدارة من التحويل وتفعّل حسابك — ستظهر لافتة «تم تفعيل اشتراكك» هنا فور الموافقة. لا يمكن إرسال طلب دفع جديد قبل البتّ في الطلب الحالي.`
                                                : 'أكمل خطوة الدفع من صفحة الاشتراك لتفعيل منيوك — عند الموافقة ستظهر لافتة التفعيل هنا.'
                                }
                                action={
                                        ownerSession?.pendingPaymentSince ? (
                                                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                                        تحديث الحالة
                                                </Button>
                                        ) : (
                                                <Button variant="orange" size="sm" onClick={() => router.push('/subscribe')}>
                                                        إكمال الدفع
                                                </Button>
                                        )
                                }
                        />
                );

        if (error)
                // r97-X2 [15]: unified with the EmptyState component (siblings already
                // use it) — the legacy `.empty-state-icon` CSS class is gone here.
                return (
                        <EmptyState
                                icon={AlertCircle}
                                title={error}
                                action={
                                        <Button variant="outline" size="sm" onClick={() => activeId && load(activeId)}>
                                                إعادة المحاولة
                                        </Button>
                                }
                        />
                );

        const statusTotal = stats ? Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0) : 0;

        return (
                <div className="mx-auto max-w-6xl space-y-6 animate-page-enter">
                        {/* a11y: page h1 — visually hidden so design is untouched */}
                        <h1 className="sr-only">لوحة التحكم</h1>

                        {/* Welcome banner (new owners) */}
                        {restaurant && stats && stats.totalOrders === 0 && (
                                <div className="rounded-xl border border-orange/20 bg-orange-muted/35 p-5 animate-fade-in">
                                        <div className="flex items-start gap-4 flex-wrap">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-orange">
                                                        <AnimatedSparkles className="size-6 text-orange-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                        <h2 className="text-base font-bold mb-1 flex items-center gap-2">مرحباً بك في الربط الذكي!
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                                                        <PlugConnectedIcon className="size-3" />
                                                        متصل — يستقبل الطلبات
                                                </span>
                                        </h2>
                                                        <p className="text-xs text-muted-foreground mb-3 max-w-md leading-relaxed">
                                                                ابدأ بإضافة أصنافك في المنيو، ثم شارك الرابط مع زبائنك. أول طلب سيصل هنا مباشرة!
                                                        </p>
                                                        <div className="flex gap-2 flex-wrap">
                                                                <Link href="/owner/menu">
                                                                        <Button
                                                                                size="sm"
                                                                                className="gap-1.5 text-xs"
                                                                        >
                                                                                <ClipboardList className="size-3.5" /> أضف أصنافك
                                                                        </Button>
                                                                </Link>
                                                                <Link href="/owner/qr">
                                                                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                                                                <AnimatedQrCode className="size-3.5" /> احصل على QR
                                                                        </Button>
                                                                </Link>
                                                                <Link href={`/menu/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
                                                                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                                                                <AnimatedExternalLink className="size-3.5" /> عرض المنيو
                                                                        </Button>
                                                                </Link>
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* Tab navigation — complete APG tabs pattern:
                                id + aria-controls on each tab, matching role=tabpanel panels below,
                                and roving-tabindex arrow-key navigation. RTL arrow semantics: the LEFT
                                arrow moves to the NEXT tab in reading order (right-to-left), RIGHT goes back. */}
                        <div
                                role="tablist"
                                aria-label="أقسام لوحة التحكم"
                                className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
                                onKeyDown={(e) => {
                                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                                        e.preventDefault();
                                        const ids = ['overview', 'analytics'] as const;
                                        const cur = ids.indexOf(tab);
                                        let nextId: (typeof ids)[number];
                                        if (e.key === 'Home') nextId = ids[0];
                                        else if (e.key === 'End') nextId = ids[ids.length - 1];
                                        else if (e.key === 'ArrowLeft') nextId = ids[(cur + 1) % ids.length];
                                        else nextId = ids[(cur - 1 + ids.length) % ids.length];
                                        setTab(nextId);
                                        document.getElementById(`owner-tab-${nextId}`)?.focus();
                                }}
                        >
                                {([
                                        { id: 'overview', label: 'نظرة عامة', icon: Activity },
                                        { id: 'analytics', label: 'تحليلات', icon: BarChart3 },
                                ] as const).map((t) => {
                                        const TIcon = t.icon;
                                        return (
                                                <button
                                                        key={t.id}
                                                        type="button"
                                                        role="tab"
                                                        id={`owner-tab-${t.id}`}
                                                        aria-selected={tab === t.id}
                                                        aria-controls={`owner-panel-${t.id}`}
                                                        tabIndex={tab === t.id ? 0 : -1}
                                                        onClick={() => setTab(t.id)}
                                                        className={cn(
                                                                'snap-start flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                tab === t.id
                                                                        ? 'bg-orange-muted border-orange/30 text-accent-foreground/80 dark:text-accent-foreground'
                                                                        : 'border-border/30 hover:border-orange/20'
                                                        )}
                                                >
                                                        <TIcon className="size-4" aria-hidden="true" /> {t.label}
                                                </button>
                                        );
                                })}
                        </div>

                        {/* Restaurant header */}
                        {restaurant && (
                                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                                        <div className="flex items-start justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-3">
                                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-orange">
                                                                <Store className="size-6 text-orange-foreground" />
                                                        </div>
                                                        <div>
                                                                <h2 className="text-lg font-bold">{restaurant.name}</h2>
                                                                <p className="text-xs text-muted-foreground">
                                                                        {restaurant.description || 'مطعمك على الربط الذكي'}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                                                        <span className="flex items-center gap-1">
                                                                                <Package className="size-3" /> {restaurant._count.categories} أقسام
                                                                        </span>
                                                                        <span className="flex items-center gap-1">
                                                                                <ClipboardList className="size-3" /> {stats?.totalItems ?? 0} صنف
                                                                        </span>
                                                                        <span className="flex items-center gap-1">
                                                                                <AnimatedShoppingCart className="size-3" /> {stats?.totalOrders ?? 0} طلب
                                                                        </span>
                                                                </div>
                                                        </div>
                                                </div>
                                                <Link href={`/menu/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                                                <AnimatedExternalLink className="size-3.5" /> عرض المنيو
                                                        </Button>
                                                </Link>
                                        </div>
                                </div>
                        )}

                        {/* a11y: panels stay mounted with hidden toggling so each tab's
                                aria-controls always references an existing tabpanel in the DOM */}
                        <div
                                role="tabpanel"
                                id="owner-panel-overview"
                                aria-labelledby="owner-tab-overview"
                                tabIndex={0}
                                hidden={tab !== 'overview'}
                                className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 rounded-md"
                        >
                                <OwnerKpiGrid stats={stats} />

                                <div className="grid gap-6 lg:grid-cols-3">
                                        <StatusBreakdown stats={stats} statusTotal={statusTotal} />
                                        <PopularItems items={stats?.popularItems ?? []} />
                                        <RecentOrders orders={stats?.recentOrders ?? []} />
                                </div>

                                {/* Quick actions */}
                                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                                        <h2 className="text-xs font-semibold text-muted-foreground mb-3">إجراءات سريعة</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {[
                                                        { href: '/owner/menu', icon: ClipboardList, label: 'إدارة المنيو' },
                                                        { href: '/owner/orders', icon: ShoppingCart, label: 'الطلبات' },
                                                        { href: '/owner/qr', icon: QrCode, label: 'رمز QR' },
                                                        { href: '/owner/settings', icon: Settings, label: 'الإعدادات' },
                                                ].map(({ href, icon: Icon, label }) => (
                                                        <Link key={href} href={href}>
                                                                <div
                                                                        className="group relative overflow-hidden rounded-lg border border-border/50 bg-background p-3.5 transition-[box-shadow,transform] duration-fast hover:border-orange/30 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer focus-within:ring-2 focus-within:ring-ring/60"
                                                                >
                                                                        <div className="relative flex flex-col items-center gap-1.5">
                                                                                <Icon className="size-4 text-orange group-hover:scale-110 group-hover:rotate-[-4deg] transition-transform duration-base motion-reduce:transition-none" aria-hidden="true" />
                                                                                <span className="text-xs font-medium">{label}</span>
                                                                        </div>
                                                                </div>
                                                        </Link>
                                                ))}
                                        </div>
                                </div>
                        </div>

                        {/* Analytics tab panel */}
                        <div
                                role="tabpanel"
                                id="owner-panel-analytics"
                                aria-labelledby="owner-tab-analytics"
                                tabIndex={0}
                                hidden={tab !== 'analytics'}
                                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 rounded-md"
                        >
                                {tab === 'analytics' && restaurant?.id ? (
                                        <AnalyticsTab
                                                advancedStats={stats?.advancedStats}
                                                restaurantId={restaurant.id}
                                        />
                                ) : tab === 'analytics' ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <BarChart3 className="size-10 text-muted-foreground/40 mb-4" aria-hidden="true" />
                                                <p className="font-semibold text-lg mb-1">لا توجد بيانات تحليلات بعد</p>
                                                <p className="text-sm text-muted-foreground max-w-md">
                                                        ستظهر التحليلات المتقدمة هنا بعد وصول أول الطلبات. جرّب تحديث الصفحة لاحقاً.
                                                </p>
                                        </div>
                                ) : null}
                        </div>

                        {/* Share your menu card */}
                        {restaurant && (
                                <div className="rounded-xl border border-orange/20 bg-orange-muted/30 p-5 animate-fade-in">
                                        <div className="flex items-start justify-between flex-wrap gap-4">
                                                <div className="flex items-start gap-3">
                                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange">
                                                                <AnimatedQrCode className="size-5 text-orange-foreground" />
                                                        </div>
                                                        <div>
                                                                <h2 className="text-sm font-bold mb-1">شارك منيو مطعمك</h2>
                                                                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                                                                        امسح رمز QR أو شارك الرابط مع زبائنك ليصبح بإمكانهم الطلب مباشرة
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                                        <span
                                                                                className="text-xs text-muted-foreground bg-card/50 rounded-full px-3 py-1.5 font-mono border border-border/20"
                                                                                dir="ltr"
                                                                                style={{ direction: 'ltr' }}
                                                                        >
                                                                                {typeof window !== 'undefined'
                                                                                        ? `${window.location.origin}/menu/${restaurant.slug}`
                                                                                        : `.../menu/${restaurant.slug}`}
                                                                        </span>
                                                                        <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-8 text-xs gap-1.5"
                                                                                onClick={() => {
                                                                                        const url = `${window.location.origin}/menu/${restaurant.slug}`;
                                                                                        navigator.clipboard
                                                                                                .writeText(url)
                                                                                                .then(() => premiumToast('copy', 'تم نسخ الرابط'));
                                                                                }}
                                                                        >
                                                                                <AnimatedCopy className="size-3" /> نسخ
                                                                        </Button>
                                                                </div>
                                                        </div>
                                                </div>
                                                <Link href="/owner/qr">
                                                        <Button
                                                                size="sm"
                                                                className="h-8 gap-1.5 text-xs"
                                                        >
                                                                <AnimatedQrCode className="size-3.5" /> عرض QR
                                                        </Button>
                                                </Link>
                                        </div>
                                </div>
                        )}

                        {/* Loyalty quick stats */}
                        {(loyaltyStats.totalLoyaltyCards ?? 0) > 0 && (
                                <div className="rounded-xl border border-orange/20 bg-orange-muted/15 p-4">
                                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                        <Award className="size-4 text-orange" />
                                                        <h2 className="text-xs font-semibold">برنامج الولاء والإحالات</h2>
                                                </div>
                                                <Link href="/owner/loyalty">
                                                        <Button
                                                                size="sm"
                                                                className="h-8 gap-1.5 text-xs"
                                                        >
                                                                إدارة <MotionArrowLeft className="size-3" />
                                                        </Button>
                                                </Link>
                                        </div>
                                        <div className="grid gap-2.5 sm:grid-cols-4">
                                                {[
                                                        {
                                                                label: 'الأعضاء',
                                                                value: loyaltyStats.totalLoyaltyCards ?? 0,
                                                                icon: Users,
                                                                color: 'text-orange',
                                                                bg: 'bg-orange-muted',
                                                        },
                                                        {
                                                                label: 'الإحالات',
                                                                value: loyaltyStats.totalReferrals ?? 0,
                                                                icon: Gift,
                                                                color: 'text-success',
                                                                bg: 'bg-success/10',
                                                        },
                                                        {
                                                                label: 'تحويل',
                                                                value: loyaltyStats.conversionRate
                                                                        ? `${toArabicNumber(loyaltyStats.conversionRate)}%`
                                                                        : '-',
                                                                icon: Award,
                                                                color: 'text-orange',
                                                                bg: 'bg-orange-muted',
                                                        },
                                                        {
                                                                label: 'محولة',
                                                                value: loyaltyStats.convertedReferrals ?? 0,
                                                                icon: CheckCircle,
                                                                color: 'text-success',
                                                                bg: 'bg-success/10',
                                                        },
                                                ].map(({ label, value, icon: Icon, color, bg }) => (
                                                        <div key={label} className="flex items-center gap-2.5 rounded-md bg-card/50 p-3">
                                                                <div className={`size-9 rounded-md ${bg} flex items-center justify-center`}>
                                                                        <Icon className={`size-4 ${color}`} />
                                                                </div>
                                                                <div>
                                                                        <p className="text-[11px] text-muted-foreground">{label}</p>
                                                                        <p className="text-base font-bold">
                                                                                {typeof value === 'number' ? toArabicNumber(value) : value}
                                                                        </p>
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                </div>
                        )}
                </div>
        );
}
