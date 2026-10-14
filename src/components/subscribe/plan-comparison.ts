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

/** Sentinel values the DB uses for the highest enforced caps (r143 D10:
 *  «unlimited» was retired — every cap names its number, r92 law). */
const UNLIMITED_MENUS = 9999;
const UNLIMITED_ORDERS = 99999;

/** Spelled-out forms for 1 and 2 — "1 صنف" reads wrong; "صنف واحد" doesn't. */
const ONE = 'واحد';
const TWO = 'اثنان';

/**
 * Formats a numeric cap as an Arabic phrase with correct plural forms:
 * 1 → "صنف واحد", 2 → "صنفان", 3–10 → "5 أصناف", 11+ → "15 صنف".
 * r143 (Phase-4 W1 D10): القيم القصوى (9999/99999) صارت تُذكر بعددها
 * («حتى 9999 صنف») وفق قانون r92 «TEXT follows ENFORCEMENT» — الحارس
 * يرفض الصنف 9999 فعليًا (PlanLimitError) فوعد «غير محدود» كان كذبة
 * تُناقض خصائص الخطة نفسها («أصناف حتى 9999») في نفس البطاقة.
 */
export function formatCap(count: number, singular: string, plural: string): string {
        if (count >= UNLIMITED_MENUS) return `حتى ${toArabicNumber(count)} ${singular}`;
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
                                /* r143 D10: 9999 يمر عبر formatCap فيُذكر بعدده («حتى 9999 منيو») */
                                p.maxMenus === 1 ? 'منيو واحد' : formatCap(p.maxMenus, 'منيو', 'منيوهات')
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
                                        ? `حتى ${toArabicNumber(p.maxOrders)} ${getArabicPlural(p.maxOrders, 'طلب', undefined, 'طلبات')}`
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
 * with Arabic plurals ("حتى 10 أصناف" — and since r143 D10 the 9999
 * sentinel names its enforced number too, "حتى 9999 صنف", r92 law).
 */
export function itemsPhrase(plan: ComparisonPlan): string {
        return `حتى ${toArabicNumber(plan.maxItems)} ${getArabicPlural(plan.maxItems, 'صنف', undefined, 'أصناف')}`;
}

/* ── P13-2b (T3) — in-card limit dedup: ONE limit surface per card ──────── */

/**
 * P13-2b (T3): plan cards used to state the enforced caps TWICE — once as
 * the computed surface (/pricing stats grid, /subscribe itemsPhrase, the
 * subscribe review recap) and again as DB feature strings that merely
 * restate the same number («أصناف حتى 9999» under a stats row already
 * saying «الأصناف: حتى 9999»). The DB stays the source of truth — this is
 * a RENDER-layer filter shared by every plan-card surface (never
 * triplicated): when a card already shows a computed cap, feature strings
 * that exactly restate that cap are dropped from the rendered list.
 */
export type ShownCap = 'menus' | 'items' | 'orders';

/** The numeric caps every ComparisonPlan carries. */
type PlanCaps = Pick<ComparisonPlan, 'maxMenus' | 'maxItems' | 'maxOrders'>;

const CAP_NOUNS: Record<ShownCap, { singular: string; plural: string }> = {
        menus: { singular: 'منيو', plural: 'منيوهات' },
        items: { singular: 'صنف', plural: 'أصناف' },
        orders: { singular: 'طلب', plural: 'طلبات' },
};

const capValue = (plan: PlanCaps, cap: ShownCap): number =>
        cap === 'menus' ? plan.maxMenus : cap === 'items' ? plan.maxItems : plan.maxOrders;

/**
 * Exact-match restatement candidates for one cap, built FROM the plan's own
 * number (never a hardcoded phrase list — a ladder change can't orphan the
 * filter). Covers the wording families the fleet's seeds/migrations use:
 *   bare count      «10 أصناف» / «50 صنف»   (formatCap family, incl. the
 *                   spelled-out 1/2 and the sentinel «حتى N صنف» forms)
 *   r92-law style   «أصناف حتى 9999» / «منيوهات حتى 10» (noun ثم العدد)
 *   computed style  «حتى 3 منيوهات» / «حتى 100 صنف» (itemsPhrase / capRows)
 * Both noun spellings are covered because Arabic takes the plural noun for
 * 3–10 counts and the singular for 11+.
 */
function capRestatements(plan: PlanCaps, cap: ShownCap): string[] {
        const value = capValue(plan, cap);
        const { singular, plural } = CAP_NOUNS[cap];
        const n = toArabicNumber(value);
        return [
                formatCap(value, singular, plural),
                `${plural} حتى ${n}`,
                `${singular} حتى ${n}`,
                `حتى ${n} ${singular}`,
                `حتى ${n} ${plural}`,
        ];
}

/**
 * The features list minus the cap restatements of `shownCaps` — the render
 * complement of the card's computed limit surface. Trims before matching so
 * DB rows with stray whitespace never dodge the filter.
 */
export function filterLimitFeatures(
        features: string[],
        plan: PlanCaps,
        shownCaps: readonly ShownCap[],
): string[] {
        const restatements = new Set<string>();
        for (const cap of shownCaps) {
                for (const phrase of capRestatements(plan, cap)) restatements.add(phrase.trim());
        }
        return features.filter((f) => !restatements.has(f.trim()));
}
