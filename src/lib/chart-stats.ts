export type AnalyticsRange = 'today' | 'week' | 'month';

// r121-F-2: ANALYTICS_RANGES (the array constant) was deleted — zero references;
// the AnalyticsRange TYPE stays (parseAnalyticsRange's contract).

/* P45-W1 — إطار يوم طرابلس للإحصاءات (نفس عائلة MenuEvents P43:
 * tripoliDateString في lib/menu-events.ts — Intl بمنطقة صريحة، لا حساب
 * يدوي بالإزاحة). سابقًا كانت حدود «اليوم/الأسبوع/الشهر» تُحسب بساعة
 * الخادم المحلية (setHours(0,0,0,0)) — على Vercel (TZ=UTC) يبدأ «يوم
 * المالك» عند منتصف الليل UTC أي 01:00/02:00 طرابلس، فتُقص أول ساعة
 * أو ساعتان من دوام المطعم من «إيراد اليوم». المنطقة: Africa/Tripoli
 * عبر Intl (الدقيقة عند أي إزاحة/انتقال)، واللحظة الناتجة UTC
 * حقيقية تصلح مقارنةً مع createdAt مباشرة. */

/** إزاحة Africa/Tripoli بالميلي ثانية عند لحظة معيّنة (موجبة شرق UTC). */
function tripoliOffsetMs(at: Date): number {
        const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Africa/Tripoli',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23',
        }).formatToParts(at);
        const p = (type: Intl.DateTimeFormatPartTypes) =>
                Number(parts.find((x) => x.type === type)?.value ?? 0);
        const asUtc = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second'));
        return asUtc - at.getTime();
}

/** التاريخ الطرابلسي (y/m/d) لأي لحظة — نمط en-CA نفسه في menu-events. */
function tripoliLocalYMD(now: Date): { y: number; m: number; d: number } {
        const s = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Tripoli',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
        }).format(now);
        const [y, m, d] = s.split('-').map(Number);
        return { y, m, d };
}

/** اللحظة (UTC) لمنتصف ليل تاريخ طرابلسي معيّن — تصحّح مرة واحدة
 *  لإزاحة منتصف الليل لو انتقل التوقيت عند الحافة (تعميم بلا فرض). */
function tripoliMidnightOf(y: number, m: number, d: number): Date {
        const naive = Date.UTC(y, m - 1, d);
        let offset = tripoliOffsetMs(new Date(naive));
        let ms = naive - offset;
        const offsetAtMidnight = tripoliOffsetMs(new Date(ms));
        if (offsetAtMidnight !== offset) {
                offset = offsetAtMidnight;
                ms = naive - offset;
        }
        return new Date(ms);
}

/**
 * حدود يوم طرابلس الجاري (P45-W1): `start` = لحظة منتصف ليل طرابلس
 * (UTC حقيقي)، `end` = اللحظة الممرّرة. تستهلكها مسارا الإحصاءات
 * (/api/stats لـ «اليوم» و/api/stats/advanced عبر rangeBounds).
 */
export function tripoliDayBounds(now: Date = new Date()): { start: Date; end: Date } {
        const { y, m, d } = tripoliLocalYMD(now);
        return { start: tripoliMidnightOf(y, m, d), end: new Date(now.getTime()) };
}

export function parseAnalyticsRange(raw: string | null | undefined): AnalyticsRange {
        if (raw === 'today' || raw === 'week' || raw === 'month') return raw;
        return 'week';
}

/* (r138): startOfDay داخلية — تستهلكها eachDateKey وfillDailySeries/
   fillRevenueSeries في نفس الملف (مفاتيح محور السلاسل بطابع DATE()
   في SQL — UTC في الإنتاج). حدود النوافذ صارت طرابلسية (P45-W1):
   انظر tripoliDayBounds أعلاه. addDays حُذفت (كان مستهلكها الوحيد
   rangeBounds القديم). */
function startOfDay(d: Date): Date {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
}

