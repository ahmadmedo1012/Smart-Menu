/**
 * Plan comparison logic shared by /pricing and /subscribe.
 *
 * Pure functions only — no React, no server imports. The plan shape mirrors
 * the API response of GET /api/plans (SubscriptionPlan with parsed features).
 */
import { getArabicPlural } from '@/lib/arabic-plural';
import { toArabicNumber } from '@/lib/format';

/** Plan shape from GET /api/plans. */
export type ComparisonPlan = {
	id: number;
	name: string;
	nameAr: string;
	price: number;
	periodDays: number;
	features: string[];
	maxMenus: number;
	maxItems: number;
	maxOrders: number;
	sortOrder: number;
};

/** Sentinel values the DB uses for "unlimited" caps. */
const UNLIMITED_MENUS = 9999;
const UNLIMITED_ITEMS = 9999;
const UNLIMITED_ORDERS = 99999;

/** Spelled-out forms for 1 and 2 — "1 صنف" reads wrong; "صنف واحد" doesn't. */
const ONE = 'واحد';
const TWO = 'اثنان';

/**
 * Formats a numeric cap as an Arabic phrase with correct plural forms:
 * 1 → "صنف واحد", 2 → "صنفان", 3–10 → "5 أصناف", 11+ → "15 صنف".
 */
export function formatCap(count: number, singular: string, plural: string): string {
	if (count >= UNLIMITED_MENUS) return 'غير محدود';
	const noun = getArabicPlural(count, singular, undefined, plural);
	if (count === 1) return `${noun} ${ONE}`;
	if (count === 2) {
		// Mechanical dual already ends in ان ("صنفان") — don't append a digit.
		return noun.endsWith('ان') ? noun : `${noun} ${TWO}`;
	}
	return `${toArabicNumber(count)} ${noun}`;
}

export interface CapRow {
	label: string;
	values: string[];
}

/**
 * Quantitative cap rows — the headline differentiator between plans
 * (menus / items / monthly orders), one value per plan in sortOrder.
 */
export function capRows(plans: ComparisonPlan[]): CapRow[] {
	return [
		{
			label: 'المنيوهات',
			values: plans.map((p) =>
				p.maxMenus >= UNLIMITED_MENUS
					? 'غير محدود'
					: p.maxMenus === 1
						? 'منيو واحد'
						: formatCap(p.maxMenus, 'منيو', 'منيوهات')
			),
		},
		{
			label: 'الأصناف',
			values: plans.map((p) => formatCap(p.maxItems, 'صنف', 'أصناف')),
		},
		{
			label: 'الطلبات الشهرية',
			values: plans.map((p) =>
				p.maxOrders >= UNLIMITED_ORDERS
					? 'غير محدود'
					: `${toArabicNumber(p.maxOrders)} ${getArabicPlural(p.maxOrders, 'طلب', undefined, 'طلبات')}`
			),
		},
	];
}

/**
 * Loosely matches a qualitative feature against a plan's features list.
 * Each keyword list covers the wording variants used across seeds/admin data.
 */
const FEATURE_KEYWORDS: Record<string, string[]> = {
	whatsapp: ['واتساب', 'whatsapp'],
	analytics: ['إحصائيات', 'تحليلات', 'analytics'],
	qr: ['qr', 'QR'],
	loyalty: ['ولاء', 'loyalty'],
	referrals: ['إحال', 'referral'],
	csv: ['csv', 'تصدير'],
	customization: ['تخصيص', 'custom'],
	support: ['دعم', 'support'],
};

/** Whether the feature list mentions any of `keywords` (case-insensitive). */
export function hasFeature(features: string[], keywords: string[]): boolean {
	const normalized = features.join('\n').toLowerCase();
	return keywords.some((k) => normalized.includes(k.toLowerCase()));
}

export interface FeatureMatrixRow {
	key: string;
	label: string;
	values: boolean[];
}

/**
 * Qualitative feature matrix — one boolean cell per plan per tracked
 * feature. Rows whose every cell is false are dropped (feature absent
 * everywhere adds no comparison signal).
 */
export function featureMatrix(plans: ComparisonPlan[]): FeatureMatrixRow[] {
	const rows: FeatureMatrixRow[] = [];
	for (const [key, keywords] of Object.entries(FEATURE_KEYWORDS)) {
		const values = plans.map((p) => hasFeature(p.features, keywords));
		if (values.some(Boolean)) {
			rows.push({ key, label: FEATURE_LABELS[key], values });
		}
	}
	return rows;
}

const FEATURE_LABELS: Record<string, string> = {
	whatsapp: 'طلبات واتساب',
	analytics: 'إحصائيات متقدمة',
	qr: 'QR كود مخصص',
	loyalty: 'برنامج ولاء',
	referrals: 'برنامج إحالات',
	csv: 'تصدير CSV',
	customization: 'تخصيص كامل للواجهة',
	support: 'دعم فني فوري',
};

/**
 * Headline differentiator for a single plan card: item capacity phrased
 * with Arabic plurals ("حتى 10 أصناف" / "أصناف غير محدودة").
 */
export function itemsPhrase(plan: ComparisonPlan): string {
	if (plan.maxItems >= UNLIMITED_ITEMS) return 'أصناف غير محدودة';
	return `حتى ${toArabicNumber(plan.maxItems)} ${getArabicPlural(plan.maxItems, 'صنف', undefined, 'أصناف')}`;
}
