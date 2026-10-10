/**
 * round90-F4 (advisory S2 guard) — the public menu's showcase query.
 *
 * The old triple fallback chain (showcaseTags → round79 base columns → [])
 * guarded a migration window that closed (migration 18 dropped the legacy
 * column, 19 is live). The page now issues ONE guarded query and degrades to
 * [] on transient DB errors. This test pins BOTH properties:
 *   - success → flags flow through to serializedItems (Set membership — not
 *     the old O(F×I) items.some scan)
 *   - failure → exactly ONE $queryRaw call (no second base-column query —
 *     the removed chain) and the page still renders without a showcase.
 *
 * Node/vitest has no DOM: components are mocked and the returned React
 * element tree is inspected as plain data (same technique as
 * premium-toast.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockCategoryFindMany = vi.hoisted(() => vi.fn());
const mockItemFindMany = vi.hoisted(() => vi.fn());
const mockGroupBy = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        $queryRaw: mockQueryRaw,
        menuCategory: { findMany: mockCategoryFindMany },
        menuItem: { findMany: mockItemFindMany },
        orderItem: { groupBy: mockGroupBy },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/menu-queries', () => ({
        getRestaurantBySlug: async () => ({
                id: 7,
                name: 'مقهى الواحة',
                description: 'قهوة وليبي',
                logo: null,
                phone: '0911111111',
                whatsapp: '0911111111',
                slug: 'waha',
                address: 'طرابلس',
                // r138: city + hours ينتميان للإسقاط العام الحقيقي (العلاقة دائمًا
                // مصفوفة من Prisma) — التجهيعة كانت تُغفلهما فانفجر تصدير JSON-LD
                // الجديد (openingHoursSpecification/PostalAddress) على undefined.
                city: 'طرابلس',
                hours: [],
                workingHours: '9-9',
                gallery: [],
                email: null,
        }),
}));

vi.mock('@/components/menu/MenuHero', () => ({ MenuHero: () => null }));
vi.mock('@/components/menu/MenuClientSection', () => ({ MenuClientSection: () => null }));
vi.mock('@/components/menu/ReferralHandler', () => ({ ReferralHandler: () => null }));

// ── Imports (after vi.mock is hoisted) ──────────────────────────────────

import PublicMenuPage from '@/app/(public)/menu/[slug]/page';

// ── Fixtures ────────────────────────────────────────────────────────────

function item(id: number, categoryId: number) {
        return {
                id,
                name: `Waha ${id}`,
                nameAr: `صنف ${id}`,
                description: 'وصف',
                descriptionAr: 'وصف',
                image: null,
                sortOrder: id,
                categoryId,
                createdAt: new Date('2026-08-01T10:00:00Z'),
                /* r135-SOLD-OUT: الاستعلام الجديد يحدد status (كل الحالات تعبر
                   السلك الآن — «تعطيل لا إخفاء»)؛ الـfixture يعكس شكل الاستعلام. */
                status: 'available' as const,
                dietaryTags: [],
                allergens: [],
                price: 12.5, // Number() is applied by the serializer
                discountedPrice: null,
                avgRating: null,
                ratingCount: 0,
                modifierGroups: [],
        };
}

