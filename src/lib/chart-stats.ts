export type AnalyticsRange = 'today' | 'week' | 'month';

// r121-F-2: ANALYTICS_RANGES (the array constant) was deleted — zero references;
// the AnalyticsRange TYPE stays (parseAnalyticsRange's contract).

export function parseAnalyticsRange(raw: string | null | undefined): AnalyticsRange {
        if (raw === 'today' || raw === 'week' || raw === 'month') return raw;
        return 'week';
}

/* (r138): الدوال الثلاث داخلية — تستهلكها rangeBounds وeachDateKey
   وfillDailySeries/fillRevenueSeries في نفس الملف. */
function startOfDay(d: Date): Date {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
}

function addDays(d: Date, n: number): Date {
        const x = new Date(d);
        x.setDate(x.getDate() + n);
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

export function rangeBounds(range: AnalyticsRange, now = new Date()): { start: Date; end: Date } {
        const end = new Date(now);
        if (range === 'today') {
                return { start: startOfDay(now), end };
        }
        if (range === 'week') {
                const start = addDays(startOfDay(now), -6);
                return { start, end };
        }
        const start = startOfDay(now);
        start.setDate(1);
        return { start, end };
}

export function previousBounds(
        range: AnalyticsRange,
        current: { start: Date; end: Date }
): { start: Date; end: Date } {
        if (range === 'month') {
                const start = new Date(current.start);
                start.setMonth(start.getMonth() - 1);
                const end = new Date(current.start);
                end.setMilliseconds(-1);
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
