'use client';

import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { MotionMinus, MotionPlus } from '@/components/ui/motion-icons';
import AnimatedTrash from '@/components/ui/trash-icon';
import type { CartItem } from '@/store/cart';
import { MAX_ITEM_QUANTITY } from '@/lib/constants';

interface CartLineItemProps {
        /** Cart line (item + modifier choices + notes) rendered by the page's items.map. */
        item: CartItem;
        /** Position in the list — drives the staggered entrance delay. */
        index: number;
        animateItems: boolean;
        /* r139 (J5): الخادم رفض الصنف عند الإرسال (نافد/مخفية) — شارة حمراء
           وتعطيل عناصر التحكم وإبقاء الحذف: الفعل الوحيد المتبقي للسطر. */
        unavailable?: boolean;
        onUpdateQuantity: (id: string, qty: number) => void;
        onRemove: (id: string) => void;
        onUpdateNotes: (id: string, notes: string) => void;
}

/** One cart line — verbatim JSX extracted from the cart page (round89-G1). */
export function CartLineItem({
        item,
        index,
        animateItems,
        unavailable = false,
        onUpdateQuantity,
        onRemove,
        onUpdateNotes,
}: CartLineItemProps) {
        return (
                <div
                        className={cn(
                                'rounded-md bg-card/60 border border-border/30 p-4 transition-[opacity,transform,translate,scale,rotate,box-shadow,border-color] duration-slower hover:border-orange/20 hover:shadow-lg hover:-translate-y-0.5',
                                animateItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                                /* r139 (J5): السطر الموسوم من الخادم — إطار خطر واضح
                                   (لا يعتمد على اللون وحده: الشارة النصية معه). */
                                unavailable && 'border-destructive/50 bg-destructive/5 hover:border-destructive/50'
                        )}
                        style={{ transitionDelay: `${index * 80}ms` }}
                >
                        <div className="flex items-center justify-between mb-3 gap-2">
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                        <div
                                                className={cn(
                                                        'size-10 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center shrink-0',
                                                        /* r139 (J5): عدّاد الكمية يخفت مع وسم السطر — */
                                                        unavailable && 'opacity-50'
                                                )}
                                        >
                                                {/* r148 (CROSS R2) → Phase 5 (r152): كان text-primary — في الفاتح كان
                                                    نحاسًا 3.8:1 على أرضية البطاقة البيضاء تحت سقف 4.5 للنص الصغير.
                                                    accent-foreground = التراكوتا العميق #8A2B1D في الفاتح (8.05:1)
                                                    والتراكوتا المضيء #E07856 في الداكن — AA في الوضعين. */}
                                                <span className="text-sm font-bold text-accent-foreground tabular-nums">
                                                        {toArabicNumber(item.quantity)}
                                                </span>
                                        </div>
                                        <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                        <h3 className="font-semibold truncate">{item.name}</h3>
                                                        {/* r139 (J5): شارة الرفض الخادمي — توست الرسالة يسمّي
                                                           الأصناف، والشارة تجد السطر في السلة بلا صيد. */}
                                                        {unavailable && (
                                                                <span className="inline-flex items-center rounded-md bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 text-2xs font-bold text-danger-ink shrink-0">
                                                                        لم يعد متوفرًا
                                                                </span>
                                                        )}
                                                </div>
                                                {/* w3-f1: chosen modifier summary for this line */}
                                                {item.modifiersSummary && (
                                                        <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-2">
                                                                {item.modifiersSummary}
                                                        </p>
                                                )}
                                                {/* Phase 5 (r152): قائد النقاط — سطر سعر الوحدة على
                                                    * طراز المنيو المطبوع (dotted leader قبل «للواحد»). */}
                                                <p className="text-xs text-muted-foreground tabular-nums mt-0.5 menu-leader">
                                                        {/* r121 (H-1): decimals:1 كان يعرض «8.0 / للواحد» ويقرّب
                                                            7.25 إلى «7.3» — الافتراضي الذكي (r120). */}
                                                        <span>{formatPrice(item.price)}</span>
                                                        <i className="menu-leader-rule" aria-hidden="true" />
                                                        <span>/ للواحد</span>
                                                </p>
                                        </div>
                                </div>
                                <div className="flex items-center gap-1">
                                        {/* r131 (A2 P1-2): سجلّ الضغط موحّد — 0.97@80ms للأزرار
                                           (كان scale-90 على الثلاثة)؛ قائمة الانتقال محدّدة. */}
                                        <button
                                                type="button"
                                                /* r139 (J5): السطر النافد لا يُعدَّل — تعديل كمية صنف
                                                   رفضه الخادم ضجيج؛ الحذف هو الفعل الوحيد. */
                                                disabled={unavailable || item.quantity <= 0}
                                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                className="size-11 rounded-md border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-[transform,background-color,border-color] active:scale-[0.97] active:duration-[var(--t-micro,80ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
                                                aria-label={`إنقاص كمية ${item.name}`}
                                        >
                                                <MotionMinus className="size-4" />
                                        </button>
                                        <span className="w-8 sm:w-10 text-center font-bold tabular-nums text-sm sm:text-lg">
                                                {toArabicNumber(item.quantity)}
                                        </span>
                                        <button
                                                type="button"
                                                disabled={unavailable || item.quantity >= MAX_ITEM_QUANTITY} onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                className="size-11 rounded-md border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-[transform,background-color,border-color] active:scale-[0.97] active:duration-[var(--t-micro,80ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40 disabled:pointer-events-none"
                                                aria-label={`زيادة كمية ${item.name}`}
                                        >
                                                <MotionPlus className="size-4" />
                                        </button>
                                        <button
                                                type="button"
                                                onClick={() => onRemove(item.id)}
                                                className="size-11 rounded-sm border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-[transform,background-color] ms-1 active:scale-[0.97] active:duration-[var(--t-micro,80ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                aria-label={`حذف الصنف ${item.name}`}
                                        >
                                                <AnimatedTrash className="size-3" />
                                        </button>
                                </div>
                        </div>
                        {/* r131 (A2 P1-3): مدخل الملاحظات — أرضية 44px/16px (منع تكبير iOS)
                           + حلقة التركيز القانونية 3px/22% (‏--state-input-focus-halo)
                           بدل ring-4/60؛ كان h-9/36px + 13px. */}
                        <input
                                type="text"
                                placeholder="ملاحظات للصنف…"
                                aria-label={`ملاحظات للصنف ${item.name}`}
                                value={item.notes}
                                maxLength={500}
                                /* r139 (J5): ملاحظات صنف نافد لن تُرسل أبدًا. */
                                disabled={unavailable}
                                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                                className="w-full h-11 rounded-md border border-input bg-transparent px-3 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]"
                        />
                </div>
        );
}
