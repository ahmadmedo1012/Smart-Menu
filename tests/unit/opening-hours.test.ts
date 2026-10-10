/**
 * r137 — مسامير ساعات الدوام المهيكلة (الميزة 1).
 *
 * computeOpenStatus هو مصدر شارة «مفتوح الآن» في صفحة المنيو (حساب عميلي
 * فقط — الصفحة ISR). هذه الحالات تثبّت العقد:
 *   - النافذة العادية (حدود الدقيقة: الفتح شامل، الإغلاق حصري)
 *   - النافذة العابرة لمنتصف الليل (closesAt < opensAt)
 *   - الدوام المتواصل 24 ساعة (00:00 → 00:00)
 *   - اليوم «مغلق طوال اليوم» واليوم غير المهيكل (لا يساهم بشيء)
 *   - الفتح القادم: اليوم / يوم لاحق بالاسم العربي / لا شيء في الأسبوع
 *   - الفراغ الكامل → null (الميزة نائمة — لا شارة إطلاقًا)
 *   - الصفوف التالفة تُسكَت (لا شارة على بيانات ناقصة)
 * و tripoliWallClock: إزاحة UTC+2 الثابتة (Africa/Tripoli بلا توقيت
 * صيفي) عبر نمط r133-A12 M2 (Intl بـ timeZone صريح).
 */
import { describe, it, expect } from 'vitest';
import {
        computeOpenStatus,
        tripoliWallClock,
        parseOpeningHoursPayload,
        formatHoursForPrint,
        minutesOfDay,
        DAY_NAMES_AR,
        LIBYAN_WEEK_ORDER,
        HH_MM_RE,
        type OpeningHoursRow,
} from '@/lib/opening-hours';

const row = (dayOfWeek: number, opensAt: string, closesAt: string, closed = false): OpeningHoursRow => ({
        dayOfWeek,
        closed,
        opensAt,
        closesAt,
});

/* dayOfWeek=6 = السبت (اتفاقية JS getDay — r137) */
const SAT = 6;

describe('computeOpenStatus — الحالة الفارغة (الميزة النائمة)', () => {
        it('null/undefined/[] → null: لا شارة إطلاقًا (workingHours النصي يبقى وحده)', () => {
                expect(computeOpenStatus(null, { dayOfWeek: SAT, minutes: 600 })).toBeNull();
                expect(computeOpenStatus(undefined, { dayOfWeek: SAT, minutes: 600 })).toBeNull();
                expect(computeOpenStatus([], { dayOfWeek: SAT, minutes: 600 })).toBeNull();
        });

        it('صفوف بـ dayOfWeek صالح لكن كلها تالفة الأوقات → الميزة نشطة بلا نافذة (مغلق بلا وعد)', () => {
                // بيانات يدوية/قديمة لا تمر عبر parseOpeningHoursPayload — اليوم موجود
                // (المالك هيكل شيئًا) لكن لا نافذة صالحة: «مغلق حاليًا» أصدق من لا شارة.
                const hours = [row(SAT, '', ''), row(0, '25:99', '23:00')];
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 600 })).toEqual({
                        isOpen: false,
                        nextOpenLabel: null,
                });
        });

        it('كل الصفوف بـ dayOfWeek غير صالح → null (الميزة نائمة فعلًا)', () => {
                const hours = [row(9, '16:00', '23:00'), row(-1, '16:00', '23:00')];
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 600 })).toBeNull();
        });
});

describe('computeOpenStatus — النافذة العادية (السبت 16:00–23:00)', () => {
        const hours = [row(SAT, '16:00', '23:00')];

        it('داخل النافذة → مفتوح + تسمية الإغلاق', () => {
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 17 * 60 })).toEqual({
                        isOpen: true,
                        closesAtLabel: '23:00',
                });
        });

        it('حد الفتح شامل: 16:00 بالضبط → مفتوح', () => {
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 16 * 60 })?.isOpen).toBe(true);
        });

        it('حد الإغلاق حصري: 23:00 بالضبط → مغلق (نص «يغلق 23:00» صادق)', () => {
                const status = computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 23 * 60 });
                expect(status?.isOpen).toBe(false);
        });

        it('قبل الفتح في نفس اليوم → «يفتح اليوم 16:00»', () => {
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 10 * 60 })).toEqual({
                        isOpen: false,
                        nextOpenLabel: 'يفتح اليوم 16:00',
                });
        });

        it('بعد الإغلاق → الفتح القادم بعد أسبوع (اليوم نفسه لا يُعاد ضمن القادم)', () => {
                const status = computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 23 * 60 + 30 });
                expect(status).toEqual({ isOpen: false, nextOpenLabel: `يفتح ${DAY_NAMES_AR[SAT]} 16:00` });
        });
});

