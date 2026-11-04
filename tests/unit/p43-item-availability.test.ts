/**
 * P43 SM-1 — مسامير التوافر المجدول للأصناف (lib/item-availability.ts).
 *
 * isItemWithinSchedule هو الحكم النقي المشترك: يفرضه POST /api/orders
 * خادميًا (رفض 422 «غير متاح حالياً») ويحسبه MenuPageClient عميليًا
 * (ISR-safe — نفس حُكم OpenStatusBadge r137). هذه الحالات تثبّت العقد:
 *   - الحالة الفارغة (كل الأعمدة null = متاح دائمًا — السلوك القديم حرفيًا)
 *   - النافذة العادية (من شامل / إلى حصري)
 *   - النافذة العابرة لمنتصف الليل (from > to)
 *   - الدوام المتواصل 24 ساعة (from === to)
 *   - الأيام باتفاقية getDay (0=الأحد..6=السبت) — كل الأيام = null
 *   - الصفوف التالفة تُسكَت (سياسة «الغياب الصادق» من opening-hours)
 *   - طرف النافذة اليتيم / قاعدة الزوجين / Zod أيام الكتابة
 *   - ملخص الشريحة العربية للمالك (formatScheduleSummaryAr)
 */
import { describe, it, expect } from 'vitest';
import {
        parseAvailableDays,
        hasSchedule,
        isItemWithinSchedule,
        scheduleVerdict,
        formatScheduleSummaryAr,
        availableDaysSchema,
        normalizeAvailableDays,
        schedulePairError,
        type ItemSchedule,
} from '@/lib/item-availability';
import { tripoliWallClock } from '@/lib/opening-hours';

/* بناء لحظة طرابلس صراحةً — الحكم يقرأ الساعة الحية فنمرر Date مكافئة
   لدقائق/يوم معروفين بدل تجميد الزمن (نفس نهج اختبارات r137). */
function at(dayOfWeek: number, minutes: number): Date {
        // طرابلس = UTC+2 ثابتة (بلا توقيت صيفي) — نحسب UTC من الدقائق المحلية.
        const localMinutes = dayOfWeek * 24 * 60 + minutes;
        const utcMinutes = localMinutes - 2 * 60;
        // خميس 2026-09-03 22:00 UTC → الجمعة 2026-09-04 00:00 طرابلس (getDay=5... لا):
        // نستخدم نقطة أساس 1970-01-01 (خميس getDay=4) ونزيحها.
        const base = Date.UTC(1970, 0, 1); // الخميس
        return new Date(base + (utcMinutes - 4 * 24 * 60) * 60 * 1000);
}

describe('parseAvailableDays — تفكيك JSON الأيام', () => {
        it('null/فارغ/[] → null (كل الأيام — القيمة الفارغة «غير مقيَّد» لا «مغلق دائمًا»)', () => {
                expect(parseAvailableDays(null)).toBeNull();
                expect(parseAvailableDays(undefined)).toBeNull();
                expect(parseAvailableDays('')).toBeNull();
                expect(parseAvailableDays('   ')).toBeNull();
                expect(parseAvailableDays('[]')).toBeNull();
        });

        it('مصفوفة صالحة → فريدة مرتبة 0..6', () => {
                expect(parseAvailableDays('[4,0,4,1]')).toEqual([0, 1, 4]);
                expect(parseAvailableDays('[6]')).toEqual([6]);
        });

        it('تالف/غير مصفوفة/خارج المدى → null (السكوت أصدق من تعطيل صنف)', () => {
                expect(parseAvailableDays('not json')).toBeNull();
                expect(parseAvailableDays('{"a":1}')).toBeNull();
                expect(parseAvailableDays('[7]')).toBeNull();
                expect(parseAvailableDays('[-1]')).toBeNull();
                expect(parseAvailableDays('[1.5]')).toBeNull();
                expect(parseAvailableDays('["1"]')).toBeNull();
        });
});

