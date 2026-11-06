/**
 * P45-W1 (البند 3) — صدق تسميات حقلي اللغتين في المحرر (صفر ترحيل).
 *
 * الدلالة الفعلية الموثقة (BASELINE §العيوب 3): name = الاسم الإنجليزي،
 * nameAr = الاسم العربي الأساسي — العرض العام يستخدم nameAr || name
 * (MenuItemCard.tsx:79 + CategoryTabs:153,256 + JSON-LD menu/[slug]:431,439
 * + round83-seed). المحرر كان يسمّي الحقلين بالمقلوب.
 *
 * ما يُختبر هنا:
 *   1. ItemCoreFields بعرض حقيقي (renderToString — نفس نمط r121-cart-ux):
 *      التسمية الصادقة مربوطة بالحقل الصحيح (for/id)، والعناصر النائبة
 *      تطابق لغة كل حقل، والتلميح الحي «هكذا يظهر للزبون» يحل nameAr
 *      أولًا ثم name ثم «—».
 *   2. CategoryDialog بعقود مصدر (حوار Radix لا يُرسم بلا DOM) — نفس
 *      التصحيح + التلميح.
 *   3. عقد مصدر: لا تغيير في منطق العرض/البيانات (السطر الموثق في
 *      MenuItemCard يبقى nameAr || name).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ItemCoreFields } from '@/components/owner/item-dialog/ItemCoreFields';
import type { ItemFormState } from '@/components/owner/item-dialog/types';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const baseForm: ItemFormState = {
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        price: 12,
        discountedPrice: '',
        status: 'available',
        categoryId: 1,
        image: '',
        dietaryTags: [],
        allergens: [],
        isFeatured: false,
        featuredRank: '',
        showcaseTags: [],
        scheduleMode: 'always',
        availableFrom: '',
        availableTo: '',
        availableDays: [0, 1, 2, 3, 4, 5, 6],
};

const render = (over: Partial<ItemFormState>) =>
        renderToString(
                createElement(ItemCoreFields, { fId: 'test', form: { ...baseForm, ...over }, patch: () => {} })
        );

/** يستخرج وسم الإدخال الذي يحمل المعرف المعطى (الترتيب بين الخصائص غير مضمون). */
const inputTag = (html: string, id: string) => {
        const m = new RegExp(`<input[^>]*id="test-${id}"[^>]*>`).exec(html);
        expect(m, `input with id=test-${id} must render`).toBeTruthy();
        return m![0];
};

// ── 1. ItemCoreFields — التسمية الصادقة مربوطة بالحقل الصحيح ───────────

describe('P45-W1 — ItemCoreFields: تسميات صادقة لحقلي اللغتين', () => {
        it('«الاسم بالإنجليزية» مربوطة بحقل name (القيمة الإنجليزية) — لا بحقل nameAr (الانعكاس القديم)', () => {
                const html = render({ name: 'Cappuccino', nameAr: 'كابتشينو' });
                expect(html).toContain('الاسم بالإنجليزية</label>');
                expect(html).toMatch(/for="test-name"/);
                // الحقل الإنجليزي يحمل القيمة الإنجليزية واتجاهه LTR
                const en = inputTag(html, 'name');
                expect(en).toContain('value="Cappuccino"');
                expect(en).toContain('dir="ltr"');
                expect(en).toContain('placeholder="Cappuccino"');
        });

        it('«الاسم بالعربية» مربوطة بحقل nameAr (القيمة العربية) بلا فرض LTR', () => {
                const html = render({ name: 'Cappucchino', nameAr: 'كابتشينو' });
                expect(html).toContain('الاسم بالعربية</label>');
                expect(html).toMatch(/for="test-name-ar"/);
                const ar = inputTag(html, 'name-ar');
                expect(ar).toContain('value="كابتشينو"');
                expect(ar).not.toContain('dir="ltr"');
                expect(ar).toContain('كابتشينو — هذا ما يظهر للزبون أولًا');
        });

        it('التسمية المجردة القديمة «الاسم» لحقل name لم تبقَ (كانت تكذب عن دلالته)', () => {
                const html = render({});
                expect(html).not.toMatch(/<label[^>]*>الاسم<\/label>/);
        });
});

// ── 2. التلميح الحي — نفس معادلة العرض العام حرفيًا ─────────────────────

