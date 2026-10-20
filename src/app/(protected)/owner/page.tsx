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
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { KpiGridSkeleton, ListCardSkeleton } from '@/components/shared/DashboardSkeletons';
/* W7-B (G-4): حالة القفل الصادقة لتبويب «تحليلات» («إحصائيات متقدمة» —
   بريميوم فأعلى؛ التعزيز 403 في /api/stats/advanced). */
import { PlanFeatureLock } from '@/components/shared/PlanFeatureLock';

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
        /* W7-B (G-4): حق «إحصائيات متقدمة» من قراءة الخادم المخصصة —
           يقرر (1) هل يُجلب /api/stats/advanced أصلًا (لا طلب 403 لكل
           تحميل لوحة تحت الرتبة) و(2) هل يُعرض التبويب مقفولًا أم
           محلّلًا. null = الحقيقة لم تصل بعد (تفاؤلي؛ الخادم يرفض
           عند الحاجة). */
        const [advancedStatsAllowed, setAdvancedStatsAllowed] = useState<boolean | null>(null);

        const load = useCallback(async (rid: number) => {
                try {
                        const [restRes, statsRes, loyaltyRes, entRes] = await Promise.all([
                                fetch(`/api/restaurants/${rid}`),
                                fetch(`/api/stats?restaurantId=${rid}`),
                                fetch(`/api/loyalty/stats?restaurantId=${rid}`),
                                /* W7-B (G-4): قراءة الحقوق الخفيفة — نفس الموجة، استعلام
                                   مفتاح أساسي واحد. تحت الرتبة لا يُطلب المسار المتقدم
                                   أصلًا (صفر طلبات 403 في التحميل). */
                                fetch(`/api/owner/entitlements?restaurantId=${rid}`),
                        ]);

                        if (statsRes.status === 401) {
                                router.push('/login');
                                return;
                        }
                        let advancedAllowed: boolean | null = null;
                        if (entRes.ok) {
                                const ent = await entRes.json().catch(() => null);
                                if (ent?.success) {
                                        advancedAllowed = Boolean(ent.data?.features?.advancedStats);
                                        setAdvancedStatsAllowed(advancedAllowed);
                                }
                        }
                        /* W7-B: الجلب المتقدم خلف الحق فقط — المالك دون بريميوم
                           يرى تبويب التحليلات مقفولًا (PlanFeatureLock) ولا
                           تُستهلك استعلاماته الـ14 أصلًا. (متغير محلي — قيمة
                           الحالة داخل الإغلاق لا تتحدث منتصف الدالة.) */
                        let advancedRes: Response | null = null;
                        if (advancedAllowed !== false) {
                                advancedRes = await fetch(`/api/stats/advanced?restaurantId=${rid}`);
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
                        if (advancedRes?.ok) {
                                const advData = await advancedRes.json();
                                setStats((prev) => (prev ? { ...prev, advancedStats: advData.data } : prev));
                        }
                } catch {
                        setError('تعذّر تحميل البيانات');
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
                // r131-F5 (A1 P1-6): shape-matched skeleton family (same KPI /
                // breakdown-card rhythm as the hydrated dashboard) — the old
                // animate-pulse blocks were a third loading language.
                return (
                        <div
                                aria-live="polite"
                                aria-label="جارٍ تحميل بيانات لوحة التحكم"
                                className="space-y-8 animate-fade-in"
                        >
                                <LoadingAnnouncer loading={true} message="جارٍ تحميل بيانات لوحة التحكم…" />
                                <KpiGridSkeleton />
                                <div className="grid gap-6 lg:grid-cols-3">
                                        <ListCardSkeleton />
                                        <ListCardSkeleton />
                                        <ListCardSkeleton rows={3} />
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
                                                : 'أكمل خطوة الدفع من صفحة الاشتراك لتفعيل المنيو الخاص بك — عند الموافقة ستظهر لافتة التفعيل هنا.'
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
                // r131-F5 (A1 P1-12): the ONE canonical error family — 56px pastel
                // well + dot + retry CTA (was the hand-rolled icon-tile copy).
                return (
                        <ErrorState
                                title={error}
                                description="تعذّر تحميل بيانات المطعم — تحقق من الاتصال ثم أعد المحاولة."
                                onRetry={() => activeId && load(activeId)}
                        />
                );

        const statusTotal = stats ? Object.values(stats.statusBreakdown).reduce((a, b) => a + b, 0) : 0;

        return (
                /* r131-F5 (A1 P0-8/P1-7): canonical container — 1280px content column,
                   40px section rhythm (was max-w-6xl/1152 + 24px gaps). */
                <div className="mx-auto max-w-[1280px] space-y-10 animate-page-enter">
                        {/* r131-F5 (A1 P0-8): the page h1 is now a VISIBLE canonical
                                PageHeader (clamp 28-40 / 700 / hairline separator / actions
                                toolbar) — was sr-only. */}
                        <PageHeader
                                title="لوحة التحكم"
                                subtitle={restaurant ? `${restaurant.name} — نظرة عامة على الطلبات والمبيعات` : 'نظرة عامة على مطعمك: الطلبات والمبيعات والولاء'}
                                actions={
                                        restaurant && (
                                                <Link href={`/menu/${restaurant.slug}`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="outline" size="sm" className="gap-1.5">
                                                                <AnimatedExternalLink className="size-3.5" /> عرض المنيو
                                                        </Button>
                                                </Link>
                                        )
                                }
                        />

                        {/* Welcome banner (new owners) */}
                        {restaurant && stats && stats.totalOrders === 0 && (
                                <div className="rounded-lg border border-orange/20 bg-orange-muted p-5 animate-fade-in">
                                        <div className="flex items-start gap-4 flex-wrap">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange">
                                                        <AnimatedSparkles className="size-6 text-orange-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                        <h2 className="font-heading text-base font-bold mb-1 flex items-center gap-2">مرحباً بك في الربط الذكي!
                                                <span className="inline-flex items-center gap-1 text-2xs font-semibold tabular-nums text-[var(--success-ink)] bg-[var(--success-soft)] border border-transparent rounded-full px-2 py-0.5">
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
                                <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card p-5 shadow-sm">
                                        <div className="flex items-start justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-3">
                                                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange">
                                                                <Store className="size-6 text-orange-foreground" />
                                                        </div>
                                                        <div>
                                                                <h2 className="font-heading text-lg font-bold">{restaurant.name}</h2>
                                                                <p className="text-xs text-muted-foreground">
                                                                        {restaurant.description || 'مطعمك على الربط الذكي'}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-1.5 text-2xs text-muted-foreground">
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
                                <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                                        <h2 className="font-heading text-xs font-semibold text-muted-foreground mb-3">إجراءات سريعة</h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {[
                                                        { href: '/owner/menu', icon: ClipboardList, label: 'إدارة المنيو' },
                                                        { href: '/owner/orders', icon: ShoppingCart, label: 'الطلبات' },
                                                        { href: '/owner/qr', icon: QrCode, label: 'رمز QR' },
                                                        { href: '/owner/settings', icon: Settings, label: 'الإعدادات' },
                                                ].map(({ href, icon: Icon, label }) => (
                                                        <Link key={href} href={href}>
                                                                <div
                                                                        className="group relative overflow-hidden rounded-md border border-border/50 bg-background p-3.5 transition-[box-shadow,transform] duration-fast hover:border-orange/30 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer focus-within:ring-2 focus-within:ring-ring/60"
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
                                {advancedStatsAllowed === false ? (
                                        /* W7-B (G-4): قفل صادق — التبويب يبقى في قائمة
                                           التبويبات (لا إخفاء)، ومحتواه يشرح ويحيل
                                           إلى /subscribe؛ لا شيء يتظاهر بالتحميل. */
                                        <PlanFeatureLock feature="advancedStats" className="py-12" />
                                ) : tab === 'analytics' && restaurant?.id ? (
                                        <AnalyticsTab
                                                advancedStats={stats?.advancedStats}
                                                restaurantId={restaurant.id}
                                        />
                                ) : tab === 'analytics' ? (
                                        // r127-F3 (K-13): last hand-rolled analytics empty-state
                                        // → shared EmptyState primitive (icon sizing/spacing now
                                        // come from the primitive — no size-10 drift).
                                        <EmptyState
                                                icon={BarChart3}
                                                title="لا توجد بيانات تحليلات بعد"
                                                description="ستظهر التحليلات المتقدمة هنا بعد وصول أول الطلبات."
                                                className="py-12"
                                        />
                                ) : null}
                        </div>

                        {/* Share your menu card */}
                        {restaurant && (
                                <div className="rounded-lg border border-orange/20 bg-orange-muted p-5 animate-fade-in">
                                        <div className="flex items-start justify-between flex-wrap gap-4">
                                                <div className="flex items-start gap-3">
                                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange">
                                                                <AnimatedQrCode className="size-5 text-orange-foreground" />
                                                        </div>
                                                        <div>
                                                                <h2 className="font-heading text-sm font-bold mb-1">شارك منيو مطعمك</h2>
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
                                <div className="rounded-lg border border-orange/20 bg-orange-muted p-4">
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
                                                                color: 'text-[var(--accent-ink)]',
                                                                bg: 'bg-[var(--accent-soft)]',
                                                        },
                                                        {
                                                                label: 'الإحالات',
                                                                value: loyaltyStats.totalReferrals ?? 0,
                                                                icon: Gift,
                                                                color: 'text-[var(--success-ink)]',
                                                                bg: 'bg-[var(--success-soft)]',
                                                        },
                                                        {
                                                                label: 'تحويل',
                                                                value: loyaltyStats.conversionRate
                                                                        ? `${toArabicNumber(loyaltyStats.conversionRate)}%`
                                                                        : '-',
                                                                icon: Award,
                                                                color: 'text-[var(--accent-ink)]',
                                                                bg: 'bg-[var(--accent-soft)]',
                                                        },
                                                        {
                                                                label: 'محولة',
                                                                value: loyaltyStats.convertedReferrals ?? 0,
                                                                icon: CheckCircle,
                                                                color: 'text-[var(--success-ink)]',
                                                                bg: 'bg-[var(--success-soft)]',
                                                        },
                                                ].map(({ label, value, icon: Icon, color, bg }) => (
                                                        <div key={label} className="flex items-center gap-2.5 rounded-md bg-card/50 p-3">
                                                                <div className={`size-9 rounded-full ${bg} flex items-center justify-center`}>
                                                                        <Icon className={`size-4 ${color}`} />
                                                                </div>
                                                                <div>
                                                                        <p className="text-2xs text-muted-foreground">{label}</p>
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