describe('isItemWithinSchedule — الحالة الفارغة (متاح دائمًا)', () => {
        it('كل الأعمدة null → true مهما كان الوقت (السلوك القديم حرفيًا)', () => {
                const item: ItemSchedule = { availableFrom: null, availableTo: null, availableDays: null };
                expect(isItemWithinSchedule(item, at(6, 600))).toBe(true);
                expect(isItemWithinSchedule(item, at(0, 1439))).toBe(true);
        });

        it('hasSchedule يميّز المجدول عن الدائم', () => {
                expect(hasSchedule({ availableFrom: null, availableTo: null, availableDays: null })).toBe(false);
                expect(hasSchedule({ availableFrom: '10:00', availableTo: '17:00', availableDays: null })).toBe(true);
                expect(hasSchedule({ availableFrom: null, availableTo: null, availableDays: '[1]' })).toBe(true);
                // طرف يتيم صالح يقيم hasSchedule (القيد فُعّل) لكن validWindow يتجاهله
                expect(hasSchedule({ availableFrom: '10:00', availableTo: null, availableDays: null })).toBe(true);
        });
});

describe('isItemWithinSchedule — النافذة العادية 10:00–17:00', () => {
        const item: ItemSchedule = { availableFrom: '10:00', availableTo: '17:00', availableDays: null };

        it('داخل النافذة → متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 12 * 60))).toBe(true);
        });

        it('حد البداية شامل: 10:00 بالضبط → متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 10 * 60))).toBe(true);
        });

        it('حد النهاية حصري: 17:00 بالضبط → غير متاح (نفس حُكم computeOpenStatus)', () => {
                expect(isItemWithinSchedule(item, at(3, 17 * 60))).toBe(false);
        });

        it('قبل النافذة وبعدها → غير متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 9 * 60 + 59))).toBe(false);
                expect(isItemWithinSchedule(item, at(3, 23 * 60))).toBe(false);
        });

        it('scheduleVerdict يعيد السبب «خارج النافذة»', () => {
                expect(scheduleVerdict(item, at(3, 8 * 60))).toEqual({ within: false, reason: 'outside-window' });
        });
});

describe('isItemWithinSchedule — العبور الليلي 22:00–02:00', () => {
        const item: ItemSchedule = { availableFrom: '22:00', availableTo: '02:00', availableDays: null };

        it('بعد منتصف الليل حتى «إلى» (01:30) → متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 1 * 60 + 30))).toBe(true);
        });

        it('من «من» حتى منتصف الليل (23:59) → متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 23 * 60 + 59))).toBe(true);
        });

        it('حد «إلى» حصري: 02:00 بالضبط → غير متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 2 * 60))).toBe(false);
        });

        it('منتصف النهار (12:00) → غير متاح', () => {
                expect(isItemWithinSchedule(item, at(3, 12 * 60))).toBe(false);
        });
});

describe('isItemWithinSchedule — الدوام المتواصل والأيام', () => {
        it('from === to (00:00→00:00) → 24 ساعة متاح', () => {
                const item: ItemSchedule = { availableFrom: '00:00', availableTo: '00:00', availableDays: null };
                expect(isItemWithinSchedule(item, at(1, 0))).toBe(true);
                expect(isItemWithinSchedule(item, at(5, 13 * 60))).toBe(true);
        });

        it('أيام مقيَّدة واليوم (طرابلس) خارجها → غير متاح (سبب «مغلق اليوم»)', () => {
                const item: ItemSchedule = { availableFrom: null, availableTo: null, availableDays: '[0,6]' };
                // الأربعاء (3) خارج [الأحد، السبت]
                expect(scheduleVerdict(item, at(3, 12 * 60))).toEqual({ within: false, reason: 'closed-day' });
                expect(isItemWithinSchedule(item, at(3, 12 * 60))).toBe(false);
                // السبت (6) داخل الأيام → متاح
                expect(isItemWithinSchedule(item, at(6, 12 * 60))).toBe(true);
        });

        it('اليوم المحلي يُحسب بتوقيت طرابلس لا بتوقيت الجهاز — at() يبني لحظة معروفة', () => {
                const d = at(0, 30); // الأحد 00:30 طرابلس
                const clock = tripoliWallClock(d);
                expect(clock.dayOfWeek).toBe(0);
                expect(clock.minutes).toBe(30);
        });

        it('قيد الأيام + النافذة معًا: خارج الأيام يغلب (أرخص مسار رفض)', () => {
                const item: ItemSchedule = { availableFrom: '10:00', availableTo: '22:00', availableDays: '[2]' };
                // الخميس (4) خارج الأيام — حتى لو الوقت داخل النافذة
                expect(isItemWithinSchedule(item, at(4, 12 * 60))).toBe(false);
                // الثلاثاء (2) داخل النافذة
                expect(isItemWithinSchedule(item, at(2, 12 * 60))).toBe(true);
        });
});

