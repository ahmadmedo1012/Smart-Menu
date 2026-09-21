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
        onUpdateQuantity: (id: string, qty: number) => void;
        onRemove: (id: string) => void;
        onUpdateNotes: (id: string, notes: string) => void;
}

/** One cart line — verbatim JSX extracted from the cart page (round89-G1). */
export function CartLineItem({
        item,
        index,
        animateItems,
        onUpdateQuantity,
        onRemove,
        onUpdateNotes,
}: CartLineItemProps) {
        return (
                <div
                        className={cn(
                                'rounded-md bg-card/60 border border-border/30 p-4 transition-[opacity,transform,translate,scale,rotate,box-shadow,border-color] duration-500 hover:border-orange/20 hover:shadow-lg hover:-translate-y-0.5',
                                animateItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        )}
                        style={{ transitionDelay: `${index * 80}ms` }}
                >
                        <div className="flex items-center justify-between mb-3 gap-2">
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-primary tabular-nums">
                                                        {toArabicNumber(item.quantity)}
                                                </span>
                                        </div>
                                        <div>
                                                <h3 className="font-semibold truncate">{item.name}</h3>
                                                {/* w3-f1: chosen modifier summary for this line */}
                                                {item.modifiersSummary && (
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                                                {item.modifiersSummary}
                                                        </p>
                                                )}
                                                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                                        {formatPrice(item.price, { decimals: 1 })} / للواحد
                                                </p>
                                        </div>
                                </div>
                                <div className="flex items-center gap-1">
                                        <button
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                className="size-11 rounded-md border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-[transform,translate,scale,rotate,background-color,border-color] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60 disabled:opacity-40 disabled:pointer-events-none"
                                                aria-label={`إنقاص كمية ${item.name}`}
                                        >
                                                <MotionMinus className="size-4" />
                                        </button>
                                        <span className="w-8 sm:w-10 text-center font-bold tabular-nums text-sm sm:text-lg">
                                                {toArabicNumber(item.quantity)}
                                        </span>
                                        <button
                                                type="button"
                                                disabled={item.quantity >= MAX_ITEM_QUANTITY} onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                className="size-11 rounded-md border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-[transform,translate,scale,rotate,background-color,border-color] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60 disabled:opacity-40 disabled:pointer-events-none"
                                                aria-label={`زيادة كمية ${item.name}`}
                                        >
                                                <MotionPlus className="size-4" />
                                        </button>
                                        <button
                                                type="button"
                                                onClick={() => onRemove(item.id)}
                                                className="size-11 rounded-[4px] border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-[transform,translate,scale,rotate,background-color] ms-1 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                aria-label={`حذف الصنف ${item.name}`}
                                        >
                                                <AnimatedTrash className="size-3" />
                                        </button>
                                </div>
                        </div>
                        <input
                                type="text"
                                placeholder="ملاحظات للصنف..."
                                aria-label={`ملاحظات للصنف ${item.name}`}
                                value={item.notes}
                                maxLength={500}
                                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                                className="w-full h-9 rounded-[4px] border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20"
                        />
                </div>
        );
}
