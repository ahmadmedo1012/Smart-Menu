/**
 * P45-W1 (البند 4 — مبادرة D) — مفتاح إرسال سلة الويب (idempotencyKey)
 * ينتقل من useRef في الصفحة إلى متجر السلة نفسه.
 *
 * الخلفية الصادقة: الحماية وُجدت أصلًا (r106-N1 — سكّة مرجعية في الصفحة
 * + صدى المال-فقط عند الإعادة r138)؛ البند يطبّق عقد الخارطة حرفيًا:
 * «UUID لجلسة السلة عند الإرسال» — المفتاح يعيش مع السلة (يُخزّن معها)
 * فيظل ثابتًا عبر إعادات المحاولة حتى بعد تحديث/تنقل، ويمسح بعد نجاح
 * مؤكد، وتمسحه طفرات محتوى السلة («نفس السلة» هي نطاق الثبات).
 *
 * ما يُختبر (استيراد حقيقي للمتجر — zustand يعمل بلا DOM هنا):
 *   1. دورة حياة المفتاح: سكّ W+UUID، ثبات عبر النداءات المتكررة، مسح،
 *      سكّ جديد مختلف.
 *   2. طفرات المحتوى تمسحه (إضافة/حذف/كمية/استرجاع/تفريغ) — وبيانات
 *      العميل (الاسم/الهاتف/الملاحظات/نوع الاستلام) لا تمسحه.
 *   3. partialize يحمله (التخزين مع السلة هو جوهر النقل من useRef).
 *   4. عقود مصدر: الصفحة تسكّ من المتجر وترسل الحقل وتمسح عند النجاح،
 *      والمرجع القديم زال.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCart } from '@/store/cart';
import type { AddItemInput } from '@/store/cart';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const item = (over: Partial<AddItemInput> = {}): AddItemInput => ({
        itemId: 11,
        name: 'كابتشينو',
        price: 12,
        restaurantId: 7,
        restaurantName: 'الواحة',
        restaurantWhatsapp: '0912',
        ...over,
});

const state = () => useCart.getState();

beforeEach(() => {
        // متجر singleton — دورة نظيفة لكل اختبار (clearCart يعيد كل شيء
        // بما فيه checkoutKey، ثم يتبنى أول addItem المطعم).
        state().clearCart();
});

// ── 1. دورة حياة المفتاح ────────────────────────────────────────────────

describe('P45-W1 — mintCheckoutKey / clearCheckoutKey', () => {
        it('يسكّ W + UUID (بادئة الويب — الموبايل يرسل M… عقد r106-N1)', () => {
                const key = state().mintCheckoutKey();
                expect(key).toMatch(/^W[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                expect(key.length).toBeLessThanOrEqual(40); // شريحة orderNo الخادمية
        });

        it('ثابت عبر النداءات المتكررة — إعادة المحاولة ترسل نفس المفتاح', () => {
                const first = state().mintCheckoutKey();
                expect(state().mintCheckoutKey()).toBe(first);
                expect(state().mintCheckoutKey()).toBe(first);
                expect(state().checkoutKey).toBe(first);
        });

        it('clearCheckoutKey → السكّ التالي مفتاح مختلف', () => {
                const first = state().mintCheckoutKey();
                state().clearCheckoutKey();
                const second = state().mintCheckoutKey();
                expect(second).not.toBe(first);
        });
});

// ── 2. طفرات المحتوى تمسحه؛ بيانات العميل لا تمسحه ─────────────────────

describe('P45-W1 — محتوى السلة يتغير → المفتاح يُمسح («نفس السلة» شرط الثبات)', () => {
        it('إضافة سطر جديد تمسح المفتاح', () => {
                state().addItem(item());
                state().mintCheckoutKey();
                state().addItem(item({ itemId: 12 }));
                expect(state().checkoutKey).toBe('');
        });

        it('زيادة كمية سطر قائم تمسح المفتاح', () => {
                state().addItem(item());
                state().mintCheckoutKey();
                const line = state().items[0];
                state().updateQuantity(line.id, 3);
                expect(state().checkoutKey).toBe('');
        });

        it('حذف سطر يمسح المفتاح (b → 0 كذلك)', () => {
                state().addItem(item());
                state().mintCheckoutKey();
                const line = state().items[0];
                state().removeItem(line.id);
                expect(state().checkoutKey).toBe('');
        });

        it('الاسترجاع (undoRemove) يمسح المفتاح', () => {
                state().addItem(item());
                state().mintCheckoutKey();
                const line = state().items[0];
                state().removeItem(line.id);
                state().mintCheckoutKey();
                state().undoRemove();
                expect(state().checkoutKey).toBe('');
        });

        it('تفريغ السلة يمسح المفتاح (النجاح المؤكد يمر بـ clearCart)', () => {
                state().addItem(item());
                state().mintCheckoutKey();
                state().clearCart();
                expect(state().checkoutKey).toBe('');
        });

        it('بيانات العميل لا تمسحه — إصلاح هجاء بعد فشل غامض يحتفظ بالحماية', () => {
                state().addItem(item());
                const key = state().mintCheckoutKey();
                state().setCustomerName('أحمد');
                state().setCustomerPhone('0912');
                state().setOrderNotes('بدون سكر');
                state().setPickupType('takeaway');
                state().updateNotes(state().items[0].id, 'سادة');
                expect(state().checkoutKey).toBe(key);
        });
});

// ── 3. التخزين مع السلة (جوهر النقل من useRef) ──────────────────────────

describe('P45-W1 — المفتاح يُخزّن مع السلة', () => {
        it('partialize يحمل checkoutKey (يُقرأ بعد تحديث/تنقل مع السلة نفسها)', () => {
                const partialize = useCart.persist.getOptions().partialize;
                expect(partialize).toBeTruthy();
                state().addItem(item());
                const key = state().mintCheckoutKey();
                const persisted = partialize!(useCart.getState()) as Record<string, unknown>;
                expect(persisted.checkoutKey).toBe(key);
        });

        it('الإصدار v2 مع تطبيع سلال v1 القديمة (لا مفتاح → الفارغ الافتراضي)', () => {
                expect(useCart.persist.getOptions().version).toBe(2);
                const storeSrc = src('src/store/cart.ts');
                expect(storeSrc).toContain("typeof old.checkoutKey === 'string' ? old.checkoutKey : ''");
        });
});

// ── 4. عقود مصدر — أسلاك الصفحة ────────────────────────────────────────

describe('P45-W1 — عقود مصدر: صفحة السلة', () => {
        const page = src('src/app/(protected)/cart/page.tsx');

        it('السكّ من المتجر وإرسال الحقل في جسم POST /api/orders', () => {
                expect(page).toContain('const idempotencyKey = mintCheckoutKey()');
                expect(page).toContain('idempotencyKey,');
                expect(page).toContain("await csrfFetch('/api/orders'");
        });

        it('المسح بعد النجاح المؤكد عبر المتجر (لا مرجع صفحة قديم)', () => {
                expect(page).toContain('clearCheckoutKey();');
                expect(page).not.toContain('checkoutKeyRef');
        });

        it('صدى الإعادة الخاملة (already:true) يبني الإيصال من مال الصف المسجل — عقد r138 محفوظ', () => {
                expect(page).toContain('serverEcho?.items ?? []');
                expect(page).toContain('buildReceiptMessage');
        });
});

describe('P45-W1 — عقود مصدر: العقد الخادمي جاهز أصلًا (لا تغيير مسارات)', () => {
        it('orders POST يقبل idempotencyKey ويعيد التأكيد الخامل بمال الصف فقط', () => {
                const route = src('src/app/api/orders/route.ts');
                expect(route).toContain('idempotencyKey: z.string().max(100).optional()');
                expect(route).toContain('REPLAY_MONEY_SELECT');
                expect(route).toContain('already: true');
        });
});
