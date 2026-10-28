/**
 * round92-A5 — اختبارات بوابة جودة sitemap.xml (استيراد الإنتاج الحقيقي).
 *
 * الدليل الحي (1-a): sitemap.xml كان يعنون 9 مطاعم عبثية (bssdn, hdydu, hvh,
 * fafaef, sdsdsd, jjhhdhd, hgkjg, free-rest-1783368824, new-rest-300528).
 *
 * الاختبار يستورد `@/app/sitemap` نفسه (default export = الدالة التي يشغّلها
 * Next) مع mock لحدود prisma فقط — ثم يوكّد على مصفوفة URL الناتجة فعليًا.
 * القواعد (كل واحدة باختيار مسبب، راجع تعليقات sitemap.ts):
 *   1. where: { isActive: true } — غير النشط لا يُطلب أصلًا من DB.
 *   2. بلا أصناف → خارج القائمة (لا محتوى يُفهرس).
 *   3. سلايغات العبث (المرصودة حيًّا + القديمة r91) → خارج القائمة.
 *   4. بلا نشاط 90 يومًا (لا تعديل صف المطعم ولا طلب واحد) → خارج القائمة.
 *   5. تعديل قديم + طلب حديث → داخل القائمة (الطلب نشاط حقيقي).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted: مصنع vi.mock يُرفَع إلى أعلى الملف — الدوال يجب أن تُنشأ فيه
// لا في نطاق المستوى الأعلى (وإلا ReferenceError عند الاستيراد).
const { findMany, queryRaw, orderGroupBy } = vi.hoisted(() => ({
        findMany: vi.fn(),
        queryRaw: vi.fn(),
        orderGroupBy: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
        prisma: {
                restaurant: { findMany },
                order: { groupBy: orderGroupBy },
                $queryRaw: queryRaw,
        },
        withRetry: vi.fn(),
}));

import sitemap from '@/app/sitemap';
import { SITE_ORIGIN } from '@/lib/seo'; // r126 (M7): pinned unified origin

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);

type Row = { id: number; slug: string; updatedAt: Date };
const row = (id: number, slug: string, updatedDaysAgo: number): Row => ({
        id,
        slug,
        updatedAt: daysAgo(updatedDaysAgo),
});

async function run(restaurants: Row[], items: Array<{ restaurantId: number; items: bigint }>, orders: Array<{ restaurantId: number; _max: { createdAt: Date | null } }>) {
        findMany.mockResolvedValue(restaurants);
        queryRaw.mockResolvedValue(items);
        orderGroupBy.mockResolvedValue(orders);
        const entries = await sitemap();
        // r126 (M7): sitemap now rides lib/seo SITE_ORIGIN — same value here.
        const base = SITE_ORIGIN;
        const menuUrls = entries.filter((e) => e.url.startsWith(`${base}/menu/`)).map((e) => e.url);
        return { entries, menuUrls, base };
}

beforeEach(() => {
        vi.clearAllMocks();
});

describe('round92-A5 — سلايغات العبث المرصودة حيًّا تُستبعد', () => {
        it('ثمانية منها (نمطية الشكل) تُستبعد بالنمط حتى لو كانت حديثة التحديث', async () => {
                const junk = ['bssdn', 'hdydu', 'hvh', 'sdsdsd', 'jjhhdhd', 'hgkjg', 'free-rest-1783368824', 'new-rest-300528'];
                const { menuUrls } = await run(
                        junk.map((slug, i) => row(i + 1, slug, 1)), // حديثة التحديث — يلزم أن يصدها نمط الاسم
                        junk.map((_, i) => ({ restaurantId: i + 1, items: 5n })),
                        []
                );
                expect(menuUrls).toEqual([]);
        });

        it('التاسع (fafaef — غني بالحروف المتحركة، لا يُثبت نمطًا) يُستبعد ببوابة الزمن عند سكونه (لا تعديل ولا طلب 90+ يومًا)', async () => {
                const { menuUrls } = await run(
                        [row(1, 'fafaef', 95)],
                        [{ restaurantId: 1, items: 5n }],
                        []
                );
                expect(menuUrls).toEqual([]);
        });

        it('أنماط r91 القديمة ما زالت تحرس fixtures الاختبار (settings-test-ts, ede, restaurant-4, admin-test)', async () => {
                const legacy = ['settings-test-ts', 'ede', 'restaurant-4', 'admin-test-2'];
                const { menuUrls } = await run(
                        legacy.map((slug, i) => row(i + 1, slug, 1)),
                        legacy.map((_, i) => ({ restaurantId: i + 1, items: 5n })),
                        []
                );
                expect(menuUrls).toEqual([]);
        });

        it('P29-D1: صفاة الاختبار المسربة (al-waha-cafeewewe — اسم نسخة تجريبية، 6 أصناف، داخل نافذة 90 يومًا) تُستبعد بقائمة الـfixtures حتى لو عبرت كل البوابات الشكلية', async () => {
                // الصفاة عبرت بوابة المحتوى (6 ≥ 3) وبوابة النشاط (تحديث حديث)
                // ولا يُثبت أي نمط اسم أنها عبث — لكنها صف r96 اختباري مسرب
                // (scripts/archive/r96-test-migration-prod-sim.mjs) ينسخ اسم
                // المقهى التجريبي. القائمة الضيقة TEST_FIXTURE_SLUGS هي قرار
                // الإنسان الذي يعلو على كل استدلال شكلي.
                const { menuUrls } = await run(
                        [row(1, 'al-waha-cafeewewe', 1)],
                        [{ restaurantId: 1, items: 6n }],
                        []
                );
                expect(menuUrls).toEqual([]);
        });

        it('P29-D1: العروض التوضيحية المقصودة (al-waha-cafe و al-waha-cafe-demo) تبقى داخل القائمة', async () => {
                const { menuUrls } = await run(
                        [row(1, 'al-waha-cafe', 2), row(2, 'al-waha-cafe-demo', 2)],
                        [
                                { restaurantId: 1, items: 16n },
                                { restaurantId: 2, items: 25n },
                        ],
                        []
                );
                expect(menuUrls).toEqual([
                        expect.stringContaining('/menu/al-waha-cafe'),
                        expect.stringContaining('/menu/al-waha-cafe-demo'),
                ]);
        });

        it('سلايغ لاحقة رقمية مولَّدة آليًّا (matam-1783368824) تُستبعد — وسنة 4 أرقام (matam-1995) تبقى', async () => {
                const { menuUrls } = await run(
                        [row(1, 'matam-1783368824', 1), row(2, 'matam-1995', 1)],
                        [
                                { restaurantId: 1, items: 5n },
                                { restaurantId: 2, items: 5n },
                        ],
                        []
                );
                expect(menuUrls).toEqual([expect.stringContaining('/menu/matam-1995')]);
        });
});

describe('round92-A5 — المطاعم الحقيقية تبقى', () => {
        it('مطعم حديث التحديث (al-waha-cafe) بلا طلبات → يبقى داخل القائمة', async () => {
                const { menuUrls } = await run(
                        [row(1, 'al-waha-cafe', 2)],
                        [{ restaurantId: 1, items: 16n }],
                        []
                );
                expect(menuUrls).toEqual([expect.stringContaining('/menu/al-waha-cafe')]);
        });

        it('مطعم قديم التحديث لكن معه طلب حديث → يبقى (الطلب نشاط حقيقي)', async () => {
                const { menuUrls } = await run(
                        [row(1, 'pizza-roma', 200)],
                        [{ restaurantId: 1, items: 5n }],
                        [{ restaurantId: 1, _max: { createdAt: daysAgo(3) } }]
                );
                expect(menuUrls).toEqual([expect.stringContaining('/menu/pizza-roma')]);
        });

        it('الصفحات الثابتة (الرئيسية/الأسعار/الشروط/الخصوصية) موجودة دائمًا', async () => {
                const { entries, base } = await run([], [], []);
                const urls = entries.map((e) => e.url);
                expect(urls).toContain(base);
                expect(urls).toContain(`${base}/pricing`);
                expect(urls).toContain(`${base}/terms`);
                expect(urls).toContain(`${base}/privacy`);
        });
});

describe('round92-A5 — بوابة الجودة (زمن + محتوى + نشاط)', () => {
        it('غير النشط لا يُطلب من DB أصلًا (where isActive)', async () => {
                await run([], [], []);
                expect(findMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { isActive: true } })
                );
        });

        it('مطعم بلا أصناف → خارج القائمة (لا محتوى يُفهرس)', async () => {
                const { menuUrls } = await run(
                        [row(1, 'qahwa-cafe', 1)],
                        [{ restaurantId: 1, items: 0n }],
                        [{ restaurantId: 1, _max: { createdAt: daysAgo(1) } }]
                );
                expect(menuUrls).toEqual([]);
        });

        it('مطعم مهمل: لا تعديل ولا طلب منذ 90+ يومًا → خارج القائمة (الصفحة تبقى حية لكنها لا تستهلك ميزانية زحف)', async () => {
                const { menuUrls } = await run(
                        [row(1, 'old-rest', 95), row(2, 'another-old', 400)],
                        [
                                { restaurantId: 1, items: 8n },
                                { restaurantId: 2, items: 8n },
                        ],
                        []
                );
                expect(menuUrls).toEqual([]);
        });

        it('نافذة الـ90 يومًا تُمرَّر إلى استعلام الطلبات (createdAt >= قص 90 يومًا)', async () => {
                await run([], [], []);
                expect(orderGroupBy).toHaveBeenCalledTimes(1);
                const where = orderGroupBy.mock.calls[0][0]?.where ?? {};
                const gte = where.createdAt?.gte as Date | undefined;
                expect(gte).toBeInstanceOf(Date);
                const windowMs = Date.now() - gte!.getTime();
                // 90 يومًا بالضبط (تسامح ساعة لتنفيذ الاختبار)
                expect(windowMs).toBeGreaterThan(90 * DAY - 60 * 60 * 1000);
                expect(windowMs).toBeLessThan(90 * DAY + 60 * 60 * 1000);
        });

        it('حدود موثقة: عبث غني بالحروف المتحركة حديث التحديث ينجو (لا يمكن إثباته نمطًا) — يصده زمن الـ90 يومًا عند سكونه، والحل الجذري تنظيف DB', async () => {
                // fafaef حديث التحديث: قاعدة الاسم لا تلتقطه (حروف متحركة) وisAlive=true
                // → يبقى. هذا مقصود: الأنماط الأقوى تخاطر بالمطاعم الحقيقية.
                // عند سكونه 90+ يومًا (الاختبار أعلاه) يخرج تلقائيًا.
                const { menuUrls } = await run(
                        [row(1, 'fafaef', 1)],
                        [{ restaurantId: 1, items: 5n }],
                        []
                );
                expect(menuUrls).toEqual([expect.stringContaining('/menu/fafaef')]);
        });
});
