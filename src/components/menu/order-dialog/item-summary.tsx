'use client';

/**
 * 17-DEBT-SM (r147): كتلة تعريف الصنف داخل نافذة الطلب — العنوان بلا صورة
 * + الوصف الكامل بلا قصّ + شرائح الحمية/الحساسية. فُصلت عن OrderDialog.tsx
 * كما هي حرفيًا؛ اشتقاق displayDesc/hasDietaryInfo انتقل معها (كان حكرًا
 * على هذه الكتلة وحدَها في الأب).
 */
import { AlertTriangle } from 'lucide-react';
/* r135-B: شرائح الحمية/الحساسية — نفس مصدر البطاقة الواحد (round85-C5) */
import { DIETARY_LABELS, ALLERGEN_LABELS } from '@/lib/dietary';
import { DietaryIcon } from '../dietary-icons';
import { contentLang } from '@/lib/format';
import type { MenuItemProp } from '../MenuItemCard';

export function ItemSummary({
        item,
        displayName,
}: {
        item: MenuItemProp;
        displayName: string;
}) {
        /* r135-B: الوصف الكامل + علم وجود شرائح الحمية/الحساسية — تُعرض أعلى
         * المحتوى (انظر أسفل)؛ نافذة الطلب هي المكان الوحيد الذي يجب أن يُقرأ
         * فيه النص الطويل دون قصّ (البطاقة تقصّه إلى سطرين). */
        const displayDesc = (item.descriptionAr || item.description || '').trim();
        const hasDietaryInfo =
                (item.dietaryTags?.length ?? 0) > 0 || (item.allergens?.length ?? 0) > 0;
        return (
                <>
                        {!item.image && (
                                <div className="text-center pb-2">
                                        <h3 lang={contentLang(item.nameAr)} className="text-xl font-bold mb-1">{displayName}</h3>
                                </div>
                        )}

                        {/* r135-B: وصف الصنف كاملًا (بلا قصّ) + شرائح الحمية
                                ومسببات الحساسية بنمط البطاقة نفسه — إظهار مسببات
                                الحساسية قبل الطلب ممارسة عالمية (EU-FIC) ولا مكان
                                أنسب من هنا حيث يُحسم القرار. */}
                        {(displayDesc || hasDietaryInfo) && (
                                <div className="space-y-2">
                                        {displayDesc && (
                                                <p lang={contentLang(item.descriptionAr)} className="text-sm leading-relaxed text-muted-foreground">
                                                        {displayDesc}
                                                </p>
                                        )}
                                        {hasDietaryInfo && (
                                                /* r138 (P1-1): أحبار الرقائق النصية في الفاتح —
                                                   basil-ink/warning-ink ≥4.5:1 (كانت 2.6-2.7:1)
                                                   والداكن كما هو (8-11:1). */
                                                <div className="flex flex-wrap gap-1.5">
                                                        {item.dietaryTags?.map((tag) => (
                                                                <span
                                                                        key={tag}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-basil/20 bg-basil/10 px-2 py-0.5 text-2xs text-basil-ink"
                                                                >
                                                                        <DietaryIcon tag={tag} className="size-3 shrink-0" />
                                                                        {DIETARY_LABELS[tag] || tag}
                                                                </span>
                                                        ))}
                                                        {item.allergens?.map((tag) => (
                                                                <span
                                                                        key={tag}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-2xs text-warning-ink"
                                                                >
                                                                        <AlertTriangle
                                                                                className="size-3 text-warning-ink"
                                                                                aria-hidden="true"
                                                                        />{' '}
                                                                        {ALLERGEN_LABELS[tag] || tag}
                                                                </span>
                                                        ))}
                                                </div>
                                        )}
                                </div>
                        )}
                </>
        );
}
