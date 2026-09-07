/**
 * round92-A2 — حرس انحدار ISR لصفحة المنيو العامة.
 *
 * التشخيص القاطع (راجع worklog القسم 2-b): المسار الديناميكي /menu/[slug]
 * كان 100% ديناميكيًا في الإنتاج (MISS×9، private/no-store، TTFB 0.42ث)
 * رغم `revalidate = 60` — لأن عقد App Router يقول: قطعة ديناميكية بلا
 * تصدير generateStaticParams تُصيَّر ديناميكيًا في كل طلب وتُتجاهل
 * revalidate/dynamicParams كليًا (وثائق next 16 المرفقة:
 * generate-static-params.md — «You must always return an array from
 * generateStaticParams, even if it's empty. Otherwise, the route will be
 * dynamically rendered»).
 *
 * هذا الاختبار يثبّت العقد الثلاثة معًا — حذف أي واحد منها (نفس الانحدار
 * التاريخي الذي قتل ISR) يفشل الاختبار فورًا:
 *   1. generateStaticParams موجودة وتعيد [] (ISR عند الطلب — صفر استعلامات
 *      DB وقت البناء، كل سلايغ يُولَّد في أول زيارة ويُخزَّن).
 *   2. revalidate = 60 (نافذة إعادة التوليد).
 *   3. dynamicParams = true (سلايغات غير معروفة تُولَّد عند الطلب لا 404).
 *
 * الاستيراد هنا هو وحدة الإنتاج نفسها (@/app/(public)/menu/[slug]/page)
 * مع mock واحد لـ @/lib/db — لا مرايا ولا نسخ.
 */
import { describe, it, expect, vi } from 'vitest';

// mock واحد يمنع تحميل Prisma/pg وvalidateEnv عند الاستيراد — الصفحة نفسها
// لا تلمس DB على مستوى الوحدة (فقط داخل render/generateMetadata).
vi.mock('@/lib/db', () => ({
        prisma: {
                menuCategory: { findMany: vi.fn() },
                menuItem: { findMany: vi.fn() },
                orderItem: { groupBy: vi.fn() },
                $queryRaw: vi.fn(),
        },
        withRetry: vi.fn((fn: unknown) => (fn as () => unknown)()),
}));

import * as menuPage from '@/app/(public)/menu/[slug]/page';

describe('round92-A2 — عقد ISR لصفحة المنيو /menu/[slug]', () => {
        it('generateStaticParams موجودة (بلاها يتحول المسار كليًا إلى ديناميكي ويُتجاهل revalidate)', async () => {
                expect(typeof menuPage.generateStaticParams).toBe('function');
        });

        it('generateStaticParams تعيد مصفوفة فارغة — صفر استعلامات DB وقت البناء، ISR عند الطلب لكل سلايغ', async () => {
                await expect(menuPage.generateStaticParams!()).resolves.toEqual([]);
        });

        it('revalidate = 60 — نافذة إعادة توليد الستين ثانية كما صُمّم', () => {
                expect(menuPage.revalidate).toBe(60);
        });

        it('dynamicParams = true — السلايغات غير المولَّدة تُخدَم عند الطلب (لا 404)', () => {
                expect(menuPage.dynamicParams).toBe(true);
        });

        it('الصفحة نفسها ما تزال مُصدَّرة كمكوّن خادم (default export وظيفة)', () => {
                expect(typeof menuPage.default).toBe('function');
        });
});
