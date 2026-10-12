/**
 * 17-DEBT-SM (r147): العقود المشتركة لنافذة الطلب — فُصلت عن OrderDialog.tsx
 * ضمن موجة تفكيك الديون الهندسية. الأب (OrderDialog.tsx) هو مستهلكها الوحيد
 * والمسار العام للتصدير كما هو — لا تغيير على أي مستهلك.
 */
import type { MenuItemProp } from '../MenuItemCard';

export type OrderDialogProps = {
        item: MenuItemProp | null;
        open: boolean;
        onOpenChange: (open: boolean) => void;
        restaurantWhatsapp?: string;
        restaurantName?: string;
        restaurantId: number;
        restaurantLogo?: string;
        /* r137: رسوم توصيل المطعم (رقم أو null — الميزة مطفأة) — تسمية
           خيار التوصيل. */
        deliveryFee?: number | null;
};
