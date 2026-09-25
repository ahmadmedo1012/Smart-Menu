'use client';

import { useState, useRef, useCallback, useDeferredValue, useMemo, useEffect } from 'react';

/** Pure debounce core — exported for unit testing without React. */
export function createDebounced<A extends unknown[]>(fn: (...args: A) => void, delay = 275) {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return {
                call: (...args: A) => {
                        if (timer) clearTimeout(timer);
                        timer = setTimeout(() => fn(...args), delay);
                },
                cancel: () => {
                        if (timer) clearTimeout(timer);
                        timer = null;
                },
        };
}

/** Debounce a value change — returns a stable fn that fires `fn` 275ms after last call.
 *  `fn` is held in a ref so an unstable identity (inline closure per render) can't
 *  recreate the callback and cancel the pending timer on every keystroke. */
export function useDebouncedCallback(fn: (v: string) => void, delay = 275) {
        const fnRef = useRef(fn);
        const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
        useEffect(() => {
                fnRef.current = fn;
        });
        useEffect(
                () => () => {
                        if (timer.current) clearTimeout(timer.current);
                },
                []
        );
        return useMemo(
                () => (v: string) => {
                        if (timer.current) clearTimeout(timer.current);
                        timer.current = setTimeout(() => fnRef.current(v), delay);
                },
                [delay]
        );
}
import { MotionSearch } from '@/components/ui/motion-icons';
import AnimatedX from '@/components/ui/x-icon';
import { SlidersHorizontal } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';
import { formatPrice, normalizeArabic } from '@/lib/format';

interface MenuToolbarProps {
        search: string;
        onSearchChange: (value: string) => void;
        sort: string;
        onSortChange: (value: string) => void;
        /** Raw items for suggestion dropdown — always pass, dropdown manages visibility */
        items?: { id: number; name: string; nameAr?: string | null; price: number; image?: string }[];
        onSuggestionClick?: (id: number) => void;
        /** Short menus (<8 items) don't need search — hide to reclaim the fold */
        hideSearch?: boolean;
        className?: string;
}

const SORT_OPTIONS = [
        { value: 'default', label: 'ترتيب افتراضي' },
        { value: 'price-asc', label: 'السعر: من الأقل للأعلى' },
        { value: 'price-desc', label: 'السعر: من الأعلى للأقل' },
        { value: 'name', label: 'الاسم' },
] as const;

