'use client';

import { cn } from '@/lib/utils';
import {} from 'lucide-react';
import { MotionSearch } from '@/components/ui/motion-icons';;

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	'aria-label'?: string;
}

export function SearchInput({
	value,
	onChange,
	placeholder = 'ابحث...',
	className,
	'aria-label': ariaLabel,
}: SearchInputProps) {
	return (
		<div className={cn('relative flex-1', className)}>
			<MotionSearch
				className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-label={ariaLabel}
				className="h-11 w-full rounded-md border border-border/30 bg-card/50 ps-11 pe-4 text-sm outline-none transition-colors focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 focus-visible:ring-offset-0"
			/>
		</div>
	);
}
