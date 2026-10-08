/**
 * Single source of truth for order presentation across owner + admin pages:
 * status metadata (label + icon), pickup-type metadata, and Arabic relative
 * time ("قبل 5 دقائق").
 *
 * r126-M9: the badgeClassName/toneClassName NativeWind token system had zero
 * consumers (owner rows hand-roll status text) — deleted rather than kept
 * as dead API surface. The old doc comment claimed the badges "follow the
 * theme in both light and dark modes" — the app is night-only by design
 * (userInterfaceStyle: "dark", no switcher), so that claim was misleading
 * and is gone with the dead tokens.
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
        /** Next lifecycle step, or null once terminal (completed/cancelled). */
        next: string | null;
}

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
        new: {
                label: 'جديد',
                icon: Clock,
                next: 'preparing',
        },
        preparing: {
                label: 'قيد التحضير',
                icon: ChefHat,
                next: 'ready',
        },
        ready: {
                label: 'جاهز',
                icon: PackageCheck,
                next: 'completed',
        },
        completed: {
                label: 'مكتمل',
                icon: CheckCircle,
                next: null,
        },
        cancelled: {
                label: 'ملغي',
                icon: XCircle,
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
