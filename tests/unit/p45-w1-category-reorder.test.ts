/**
 * P45-W1 (البند 3) — ترتيب الفئات الحقيقي في واجهة المالك.
 *
 * النمط (w6-b6-menu-reorder.test.ts نفسه): محرّك menu-reorder المجرّب
 * يعمَّل هنا على صفوف الفئات (Category تحقّق واجهة OrderableItem بـ
 * id+sortOrder — لا تفرّع للمكتبة)، والأسلاك التي لا يصل إليها جيش
 * vitest تُثبَّت كعقود مصدر.
 *
 * الأقسام:
 *   1. المحرّك على قائمة فئات: التبادل + التطبيع + حواف الأول/الأخير.
 *   2. عقود مصدر: صفحة المالك (PUT لكل فرق على مسار categories + التحميل
 *      المرقّم بسقف صادق + تعطيل عند البحث/القص)، القائمة (أزرار النقل
 *      44px md+ مع aria-label عربية وتعطيل الحواف)، والخادم (عقد PUT
 *      sortOrder القائم + تطهير ISR).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { moveItemInList, computeMoveWrites } from '@/lib/menu-reorder';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

type CatRow = { id: number; sortOrder: number };

const mk = (...orders: number[]): CatRow[] =>
        orders.map((sortOrder, i) => ({ id: 100 + i, sortOrder }));

// ── 1. المحرّك على صفوف الفئات (إعادة الاستخدام لا التفرّع) ─────────────

describe('P45-W1 — moveItemInList على قائمة فئات', () => {
        it('ينقل فئة للأسفل: التبادل + التطبيع إلى index (نفس عقد الأصناف)', () => {
                const cats = mk(0, 0, 0, 0); // الحالة التاريخية (كل الأصفار)
                const next = moveItemInList(cats, 101, 'down');
                expect(next?.map((c) => c.id)).toEqual([100, 102, 101, 103]);
                expect(next?.map((c) => c.sortOrder)).toEqual([0, 1, 2, 3]);
        });

        it('ينقل فئة للأعلى في قائمة مطبّعة: كتابتان بالضبط (الحالة المستقرة)', () => {
                const cats = mk(0, 1, 2, 3);
                const writes = computeMoveWrites(cats, 102, 'up');
                expect(writes).toEqual([
                        { id: 102, sortOrder: 1 },
                        { id: 101, sortOrder: 2 },
                ]);
        });

        it('أول فئة للأعلى → null (زر الأعلى معطّل منطقيًا عند الحافة)', () => {
                expect(moveItemInList(mk(0, 1), 100, 'up')).toBeNull();
        });

        it('آخر فئة للأسفل → null', () => {
                expect(moveItemInList(mk(0, 1), 101, 'down')).toBeNull();
        });

        it('قائمة فئة واحدة: لا حركة في أي اتجاه', () => {
                expect(moveItemInList(mk(0), 100, 'up')).toBeNull();
                expect(moveItemInList(mk(0), 100, 'down')).toBeNull();
        });

        it('لا يغيّر مصفوفة المدخلات (نقاء الوظيفة — العرض المتفائل يبني نسخة)', () => {
                const cats = mk(0, 0, 0);
                const snapshot = cats.map((c) => ({ ...c }));
                moveItemInList(cats, 101, 'up');
                expect(cats).toEqual(snapshot);
        });
});

// ── 2. عقود مصدر — الأسلاك ─────────────────────────────────────────────

describe('P45-W1 — عقود مصدر: صفحة المالك (page.tsx)', () => {
        const page = src('src/app/(protected)/owner/menu/page.tsx');

        it('moveCategory تعمّل على القائمة الكاملة وتكتب كل فرق بـ PUT { sortOrder } على مسار الفئات', () => {
                expect(page).toContain('const moveCategory = async (cat: Category');
                expect(page).toContain('moveItemInList(categories, cat.id, dir)');
                expect(page).toContain('computeMoveWrites(categories, cat.id, dir)');
                expect(page).toContain('`/api/categories/${w.id}`');
                expect(page).toContain('sortOrder: w.sortOrder');
        });

        it('التحميل يجمع كل صفحات الفئات (شرط عقد الترتيب) بسقف صادق + علم قصّ', () => {
                expect(page).toContain('CATS_PAGE_SIZE = 100');
                expect(page).toContain('CATS_LOAD_CAP = 500');
                expect(page).toContain('pageSize=${CATS_PAGE_SIZE}');
                expect(page).toContain('setCatsTruncated(all.length < total)');
        });

        it('فشل النقل يعيد المزامنة من الخادم ويعرض رسالته (لا تراجع يدوي)', () => {
                expect(page).toContain("getErrorMessage(e, 'تعذّر تحديث ترتيب التصنيفات')");
        });

        it('عقد one-slot diff: نفس محرك W6-B6 بلا تفرّع (لا نسخة فئات من المكتبة)', () => {
                const lib = src('src/lib/menu-reorder.ts');
                // المكتبة كما هي: دالتان عامّتان فقط — لا API فئات منفصل
                expect(lib).toContain('export function moveItemInList');
                expect(lib).toContain('export function computeMoveWrites');
                expect(lib).not.toContain('moveCategoryInList');
        });
});

describe('P45-W1 — عقود مصدر: القائمة (CategoriesList.tsx)', () => {
        const cl = src('src/app/(protected)/owner/menu/CategoriesList.tsx');

        it('أزرار نقل الفئة موصولة ووصولية (aria-label عربية + 44px + md+)', () => {
                expect(cl).toContain("onMoveCategory(cat, 'up')");
                expect(cl).toContain("onMoveCategory(cat, 'down')");
                expect(cl).toContain('نقل ${cat.name} للأعلى');
                expect(cl).toContain('نقل ${cat.name} للأسفل');
                // 44px: هدف اللمس المطلوب — size-11 لا الحجم المضغوط للأصناف
                expect(cl).toContain('size-11 rounded-md flex items-center justify-center');
                // md+ فقط — نفس حكم W6-B6 على كثافة الترويسة
                expect(cl).toContain('hidden md:flex items-center gap-0.5');
        });

        it('النقل يعطّل عند الحواف (الأولى فوق / الأخيرة تحت) وعند البحث/القص/الشغل', () => {
                expect(cl).toContain('catMovesBlocked || catIndex === 0');
                expect(cl).toContain('catIndex === categories.length - 1');
                expect(cl).toContain('catMovesBlocked =');
                expect(cl).toContain('catsTruncated || catsMoving || duplicatingCat');
                // سبب التعطيل صادق ومكتوب (title يحمل السبب)
                expect(cl).toContain('الترتيب متاح بعد مسح البحث — القائمة المعروضة مفلترة');
        });
});

describe('P45-W1 — عقود مصدر: الخادم يقبل ما تكتبه الأزرار', () => {
        it('categories/[id] PUT يقبل sortOrder (عدد صحيح اختياري) — العقد القائم', () => {
                const put = src('src/app/api/categories/[id]/route.ts');
                expect(put).toContain('sortOrder: z.number().int().optional()');
        });

        it('categories/[id] PUT يطهّر ISR بعد كل كتابة (تحديث الترتيب يظهر فورًا)', () => {
                const put = src('src/app/api/categories/[id]/route.ts');
                expect(put).toContain('revalidateMenu(existing.restaurantId)');
        });

        it('GET /api/categories يرتّب بـ sortOrder asc — التطبيع يجد مساره للعرض', () => {
                const get = src('src/app/api/categories/route.ts');
                expect(get).toContain("orderBy: { sortOrder: 'asc' }");
        });
});
