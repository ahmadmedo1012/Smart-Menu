'use client';

import { cn } from '@/lib/utils';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';

export type PickupOption = {
        value: 'inside' | 'takeaway' | 'delivery';
        label: string;
        icon: 'inside' | 'takeaway' | 'delivery';
};

interface PickupTypeSelectorProps {
        isFetching: boolean;
        error: boolean;
        onRetry: () => void;
        options: readonly PickupOption[];
        value: 'inside' | 'takeaway' | 'delivery';
        onChange: (t: 'inside' | 'takeaway' | 'delivery') => void;
}

/** Pickup type chooser — verbatim extraction from the cart page (round89-G1). */
export function PickupTypeSelector({
        isFetching,
        error,
        onRetry,
        options,
        value,
        onChange,
}: PickupTypeSelectorProps) {
        return (
                <>
                        {/* Pickup type selector */}
                        <LoadingAnnouncer
                                loading={isFetching}
                                message="جاري تحميل خيارات الطلب..."
                                completedMessage="تم تحميل خيارات الطلب"
                        />
                        {error && (
                                <button
                                        type="button"
                                        onClick={onRetry}
                                        className="mb-4 w-full rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                >
                                        تعذر تحميل خيارات الطلب — انقر لإعادة المحاولة
                                </button>
                        )}
                        <div className="flex gap-1 sm:gap-2 mb-8 animate-slide-up delay-100">
                                {options.map((opt) => (
                                        <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => onChange(opt.value)}
                                                // r119-S5-P2: the selection was conveyed by COLOR
                                                // only — aria-pressed makes the toggle state
                                                // perceivable to screen readers (WCAG 1.4.1).
                                                aria-pressed={value === opt.value}
                                                className={cn(
                                                        'flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 rounded-md text-[11px] sm:text-sm font-medium transition-[transform,translate,scale,rotate,box-shadow,color,background-color,border-color] duration-300 border overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                        value === opt.value
                                                                ? 'bg-gradient-to-r from-orange to-orange/80 text-white border-orange shadow-lg shadow-orange/20 scale-[1.02]'
                                                                : 'bg-card/50 border-border/30 hover:border-orange/20 hover:shadow-md'
                                                )}
                                        >
                                                {opt.icon === 'inside' ? (
                                                        <svg
                                                                className="size-5"
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
                                                ) : opt.icon === 'takeaway' ? (
                                                        <svg
                                                                className="size-5"
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
                                                                className="size-5"
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
                                                <span>{opt.label}</span>
                                        </button>
                                ))}
                        </div>
                </>
        );
}