export function MenuToolbar({
        search,
        onSearchChange,
        sort,
        onSortChange,
        items = [],
        onSuggestionClick,
        hideSearch = false,
        className,
}: MenuToolbarProps) {
        const [showSort, setShowSort] = useState(false);
        const [showSuggestions, setShowSuggestions] = useState(false);
        /* a11y (ARIA combobox): activeIndex drives aria-activedescendant — the input
           keeps DOM focus while Arrow keys walk the listbox options. -1 = none. */
        const [activeIdx, setActiveIdx] = useState(-1);
        const inputRef = useRef<HTMLInputElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const listboxId = 'menu-search-suggestions';

        useEffect(() => {
                setActiveIdx(-1);
        }, [search]);

        // Local input value updates instantly while typing; URL sync is debounced
        // so router.replace doesn't fire per keystroke (history spam + re-render churn)
        const [inputValue, setInputValue] = useState(search);
        const debouncedSearchChange = useDebouncedCallback(onSearchChange);
        useEffect(() => {
                setInputValue(search);
        }, [search]);

        /* ── Deferred suggestions (low-priority, interruptible) ──
           round88-E1: normalizeArabic (tashkeel/tatweel strip + alef folding +
           ta-marbuta/alef-maqsura folding + latin lowercase) — same matcher as the
           main grid filter in MenuPageClient. The old plain toLowerCase() made the
           dropdown disagree with the grid: typing "كراتيه" matched the grid but not
           the suggestions when the item was stored as "كراتة". */
        const deferredSearch = useDeferredValue(search);
        const suggestions = useMemo(() => {
                const q = normalizeArabic(deferredSearch.trim());
                if (!q) return [];
                return items
                        .filter(
                                (i) => normalizeArabic(i.nameAr || i.name).includes(q) || normalizeArabic(i.name).includes(q)
                        )
                        .slice(0, 5);
                // ponytail: flat search across all items, no category filter on suggestions
        }, [items, deferredSearch]);

        /* ── Close suggestions on outside click ── */
        useEffect(() => {
                if (!showSuggestions) return;
                const handler = (e: MouseEvent) => {
                        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                                setShowSuggestions(false);
                        }
                };
                // defer to avoid same-event cancel
                const id = setTimeout(() => document.addEventListener('click', handler), 0);
                return () => {
                        clearTimeout(id);
                        document.removeEventListener('click', handler);
                };
        }, [showSuggestions]);

        const hasSuggestions = search.trim().length >= 1 && suggestions.length > 0;
        const dropdownVisible = hasSuggestions && showSuggestions;

        /* a11y: keyboard walk of the suggestion listbox (ARIA combobox pattern).
           ArrowDown/ArrowUp move aria-activedescendant, Enter picks the active option,
           Escape collapses. RTL note: Up/Down are direction-neutral so no mirroring needed. */
        const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (!dropdownVisible) {
                        if (e.key === 'ArrowDown' && hasSuggestions) {
                                e.preventDefault();
                                setShowSuggestions(true);
                                setActiveIdx(0);
                        }
                        return;
                }
                if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveIdx((i) => (i <= 0 ? -1 : i - 1));
                } else if (e.key === 'Enter' && activeIdx >= 0 && activeIdx < suggestions.length) {
                        e.preventDefault();
                        onSuggestionClick?.(suggestions[activeIdx].id);
                        setShowSuggestions(false);
                        setActiveIdx(-1);
                } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                        setActiveIdx(-1);
                }
        };

        /* Scroll the activedescendant option into view without stealing focus */
        const optionRef = useCallback(
                (node: HTMLButtonElement | null) => {
                        if (node?.dataset.active === 'true') node.scrollIntoView({ block: 'nearest' });
                },
                []
        );

        return (
                <div ref={containerRef} className={cn('relative mb-4 flex gap-2 items-start', className)}>
                        {/* Search input — glass card wrapper */}
                        {!hideSearch && (
                                <div className="flex-1 relative">
                                        <div className="flex h-12 items-center gap-3 rounded-lg border border-border/70 bg-card px-4 shadow-sm transition-[box-shadow,border-color] duration-200 focus-within:border-orange/45 focus-within:ring-2 focus-within:ring-orange/15 sm:h-14">
                                                <MotionSearch className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
                                                <input
                                                        ref={inputRef}
                                                        id="menu-search"
                                                        name="search"
                                                        type="text"
                                                        role="combobox"
                                                        /* Chrome injects caret-color:transparent into autofilled inputs
                                                           between SSR paint and hydration — a browser-owned style, not
                                                           ours. suppressHydrationWarning stops React 19 from flagging
                                                           the server/client style mismatch (round80 §7.1 debt). */
                                                        suppressHydrationWarning
                                                        placeholder="ابحث في القائمة..."
                                                        /* r120 (U8-F-4): الحقل كان بلا اسم متاح — القارئ يقرأ
                                                           placeholder فقط. r120 (U8-F-3): placeholder بم
                                                           muted/50 كان 2.14:1 فقط. */
                                                        aria-label="ابحث في القائمة"
                                                        value={inputValue}
                                                        onChange={(e) => {
                                                                setInputValue(e.target.value);
                                                                debouncedSearchChange(e.target.value);
                                                                setShowSuggestions(true);
                                                        }}
                                                        onFocus={() => {
                                                                if (hasSuggestions) setShowSuggestions(true);
                                                        }}
                                                        onKeyDown={handleSearchKeyDown}
                                                        aria-autocomplete="list"
                                                        aria-expanded={dropdownVisible}
                                                        aria-controls={hasSuggestions ? listboxId : undefined}
                                                        aria-activedescendant={
                                                                dropdownVisible && activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
                                                        }
                                                        className="flex-1 bg-transparent h-full text-sm outline-none placeholder:text-muted-foreground"
                                                />
                                                {search && (
                                                        <button
                                                                type="button"
                                                                aria-label="مسح البحث"
                                                                onClick={() => {
                                                                        setInputValue('');
                                                                        debouncedSearchChange('');
                                                                        setShowSuggestions(false);
                                                                        inputRef.current?.focus();
                                                                }}
                                                                className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                                        >
                                                                <AnimatedX className="size-3" aria-hidden="true" />
                                                        </button>
                                                )}
                                        </div>

                                        {/* Suggestions dropdown — glass-strong, real listbox owned by the combobox */}
                                        <ul
                                                id={listboxId}
                                                role="listbox"
                                                aria-label="اقتراحات البحث"
                                                className={cn(
                                                        'mt-2 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg transition-[opacity,transform,translate,scale,rotate] duration-200',
                                                        dropdownVisible
                                                                ? 'opacity-100 visible translate-y-0'
                                                                : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                                                )}
                                        >
                                                {suggestions.map((s, i) => (
                                                        <li key={s.id} role="none">
                                                                <button
                                                                        ref={optionRef}
                                                                        id={`${listboxId}-opt-${i}`}
                                                                        type="button"
                                                                        role="option"
                                                                        data-active={i === activeIdx}
                                                                        aria-selected={i === activeIdx}
                                                                        onClick={() => {
                                                                                onSuggestionClick?.(s.id);
                                                                                setShowSuggestions(false);
                                                                                setActiveIdx(-1);
                                                                                inputRef.current?.focus();
                                                                        }}
                                                                        className={cn(
                                                                                'flex items-center gap-3 w-full px-4 py-3 text-start text-sm hover:bg-accent transition-colors first:pt-3.5 last:pb-3.5',
                                                                                i === activeIdx && 'bg-accent'
                                                                        )}
                                                                >
                                                                        {s.image && (
                                                                                <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-muted/30 ring-1 ring-border/20">
                                                                                        {/* r97-X1: OptimizedImage بدل <img> الخام (توحيد السياسة) —
                                                                                            الإطار يحدد الصندوق ٤٠px فيمرر size-full */}
                                                                                        <OptimizedImage
                                                                                                src={s.image}
                                                                                                alt=""
                                                                                                aspectRatio="square"
                                                                                                className="size-full"
                                                                                                skeleton={false}
                                                                                                sizes="40px"
                                                                                        />
                                                                                </div>
                                                                        )}
                                                                        <span className="flex-1 min-w-0 truncate">{s.nameAr || s.name}</span>
                                                                        <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
                                                                                {formatPrice(s.price)}
                                                                        </span>
                                                                </button>
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
                        )}

                        {/* Sort button — glass-card trigger, opens a real menu pattern.
                                a11y: role=menu + menuitemradio + aria-checked (single-select menu),
                                options are NOT tabbable — Arrow keys move focus among them (roving). */}
                        <div className="relative">
                                <button
                                        type="button"
                                        aria-label="ترتيب"
                                        aria-haspopup="menu"
                                        aria-expanded={showSort}
                                        onClick={() => setShowSort(!showSort)}
                                        onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setShowSort(true);
                                                }
                                        }}
                                        className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-card shadow-sm transition-[background-color,border-color] duration-200 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-orange/30 focus-visible:outline-none sm:h-14 sm:w-14"
                                >
                                        {/* r97-X1: lucide import بدل مسار SVG مُدمج يدوياً */}
                                        <SlidersHorizontal className="size-4" aria-hidden="true" />
                                </button>
                                {showSort && (
                                        <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} aria-hidden="true" />
                                                <div
                                                        className="absolute end-0 top-full z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg animate-scale-in sm:end-auto sm:start-0 sm:w-52"
                                                        role="menu"
                                                        aria-label="خيارات الترتيب"
                                                        tabIndex={-1}
                                                        ref={(node) => {
                                                                if (showSort && node) node.focus();
                                                        }}
                                                        onKeyDown={(e) => {
                                                                const opts = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']");
                                                                const cur = Array.from(opts).findIndex((o) => o === document.activeElement);
                                                                if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        opts[(cur + 1) % opts.length]?.focus();
                                                                } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        opts[(cur - 1 + opts.length) % opts.length]?.focus();
                                                                } else if (e.key === 'Escape') {
                                                                        setShowSort(false);
                                                                }
                                                        }}
                                                >
                                                        {SORT_OPTIONS.map((opt) => (
                                                                <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        role="menuitemradio"
                                                                        aria-checked={sort === opt.value}
                                                                        tabIndex={-1}
                                                                        onClick={() => {
                                                                                onSortChange(opt.value);
                                                                                setShowSort(false);
                                                                        }}
                                                                        className={cn(
                                                                                'w-full px-4 py-3 text-start text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                                                                                sort === opt.value && /* r95: نص الخيار المفعّل — accent-foreground (AA) */ 'bg-accent font-medium text-accent-foreground'
                                                                        )}
                                                                >
                                                                        {opt.label}
                                                                </button>
                                                        ))}
                                                </div>
                                        </>
                                )}
                        </div>
                </div>
        );
}
