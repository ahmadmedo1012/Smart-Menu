'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * r110-F11 — تأكيد قبل استبدال سلة مطعم آخر.
 *
 * المتجر (store/cart.ts) يمنع خلط مطعمين منذ r103-N3، لكنه يفعل ذلك
 * بإفراغ السلة الحالية فورًا وبصمت لحظة إضافة صنف من مطعم مختلف:
 * عميل بنى سلة في «أ» ثم تجوّل إلى «ب» وضغط إضافة — اختفت أصناف «أ»
 * بلا سؤال (إشعار معلومات واحد بعد الفعل لا يحمي من إتلاف بيانات
 * أدخلها المستخدم). هذا المكوّن يحوّل الفعل الإتلافي إلى قرار صريح:
 * رسالة تُسمّي المطعمين + عدد الأصناف المفقودة، وزرا «إلغاء / متابعة».
 * المتجر يبقى الطرف المُنفّذ (addItem يعمل reset متسقًا كما هو) —
 * هذا المكوّن موافقة مسبقة فقط، فلا ازدواجية في منطق الاستبدال.
 *
 * الاستخدام: MenuPageClient يعترض الإضافة السريعة وفتح نافذة الصنف
 * عند تغيّر المطعم، يخزّن الفعل المؤجل، ويعرض هذا الحوار. عند
 * «متابعة» يُنفَّذ الفعل المؤجل (فيقوم المتجر بالاستبدال)؛ عند
 * «إلغاء» لا يلمس السلة إطلاقًا.
 */

export type CartSwitchInfo = {
        /** اسم/عدد أصناف السلة الحالية التي ستُفرغ. */
        fromRestaurantName: string;
        itemCount: number;
        /** المطعم الذي سيصبح صاحب السلة الجديدة. */
        toRestaurantName: string;
};

/**
 * قرار الحارس (نقي ومُختبَر): هل إضافة صنف من targetRestaurantId ستُفرغ
 * سلة مطعم آخر؟ — نفس شرط الاستبدال في store/cart.ts addItem، مقروءًا
 * قبل الفعل لعرض التأكيد. cart يُمرّر كـ getState() كاملًا؛ الحقول المستخدمة
 * فقط items/restaurantId حتى يظل التوقيع مستقرًا.
 */
export function willReplaceOtherRestaurantCart(
        cart: { items: unknown[]; restaurantId: number },
        targetRestaurantId: number
): boolean {
        return (
                cart.items.length > 0 &&
                cart.restaurantId !== 0 &&
                cart.restaurantId !== targetRestaurantId
        );
}

export function CartSwitchDialog({
        pending,
        onConfirm,
        onCancel,
}: {
        pending: CartSwitchInfo | null;
        onConfirm: () => void;
        onCancel: () => void;
}) {
        return (
                <Dialog open={pending !== null} onOpenChange={(o) => !o && onCancel()}>
                        <DialogContent showCloseButton={false}>
                                <DialogHeader>
                                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange/10 mb-1" aria-hidden="true">
                                                <AlertTriangle className="size-6 text-orange" />
                                        </div>
                                        <DialogTitle className="text-center">تغيير المطعم؟</DialogTitle>
                                        <DialogDescription className="text-center leading-relaxed">
                                                {pending
                                                        ? `سلتك الحالية تحتوي ${pending.itemCount === 1 ? 'صنفًا واحدًا' : `${pending.itemCount} أصناف`} من «${pending.fromRestaurantName}». إضافة صنف من «${pending.toRestaurantName}» ستفرغ السلة الحالية وتبدأ سلة جديدة لهذا المنيو.`
                                                        : ''}
                                        </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2 sm:justify-center">
                                        <Button variant="outline" onClick={onCancel} autoFocus>
                                                إلغاء
                                        </Button>
                                        <Button variant="orange" onClick={onConfirm}>
                                                متابعة وبدء سلة جديدة
                                        </Button>
                                </DialogFooter>
                        </DialogContent>
                </Dialog>
        );
}
