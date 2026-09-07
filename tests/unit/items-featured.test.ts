/**
 * Round88-C2 — isFeatured editor→API persistence chain (unit guard).
 *
 * The full editor chain was verified complete in this wave: ItemDialog sends
 * isFeatured/featuredRank/showcaseTags on PUT, this route persists them, the
 * owner GET returns them (no select = all scalars), and the public menu raw
 * query consumes them (team8 e2e proves the live journey). These unit tests
 * guard the API leg of the chain — the money-free half of the featured
 * feature — with the tx-mock prisma pattern from round87 (no real DB):
 *
 *   1. flag + rank + tags persist verbatim (normalized: trim/dedupe/cap 3)
 *   2. turning the flag OFF clears the badge array (round83 §2.3 rule)
 *   3. omitted fields never overwrite stored values (partial-update rule)
 *   4. rank bounds (1..5) enforced → 422
 *   5. round88-C: the legacy single showcaseTag field is GONE — a body that
 *      still carries it is stripped by zod (unknown key) and never reaches
 *      prisma.update
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUpdate = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => ({
        menuItem: { findUnique: mockFindUnique, update: mockUpdate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
// round91-F-B (F9): items/[id] PUT now carries a 20/min session-scoped
// limiter (module scope) — stubbed like every other limited route.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 19, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/blob', () => ({
        deleteBlob: mockDeleteBlob,
        mediaUrlError: () => null,
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve({ authorized: true, role: 'owner', restaurantId: 7, userId: 1 }),
        requirePermission: () => Promise.resolve({ authorized: true, role: 'owner', userId: 1 }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const EXISTING = {
        id: 1,
        name: 'لاتيه كراميل',
        price: 12,
        image: '',
        status: 'available',
        isFeatured: false,
        featuredRank: null,
        showcaseTags: [],
        category: { restaurantId: 7 },
};

function makePut(body: unknown): NextRequest {
        return new NextRequest('http://localhost/api/items/1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
}

async function callPut(body: unknown) {
        const { PUT } = await import('@/app/api/items/[id]/route');
        return PUT(makePut(body), { params: Promise.resolve({ id: '1' }) });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockFindUnique.mockResolvedValue({ ...EXISTING });
        mockUpdate.mockResolvedValue({ ...EXISTING });
});

describe('PUT /api/items/[id] — isFeatured persistence chain', () => {
        it('persists flag + rank + normalized tags (trim, dedupe) in ONE update', async () => {
                const res = await callPut({
                        isFeatured: true,
                        featuredRank: 2,
                        // zod caps the ARRAY length at 3 — normalization trims
                        // whitespace and drops duplicates below the cap
                        showcaseTags: [' الأكثر طلبًا ', 'الأكثر طلبًا', 'بروتين'],
                });

                expect(res.status).toBe(200);
                expect(mockUpdate).toHaveBeenCalledTimes(1);
                expect(mockUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: { id: 1 },
                                data: expect.objectContaining({
                                        isFeatured: true,
                                        featuredRank: 2,
                                        showcaseTags: ['الأكثر طلبًا', 'بروتين'],
                                }),
                        })
                );
        });

        it('bare flag OFF preserves the stored badges (round88-C restore semantics — team8-proven)', async () => {
                mockFindUnique.mockResolvedValue({
                        ...EXISTING,
                        isFeatured: true,
                        featuredRank: 1,
                        showcaseTags: ['مميز البيت'],
                });

                // The dialog sends a BARE toggle (no showcase keys) — the old
                // round83 clear-on-unfeature destroyed the owner's badges here,
                // so an OFF→ON cycle lost them forever (team8 surfaced it).
                const res = await callPut({ isFeatured: false });

                expect(res.status).toBe(200);
                const data = mockUpdate.mock.calls[0][0].data as Record<string, unknown>;
                expect(data.isFeatured).toBe(false);
                expect(data.showcaseTags).toBeUndefined();
                expect(data.featuredRank).toBeUndefined();
        });

        it('explicit tags payload while un-featured still clears (explicit intent)', async () => {
                mockFindUnique.mockResolvedValue({
                        ...EXISTING,
                        isFeatured: true,
                        showcaseTags: ['مميز البيت'],
                });

                const res = await callPut({ isFeatured: false, showcaseTags: [] });

                expect(res.status).toBe(200);
                expect(mockUpdate).toHaveBeenCalledWith(
                        expect.objectContaining({
                                data: expect.objectContaining({ isFeatured: false, showcaseTags: [] }),
                        })
                );
        });

        it('omitted showcase fields never overwrite stored values (partial update)', async () => {
                mockFindUnique.mockResolvedValue({
                        ...EXISTING,
                        isFeatured: true,
                        showcaseTags: ['مميز البيت'],
                });

                // a status-only toggle — no showcase keys in the body
                const res = await callPut({ status: 'unavailable' });

                expect(res.status).toBe(200);
                const data = mockUpdate.mock.calls[0][0].data as Record<string, unknown>;
                expect(data.showcaseTags).toBeUndefined();
                expect(data.isFeatured).toBeUndefined();
        });

        it('featuredRank bounds enforced → 422 (rank 0 and rank 6)', async () => {
                const res0 = await callPut({ isFeatured: true, featuredRank: 0 });
                expect(res0.status).toBe(422);
                const res6 = await callPut({ isFeatured: true, featuredRank: 6 });
                expect(res6.status).toBe(422);
                expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('round88-C: legacy showcaseTag body key is stripped — never reaches prisma.update', async () => {
                // an old client still sending the dropped single-tag field: zod
                // strips unknown keys, the dual-write mirror is gone, and the
                // stored array is left untouched (partial-update rule).
                mockFindUnique.mockResolvedValue({
                        ...EXISTING,
                        isFeatured: true,
                        showcaseTags: ['مميز البيت'],
                });

                const res = await callPut({ name: 'لاتيه كراميل', showcaseTag: 'شارة قديمة' });

                expect(res.status).toBe(200);
                const data = mockUpdate.mock.calls[0][0].data as Record<string, unknown>;
                expect(data.showcaseTag).toBeUndefined();
                expect(data.showcaseTags).toBeUndefined();
        });
});
