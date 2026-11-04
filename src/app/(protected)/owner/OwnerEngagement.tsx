'use client';

/*
 * owner/OwnerEngagement.tsx — P43 SM-2/SM-3: قسم «التفاعل» في تبويب
 * تحليلات لوحة المالك.
 *
 * مصدر البيانات: GET /api/stats/engagement (تحليلات الطرف الأول — أحداث
 * MenuEvent المجهولة: view/item_open/search/qr_scan، احتفاظ 90 يومًا).
 * طبقتان بلا بوابات جديدة:
 *   * الملخص (كل الخطط): مشاهدات 7/28 يومًا + السلسلة اليومية + أعلى
 *     الأصناف مشاهدة + مسحات QR.
 *   * التفصيلي (tier === 'detailed' — بوابة advancedStats القائمة على
 *     الخادم): أعلى مصطلحات البحث مع عدّاد «نتائج صفر» الموسوم «تقريبي»
 *     + بطاقة القمع «مشاهدة ← طلب فعلي» بأعداد فقط — لا نسب تحويل
 *     (المشاهدة والطلب حدثان مستقلان بلا ربط جلسة، والنسبة توهم دقة).
 *
 * الفراغ الصادق: لا أحداث إطلاقًا → EmptyState «لا توجد بيانات بعد — شارك
 * رمز QR» مع CTA إلى /owner/qr (نفس عائلة ر121-P-4: الفراغ يوجّه للخطوة
 * التالية ولا يتظاهر بالتحميل).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, QrCode, Search, ArrowDown, ArrowLeft, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import AnimatedQrCode from '@/components/ui/qrcode-icon';
import { KpiCard } from '@/components/shared/KpiCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { ColumnChart } from '@/components/shared/ColumnChart';
import { HorizontalBar } from '@/components/shared/HorizontalBar';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { dayLabel, seriesHasData } from '@/lib/chart-stats';

/** حمولة GET /api/stats/engagement (نفس عقد المسار حرفيًا). */
export interface EngagementData {
        tier: 'summary' | 'detailed';
        views7d: number;
        views28d: number;
        qrScans7d: number;
        itemOpens7d: number;
        viewsSeries7d: { day: string; count: number }[];
        topViewedItems: { key: string; count: number }[];
        /* الطبقة التفصيلية فقط (بوابة advancedStats على الخادم). */
        topSearchTerms?: { term: string; count: number }[];
        zeroResultSearches?: number;
        zeroResultsApproximate?: boolean;
        funnel?: { views7d: number; orders7d: number };
}