describe('computeOpenStatus — النافذة العابرة لمنتصف الليل (20:00–02:00)', () => {
        const hours = [row(SAT, '20:00', '02:00')];

        it('قبل منتصف الليل داخل النافذة → مفتوح، يغلق عند closesAt', () => {
                expect(computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 23 * 60 + 30 })).toEqual({
                        isOpen: true,
                        closesAtLabel: '02:00',
                });
        });

        it('بعد منتصف الليل (اليوم التالي) داخل حصة الأمس → مفتوح', () => {
                // الأحد 01:00 — نافذة السبت العابرة ما زالت مفتوحة
                expect(computeOpenStatus(hours, { dayOfWeek: 0, minutes: 60 })?.isOpen).toBe(true);
        });

        it('الساعة 02:00 بالضبط → مغلق (الحد حصري)', () => {
                expect(computeOpenStatus(hours, { dayOfWeek: 0, minutes: 2 * 60 })?.isOpen).toBe(false);
        });

        it('03:00 → مغلق، الفتح القادم السبت (اليوم التالي لا صف له)', () => {
                const status = computeOpenStatus(hours, { dayOfWeek: 0, minutes: 3 * 60 });
                expect(status).toEqual({
                        isOpen: false,
                        nextOpenLabel: `يفتح ${DAY_NAMES_AR[SAT]} 20:00`,
                });
        });

        it('الدوام المتواصل 00:00–00:00 → مفتوح دائماً', () => {
                const always = [row(SAT, '00:00', '00:00')];
                expect(computeOpenStatus(always, { dayOfWeek: SAT, minutes: 0 })?.isOpen).toBe(true);
                expect(computeOpenStatus(always, { dayOfWeek: SAT, minutes: 13 * 60 + 30 })?.isOpen).toBe(true);
        });
});

describe('computeOpenStatus — الأيام المغلقة وغير المهيكلة', () => {
        it('اليوم «مغلق طوال اليوم» لا يساهم — الفتح القادم يتخطاه لليوم التالي', () => {
                // السبت مغلق، الأحد 16:00 مفتوح — الآن السبت ظهراً
                const hours = [row(SAT, '16:00', '23:00', true), row(0, '16:00', '23:00')];
                const status = computeOpenStatus(hours, { dayOfWeek: SAT, minutes: 12 * 60 });
                expect(status).toEqual({
                        isOpen: false,
                        nextOpenLabel: `يفتح ${DAY_NAMES_AR[0]} 16:00`,
                });
        });

        it('أسبوع كله مغلق → مغلق حاليًا بلا وعد (nextOpenLabel: null)', () => {
                const hours = [0, 1, 2, 3, 4, 5, 6].map((d) => row(d, '16:00', '23:00', true));
                const status = computeOpenStatus(hours, { dayOfWeek: 3, minutes: 12 * 60 });
                expect(status).toEqual({ isOpen: false, nextOpenLabel: null });
        });

        it('الصف التالف (صيغة وقت غير HH:MM) يُسكَت لا يُحسب', () => {
                const hours = [row(SAT, '16:00', '23:00'), row(0, '9', 'bad')];
                // الأحد التالف لا يفتح — الفتح القادم يعود للسبت
                const status = computeOpenStatus(hours, { dayOfWeek: 0, minutes: 10 * 60 });
                expect(status).toEqual({
                        isOpen: false,
                        nextOpenLabel: `يفتح ${DAY_NAMES_AR[SAT]} 16:00`,
                });
        });
});

describe('tripoliWallClock — إزاحة Africa/Tripoli الثابتة (UTC+2)', () => {
        it('12:00 UTC السبت → 14:00 طرابلس (dayOfWeek 6)', () => {
                // 2026-10-10 يوم سبت — 12:00Z + 2h = 14:00
                expect(tripoliWallClock(new Date('2026-10-10T12:00:00Z'))).toEqual({
                        dayOfWeek: 6,
                        minutes: 14 * 60,
                });
        });

        it('23:30 UTC السبت → 01:30 الأحد طرابلس (عبور منتصف الليل)', () => {
                expect(tripoliWallClock(new Date('2026-10-10T23:30:00Z'))).toEqual({
                        dayOfWeek: 0,
                        minutes: 90,
                });
        });

        it('المنطقة المحايدة للجهاز: نفس Date يعطي نفس النتيجة مهما كان TZ البيئة', () => {
                // 2026-10-09T18:45:00Z = الجمعة 20:45 طرابلس
                expect(tripoliWallClock(new Date('2026-10-09T18:45:00Z'))).toEqual({
                        dayOfWeek: 5,
                        minutes: 20 * 60 + 45,
                });
        });
});

