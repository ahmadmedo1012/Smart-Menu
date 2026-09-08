/**
 * round94 W2-b (inspection-c §2.10) — unit contracts for the pure helpers
 * extracted from ItemDialog.tsx into src/components/owner/item-dialog/
 * modifier-draft-utils.ts (nextDraftKey / groupsFromItem /
 * buildModifierGroupsPayload).
 *
 * Until this split these validation rules were ONLY guarded by the team11
 * e2e journey (no unit test ever imported ItemDialog). This file pins the
 * Arabic error reasons, the 0–10 bound rules, min≤max, empty-string
 * defaults (0/1), optional English names, sortOrder index fallbacks, and
 * the groupsFromItem⇄payload numeric round-trip — pure functions, no DOM.
 *
 * premiumToast is mocked (sonner/motion are UI runtimes — node env here).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockPremiumToast = vi.hoisted(() => vi.fn());
vi.mock('@/lib/premium-toast', () => ({ premiumToast: mockPremiumToast }));

import {
	nextDraftKey,
	groupsFromItem,
	buildModifierGroupsPayload,
} from '@/components/owner/item-dialog/modifier-draft-utils';
import type { GroupDraft, ItemModifierGroup } from '@/components/owner/item-dialog/types';

// ── Fixtures ────────────────────────────────────────────────────────────

function draftGroup(overrides: Partial<GroupDraft> = {}): GroupDraft {
	return {
		key: nextDraftKey('g'),
		nameAr: 'الحجم',
		name: 'Size',
		minSelect: '0',
		maxSelect: '2',
		required: false,
		sortOrder: '0',
		options: [],
		...overrides,
	};
}

function draftOption(
	overrides: Partial<GroupDraft['options'][number]> = {}
): GroupDraft['options'][number] {
	return {
		key: nextDraftKey('o'),
		nameAr: 'كبير',
		name: 'Large',
		priceDelta: '1.5',
		isAvailable: true,
		sortOrder: 0,
		...overrides,
	};
}

beforeEach(() => {
	mockPremiumToast.mockClear();
});

// ── nextDraftKey ────────────────────────────────────────────────────────

describe('nextDraftKey — draft key uniqueness (module-level counter)', () => {
	it('returns unique keys across consecutive calls', () => {
		const keys = Array.from({ length: 200 }, () => nextDraftKey('g'));
		expect(new Set(keys).size).toBe(200);
	});

	it('embeds the given prefix', () => {
		expect(nextDraftKey('g')).toMatch(/^g-/);
		expect(nextDraftKey('o')).toMatch(/^o-/);
	});

	it('never collides between group and option prefixes', () => {
		const g = nextDraftKey('g');
		const o = nextDraftKey('o');
		expect(g).not.toBe(o);
	});
});

// ── groupsFromItem ──────────────────────────────────────────────────────

describe('groupsFromItem — GET /api/items shape → editor drafts', () => {
	it('undefined → [] (new item, no groups)', () => {
		expect(groupsFromItem(undefined)).toEqual([]);
	});

	it('maps numeric group fields to input strings (minSelect/maxSelect/sortOrder)', () => {
		const [draft] = groupsFromItem([apiGroup({ minSelect: 0, maxSelect: 3, sortOrder: 7 })]);
		expect(draft.minSelect).toBe('0');
		expect(draft.maxSelect).toBe('3');
		expect(draft.sortOrder).toBe('7');
	});

	it('maps option priceDelta number → string, and null/undefined → "0"', () => {
		const [draft] = groupsFromItem([
			apiGroup({
				options: [
					apiOption({ priceDelta: 2.5 }),
					apiOption({ priceDelta: undefined as unknown as number }),
				],
			}),
		]);
		expect(draft.options[0].priceDelta).toBe('2.5');
		expect(draft.options[1].priceDelta).toBe('0');
	});

	it('options undefined → [] options', () => {
		const [draft] = groupsFromItem([apiGroup({ options: undefined })]);
		expect(draft.options).toEqual([]);
	});

	it('preserves ids, required, isAvailable and names verbatim', () => {
		const [draft] = groupsFromItem([
			apiGroup({ id: 42, required: true, options: [apiOption({ id: 99, isAvailable: false })] }),
		]);
		expect(draft.id).toBe(42);
		expect(draft.required).toBe(true);
		expect(draft.options[0].id).toBe(99);
		expect(draft.options[0].isAvailable).toBe(false);
	});

	it('generates distinct keys for every group and every option', () => {
		const drafts = groupsFromItem([
			apiGroup({ options: [apiOption(), apiOption()] }),
			apiGroup({ options: [apiOption()] }),
		]);
		const keys = [
			drafts[0].key,
			...drafts[0].options.map((o) => o.key),
			drafts[1].key,
			...drafts[1].options.map((o) => o.key),
		];
		expect(new Set(keys).size).toBe(keys.length);
	});
});

// ── buildModifierGroupsPayload — validation rules (w3-f1) ───────────────

describe('buildModifierGroupsPayload — group validation', () => {
	it('[] → [] (explicit empty list wipes stored groups — PUT contract)', () => {
		expect(buildModifierGroupsPayload([])).toEqual([]);
		expect(mockPremiumToast).not.toHaveBeenCalled();
	});

	it('group without an Arabic name → null + Arabic toast', () => {
		expect(buildModifierGroupsPayload([draftGroup({ nameAr: '' })])).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledWith('error', 'اسم المجموعة رقم 1 مطلوب');
	});

	it('whitespace-only Arabic name → null', () => {
		expect(buildModifierGroupsPayload([draftGroup({ nameAr: '   ' })])).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledTimes(1);
	});

	it('the failing group ordinal is Arabic-message numbered by position (second group)', () => {
		expect(buildModifierGroupsPayload([draftGroup(), draftGroup({ nameAr: '' })])).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledWith('error', 'اسم المجموعة رقم 2 مطلوب');
	});

	it('aborts at the FIRST invalid group (no partial payload, single toast)', () => {
		expect(
			buildModifierGroupsPayload([draftGroup({ nameAr: '' }), draftGroup({ nameAr: '' })])
		).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledTimes(1);
	});

	it('nameAr is trimmed in the payload', () => {
		const [payload] = buildModifierGroupsPayload([draftGroup({ nameAr: '  الحجم  ' })])!;
		expect(payload.nameAr).toBe('الحجم');
	});

	it('negative minSelect → null', () => {
		expect(buildModifierGroupsPayload([draftGroup({ minSelect: '-1' })])).toBeNull();
	});

	it('decimal minSelect → null (integers only)', () => {
		expect(buildModifierGroupsPayload([draftGroup({ minSelect: '1.5' })])).toBeNull();
	});

	it('minSelect > 10 → null', () => {
		expect(buildModifierGroupsPayload([draftGroup({ minSelect: '11' })])).toBeNull();
	});

	it('maxSelect = 0 → null (max must be ≥ 1)', () => {
		expect(buildModifierGroupsPayload([draftGroup({ maxSelect: '0' })])).toBeNull();
	});

	it('maxSelect > 10 → null', () => {
		expect(buildModifierGroupsPayload([draftGroup({ maxSelect: '11' })])).toBeNull();
	});

	it('decimal maxSelect → null', () => {
		expect(buildModifierGroupsPayload([draftGroup({ maxSelect: '2.5' })])).toBeNull();
	});

	it('minSelect > maxSelect → null + Arabic reason', () => {
		expect(buildModifierGroupsPayload([draftGroup({ minSelect: '3', maxSelect: '2' })])).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledWith(
			'error',
			'الحد الأدنى في «الحجم» لا يمكن أن يتجاوز الحد الأقصى'
		);
	});

	it('bounds 0/10 are the inclusive extremes and pass', () => {
		const payload = buildModifierGroupsPayload([draftGroup({ minSelect: '0', maxSelect: '10' })]);
		expect(payload).not.toBeNull();
		expect(payload![0].minSelect).toBe(0);
		expect(payload![0].maxSelect).toBe(10);
	});

	it('empty minSelect defaults to 0, empty maxSelect defaults to 1', () => {
		const [payload] = buildModifierGroupsPayload([draftGroup({ minSelect: '', maxSelect: '' })])!;
		expect(payload.minSelect).toBe(0);
		expect(payload.maxSelect).toBe(1);
	});

	it('non-numeric bound (NaN) → null (integer guard)', () => {
		expect(buildModifierGroupsPayload([draftGroup({ minSelect: 'abc' })])).toBeNull();
	});
});

describe('buildModifierGroupsPayload — option validation', () => {
	it('option without an Arabic name → null + Arabic toast mentions option ordinal and group', () => {
		expect(
			buildModifierGroupsPayload([draftGroup({ options: [draftOption({ nameAr: '' })] })])
		).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledWith('error', 'اسم الخيار رقم 1 في «الحجم» مطلوب');
	});

	it('non-numeric priceDelta → null + Arabic reason', () => {
		expect(
			buildModifierGroupsPayload([draftGroup({ options: [draftOption({ priceDelta: 'abc' })] })])
		).toBeNull();
		expect(mockPremiumToast).toHaveBeenCalledWith('error', 'سعر الخيار «كبير» غير صالح');
	});

	it('empty priceDelta → 0', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ options: [draftOption({ priceDelta: '' })] }),
		])!;
		expect(payload.options[0].priceDelta).toBe(0);
	});

	it('numeric string priceDelta → number in the payload', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ options: [draftOption({ priceDelta: '2.5' })] }),
		])!;
		expect(payload.options[0].priceDelta).toBe(2.5);
	});

	it('option nameAr is trimmed in the payload', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ options: [draftOption({ nameAr: '  كبير  ' })] }),
		])!;
		expect(payload.options[0].nameAr).toBe('كبير');
	});
});

describe('buildModifierGroupsPayload — optional English names & passthrough', () => {
	it('empty English name → undefined in the payload (zod treats it as omitted)', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ name: '   ', options: [draftOption({ name: '' })] }),
		])!;
		expect(payload.name).toBeUndefined();
		expect(payload.options[0].name).toBeUndefined();
	});

	it('non-empty English name is trimmed and sent', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ name: '  Size  ', options: [draftOption({ name: ' Large ' })] }),
		])!;
		expect(payload.name).toBe('Size');
		expect(payload.options[0].name).toBe('Large');
	});

	it('group sortOrder string → number; NaN sortOrder falls back to the group index', () => {
		const [a, b] = buildModifierGroupsPayload([
			draftGroup({ sortOrder: '4' }),
			draftGroup({ sortOrder: 'NaN' }),
		])!;
		expect(a.sortOrder).toBe(4);
		expect(b.sortOrder).toBe(1); // second group → index 1
	});

	it('option NaN sortOrder falls back to the option index', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ options: [draftOption({ sortOrder: NaN }), draftOption({ sortOrder: NaN })] }),
		])!;
		expect(payload.options[0].sortOrder).toBe(0);
		expect(payload.options[1].sortOrder).toBe(1);
	});

	it('ids, required and isAvailable pass through verbatim', () => {
		const [payload] = buildModifierGroupsPayload([
			draftGroup({ id: 5, required: true, options: [draftOption({ id: 6, isAvailable: false })] }),
		])!;
		expect(payload.id).toBe(5);
		expect(payload.required).toBe(true);
		expect(payload.options[0].id).toBe(6);
		expect(payload.options[0].isAvailable).toBe(false);
	});
});

describe('round-trip groupsFromItem ⇄ buildModifierGroupsPayload', () => {
	it('numbers survive the API → draft → payload chain unchanged', () => {
		const api = [
			apiGroup({
				id: 3,
				nameAr: 'الحجم',
				name: 'Size',
				minSelect: 1,
				maxSelect: 4,
				required: true,
				sortOrder: 2,
				options: [
					apiOption({
						id: 8,
						nameAr: 'كبير',
						name: 'Large',
						priceDelta: 2.5,
						isAvailable: false,
						sortOrder: 1,
					}),
				],
			}),
		];
		const payload = buildModifierGroupsPayload(groupsFromItem(api))!;
		expect(payload).toEqual([
			{
				id: 3,
				nameAr: 'الحجم',
				name: 'Size',
				minSelect: 1,
				maxSelect: 4,
				required: true,
				sortOrder: 2,
				options: [
					{
						id: 8,
						nameAr: 'كبير',
						name: 'Large',
						priceDelta: 2.5,
						isAvailable: false,
						sortOrder: 1,
					},
				],
			},
		]);
	});
});

// ── API-shape helpers ───────────────────────────────────────────────────

function apiGroup(overrides: Partial<ItemModifierGroup> = {}): ItemModifierGroup {
	return {
		id: 1,
		nameAr: 'الحجم',
		name: 'Size',
		minSelect: 0,
		maxSelect: 2,
		required: false,
		sortOrder: 0,
		options: [],
		...overrides,
	};
}

function apiOption(
	overrides: Partial<ItemModifierGroup['options'][number]> = {}
): ItemModifierGroup['options'][number] {
	return {
		id: 2,
		nameAr: 'كبير',
		name: 'Large',
		priceDelta: 1.5,
		isAvailable: true,
		sortOrder: 0,
		...overrides,
	};
}
