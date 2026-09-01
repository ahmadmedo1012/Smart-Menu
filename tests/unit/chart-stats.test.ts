import { describe, it, expect } from 'vitest';
import {
	parseAnalyticsRange,
	fillHours,
	fillDailySeries,
	fillRevenueSeries,
	categoryShares,
	rangeBounds,
	previousBounds,
	toDateKey,
	hourLabel,
	seriesHasData,
} from '@/lib/chart-stats';
import {
	catmullRomPath,
	closeAreaPath,
	donutSlicePath,
	linearScale,
	tickIndices,
} from '@/lib/chart-geometry';

describe('parseAnalyticsRange', () => {
	it('accepts today/week/month and defaults to week', () => {
		expect(parseAnalyticsRange('today')).toBe('today');
		expect(parseAnalyticsRange('week')).toBe('week');
		expect(parseAnalyticsRange('month')).toBe('month');
		expect(parseAnalyticsRange('nope')).toBe('week');
		expect(parseAnalyticsRange(null)).toBe('week');
	});
});

describe('fillHours', () => {
	it('pads 24 hours and sums duplicates', () => {
		const filled = fillHours([
			{ hour: 8, count: 2 },
			{ hour: 8, count: 3 },
			{ hour: 21, count: 4 },
		]);
		expect(filled).toHaveLength(24);
		expect(filled[8].count).toBe(5);
		expect(filled[21].count).toBe(4);
		expect(filled[0].count).toBe(0);
		expect(filled[23].hour).toBe(23);
	});
});

describe('fillDailySeries', () => {
	it('fills missing days between start and end', () => {
		const start = new Date(2026, 8, 1);
		const end = new Date(2026, 8, 3);
		const series = fillDailySeries(
			[{ date: '2026-09-01', count: 4 }, { date: '2026-09-03', count: 1 }],
			start,
			end
		);
		expect(series.map((d) => d.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
		expect(series.map((d) => d.count)).toEqual([4, 0, 1]);
	});
});

describe('fillRevenueSeries + toDateKey', () => {
	it('normalizes Date objects to YYYY-MM-DD keys', () => {
		expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
		expect(toDateKey('2026-01-05T18:00:00.000Z')).toBe('2026-01-05');
		const start = new Date(2026, 0, 5);
		const end = new Date(2026, 0, 6);
		const series = fillRevenueSeries([{ date: new Date(2026, 0, 5), revenue: 12.5 }], start, end);
		expect(series[0].revenue).toBe(12.5);
		expect(series[1].revenue).toBe(0);
	});
});

describe('categoryShares', () => {
	it('computes percentages and folds extra slices into أخرى', () => {
		const shares = categoryShares(
			[
				{ categoryId: 1, name: 'وجبات', count: 50 },
				{ categoryId: 2, name: 'مشروبات', count: 30 },
				{ categoryId: 3, name: 'حلويات', count: 10 },
				{ categoryId: 4, name: 'مقبلات', count: 5 },
				{ categoryId: 5, name: 'إضافات', count: 3 },
				{ categoryId: 6, name: 'أخرى-صغيرة', count: 2 },
			],
			5
		);
		expect(shares).toHaveLength(5);
		expect(shares[0].name).toBe('وجبات');
		expect(shares[shares.length - 1].name).toBe('أخرى');
		expect(shares[shares.length - 1].count).toBe(5);
		const pctSum = shares.reduce((s, x) => s + x.pct, 0);
		expect(pctSum).toBeGreaterThan(99);
		expect(pctSum).toBeLessThan(101);
	});
});

describe('rangeBounds', () => {
	it('today starts at midnight, week is last 7 calendar days, month is month start', () => {
		const now = new Date(2026, 8, 15, 18, 30, 0);
		const today = rangeBounds('today', now);
		expect(today.start.getHours()).toBe(0);
		expect(today.start.getDate()).toBe(15);

		const week = rangeBounds('week', now);
		expect(toDateKey(week.start)).toBe('2026-09-09');

		const month = rangeBounds('month', now);
		expect(toDateKey(month.start)).toBe('2026-09-01');

		const prev = previousBounds('month', month);
		expect(toDateKey(prev.start)).toBe('2026-08-01');
	});
});

describe('hourLabel / seriesHasData', () => {
	it('pads hours and detects empty series', () => {
		expect(hourLabel(9)).toBe('09:00');
		expect(hourLabel(0)).toBe('00:00');
		expect(seriesHasData([0, 0, 1])).toBe(true);
		expect(seriesHasData([0, 0])).toBe(false);
	});
});

describe('chart geometry', () => {
	it('linearScale maps domain to range', () => {
		const s = linearScale([0, 10], [0, 100]);
		expect(s(0)).toBe(0);
		expect(s(10)).toBe(100);
		expect(s(5)).toBe(50);
	});

	it('catmullRomPath starts with M and uses cubics when smooth', () => {
		const pts = [
			{ x: 0, y: 10 },
			{ x: 10, y: 0 },
			{ x: 20, y: 10 },
		];
		expect(catmullRomPath(pts, 0)).toContain('L');
		expect(catmullRomPath(pts, 1)).toContain('C');
		expect(catmullRomPath(pts, 1).startsWith('M ')).toBe(true);
	});

	it('closeAreaPath seals the spline to the baseline', () => {
		const pts = [
			{ x: 0, y: 10 },
			{ x: 10, y: 0 },
		];
		const line = catmullRomPath(pts, 0);
		const area = closeAreaPath(line, pts, 50);
		expect(area.endsWith('Z')).toBe(true);
		expect(area).toContain('L 10 50');
	});

	it('donutSlicePath draws a closed arc', () => {
		const d = donutSlicePath(100, 100, 80, 50, 0, Math.PI / 2);
		expect(d.startsWith('M ')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		expect(d).toContain('A 80 80');
		expect(d).toContain('A 50 50');
	});

	it('donutSlicePath splits a full circle into two arcs', () => {
		const d = donutSlicePath(100, 100, 80, 50, 0, Math.PI * 2);
		expect(d.split('M ').length).toBeGreaterThan(2);
	});

	it('tickIndices always includes first and last', () => {
		const ticks = tickIndices(31, 8);
		expect(ticks[0]).toBe(0);
		expect(ticks[ticks.length - 1]).toBe(30);
		expect(ticks.length).toBeLessThanOrEqual(9);
	});
});
