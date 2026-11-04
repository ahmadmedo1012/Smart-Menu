/**
 * P43 SM-1 — التوافر المجدول للأصناف (توافر مجدول): مصدر الحقيقة النقي.
 *
 * نفس عائلة lib/opening-hours.ts (r137): لا React ولا Prisma — يُستهلك من
 * مسارات API الخادمية (فرض POST /api/orders) ومن العميل العام (البطاقات
 * + إعادة الترتيب — ISR-safe: الحالة تُحسب عميليًا لأن صفحة المنيو
 * مخبأة، نفس حُكم OpenStatusBadge r137 «لا تُحسب الحالة على الخادم أبدًا»).
 *
 * اتفاقيات التخزين (schema.prisma · zz_p43_item_schedule):
 *   * availableFrom/availableTo — «HH:MM» بنظام 24 ساعة بأرقام غربية
 *     (سياسة r135). NULL لكليهما = بلا نافذة زمنية.
 *   * availableDays — JSON نصي لمصفوفة أيام باتفاقية getDay
 *     (0=الأحد..6=السبت)، مثل "[0,1,4]". NULL أو [] = كل الأيام.
 *   * كل الأعمدة NULL = متاح دائمًا (السلوك القديم حرفيًا).
 *
 * حدود النافذة (مطابقة لحُكم computeOpenStatus): from شامل (يُتاح عند
 * 16:00 بالضبط) وto حصري (يُعدّ غير متاح عند 17:00 بالضبط لنافذة
 * 10:00–17:00). العبور الليلي from > to (22:00→02:00) يعني «من from حتى
 * منتصف الليل + من منتصف الليل حتى to»، وfrom === to يعني دوامًا متواصلًا
 * 24 ساعة (تمثيل صادق لما يكتبه صاحب مطعم متواصل).
 *
 * سياسة الصف التالف (نفس «الغياب الصادق» في opening-hours): قيمة لا تطابق
 * الصيغة تُتجاهل كأنها غير موجودة — بيانات الكتابة متحققة (Zod في items
 * POST/PUT) فلا يصل التالف إلا بتعديل يدوي بقاعدة قديمة، والسكوت أصدق من
 * تعطيل صنف على بيانات ناقصة.
 */

import { HH_MM_RE, minutesOfDay, tripoliWallClock, DAY_NAMES_AR, LIBYAN_WEEK_ORDER } from './opening-hours';
import { z } from 'zod';

/** الشكل الذي تُقرأ به أعمدة الجدولة من صف MenuItem (أو حمولة العميل). */
export interface ItemSchedule {
        availableFrom?: string | null;
        availableTo?: string | null;
        availableDays?: string | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * availableDays: تحليل JSON النصي → مصفوفة أيام صالحة (أو null = كل الأيام)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * يفكّ availableDays: null/undefined/فارغ/[]/تالف → null (كل الأيام —
 * القيمة الفارغة هي الحقيقة «غير مقيَّد» وليست «مغلق دائمًا»). المصفوفة
 * الصالحة → أرقام فريدة مرتبة 0..6.
 */
export function parseAvailableDays(raw: string | null | undefined): number[] | null {
        if (raw == null || raw.trim() === '' || raw.trim() === '[]') return null;
        let parsed: unknown;
        try {
                parsed = JSON.parse(raw);
        } catch {
                return null; // صف تالف → غير مقيَّد (سياسة الغياب الصادق)
        }
        if (!Array.isArray(parsed)) return null;
        const days: number[] = [];
        for (const v of parsed) {
                if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 6) return null;
                if (!days.includes(v)) days.push(v);
        }
        if (days.length === 0) return null;
        return days.sort((a, b) => a - b);
}

/**
 * هل للصنف أي جدولة فعلية؟ (يستخدمه العرض لتمييز «مجدول» عن «متاح دائماً»
 * وللعميل لتفادي الحسابات عبثًا).
 */
export function hasSchedule(item: ItemSchedule): boolean {
        return (
                (item.availableFrom != null && HH_MM_RE.test(item.availableFrom)) ||
                (item.availableTo != null && HH_MM_RE.test(item.availableTo)) ||
                parseAvailableDays(item.availableDays) != null
        );
}

/** نافذة صالحة = الطرفان حاضران وصالحان معًا (طرف واحد يتيم يُتجاهل). */
function validWindow(item: ItemSchedule): { from: number; to: number } | null {
        if (item.availableFrom == null || item.availableTo == null) return null;
        if (!HH_MM_RE.test(item.availableFrom) || !HH_MM_RE.test(item.availableTo)) return null;
        return { from: minutesOfDay(item.availableFrom), to: minutesOfDay(item.availableTo) };
}

/**
 * الحكم النقي: هل الصنف ضمن جدولته في هذه اللحظة؟
 *
 *   * لا جدولة إطلاقًا → true (متاح دائمًا).
 *   * أيام مقيَّدة واليوم (طرابلس) خارجها → false.
 *   * نافذة زمنية: عادية (from < to) → from ≤ دقائق اليوم < to؛
 *     عابرة لمنتصف الليل (from > to) → دقائق ≥ from أو < to؛
 *     from === to → 24 ساعة (دائمًا داخل النافذة).
 *   * طرف نافذة يتيم/تالف → يُتجاهل ذلك القيد وحده (البقية تُفرض).
 */
