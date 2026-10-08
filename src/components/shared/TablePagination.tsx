'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

/**
 * r131-F5 (A1 P1-1/P2-7): the canonical windowed numbered pagination —
 * Madarek `.table-pagination` (components.css:916-948):
 *
 *   · desktop buttons 36px, 44px floor ≤640px (touch)
 *   · active page = accent-soft ground + accent border + accent ink /600
 *   · hover = surface-2 wash + stronger border, disabled 0.45
 *   · RTL-aware chevrons (السابقة = ChevronRight in RTL) + aria-current
 *   · footer anatomy: space-between — count line + button window
 *
 * Extracted from admin/users (the one true numbered pagination) so the
 * orders list can retire its "load more" button.
 */
export function TablePagination({
        page,
        totalPages,
        onPageChange,
        /** Extra info line (e.g. total count) rendered at the inline-start. */
        meta,
        className,
}: {
        page: number;
        totalPages: number;
        onPageChange: (page: number) => void;
        meta?: React.ReactNode;
        className?: string;
}) {
        if (totalPages <= 1) return null;

        // Windowed page numbers: at most 5 buttons around the current page.
        const windowPages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                if (totalPages <= 5) return i + 1;
                if (page <= 3) return i + 1;
                if (page >= totalPages - 2) return totalPages - 4 + i;
                return page - 2 + i;
        });

        const btn =
                'inline-flex size-9 max-sm:size-11 items-center justify-center rounded-sm border border-border text-sm tabular-nums text-muted-foreground transition-[background-color,border-color,color] duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-45 disabled:pointer-events-none';

        return (
                <nav
                        aria-label="ترقيم الصفحات"
                        className={cn(
                                'flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground',
                                className
                        )}
                >
                        {meta ? <span className="tabular-nums">{meta}</span> : <span aria-hidden="true" />}
                        <div className="flex items-center gap-2">
                                <button
                                        type="button"
                                        className={btn}
                                        onClick={() => onPageChange(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        aria-label="الصفحة السابقة"
                                >
                                        <ChevronRight className="size-4" aria-hidden="true" />
                                </button>
                                {windowPages.map((pn) => (
                                        <button
                                                key={pn}
                                                type="button"
                                                className={cn(
                                                        btn,
                                                        pn === page &&
                                                                'border-[var(--accent-solid)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-ink)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-soft)]'
                                                )}
                                                onClick={() => onPageChange(pn)}
                                                aria-label={`الصفحة ${toArabicNumber(pn)}`}
                                                aria-current={pn === page ? 'page' : undefined}
                                        >
                                                {toArabicNumber(pn)}
                                        </button>
                                ))}
                                <button
                                        type="button"
                                        className={btn}
                                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        aria-label="الصفحة التالية"
                                >
                                        <ChevronLeft className="size-4" aria-hidden="true" />
                                </button>
                        </div>
                </nav>
        );
}
