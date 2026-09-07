/**
 * round91-F-B (D2-#1 + D2-#2) — payment-schema payload caps.
 *
 * Schema-level lock for the two money-path caps added to
 * src/lib/payment-schema.ts:
 *   1. tempRestaurants: array .max(5) + per-entry field caps (name ≤ 200,
 *      slug ≤ 100 + [a-z0-9-] regex) — mirrors the gated restaurant-create
 *      schema conventions. The array used to be UNBOUNDED (metadata JSONB
 *      bloat + N restaurants minted on approval).
 *   2. receiptImageUrl: .max(2_000) with the Arabic cap message — joins the
 *      R90 image-cap family (items 200k / settings 20k / logo 2k / upload 5MB).
 *
 * Route-level integration of both (400 envelopes + the telegram count line)
 * lives in subscriptions-family.test.ts; the approval-time plan-cap
 * enforcement (FOR UPDATE + 409) lives in subscription-decisions.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { createPaymentSchema } from '@/lib/payment-schema';

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
        it('5 menus (the highest bounded plan cap) → accepted', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [
                                menu('فرع 1', 'branch-1'),
                                menu('فرع 2', 'branch-2'),
                                menu('فرع 3', 'branch-3'),
                                menu('فرع 4', 'branch-4'),
                                menu('فرع 5', 'branch-5'),
                        ],
                });
                expect(r.success).toBe(true);
        });

        it('6 menus → rejected with the Arabic array-cap message', () => {
                const r = createPaymentSchema.safeParse({
                        ...base(),
                        tempRestaurants: [
                                menu('فرع 1', 'branch-1'),
                                menu('فرع 2', 'branch-2'),
                                menu('فرع 3', 'branch-3'),
                                menu('فرع 4', 'branch-4'),
                                menu('فرع 5', 'branch-5'),
                                menu('فرع 6', 'branch-6'),
                        ],
                });
                expect(r.success).toBe(false);
                if (!r.success) {
                        expect(r.error.issues[0].message).toBe('الحد الأقصى 5 مطاعم في طلب الدفع الواحد');
                }
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
