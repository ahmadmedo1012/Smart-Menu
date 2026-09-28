'use client';

import { Loader2 } from 'lucide-react';
import { toArabicNumber, formatPrice } from '@/lib/format';
// r121-O-1: canonical pickup labels (the local 3-entry map is deleted)
import { getPickupTypeMeta } from '@/lib/order-status';
import { Button } from '@/components/ui/button';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogDescription,
} from '@/components/ui/dialog';
import type { CartItem } from '@/store/cart';

interface ReviewDialogProps {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        items: CartItem[];
        pickupType: 'inside' | 'takeaway' | 'delivery';
        notes: string;
        total: number;
        isSubmitting: boolean;
        onCheckout: () => void;
}

/** Pre-send order review dialog — verbatim extraction from the cart page
 * (round89-G1; w3-f1 modifier summary included as-is). */
export function ReviewDialog({
        open,
        onOpenChange,
        items,
        pickupType,
        notes,
        total,
        isSubmitting,
        onCheckout,
}: ReviewDialogProps) {
        return (
                <Dialog open={open} onOpenChange={onOpenChange}>
                        <DialogContent className="rounded-md gap-0 p-0 overflow-hidden sm:max-w-md">
                                <div className="bg-gradient-to-r from-orange to-orange/80 p-5 text-white">
                                        <DialogHeader>
                                                <DialogTitle className="text-white text-xl">مراجعة الطلب</DialogTitle>
                                                <DialogDescription className="text-white/80">
                                                        تأكد من بيانات الطلب قبل الإرسال
                                                </DialogDescription>
                                        </DialogHeader>
                                </div>
                                <div className="p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">نوع الطلب:</span>
                                                <span className="font-medium px-3 py-1 rounded-full bg-orange-muted text-orange/80 dark:text-orange">
                                                        {pickupType === 'inside' ? (
                                                                <svg
                                                                        className="size-4 inline"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                >
                                                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                                        <polyline points="9 22 9 12 15 12 15 22" />
                                                                </svg>
                                                        ) : pickupType === 'takeaway' ? (
                                                                <svg
                                                                        className="size-4 inline"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                >
                                                                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                                                        <line x1="3" y1="6" x2="21" y2="6" />
                                                                        <path d="M16 10a4 4 0 0 1-8 0" />
                                                                </svg>
                                                        ) : (
                                                                <svg
                                                                        className="size-4 inline"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                >
                                                                        <rect x="1" y="3" width="15" height="13" rx="2" />
                                                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                                                </svg>
                                                        )}
                                                        {getPickupTypeMeta(pickupType).label}
                                                </span>
                                        </div>
                                        <div className="divide-y divide-border/50">
                                                {items.map((item) => (
                                                        <div key={item.id} className="flex justify-between gap-2 py-2 text-sm">
                                                                <div className="flex-1 min-w-0">
                                                                        <span className="font-medium">{item.name}</span>
                                                                        <span className="text-muted-foreground ms-1">
                                                                                × {toArabicNumber(item.quantity)}
                                                                        </span>
                                                                        {/* w3-f1: chosen modifier summary in the review dialog too
                                                                            (the cart line already shows it — the pre-send
                                                                            review must match what will actually be sent) */}
                                                                        {item.modifiersSummary && (
                                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                                        {item.modifiersSummary}
                                                                                </p>
                                                                        )}
                                                                        {item.notes && (
                                                                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                                        <svg
                                                                                                className="size-3 shrink-0"
                                                                                                viewBox="0 0 24 24"
                                                                                                fill="none"
                                                                                                stroke="currentColor"
                                                                                                strokeWidth="2"
                                                                                        >
                                                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                                        </svg>{' '}
                                                                                        {item.notes}
                                                                                </p>
                                                                        )}
                                                                </div>
                                                                <span className="tabular-nums shrink-0 font-medium">
                                                                        {formatPrice(item.price * item.quantity)}
                                                                </span>
                                                        </div>
                                                ))}
                                        </div>
                                        <div className="h-px bg-gradient-to-r from-transparent via-orange/20 to-transparent" />
                                        <div className="flex justify-between font-bold text-lg">
                                                <span>الإجمالي</span>
                                                <span className="tabular-nums text-primary">
                                                        {formatPrice(total)}
                                                </span>
                                        </div>
                                        {notes && (
                                                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                                                        <span className="text-muted-foreground font-medium">ملاحظات: </span>
                                                        <span>{notes}</span>
                                                </div>
                                        )}
                                </div>
                                <div className="flex gap-2 p-5 pt-0">
                                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                                تعديل
                                        </Button>
                                        <Button className="flex-1 gap-2" onClick={onCheckout} disabled={isSubmitting}>
                                                {isSubmitting ? (
                                                        <>
                                                                <Loader2 className="size-4 animate-spin" /> جاري...
                                                        </>
                                                ) : (
                                                        <>
                                                                <AnimatedMessageCircle className="size-4" /> تأكيد وإرسال
                                                        </>
                                                )}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
