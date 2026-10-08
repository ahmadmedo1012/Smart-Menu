/**
 * Single source of truth for order presentation across owner + admin pages:
 * status metadata, pickup-type metadata, and Arabic relative time.
 *
 * r131-F5 (A1 P0-5, fleet ruling "status = solid pastel -bg/-deep chips"):
 * badges/wells ride the SOLID pastel family pairs — semantic -soft ground
 * (= --c-*-bg pastel) + -ink text (dark = luminous ink on the deep ground,
 * light = -deep ink on the pastel ground; the tokens flip per theme in
 * globals.css, so no dark: variants are needed). The old /15 translucent
 * washes with base-ink text are retired.
 */
import {
        Clock,
        ChefHat,
        PackageCheck,
        CheckCircle,
        XCircle,
        Utensils,
        ShoppingBag,
        Bike,
        type LucideIcon,
} from 'lucide-react';
import { getArabicPlural } from '@/lib/arabic-plural';
import { toArabicNumber, formatDate } from '@/lib/format';

export interface OrderStatusMeta {
        /** Arabic label shown in badges, toasts, and the detail timeline. */
        label: string;
        icon: LucideIcon;
        /** Solid pastel family classes for <Badge> (soft ground + ink text). */
        badgeClassName: string;
        /** Same palette for the leading status square behind the icon. */
        toneClassName: string;
        /** Next lifecycle step, or null once terminal (completed/cancelled). */
        next: string | null;
}

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
        new: {
                label: 'جديد',
                icon: Clock,
                badgeClassName: 'bg-[var(--warning-soft)] text-[var(--warning-ink)]',
                toneClassName: 'bg-[var(--warning-soft)] text-[var(--warning-ink)]',
                next: 'preparing',
        },
        preparing: {
                label: 'قيد التحضير',
                icon: ChefHat,
                badgeClassName: 'bg-[var(--info-soft)] text-[var(--info-ink)]',
                toneClassName: 'bg-[var(--info-soft)] text-[var(--info-ink)]',
                next: 'ready',
        },
        ready: {
                label: 'جاهز',
                icon: PackageCheck,
                badgeClassName: 'bg-[var(--success-soft)] text-[var(--success-ink)]',
                toneClassName: 'bg-[var(--success-soft)] text-[var(--success-ink)]',
                next: 'completed',
        },
        completed: {
                label: 'مكتمل',
                icon: CheckCircle,
                badgeClassName: 'bg-[var(--success-soft)] text-[var(--success-ink)]',
                toneClassName: 'bg-[var(--success-soft)] text-[var(--success-ink)]',
                next: null,
        },
        cancelled: {
                label: 'ملغي',
                icon: XCircle,
                badgeClassName: 'bg-[var(--danger-soft)] text-[var(--danger-ink)]',
                toneClassName: 'bg-[var(--danger-soft)] text-[var(--danger-ink)]',
                next: null,
        },
};

/** Fallback for unknown statuses coming from older rows. */
export function getOrderStatusMeta(status: string): OrderStatusMeta {
        return ORDER_STATUS_META[status] ?? ORDER_STATUS_META.new;
}

export interface PickupTypeMeta {
        label: string;
        icon: LucideIcon;
}

export const PICKUP_TYPE_META: Record<string, PickupTypeMeta> = {
        inside: { label: 'داخل المكان', icon: Utensils },
        takeaway: { label: 'سفري', icon: ShoppingBag },
        delivery: { label: 'توصيل', icon: Bike },
};

export function getPickupTypeMeta(pickupType: string): PickupTypeMeta {
        return PICKUP_TYPE_META[pickupType] ?? PICKUP_TYPE_META.inside;
}

/**
 * Arabic relative time with Western digits (project convention):
 *   < 60s   → "الآن"
 *   minutes → "قبل دقيقتين" / "قبل 5 دقائق" / "قبل 15 دقيقة"
 *   hours   → "قبل ساعتين" / "قبل 3 ساعات"
 *   days    → "قبل يومين" / "قبل 3 أيام"
 *   ≥ 30d   → absolute Arabic date fallback
 * Clock skew (future timestamps) clamps to "الآن".
 */
export function formatRelativeTimeAr(iso: string | Date, now: Date = new Date()): string {
        const date = typeof iso === 'string' ? new Date(iso) : iso;
        const time = date.getTime();
        if (Number.isNaN(time)) return '';

        const diffSeconds = Math.floor((now.getTime() - time) / 1000);
        if (diffSeconds < 60) return 'الآن';

        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 60) {
                return `قبل ${toArabicNumber(minutes)} ${getArabicPlural(minutes, 'دقيقة', {
                        two: 'دقيقتين',
                        few: 'دقائق',
                })}`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
                return `قبل ${toArabicNumber(hours)} ${getArabicPlural(hours, 'ساعة', {
                        two: 'ساعتين',
                        few: 'ساعات',
                })}`;
        }

        const days = Math.floor(hours / 24);
        if (days < 30) {
                return `قبل ${toArabicNumber(days)} ${getArabicPlural(days, 'يوم', {
                        two: 'يومين',
                        few: 'أيام',
                })}`;
        }

        return formatDate(date);
}