describe('isItemWithinSchedule — الصفوف التالفة (سياسة الغياب الصادق)', () => {
        it('صيغة تالفة في النافذة → القيد يُتجاهل (متاح)', () => {
                const item: ItemSchedule = { availableFrom: '9am', availableTo: '5pm', availableDays: null };
                expect(isItemWithinSchedule(item, at(3, 3 * 60))).toBe(true);
        });

        it('طرف نافذة يتيم → يُتجاهل وحده؛ الأيام تُفرض', () => {
                const item: ItemSchedule = { availableFrom: '10:00', availableTo: null, availableDays: '[5]' };
                // الجمعة (5) → متاح رغم النافذة اليتيمة
                expect(isItemWithinSchedule(item, at(5, 3 * 60))).toBe(true);
                expect(isItemWithinSchedule(item, at(1, 3 * 60))).toBe(false);
        });

        it('أيام تالفة → null = كل الأيام', () => {
                const item: ItemSchedule = { availableFrom: null, availableTo: null, availableDays: '{bad}' };
                expect(isItemWithinSchedule(item, at(3, 12 * 60))).toBe(true);
        });
});

describe('formatScheduleSummaryAr — شريحة المالك', () => {
        it('بلا جدولة → null (الحالة الفارغة غير مرئية)', () => {
                expect(formatScheduleSummaryAr({ availableFrom: null, availableTo: null, availableDays: null })).toBeNull();
        });

        it('كل الأيام + نافذة → «يومياً 10:00–17:00»', () => {
                expect(
                        formatScheduleSummaryAr({ availableFrom: '10:00', availableTo: '17:00', availableDays: null })
                ).toBe('يومياً 10:00–17:00');
        });

        it('أيام محددة بلا نافذة → أسماء بترتيب الأسبوع الليبي (السبت أولًا والجمعة أخيرًا)', () => {
                // [5,6,0] → السبت (6) ثم الأحد (0) ثم الجمعة (5) بترتيب LIBYAN_WEEK_ORDER
                expect(formatScheduleSummaryAr({ availableFrom: null, availableTo: null, availableDays: '[5,6,0]' })).toBe(
                        'السبت، الأحد، الجمعة',
                );
        });

        it('أيام محددة + نافذة → «السبت 22:00–02:00»', () => {
                expect(
                        formatScheduleSummaryAr({ availableFrom: '22:00', availableTo: '02:00', availableDays: '[6]' })
                ).toBe('السبت 22:00–02:00');
        });

        it('كل السبعة = «يومياً»', () => {
                expect(
                        formatScheduleSummaryAr({ availableFrom: null, availableTo: null, availableDays: '[0,1,2,3,4,5,6]' })
                ).toBe('يومياً');
        });
});

describe('Zod + التطبيع لحقول الكتابة', () => {
        it('availableDaysSchema يقبل JSON صالحًا ويرفض التالف برسالة عربية', () => {
                expect(availableDaysSchema.safeParse('[0,3]').success).toBe(true);
                expect(availableDaysSchema.safeParse(null).success).toBe(true);
                expect(availableDaysSchema.safeParse(undefined).success).toBe(true);
                const bad = availableDaysSchema.safeParse('[9]');
                expect(bad.success).toBe(false);
                if (!bad.success) expect(bad.error.issues[0].message).toContain('قائمة الأيام غير صالحة');
                const notJson = availableDaysSchema.safeParse('oops');
                expect(notJson.success).toBe(false);
                if (!notJson.success) expect(notJson.error.issues[0].message).toContain('JSON');
        });

        it('normalizeAvailableDays: تفريد + فرز + «[]» → null', () => {
                expect(normalizeAvailableDays('[3,0,3]')).toBe('[0,3]');
                expect(normalizeAvailableDays('[]')).toBeNull();
                expect(normalizeAvailableDays(null)).toBeNull();
                expect(normalizeAvailableDays('garbage')).toBeNull();
        });

        it('schedulePairError: طرف يتيم = خطأ إدخال، الزوج كامل/الفراغ الكامل = لا خطأ', () => {
                expect(schedulePairError('10:00', null)).toBe('جدولة التوافر تتطلب وقت البداية والنهاية معًا');
                expect(schedulePairError(null, '17:00')).toBe('جدولة التوافر تتطلب وقت البداية والنهاية معًا');
                expect(schedulePairError('10:00', '17:00')).toBeNull();
                expect(schedulePairError(null, null)).toBeNull();
                expect(schedulePairError('', '')).toBeNull();
        });
});