export function isItemWithinSchedule(item: ItemSchedule, now: Date = new Date()): boolean {
        const days = parseAvailableDays(item.availableDays);
        const window = validWindow(item);
        // لا قيد فعلي — أرخص مسار (الأصناف غير المجدولة هي الغالبية).
        if (days === null && window === null) return true;

        const clock = tripoliWallClock(now);

        if (days !== null && !days.includes(clock.dayOfWeek)) return false;
        if (window === null) return true;

        if (window.from === window.to) return true; // 24 ساعة
        if (window.from < window.to) {
                return clock.minutes >= window.from && clock.minutes < window.to;
        }
        // عبور منتصف الليل (22:00→02:00): الحصة بعد منتصف الليل تُحسب مفتوحة.
        return clock.minutes >= window.from || clock.minutes < window.to;
}

/**
 * نسخة تفصيلية للحكم (اختبارات + تشخيص): تعيد النتيجة مع سببها العربي —
 * «مغلق اليوم» (اليوم خارج الأيام) أو «خارج النافذة» (داخل يوم مسموح لكن
 * قبل/بعد النافذة). لا تُستخدم في المسار الساخن.
 */
export type ScheduleVerdict =
        | { within: true }
        | { within: false; reason: 'closed-day' | 'outside-window' };

export function scheduleVerdict(item: ItemSchedule, now: Date = new Date()): ScheduleVerdict {
        const days = parseAvailableDays(item.availableDays);
        const window = validWindow(item);
        if (days === null && window === null) return { within: true };
        const clock = tripoliWallClock(now);
        if (days !== null && !days.includes(clock.dayOfWeek)) {
                return { within: false, reason: 'closed-day' };
        }
        if (window === null) return { within: true };
        if (window.from === window.to) return { within: true };
        const inside =
                window.from < window.to
                        ? clock.minutes >= window.from && clock.minutes < window.to
                        : clock.minutes >= window.from || clock.minutes < window.to;
        return inside ? { within: true } : { within: false, reason: 'outside-window' };
}

/* ──────────────────────────────────────────────────────────────────────────
 * عرض المالك: شريحة ملخص الجدولة («يومياً 10:00–17:00» / «السبت، الخميس …»)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * ملخص عربي مختصر للشريحة في قائمة المالك — أرقام غربية (سياسة r135):
 *   * بلا جدولة → null (لا شريحة — الحالة الفارغة غير مرئية).
 *   * «يومياً 10:00–17:00» (كل الأيام + نافذة) · «يومياً» (أيام فقط).
 *   * «السبت، الخميس 22:00–02:00» (أيام محددة، بترتيب الأسبوع الليبي).
 */
export function formatScheduleSummaryAr(item: ItemSchedule): string | null {
        const days = parseAvailableDays(item.availableDays);
        const window = validWindow(item);
        if (days === null && window === null) return null;

        const daysLabel =
                days === null || days.length === 7
                        ? 'يومياً'
                        : LIBYAN_WEEK_ORDER.filter((d) => days.includes(d))
                                  .map((d) => DAY_NAMES_AR[d])
                                  .join('، ');
        if (window === null) return daysLabel;
        return `${daysLabel} ${item.availableFrom}–${item.availableTo}`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Zod: حقول الجدولة لمسارات الكتابة (items POST/PUT) — رسائل عربية
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * availableDays كما يكتبه المحرر: JSON نصي لمصفوفة أيام 0..6 (يفضَّل
 * فريدًا — يُطبَّع بالتفريد والفرز قبل التخزين) أو null للمسح.
 * الترميز النصي متعمد: العمود TEXT ولا نريد تحويلات شكل عبر السلك
 * (العميل يبني JSON.stringify([0,1,4]) — نفس ما يقرأه العرض العام).
 */
export const availableDaysSchema = z
        .string()
        .max(30, 'قائمة الأيام غير صالحة')
        .nullable()
        .optional()
        .superRefine((raw, ctx) => {
                if (raw == null || raw.trim() === '') return;
                let parsed: unknown;
                try {
                        parsed = JSON.parse(raw);
                } catch {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'قائمة الأيام غير صالحة — صيغة JSON متوقعة' });
                        return;
                }
                if (!Array.isArray(parsed)) {
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'قائمة الأيام غير صالحة — مصفوفة متوقعة' });
                        return;
                }
                for (const v of parsed) {
                        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 6) {
                                ctx.addIssue({
                                        code: z.ZodIssueCode.custom,
                                        message: 'قائمة الأيام غير صالحة — القيم المسموحة 0-6 (0=الأحد)',
                                });
                                return;
                        }
                }
        });

/** التطبيع قبل التخزين: تفريد + فرز + JSON قياسي («[]» → تُخزَّن null). */
export function normalizeAvailableDays(raw: string | null | undefined): string | null {
        const days = parseAvailableDays(raw);
        return days === null ? null : JSON.stringify(days);
}

/**
 * قاعدة الترابط بين الطرفين: نافذة حاضرة تعني الطرفين — طرف واحد يتيم
 * خطأ إدخال لا معنى له (يُرفض 422 عربية). تُستدعى من POST/PUT بعد parse.
 */
export function schedulePairError(
        from: string | null | undefined,
        to: string | null | undefined,
): string | null {
        const hasFrom = from != null && from !== '';
        const hasTo = to != null && to !== '';
        if (hasFrom !== hasTo) {
                return 'جدولة التوافر تتطلب وقت البداية والنهاية معًا';
        }
        return null;
}
