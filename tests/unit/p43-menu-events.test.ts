/**
 * P43 SM-2 — مسامير أحداث تفاعل القائمة (lib/menu-events.ts).
 *
 * المخطط (menuEventSchema) هو حارس الكتابة الوحيد للمسار العام
 * /api/public/menu-events: صفر PII، وحقول ميتة تُرفض (searchTerm مع حدث
 * غير البحث = حقن حقل ميّت). وبُناة التجميعات (نمط stats-queries) تُستهلك
 * من /api/stats/engagement — هذه الحالات تثبّت العقد:
 *   - الأنواع الأربعة view/item_open/search/qr_scan
 *   - قواعد الترابط بين النوع والحقول (search بلا مصطلح، itemKey مع
 *     غير item_open، tableNumber مع غير qr_scan)
 *   - يوم طرابلس (tripoliDateString — YYYY-MM-DD) وسلسلة آخر n يومًا
 *   - ملء السلسلة اليومية بالأصفار (fillDailyEventSeries)
 *   - استخراج _count من صفوف groupBy الخام (groupByAllCount/hydrate*)
 *   - عدّاد «نتائج صفر» التقريبي (countZeroResultTerms)
 */
import { describe, it, expect } from 'vitest';
import {
        menuEventSchema,
        MENU_EVENT_TYPES,
        MIN_SEARCH_TERM_LENGTH,
        tripoliDateString,
        lastTripoliDays,
        fillDailyEventSeries,
        groupByAllCount,
        hydrateEventSeries,
        hydrateItemKeyRows,
        hydrateSearchTermRows,
        eventCountQuery,
        eventSeriesQuery,
        topItemKeysQuery,
        topSearchTermsQuery,
        countZeroResultTerms,
} from '@/lib/menu-events';
import { normalizeArabic } from '@/lib/format';

const valid = {
        slug: 'al-waha-cafe',
        eventType: 'view',
} as const;

describe('menuEventSchema — الأنواع الأربعة', () => {
        it('MENU_EVENT_TYPES = view/item_open/search/qr_scan (لا نوع خام خلف الحارس)', () => {
                expect([...MENU_EVENT_TYPES]).toEqual(['view', 'item_open', 'search', 'qr_scan']);
        });

        it('view بلا أي سياق → صالح (أخف حدث)', () => {
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'view' }).success).toBe(true);
        });

        it('item_open مع itemKey → صالح (اسم الصنف — لا FK)', () => {
                expect(
                        menuEventSchema.safeParse({ ...valid, eventType: 'item_open', itemKey: 'كابتشينو' }).success
                ).toBe(true);
        });

        it('search مع مصطلح ≥ حرفين → صالح؛ الحرف الواحد ضوضاء → رفض', () => {
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'search', searchTerm: 'قهوة' }).success).toBe(true);
                expect(MIN_SEARCH_TERM_LENGTH).toBe(2);
                const one = menuEventSchema.safeParse({ ...valid, eventType: 'search', searchTerm: 'ق' });
                expect(one.success).toBe(false);
                if (!one.success) expect(one.error.issues[0].message).toContain('حرفان على الأقل');
        });

        it('qr_scan مع رقم طاولة → صالح', () => {
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'qr_scan', tableNumber: 12 }).success).toBe(true);
        });

        it('slug تالف → رفض (الحدث لمنيو غير موجود لا يُكتب أصلًا)', () => {
                expect(menuEventSchema.safeParse({ ...valid, slug: 'Bad Slug!' }).success).toBe(false);
                expect(menuEventSchema.safeParse({ ...valid, slug: '' }).success).toBe(false);
        });

        it('نوع غير معروف → رفض', () => {
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'click' }).success).toBe(false);
        });
});

