/**
 * r138 (W5-C3) — delivery-fee truth source-contract pins.
 *
 * The server-side money paths are pinned by their own unit suites
 * (orders-delivery-meta / orders-create / whatsapp-generate /
 * receipt-whatsapp-format). This file pins the WIRING those suites can't
 * reach — the same source-contract pattern as r121-cart-ux / r92-cart-aria:
 *
 *   - schema + migration stay in parity (the additive-only deliveryFee
 *     column; the CI migrate-diff gate replays this file's migration too).
 *   - the customer receipt's fee line prefers the SERVER echo over the
 *     client-fetched delivery meta (W5-A3 P3-1: the meta can go stale
 *     between page load and checkout).
 *   - the replay receipt keeps the customer block when the echo is
 *     money-only (no PII by the round-77 stance) — identity falls back to
 *     the customer's own local state.
 *   - owner + admin order-detail pages render the fee row between subtotal
 *     and total, gated on the recorded value (no invented fee for legacy
 *     NULL rows).
 *   - the item-dialog price guard implements the documented free=0 ruling
 *     (empty ≠ zero) and the Decimal(10,2) ceiling.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── schema ↔ migration parity (additive-only) ────────────────────────────

describe('r138 — Order.deliveryFee schema + migration parity', () => {
        it('schema.prisma declares the nullable Decimal(10,2) column on Order', () => {
                const schema = src('prisma/schema.prisma');
                expect(schema).toContain('deliveryFee        Decimal?            @db.Decimal(10, 2)');
        });

        it('the migration is additive-only (one ADD COLUMN, no DROP/ALTER-DROP ops)', () => {
                const sql = src('prisma/migrations/zz_round138_delivery_fee_persisted/migration.sql');
                expect(sql).toContain('ALTER TABLE "Order" ADD COLUMN "deliveryFee" DECIMAL(10,2);');
                expect(sql).not.toMatch(/DROP COLUMN|DROP TABLE|ALTER COLUMN|DROP CONSTRAINT/i);
        });

        it('the CHECK mirrors the r137 delivery-fee bounds, NOT VALID (no legacy re-scan)', () => {
                const sql = src('prisma/migrations/zz_round138_delivery_fee_persisted/migration.sql');
                expect(sql).toContain(
                        'ADD CONSTRAINT "zz_round138_order_deliveryfee_check" CHECK ("deliveryFee" IS NULL OR ("deliveryFee" >= 0 AND "deliveryFee" <= 99999999.99)) NOT VALID'
                );
        });
});

// ── the customer receipt fee line prefers the server echo ────────────────

describe('r138 — cart receipt fee line prefers the server truth (W5-A3 P3-1)', () => {
        const page = src('src/app/(protected)/cart/page.tsx');

        it('the server echo type carries deliveryFee', () => {
                expect(page).toContain('deliveryFee?: number | string | null;');
        });

        it('the receipt fee line prefers serverEcho.deliveryFee over the client meta', () => {
                const preferIdx = page.indexOf('serverEcho?.deliveryFee != null');
                expect(preferIdx).toBeGreaterThan(-1);
                // the preference lives in the SERVER-itemized receipt branch,
                // before the cart fallback branch
                expect(page.indexOf('deliveryFeeAmount,\n')).toBeGreaterThan(-1); // fallback retains client meta
                expect(preferIdx).toBeGreaterThan(page.indexOf('const serverItems = serverEcho?.items ?? [];'));
        });

        it('the replay receipt completes identity from local state (echo is money-only, no PII)', () => {
                // name/phone/notes fall back to the customer's own inputs when the
                // money-only replay echo omits them — the delivery address never
                // disappears from a replayed receipt
                expect(page).toContain(
                        "customerName: serverEcho?.customerName?.trim() || customerName.trim() || undefined"
                );
                expect(page).toContain(
                        "customerPhone: serverEcho?.customerPhone?.trim() || customerPhone.trim() || undefined"
                );
                expect(page).toContain('notes: serverEcho?.notes || composedNotes || undefined');
        });
});

// ── owner + admin order detail: the fee row ──────────────────────────────

describe('r138 — order detail pages render the recorded fee row', () => {
        it.each([
                ['owner', 'src/app/(protected)/owner/orders/[id]/page.tsx'],
                ['admin', 'src/app/(protected)/admin/orders/[id]/page.tsx'],
        ])('%s detail: fee row gated on the recorded value, between subtotal and total', (_who, p) => {
                const page = src(p);
                expect(page).toContain('order.deliveryFee != null && Number(order.deliveryFee) > 0');
                // rendered-row anchors (not comments): the fee row sits between
                // the subtotal row and the total row
                expect(page.indexOf('>المجموع الفرعي<')).toBeLessThan(page.indexOf('>رسوم التوصيل<'));
                expect(page.indexOf('>رسوم التوصيل<')).toBeLessThan(page.indexOf('>الإجمالي<'));
        });

        it('the shared detail type carries deliveryFee (Decimal arrives as string|number|null)', () => {
                const spine = src('src/components/orders/useOrderDetail.ts');
                expect(spine).toContain('deliveryFee?: number | string | null;');
        });
});

// ── item-dialog price guard: the free=0 ruling (W5-A3 P3) ────────────────

describe('r138 — item dialog implements the free=0 ruling (empty ≠ zero)', () => {
        it('the save guard rejects non-finite (empty) but ACCEPTS 0, with the Decimal ceiling', () => {
                const save = src('src/components/owner/item-dialog/use-item-save.ts');
                expect(save).toContain('!Number.isFinite(form.price)');
                expect(save).not.toContain('!form.price)');
                expect(save).toContain('form.price > MAX_MENU_PRICE');
                expect(save).toContain("form.price < 0");
        });

        it('the form starts empty (NaN) — an untouched dialog can never save price 0 by accident', () => {
                const form = src('src/components/owner/item-dialog/use-item-form.ts');
                expect(form).toContain('price: Number.NaN,');
        });

        it('the input distinguishes empty (renders "") from an explicit 0', () => {
                const fields = src('src/components/owner/item-dialog/ItemCoreFields.tsx');
                expect(fields).toContain('Number.isFinite(form.price) ? form.price : \'\'');
                expect(fields).toContain('e.target.value === \'\' ? Number.NaN : Number(e.target.value)');
        });
});

// ── items routes: the expiry guard joined the family (W5-A3 P3) ──────────

describe('r138 — items POST/PUT carry the owner expiry guard', () => {
        it('both routes import + apply isOwnerSubscriptionActive before the body parse', () => {
                const post = src('src/app/api/items/route.ts');
                const put = src('src/app/api/items/[id]/route.ts');
                for (const route of [post, put]) {
                        expect(route).toContain(
                                "import { isOwnerSubscriptionActive } from '@/lib/subscription-guard'"
                        );
                        // the 403 copy matches the family byte-for-byte
                        expect(route).toContain('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                        // guard fires before the schema parse (family placement)
                        expect(route.indexOf('isOwnerSubscriptionActive(auth)')).toBeLessThan(
                                route.indexOf('.parse(await request.json())')
                        );
                }
        });
});
