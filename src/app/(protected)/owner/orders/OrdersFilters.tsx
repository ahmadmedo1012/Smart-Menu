'use client';

import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

export interface FilterTab {
        value: string;
        label: string;
        count: number;
}

interface OrdersFiltersProps {
        search: string;
        onSearchChange: (v: string) => void;
        dateFrom: string;
        dateTo: string;
        onDateFromChange: (v: string) => void;
        onDateToChange: (v: string) => void;
        onClearDates: () => void;
        filter: string;
        onFilterChange: (v: string) => void;
        tabs: FilterTab[];
}

/**
 * round90-F4 (L1 — QA live 13-owner-orders): native date inputs render their
 * value AND placeholder per the BROWSER's locale — on an en-US machine the
 * Arabic UI showed English "mm/dd/yyyy" fields (uncontrollable from HTML).
 * The control is kept (picker + yyyy-mm-dd value + onChange untouched), its
 * locale-rendered text is hidden, and an Arabic overlay (Intl.DateTimeFormat
 * 'ar', Western digits — the same toArabicNumber convention the rest of the
 * interface uses) is the visible value. Screen readers read the real input
 * value; the overlay is aria-hidden and pointer-events-none so clicks pass
 * through to the input.
 */
const arabicDateFmt = new Intl.DateTimeFormat('ar', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        numberingSystem: 'latn',
});

function DateFilterField({
        id,
        label,
        value,
        onChange,
}: {
        id: string;
        label: string;
        value: string;
        onChange: (v: string) => void;
}) {
        let display = '';
        if (value) {
                // value is the spec yyyy-mm-dd string — parse at local noon so
                // timezone edges can't shift the displayed day.
                const d = new Date(`${value}T12:00:00`);
                display = Number.isNaN(d.getTime()) ? '' : arabicDateFmt.format(d);
        }
        return (
                <div className="relative shrink-0" dir="rtl">
                        <input
                                id={id}
                                type="date"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="h-11 w-44 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-ring text-transparent"
                                title={display || label}
                                aria-label={label}
                        />
                        <span
                                aria-hidden="true"
                                className={cn(
                                        'pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm whitespace-nowrap',
                                        display ? '' : 'text-muted-foreground/70'
                                )}
                        >
                                {display || label}
                        </span>
                </div>
        );
}

/** Search + date range + status chips — verbatim extraction from the owner
 * orders page (round89-G2). The date handlers run the same state-write +
 * refetch sequence the old inline arrows did. */
export function OrdersFilters({
        search,
        onSearchChange,
        dateFrom,
        dateTo,
        onDateFromChange,
        onDateToChange,
        onClearDates,
        filter,
        onFilterChange,
        tabs,
}: OrdersFiltersProps) {
        return (
                <>
                {/* Search + Date filter */}
                <div className="flex gap-2 items-start flex-wrap">
                        <SearchInput
                                value={search}
                                onChange={onSearchChange}
                                placeholder="ابحث برقم الطلب أو اسم العميل…"
                        />
                        <DateFilterField
                                id="orders-date-from"
                                label="من تاريخ"
                                value={dateFrom}
                                onChange={onDateFromChange}
                        />
                        <DateFilterField
                                id="orders-date-to"
                                label="إلى تاريخ"
                                value={dateTo}
                                onChange={onDateToChange}
                        />
                        {(dateFrom || dateTo) && (
                                /* r131-F5 (A1 P0-4): canonical Button — the hand-rolled
                                        h-11 control had no press scale/weight/lift. */
                                <Button variant="outline" size="sm" onClick={onClearDates} className="mt-0.5">
                                        إلغاء التواريخ
                                </Button>
                        )}
                </div>

                {/* Status filter chips with counts */}
                <div
                        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x"
                        role="group"
                        aria-label="تصفية حسب الحالة"
                >
                        {tabs.map((tab) => (
                                <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => onFilterChange(tab.value)}
                                        aria-pressed={filter === tab.value}
                                        className={cn(
                                                'snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-[color,background-color,border-color] duration-base flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                /* Phase 6 (r154): terracotta active state — solid
                                                   editorial fill (the gradient wash + glow shadow
                                                   retire; the warm hairline hover stays). */
                                                filter === tab.value
                                                        ? 'bg-orange text-orange-foreground shadow-sm'
                                                        : 'bg-card/50 border border-border/30 hover:border-orange/30 hover:bg-orange-muted/40'
                                        )}
                                >
                                        {tab.label}
                                        <span
                                                className={cn(
                                                        'inline-flex items-center justify-center size-5 rounded-full text-2xs font-bold',
                                                        filter === tab.value
                                                                ? 'bg-orange-foreground/15 text-orange-foreground'
                                                                : 'bg-muted text-muted-foreground'
                                                )}
                                        >
                                                {toArabicNumber(tab.count)}
                                        </span>
                                </button>
                        ))}
                </div>
                </>
        );
}
