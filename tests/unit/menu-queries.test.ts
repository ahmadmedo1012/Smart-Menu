/**
 * Round89-D2 (D2-4) — unit coverage for src/lib/menu-queries.ts (the public
 * menu data source used by /menu/[slug] layout + page + generateMetadata).
 *
 * Scope note (documented): React cache() memoization (ONE query shared by
 * generateMetadata/layout/page) only works inside a React request scope —
 * outside one (bare vitest process) it degrades to a plain passthrough
 * (verified: 3 calls → 3 executions). So these tests lock the QUERY CONTRACT
 * — filter (slug + isActive), the public projection (shape), and the
 * withRetry resilience wrapper — while the request-level single-query
 * behavior is covered by the menu e2e journeys.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockWithRetry = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: { restaurant: { findUnique: mockRestaurantFindUnique } },
        withRetry: mockWithRetry,
}));

const { getRestaurantBySlug } = await import('@/lib/menu-queries');

const ROW = {
        id: 7,
        name: 'al-waha-cafe',
        description: 'قهوة ومشروبات',
        logo: 'logo.png',
        phone: '0910000000',
        whatsapp: '218900000000',
        slug: 'al-waha-cafe',
        address: 'طرابلس',
        workingHours: '9-22',
        gallery: ['g1.jpg'],
        email: 'info@al-waha.ly',
};

beforeEach(() => {
        vi.clearAllMocks();
        // passthrough: run the wrapped query fn directly (retry logic itself is
        // covered by db-withretry.test.ts)
        mockWithRetry.mockImplementation(async (fn: () => Promise<unknown>) => fn());
        mockRestaurantFindUnique.mockResolvedValue(ROW);
});

describe('getRestaurantBySlug — query contract', () => {
        it('filters by slug AND isActive:true (inactive restaurants get no page/metadata)', async () => {
                await getRestaurantBySlug('al-waha-cafe');
                expect(mockRestaurantFindUnique).toHaveBeenCalledTimes(1);
                const arg = mockRestaurantFindUnique.mock.calls[0][0];
                expect(arg.where).toEqual({ slug: 'al-waha-cafe', isActive: true });
        });

        it('selects exactly the public projection — no operational columns leak to the client', async () => {
                await getRestaurantBySlug('al-waha-cafe');
                const arg = mockRestaurantFindUnique.mock.calls[0][0];
                expect(Object.keys(arg.select).sort()).toEqual(
                        [
                                'address', 'description', 'email', 'gallery', 'id', 'logo',
                                'name', 'phone', 'slug', 'whatsapp', 'workingHours',
                        ].sort(),
                );
                // internal/plan columns must never reach the public menu payload
                for (const forbidden of ['planId', 'maxOrders', 'maxItems', 'themeColor', 'currency', 'showOnLanding', 'featuredRank', 'planStart', 'planEnd']) {
                        expect(arg.select).not.toHaveProperty(forbidden);
                }
        });

        it('returns the row through the withRetry wrapper (transient pool errors retried upstream)', async () => {
                const row = await getRestaurantBySlug('al-waha-cafe');
                expect(row).toEqual(ROW);
                expect(mockWithRetry).toHaveBeenCalledTimes(1);
                expect(mockWithRetry.mock.calls[0][0]).toBeInstanceOf(Function);
        });

        it('unknown/inactive slug → null passthrough (page 404s)', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);
                expect(await getRestaurantBySlug('ghost')).toBeNull();
        });

        it('outside a React request scope cache() does not memoize — every call queries (documented degradation)', async () => {
                await getRestaurantBySlug('al-waha-cafe');
                await getRestaurantBySlug('al-waha-cafe');
                await getRestaurantBySlug('other-cafe');
                // 3 invocations → 3 executions in bare Node; the single-query-per-
                // request behavior lives in the Next.js render scope (e2e covered)
                expect(mockRestaurantFindUnique).toHaveBeenCalledTimes(3);
                expect(mockRestaurantFindUnique.mock.calls[2][0].where.slug).toBe('other-cafe');
        });
});
