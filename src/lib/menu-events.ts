/**
 * P43 SM-2 — أحداث تفاعل القائمة (MenuEvent): المخطط والحقول الخالصة
 * وبُناة التجميعات. نفس عائلة stats-queries.ts: بناء الاستعلامات هنا،
 * الحواجز والتشكيل في المسارات — لا React ولا Prisma استيرادًا (الأنواع
 * فقط) كي تبقى الوحدة قابلة للاختبار بلا قاعدة (نمط modifier-schema).
 *
 * الصدق أولًا: لا PII إطلاقًا (لا IP يُخزَّن، لا هاتف، لا اسم) — الحدث
 * نوع + سياق مجهول (اسم صنف/مصطلح بحث/رقم طاولة) + يوم طرابلس. الاحتفاظ
 * 90 يومًا (cron cleanup — نفس عائلة AuditLog).
 */

import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';

/* ──────────────────────────────────────────────────────────────────────────
 * الأنواع والمخطط
 * ────────────────────────────────────────────────────────────────────────── */

export const MENU_EVENT_TYPES = ['view', 'item_open', 'search', 'qr_scan'] as const;
export type MenuEventType = (typeof MENU_EVENT_TYPES)[number];

/** أقصى طول لمصطلح البحث المخزَّن (حمولة النقطة محدودة أصلًا بالـZod). */
export const MAX_SEARCH_TERM_LENGTH = 80;
/** حد أدنى لطول المصطلح قبل الإرسال (ضوضاء الحرف الواحد). */
export const MIN_SEARCH_TERM_LENGTH = 2;

export const menuEventSchema = z
        .object({
                slug: z.string().regex(/^[a-z0-9-]{1,100}$/, 'رابط غير صالح'),
                eventType: z.enum(MENU_EVENT_TYPES, { message: 'نوع الحدث غير صالح' }),
                /** nameAr الصنف (أو معرّفه نصًا) — بلا FK عمدًا: الصنف قد يُؤرشف/يُحذف. */
                itemKey: z.string().max(120, 'مفتاح الصنف طويل جداً').optional(),
                searchTerm: z.string().max(MAX_SEARCH_TERM_LENGTH, 'مصطلح البحث طويل جداً').optional(),
                tableNumber: z.number().int().min(1, 'رقم الطاولة غير صالح').max(999, 'رقم الطاولة غير صالح').optional(),
        })
        .superRefine((v, ctx) => {
                // search بلا مصطلح = حمولة ناقصة؛ مصطلح مع حدث آخر = حقن حقل ميّت.
                if (v.eventType === 'search' && (v.searchTerm == null || v.searchTerm.trim().length < MIN_SEARCH_TERM_LENGTH)) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['searchTerm'], message: 'مصطلح البحث مطلوب (حرفان على الأقل)' });
                }
                if (v.eventType !== 'search' && v.searchTerm != null) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['searchTerm'], message: 'مصطلح البحث لا يُقبل إلا مع حدث بحث' });
                }
                // itemKey مقبول فقط للأحداث المتعلقة بصنف.
                if (v.itemKey != null && v.eventType !== 'item_open') {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemKey'], message: 'مفتاح الصنف لا يُقبل إلا مع حدث فتح صنف' });
                }
                // رقم الطاولة مقبول فقط مع مسح QR.
                if (v.tableNumber != null && v.eventType !== 'qr_scan') {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tableNumber'], message: 'رقم الطاولة لا يُقبل إلا مع حدث مسح QR' });
                }
        });

export type MenuEventInput = z.infer<typeof menuEventSchema>;

/* ──────────────────────────────────────────────────────────────────────────
 * يوم طرابلس (YYYY-MM-DD) — عمود التجميع
 * ────────────────────────────────────────────────────────────────────────── */

/** تاريخ اليوم بتوقيت طرابلس كنص YYYY-MM-DD (نفس عائلة tripoliWallClock —
 *  Intl بمنطقة صريحة، خادم/عميل معًا). */
export function tripoliDateString(now: Date = new Date()): string {
        const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Tripoli',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
        }).format(now);
        return parts; // en-CA يعيد YYYY-MM-DD مباشرة
}

/** آخر n يومًا بتوقيت طرابلس (اليوم آخر عنصر) — محاور السلاسل الزمنية. */
export function lastTripoliDays(n: number, now: Date = new Date()): string[] {
        const days: string[] = [];
        for (let i = n - 1; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                days.push(tripoliDateString(d));
        }
        return days;
}

/** ملء السلسلة اليومية بالأصفار (نفس عائلة fillDailySeries في chart-stats). */
export function fillDailyEventSeries(
        days: readonly string[],
        rows: readonly { day: string; count: number }[]
): { day: string; count: number }[] {
        const byDay = new Map(rows.map((r) => [r.day, Number(r.count) || 0]));
        return days.map((day) => ({ day, count: byDay.get(day) ?? 0 }));
}

/* ──────────────────────────────────────────────────────────────────────────
 * بُناة التجميعات (نمط stats-queries: بناء نقي، تنفيذ في المسار)
 * ────────────────────────────────────────────────────────────────────────── */

export interface EngagementEventFilter {
        restaurantId: number;
        eventType: MenuEventType;
        /** inclusive lower bound on the Tripoli day (YYYY-MM-DD). */
        sinceDay: string;
}

/** عدّاد حدث في نافذة أيام (‎count‎ بخط متعدد الكتل على الفهرس المركّب). */
export function eventCountQuery(f: EngagementEventFilter): Prisma.MenuEventCountArgs {
        return {
                where: {
                        restaurantId: f.restaurantId,
                        eventType: f.eventType,
                        day: { gte: f.sinceDay },
                },
        };
}

