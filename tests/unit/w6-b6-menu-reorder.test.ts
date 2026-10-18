/**
 * W6-B6 — G-2 (تدقيق W6-A3): عقد ترتيب الأصناف الحقيقي + التحديد الجماعي.
 *
 * النمط (عائلة r121-cart-ux / r138-delivery-fee-truth / w6-b3): المنطق
 * الصافي في lib يُختبر باستيراد حقيقي هنا؛ الأسلاك التي لا يصل إليها
 * جيش vitest (صفحات المالك) تُثبَّت كعقود مصدر (source contracts) — لا
 * يوجد harness jsdom لصفحات المالك في المستودع، والمتصفح ملك الـe2e.
 *
 * الأقسام:
 *   1. moveItemInList: التبادل + التطبيع (index = قيمة مخزنة) + حواف
 *      الأول/الأخير + عدم تغيير المدخلات.
 *   2. computeMoveWrites: عقد الفروق — قسم مطبّع = كتابتان بالضبط، قسم
 *      تاريخي كله أصفار = n-1 (الأول يظل 0)، القيم غير المتصلة تُصلح
 *      مرة واحدة، والتطبيق النهائي يطابق moveItemInList حرفيًا.
 *   3. عقود مصدر: الصفحة (PUT لكل فرق، التحميل المجمع بترقيم، الحلقة
 *      التسلسلية للجماعي)، القائمة (لا مقبض وهم، أزرار نقل، خانات، شريط
 *      الجماعي)، ومسار الخادم (قبول sortOrder على PUT، والإلحاق بآخر
 *      القسم على POST).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { moveItemInList, computeMoveWrites } from '@/lib/menu-reorder';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

type Row = { id: number; sortOrder: number };

const mk = (...orders: number[]): Row[] => orders.map((sortOrder, i) => ({ id: i + 1, sortOrder }));

// ── 1. moveItemInList ───────────────────────────────────────────────────

describe('W6-B6 — moveItemInList', () => {
        it('ينقل للأسفل: التبادل + التطبيع إلى index', () => {
                const items = mk(0, 0, 0, 0); // حالة تاريخية (كل الأصفار)
                // نقل id=2 (index 1) للأسفل: يتبادل مع id=3
                const next = moveItemInList(items, 2, 'down');
                expect(next?.map((i) => i.id)).toEqual([1, 3, 2, 4]);
                // الترتيب المعروض الجديد يصبح القيمة المخزنة
                expect(next?.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3]);
        });

        it('ينقل للأعلى في قسم مطبّع: نفس العقد', () => {
                const items = mk(0, 1, 2, 3);
                const next = moveItemInList(items, 3, 'up');
                expect(next?.map((i) => i.id)).toEqual([1, 3, 2, 4]);
                expect(next?.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3]);
        });

        it('الأول للأعلى → null (لا حركة)', () => {
                expect(moveItemInList(mk(0, 1), 1, 'up')).toBeNull();
        });

        it('الأخير للأسفل → null (لا حركة)', () => {
                expect(moveItemInList(mk(0, 1), 2, 'down')).toBeNull();
        });

        it('قسم من عنصر واحد: لا حركة في أي اتجاه', () => {
                expect(moveItemInList(mk(0), 1, 'up')).toBeNull();
                expect(moveItemInList(mk(0), 1, 'down')).toBeNull();
        });

        it('معرّف غير موجود → null', () => {
                expect(moveItemInList(mk(0, 1), 99, 'up')).toBeNull();
        });

        it('لا يغيّر مصفوفة المدخلات (نقاء الوظيفة)', () => {
                const items = mk(0, 0, 0);
                const snapshot = items.map((i) => ({ ...i }));
                moveItemInList(items, 2, 'up');
                expect(items).toEqual(snapshot);
        });
});

// ── 2. computeMoveWrites — عقد الفروق (ما الذي يُكتب فعلًا) ─────────────

describe('W6-B6 — computeMoveWrites', () => {
        it('قسم تاريخي كله أصفار: أول نقل يكتب n-1 صفًا (من يهبط للموضع 0 يظل 0)', () => {
                const items = mk(0, 0, 0, 0, 0);
                // نقل id=4 (index 3) للأعلى: يتبادل مع index 2
                const writes = computeMoveWrites(items, 4, 'up');
                expect(writes).toEqual([
                        { id: 2, sortOrder: 1 },
                        { id: 4, sortOrder: 2 },
                        { id: 3, sortOrder: 3 },
                        { id: 5, sortOrder: 4 },
                ]);
                // n=5 → 4 كتابات (n-1)
                const allWrites = computeMoveWrites(items, 1, 'down');
                expect(allWrites).toHaveLength(4);
        });

        it('قسم مطبّع (0..n-1): نقل واحد = كتابتان بالضبط (الحالة المستقرة)', () => {
                const items = mk(0, 1, 2, 3);
                const writes = computeMoveWrites(items, 3, 'up');
                expect(writes).toEqual([
                        { id: 3, sortOrder: 1 },
                        { id: 2, sortOrder: 2 },
                ]);
        });

        it('قيم تاريخية غير متصلة [0,0,0,5,7]: تُصلَح بفروقها فقط', () => {
                const items = mk(0, 0, 0, 5, 7);
                // نقل id=3 (index 2) للأعلى: يتبادل مع index 1
                const writes = computeMoveWrites(items, 3, 'up');
                expect(writes).toEqual([
                        { id: 3, sortOrder: 1 },
                        { id: 2, sortOrder: 2 },
                        { id: 4, sortOrder: 3 },
                        { id: 5, sortOrder: 4 },
                ]);
        });

        it('تطبيق الفروق على الأصل يطابق moveItemInList (اتساق المحرّكين)', () => {
                const items = mk(0, 0, 0, 5, 7, 7);
                const next = moveItemInList(items, 5, 'up');
                const writes = computeMoveWrites(items, 5, 'up');
                const applied = items.map((i) => ({ ...i }));
                for (const w of writes) {
                        const row = applied.find((a) => a.id === w.id);
                        if (row) row.sortOrder = w.sortOrder;
                }
                // قارن بالترتيب النهائي نفسه (ترتيب الصفوف = قيم sortOrder)
                const byOrder = (a: Row, b: Row) => a.sortOrder - b.sortOrder || a.id - b.id;
                expect([...applied].sort(byOrder)).toEqual([...next!].sort(byOrder));
        });

        it('حواف بلا حركة → لا كتابات', () => {
                expect(computeMoveWrites(mk(0, 1), 1, 'up')).toEqual([]);
                expect(computeMoveWrites(mk(0, 1), 2, 'down')).toEqual([]);
        });
});

// ── 3. عقود المصدر — الأسلاك ────────────────────────────────────────────

describe('W6-B6 — عقود مصدر: صفحة المالك (page.tsx)', () => {
        const page = src('src/app/(protected)/owner/menu/page.tsx');

        it('تستورد محرّك الترتيب وتكتب كل فرع بـ PUT { sortOrder }', () => {
                expect(page).toContain("from '@/lib/menu-reorder'");
                expect(page).toContain('sortOrder: w.sortOrder');
                expect(page).toContain('`/api/items/${w.id}`');
        });

        it('التحميل يجمع كل صفحات القسم (شرط عقد الترتيب) بسقف صادق', () => {
                expect(page).toContain('ITEMS_PAGE_SIZE = 100');
                expect(page).toContain('ITEMS_LOAD_CAP = 500');
                expect(page).toContain('pageSize=${ITEMS_PAGE_SIZE}');
                expect(page).toContain('itemsTruncated: truncated');
        });

        it('الجماعي: حلقة تسلسلية + تقدم مرئي + إيقاف عند أول فشل بعدّاد', () => {
                expect(page).toContain('onBulkStatus');
                expect(page).toContain("JSON.stringify({ status })");
                expect(page).toContain('setBulk({ status, done, total: ids.length })');
                expect(page).toContain('failure = getErrorMessage(e');
                expect(page).toContain('تم تحديث ${toArabicNumber(done)} من ${toArabicNumber(ids.length)}');
        });

        it('فشل النقل يعيد المزامنة من الخادم (لا تراجع يدوي)', () => {
                expect(page).toContain("getErrorMessage(e, 'تعذّر تحديث الترتيب')");
        });
});

describe('W6-B6 — عقود مصدر: القائمة (CategoriesList.tsx)', () => {
        const cl = src('src/app/(protected)/owner/menu/CategoriesList.tsx');

        it('المقبض الوهمي محذوف — لا GripVertical ولا cursor-grab (حكم التدقيق)', () => {
                expect(cl).not.toContain('GripVertical');
                expect(cl).not.toContain('cursor-grab');
        });

        it('أزرار النقل موصولة ووصولية (aria-label بالعربية + معطّلة عند الحواف)', () => {
                expect(cl).toContain("onMoveItem(item, 'up')");
                expect(cl).toContain("onMoveItem(item, 'down')");
                expect(cl).toContain('نقل ${item.name} للأعلى');
                expect(cl).toContain('نقل ${item.name} للأسفل');
                expect(cl).toContain('index === 0');
                expect(cl).toContain('index === items.length - 1');
        });

        it('خانات تحديد أصلية + شريط الجماعي بأفعاله الأربعة', () => {
                expect(cl).toContain("type=\"checkbox\"");
                expect(cl).toContain('تحديد ${item.name}');
                expect(cl).toContain('تحديد المتاح');
                expect(cl).toContain('تحديد الكل');
                expect(cl).toContain('إخفاء المحدد');
                expect(cl).toContain('إظهار المحدد');
                expect(cl).toContain('إلغاء التحديد');
        });

        it('النقل يعطّل أثناء البحث (قائمة مفلترة = ترتيب غامض)', () => {
                expect(cl).toContain('movesBlocked');
        });
});

describe('W6-B6 — عقود مصدر: الخادم يقبل ما تكتبه الأزرار', () => {
        it('items/[id] PUT يقبل sortOrder (عدد صحيح اختياري)', () => {
                const put = src('src/app/api/items/[id]/route.ts');
                expect(put).toContain('sortOrder: z.number().int().optional()');
        });

        it('items POST يُلحق بآخر القسم (appendSortOrder تحت القفل)', () => {
                const post = src('src/app/api/items/route.ts');
                expect(post).toContain('appendSortOrder');
                expect(post).toContain('_max: { sortOrder: true }');
                expect(post).toContain('sortOrder: body.sortOrder ?? appendSortOrder');
        });
});
