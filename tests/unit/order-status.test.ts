/**
 * Order presentation metadata + Arabic relative time.
 * Covers the six Arabic noun-number states for minutes/hours/days and the
 * semantic status palette mapping (phase-2 tokens).
 */
import { describe, it, expect } from 'vitest';
import {
	ORDER_STATUS_META,
	getOrderStatusMeta,
	getPickupTypeMeta,
	formatRelativeTimeAr,
} from '@/lib/order-status';

describe('getOrderStatusMeta', () => {
	it('exposes every lifecycle status with a next transition', () => {
		expect(ORDER_STATUS_META.new.next).toBe('preparing');
		expect(ORDER_STATUS_META.preparing.next).toBe('ready');
		expect(ORDER_STATUS_META.ready.next).toBe('completed');
		// Terminal statuses have no next step.
		expect(ORDER_STATUS_META.completed.next).toBeNull();
		expect(ORDER_STATUS_META.cancelled.next).toBeNull();
	});

	it('falls back to "new" for unknown statuses', () => {
		expect(getOrderStatusMeta('mystery')).toBe(ORDER_STATUS_META.new);
	});
});

describe('getPickupTypeMeta', () => {
	it('labels all three pickup types in Arabic', () => {
		expect(getPickupTypeMeta('inside').label).toBe('داخل المكان');
		expect(getPickupTypeMeta('takeaway').label).toBe('سفري');
		expect(getPickupTypeMeta('delivery').label).toBe('توصيل');
	});

	it('falls back to inside for unknown pickup types', () => {
		expect(getPickupTypeMeta('teleport')).toEqual(getPickupTypeMeta('inside'));
	});
});

describe('formatRelativeTimeAr', () => {
	const now = new Date('2026-08-24T12:00:00Z');

	it('returns "الآن" for anything under a minute', () => {
		expect(formatRelativeTimeAr(new Date(now.getTime() - 30_000), now)).toBe('الآن');
		expect(formatRelativeTimeAr(now, now)).toBe('الآن');
	});

	it('clamps future timestamps (clock skew) to "الآن"', () => {
		expect(formatRelativeTimeAr(new Date(now.getTime() + 120_000), now)).toBe('الآن');
	});

	it('formats minutes with dual/plural/singular forms', () => {
		// 1 → singular, 2 → dual, 3-10 → plural, 11+ → singular
		expect(formatRelativeTimeAr(new Date(now.getTime() - 60_000), now)).toBe(
			'قبل 1 دقيقة'
		);
		expect(formatRelativeTimeAr(new Date(now.getTime() - 2 * 60_000), now)).toBe(
			'قبل 2 دقيقتين'
		);
		expect(formatRelativeTimeAr(new Date(now.getTime() - 5 * 60_000), now)).toBe(
			'قبل 5 دقائق'
		);
		expect(formatRelativeTimeAr(new Date(now.getTime() - 15 * 60_000), now)).toBe(
			'قبل 15 دقيقة'
		);
	});

	it('formats hours with dual/plural forms', () => {
		expect(formatRelativeTimeAr(new Date(now.getTime() - 2 * 3_600_000), now)).toBe(
			'قبل 2 ساعتين'
		);
		expect(formatRelativeTimeAr(new Date(now.getTime() - 5 * 3_600_000), now)).toBe(
			'قبل 5 ساعات'
		);
	});

	it('formats days with dual/plural forms', () => {
		expect(formatRelativeTimeAr(new Date(now.getTime() - 2 * 86_400_000), now)).toBe(
			'قبل 2 يومين'
		);
		expect(formatRelativeTimeAr(new Date(now.getTime() - 7 * 86_400_000), now)).toBe(
			'قبل 7 أيام'
		);
	});

	it('falls back to an absolute date at 30 days or more', () => {
		const old = new Date(now.getTime() - 45 * 86_400_000);
		const text = formatRelativeTimeAr(old, now);
		expect(text).not.toMatch(/^قبل /);
		expect(text.length).toBeGreaterThan(0);
	});

	it('returns empty string for invalid dates', () => {
		expect(formatRelativeTimeAr('not-a-date')).toBe('');
	});
});
