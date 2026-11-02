/**
 * P42-7b (تدقيق SEO، البند 2 — نظافة JSON-LD): القيم الفارغة لا تعبر إلى الآلة.
 *
 * لماذا هذا الملف: عقد r138 ثبّت «شكل» كيان Restaurant (ساعات/عنوان/تقييمات)
 * لكن ثلاث حالات فارغة كانت تنزلق من تحته وتشحن قيمًا ميتة تعلّمها مدقّق
 * Google (Rich Results Test) كأخطاء «حقل فارغ»، وتخالف القانون الثابت نفسه
 * («لا مصفوفة فارغة أبدًا» — المثبّت على openingHoursSpecification):
 *   1) description الفارغة: عمود القاعدة افتراضه "" — كل مطعم لم يكتب وصفًا
 *      كان يُصدّر "description": "" (السطر المرئي في MenuHero يُحذف بنفس
 *      الشرط؛ الآلة الآن تطابقه).
 *   2) القسم الفارغ: أرشفة كل أصناف فئة (W3) أو وقوفها (sold-out) كانت تُبقي
 *      القسم بمصفوفة "hasMenuItem": [] — الأرشيف يستبعد الصنف من العرض، فلا
 *      يصح أن يترك خلفه قسمًا هيكليًا فارغًا في قائمة الآلة (تفاعل W6/W3
 *      مع بوابة الأرشيف نفسها التي تغذي العرض المرئي).
 *   3) المنيو الفارغ كليًا: "hasMenuSection": [] — كيان القائمة كلّه يُحذف
 *      الآن (كيان المطعم يبقى؛ الصفحة تعرض الحالة الصادقة «قائمتنا قيد
 *      التحضير» ولا يُختلق منيو للآلة فوقها).
 *
 * تقنية الفحص نفسها المستخدمة في r138-jsonld-contract.test.ts: بلا DOM —
 * الاستعلامات مُسخرَة والصفحة تُستدعى مباشرة ويُفحص شجرة العناصر كبيانات
 * مجردة، ثم يُفكّ كيان Restaurant من الـJSON-LD.
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

/** مطعم قابل للتخصيص لكل حالة اختبار — الافتراضي: وصف فارغ (حالة العمود). */
const mockRestaurant = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/menu-queries', () => ({
        getRestaurantBySlug: async () => mockRestaurant.current,
}));

vi.mock('@/components/menu/MenuHero', () => ({ MenuHero: () => null }));
vi.mock('@/components/menu/MenuClientSection', () => ({ MenuClientSection: () => null }));
vi.mock('@/components/menu/ReferralHandler', () => ({ ReferralHandler: () => null }));

// ── Imports (after vi.mock is hoisted) ──────────────────────────────────

import PublicMenuPage from '@/app/(public)/menu/[slug]/page';
// r126 (M7): نفس مصدر الحقيقة الذي يركب url — لا تثبيت نطاق مكتوب يدويًا
// يصطدم بمتغيرات البيئة في العدّائات المختلفة (نمط r92-sitemap-filter).
import { SITE_ORIGIN } from '@/lib/seo';

// ── Helpers (عائلة r138-jsonld-contract) ────────────────────────────────

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

async function renderRestaurantJsonLd(): Promise<Record<string, unknown>> {
        const tree = await PublicMenuPage({ params: Promise.resolve({ slug: 'waha' }) });
        const scripts = findElementsByProp(tree, 'dangerouslySetInnerHTML');
        const html = scripts
                .map((s) => String((s.props.dangerouslySetInnerHTML as { __html: string }).__html))
                .find((h) => h.includes('"Restaurant"'));
        expect(html).toBeDefined();
        return JSON.parse(html as string) as Record<string, unknown>;
}

function item(id: number, overrides: Record<string, unknown> = {}) {
        return {
                id,
                name: `Waha ${id}`,
                nameAr: `صنف ${id}`,
                description: 'وصف',
                descriptionAr: 'وصف',
                image: null,
                sortOrder: id,
                categoryId: 1,
                createdAt: new Date('2026-08-01T10:00:00Z'),
                status: 'available' as const,
                dietaryTags: [],
                allergens: [],
                price: 12.5,
                discountedPrice: null,
                avgRating: null,
                ratingCount: 0,
                modifierGroups: [],
                ...overrides,
        };
}

const category = (id: number, nameAr: string) => ({
        id,
        name: `Cat ${id}`,
        nameAr,
        icon: '',
        sortOrder: id,
        isActive: true,
        restaurantId: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
});

function baseRestaurant(overrides: Record<string, unknown> = {}) {
        return {
                id: 7,
                name: 'مقهى الواحة',
                // الحالة الجوهرية لهذا الملف: افتراض العمود — وصف فارغ لم يكتبه المالك.
                description: '',
                logo: null,
                phone: '0911111111',
                whatsapp: '0911111111',
                slug: 'waha',
                address: 'طرابلس - وسط المدينة',
                city: 'طرابلس',
                hours: [],
                workingHours: '9-9',
                gallery: [],
                email: null,
                ...overrides,
        };
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRestaurant.current = baseRestaurant();
        mockQueryRaw.mockResolvedValue([]);
        mockGroupBy.mockResolvedValue([]);
});