export function toDateKey(value: string | Date | null | undefined): string {
        if (!value) return '';
        if (value instanceof Date) {
                const y = value.getFullYear();
                const m = String(value.getMonth() + 1).padStart(2, '0');
                const d = String(value.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
        }
        const s = String(value);
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const parsed = new Date(s);
        if (Number.isNaN(parsed.getTime())) return s.slice(0, 10);
        return toDateKey(parsed);
}

const TRIPOLI_DAY_MS = 24 * 60 * 60 * 1000;

/** P45-W1: الحدود طرابلسية — اليوم يبدأ عند منتصف ليل طرابلس، الأسبوع
 *  آخر 7 أيام طرابلسية تقويمية (نوافذ نظيفة 7 دلاء لا 168 ساعة
 *  متدحرجة كانت تعطي 8 دلاء لنفس البطاقة)، والشهر يبدأ عند الأول
 *  الطرابلسي من الشهر الطرابلسي الجاري. */
export function rangeBounds(range: AnalyticsRange, now = new Date()): { start: Date; end: Date } {
        const end = new Date(now.getTime());
        if (range === 'today') {
                return tripoliDayBounds(now);
        }
        if (range === 'week') {
                const { start } = tripoliDayBounds(now);
                return { start: new Date(start.getTime() - 6 * TRIPOLI_DAY_MS), end };
        }
        const { y, m } = tripoliLocalYMD(now);
        return { start: tripoliMidnightOf(y, m, 1), end };
}

export function previousBounds(
        range: AnalyticsRange,
        current: { start: Date; end: Date }
): { start: Date; end: Date } {
        if (range === 'month') {
                /* P45-W1: current.start صار منتصف ليل طرابلسي — قراءة يده/شهره
                 * المحليين بالإزاحة الطرابلسية (كان getMonth بساعة الخادم
                 * يقرأ اليوم السابق عند الإزاحة الموجبة). الشهر السابق
                 * يبدأ عند أول الشهر الطرابلسي السابق. */
                const { y, m } = tripoliLocalYMD(current.start);
                const start = m === 1 ? tripoliMidnightOf(y - 1, 12, 1) : tripoliMidnightOf(y, m - 1, 1);
                const end = new Date(current.start.getTime() - 1);
                return { start, end };
        }
        const ms = Math.max(current.end.getTime() - current.start.getTime(), 24 * 60 * 60 * 1000);
        const end = new Date(current.start.getTime() - 1);
        const start = new Date(end.getTime() - ms);
        return { start, end };
}

export function fillHours(
        rows: { hour: number; count: number }[]
): { hour: number; count: number }[] {
        const map = new Map<number, number>();
        for (const r of rows) {
                const h = Number(r.hour);
                if (h >= 0 && h <= 23) map.set(h, (map.get(h) ?? 0) + (Number(r.count) || 0));
        }
        return Array.from({ length: 24 }, (_, hour) => ({ hour, count: map.get(hour) ?? 0 }));
}

function eachDateKey(start: Date, end: Date): string[] {
        const keys: string[] = [];
        const cursor = startOfDay(start);
        const last = startOfDay(end);
        while (cursor.getTime() <= last.getTime()) {
                keys.push(toDateKey(cursor));
                cursor.setDate(cursor.getDate() + 1);
        }
        return keys;
}

export function fillDailySeries(
        rows: { date: string | Date; count: number }[],
        start: Date,
        end: Date
): { date: string; count: number }[] {
        const map = new Map<string, number>();
        for (const r of rows) {
                const key = toDateKey(r.date);
                if (!key) continue;
                map.set(key, (map.get(key) ?? 0) + (Number(r.count) || 0));
        }
        return eachDateKey(start, end).map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export function fillRevenueSeries(
        rows: { date: string | Date; revenue: number }[],
        start: Date,
        end: Date
): { date: string; revenue: number }[] {
        const map = new Map<string, number>();
        for (const r of rows) {
                const key = toDateKey(r.date);
                if (!key) continue;
                map.set(key, (map.get(key) ?? 0) + (Number(r.revenue) || 0));
        }
        return eachDateKey(start, end).map((date) => ({ date, revenue: map.get(date) ?? 0 }));
}

const WEEKDAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function dayLabel(dateKey: string): string {
        const d = new Date(`${dateKey}T12:00:00`);
        if (Number.isNaN(d.getTime())) return dateKey.slice(5);
        return `${WEEKDAYS_AR[d.getDay()]} ${d.getDate()}`;
}

export function hourLabel(hour: number): string {
        const h = Math.max(0, Math.min(23, Number(hour) || 0));
        return `${String(h).padStart(2, '0')}:00`;
}

export interface CategoryShare {
        categoryId: number;
        name: string;
        count: number;
        pct: number;
}

export function categoryShares(
        rows: { categoryId: number; name: string; count: number }[],
        maxSlices = 5
): CategoryShare[] {
        const totals = new Map<number, CategoryShare>();
        for (const r of rows) {
                const prev = totals.get(r.categoryId);
                const count = Number(r.count) || 0;
                if (prev) {
                        prev.count += count;
                } else {
                        totals.set(r.categoryId, {
                                categoryId: r.categoryId,
                                name: r.name,
                                count,
                                pct: 0,
                        });
                }
        }
        const list = [...totals.values()].sort((a, b) => b.count - a.count);
        const grand = list.reduce((s, x) => s + x.count, 0);
        if (grand <= 0) return list.map((x) => ({ ...x, pct: 0 }));

        if (list.length <= maxSlices) {
                return list.map((x) => ({ ...x, pct: Math.round((x.count / grand) * 1000) / 10 }));
        }

        const head = list.slice(0, maxSlices - 1);
        const rest = list.slice(maxSlices - 1);
        const otherCount = rest.reduce((s, x) => s + x.count, 0);
        const merged = [
                ...head,
                { categoryId: -1, name: 'أخرى', count: otherCount, pct: 0 },
        ];
        return merged.map((x) => ({ ...x, pct: Math.round((x.count / grand) * 1000) / 10 }));
}

export function seriesHasData(values: number[]): boolean {
        return values.some((v) => v > 0);
}
