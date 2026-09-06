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
import { Clock, ChefHat, PackageCheck, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';
import { csrfJson } from '@/lib/csrf-client';
import { buildOrderShareText } from '@/lib/receipt';

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
        createdAt: string;
        items: {
                id: number;
                quantity: number;
                price: number;
                item: { name: string; nameAr: string | null };
        }[];
        restaurant: { id: number; name: string; slug: string } | null;
}

export const STATUS_FLOW = ['new', 'preparing', 'ready', 'completed'] as const;

export const STATUS_CONFIG: Record<
        string,
        { label: string; icon: LucideIcon; color: string; bg: string }
> = {
        new: {
                label: 'جديد',
                icon: Clock,
                color: 'text-orange dark:text-orange',
                bg: 'bg-orange-muted dark:bg-orange-muted',
        },
        preparing: {
                label: 'قيد التحضير',
                icon: ChefHat,
                color: 'text-saffron dark:text-saffron',
                bg: 'bg-saffron-muted dark:bg-saffron-muted',
        },
        ready: {
                label: 'جاهز',
                icon: PackageCheck,
                color: 'text-teal dark:text-teal',
                bg: 'bg-teal-muted dark:bg-teal-muted',
        },
        completed: {
                label: 'مكتمل',
                icon: CheckCircle,
                color: 'text-success dark:text-success',
                bg: 'bg-success-muted dark:bg-success-muted',
        },
        cancelled: {
                label: 'ملغي',
                icon: XCircle,
                color: 'text-destructive',
                bg: 'bg-destructive/15',
        },
};

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
                                if (!cancelled) setError('فشل تحميل الطلب');
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
        return body.data ?? (body as unknown as OrderDetailData);
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
