'use client';

import { useState, useRef, useDeferredValue, useMemo, useEffect } from 'react';

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
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';

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
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Local input value updates instantly while typing; URL sync is debounced
	// so router.replace doesn't fire per keystroke (history spam + re-render churn)
	const [inputValue, setInputValue] = useState(search);
	const debouncedSearchChange = useDebouncedCallback(onSearchChange);
	useEffect(() => {
		setInputValue(search);
	}, [search]);

	/* ── Deferred suggestions (low-priority, interruptible) ── */
	const deferredSearch = useDeferredValue(search);
	const suggestions = useMemo(() => {
		const q = deferredSearch.trim().toLowerCase();
		if (!q || q.length < 1) return [];
		return items
			.filter(
				(i) => (i.nameAr || i.name).toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
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

	return (
		<div ref={containerRef} className={cn('relative mb-4 flex gap-2 items-start', className)}>
			{hideSearch && !search ? null : null}
			{/* Search input — glass card wrapper */}
			{!hideSearch && (
			<div className="flex-1 relative">
				<div className="glass-card rounded-xl flex items-center px-4 h-12 sm:h-14 gap-3 focus-within:ring-2 focus-within:ring-orange/30 transition-all duration-300">
					<Search className="size-4 text-muted-foreground shrink-0 pointer-events-none" />
					<input
						ref={inputRef}
						id="menu-search"
						name="search"
						type="text"
						placeholder="ابحث في القائمة..."
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value);
							debouncedSearchChange(e.target.value);
							setShowSuggestions(true);
						}}
						onFocus={() => {
							if (hasSuggestions) setShowSuggestions(true);
						}}
						className="flex-1 bg-transparent h-full text-sm outline-none placeholder:text-muted-foreground/50"
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
							className="size-5 rounded-sm bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
						>
							<X className="size-3" />
						</button>
					)}
				</div>

				{/* Suggestions dropdown — glass-strong */}
				<div
					className={cn(
						'glass-strong rounded-xl mt-2 overflow-hidden shadow-glass-lg transition-all duration-200',
						dropdownVisible
							? 'opacity-100 visible translate-y-0'
							: 'opacity-0 invisible -translate-y-1 pointer-events-none'
					)}
				>
					{suggestions.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => {
								onSuggestionClick?.(s.id);
								setShowSuggestions(false);
							}}
							className="flex items-center gap-3 w-full px-4 py-3 text-start text-sm hover:bg-accent transition-colors first:pt-3.5 last:pb-3.5"
						>
							{s.image && (
								<div className="size-10 rounded-lg overflow-hidden shrink-0 bg-muted/30 ring-1 ring-border/20">
									<img src={s.image} alt="" loading="lazy" className="size-full object-cover" />
								</div>
							)}
							<span className="flex-1 min-w-0 truncate">{s.nameAr || s.name}</span>
							<span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
								{toArabicNumber(s.price.toFixed(1))} د.ل
							</span>
						</button>
					))}
				</div>
			</div>
			)}

			{/* Sort button — glass-card trigger */}
			<div className="relative">
				<button
					type="button"
					aria-label="ترتيب"
					aria-haspopup="listbox"
					aria-expanded={showSort}
					onClick={() => setShowSort(!showSort)}
					onKeyDown={(e) => {
						if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							setShowSort(true);
						}
					}}
					className="glass-card rounded-xl h-12 sm:h-14 w-12 sm:w-14 flex items-center justify-center transition-all duration-300 focus-within:ring-2 focus-within:ring-orange/30"
				>
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<path d="M3 7h18M6 12h12M10 17h4" strokeLinecap="round" />
					</svg>
				</button>
				{showSort && (
					<>
						<div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
						<div
							className="absolute end-0 sm:end-auto sm:start-0 top-full mt-2 z-50 w-48 sm:w-52 rounded-xl shadow-glass-lg overflow-hidden origin-top-right animate-scale-in"
							role="listbox"
							aria-label="خيارات الترتيب"
							onKeyDown={(e) => {
								const opts = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='option']");
								const cur = Array.from(opts).findIndex((o) => o === document.activeElement);
								if (e.key === 'ArrowDown') {
									e.preventDefault();
									opts[(cur + 1) % opts.length]?.focus();
								}
								if (e.key === 'ArrowUp') {
									e.preventDefault();
									opts[(cur - 1 + opts.length) % opts.length]?.focus();
								}
								if (e.key === 'Escape') {
									setShowSort(false);
								}
							}}
						>
							{SORT_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									role="option"
									type="button"
									aria-selected={sort === opt.value}
									onClick={() => {
										onSortChange(opt.value);
										setShowSort(false);
									}}
									className={cn(
										'glass-strong w-full text-start px-4 py-3 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent focus-visible:ring-2 focus-visible:ring-orange/30 focus-visible:outline-none',
										sort === opt.value && 'bg-accent font-medium text-primary'
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
