import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

/**
 * I-4 (W7-G) — بدائية واحدة لصفوف الفلترة (pill / segmented).
 *
 * تدقيق W7-G-A2 حصر 15 موقعاً مكتوبة يدوياً بنفس النمط وبثلاث لغات
 * منشط مختلفة (صلب ‎bg-orange‎ · ناعم ‎bg-orange-muted‎ · صبغة ‎bg-orange/10‎)
 * وأربعة سلوكيات خمول — هذا المكوّن يوحّدها في معالجة نشطة واحدة
 * (‎bg-orange text-orange-foreground shadow-sm‎ — قواعد r154) وخمول واحد
 * (حدود دافئة + غسلة تراكوتا عند التحويم).
 *
 *  - pill       : ‎rounded-full‎ — صف الرقائق (الطلبات/الفلاتر).
 *  - segmented  : ‎rounded-lg‎ — المحددات المقسمة (النطاق/الحجم).
 *  - count?     : حبة عدّ اختيارية (أرقام غربية عبر toArabicNumber —
 *                  قانون r135: صفر أرقام شرقية على الأسطح).
 *  - التركيز    : يركب قانون الهالة العام ‎:focus-visible‎ في globals.css —
 *                  لا حلقات يدوية per-site (قرار r131 F3/r151).
 *
 * a11y: role="group" باسم مطلوب + aria-pressed لكل زر — نمط الـtoggle
 * الفلتر الصادق (قرار r127-F3 K-8: ليست tablist — لا لوحات تُبدَّل).
 */
export interface FilterTabItem<T = string> {
        value: T;
        label: ReactNode;
        /** Optional count chip (Arabic-Locale Western digits). */
        count?: number;
}

interface FilterTabsProps<T extends string | number | null> {
        items: FilterTabItem<T>[];
        value: T;
        onChange: (value: T) => void;
        variant?: 'pill' | 'segmented';
        /** Required group name for screen readers. */
        'aria-label': string;
        /** Row-level overrides (e.g. flex-wrap for the analytics range picker). */
        className?: string;
        /** Per-button overrides (e.g. flex-1 for the QR size selector). */
        itemClassName?: string;
        disabled?: boolean;
}

const ACTIVE =
        'bg-orange text-orange-foreground shadow-sm border-transparent';
const IDLE =
        'border-border/30 bg-card/50 text-foreground hover:border-orange/30 hover:bg-orange-muted/40';

export function FilterTabs<T extends string | number | null>({
        items,
        value,
        onChange,
        variant = 'pill',
        'aria-label': ariaLabel,
        className,
        itemClassName,
        disabled = false,
}: FilterTabsProps<T>) {
        return (
                <div
                        role="group"
                        aria-label={ariaLabel}
                        className={cn(
                                'flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x',
                                className
                        )}
                >
                        {items.map((item) => {
                                const active = item.value === value;
                                return (
                                        <button
                                                key={String(item.value)}
                                                type="button"
                                                onClick={() => onChange(item.value)}
                                                aria-pressed={active}
                                                disabled={disabled}
                                                className={cn(
                                                        'inline-flex min-h-11 shrink-0 snap-start items-center gap-2 border px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-base',
                                                        variant === 'segmented' ? 'rounded-lg' : 'rounded-full',
                                                        active ? ACTIVE : IDLE,
                                                        itemClassName
                                                )}
                                        >
                                                {item.label}
                                                {item.count != null && (
                                                        <span
                                                                className={cn(
                                                                        'inline-flex size-5 items-center justify-center rounded-full text-2xs font-bold',
                                                                        active
                                                                                ? 'bg-orange-foreground/15 text-orange-foreground'
                                                                                : 'bg-muted text-muted-foreground'
                                                                )}
                                                        >
                                                                {toArabicNumber(item.count)}
                                                        </span>
                                                )}
                                        </button>
                                );
                        })}
                </div>
        );
}
