import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 17-SM: بوابة «التصفية الحية» في بحث منيو الديمو — دُرَب القبول (W1-QA-MENU
 * §2b-5/D9) كان «يعمل عند Enter فقط». التوثيق هنا يثبّت الأسلاك الثلاثة:
 *
 *  1. كل ضغطة في الحقل تجدول المطابقة عبر المهلّة (275ms — الأخير يفوز)
 *     ⇒ التصفية حيّة أثناء الكتابة بلا Enter.
 *  2. Enter يُلمّح القيمة المعلّقة فورًا (flush) في المسارين: القائمة
 *     مغلقة، والقائمة مفتوحة بلا خيار نشط (اختيار اقتراح نشط يبقى أولوية).
 *  3. المطابقة نفسها: normalizeArabic في مصفّي الشبكة (MenuPageClient)
 *     وقائمة الاقتراحات (MenuToolbar) — دلالة النتائج لم تُمَس.
 *
 * هذه اختبارات تثبيت أسلاك (source pins) بعقيدة المختبَر في هذا المستودع:
 * مكونات العميل بلا بيئة DOM في vitest، فتُثبَّت المسارات بالأنماط المصدرية
 * (نمط tests/design/parity.test.ts نفسه) والدوال الصرفة تُختبر استيرادًا
 * (debounced-callback.test.ts: createDebounced/flush).
 */

const root = resolve(__dirname, '../..');
const raw = (p: string) => readFileSync(resolve(root, p), 'utf8');
const stripComments = (s: string) =>
        s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const cc = (p: string) => stripComments(raw(p));

describe('17-SM: بحث المنيو يصفّي حيًّا أثناء الكتابة (لا Enter فقط)', () => {
        const toolbar = cc('src/components/menu/MenuToolbar.tsx');
        const page = cc('src/components/menu/MenuPageClient.tsx');

        it('onChange في حقل البحث يستدعي المهلّة مباشرة — لا بوابة إرسال', () => {
                // الكلّية نفسها التي تحددها القبول: ضغطة ⇒ جدولة ⇒ مطابقة بعد مهلة
                expect(toolbar).toContain('debouncedSearchChange.call(e.target.value)');
                // ولا وجود للاستدعاء الدالِ القديم (الدالة أُحلّت بمقبض call/flush/cancel)
                expect(toolbar).not.toContain('debouncedSearchChange(e.target.value)');
        });

        it('المهلة 275ms داخل نافذة القبول 200-300ms وهي الأخير-يفوز', () => {
                expect(toolbar).toContain('delay = 275');
                expect(toolbar).toContain('pending.current = { value: v }');
        });

        it('Enter يُلمّح المعلّق فورًا في المسارين (قائمة مغلقة / مفتوحة بلا خيار نشط)', () => {
                expect(toolbar).toContain("if (e.key === 'Enter') {\n                                debouncedSearchChange.flush();");
                expect(toolbar).toContain("} else if (e.key === 'Enter') {\n                        debouncedSearchChange.flush();");
                // اختيار اقتراح نشط يبقى له الأولوية قبل اللمّح
                expect(toolbar).toContain("e.key === 'Enter' && activeIdx >= 0 && activeIdx < suggestions.length");
        });

        it('زر المسح يُسقط المعلّق ويطبّق فورًا — لا مهلة على إلغاءٍ بنقرة', () => {
                expect(toolbar).toContain('debouncedSearchChange.cancel();\n                                                                        onSearchChange(\'\')');
        });

        it('النتيجة تمر إلى حالة التصفية نفسها (q) — دلالة النتائج بلا تغيير', () => {
                // onSearchChange يكتب q فقط؛ المصفّي يقرأ urlState.q (search)
                expect(page).toContain('onSearchChange={(v) => updateURL({ q: v })}');
                expect(page).toContain('const q = normalizeArabic(search.trim())');
        });

        it('المطابقة موحّدة: normalizeArabic في الشبكة والاقتراحات معًا', () => {
                expect(toolbar).toContain('normalizeArabic(deferredSearch.trim())');
                expect(toolbar).toContain('normalizeArabic(i.nameAr || i.name).includes(q)');
        });

        it('معدّل النتائج يبقى منطقة بثّ مهذبة (aria-live) لكل تحديث حي', () => {
                // round88-E1: قارئ الشاشة يسمع عدّاد النتائج مع كل تصفية حية
                expect(page).toContain('aria-live="polite"');
                expect(page).toContain('عُثر على');
        });
});
