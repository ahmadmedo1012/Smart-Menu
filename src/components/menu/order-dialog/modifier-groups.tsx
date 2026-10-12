'use client';

/**
 * 17-DEBT-SM (r147): مجموعات الخيارات (w3-f1) داخل نافذة الطلب — fieldsets
 * حقيقية بأزرار aria-pressed وعداد «المحدد» ورسالة خطأ role=alert.
 * فُصلت عن OrderDialog.tsx كما هي حرفيًا؛ حالة الاختيار/الخطأ تبقى مملوكة
 * للأب (المصدر الوحيد) وتُمرَّر كما هي — لا منطق جديد ولا إغلاقات.
 */
import type { Dispatch, SetStateAction } from 'react';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
        modifierGroupHint,
        selectedCount,
        toggleModifierOption,
        isOptionDisabled,
        type ModifierGroupProp,
        type ModifierSelection,
} from '../menu-types';
import { glassPillCard } from './constants';

type ModifierGroupsProps = {
        modGroups: ModifierGroupProp[];
        modSelection: ModifierSelection;
        modError: { groupId: number | null; message: string } | null;
        setModSelection: Dispatch<SetStateAction<ModifierSelection>>;
        setModError: Dispatch<SetStateAction<{ groupId: number | null; message: string } | null>>;
};

export function ModifierGroups({
        modGroups,
        modSelection,
        modError,
        setModSelection,
        setModError,
}: ModifierGroupsProps) {
        /* w3-f1 (F1-4/F1-9): modifier groups — rendered under the item's
                restaurant bar, BEFORE customer data (choices configure the line;
                quantity/notes operate on the configured line). Each group is a
                real fieldset/legend; option chips are aria-pressed toggles; the
                counter + price changes are announced via aria-live below. */
        if (modGroups.length === 0) return null;
        return (
                <div className="space-y-3">
                        {modGroups.map((g) => {
                                const groupName = g.nameAr || g.name;
                                const count = selectedCount(modSelection, g.id);
                                const groupError = modError?.groupId === g.id ? modError.message : null;
                                return (
                                        <fieldset
                                                key={g.id}
                                                /* r135-B: مرساة التمرير — عند فشل التحقق يُمرَّر
                                                   أول مجموعة ناقصة إلى منتصف الشاشة (handleConfirm) */
                                                id={`mod-group-${g.id}`}
                                                className={cn(glassPillCard, 'p-4')}
                                                aria-label={groupName}
                                        >
                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                        <div className="min-w-0">
                                                                <span className="text-sm font-bold">{groupName}</span>
                                                                <span className="text-2xs text-muted-foreground ms-1.5">
                                                                        {modifierGroupHint(g)}
                                                                </span>
                                                        </div>
                                                        {/* «المحدد ١/٢» counter — Western digits per app convention */}
                                                        {(g.maxSelect > 1 || g.minSelect > 0) && (
                                                                <span
                                                                        className="shrink-0 text-2xs font-medium tabular-nums text-muted-foreground bg-glass-bg/60 border border-glass-border rounded-full px-2 py-0.5"
                                                                >
                                                                        المحدد {toArabicNumber(count)}/{toArabicNumber(g.maxSelect)}
                                                                </span>
                                                        )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                        {g.options.map((o) => {
                                                                const selected = modSelection[g.id]?.includes(o.id) ?? false;
                                                                /* r135-B: الخيار النافذ (isAvailable=false) يُعرض معطّلًا لكنه
                                                                   مرئيًا مشطوبًا مع تلميح «غير متوفر» — إضافة العميل المعتادة
                                                                   يجب أن تبقى معروفة (نمط talabat/Deliveroo). الدالة النقية
                                                                   toggleModifierOption ترفضه أصلًا — هذا إظهار بصري فقط. */
                                                                const unavailable = !o.isAvailable;
                                                                const disabled = unavailable || isOptionDisabled(g, modSelection, o.id);
                                                                return (
                                                                        <button
                                                                                key={o.id}
                                                                                type="button"
                                                                                aria-pressed={selected}
                                                                                disabled={disabled}
                                                                                onClick={() => {
                                                                                        setModError(null);
                                                                                        setModSelection((prev) =>
                                                                                                toggleModifierOption(modGroups, prev, g.id, o.id)
                                                                                        );
                                                                                }}
                                                                                className={cn(
                                                                                        /* SM-D3 (19-AUDIT-SM): نصف القطر موحّد على الكانون الخاص
                                                                                           بشرائح التبديل — rounded-full مثل الملاحظات السريعة
                                                                                           ولغة شرائح المنيو (كانت rounded-xl تباينًا داخل نفس
                                                                                           النافذة). SM-D6: بلا ring خاص — عقد :focus-visible
                                                                                           العام (globals.css) هو المؤشر الوحيد. */
                                                                                        'px-3.5 min-h-11 inline-flex items-center rounded-full text-xs font-medium border transition-[background-color,border-color,color,opacity]',
                                                                                        unavailable
                                                                                                ? 'bg-glass-bg/30 border-glass-border text-muted-foreground opacity-50 cursor-not-allowed'
                                                                                                : selected
                                                                                                  /* r95: الشريحة المحددة — نص accent-foreground الأسطع (AA 5.42:1) */
                                                                                                        ? 'bg-orange/10 border-orange/40 text-accent-foreground'
                                                                                                        : 'bg-glass-bg/30 border-glass-border text-muted-foreground hover:border-orange/30 hover:text-foreground',
                                                                                        // gentle maxSelect ceiling: not-selected options dim at capacity
                                                                                        disabled && !unavailable && 'opacity-40 cursor-not-allowed'
                                                                                )}
                                                                        >
                                                                                <span className="inline-flex items-center gap-1">
                                                                                        <span className={cn(unavailable && 'line-through')}>{o.nameAr || o.name}</span>
                                                                                        {unavailable && (
                                                                                                <span className="text-2xs font-medium">غير متوفر</span>
                                                                                        )}
                                                                                </span>
                                                                                {/* r121 (H-1): سحب decimals:1 من فروق الخيارات — «+2.0» صارت
                                                                                    «+2» و«0.25» تبقى «0.25» بدل تدويرها إلى «0.3». */}
                                                                                {o.priceDelta !== 0 && (
                                                                                        <span
                                                                                                className={cn(
                                                                                                        'ms-1.5 tabular-nums font-bold',
                                                                                                        /* r138 (P1-1): دلتا سالبة — success-ink
                                                                                                           في الفاتح 9.1:1 (كان 2.87:1). */
                                                                                                        o.priceDelta > 0 ? 'text-accent-foreground' : 'text-success-ink'
                                                                                                )}
                                                                                        >
                                                                                                {o.priceDelta > 0
                                                                                                        ? `+${formatPrice(o.priceDelta, { suffix: '' })}`
                                                                                                        : formatPrice(o.priceDelta, { suffix: '' })}
                                                                                        </span>
                                                                                )}
                                                                        </button>
                                                                );
                                                        })}
                                                </div>
                                                {/* F1-6: required-group blocker — role=alert so SR users hear it */}
                                                {groupError && (
                                                        /* r138 (P1-1): danger-ink في الفاتح 10.75:1
                                                           (كان destructive 3.06:1) — الداكن كما هو. */
                                                        <p role="alert" className="text-2xs font-medium text-danger-ink mt-2.5">
                                                                {groupError}
                                                        </p>
                                                )}
                                        </fieldset>
                                );
                        })}
                </div>
        );
}