describe('parseOpeningHoursPayload — تحقق المحرّرات (رسائل 422 العربية)', () => {
        it('حمولة صالحة تمر كما هي', () => {
                const rows = [
                        { dayOfWeek: 6, closed: false, opensAt: '16:00', closesAt: '23:00' },
                        { dayOfWeek: 5, closed: true, opensAt: '', closesAt: '' },
                ];
                const r = parseOpeningHoursPayload(rows);
                expect(r.ok).toBe(true);
                if (r.ok) {
                        expect(r.rows[0]).toEqual(rows[0]);
                        // اليوم المغلق بلا وقتين → 00:00 شكلية (العمودان NOT NULL)
                        expect(r.rows[1]).toEqual({ dayOfWeek: 5, closed: true, opensAt: '00:00', closesAt: '00:00' });
                }
        });

        it('null/undefined → مصفوفة فارغة (إطفاء الميزة)', () => {
                expect(parseOpeningHoursPayload(null)).toEqual({ ok: true, rows: [] });
                expect(parseOpeningHoursPayload(undefined)).toEqual({ ok: true, rows: [] });
        });

        it('وقت غير HH:MM → خطأ يذكر اليوم', () => {
                const r = parseOpeningHoursPayload([{ dayOfWeek: 6, closed: false, opensAt: '9', closesAt: '23:00' }]);
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.error).toContain('السبت');
        });

        it('يوم مفعّل بلا وقتين → خطأ (الزوج مطلوب إن لم يكن مغلقًا)', () => {
                const r = parseOpeningHoursPayload([{ dayOfWeek: 1, closed: false, opensAt: '', closesAt: '' }]);
                expect(r.ok).toBe(false);
                if (!r.ok) expect(r.error).toContain('الإثنين');
        });

        it('يوم مكرر → خطأ', () => {
                const r = parseOpeningHoursPayload([
                        { dayOfWeek: 6, closed: false, opensAt: '16:00', closesAt: '23:00' },
                        { dayOfWeek: 6, closed: false, opensAt: '10:00', closesAt: '14:00' },
                ]);
                expect(r.ok).toBe(false);
        });

        it('dayOfWeek خارج 0-6 → خطأ', () => {
                expect(parseOpeningHoursPayload([{ dayOfWeek: 7, closed: false, opensAt: '16:00', closesAt: '23:00' }]).ok).toBe(false);
        });

        it('أكثر من 7 عناصر → خطأ', () => {
                const rows = Array.from({ length: 8 }, (_, i) => ({
                        dayOfWeek: i % 7,
                        closed: false,
                        opensAt: '16:00',
                        closesAt: '23:00',
                }));
                expect(parseOpeningHoursPayload(rows).ok).toBe(false);
        });

        it('ليست مصفوفة → خطأ', () => {
                expect(parseOpeningHoursPayload({}).ok).toBe(false);
                expect(parseOpeningHoursPayload('nope').ok).toBe(false);
        });
});

describe('الثوابت المساعدة', () => {
        it('DAY_NAMES_AR مفهرسة باتفاقية getDay (0=الأحد..6=السبت)', () => {
                expect(DAY_NAMES_AR[0]).toBe('الأحد');
                expect(DAY_NAMES_AR[5]).toBe('الجمعة');
                expect(DAY_NAMES_AR[6]).toBe('السبت');
        });

        it('LIBYAN_WEEK_ORDER يبدأ بالسبت (الأسبوع الليبي)', () => {
                expect(LIBYAN_WEEK_ORDER[0]).toBe(6);
                expect(LIBYAN_WEEK_ORDER).toHaveLength(7);
        });

        it('HH_MM_RE + minutesOfDay', () => {
                expect(HH_MM_RE.test('16:30')).toBe(true);
                expect(HH_MM_RE.test('23:59')).toBe(true);
                expect(HH_MM_RE.test('00:00')).toBe(true);
                expect(HH_MM_RE.test('24:00')).toBe(false);
                expect(HH_MM_RE.test('7:5')).toBe(false);
                expect(minutesOfDay('23:59')).toBe(23 * 60 + 59);
        });
});

describe('formatHoursForPrint — سطر ورقة الطباعة', () => {
        it('سطر واحد بالترتيب الليبي: السبت أولاً + المغلق بالاسم', () => {
                const line = formatHoursForPrint([row(5, '', '', true), row(6, '16:00', '23:00')]);
                expect(line).toBe('السبت: 16:00–23:00 · الجمعة: مغلق');
        });

        it('الفراغ/الصفوف التالفة → null (لا سطر يُختلق)', () => {
                expect(formatHoursForPrint(null)).toBeNull();
                expect(formatHoursForPrint([])).toBeNull();
                expect(formatHoursForPrint([row(6, 'bad', '23:00')])).toBeNull();
        });
});
