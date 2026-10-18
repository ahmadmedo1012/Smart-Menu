/**
 * W6-B6 (G-2 من تدقيق W6-A3): ترتيب الأصناف الحقيقي داخل القسم.
 *
 * المشكلة المرصودة: مقبض السحب كان زخرفيًا (صفر معالجات)، و`sortOrder`
 * افتراضيًا 0 في كل مكان، فالأصناف تُعرض بترتيب الإدخال فقط — والمطعم
 * يحتاج ترتيبًا موسميًا يوميًا. المنقّح طلب أزرار نقل للأعلى/للأسفل
 * (التوأم الوصولي بدل HTML5 DnD محدود بالمؤشر — حكم r121-J-3 نفسه).
 *
 * عقد الترتيب (مستند الاتفاقية مع الخادم):
 *   · كل قراءات المنيو (المالك + العام + الأدمن) تُرتّب بـ
 *     `orderBy: { sortOrder: 'asc' }` فقط — تعادل القيم يسقط لترتيب
 *     الإدخال (سلوك قاعدة البيانات). لذا أي مخطط ترتيب صادق يجب أن
 *     يكتب قيمًا مميّزة.
 *   · الخادم يقبل `sortOrder` على POST وPUT (z.number().int()) — تم
 *     التحقق في items/route.ts وitems/[id]/route.ts (زوغد اختياري
 *     في كليهما).
 *   · المخطط المختار: **تطبيع بلا فجوات لكل قسم** — الترتيب المعروض
 *     يصبح `sortOrder = index` (0..n-1). لا endpoint جديد ولا batch:
 *     الكتابة تتم بـ PUTs فردية، والفرق (diff) هو ما يُرسل فقط: في
 *     الحالة المستقرة (قسم مطبّع مسبقًا) نقل واحد = كتابتان بالضبط.
 *     أول نقل على قسم قديم كله أصفار يكتب n-1 صفًا (الصف 0 يظل 0).
 *
 * عائلة محدّد PUT (round91-F-B): 20 كتابة/دقيقة لكل مستخدم — الـbulk
 * والترتيب يواجهانها بصدق (تقدم ظاهر + إيقاف عند أول فشل + رسالة
 * الخادم العربية تظهر كما هي). لا تعديل على المحدّد.
 */

/** الحد الأدنى الذي تحتاجه خوارزمية الترتيب من صف الصنف. */
export interface OrderableItem {
        id: number;
        sortOrder: number;
}

/** كتابة ترتيب واحدة: PUT /api/items/{id} body { sortOrder }. */
export interface SortWrite {
        id: number;
        sortOrder: number;
}

export type MoveDirection = 'up' | 'down';

/**
 * يحرّك الصنف خانة واحدة (فوق/تحت) ويعيد القائمة الجديدة مع
 * `sortOrder` المطبّع = index. يرجع null إذا لا حركة ممكنة:
 * الصنف غير موجود، أو هو الأول (فوق)، أو الأخير (تحت).
 *
 * العقد: `items` هي قائمة القسم الكاملة بترتيب العرض الحالي —
 * قائمة مقصوصة بصفحة لا تجوز (انظر fetchItems في صفحة المالك).
 */
export function moveItemInList<T extends OrderableItem>(
        items: readonly T[],
        itemId: number,
        dir: MoveDirection
): T[] | null {
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx === -1) return null;
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= items.length) return null;
        const next = [...items];
        const moved = next[idx];
        next[idx] = next[swapIdx];
        next[swapIdx] = moved;
        // التطبيع: الترتيب المعروض الجديد يصبح هو القيمة المخزنة
        return next.map((item, index) =>
                item.sortOrder === index ? item : { ...item, sortOrder: index }
        );
}

/**
 * الفروق التي يجب كتابتها لتثبيت الترتيب الجديد: لكل صف قيمته
 * الجديدة (index) فقط عندما تختلف عن المخزنة. النقل في قسم مطبّع
 * = 2 كتابات؛ أول نقل على قسم تاريخي كله أصفار = n-1 (الصف الأول
 * يظل 0). يستخدم `moveItemInList` نفسه كمحرّك للتطبيع — عقد واحد.
 *
 * نفس العقد: القائمة الكاملة، بترتيب العرض الحالي.
 */
export function computeMoveWrites(
        items: readonly OrderableItem[],
        itemId: number,
        dir: MoveDirection
): SortWrite[] {
        const next = moveItemInList(items, itemId, dir);
        if (!next) return [];
        const original = new Map(items.map((it) => [it.id, it.sortOrder]));
        const writes: SortWrite[] = [];
        for (let i = 0; i < next.length; i++) {
                if (original.get(next[i].id) !== next[i].sortOrder) {
                        writes.push({ id: next[i].id, sortOrder: next[i].sortOrder });
                }
        }
        return writes;
}
