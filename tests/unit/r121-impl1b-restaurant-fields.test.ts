/**
 * r121-IMPL-1b (C-4/H-4, X2 §3) — the shared restaurantFieldSchema closes the
 * settings `restaurant_*` mirror bypass.
 *
 * PUT /api/settings accepted any {key ≤100, value ≤20_000} pair and mapped
 * restaurant_name/description/phone/whatsapp/email/address/workingHours/
 * themeColor/pickupTypes straight onto prisma.restaurant.update — while the
 * canonical restaurants/[id] PUT schema capped the same columns (name ≤200,
 * description ≤1000, phone/whatsapp ≤30, email ≤254+format, address ≤300,
 * workingHours ≤500). Most of those fields ship in the PUBLIC menu payload.
 *
 * What these tests pin:
 *   - direct boundary pins on the schema itself (validation.test.ts style) so
 *     future edits cannot silently widen/narrow a cap;
 *   - the settings mirror path: 20k name → 422 canonical Arabic cap, invalid
 *     email → 422, garbage pickupTypes → 422, oversized themeColor → 422,
 *     valid batch → 200 with the same write shape as before;
 *   - non-restaurant keys keep the plain 20k settings envelope (gallery JSON
 *     is the documented legit long value — the C-4 fix must not tighten it).
 *
 * The legacy-form caps (C-5) live in restaurants-create.test.ts — the file
 * that owns the POST route's mocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
        restaurantFieldSchema,
        RESTAURANT_FIELD_LIMITS,
} from '@/lib/validation';

// ══════════════════════════════════════════════════════════════════════════
// Part 1 — schema boundaries (pure, no mocks)
// ══════════════════════════════════════════════════════════════════════════

describe('r121-C4 — restaurantFieldSchema boundaries', () => {
        it.each([
                ['name', 200, 'اسم المطعم يجب ألا يتجاوز 200 حرف'],
                ['description', 1000, 'الوصف يجب ألا يتجاوز 1000 حرف'],
                ['phone', 30, 'رقم الهاتف يجب ألا يتجاوز 30 حرفًا'],
                ['whatsapp', 30, 'رقم الواتساب يجب ألا يتجاوز 30 حرفًا'],
                ['email', 254, 'البريد الإلكتروني يجب ألا يتجاوز 254 حرفًا'],
                ['address', 300, 'العنوان يجب ألا يتجاوز 300 حرف'],
                ['workingHours', 500, 'ساعات العمل يجب ألا تتجاوز 500 حرف'],
                ['themeColor', 30, 'لون المظهر يجب ألا يتجاوز 30 حرفًا'],
        ])('%s over cap → Arabic max message', (field, cap, message) => {
                const r = restaurantFieldSchema.shape[field as keyof typeof restaurantFieldSchema.shape].safeParse(
                        'x'.repeat((cap as number) + 1)
                );
                expect(r.success).toBe(false);
                if (!r.success) expect(r.error.issues[0]?.message).toBe(message);
        });

        it.each([
                ['name', 200],
                ['description', 1000],
                ['phone', 30],
                ['whatsapp', 30],
                ['address', 300],
                ['workingHours', 500],
                ['themeColor', 30],
        ])('%s exactly at cap passes', (field, cap) => {
                const r = restaurantFieldSchema.shape[field as keyof typeof restaurantFieldSchema.shape].safeParse(
                        'x'.repeat(cap as number)
                );
                expect(r.success).toBe(true);
        });

        it('email exactly at cap (254) passes with a valid format', () => {
                // 64-char local part (RFC max) + @ + 185-char domain + .com = 254
                const atCap = `${'a'.repeat(64)}@${'b'.repeat(185)}.com`;
                expect(atCap).toHaveLength(254);
                expect(restaurantFieldSchema.shape.email.safeParse(atCap).success).toBe(true);
        });

        it('empty name rejected (min 1 — matches restaurants/[id] PUT name contract)', () => {
                expect(restaurantFieldSchema.shape.name.safeParse('').success).toBe(false);
        });

        it('email format enforced', () => {
                const r = restaurantFieldSchema.shape.email.safeParse('not-an-email');
                expect(r.success).toBe(false);
                if (!r.success) expect(r.error.issues[0]?.message).toBe('البريد الإلكتروني غير صالح');
        });

        it('pickupTypes accepts the comma-joined PickupType set only', () => {
                expect(restaurantFieldSchema.shape.pickupTypes.safeParse('inside,takeaway,delivery').success).toBe(true);
                expect(restaurantFieldSchema.shape.pickupTypes.safeParse('inside').success).toBe(true);
                expect(restaurantFieldSchema.shape.pickupTypes.safeParse('telepathy').success).toBe(false);
                expect(restaurantFieldSchema.shape.pickupTypes.safeParse('').success).toBe(false);
        });

        it('RESTAURANT_FIELD_LIMITS is the single source the H-4 client maxLengths read', () => {
                expect(RESTAURANT_FIELD_LIMITS).toEqual({
                        name: 200,
                        description: 1000,
                        phone: 30,
                        whatsapp: 30,
                        email: 254,
                        address: 300,
                        workingHours: 500,
                        themeColor: 30,
                });
        });
});

// ══════════════════════════════════════════════════════════════════════════
// Part 2 — PUT /api/settings restaurant_* mirror caps (C-4)
// ══════════════════════════════════════════════════════════════════════════

const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantUpdate = vi.hoisted(() => vi.fn());
const mockSettingUpsert = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const settingsPrisma = vi.hoisted(() => ({
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique, update: mockRestaurantUpdate },
        setting: { upsert: mockSettingUpsert },
        subscriptionPayment: { findFirst: vi.fn(async () => null) },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: settingsPrisma }));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 7 as number | null,
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => authHolder.value),
        requirePermission: vi.fn(async () => ({ ...authHolder.value, authorized: true })),
}));
vi.mock('@/lib/blob', () => ({ deleteBlob: vi.fn(), mediaUrlError: () => null }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => {}) }));

function putSettings(items: unknown) {
        return import('@/app/api/settings/route').then(({ PUT }) =>
                PUT(
                        new NextRequest('http://localhost/api/settings', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(items),
                        })
                )
        );
}

describe('r121-C4 — PUT /api/settings restaurant_* mirror caps', () => {
        beforeEach(() => {
                vi.clearAllMocks();
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 7 };
                // the settings batch hands $transaction an ARRAY of upsert promises
                mockTransaction.mockImplementation((arg: unknown) =>
                        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve(arg)
                );
                mockSettingUpsert.mockResolvedValue({});
                mockUserRestaurantFindUnique.mockResolvedValue(null);
                mockRestaurantFindUnique.mockResolvedValue({ logo: null, gallery: [] });
                mockRestaurantUpdate.mockResolvedValue({});
        });

        it('20,000-char restaurant_name → 422 with the canonical Arabic cap (the C-4 bypass)', async () => {
                const res = await putSettings([{ key: 'restaurant_name', value: 'م'.repeat(20_000) }]);
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('اسم المطعم يجب ألا يتجاوز 200 حرف');
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('invalid restaurant_email → 422 format message', async () => {
                const res = await putSettings([{ key: 'restaurant_email', value: 'not-an-email' }]);
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('البريد الإلكتروني غير صالح');
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('garbage restaurant_pickupTypes → 422', async () => {
                const res = await putSettings([{ key: 'restaurant_pickupTypes', value: 'telepathy,fax' }]);
                expect(res.status).toBe(422);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('oversized restaurant_themeColor → 422 (was a 20k free-for-all)', async () => {
                const res = await putSettings([{ key: 'restaurant_themeColor', value: 'x'.repeat(31) }]);
                expect(res.status).toBe(422);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('valid batch → 200 with the canonical fields written (happy path unchanged)', async () => {
                const res = await putSettings([
                        { key: 'restaurant_name', value: 'مقهى الواحة' },
                        { key: 'restaurant_email', value: 'waha@example.com' },
                        { key: 'restaurant_pickupTypes', value: 'inside,takeaway,delivery' },
                ]);
                expect(res.status).toBe(200);
                expect(mockRestaurantUpdate).toHaveBeenCalledWith({
                        where: { id: 1 },
                        data: {
                                name: 'مقهى الواحة',
                                email: 'waha@example.com',
                                pickupTypes: 'inside,takeaway,delivery',
                        },
                });
        });

        it('non-restaurant keys keep the plain settings envelope (20k legit for gallery JSON etc.)', async () => {
                const res = await putSettings([{ key: 'custom_html', value: 'x'.repeat(19_000) }]);
                expect(res.status).toBe(200);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });
});