describe('P45-W1 — التلميح الحي «هكذا يظهر للزبون»', () => {
        it('nameAr موجودة → التلميح يعرضها (العربية الأساسية تظهر أولًا)', () => {
                const html = render({ name: 'Cappuccino', nameAr: 'كابتشينو' });
                expect(html).toContain('هكذا يظهر للزبون');
                // محتوى فقرة التلميح (span القيمة) — لا قيمة الحقول ولا العنصر النائب
                expect(html).toMatch(/<span class="font-medium text-foreground">كابتشينو<\/span>/);
        });

        it('nameAr فارغة → يسقط التلميح إلى name (نفس fallback البطاقة العامة)', () => {
                const html = render({ name: 'Cappuccino', nameAr: '' });
                expect(html).toMatch(/<span class="font-medium text-foreground">Cappuccino<\/span>/);
        });

        it('الاسمان فارغان → «—» (لا وعد كاذب بعنوان)', () => {
                const html = render({});
                expect(html).toMatch(/<span class="font-medium text-foreground">—<\/span>/);
        });

        it('منطق العرض العام نفسه لم يُمس (nameAr || name في البطاقة — صفر ترحيل)', () => {
                const card = src('src/components/menu/MenuItemCard.tsx');
                expect(card).toContain('item.nameAr || item.name');
        });
});

// ── 3. الوصف — نفس الانعكاس صُحّح ──────────────────────────────────────

describe('P45-W1 — وصف الصنف: التسميات الصادقة', () => {
        it('«الوصف بالإنجليزية» لحقل description و«الوصف بالعربية» لـ descriptionAr', () => {
                const html = render({
                        description: 'Double espresso with steamed milk',
                        descriptionAr: 'إسبريسو مزدوج مع حليب مبخّر',
                });
                expect(html).toContain('الوصف بالإنجليزية</label>');
                expect(html).toContain('الوصف بالعربية</label>');
                expect(html).toMatch(/for="test-desc"/);
                expect(html).toMatch(/for="test-desc-ar"/);
                expect(html).toContain('Double espresso with steamed milk');
                // الاتجاه يتبع لغة الحقل: الوصف الإنجليزي LTR والعربي بلا فرض
                const descEn = new RegExp(`<textarea[^>]*id="test-desc"[^>]*>`).exec(html);
                expect(descEn, 'desc textarea must render').toBeTruthy();
                expect(descEn![0]).toContain('dir="ltr"');
                const descAr = new RegExp(`<textarea[^>]*id="test-desc-ar"[^>]*>`).exec(html);
                expect(descAr, 'desc-ar textarea must render').toBeTruthy();
                expect(descAr![0]).not.toContain('dir="ltr"');
        });
});

// ── 4. CategoryDialog — نفس التصحيح (عقود مصدر: حوار Radix) ───────────

describe('P45-W1 — CategoryDialog: تسميات صادقة + تلميح', () => {
        const dialog = src('src/app/(protected)/owner/menu/CategoryDialog.tsx');

        it('name = «الاسم بالإنجليزية» (معرف name) وnameAr = «الاسم بالعربية» (معرف name-ar)', () => {
                expect(dialog).toContain('الاسم بالإنجليزية</Label>');
                expect(dialog).toContain('`${fId}-name`');
                expect(dialog).toContain('الاسم بالعربية</Label>');
                expect(dialog).toContain('`${fId}-name-ar`');
                // المعرف القديم المضلل (name-en كان على حقل nameAr) زال
                expect(dialog).not.toContain('name-en');
        });

        it('العناصر النائبة تطابق لغة كل حقل (إنجليزية على name، عربية على nameAr)', () => {
                expect(dialog).toContain('placeholder="Hot Drinks"');
                expect(dialog).toContain('مشروبات ساخنة — هذا ما يظهر للزبون أولًا');
        });

        it('التلميح الحي موجود بنفس معادلة العرض العام للفئات', () => {
                expect(dialog).toContain('هكذا يظهر للزبون:');
                expect(dialog).toContain('form.nameAr.trim() || form.name.trim()');
        });

        it('عرض الفئات العام نفسه لم يُمس (CategoryTabs: nameAr || name)', () => {
                const tabs = src('src/components/menu/CategoryTabs.tsx');
                expect(tabs).toContain('cat.nameAr || cat.name');
        });
});
