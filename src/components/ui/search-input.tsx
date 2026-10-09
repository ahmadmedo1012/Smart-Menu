'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { MotionSearch } from '@/components/ui/motion-icons';
import AnimatedX from '@/components/ui/x-icon';

interface SearchInputProps {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        className?: string;
        'aria-label'?: string;
        /** Optional debounce window (ms) for the onChange callback. */
        debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 275;

export function SearchInput({
        value,
        onChange,
        placeholder = 'ابحث…',
        className,
        'aria-label': ariaLabel,
        debounceMs,
}: SearchInputProps) {
        const inputId = useId();
        const liveId = `${inputId}-live`;
        const inputRef = useRef<HTMLInputElement>(null);
        const [internalValue, setInternalValue] = useState(value);
        const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const isDebounced = typeof debounceMs === 'number' && debounceMs >= 0;

        // Keep local state in sync when the controlled value changes externally
        // (e.g. parent clears the search via a "clear filters" button).
        useEffect(() => {
                setInternalValue(value);
        }, [value]);

        // Debounced onChange: fires `delay` ms after the last keystroke so we don't
        // re-filter on every character. Skipped when debounceMs is undefined.
        useEffect(() => {
                if (!isDebounced) return;
                if (internalValue === value) return;
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(
                        () => onChange(internalValue),
                        debounceMs ?? DEFAULT_DEBOUNCE_MS
                );
                return () => {
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                };
        }, [internalValue, value, isDebounced, debounceMs, onChange]);

        const handleChange = (next: string) => {
                setInternalValue(next);
                if (!isDebounced) onChange(next);
        };

        const handleClear = () => {
                setInternalValue('');
                // Clearing should feel instant — bypass any pending debounce.
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onChange('');
                inputRef.current?.focus();
        };

        const hasValue = internalValue.length > 0;

        return (
                <div className={cn('relative flex-1', className)}>
                        <MotionSearch
                                className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                        />
                        <input
                                ref={inputRef}
                                id={inputId}
                                type="text"
                                placeholder={placeholder}
                                value={internalValue}
                                onChange={(e) => handleChange(e.target.value)}
                                aria-label={ariaLabel ?? placeholder}
                                aria-controls={liveId}
                                // r131-F4 (A11 SM-5): focus joins the ONE input contract —
                                // border accent + the 3px/22% halo token (the old 4px 60%
                                // gold ring was a second focus grammar); placeholder rides
                                // the AA faint tier --placeholder-text (A7 sweep).
                                className="h-11 w-full rounded-md border border-border/30 bg-card/50 ps-11 pe-10 text-sm outline-none transition-colors placeholder:text-placeholder-text focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]"
                        />
                        {hasValue && (
                                <button
                                        type="button"
                                        onClick={handleClear}
                                        aria-label="مسح البحث"
                                        title="مسح البحث"
                                        className="absolute end-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                >
                                        <AnimatedX size={16} className="text-current" />
                                </button>
                        )}
                        {/* Screen-reader announcement of the current query (polite, debounced
                            upstream by the parent if needed). Visually hidden. */}
                        <span
                                id={liveId}
                                role="status"
                                aria-live="polite"
                                className="sr-only"
                        >
                                {hasValue ? `البحث: ${internalValue}` : ''}
                        </span>
                </div>
        );
}
