/**
 * round91-F-B (D2-#1 + D2-#2) — payment-schema payload caps.
 *
 * Schema-level lock for the two money-path caps added to
 * src/lib/payment-schema.ts:
 *   1. tempRestaurants: array .max(10) + per-entry field caps (name ≤ 200,
 *      slug ≤ 100 + [a-z0-9-] regex) — mirrors the gated restaurant-create
 *      schema conventions. The array used to be UNBOUNDED (metadata JSONB
 *      bloat + N restaurants minted on approval); round91-F-B set .max(5)
 *      and P13-2b (T1) raised it to 10 — the Enterprise plan cap (r120
 *      ladder), so the schema never rejects a payload the buyer's own plan
 *      allows (r121-C-12).
 *   2. receiptImageUrl: .max(2_000) with the Arabic cap message — joins the
 *      R90 image-cap family (items 200k / settings 20k / logo 2k / upload 5MB).
 *
 * Route-level integration of both (400 envelopes + the telegram count line)
 * lives in subscriptions-family.test.ts; the approval-time plan-cap
 * enforcement (FOR UPDATE + 409) lives in subscription-decisions.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { createPaymentSchema } from '@/lib/payment-schema';
import { DEFAULT_PLANS } from '@/lib/default-plans';

function base() {
        return {
                phone: '0912345678',
                amount: 19,
                provider: 'libyana',
                planId: 1,
        };
}

function bankBase() {
        return {
                phone: '0912345678',
                amount: 129,
                provider: 'bank',
                planId: 3,
                senderAccountName: 'أحمد المهدي',
                senderAccountNumber: '00203004005',
        };
}

const menu = (name: string, slug: string) => ({ name, slug });

// ── 1. tempRestaurants array + entry caps (D2-#1) ────────────────────────

describe('createPaymentSchema — tempRestaurants caps (round91-F-B)', () => {
        /* P13-2b (T1) ladder realignment: the bound follows the highest bounded
         * plan (Enterprise maxMenus=10, r120 ladder) — was 5, one BELOW the top
         * plan's own cap. r121-C-12: an Enterprise buyer could only request 5
         * menus in the wizard and had to add the rest via the dashboard. */
        it('10 menus (the Enterprise plan cap — highest bounded plan) → accepted', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: Array.from({ length: 10 }, (_, i) => menu(`فرع ${i + 1}`, `branch-${i + 1}`)),
                });
                expect(r.success).toBe(true);
        });

        it('11 menus → rejected with the Arabic array-cap message', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: Array.from({ length: 11 }, (_, i) => menu(`فرع ${i + 1}`, `branch-${i + 1}`)),
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('الحد الأقصى 10 مطاعم في طلب الدفع الواحد');
                }
        });

        it('P13-2b (T1): the schema bound ≥ the max maxMenus across DEFAULT_PLANS (ladder drift re-flags here)', () => {
                // A future plan (or cap change) that raises maxMenus above the
                // hard .max() bound would silently re-introduce the r121-C-12
                // defect — Enterprise owners schema-rejected BELOW their plan
                // cap. This pin parses a payload at the seed ladder's own
                // ceiling, so the bound must move WITH the ladder.
                const ceiling = Math.max(...DEFAULT_PLANS.map((p) => p.maxMenus));
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: Array.from({ length: ceiling }, (_, i) =>
                                menu(`فرع ${i + 1}`, `branch-${i + 1}`)
                        ),
                });
                expect(r.success).toBe(true);
        });

        it('name over 200 chars → rejected with the name-cap message', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [menu('م'.repeat(201), 'branch-1')],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('اسم المطعم يجب ألا يتجاوز 200 حرف');
                }
        });

        it('slug over 100 chars → rejected with the slug-cap message', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [menu('فرع', 'b'.repeat(101))],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('الرابط يجب ألا يتجاوز 100 حرف');
                }
        });

        it('slug with invalid characters (underscore) → rejected (restaurant-create regex convention)', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [menu('فرع', 'bad_slug')],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط');
                }
        });

        it('slug shorter than 3 chars → still rejected (pre-existing min)', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [menu('فرع', 'ab')],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('الرابط يجب أن يكون 3 أحرف على الأقل');
                }
        });

        it('empty name → still rejected (pre-existing min)', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [menu('', 'branch-1')],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('اسم المطعم مطلوب');
                }
        });
});

// ── 2. receiptImageUrl length cap (D2-#2) ────────────────────────────────

describe('createPaymentSchema — receiptImageUrl length cap (round91-F-B)', () => {
        it('2_001-char https URL → rejected with the Arabic cap message', () => {
                const receipt = 'https://example.com/' + 'a'.repeat(2_000); // 20 + 2000 + ... > 2000
                expect(receipt.length).toBeGreaterThan(2_000);
                const r = createPaymentSchema.safeParse({ ...bankBase(), receiptImageUrl: receipt });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('رابط الإيصال طويل جداً — الحد الأقصى 2000 حرف');
                }
        });

        it('exactly 2_000-char https URL → accepted (cap inclusive)', () => {
                // 'https://' (8) + 'a' × 1992 + '.jpg' (4) = 2004 — build precisely:
                const receipt = 'https://' + 'a'.repeat(1_988) + '.jpg';
                expect(receipt.length).toBe(2_000);
                const r = createPaymentSchema.safeParse({ ...bankBase(), receiptImageUrl: receipt });
                expect(r.success).toBe(true);
        });

        it('non-https URL still rejected by the pre-existing scheme refine', () => {
                const r = createPaymentSchema.safeParse({ ...bankBase(), receiptImageUrl: 'http://example.com/r.jpg' });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('رابط الإيصال يجب أن يكون https');
                }
        });
});
