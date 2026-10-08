'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, TrendingUp, Activity, DollarSign, Clock, PieChart } from 'lucide-react';
import AnimatedDollarSign from '@/components/ui/currency-dollar-icon';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { AreaChart } from '@/components/shared/AreaChart';
import { HorizontalBar } from '@/components/shared/HorizontalBar';
import { SplineAreaChart } from '@/components/shared/SplineAreaChart';
import { ColumnChart } from '@/components/shared/ColumnChart';
import { DoughnutChart } from '@/components/shared/DoughnutChart';
import { ChartCard } from '@/components/shared/ChartCard';
import { KpiCard } from '@/components/admin/KpiCard';
import {
        type AnalyticsRange,
        dayLabel,
        hourLabel,
        parseAnalyticsRange,
        seriesHasData,
} from '@/lib/chart-stats';

// r93-W2a (U2): جمع عربي ديناميكي لعدد طلبات ساعة الذروة (نمط cartCountPhrase
// من r92-A9) — «طلب واحد / طلبان / 5 طلبات / 12 طلبًا» بدل «N طلب» الثابت الذي
// كان ينكسر عند 3-10 (يريد «طلبات») و11+ (يريد «طلبًا»). توحّق الأرقام غربية
// عبر toArabicNumber (كان peak.count خامًا في سطر الملخص). مُصدَّرة ليبثها
// الاختبار (سابقة cartCountPhrase).
export function peakOrdersPhrase(count: number): string {
        const noun = getArabicPlural(count, 'طلب', {
                one: 'طلب واحد',
                two: 'طلبان',
                few: 'طلبات',
                many: 'طلبًا',
        });
        return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

interface CategoryShare {
        categoryId: number;
        name: string;
        count: number;
        pct: number;
}

interface AdvancedStats {
        range?: AnalyticsRange;
        revenue7d: { date: string; revenue: number }[];
        orders7d: { date: string; count: number }[];
        topItems: { itemId: number; name: string; totalSold: number; growth: number }[];
        hourlyDistribution: { hour: number; count: number }[];
        aovTrend: { date: string; aov: number }[];
        growthPct: number;
        categoryBreakdown?: CategoryShare[];
        dailyActivity?: {
                current: { date: string; count: number }[];
                previous: { date: string; count: number }[];
        };
}

const RANGE_LABELS: { id: AnalyticsRange; label: string }[] = [
        { id: 'today', label: 'اليوم' },
        { id: 'week', label: 'هذا الأسبوع' },
        { id: 'month', label: 'هذا الشهر' },
];

function RangeToggle({
        value,
        onChange,
        disabled,
}: {
        value: AnalyticsRange;
        onChange: (r: AnalyticsRange) => void;
        disabled?: boolean;
}) {
        return (
                // r127-F3 (K-9): role="radiogroup" downgraded to a plain group —
                // the radio contract requires roving tabindex + arrow-key
                // navigation that this picker never implemented. Filter-style
                // toggle buttons with aria-pressed are the honest pattern
                // (CategoryTabs decision); OrderDialog keeps a true radiogroup
                // because it implements the full APG contract.
                <div
                        role="group"
                        aria-label="نطاق التاريخ"
                        className="flex flex-wrap gap-1.5"
                >
                        {RANGE_LABELS.map((r) => {
                                const selected = value === r.id;
                                return (
                                        <button
                                                key={r.id}
                                                type="button"
                                                aria-pressed={selected}
                                                disabled={disabled}
                                                onClick={() => onChange(r.id)}
                                                className={cn(
                                                        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                        selected
                                                                ? 'border-orange/40 bg-orange-muted text-accent-foreground'
                                                                : 'border-border/50 bg-background text-muted-foreground hover:border-orange/20'
                                                )}
                                        >
                                                {r.label}
                                        </button>
                                );
                        })}
                </div>
        );
}

export function AnalyticsTab({
        advancedStats,
        restaurantId,
}: {
        advancedStats?: AdvancedStats | null;
        restaurantId?: number;
}) {
        const [range, setRange] = useState<AnalyticsRange>(
                parseAnalyticsRange(advancedStats?.range)
        );
        const [data, setData] = useState<AdvancedStats | null>(advancedStats ?? null);
        const [loading, setLoading] = useState(!advancedStats);
        const [error, setError] = useState<string | null>(null);
        const didInit = useRef(false);

        const load = useCallback(
                async (nextRange: AnalyticsRange) => {
                        if (!restaurantId) return;
                        setLoading(true);
                        setError(null);
                        try {
                                const res = await fetch(
                                        `/api/stats/advanced?restaurantId=${restaurantId}&range=${nextRange}`
                                );
                                if (!res.ok) {
                                        setError('تعذر تحميل التحليلات');
                                        return;
                                }
                                const json = await res.json();
                                if (json.success && json.data) setData(json.data);
                                else setError('تعذر تحميل التحليلات');
                        } catch {
                                setError('تعذر تحميل التحليلات');
                        } finally {
                                setLoading(false);
                        }
                },
                [restaurantId]
        );

        useEffect(() => {
                if (!restaurantId) return;
                if (!didInit.current) {
                        didInit.current = true;
                        if (advancedStats && range === 'week') return;
                }
                void load(range);
                // advancedStats is only used for the first-paint skip
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [restaurantId, range, load]);

        const stats = data;

        const revenueSparkline = useMemo(
                () => (stats?.revenue7d ?? []).map((r) => r.revenue),
                [stats?.revenue7d]
        );
        const ordersSparkline = useMemo(
                () => (stats?.orders7d ?? []).map((o) => o.count),
                [stats?.orders7d]
        );
        const chartData = useMemo(
                () => (stats?.revenue7d ?? []).map((d) => ({ label: dayLabel(String(d.date).slice(0, 10)), value: d.revenue })),
                [stats?.revenue7d]
        );
        const hourly = useMemo(
                () => stats?.hourlyDistribution ?? [],
                [stats?.hourlyDistribution]
        );
        const hourlyHasData = seriesHasData(hourly.map((h) => h.count));
        const peak = useMemo(() => {
                if (!hourlyHasData || hourly.length === 0) return null;
                return hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);
        }, [hourly, hourlyHasData]);

        const topBar = useMemo(
                () =>
                        (stats?.topItems ?? []).slice(0, 10).map((i) => ({
                                label: i.name,
                                value: i.totalSold,
                        })),
                [stats?.topItems]
        );

        const categories = stats?.categoryBreakdown ?? [];
        const daily = stats?.dailyActivity;
        const dailyLabels = (daily?.current ?? []).map((d) => dayLabel(d.date));
        const dailyHasData = seriesHasData([
                ...(daily?.current ?? []).map((d) => d.count),
                ...(daily?.previous ?? []).map((d) => d.count),
        ]);

        const revenue7dTotal = useMemo(
                () => (stats?.revenue7d ?? []).reduce((s, r) => s + r.revenue, 0),
                [stats?.revenue7d]
        );
        const orders7dTotal = useMemo(
                () => (stats?.orders7d ?? []).reduce((s, o) => s + o.count, 0),
                [stats?.orders7d]
        );
        const aovAvg = useMemo(
                () =>
                        Math.round(
                                (stats?.aovTrend ?? []).reduce((s, a) => s + a.aov, 0) /
                                        Math.max(stats?.aovTrend.length ?? 0, 1)
                        ),
                [stats?.aovTrend]
        );

        return (
                <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground">تصفية الرسوم حسب الفترة</p>
                                <RangeToggle value={range} onChange={setRange} disabled={loading} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <KpiCard
                                        label="إيرادات 7 أيام"
                                        value={revenue7dTotal}
                                        icon={DollarSign}
                                        iconBg="bg-success/10"
                                        iconColor="text-success"
                                        suffix=" د.ل"
                                        trend={stats?.growthPct}
                                        sparklineData={revenueSparkline}
                                />
                                <KpiCard
                                        label="طلبات 7 أيام"
                                        value={orders7dTotal}
                                        icon={ShoppingCart}
                                        iconBg="bg-orange-muted"
                                        iconColor="text-orange"
                                        sparklineData={ordersSparkline}
                                />
                                <KpiCard
                                        label="متوسط قيمة الطلب"
                                        value={aovAvg}
                                        icon={TrendingUp}
                                        iconBg="bg-info/15"
                                        iconColor="text-info"
                                        suffix=" د.ل"
                                />
                                <KpiCard
                                        label="النمو"
                                        value={stats?.growthPct ?? 0}
                                        icon={Activity}
                                        iconBg="bg-orange-muted/80"
                                        iconColor="text-orange"
                                        suffix="%"
                                />
                        </div>

                        <ChartCard
                                title="ساعات الذروة والإقبال"
                                description="منحنى الطلبات حسب الساعة خلال الفترة المحددة"
                                icon={Clock}
                                loading={loading}
                                error={error}
                                onRetry={() => load(range)}
                                empty={!hourlyHasData}
                                emptyTitle="لا توجد زيارات مسجلة بعد"
                                emptyDescription="سيظهر توزيع ساعات الذروة هنا مع أول الطلبات."
                                summary={
                                        peak
                                                ? `ساعة الذروة ${hourLabel(peak.hour)} بعدد ${peakOrdersPhrase(peak.count)}`
                                                : undefined
                                }
                        >
                                {peak ? (
                                        <p className="mb-3 text-xs text-muted-foreground">
                                                الذروة:{' '}
                                                <span className="font-semibold text-foreground">
                                                        {hourLabel(peak.hour)}
                                                </span>{' '}
                                                — {peakOrdersPhrase(peak.count)}
                                        </p>
                                ) : null}
                                <SplineAreaChart
                                        labels={hourly.map((h) => hourLabel(h.hour))}
                                        series={[
                                                {
                                                        id: 'traffic',
                                                        label: 'الطلبات',
                                                        values: hourly.map((h) => h.count),
                                                },
                                        ]}
                                        ariaLabel="ساعات الذروة والإقبال"
                                        height={220}
                                />
                        </ChartCard>

                        <div className="grid gap-6 lg:grid-cols-2">
                                <ChartCard
                                        title="الأصناف الأكثر طلباً ومعاينة"
                                        description="أعلى 10 أصناف حسب كمية الطلب"
                                        icon={Activity}
                                        loading={loading}
                                        error={error}
                                        onRetry={() => load(range)}
                                        empty={topBar.length === 0}
                                        emptyTitle="لا توجد أصناف مطلوبة بعد"
                                        emptyDescription="سيظهر ترتيب الأصناف الأكثر طلباً هنا مع نموّها."
                                >
                                        <HorizontalBar data={topBar} maxItems={10} />
                                        {stats?.topItems && stats.topItems.length > 0 ? (
                                                <ul className="mt-3 space-y-1">
                                                        {stats.topItems.slice(0, 10).map((item, idx) =>
                                                                item.growth !== 0 ? (
                                                                        <li
                                                                                key={item.itemId}
                                                                                className="flex items-center justify-between text-[11px] text-muted-foreground"
                                                                        >
                                                                                <span>
                                                                                        {toArabicNumber(idx + 1)}. {item.name}
                                                                                </span>
                                                                                <span
                                                                                        className={cn(
                                                                                                'font-medium',
                                                                                                item.growth > 0 ? 'text-success' : 'text-destructive'
                                                                                        )}
                                                                                >
                                                                                        {item.growth > 0 ? '↑' : '↓'}
                                                                                        {toArabicNumber(Math.abs(item.growth))}%
                                                                                </span>
                                                                        </li>
                                                                ) : null
                                                        )}
                                                </ul>
                                        ) : null}
                                </ChartCard>

                                <ChartCard
                                        title="توزيع المبيعات حسب التصنيفات"
                                        description="نسبة الطلبات عبر تصنيفات المنيو"
                                        icon={PieChart}
                                        loading={loading}
                                        error={error}
                                        onRetry={() => load(range)}
                                        empty={categories.length === 0 || !seriesHasData(categories.map((c) => c.count))}
                                        emptyTitle="لا يوجد توزيع تصنيفات بعد"
                                        emptyDescription="ستظهر نسب التصنيفات هنا بعد تسجيل الطلبات."
                                >
                                        <DoughnutChart
                                                data={categories.map((c) => ({
                                                        id: c.categoryId,
                                                        label: c.name,
                                                        value: c.count,
                                                }))}
                                                ariaLabel="توزيع المبيعات حسب التصنيفات"
                                                centerLabel="صنف مباع"
                                        />
                                </ChartCard>
                        </div>

                        <ChartCard
                                title="مؤشر التفاعل اليومي"
                                description="عدد الطلبات اليومية للشهر الحالي مقارنة بالشهر السابق"
                                icon={Activity}
                                loading={loading}
                                error={error}
                                onRetry={() => load(range)}
                                empty={!dailyHasData}
                                emptyTitle="لا يوجد نشاط يومي بعد"
                                emptyDescription="ستظهر مقارنة الشهر الحالي بالسابق هنا مع أول الطلبات."
                        >
                                <ColumnChart
                                        labels={dailyLabels}
                                        series={[
                                                {
                                                        id: 'current',
                                                        label: 'الشهر الحالي',
                                                        values: (daily?.current ?? []).map((d) => d.count),
                                                },
                                                {
                                                        id: 'previous',
                                                        label: 'الشهر السابق',
                                                        values: (daily?.previous ?? []).map((d) => d.count),
                                                },
                                        ]}
                                        ariaLabel="مؤشر التفاعل اليومي مقارنة بالشهر السابق"
                                        height={240}
                                />
                        </ChartCard>

                        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-semibold">اتجاه الإيرادات (7 أيام)</h2>
                                {chartData.length > 0 && seriesHasData(chartData.map((d) => d.value)) ? (
                                        <AreaChart data={chartData} height={200} />
                                ) : (
                                        <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
                                                <AnimatedDollarSign className="size-8 text-muted-foreground/50" aria-hidden="true" />
                                                <p className="text-sm">لا توجد بيانات إيرادات بعد</p>
                                                <p className="text-xs text-muted-foreground/60">ستظهر الإيرادات هنا مع أول الطلبات</p>
                                        </div>
                                )}
                        </div>
                </div>
        );
}
