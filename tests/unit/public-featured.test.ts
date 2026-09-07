/**
 * R91 F-C (D3 §4 prod data-quality finding) — test-fixture exclusion in
 * /api/public/featured: production was surfacing internal QA restaurants
 * (slugs `settings-test-ts` and `ede`) alongside the intended public demo
 * entries, because those seeded rows carry showOnLanding=true with no other
 * marker in the data. The fix is a NARROW slug exclusion list at the query
 * level — these tests pin it:
 *   - the where clause excludes exactly the D3 test-fixture slugs,
 *   - legitimate demo restaurants (al-waha-cafe family) are NEVER excluded,
 *   - mapping/sort/take behavior is unchanged by the filter.
 *
 * Pattern: sibling of cron-cleanup.test.ts — vi.hoisted prisma mock, real
 * api-helpers (envelope is part of the contract), no network, no DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockRestaurantFindMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findMany: mockRestaurantFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

const featuredRoute = await import('@/app/api/public/featured/route');

// ── fixtures ────────────────────────────────────────────────────────────

const resto = (over: Partial<Record<'id' | 'name' | 'slug' | 'orderCount', number | string>> = {}) => ({
        id: 1,
        name: 'مقهى الواحة',
        slug: 'al-waha-cafe',
        description: 'مقهى عائلي بروح ليبية',
        logo: '',
        city: 'طرابلس',
        phone: '0910000000',
        whatsapp: '0910000000',
        themeColor: 'amber',
        _count: { orders: 0 },
        ...over,
        // re-read the possibly-overridden _count.orders through orderCount
        ...(over.orderCount !== undefined ? { _count: { orders: over.orderCount } } : {}),
});

beforeEach(() => {
        vi.clearAllMocks();
});

// ── the exclusion contract (the fix itself) ─────────────────────────────

describe('GET /api/public/featured — test-fixture exclusion (R91 F-C / D3)', () => {
        it('query filters out exactly the D3 test-fixture slugs at the DB level', async () => {
                mockRestaurantFindMany.mockResolvedValue([]);

                await featuredRoute.GET();

                expect(mockRestaurantFindMany).toHaveBeenCalledTimes(1);
                const arg = mockRestaurantFindMany.mock.calls[0][0];
                expect(arg.where.isActive).toBe(true);
                expect(arg.where.showOnLanding).toBe(true);
                // the narrow exclusion list — the D3 evidence slugs, verbatim
                expect(arg.where.slug).toEqual({ notIn: ['settings-test-ts', 'ede'] });
        });

        it('the exclusion stays narrow: intended public demo slugs are NOT in the list', async () => {
                mockRestaurantFindMany.mockResolvedValue([]);

                await featuredRoute.GET();

                const notIn = mockRestaurantFindMany.mock.calls[0][0].where.slug.notIn as string[];
                // al-waha-cafe IS the intended public demo (D3: the 4 prod
                // featured entries include al-waha-cafeewewe/demo — legitimate)
                expect(notIn).not.toContain('al-waha-cafe');
                expect(notIn).not.toContain('al-waha-cafe-demo');
                expect(notIn).not.toContain('al-waha-cafeewewe');
                // no broad pattern creep: exactly 2 entries
                expect(notIn).toHaveLength(2);
        });

        it('DB already excludes them: rows for excluded slugs would need the filter to vanish', async () => {
                // defensive read of the mapping contract: even if a caller
                // mocked findMany ignoring `where`, the route must not
                // double-filter legitimate rows out of the response.
                mockRestaurantFindMany.mockResolvedValue([resto({ id: 7, slug: 'al-waha-cafeewewe', orderCount: 3 })]);

                const res = await featuredRoute.GET();
                const json = await res.json();

                expect(json.success).toBe(true);
                expect(json.data).toHaveLength(1);
                expect(json.data[0].slug).toBe('al-waha-cafeewewe');
        });
});

// ── unchanged behavior around the filter ────────────────────────────────

describe('GET /api/public/featured — mapping/sort contract unchanged', () => {
        it('maps _count.orders → orderCount, sorts desc by it, caps at 10', async () => {
                const many = Array.from({ length: 12 }, (_, i) =>
                        resto({ id: i + 1, slug: `r-${i}`, orderCount: i }),
                );
                mockRestaurantFindMany.mockResolvedValue(many);

                const res = await featuredRoute.GET();
                const json = await res.json();

                expect(json.success).toBe(true);
                expect(json.data).toHaveLength(10); // 12 → take 10
                // descending by orderCount (11, 10, … 2)
                const counts = json.data.map((r: { orderCount: number }) => r.orderCount);
                expect(counts).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
                expect(json.data[0]).toMatchObject({ id: 12, slug: 'r-11', orderCount: 11 });
                // passthrough fields the landing page renders
                expect(json.data[0]).toMatchObject({ name: 'مقهى الواحة', city: 'طرابلس', themeColor: 'amber' });
                // no _count leak into the public payload
                expect(json.data[0]).not.toHaveProperty('_count');
        });

        it('prisma failure → handled error envelope (500), not a crash', async () => {
                mockRestaurantFindMany.mockRejectedValue(new Error('connection refused'));

                const res = await featuredRoute.GET();
                expect(res.status).toBeGreaterThanOrEqual(500);
                const json = await res.json();
                expect(json.success).toBe(false);
        });
});
