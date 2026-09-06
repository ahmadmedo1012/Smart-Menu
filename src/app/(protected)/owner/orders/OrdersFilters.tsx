'use client';

import { SearchInput } from '@/components/ui/search-input';
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
                                placeholder="ابحث برقم الطلب أو اسم العميل..."
                        />
                        <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                        const v = e.target.value;
                                        onDateFromChange(v);
                                }}
                                className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
                                title="من تاريخ"
                                aria-label="من تاريخ"
                        />
                        <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                        const v = e.target.value;
                                        onDateToChange(v);
                                }}
                                className="h-11 rounded-md border border-border/30 bg-card/50 px-3 text-sm outline-none focus-visible:border-orange"
                                title="إلى تاريخ"
                                aria-label="إلى تاريخ"
                        />
                        {(dateFrom || dateTo) && (
                                <button
                                        type="button"
                                        onClick={onClearDates}
                                        className="h-11 px-4 rounded-md border border-border/30 text-sm hover:bg-accent transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                >
                                        إلغاء
                                </button>
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
                                                'snap-start shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-[color,background-color,border-color] duration-300 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                filter === tab.value
                                                        ? 'bg-gradient-to-r from-orange to-orange/80 text-white shadow-lg shadow-orange/25'
                                                        : 'bg-card/50 border border-border/30 hover:border-orange/30'
                                        )}
                                >
                                        {tab.label}
                                        <span
                                                className={cn(
                                                        'inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold',
                                                        filter === tab.value
                                                                ? 'bg-white/20 text-white'
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
