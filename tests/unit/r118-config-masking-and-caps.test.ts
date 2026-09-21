/**
 * r118-A8 — two zero-coverage gaps in one file:
 *
 * 1. telegram/config GET token masking (A8-P3 «most notable» zero-test route):
 *    the bot token must NEVER cross the wire — only botTokenMasked:true/false.
 *
 * 2. Public input caps at the boundary (A8-P2 batch): the highest-exposure
 *    free-text fields on the PUBLIC order path (customerName 50 / phone 30 /
 *    notes 500 / per-item notes 500) — max passes, max+1 → 422 Arabic envelope.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── telegram config mocks ───────────────────────────────────────────────

const mockConfigFindFirst = vi.hoisted(() => vi.fn());
const mockConfigUpdate = vi.hoisted(() => vi.fn());
const mockConfigUpsert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({
        prisma: {
                telegramConfig: {
                        findFirst: mockConfigFindFirst,
                        update: mockConfigUpdate,
                        upsert: mockConfigUpsert,
                },
        },
}));
vi.mock('@/lib/config', () => ({
        decryptValue: vi.fn(async (v: string) => `decrypted(${v})`),
        encryptValue: vi.fn(async (v: string) => `encrypted(${v})`),
        getDecryptedBotToken: vi.fn(async () => 'stored-token'),
}));
vi.mock('@/lib/auth', () => ({
        requirePermission: vi.fn(async () => ({ authorized: true, userId: 1, role: 'super_admin', permissions: [] })),
}));

// ── orders route mocks (cap boundary) ───────────────────────────────────

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockModifierOptionFindMany = vi.hoisted(() => vi.fn());
const mockModifierGroupFindMany = vi.hoisted(() => vi.fn());
const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

describe('r118 — telegram/config GET masking (A8-P3)', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('configured bot → payload carries NO token, botTokenMasked:true', async () => {
                mockConfigFindFirst.mockResolvedValue({
                        id: 1,
                        botToken: 'encrypted-secret-ciphertext',
                        chatId: '555',
                        events: ['user_login'],
                        isActive: true,
                });
                const { GET } = await import('@/app/api/telegram/config/route');
                const res = await GET();
                expect(res.status).toBe(200);
                const text = await res.text();
                expect(text).not.toContain('encrypted-secret-ciphertext');
                expect(text).not.toContain('decrypted(');
                const json = JSON.parse(text);
                expect(json.data.botTokenMasked).toBe(true);
                expect(json.data.botToken).toBeUndefined();
                expect(json.data.chatId).toBe('555');
        });

        it('no config at all → botTokenMasked:false, no crash', async () => {
                mockConfigFindFirst.mockResolvedValue(null);
                const { GET } = await import('@/app/api/telegram/config/route');
                const res = await GET();
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.botTokenMasked).toBe(false);
        });
});

describe('r118 — POST /api/orders public free-text caps (A8-P2 boundary batch)', () => {
        beforeEach(() => {
                vi.clearAllMocks();
                // happy-path defaults: the tests below assert the ZOD boundary, so
                // everything past validation just needs to resolve cleanly until the
                // (empty) item lookup returns the expected 400.
                mockRateCheck.mockResolvedValue({ success: true });
                mockMenuItemFindMany.mockResolvedValue([]);
                mockModifierGroupFindMany.mockResolvedValue([]);
                mockModifierOptionFindMany.mockResolvedValue([]);
                mockOrderFindUnique.mockResolvedValue(null);
                mockRestaurantFindUnique.mockResolvedValue({ id: 5, maxOrders: 500, isActive: true });
        });

        function makePostRequest(body: unknown): NextRequest {
                return new NextRequest('http://localhost/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-real-ip': '9.9.9.9' },
                        body: JSON.stringify(body),
                });
        }

        async function callPost(body: unknown) {
                // fresh module registry per call — the route builds its limiter at
                // module scope and must not collide with the config-route import above
                vi.resetModules();
                vi.doMock('@/lib/db', () => ({
                        prisma: {
                                menuItem: { findMany: mockMenuItemFindMany },
                                modifierOption: { findMany: mockModifierOptionFindMany },
                                modifierGroup: { findMany: mockModifierGroupFindMany },
                                order: { findUnique: mockOrderFindUnique },
                                restaurant: { findUnique: mockRestaurantFindUnique },
                                $transaction: mockTransaction,
                        },
                }));
                vi.doMock('@/lib/rate-limit', () => ({
                        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
                }));
                vi.doMock('@/lib/auth', () => ({
                        requireAuth: vi.fn(async () => ({ authorized: true, role: 'owner', restaurantId: 5, userId: 1, permissions: [] })),
                }));
                const { POST } = await import('@/app/api/orders/route');
                return POST(makePostRequest(body));
        }

        const BASE = { restaurantId: 5, items: [{ itemId: 1, quantity: 1 }] };

        it.each([
                ['customerName', 50, () => ({ ...BASE, customerName: 'أ'.repeat(50) }), () => ({ ...BASE, customerName: 'أ'.repeat(51) })],
                ['customerPhone', 30, () => ({ ...BASE, customerPhone: '5'.repeat(30) }), () => ({ ...BASE, customerPhone: '5'.repeat(31) })],
                ['order notes', 500, () => ({ ...BASE, notes: 'ن'.repeat(500) }), () => ({ ...BASE, notes: 'ن'.repeat(501) })],
        ])('%s: max passes schema, max+1 → 422', async (_label, _cap, makeValid, makeInvalid) => {
                mockRateCheck.mockResolvedValue({ success: true });
                // valid boundary: passes zod and reaches the item lookup
                mockMenuItemFindMany.mockResolvedValue([]);
                const okRes = await callPost(makeValid());
                // item 1 not found in the (empty) tenant lookup → 400 — which proves
                // zod ACCEPTED the boundary length (validation happens first).
                expect(okRes.status).toBe(400);

                const badRes = await callPost(makeInvalid());
                expect(badRes.status).toBe(422);
                const body = await badRes.json();
                expect(body.success).toBe(false);
                expect(typeof body.error).toBe('string');
        });

        it('per-item notes: 500 passes, 501 → 422', async () => {
                mockRateCheck.mockResolvedValue({ success: true });
                mockMenuItemFindMany.mockResolvedValue([]);
                const okRes = await callPost({ ...BASE, items: [{ itemId: 1, quantity: 1, notes: 'ت'.repeat(500) }] });
                expect(okRes.status).toBe(400); // passed zod, failed at item lookup

                const badRes = await callPost({ ...BASE, items: [{ itemId: 1, quantity: 1, notes: 'ت'.repeat(501) }] });
                expect(badRes.status).toBe(422);
        });
});