beforeEach(() => {
        vi.clearAllMocks();
        mockCategoryFindMany.mockResolvedValue([
                { id: 1, name: 'مشروبات', sortOrder: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
                { id: 2, name: 'وجبات', sortOrder: 2, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        ]);
        mockItemFindMany.mockResolvedValue([item(2, 1), item(3, 1), item(4, 2)]);
        mockGroupBy.mockResolvedValue([]);
});

// ── Element-tree inspection (no renderer) ───────────────────────────────

interface ReactElement {
        type: unknown;
        props: Record<string, unknown>;
}

function isElement(node: unknown): node is ReactElement {
        return (
                !!node &&
                typeof node === 'object' &&
                'type' in (node as Record<string, unknown>) &&
                'props' in (node as Record<string, unknown>)
        );
}

function findElementsByProp(node: unknown, prop: string, out: ReactElement[] = []): ReactElement[] {
        if (Array.isArray(node)) {
                node.forEach((n) => findElementsByProp(n, prop, out));
        } else if (isElement(node)) {
                if (node.props && prop in node.props) out.push(node);
                findElementsByProp(node.props.children, prop, out);
        }
        return out;
}

async function renderPage() {
        return PublicMenuPage({ params: Promise.resolve({ slug: 'waha' }) });
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('public menu — showcase query (round90-F4)', () => {
        it('success: ONE raw query carries the restaurant scope, flags flow to serializedItems', async () => {
                mockQueryRaw.mockResolvedValue([
                        { id: 2, isFeatured: true, featuredRank: 1, showcaseTags: ['new'] },
                        { id: 999, isFeatured: true, featuredRank: 2, showcaseTags: null }, // not in items — must be ignored
                ]);

                const tree = await renderPage();

                // single guarded query (the removed chain would have issued a
                // second base-columns query on failure only — see next test)
                expect(mockQueryRaw).toHaveBeenCalledTimes(1);
                // tagged-template arg[1] is the interpolated restaurantId
                expect(mockQueryRaw.mock.calls[0][1]).toBe(7);

                const client = findElementsByProp(tree, 'serializedItems')[0];
                expect(client).toBeDefined();
                const items = client.props.serializedItems as Array<Record<string, unknown>>;
                const byId = new Map(items.map((i) => [i.id as number, i]));
                expect(byId.get(2)).toMatchObject({ isFeatured: true, featuredRank: 1, showcaseTags: ['new'] });
                expect(byId.get(3)).toMatchObject({ isFeatured: false, showcaseTags: null });
                // row for a non-existent item id is dropped by the Set membership
                expect(items).toHaveLength(3);
        });

        it('transient DB failure: exactly ONE query (no fallback re-query), page renders without a showcase', async () => {
                mockQueryRaw.mockRejectedValue(new Error('P2022-ish transient failure'));

                const tree = await renderPage();

                // THE guard: the old chain re-queried the round79 base columns
                // on failure; now the failure is terminal for the showcase.
                expect(mockQueryRaw).toHaveBeenCalledTimes(1);

                const client = findElementsByProp(tree, 'serializedItems')[0];
                expect(client).toBeDefined();
                const items = client.props.serializedItems as Array<Record<string, unknown>>;
                // graceful degradation — menu fully rendered, no showcase flags
                expect(items).toHaveLength(3);
                for (const i of items) {
                        expect(i.isFeatured).toBe(false);
                        expect(i.showcaseTags).toBeNull();
                }
        });

        it('empty showcase result renders the menu with no featured flags', async () => {
                mockQueryRaw.mockResolvedValue([]);

                const tree = await renderPage();
                const client = findElementsByProp(tree, 'serializedItems')[0];
                const items = client.props.serializedItems as Array<Record<string, unknown>>;
                expect(items.every((i) => i.isFeatured === false)).toBe(true);
        });
});

describe('r135 — sold-out items cross the wire (disable, don\'t hide)', () => {
        it('an unavailable item ships with isAvailable:false and loses every engagement badge', async () => {
                // الصنف 2 «نفد» لكنه مميز في الـDB — الحلقة الجديدة تُبقيه مرئيًا
                // (isAvailable:false للشبكة الرمادية) وتسحب عنه كل شارات التفاعل
                // (مميز/شعبي/جديد) لأنها تعِد الزبون بما لا يمكن طلبه.
                const soldOut = { ...item(2, 1), status: 'unavailable' as const };
                mockItemFindMany.mockResolvedValue([soldOut, item(3, 1)]);
                mockQueryRaw.mockResolvedValue([
                        { id: 2, isFeatured: true, featuredRank: 1, showcaseTags: ['new'] },
                ]);

                const tree = await renderPage();
                const client = findElementsByProp(tree, 'serializedItems')[0];
                const items = client.props.serializedItems as Array<Record<string, unknown>>;
                const byId = new Map(items.map((i) => [i.id as number, i]));

                // العنصر المنتهي موجود في الحمولة (لا يختفي) لكنه معطّل
                expect(items).toHaveLength(2);
                expect(byId.get(2)).toMatchObject({
                        isAvailable: false,
                        isFeatured: false,
                        featuredRank: null,
                        showcaseTags: null,
                });
                expect(byId.get(3)).toMatchObject({ isAvailable: true, isFeatured: false });

                // JSON-LD: الآلة لا تُعرض صنفًا منتهيًا — البشر يرونه رماديًا،
                // محركات الفهم لا تحصل عليه كعرض قابل للطلب.
                const scripts = findElementsByProp(tree, 'dangerouslySetInnerHTML');
                const jsonLd = scripts
                        .map((s) => String((s.props.dangerouslySetInnerHTML as { __html: string }).__html))
                        .find((h) => h.includes('"Restaurant"'));
                expect(jsonLd).toBeDefined();
                expect(jsonLd).toContain('صنف 3');
                expect(jsonLd).not.toContain('صنف 2');
        });

        it('modifier groups keep unavailable options in the payload but drop fully-dead groups', async () => {
                // مجموعة أولى: خيار متاح + خيار موقوف → تعبر السلك كاملة بعلَمي
                // الإتاحة (النافذة تعرض الموقوف معطلاً «غير متوفر»). مجموعة ثانية:
                // كل خياراتها موقوفة → تُسقط من الحمولة كي لا تعطّل تحقق المجموعات
                // الإلزامية على مجموعة يستحيل إشباعها.
                const withGroups = {
                        ...item(5, 2),
                        modifierGroups: [
                                {
                                        id: 101,
                                        name: 'Size',
                                        nameAr: 'الحجم',
                                        minSelect: 1,
                                        maxSelect: 1,
                                        required: true,
                                        options: [
                                                { id: 901, name: 'Regular', nameAr: 'عادي', priceDelta: 0, isAvailable: true },
                                                { id: 902, name: 'Large', nameAr: 'كبير', priceDelta: 2.5, isAvailable: false },
                                        ],
                                },
                                {
                                        id: 102,
                                        name: 'Extras',
                                        nameAr: 'إضافات',
                                        minSelect: 1,
                                        maxSelect: 2,
                                        required: true,
                                        options: [
                                                { id: 903, name: 'Cheese', nameAr: 'جبنة', priceDelta: 1, isAvailable: false },
                                        ],
                                },
                                        ],
                };
                mockItemFindMany.mockResolvedValue([withGroups]);

                const tree = await renderPage();
                const client = findElementsByProp(tree, 'serializedItems')[0];
                const items = client.props.serializedItems as Array<Record<string, unknown>>;
                const first = items[0] as { modifierGroups: Array<Record<string, unknown>> };

                expect(first.modifierGroups).toHaveLength(1); // المجموعة الميتة سقطت
                const group = first.modifierGroups[0] as {
                        options: Array<{ id: number; isAvailable: boolean; priceDelta: number }>;
                };
                expect(group.options).toHaveLength(2); // الموقوف بقي مرئيًا
                expect(group.options.find((o) => o.id === 902)).toMatchObject({ isAvailable: false, priceDelta: 2.5 });
                expect(group.options.find((o) => o.id === 901)).toMatchObject({ isAvailable: true });
        });
});
