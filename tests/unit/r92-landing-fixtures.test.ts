/**
 * round92-A1 — homepage test-fixture leak (live audit A1 / r91 D3 §4).
 *
 * Production was showing QA fixture restaurants (مطعم المرسى settings-test-ts,
 * برغر هاوس ede) in the HOMEPAGE featured carousel: the r91 patch covered the
 * /api/public/featured route only, while the RSC path src/lib/landing.ts →
 * getFeaturedRestaurants() (which feeds (public)/page.tsx directly) had NO
 * exclusion. The fix moved TEST_FIXTURE_SLUGS to @/lib/landing as the single
 * source of truth; both public surfaces must filter from it. These tests pin:
 *   1. getFeaturedRestaurants() excludes exactly the fixture slugs at the
 *      Prisma where level (not post-filter — the DB never returns them),
 *   2. the list stays NARROW (intended public demo slugs al-waha-cafe /
 *      al-waha-cafe-demo are never excluded; P29-D1 adds al-waha-cafeewewe —
 *      the r96 test fixture leaked into production that the r91 era had
 *      wrongly classified as an intended demo),
 *   3. the featured route IMPORTS the shared constant (source-level guard —
 *      no private copy/duplicate of the list anywhere).
 *
 * Pattern: sibling of public-featured.test.ts — vi.hoisted prisma mock, real
 * api-helpers envelope, no network, no DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockRestaurantFindMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findMany: mockRestaurantFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

import { getFeaturedRestaurants, TEST_FIXTURE_SLUGS } from '@/lib/landing';
import { GET as featuredGET } from '@/app/api/public/featured/route';

// ── fixtures ────────────────────────────────────────────────────────────

const resto = (over: Partial<Record<'id' | 'slug' | 'orderCount', number | string>> = {}) => ({
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
        ...(over.orderCount !== undefined ? { _count: { orders: over.orderCount } } : {}),
});

beforeEach(() => {
        vi.clearAllMocks();
});

// ── the RSC homepage path (the round92 fix itself) ──────────────────────

describe('getFeaturedRestaurants — test-fixture exclusion (round92-A1)', () => {
        it('query excludes exactly the fixture slugs at the DB level', async () => {
                mockRestaurantFindMany.mockResolvedValue([]);

                await getFeaturedRestaurants();

                expect(mockRestaurantFindMany).toHaveBeenCalledTimes(1);
                const arg = mockRestaurantFindMany.mock.calls[0][0];
                expect(arg.where.isActive).toBe(true);
                expect(arg.where.showOnLanding).toBe(true);
                // the exclusion list — the live-audit A1 evidence slugs + the
                // P29-D1 reclassified r96 fixture, verbatim
                expect(arg.where.slug).toEqual({ notIn: ['settings-test-ts', 'ede', 'al-waha-cafeewewe'] });
        });

        it('filters from the shared constant (where.notIn ≡ [...TEST_FIXTURE_SLUGS])', async () => {
                mockRestaurantFindMany.mockResolvedValue([]);

                await getFeaturedRestaurants();

                const notIn = mockRestaurantFindMany.mock.calls[0][0].where.slug.notIn as string[];
                expect(notIn).toEqual([...TEST_FIXTURE_SLUGS]);
                expect(TEST_FIXTURE_SLUGS).toHaveLength(3);
        });

        it('the exclusion stays narrow: intended public demo slugs are NOT in the list', () => {
                const notIn = [...TEST_FIXTURE_SLUGS];
                // al-waha-cafe / al-waha-cafe-demo ARE the intended public demos;
                // al-waha-cafeewewe is the r96 fixture (P29-D1 reclassified)
                expect(notIn).not.toContain('al-waha-cafe');
                expect(notIn).not.toContain('al-waha-cafe-demo');
                expect(notIn).toContain('al-waha-cafeewewe');
                expect(notIn).toHaveLength(3);
        });

        it('mapping/sort/take behavior is unchanged by the filter', async () => {
                const many = Array.from({ length: 12 }, (_, i) =>
                        resto({ id: i + 1, slug: `r-${i}`, orderCount: i }),
                );
                mockRestaurantFindMany.mockResolvedValue(many);

                const data = await getFeaturedRestaurants();

                expect(data).toHaveLength(10); // 12 → slice(0, 10)
                const counts = data.map((r) => r.orderCount);
                expect(counts).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
                // _count never leaks into the RSC payload shape
                expect(data[0]).not.toHaveProperty('_count');
        });

        it('prisma failure → resilient empty array (landing never crashes the page)', async () => {
                mockRestaurantFindMany.mockRejectedValue(new Error('connection refused'));

                await expect(getFeaturedRestaurants()).resolves.toEqual([]);
        });
});

// ── single source of truth: the featured route ─────────────────────────

describe('featured route — imports the shared constant, no private copy (round92-A1)', () => {
        it('GET filters through the SAME exclusion list at runtime', async () => {
                mockRestaurantFindMany.mockResolvedValue([]);

                await featuredGET();

                const arg = mockRestaurantFindMany.mock.calls[0][0];
                expect(arg.where.slug).toEqual({ notIn: [...TEST_FIXTURE_SLUGS] });
                expect(arg.where.slug).toEqual({ notIn: ['settings-test-ts', 'ede', 'al-waha-cafeewewe'] });
        });

        it('source-level guard: the route imports TEST_FIXTURE_SLUGS and declares no local copy', () => {
                const routeSrc = readFileSync(
                        join(process.cwd(), 'src/app/api/public/featured/route.ts'),
                        'utf8',
                );
                // imports the shared constant from its single source of truth…
                expect(routeSrc).toMatch(/import\s*\{[^}]*TEST_FIXTURE_SLUGS[^}]*\}\s*from\s*['"]@\/lib\/landing['"]/);
                // …and does NOT re-declare a private duplicate of the list
                expect(routeSrc).not.toMatch(/const\s+TEST_FIXTURE_SLUGS\s*=/);
        });

        it('source-level guard: the constant lives in @/lib/landing (exported, used in its query)', () => {
                const landingSrc = readFileSync(join(process.cwd(), 'src/lib/landing.ts'), 'utf8');
                expect(landingSrc).toMatch(/export const TEST_FIXTURE_SLUGS/);
                // the RSC query actually applies the exclusion
                expect(landingSrc).toMatch(/notIn:\s*\[\.\.\.TEST_FIXTURE_SLUGS\]/);
        });
});
