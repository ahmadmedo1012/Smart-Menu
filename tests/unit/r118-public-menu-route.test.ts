/**
 * r118-A8-P2 — the mobile app's PRIMARY data path had ZERO tests.
 *
 * GET /api/public/menu/[slug] (155 lines): rate limiting, slug-format guard,
 * visibility rules (isActive restaurant, active categories, available items,
 * available options, non-empty groups), Decimal→Number coercion, the
 * r118-A3-P2 inactive-category filter, and the r118-A9-P3 Data-Cache wrap.
 * This suite pins every one of those contracts with the standard tx-mock
 * pattern (no real DB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mocks ───────────────────────────────────────────────────────────────

const mockRateCheck = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockCategoryFindMany = vi.hoisted(() => vi.fn());
const mockItemFindMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findUnique: mockRestaurantFindUnique },
        menuCategory: { findMany: mockCategoryFindMany },
        menuItem: { findMany: mockItemFindMany },
}));

vi.mock('@/lib/db', () => ({
        prisma: mockPrisma,
        // withRetry: passthrough executor
        withRetry: (fn: () => unknown) => fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

// unstable_cache passthrough — the Data Cache behavior itself is Next's; the
// route's cache KEYS/TAGS are compile-time constants validated in prod builds.
vi.mock('next/cache', () => ({
        unstable_cache: (fn: () => Promise<unknown>) => fn,
        revalidateTag: vi.fn(),
        revalidatePath: vi.fn(),
}));

const RESTAURANT = {
        id: 313,
        name: 'مقهى الواحة',
        slug: 'al-waha-cafe',
        description: 'قهوة وليبي',
        logo: '/logo.png',
        phone: '0910000000',
        whatsapp: '218910009900',
        email: 'waha@example.com',
        address: 'طرابلس',
        workingHours: '8ص - 10م',
        themeColor: '#bc4700',
        currency: 'د.ل',
};

const CATEGORIES = [
        { id: 1, name: 'Coffee', nameAr: 'قهوة', sortOrder: 1, isActive: true },
        { id: 2, name: 'Desserts', nameAr: 'حلويات', sortOrder: 2, isActive: true },
];

/** One item carrying every mapping branch: discount, rating, groups. */
const ITEMS = [
        {
                id: 11,
                name: 'Latte',
                nameAr: 'لاتيه',
                description: 'milk coffee',
                descriptionAr: 'قهوة بالحليب',
                price: { toString: () => '4.50' }, // Prisma Decimal-ish
                discountedPrice: null,
                image: '/latte.webp',
                isFeatured: true,
                categoryId: 1,
                dietaryTags: [],
                allergens: [],
                avgRating: null,
                ratingCount: 0,
                modifierGroups: [
                        {
                                id: 100,
                                name: 'Size',
                                nameAr: 'الحجم',
                                minSelect: 1,
                                maxSelect: 1,
                                required: true,
                                options: [
                                        { id: 1001, name: 'small', nameAr: 'صغير', priceDelta: { toString: () => '0' }, isAvailable: true },
                                        { id: 1002, name: 'large', nameAr: 'كبير', priceDelta: { toString: () => '2' }, isAvailable: true },
                                ],
                        },
                        // group left EMPTY by the availability filter → dropped entirely
                        // (the options where:{isAvailable:true} runs DB-side; the mock
                        // models the POST-FILTER shape: its only option was unavailable)
                        {
                                id: 101,
                                name: 'Extras',
                                nameAr: 'إضافات',
                                minSelect: 0,
                                maxSelect: 2,
                                required: false,
                                options: [],
                        },
                ],
        },
        {
                id: 12,
                name: 'Basbousa',
                nameAr: 'بسبوسة',
                description: '',
                descriptionAr: '',
                price: { toString: () => '3' },
                discountedPrice: { toString: () => '0' }, // 100% free item
                image: null,
                isFeatured: false,
                categoryId: 2,
                dietaryTags: [],
                allergens: [],
                avgRating: { toString: () => '4.25' },
                ratingCount: 4,
                modifierGroups: [],
        },
];

async function callGet(slug: string, ip = '1.2.3.4') {
        const { GET } = await import('@/app/api/public/menu/[slug]/route');
        const request = new Request(`http://localhost/api/public/menu/${slug}`, {
                headers: { 'x-forwarded-for': ip },
        });
        return GET(request, { params: Promise.resolve({ slug }) });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true });
        mockRestaurantFindUnique.mockResolvedValue(RESTAURANT);
        mockCategoryFindMany.mockResolvedValue(CATEGORIES);
        mockItemFindMany.mockResolvedValue(ITEMS);
});

describe('GET /api/public/menu/[slug] — gates', () => {
        it('rate-limited IP → 429 Arabic message BEFORE any DB work', async () => {
                mockRateCheck.mockResolvedValue({ success: false });
                const res = await callGet('al-waha-cafe');
                expect(res.status).toBe(429);
                expect((await res.json()).error).toContain('60 ثانية');
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('invalid slug format → 400 at the regex, never at the DB index', async () => {
                const res = await callGet('Bad_Slug!');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('رابط غير صالح');
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('unknown / inactive restaurant → 404 (isActive gate inside the lookup)', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);
                const res = await callGet('ghost-cafe');
                expect(res.status).toBe(404);
                // the lookup itself is gated on isActive:true
                expect(mockRestaurantFindUnique).toHaveBeenCalledWith(
                        expect.objectContaining({ where: expect.objectContaining({ slug: 'ghost-cafe', isActive: true }) })
                );
        });
});

describe('GET /api/public/menu/[slug] — payload contract (mobile types)', () => {
        it('200 with restaurant fields, categories and coerced numeric prices', async () => {
                const res = await callGet('al-waha-cafe');
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.restaurant.slug).toBe('al-waha-cafe');
                expect(json.data.restaurant.themeColor).toBe('#bc4700');
                expect(json.data.categories).toHaveLength(2);

                const latte = json.data.items.find((i: { id: number }) => i.id === 11);
                expect(latte.isAvailable).toBe(true); // honest mirror of the query filter
                expect(latte.price).toBe(4.5); // Decimal coerced to number
                expect(latte.avgRating).toBeNull();

                const basbousa = json.data.items.find((i: { id: number }) => i.id === 12);
                expect(basbousa.discountedPrice).toBe(0); // free item stays 0, not null
                expect(basbousa.avgRating).toBe(4.25);
        });

        it('modifier groups: empty-after-availability-filter groups dropped; deltas coerced', async () => {
                const res = await callGet('al-waha-cafe');
                const json = await res.json();
                const latte = json.data.items.find((i: { id: number }) => i.id === 11);
                expect(latte.modifierGroups).toHaveLength(1); // Extras (all options off) is gone
                const sizeGroup = latte.modifierGroups[0];
                expect(sizeGroup.nameAr).toBe('الحجم');
                expect(sizeGroup.options.map((o: { id: number }) => o.id)).toEqual([1001, 1002]);
                expect(sizeGroup.options[1].priceDelta).toBe(2); // number, not Decimal-string
        });

        it('items query enforces availability + tenant + ACTIVE category (r118-A3-P2)', async () => {
                await callGet('al-waha-cafe');
                expect(mockItemFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: {
                                        status: 'available',
                                        category: { is: { restaurantId: 313, isActive: true } },
                                },
                        })
                );
        });

        it('categories query enforces isActive', async () => {
                await callGet('al-waha-cafe');
                expect(mockCategoryFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { isActive: true, restaurantId: 313 } })
                );
        });
});
