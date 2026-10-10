/**
 * r138 — عقد JSON-LD لصفحة القائمة العامة (تثبيت شكل، لا مجرد وجود).
 *
 * وُلد الاختبار من فجوة رصدها تدقيق r138-c: لا اختبار كان يثبّت شكل
 * كيان Restaurant المصدَّر للآلة — المرشحات وحدها (sold-out) كانت
 * مثبتة، فانزلق حقلا r137 (ساعات الدوام) وr138 (المدينة/التقييمات)
 * بلا شبكة أمان. هذا الملف يثبّت:
 *   - openingHoursSpecification: التخريج dayOfWeek→schema.org، حذف
 *     الأيام المغلقة، النافذة العابرة لمنتصف الليل كما هي، والدوام
 *     المتواصل (opens===closes) كـ 00:00–23:59، والغياب الكامل عند
 *     فراغ الجدول (لا مصفوفة فارغة أبدًا).
 *   - PostalAddress: city عمود حقيقي يُصدَّر addressLocality، والعنوان
 *     الحر streetAddress، والحذف الكامل عند غيابهما.
 *   - aggregateRating داخل MenuItem فقط (الخط الأحمر: لا يُشتق تقييم
 *     للمطعم من تقييمات الأصناف — سياسة spam) وبعدّ ≥1 فقط.
 *   - F9: كيان SoftwareApplication في الصفحة الرئيسية وحدها لا في
 *     التخطيط العام (كان يتراكب فوق كيان المطعم في كل صفحات المنيو).
 *
 * تقنية الفحص نفسها المستخدمة في menu-showcase-fallback.test.ts:
 * بدون DOM — الاستعلامات مُسخرَة والصفحة تُستدعى مباشرة ويُفحص شجرة
 * العناصر كبيانات مجردة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/** مطعم قابل للتخصيص لكل حالة اختبار — الافتراضي: جدول دوام كامل الحالات. */
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

// ── Helpers ─────────────────────────────────────────────────────────────

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
        // التهريب المزدوج (\\u003c داخل مصدر الاختبار) يفكّه JSON.parse مرة واحدة
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

const CATEGORY = { id: 1, name: 'Coffee', nameAr: 'قهوة', icon: '', sortOrder: 1, isActive: true, restaurantId: 7, createdAt: new Date(), updatedAt: new Date() };

function baseRestaurant(overrides: Record<string, unknown> = {}) {
        return {
                id: 7,
                name: 'مقهى الواحة',
                description: 'قهوة وليبي',
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
        mockCategoryFindMany.mockResolvedValue([CATEGORY]);
        mockItemFindMany.mockResolvedValue([item(1)]);
        mockGroupBy.mockResolvedValue([]);
});

// ── r138 (F1): openingHoursSpecification ────────────────────────────────

describe('r138 — Restaurant JSON-LD openingHoursSpecification', () => {
        it('maps getDay numbers to schema.org day names, drops closed days, keeps overnight windows verbatim', async () => {
                mockRestaurant.current = baseRestaurant({
                        hours: [
                                // 0 = الأحد: نافذة عادية
                                { dayOfWeek: 0, closed: false, opensAt: '08:00', closesAt: '23:00' },
                                // 1 = الإثنين: مغلق — لا يُصدَّر
                                { dayOfWeek: 1, closed: true, opensAt: '08:00', closesAt: '23:00' },
                                // 5 = الجمعة: عابرة لمنتصف الليل — كما هي (المواصفة تسمح)
                                { dayOfWeek: 5, closed: false, opensAt: '20:00', closesAt: '02:00' },
                        ],
                });
                const jsonLd = await renderRestaurantJsonLd();
                const spec = jsonLd.openingHoursSpecification as Array<Record<string, string>>;

                expect(spec).toHaveLength(2); // اليوم المغلق محذوف
                expect(spec[0]).toEqual({
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: 'https://schema.org/Sunday',
                        opens: '08:00',
                        closes: '23:00',
                });
                expect(spec[1]).toEqual({
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: 'https://schema.org/Friday',
                        opens: '20:00',
                        closes: '02:00',
                });
        });

        it('renders the continuous-duty convention (opens === closes) as 00:00–23:59', async () => {
                mockRestaurant.current = baseRestaurant({
                        hours: [{ dayOfWeek: 3, closed: false, opensAt: '00:00', closesAt: '00:00' }],
                });
                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd.openingHoursSpecification).toEqual([
                        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Wednesday', opens: '00:00', closes: '23:59' },
                ]);
        });

        it('omits the field entirely when the owner never filled the r137 week editor (never an empty array)', async () => {
                mockRestaurant.current = baseRestaurant({ hours: [] });
                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd).not.toHaveProperty('openingHoursSpecification');
        });
});

// ── r138 (F4): PostalAddress ────────────────────────────────────────────

describe('r138 — Restaurant JSON-LD PostalAddress', () => {
        it('upgrades the free-text address with the real city column (streetAddress + addressLocality)', async () => {
                const jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd.address).toEqual({
                        '@type': 'PostalAddress',
                        streetAddress: 'طرابلس - وسط المدينة',
                        addressLocality: 'طرابلس',
                });
        });

        it('emits city-only addresses without inventing a street, and omits the field when both are empty', async () => {
                mockRestaurant.current = baseRestaurant({ address: '', city: 'بنغازي' });
                let jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'بنغازي' });

                mockRestaurant.current = baseRestaurant({ address: '', city: '' });
                jsonLd = await renderRestaurantJsonLd();
                expect(jsonLd).not.toHaveProperty('address');
        });
});

// ── r138 (F10): aggregateRating داخل MenuItem ───────────────────────────

describe('r138 — item-level aggregateRating (never restaurant-level)', () => {
        it('exports real item ratings (count ≥ 1) inside MenuItem only', async () => {
                mockItemFindMany.mockResolvedValue([
                        item(1, { avgRating: '4.67', ratingCount: 3 }),
                        item(2, { avgRating: null, ratingCount: 0 }),
                ]);
                const jsonLd = await renderRestaurantJsonLd();
                const menu = jsonLd.hasMenu as Record<string, unknown>;
                const sections = menu.hasMenuSection as Array<Record<string, unknown>>;
                const menuItems = sections[0].hasMenuItem as Array<Record<string, unknown>>;

                // الخط الأحمر: لا تقييم على مستوى كيان المطعم أبدًا (self-serving)
                expect(jsonLd).not.toHaveProperty('aggregateRating');

                expect(menuItems[0].aggregateRating).toEqual({
                        '@type': 'AggregateRating',
                        ratingValue: 4.67,
                        ratingCount: 3,
                        bestRating: 5,
                        worstRating: 1,
                });
                expect(menuItems[1]).not.toHaveProperty('aggregateRating');
        });
});

// ── r138 (F9): SoftwareApplication في الرئيسية وحدها ────────────────────

describe('r138 — SoftwareApplication JSON-LD lives on the homepage only', () => {
        const repo = join(process.cwd(), 'src', 'app');

        it('homepage carries the platform entity (with url + inLanguage)', () => {
                const home = readFileSync(join(repo, '(public)', 'page.tsx'), 'utf8');
                expect(home).toContain("'@type': 'SoftwareApplication'");
                expect(home).toContain('SITE_ORIGIN');
                expect(home).toContain("inLanguage: 'ar'");
        });

        it('the shared (public) layout no longer emits it above every restaurant entity', () => {
                const layout = readFileSync(join(repo, '(public)', 'layout.tsx'), 'utf8');
                expect(layout).not.toContain("'@type': 'SoftwareApplication'");
        });
});
