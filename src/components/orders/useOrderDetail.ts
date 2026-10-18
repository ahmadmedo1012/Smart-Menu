'use client';

/**
 * round85-C3 — shared logic for the order-detail pages.
 *
 * owner/orders/[id] and admin/orders/[id] previously duplicated ~260 lines of
 * identical data logic (types, status flow/config, fetch, status mutation,
 * clipboard share). The pages keep their distinct JSX (owner has the polished
 * skeleton/error/a11y treatment; admin adds the restaurant context card) but
 * now share this single logic spine.
 */
import { useEffect, useState } from 'react';
import { csrfJson } from '@/lib/csrf-client';
import { buildOrderShareText } from '@/lib/receipt';
// r121-A-3/I-1: the bespoke saffron/teal status map that used to live here (a
// third parallel palette besides lib/order-status's semantic tokens and the
// admin list's orange map) is deleted — this shared owner+admin detail spine
// now speaks the lib's tokens, so both dashboards render the same status in
// the same color. STATUS_FLOW is derived from the lib's `.next` chain instead
// of being re-declared by hand.
import { ORDER_STATUS_META } from '@/lib/order-status';

export interface OrderDetailData {
        id: number;
        orderNo: string;
        customerName: string;
        customerPhone: string;
        notes: string;
        pickupType: string;
        status: string;
        subtotal: number;
        total: number;
        // r138 (W5-C3): الرسوم المسجلة على الصف (Decimal يسلسل سلسلة عبر JSON،
        // أو null لصفوف ما قبل r138) — تصل نسخة الواتساب/الملخص عبر هذا
        // الحقل. العرض يقيّمها بـ Number() مع حارس null (لا قيمة مُختَرعة).
        deliveryFee?: number | string | null;
        createdAt: string;
        items: {
                id: number;
                quantity: number;
                price: number;
                /* W6-B3 (تذكرة المطبخ): حقول لقطة السطر التي تعيدها GET
                   /api/orders/[id] أصلاً (include في Prisma يُبقي كل أعمدة
                   OrderItem العددية — notes/modifiersJson) — اختيارية كي
                   تبقى الأشكال القديمة/الاختبارية مترجمة؛ التذكرة تقرؤها
                   بسقوط آمن لقيمة فارغة (لا أسطر مُختلقة). */
                notes?: string | null;
                modifiersJson?: string | null;
                item: { name: string; nameAr: string | null };
        }[];
        restaurant: { id: number; name: string; slug: string } | null;
}

export const STATUS_FLOW: string[] = (() => {
        const flow: string[] = [];
        let cur: string | null = 'new';
        while (cur) {
                flow.push(cur);
                cur = ORDER_STATUS_META[cur]?.next ?? null;
        }
        return flow;
})();

/** Fetch an order by id — owner-grade error handling (404 → friendly message). */
export function useOrderDetail(id: string) {
        const [order, setOrder] = useState<OrderDetailData | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        useEffect(() => {
                // round86-C6: cancellation flag — quick navigation A→B let A's late
                // response overwrite B's data (same fix useActiveRestaurant has)
                let cancelled = false;
                setLoading(true);
                setError(null);
                fetch(`/api/orders/${id}`)
                        .then((r) => {
                                if (!r.ok) throw new Error('الطلب غير موجود');
                                return r.json();
                        })
                        .then((d) => {
                                if (!cancelled) setOrder(d.data ?? d);
                        })
                        .catch(() => {
                                if (!cancelled) setError('تعذّر تحميل الطلب');
                        })
                        .finally(() => {
                                if (!cancelled) setLoading(false);
                        });
                return () => {
                        cancelled = true;
                };
        }, [id]);

        return { order, setOrder, loading, error };
}

/** PUT the new status and return the updated order (throws on failure). */
export async function updateOrderStatus(
        id: string,
        status: string
): Promise<OrderDetailData> {
        // round89-E6: csrfJson replaces the manual ok-check — a rejected PUT now
        // throws the server's Arabic envelope message (e.g. 429 «محاولات كثيرة
        // جداً. حاول لاحقاً.») instead of a raw `HTTP <status>`, matching the
        // other 7 csrfJson call sites (dx-1 ب-5 pattern #5).
        const body = await csrfJson<{ data?: OrderDetailData }>(`/api/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
        });
        // round97-X3: the response was double-cast (`body as unknown as
        // OrderDetailData`) — a malformed body flowed silently into the page
        // state. The envelope's `data` is the contract (success() in the PUT
        // route); the legacy raw-object tolerance is kept but narrowed by
        // shape, and genuinely malformed bodies now throw a typed error the
        // pages' existing catch block toasts.
        if (body.data) return body.data;
        const legacy = body as Partial<OrderDetailData>;
        if (typeof legacy.id === 'number' && typeof legacy.orderNo === 'string') {
                return legacy as OrderDetailData;
        }
        throw new Error('تعذّر تحديث حالة الطلب');
}

/**
 * Copy the order's WhatsApp share text. `withRestaurant` prefixes the
 * restaurant name line (admin context); returns the clipboard promise.
 */
export function copyOrderShareText(order: OrderDetailData, withRestaurant: boolean) {
        const body = buildOrderShareText(order);
        const restaurantLine = withRestaurant && order.restaurant?.name
                ? `🏪 ${order.restaurant.name}\n`
                : '';
        const text = restaurantLine + body;
        return navigator.clipboard.writeText(text);
}