export function OwnerEngagement({ restaurantId }: { restaurantId?: number }) {
        const [data, setData] = useState<EngagementData | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        const load = useCallback(async () => {
                if (!restaurantId) return;
                setLoading(true);
                setError(null);
                try {
                        const res = await fetch(`/api/stats/engagement?restaurantId=${restaurantId}`);
                        if (!res.ok) {
                                setError('تعذّر تحميل بيانات التفاعل');
                                return;
                        }
                        const json = await res.json();
                        if (json.success && json.data) setData(json.data);
                        else setError('تعذّر تحميل بيانات التفاعل');
                } catch {
                        setError('تعذّر تحميل بيانات التفاعل');
                } finally {
                        setLoading(false);
                }
        }, [restaurantId]);

        useEffect(() => {
                if (restaurantId) void load();
        }, [restaurantId, load]);

        if (!restaurantId) return null;

        /* الفراغ الصادق: صفر أحداث في كل النوافذ → القياس لم يبدأ بعد (المنيو
         * الجديد الطبيعي) — الصفحة تقول ماذا يفعل المالك الآن، لا «لا نتائج». */
        const empty =
                data != null &&
                data.views28d === 0 &&
                data.views7d === 0 &&
                data.qrScans7d === 0 &&
                data.itemOpens7d === 0 &&
                data.topViewedItems.length === 0;

        const seriesHasAny = seriesHasData(data?.viewsSeries7d?.map((d) => d.count) ?? []);

        return (
                <section aria-label="التفاعل" className="space-y-6 animate-fade-in">
                        {/* ترويسة القسم — صدق القياس موثّق في الواجهة */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                        <h2 className="font-heading text-base font-bold">التفاعل</h2>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                                كيف يتصفح الزوار قائمة مطعمك — مشاهدات وفتح أصناف وبحث ومسحات QR. قياس مجهول
                                                بلا بيانات شخصية، ويُحتفظ به 90 يومًا.
                                        </p>
                                </div>
                        </div>

                        {loading ? (
                                /* عائلة ChartCard للتحميل — نفس لغة الهيكل (r131-F5) */
                                <ChartCard title="مشاهدات القائمة" icon={Eye} loading>
                                        <span className="sr-only">جارٍ التحميل</span>
                                </ChartCard>
                        ) : error ? (
                                <ChartCard title="مشاهدات القائمة" icon={Eye} error={error} onRetry={load}>
                                        <span className="sr-only">خطأ</span>
                                </ChartCard>
                        ) : empty ? (
                                <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                                        <EmptyState
                                                icon={AnimatedQrCode}
                                                title="لا توجد بيانات بعد"
                                                description="شارك رمز QR أو رابط المنيو مع زبائنك — أول زيارة ستظهر هنا خلال دقائق."
                                                action={
                                                        <Link href="/owner/qr">
                                                                <Button variant="orange" size="sm" className="gap-1.5">
                                                                        <QrCode className="size-3.5" aria-hidden="true" /> شارك رمز QR
                                                                </Button>
                                                        </Link>
                                                }
                                        />
                                </div>
                        ) : data ? (
                                <>
                                        {/* عدّادات النوافذ — الملخص المجاني */}
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                <KpiCard
                                                        index={0}
                                                        label="مشاهدات القائمة (7 أيام)"
                                                        value={data.views7d}
                                                        icon={Eye}
                                                        subtitle="زيارات المنيو العامة"
                                                        iconColor="text-[var(--accent-ink)]"
                                                        iconBg="bg-[var(--accent-soft)]"
                                                        animated
                                                />
                                                <KpiCard
                                                        index={1}
                                                        label="مشاهدات 28 يومًا"
                                                        value={data.views28d}
                                                        icon={CalendarDays}
                                                        subtitle="آخر 4 أسابيع"
                                                        iconColor="text-[var(--info-ink)]"
                                                        iconBg="bg-[var(--info-soft)]"
                                                />
                                                <KpiCard
                                                        index={2}
                                                        label="مسحات QR (7 أيام)"
                                                        value={data.qrScans7d}
                                                        icon={QrCode}
                                                        subtitle="زيارات من رموز الطاولات"
                                                        iconColor="text-[var(--success-ink)]"
                                                        iconBg="bg-[var(--success-soft)]"
                                                />
                                                <KpiCard
                                                        index={3}
                                                        label="فتح الأصناف (7 أيام)"
                                                        value={data.itemOpens7d}
                                                        icon={Search}
                                                        subtitle="مرات فتح تفاصيل صنف"
                                                        iconColor="text-[var(--warning-ink)]"
                                                        iconBg="bg-[var(--warning-soft)]"
                                                />
                                        </div>

                                        {/* سلسلة المشاهدات اليومية (7 أيام) */}
                                        <ChartCard
                                                title="مشاهدات القائمة اليومية"
                                                description="زيارات المنيو في آخر 7 أيام (توقيت طرابلس)"
                                                icon={Eye}
                                                empty={!seriesHasAny}
                                                emptyTitle="لا توجد مشاهدات في آخر 7 أيام"
                                                emptyDescription="ستظهر المشاهدات هنا مع أول زيارة — شارك رابط المنيو."
                                        >
                                                <ColumnChart
                                                        labels={data.viewsSeries7d.map((d) => dayLabel(d.day))}
                                                        series={[
                                                                {
                                                                        id: 'views',
                                                                        label: 'المشاهدات',
                                                                        values: data.viewsSeries7d.map((d) => d.count),
                                                                },
                                                        ]}
                                                        ariaLabel="مشاهدات القائمة اليومية آخر 7 أيام"
                                                        height={220}
                                                />
                                        </ChartCard>

                                        <div className="grid gap-6 lg:grid-cols-2">
                                                {/* أعلى الأصناف مشاهدة — الملخص المجاني */}
                                                <ChartCard
                                                        title="الأصناف الأكثر مشاهدة"
                                                        description="أعلى 10 أصناف حسب فتح الزوار لتفاصيلها (7 أيام)"
                                                        icon={Search}
                                                        empty={data.topViewedItems.length === 0}
                                                        emptyTitle="لم يفتح الزوار أي صنف بعد"
                                                        emptyDescription="ستظهر الأصناف الأكثر جذبًا هنا مع أول تفاعل."
                                                >
                                                        <HorizontalBar
                                                                data={data.topViewedItems.map((i) => ({
                                                                        label: i.key,
                                                                        value: i.count,
                                                                }))}
                                                                maxItems={10}
                                                        />
                                                </ChartCard>

                                                {/* مصطلحات البحث — الطبقة التفصيلية (advancedStats) */}
                                                {data.tier === 'detailed' && data.topSearchTerms ? (
                                                        <ChartCard
                                                                title="أكثر ما يبحث عنه الزوار"
                                                                description="مصطلحات البحث في المنيو (7 أيام)"
                                                                icon={Search}
                                                                empty={data.topSearchTerms.length === 0}
                                                                emptyTitle="لا عمليات بحث بعد"
                                                                emptyDescription="ستظهر مصطلحات بحث زوارك هنا مع أول عملية بحث."
                                                                summary={
                                                                        data.topSearchTerms.length > 0
                                                                                ? `${toArabicNumber(data.zeroResultSearches ?? 0)} من ${toArabicNumber(data.topSearchTerms.length)} مصطلحًا بلا نتائج مطابقة (تقريبي)`
                                                                                : undefined
                                                                }
                                                        >
                                                                <HorizontalBar
                                                                        data={data.topSearchTerms.map((t) => ({
                                                                                label: t.term,
                                                                                value: t.count,
                                                                        }))}
                                                                        maxItems={10}
                                                                />
                                                                {/* الصدق التقريبي: مطابقة لحظة العرض لا لحظة البحث */}
                                                                {data.topSearchTerms.length > 0 && (
                                                                        <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
                                                                                {toArabicNumber(data.zeroResultSearches ?? 0)} من هذه المصطلحات لا
                                                                                تطابق أي صنف في قائمتك الحالية —{' '}
                                                                                <span className="font-semibold">تقريبي</span> (تُطابق
                                                                                لحظة العرض، والأصناف قد تتغير لاحقًا).
                                                                        </p>
                                                                )}
                                                        </ChartCard>
                                                ) : (
                                                        data.tier === 'summary' && (
                                                                /* الملخص: بطاقة توضح ما يفتحه البريميوم — لا بوابات جديدة */
                                                                <ChartCard
                                                                        title="أكثر ما يبحث عنه الزوار"
                                                                        description="مصطلحات البحث في المنيو (7 أيام)"
                                                                        icon={Search}
                                                                >
                                                                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                                                                                <span className="flex size-10 items-center justify-center rounded-lg bg-(--c-copper-bg) text-(--c-copper-ink)" aria-hidden="true">
                                                                                        <Search className="size-4" />
                                                                                </span>
                                                                                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                                                                                        مصطلحات البحث وقمع «مشاهدة ← طلب» متاحان في
                                                                                        الخطة المتقدمة —{' '}
                                                                                        <Link
                                                                                                href="/subscribe"
                                                                                                className="font-semibold text-accent-foreground underline underline-offset-4 hover:decoration-2"
                                                                                        >
                                                                                                طور خطتك
                                                                                        </Link>
                                                                                </p>
                                                                        </div>
                                                                </ChartCard>
                                                        )
                                                )}
                                        </div>

                                        {/* قمع «مشاهدة ← طلب» — أعداد فقط (الطبقة التفصيلية) */}
                                        {data.tier === 'detailed' && data.funnel && (
                                                <ChartCard
                                                        title="من المشاهدة إلى الطلب"
                                                        description="أعداد آخر 7 أيام — مشاهدات القائمة مقابل الطلبات الفعلية"
                                                        icon={Search}
                                                >
                                                        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                                <div className="rounded-md border border-border/50 bg-muted/20 p-4 text-center">
                                                                        <p className="text-2xs font-medium text-muted-foreground">
                                                                                مشاهدات القائمة (7 أيام)
                                                                        </p>
                                                                        <p className="mt-1 text-3xl font-bold tabular-nums">
                                                                                {toArabicNumber(data.funnel.views7d)}
                                                                        </p>
                                                                        <p className="mt-0.5 text-2xs text-muted-foreground">
                                                                                زيارة للمنيو
                                                                        </p>
                                                                </div>
                                                                {/* اتجاه التدفق: نزولًا على الجوال، ومع اتجاه القراءة (يسارًا) على المكتب */}
                                                                <ArrowDown
                                                                        className="mx-auto size-5 text-muted-foreground sm:hidden"
                                                                        aria-hidden="true"
                                                                />
                                                                <ArrowLeft
                                                                        className="mx-auto hidden size-5 text-muted-foreground sm:block"
                                                                        aria-hidden="true"
                                                                />
                                                                <div className="rounded-md border border-orange/25 bg-orange-muted/40 p-4 text-center">
                                                                        <p className="text-2xs font-medium text-muted-foreground">
                                                                                طلبات فعلية (7 أيام)
                                                                        </p>
                                                                        <p className="mt-1 text-3xl font-bold tabular-nums">
                                                                                {toArabicNumber(data.funnel.orders7d)}
                                                                        </p>
                                                                        <p className="mt-0.5 text-2xs text-muted-foreground">
                                                                                {getArabicPlural(data.funnel.orders7d, 'طلب', 'طلبان', 'طلبات')}
                                                                        </p>
                                                                </div>
                                                        </div>
                                                        {/* الصدق: لا نسب مئوية — المشاهدة والطلب حدثان مستقلان بلا ربط جلسة */}
                                                        <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
                                                                أعداد فعلية فقط — لا نعرض نسبة تحويل لأن المشاهدة والطلب
                                                                حدثان مستقلان لا يربطهما معرّف جلسة.
                                                        </p>
                                                </ChartCard>
                                        )}
                                </>
                        ) : null}
                </section>
        );
}