// ── 1) الوصف الفارغ لا يُصدَّر ──────────────────────────────────────────

describe('P42-7b — Restaurant.description: الفراغ يُحذف لا يُشحن', () => {
        it('مطعم بلا وصف (افتراض العمود "") لا يحمل description في JSON-LD إطلاقًا', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة')]);
                mockItemFindMany.mockResolvedValue([item(1)]);

                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd).not.toHaveProperty('description');
        });

        it('وصف مسافات فقط يُعامل كالفراغ (لا "description": "   ")', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة')]);
                mockItemFindMany.mockResolvedValue([item(1)]);
                mockRestaurant.current = baseRestaurant({ description: '   ' });

                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd).not.toHaveProperty('description');
        });

        it('الوصف الحقيقي يعبر كما كتبه المالك (لا فرط في الاستبعاد)', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة')]);
                mockItemFindMany.mockResolvedValue([item(1)]);
                mockRestaurant.current = baseRestaurant({ description: 'قهوة وليبي' });

                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd.description).toBe('قهوة وليبي');
        });
});

// ── 2) القسم الفارغ يُحذف — لا hasMenuItem: [] أبداً ────────────────────

describe('P42-7b — MenuSection الفارغ: تفاعل الأرشفة/الوقوف مع قائمة الآلة', () => {
        it('فئة كل أصنافها مؤرشفة (غائبة عن حمولة العرض العام) لا تترك قسمًا فارغًا خلفها', async () => {
                // حمولة العرض العام (findMany حيث archivedAt: null — عقد P42-W3) تُعيد
                // أصناف القسم الحي فقط؛ القسم الآخر (مؤرشف بالكامل) يصل بلا صفوف.
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة'), category(2, 'حلويات')]);
                mockItemFindMany.mockResolvedValue([item(1, { categoryId: 1 })]);

                const jsonLd = await renderRestaurantJsonLd();
                const sections = (jsonLd.hasMenu as Record<string, unknown>).hasMenuSection as Array<
                        Record<string, unknown>
                >;

                expect(sections).toHaveLength(1);
                expect(sections[0].name).toBe('قهوة');
                for (const s of sections) {
                        expect((s.hasMenuItem as unknown[]).length).toBeGreaterThan(0);
                }
        });

        it('فئة أصنافها كلها موقوفة (sold-out) تُحذف أيضًا — نفس قانون r135 بعد حذف العرض', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة'), category(2, 'حلويات')]);
                mockItemFindMany.mockResolvedValue([
                        item(1, { categoryId: 1 }),
                        item(2, { categoryId: 2, status: 'unavailable' }),
                ]);

                const jsonLd = await renderRestaurantJsonLd();
                const sections = (jsonLd.hasMenu as Record<string, unknown>).hasMenuSection as Array<
                        Record<string, unknown>
                >;

                expect(sections).toHaveLength(1);
                expect(sections[0].name).toBe('قهوة');
        });

        it('المنيو الحي كامل الأقسام يبقى كما هو (حراسة من فرط الاستبعاد)', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة'), category(2, 'حلويات')]);
                mockItemFindMany.mockResolvedValue([
                        item(1, { categoryId: 1 }),
                        item(2, { categoryId: 2 }),
                ]);

                const jsonLd = await renderRestaurantJsonLd();
                const sections = (jsonLd.hasMenu as Record<string, unknown>).hasMenuSection as Array<
                        Record<string, unknown>
                >;

                expect(sections).toHaveLength(2);
                expect(sections.map((s) => s.name)).toEqual(['قهوة', 'حلويات']);
        });
});

// ── 3) المنيو الفارغ كليًا: كيان القائمة يُحذف بالكامل ──────────────────

describe('P42-7b — المنيو الفارغ كليًا: لا hasMenuSection: [] ولا hasMenu مختلق', () => {
        it('صفر أصناف عامة → hasMenu غائب كليًا وكيان المطعم يبقى كاملًا', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة')]);
                mockItemFindMany.mockResolvedValue([]);

                const jsonLd = await renderRestaurantJsonLd();

                // كيان القائمة كلّه يُحذف — الصفحة تعرض «قائمتنا قيد التحضير»، فلا
                // يُختلق للآلة منيو فارغ فوقها (نفس عائلة حذف sitemap للمحتوى <3).
                expect(jsonLd).not.toHaveProperty('hasMenu');
                // المطعم نفسه يبقى: الاسم/الرابط/الهاتف — العنوان الحقيقي موجود في
                // الحالة الافتراضية للثوابت (baseRestaurant) فيبقى كذلك.
                expect(jsonLd['@type']).toBe('Restaurant');
                expect(jsonLd.name).toBe('مقهى الواحة');
                expect(jsonLd.url).toBe(`${SITE_ORIGIN}/menu/waha`);
                expect(jsonLd).toHaveProperty('address');
        });

        it('كل الأصناف موقوفة (sold-out في كل قسم) → hasMenu غائب أيضًا', async () => {
                mockCategoryFindMany.mockResolvedValue([category(1, 'قهوة')]);
                mockItemFindMany.mockResolvedValue([item(1, { status: 'unavailable' })]);

                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd).not.toHaveProperty('hasMenu');
        });
});