/** سلسلة يومية لنوع حدث (groupBy على day — يملأ الأصفار fillDailyEventSeries).
 * (نمط popularItemsQuery في stats-queries: التقاطع مع orderBy فقط — التقاطع
 * مع by يعقّد حل حملات groupBy العامة في Prisma 7.) */
export type EventSeriesQueryArgs = Prisma.MenuEventGroupByArgs & {
        orderBy: Prisma.MenuEventOrderByWithAggregationInput;
};
export function eventSeriesQuery(f: EngagementEventFilter): EventSeriesQueryArgs {
        return {
                by: ['day'],
                _count: { _all: true },
                where: {
                        restaurantId: f.restaurantId,
                        eventType: f.eventType,
                        day: { gte: f.sinceDay },
                },
                orderBy: { day: 'asc' },
        };
}

/** صف groupBy الخام كما يعيده Prisma (العدّاد شكله مرن حسب الطلب) —
 *  استخراج موحّد عبر groupByAllCount أدناه. */
export type RawGroupByRow<K extends string> = { [k in K]: string | null } & {
        _count?: number | boolean | Record<string, number> | null;
};

/** استخراج ‎_count._all‎ من صف groupBy خام (‎true‎ يعني عدّ الأحداث نفسها). */
export function groupByAllCount(r: { _count?: number | boolean | Record<string, number> | null }): number {
        if (typeof r._count === 'number') return r._count;
        if (r._count && typeof r._count === 'object') return Number(r._count._all ?? 0);
        return 0;
}

export function hydrateEventSeries(rows: readonly RawGroupByRow<'day'>[]): { day: string; count: number }[] {
        return rows
                .filter((r): r is RawGroupByRow<'day'> & { day: string } => typeof r.day === 'string')
                .map((r) => ({ day: r.day, count: groupByAllCount(r) }));
}

/** أعلى الأصناف مشاهدة (item_open مجمّعة على itemKey). */
export type TopItemKeysQueryArgs = Prisma.MenuEventGroupByArgs & {
        orderBy: Prisma.MenuEventOrderByWithAggregationInput;
};
export function topItemKeysQuery(restaurantId: number, sinceDay: string, take = 10): TopItemKeysQueryArgs {
        return {
                by: ['itemKey'],
                _count: { _all: true },
                where: {
                        restaurantId,
                        eventType: 'item_open',
                        itemKey: { not: null },
                        day: { gte: sinceDay },
                },
                orderBy: { _count: { itemKey: 'desc' } },
                take,
        };
}

export function hydrateItemKeyRows(rows: readonly RawGroupByRow<'itemKey'>[]): { key: string; count: number }[] {
        return rows
                .filter((r): r is RawGroupByRow<'itemKey'> & { itemKey: string } => typeof r.itemKey === 'string' && r.itemKey.length > 0)
                .map((r) => ({ key: r.itemKey, count: groupByAllCount(r) }));
}

/** أعلى مصطلحات البحث (search مجمّعة على searchTerm). */
export type TopSearchTermsQueryArgs = Prisma.MenuEventGroupByArgs & {
        orderBy: Prisma.MenuEventOrderByWithAggregationInput;
};
export function topSearchTermsQuery(restaurantId: number, sinceDay: string, take = 10): TopSearchTermsQueryArgs {
        return {
                by: ['searchTerm'],
                _count: { _all: true },
                where: {
                        restaurantId,
                        eventType: 'search',
                        searchTerm: { not: null },
                        day: { gte: sinceDay },
                },
                orderBy: { _count: { searchTerm: 'desc' } },
                take,
        };
}

export function hydrateSearchTermRows(rows: readonly RawGroupByRow<'searchTerm'>[]): { term: string; count: number }[] {
        return rows
                .filter((r): r is RawGroupByRow<'searchTerm'> & { searchTerm: string } => typeof r.searchTerm === 'string' && r.searchTerm.trim().length > 0)
                .map((r) => ({ term: r.searchTerm.trim(), count: groupByAllCount(r) }));
}

/* ──────────────────────────────────────────────────────────────────────────
 * «نتائج صفر» التقريبي — مطابقة مصطلح ضد أصناف المنيو الحية
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * تقريب صادق (موسوم «تقريبي» في الواجهة): مصطلح يطابق صفر أصناف من المنيو
 * الحالي (بعد normalizeArabic على الاسم/الوصف) يُعدّ بحثًا بلا نتائج —
 * مطابقة لحظة العرض لا لحظة البحث (الأصناف قد تغيّرت بعده). العميل يطبع
 * التحفظ دائمًا بجانب العدّاد.
 */
export function countZeroResultTerms(
        terms: readonly { term: string; count: number }[],
        items: readonly { name: string; nameAr: string | null; description: string; descriptionAr: string }[],
        normalize: (s: string) => string
): number {
        const normalizedItems = items.map((i) => ({
                name: normalize(i.nameAr || i.name),
                desc: normalize(i.descriptionAr || i.description),
        }));
        let zero = 0;
        for (const { term } of terms) {
                // قصّ بعد التطبيع: المصطلح المسافي فقط يُتخطى (لا يُحسب صفر نتائج)
                const q = normalize(term).trim();
                if (q.length === 0) continue;
                const matched = normalizedItems.some((i) => i.name.includes(q) || i.desc.includes(q));
                if (!matched) zero++;
        }
        return zero;
}