describe('menuEventSchema — قواعد الترابط (لا حقول ميتة)', () => {
        it('search بلا مصطلح → رفض', () => {
                const out = menuEventSchema.safeParse({ ...valid, eventType: 'search' });
                expect(out.success).toBe(false);
                if (!out.success) expect(out.error.issues[0].path).toContain('searchTerm');
        });

        it('searchTerm مع حدث غير البحث → رفض (حقن حقل ميّت)', () => {
                const out = menuEventSchema.safeParse({ ...valid, eventType: 'view', searchTerm: 'قهوة' });
                expect(out.success).toBe(false);
                if (!out.success) expect(out.error.issues[0].message).toContain('إلا مع حدث بحث');
        });

        it('itemKey مع حدث غير فتح صنف → رفض', () => {
                const out = menuEventSchema.safeParse({ ...valid, eventType: 'view', itemKey: 'كابتشينو' });
                expect(out.success).toBe(false);
                if (!out.success) expect(out.error.issues[0].message).toContain('إلا مع حدث فتح صنف');
        });

        it('tableNumber مع حدث غير مسح QR → رفض', () => {
                const out = menuEventSchema.safeParse({ ...valid, eventType: 'view', tableNumber: 3 });
                expect(out.success).toBe(false);
                if (!out.success) expect(out.error.issues[0].message).toContain('إلا مع حدث مسح QR');
        });

        it('رقم طاولة خارج 1..999 → رفض', () => {
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'qr_scan', tableNumber: 0 }).success).toBe(false);
                expect(menuEventSchema.safeParse({ ...valid, eventType: 'qr_scan', tableNumber: 1000 }).success).toBe(false);
        });
});

describe('يوم طرابلس والسلاسل اليومية', () => {
        it('tripoliDateString: YYYY-MM-DD بتوقيت طرابلس (UTC+2 ثابتة)', () => {
                // 2026-09-06 23:30 UTC → 2026-09-07 في طرابلس
                expect(tripoliDateString(new Date('2026-09-06T23:30:00Z'))).toBe('2026-09-07');
                // 2026-09-06 20:30 UTC → 2026-09-06 22:30 طرابلس
                expect(tripoliDateString(new Date('2026-09-06T20:30:00Z'))).toBe('2026-09-06');
        });

        it('lastTripoliDays(7): سبعة أيام متصاعدة واليوم آخر عنصر', () => {
                const now = new Date('2026-09-06T12:00:00Z');
                const days = lastTripoliDays(7, now);
                expect(days).toHaveLength(7);
                expect(days[6]).toBe(tripoliDateString(now));
                expect(days[0]).toBe('2026-08-31');
        });

        it('fillDailyEventSeries يملأ الأيام الغائبة بالأصفار', () => {
                const days = ['2026-09-04', '2026-09-05', '2026-09-06'];
                const rows = [{ day: '2026-09-05', count: 4 }];
                expect(fillDailyEventSeries(days, rows)).toEqual([
                        { day: '2026-09-04', count: 0 },
                        { day: '2026-09-05', count: 4 },
                        { day: '2026-09-06', count: 0 },
                ]);
        });
});

describe('بُناة التجميعات (نمط stats-queries)', () => {
        it('eventCountQuery: مقيد بالمطعم + النوع + day ≥ الحد', () => {
                const q = eventCountQuery({ restaurantId: 5, eventType: 'view', sinceDay: '2026-09-01' });
                expect(q.where).toEqual({
                        restaurantId: 5,
                        eventType: 'view',
                        day: { gte: '2026-09-01' },
                });
        });

        it('eventSeriesQuery: groupBy على اليوم بترتيب تصاعدي', () => {
                const q = eventSeriesQuery({ restaurantId: 5, eventType: 'view', sinceDay: '2026-09-01' });
                expect(q.by).toEqual(['day']);
                expect(q.orderBy).toEqual({ day: 'asc' });
                expect(q._count).toEqual({ _all: true });
        });

        it('topItemKeysQuery: item_open فقط، بلا مفاتيح فارغة، بسقف take', () => {
                const q = topItemKeysQuery(5, '2026-09-01', 10);
                expect(q.where?.eventType).toBe('item_open');
                expect(q.where?.itemKey).toEqual({ not: null });
                expect(q.take).toBe(10);
                expect(q.orderBy).toEqual({ _count: { itemKey: 'desc' } });
        });

        it('topSearchTermsQuery: search فقط بسقف take', () => {
                const q = topSearchTermsQuery(5, '2026-09-01', 10);
                expect(q.where?.eventType).toBe('search');
                expect(q.where?.searchTerm).toEqual({ not: null });
                expect(q.take).toBe(10);
        });
});

