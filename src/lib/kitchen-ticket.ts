/**
 * W6-B3 (G-3 من تدقيق W6-A3): تذكرة المطبخ — تحليل بيانات الطلب إلى
 * سطور التذكرة، بمعزل عن الصفحة (نفس عائلة table-qr.ts / table-session.ts:
 * منطق خالص قابل للاختبار، والصفحة رقيقة عرض).
 *
 * مصادر البيانات (كلها موجودة أصلاً في استجابة GET /api/orders/[id] —
 * صفر تغييرات خادم):
 * - Order.notes: السلة تؤلف الملاحظات أسطراً (cart/page.tsx):
 *   [ملاحظات الزبون، «العنوان: …» للتوصيل، «طاولة: N» عند الدخول من رمز
 *   الطاولة]. رقم الطاولة يُستخرج منها — نحن من كتب السطر (r135) فالتحليل
 *   حرفي وموثوق.
 * - OrderItem.modifiersJson: لقطة خيارات الإضافات وقت الطلب (صيغة r118:
 *   مصفوفة {id, nameAr, name, priceDelta}) — تُقرأ كما سُجّلت، بلا استعلام.
 * - OrderItem.notes: ملاحظة السطر الخاصة («بدون حار»).
 */

/** استخراج رقم الطاولة من ملاحظات الطلب — آخر سطر «طاولة: N» صالح.
 *
 * السطر الذي تكتبه السلة يُلحق آخر الملاحظات (cart/page.tsx) فأحدث سطر
 * طاولة هو المرجَّح؛ نطاق 1..999 مرآة عقد r135 (خارج النطاق = تشويش
 * لا يستحق عرضه على المطبخ). يرجع null إن لم يوجد سطر صالح.
 */
export function parseTableFromNotes(notes: string): number | null {
        if (!notes) return null;
        let found: number | null = null;
        for (const line of notes.split('\n')) {
                const m = /^طاولة:\s*(\d{1,3})\s*$/.exec(line.trim());
                if (m) {
                        const n = Number(m[1]);
                        if (n >= 1 && n <= 999) found = n;
                }
        }
        return found;
}

/** الملاحظات بعد نزع سطر الطاولة (المطبخ يرى الطاولة في مكانها البارز؛
 *  يبقى ما يخص التحضير: ملاحظة الزبون + سطر العنوان للتوصيل). تُقلَّم
 *  الأسطر الفارغة الناتجة عن النزع. */
export function notesWithoutTable(notes: string): string {
        if (!notes) return '';
        return notes
                .split('\n')
                .filter((line) => !/^طاولة:\s*\d{1,3}\s*$/.test(line.trim()))
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .join('\n');
}

/**
 * أسماء خيارات الإضافات من لقطة modifiersJson (صيغة r118). الصيغة
 * القديمة (مصفوفة معرفات مجردة) تعجز عن الحل من طرف العميل — تحتاج
 * استعلام قاعدة البيانات (parseStoredModifiers في الخادم) — فتُرجع
 * قائمة فارغة بصمت: التذكرة تطبع ما عُرف وقتها فقط، لا تخترع أسطراً.
 * JSON تالف = قائمة فارغة (الدفاع المعتاد في parseStoredModifiers).
 */
export function parseModifierNames(modifiersJson: string | null | undefined): string[] {
        if (!modifiersJson) return [];
        let raw: unknown;
        try {
                raw = JSON.parse(modifiersJson);
        } catch {
                return [];
        }
        if (!Array.isArray(raw)) return [];
        const names: string[] = [];
        for (const v of raw) {
                if (typeof v !== 'object' || v === null) continue; // معرف مجرد (صيغة قديمة) — غير قابلة للحل هنا
                const o = v as { nameAr?: unknown; name?: unknown };
                const name = typeof o.nameAr === 'string' && o.nameAr.trim() ? o.nameAr : o.name;
                if (typeof name === 'string' && name.trim()) names.push(name.trim());
        }
        return names;
}

/** سطر صنف واحد في التذكرة: الاسم المعروض + الكمية + الإضافات + ملاحظة السطر. */
export interface TicketItemLine {
        name: string;
        quantity: number;
        modifiers: string[];
        notes: string;
}

/**
 * بناء سطور الأصناف للتذكرة من صفوف OrderItem (كما تصل من GET
 * /api/orders/[id]). الحقول القديمة/الغائبة (notes/modifiersJson قبل
 * وجودها في النوع) تُعامل كقيم فارغة — الصفوف التاريخية تطبع بلا
 * أسطر مُختلقة.
 */
export function buildTicketItems(
        items: {
                item: { name: string; nameAr: string | null };
                quantity: number;
                notes?: string | null;
                modifiersJson?: string | null;
        }[]
): TicketItemLine[] {
        return items.map((oi) => ({
                name: oi.item.nameAr || oi.item.name,
                quantity: oi.quantity,
                modifiers: parseModifierNames(oi.modifiersJson),
                notes: (oi.notes ?? '').trim(),
        }));
}
