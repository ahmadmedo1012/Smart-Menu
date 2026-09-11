/**
 * Single source of truth for order presentation across owner + admin pages:
 * status metadata (semantic phase-2 token classes), pickup-type metadata,
 * and Arabic relative time ("قبل 5 دقائق").
 *
 * Badge classes intentionally ride on the @theme tokens (--color-warning,
 * --color-info, --color-success, --color-destructive) instead of hand-picked
 * hexes, so they follow the theme in both light and dark modes. Text colors
 * pair each token with a darker/lighter scale shade to hold WCAG AA contrast
 * on the translucent token backgrounds (same pattern as the badge "gold"
 * variant: token surface + scale-shade text).
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
} from 'lucide-react-native';
import { getArabicPlural } from '@/lib/arabic-plural';
import { toArabicNumber, formatDate } from '@/lib/format';

export interface OrderStatusMeta {
        /** Arabic label shown in badges, toasts, and the detail timeline. */
        label: string;
        icon: LucideIcon;
        /** Semantic token classes for <Badge> (surface + AA-safe text shades). */
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
                badgeClassName: 'bg-warning/15 text-warning border-warning/25',
                toneClassName: 'bg-warning/15 text-warning',
                next: 'preparing',
        },
        preparing: {
                label: 'قيد التحضير',
                icon: ChefHat,
                badgeClassName: 'bg-info/15 text-info border-info/25',
                toneClassName: 'bg-info/15 text-info',
                next: 'ready',
        },
        ready: {
                label: 'جاهز',
                icon: PackageCheck,
                badgeClassName: 'bg-success/15 text-success border-success/20',
                toneClassName: 'bg-success/15 text-success',
                next: 'completed',
        },
        completed: {
                label: 'مكتمل',
                icon: CheckCircle,
                badgeClassName: 'bg-success/15 text-success border-success/20',
                toneClassName: 'bg-success/15 text-success',
                next: null,
        },
        cancelled: {
                label: 'ملغي',
                icon: XCircle,
                badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
                toneClassName: 'bg-destructive/10 text-destructive',
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