describe('استخراج _count من صفوف groupBy الخام', () => {
        it('groupByAllCount: عدد مباشر / كائن _all / غياب → صفر', () => {
                expect(groupByAllCount({ _count: 7 })).toBe(7);
                expect(groupByAllCount({ _count: { _all: 9 } })).toBe(9);
                expect(groupByAllCount({ _count: true })).toBe(0);
                expect(groupByAllCount({})).toBe(0);
        });

        it('hydrateEventSeries: يسقط صفوف اليوم الفارغة ويحوّل العدّاد', () => {
                const rows = [
                        { day: '2026-09-05', _count: 4 },
                        { day: null, _count: 99 },
                        { day: '2026-09-06', _count: { _all: 2 } },
                ];
                expect(hydrateEventSeries(rows)).toEqual([
                        { day: '2026-09-05', count: 4 },
                        { day: '2026-09-06', count: 2 },
                ]);
        });

        it('hydrateItemKeyRows: يسقط المفاتيح الفارغة/النصية الفارغة', () => {
                const rows = [
                        { itemKey: 'كابتشينو', _count: 12 },
                        { itemKey: null, _count: 50 },
                        { itemKey: '', _count: 30 },
                        { itemKey: 'شاي', _count: { _all: 3 } },
                ];
                expect(hydrateItemKeyRows(rows)).toEqual([
                        { key: 'كابتشينو', count: 12 },
                        { key: 'شاي', count: 3 },
                ]);
        });

        it('hydrateSearchTermRows: يقصّ المصطلحات ويسقط الفارغة', () => {
                const rows = [
                        { searchTerm: ' قهوة ', _count: 8 },
                        { searchTerm: '   ', _count: 5 },
                ];
                expect(hydrateSearchTermRows(rows)).toEqual([{ term: 'قهوة', count: 8 }]);
        });
});

describe('countZeroResultTerms — التقريب الموسوم «تقريبي»', () => {
        const items = [
                {
                        name: 'Cappuccino',
                        nameAr: 'كابتشينو',
                        description: 'coffee',
                        descriptionAr: 'قهوة إيطالية',
                },
                {
                        name: 'Cake',
                        nameAr: 'كيك',
                        description: 'dessert',
                        descriptionAr: 'حلويات',
                },
        ];

        it('مصطلح يطابق الاسم أو الوصف → ليس صفر نتائج', () => {
                const terms = [
                        { term: 'كابتشينو', count: 5 },
                        { term: 'قهوة', count: 2 },
                ];
                expect(countZeroResultTerms(terms, items, normalizeArabic)).toBe(0);
        });

        it('مصطلح بلا أي تطابق → صفر نتائج (تقريبي — مطابقة لحظة العرض)', () => {
                const terms = [
                        { term: 'بيتزا', count: 7 },
                        { term: 'كابتشينو', count: 1 },
                ];
                expect(countZeroResultTerms(terms, items, normalizeArabic)).toBe(1);
        });

        it('التطبيق العربي (normalizeArabic) يجمع «قهوه/قهوة» معًا — ليست صفر نتائج', () => {
                const terms = [{ term: 'قهوه', count: 3 }];
                expect(countZeroResultTerms(terms, items, normalizeArabic)).toBe(0);
        });

        it('مصطلح يتطبع لفراغ → يُتخطى (لا يُحسب صفر نتائج)', () => {
                const terms = [{ term: '  ', count: 3 }];
                expect(countZeroResultTerms(terms, items, normalizeArabic)).toBe(0);
        });
});
