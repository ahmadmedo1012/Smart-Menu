'use client';
/*
 * P45-W1 (البند 3 — تكرار فئة/صنف): النقي المشترك لمساري التكرار.
 *
 * نمط W6-B6/menu-reorder نفسه: المنطق الصافي القابل للاختبار يعيش هنا
 * (يستورده جيش vitest حقيقيًا)، وصفحة المالك تتولى الأسلاك فقط (fetch/
 * dialogs/toasts) — لا يوجد harness jsdom لصفحات المالك في المستودع
 * (عقد w6-b6-menu-reorder.test.ts §3).
 *
 * عقد السقف (الخيار الصادق الموثق): النسخ يعتمد على فحص سقف maxItems
 * داخل معاملة إنشاء الصنف نفسها (items/route.ts:289-316 — FOR UPDATE ثم
 * العد ثم الرفض 403 برسالة الخطة العربية) — لا فحصًا مسبقًا من الواجهة
 * (قيمة السقف لا تملكها الواجهة أصلًا، وأي نسخة منها تنجرف). عند الرفض
 * تتوقف الحلقة فورًا مع الرسالة كما هي + عدد ما نُسخ فعلًا: القسم الجديد
 * يبقى بما اتسع له فقط — حالة صادقة يراها المالك ويتصرف فيها، لا وعدًا
 * كاذبًا بنسخة كاملة.
 */

import type { ModifierGroupPayload } from '@/components/owner/ItemDialog';
import type { Item } from './types';

/** لاحقة النسخة — تُلحق بالاسمين (العربي والإنجليزي) معًا. */
export const COPY_SUFFIX = ' (نسخة)';

/** سقف عمود الاسم في المخطط (name/nameAr كلاهما max(100) — zod POST). */
export const NAME_MAX = 100;

/**
 * «X (نسخة)» مع احترام سقف العمود: الاسم الأصلي يُقتطع إلى (السقف − طول
 * اللاحقة) كي لا يُرفض النسخ بـ422 على أسماء بطول 94+ — نتيجة الاقتطاع
 * اسم فريد صالح دائمًا (السلوك موثق هنا لا صامت).
 */
export function withCopySuffix(name: string, max = NAME_MAX): string {
        const cap = Math.max(0, max - COPY_SUFFIX.length);
        return `${name.slice(0, cap).trimEnd()}${COPY_SUFFIX}`;
}

/**
 * خرائط مجموعات الإضافات المسلسلة (من GET /api/items) إلى حمولة POST —
 * المعرفات تُهمل خادميًا (استراتيجية إنشاء جديدة، modifier-schema.ts)،
 * وpriceDelta يصل نصًا عبر JSON فيُطبّع رقمًا.
 */
export function modifierGroupsCopyPayload(item: Item): ModifierGroupPayload[] {
        return (item.modifierGroups ?? []).map((g) => ({
                nameAr: g.nameAr,
                name: g.name,
                minSelect: g.minSelect,
                maxSelect: g.maxSelect,
                required: g.required,
                sortOrder: g.sortOrder,
                options: g.options.map((o) => ({
                        nameAr: o.nameAr,
                        name: o.name,
                        priceDelta: Number(o.priceDelta),
                        isAvailable: o.isAvailable,
                        sortOrder: o.sortOrder,
                })),
        }));
}

/**
 * جسم POST /api/items لتكرار صنف: كل حقوله كما هي (بما فيها الجدولة
 * والخيارات والشارات المميزة) ما عدا الاسمين باللاحقة. عقد round88-C
 * محفوظ: نسخة غير مميزة تُرسل الرتبة/الشارات غير مُرسَلة (undefined)
 * لا صفرية — لكن الأصل غير المميز لا يحمل رتبة أصلًا فالتطابق تام.
 */
export function itemDuplicatePayload(item: Item, targetCategoryId: number) {
        return {
                name: withCopySuffix(item.name),
                nameAr: item.nameAr ? withCopySuffix(item.nameAr) : undefined,
                description: item.description || undefined,
                descriptionAr: item.descriptionAr || undefined,
                price: item.price,
                discountedPrice: item.discountedPrice ?? undefined,
                image: item.image || undefined,
                status: item.status,
                categoryId: targetCategoryId,
                dietaryTags: item.dietaryTags ?? [],
                allergens: item.allergens ?? [],
                isFeatured: item.isFeatured ?? false,
                featuredRank: item.isFeatured ? (item.featuredRank ?? null) : undefined,
                showcaseTags: item.isFeatured ? (item.showcaseTags ?? []) : undefined,
                availableFrom: item.availableFrom ?? null,
                availableTo: item.availableTo ?? null,
                availableDays: item.availableDays ?? null,
                modifierGroups: modifierGroupsCopyPayload(item),
        };
}

export interface CopyItemsResult {
        /** عدد الأصناف التي نُسخت فعلًا قبل التوقف. */
        copied: number;
        /** العدد المطلوب نسخه (طول القائمة المدخلة). */
        total: number;
        /** رسالة الخادم من أول فشل (سقف الباقة أو غيره) — null عند النجاح الكامل. */
        stoppedBy: string | null;
}

/**
 * نسخ تسلسلي صادق: صنف واحد في كل طلب (كل POST يعيد فحص السقف داخل
 * معاملته — العدّ تحت القفل هو مصدر الحقيقة الوحيد). يتوقف عند أول فشل
 * ويعيد ما نُسخ + رسالة الخادم كما هي — لا محاولة تخطٍّ ولا تراجع يدوي.
 */
export async function copyItemsSequentially(
        items: readonly Item[],
        targetCategoryId: number,
        create: (payload: ReturnType<typeof itemDuplicatePayload>) => Promise<unknown>
): Promise<CopyItemsResult> {
        let copied = 0;
        for (const item of items) {
                try {
                        await create(itemDuplicatePayload(item, targetCategoryId));
                        copied += 1;
                } catch (e) {
                        return {
                                copied,
                                total: items.length,
                                stoppedBy: e instanceof Error ? e.message : String(e ?? ''),
                        };
                }
        }
        return { copied, total: items.length, stoppedBy: null };
}
