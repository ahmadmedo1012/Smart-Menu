/**
 * P45-W1 (البند 3) — تكرار صنف/فئة: النقي المشترك (duplicate-utils) بعقود
 * حقيقية + الأسلاك كعقود مصدر (نمط w6-b6 §3: صفحات المالك بلا jsdom).
 *
 * الأقسام:
 *   1. withCopySuffix — لاحقة « (نسخة)» مع احترام سقف العمود (100).
 *   2. itemDuplicatePayload — الحقول كلها تُنسخ كما هي ما عدا الاسمين
 *      باللاحقة؛ عقد round88-C (الرتبة/الشارات غير مُرسَلة لغير المميز)؛
 *      خريطة مجموعات الإضافات (priceDelta نص → رقم، المعرفات تُهمل).
 *   3. copyItemsSequentially — النسخ التسلسلي الصادق: نجاح كامل، وتوقف
 *      عند سقف الباقة منتصف الطريق (العدد + رسالة الخادم كما هي)، وقائمة
 *      فارغة، ورمي غير Error.
 *   4. عقود مصدر — الصفحة (فتح المحرر على الصف الكامل للنسخة + تأكيد
 *      التكرار بعدد صادق من _count + POST عبر مسار الإنشاء القائم)
 *      والقائمة (الأزرار + التعطيل) والخادم (السقف داخل معاملة الإنشاء
 *      — عقد items-contract المُختبر هناك يُستشهد به هنا).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
        COPY_SUFFIX,
        NAME_MAX,
        withCopySuffix,
        itemDuplicatePayload,
        copyItemsSequentially,
} from '@/app/(protected)/owner/menu/duplicate-utils';
import type { Item } from '@/app/(protected)/owner/menu/types';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const item = (over: Partial<Item>): Item =>
        ({
                id: 7,
                name: 'Cappuccino',
                nameAr: 'كابتشينو',
                description: 'Double espresso with steamed milk',
                descriptionAr: 'إسبريسو مزدوج مع حليب مبخّر',
                price: 12,
                discountedPrice: 9,
                image: '/uploads/7/cappuccino.jpg',
                status: 'available',
                categoryId: 3,
                sortOrder: 0,
                dietaryTags: ['vegetarian'],
                allergens: ['milk'],
                isFeatured: true,
                featuredRank: 2,
                showcaseTags: ['الأكثر طلبًا'],
                availableFrom: '16:00',
                availableTo: '23:00',
                availableDays: '[0,1,4]',
                modifierGroups: [
                        {
                                id: 50,
                                nameAr: 'الحجم',
                                name: 'Size',
                                minSelect: 1,
                                maxSelect: 1,
                                required: true,
                                sortOrder: 0,
                                options: [
                                        { id: 51, nameAr: 'كبير', name: 'Large', priceDelta: '2.5', isAvailable: true, sortOrder: 0 },
                                        { id: 52, nameAr: 'صغير', name: 'Small', priceDelta: 0, isAvailable: false, sortOrder: 1 },
                                ],
                        },
                ],
                ...over,
        }) as Item;

// ── 1. withCopySuffix ───────────────────────────────────────────────────

describe('P45-W1 — withCopySuffix', () => {
        it('يلحق « (نسخة)» كما هي على الاسم القصير', () => {
                expect(withCopySuffix('Cappuccino')).toBe(`Cappuccino${COPY_SUFFIX}`);
                expect(withCopySuffix('كابتشينو')).toBe(`كابتشينو${COPY_SUFFIX}`);
        });

        it('اسم بطول السقف بالضبط → اقتطاع صادق إلى (السقف − اللاحقة) لا 422', () => {
                const long = 'ش'.repeat(NAME_MAX);
                const result = withCopySuffix(long);
                expect(result).toHaveLength(NAME_MAX);
                expect(result.endsWith(COPY_SUFFIX)).toBe(true);
        });

        it('الاسم الفارغ → اللاحقة وحدها (حوار التكرار لا يُنشئ اسمًا فارغًا أبدًا)', () => {
                expect(withCopySuffix('')).toBe(COPY_SUFFIX);
        });
});

// ── 2. itemDuplicatePayload ─────────────────────────────────────────────

describe('P45-W1 — itemDuplicatePayload', () => {
        it('الاسمان باللاحقة (الحقلان معًا) وباقي الحقول كما هي', () => {
                const p = itemDuplicatePayload(item({}), 3);
                expect(p.name).toBe(`Cappuccino${COPY_SUFFIX}`);
                expect(p.nameAr).toBe(`كابتشينو${COPY_SUFFIX}`);
                expect(p.price).toBe(12);
                expect(p.discountedPrice).toBe(9);
                expect(p.image).toBe('/uploads/7/cappuccino.jpg');
                expect(p.status).toBe('available');
                expect(p.categoryId).toBe(3);
                expect(p.dietaryTags).toEqual(['vegetarian']);
                expect(p.allergens).toEqual(['milk']);
        });

        it('nameAr غائبة → تبقى غائبة (undefined) — لا لاحقة على حقل فارغ', () => {
                const p = itemDuplicatePayload(item({ nameAr: undefined }), 3);
                expect(p.nameAr).toBeUndefined();
        });

        it('الجدولة تُنسخ كما هي (نافذة + أيام JSON)', () => {
                const p = itemDuplicatePayload(item({}), 3);
                expect(p.availableFrom).toBe('16:00');
                expect(p.availableTo).toBe('23:00');
                expect(p.availableDays).toBe('[0,1,4]');
        });

        it('عقد round88-C محفوظ: النسخة غير المميزة تترك الرتبة/الشارات غير مُرسَلة', () => {
                const p = itemDuplicatePayload(item({ isFeatured: false }), 3);
                expect(p.isFeatured).toBe(false);
                expect('featuredRank' in p && p.featuredRank !== undefined).toBe(false);
                expect('showcaseTags' in p && p.showcaseTags !== undefined).toBe(false);
        });

        it('النسخة المميزة تحمل رتبتها وشاراتها', () => {
                const p = itemDuplicatePayload(item({}), 3);
                expect(p.featuredRank).toBe(2);
                expect(p.showcaseTags).toEqual(['الأكثر طلبًا']);
        });

        it('مجموعات الإضافات تُنسخ بلا معرفات الصف الأصل وpriceDelta رقمًا (لا نصًا)', () => {
                const p = itemDuplicatePayload(item({}), 3);
                expect(p.modifierGroups).toEqual([
                        {
                                nameAr: 'الحجم',
                                name: 'Size',
                                minSelect: 1,
                                maxSelect: 1,
                                required: true,
                                sortOrder: 0,
                                options: [
                                        { nameAr: 'كبير', name: 'Large', priceDelta: 2.5, isAvailable: true, sortOrder: 0 },
                                        { nameAr: 'صغير', name: 'Small', priceDelta: 0, isAvailable: false, sortOrder: 1 },
                                ],
                        },
                ]);
        });
});

// ── 3. copyItemsSequentially — النسخ التسلسلي الصادق ────────────────────

describe('P45-W1 — copyItemsSequentially', () => {
        const items = [item({ id: 1 }), item({ id: 2 }), item({ id: 3 })];

        it('نجاح كامل: كل الطلبات نُفذت، stoppedBy = null', async () => {
                const create = vi.fn(async (_payload: { categoryId: number }) => ({ success: true }));
                const result = await copyItemsSequentially(items, 9, create);
                expect(result).toEqual({ copied: 3, total: 3, stoppedBy: null });
                expect(create).toHaveBeenCalledTimes(3);
                // الوجهة تصل كل حمولة
                expect(create.mock.calls[0][0].categoryId).toBe(9);
        });

        it('سقف الباقة يوقف النسخ منتصف الطريق: العدد + رسالة الخادم كما هي + توقف فوري', async () => {
                const capMessage =
                        'لقد وصلت للحد الأقصى للأصناف (10) في خطة «أساسية». قم بترقية خطتك لإضافة المزيد.';
                const create = vi
                        .fn()
                        .mockResolvedValueOnce({ success: true })
                        .mockResolvedValueOnce({ success: true })
                        .mockRejectedValueOnce(new Error(capMessage));
                const result = await copyItemsSequentially(items, 9, create);
                // نُسخ اثنان، والثالث رُفض — لا محاولة رابعة (توقف عند أول فشل)
                expect(result).toEqual({ copied: 2, total: 3, stoppedBy: capMessage });
                expect(create).toHaveBeenCalledTimes(3);
        });

        it('الرسالة نفسها التي يعيدها مسار الإنشاء (تكافؤ نصّي مع PlanLimitError)', () => {
                // عقد plan-limit-error.ts: العائلة الموحدة — نفس النسخة التي
                // تظهر لزر «إضافة صنف» تظهر لتكرار الفئة عند بلوغ السقف.
                const lib = src('src/lib/plan-limit-error.ts');
                expect(lib).toContain('لقد وصلت للحد الأقصى');
                expect(lib).toContain("items: 'للأصناف'");
        });

        it('قائمة فارغة → صفر طلبات ونجاح فارغ (فئة بلا أصناف)', async () => {
                const create = vi.fn();
                const result = await copyItemsSequentially([], 9, create);
                expect(result).toEqual({ copied: 0, total: 0, stoppedBy: null });
                expect(create).not.toHaveBeenCalled();
        });

        it('رمي غير Error → يُحوَّل نصًا ولا يُبتلع', async () => {
                const create = vi.fn().mockRejectedValue('boom');
                const result = await copyItemsSequentially(items, 9, create);
                expect(result).toEqual({ copied: 0, total: 3, stoppedBy: 'boom' });
        });
});

// ── 4. عقود مصدر — الأسلاك ─────────────────────────────────────────────

describe('P45-W1 — عقود مصدر: الصفحة (page.tsx)', () => {
        const page = src('src/app/(protected)/owner/menu/page.tsx');

        it('تكرار صنف: POST عبر مسار الإنشاء القائم ثم فتح المحرر على الصف الكامل للنسخة', () => {
                expect(page).toContain('const duplicateItem = async (item: Item)');
                expect(page).toContain("csrfJson<{ data: { id: number } }>('/api/items'");
                expect(page).toContain('itemDuplicatePayload(item, item.categoryId)');
                // التحديث يجلب الصف الكامل (مع الإضافات) ثم المحرر يفتح عليه —
                // فتح المحرر على صدى POST الناقص كان سيمسح الإضافات عند الحفظ
                expect(page).toContain('const fresh = await fetchItems(item.categoryId)');
                expect(page).toContain('const copy = fresh.find((i) => i.id === newId)');
                expect(page).toContain('setItemEditing(copy)');
        });

        it('تكرار فئة: إنشاء القسم بلاحقة النسخة ثم نسخ تسلسلي عبر copyItemsSequentially', () => {
                expect(page).toContain('const duplicateCategory = async () =>');
                expect(page).toContain("csrfJson<{ data: { id: number } }>('/api/categories'");
                expect(page).toContain('withCopySuffix(target.name)');
                expect(page).toContain('copyItemsSequentially(source, newCatId');
        });

        it('توقف النسخ عند السقف يظهر برسالة الخادم + العدد الصادق', () => {
                expect(page).toContain('result.stoppedBy');
                expect(page).toContain('توقف النسخ بعد');
        });

        it('حوار التأكيد يعد بعدًا صادقًا من _count (عدّاد الخادم الكلي لا الأسطر المحمّلة)', () => {
                expect(page).toContain('duplicateCatTarget._count?.items ?? duplicateCatTarget.items?.length ?? 0');
        });

        it('fetchItems تعيد القائمة (عقد فتح المحرر على صف كامل)', () => {
                expect(page).toContain('async (catId: number): Promise<Item[]>');
                expect(page).toContain('return all;');
        });
});

describe('P45-W1 — عقود مصدر: القائمة (CategoriesList.tsx)', () => {
        const cl = src('src/app/(protected)/owner/menu/CategoriesList.tsx');

        it('زر تكرار الصنف موجود بوصولية وتعطيل أثناء تكراره', () => {
                expect(cl).toContain('onDuplicateItem(item)');
                expect(cl).toContain('تكرار ${item.name}');
                expect(cl).toContain('duplicatingItemId === item.id');
        });

        it('زر تكرار الفئة موجود بوصولية وتعطيل أثناء النسخ التسلسلي', () => {
                expect(cl).toContain('onDuplicateCategory(cat)');
                expect(cl).toContain('تكرار ${cat.name} مع أصنافه');
                expect(cl).toContain('disabled={duplicatingCat}');
        });
});

describe('P45-W1 — عقود مصدر: السقف مصدره الخادم (لا فحص مسبق من الواجهة)', () => {
        it('مسار الإنشاء يفحص maxItems داخل معاملة FOR UPDATE — العقد المُثبَت في items-contract', () => {
                const route = src('src/app/api/items/route.ts');
                expect(route).toContain('FOR UPDATE');
                expect(route).toContain('PlanLimitError');
                expect(route).toContain('existingCount >= effectiveMaxItems');
                // والواجهة لا تحمل منطق فحص سقف خاصًا بها (لا مقارنة ولا جلب خطط)
                const utils = src('src/app/(protected)/owner/menu/duplicate-utils.ts');
                expect(utils).not.toMatch(/maxItems\s*[<>=!]/);
                expect(utils).not.toMatch(/\/api\/(plans|owner\/entitlements)/);
        });

        it('إنشاء الفئة لا يسقف الأصناف (الأقسام حاويات تنظيمية — عقد categories POST)', () => {
                const route = src('src/app/api/categories/route.ts');
                expect(route).toContain('Categories are organizational containers — unlimited');
        });
});
