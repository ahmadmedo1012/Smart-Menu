import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared action primitive. Keep feedback quick and quiet so the button reads
 * as an action, not as decoration.
 */
const buttonVariants = cva(
	"group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-sans text-sm font-bold whitespace-nowrap cursor-pointer transition-[color,background-color,border-color,box-shadow,transform,translate,scale,rotate,opacity] duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 min-h-11 min-w-11",
	{
		variants: {
			variant: {
				orange:
					'bg-orange text-orange-foreground hover:bg-orange/90 shadow-md shadow-orange/15 hover:shadow-lg hover:shadow-orange/20 border-0',
				// "flame" (ember→saffron warm) is the signature CTA treatment — QR-corner moments.
				flame:
					'bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] text-[#1a130b] hover:brightness-105 shadow-md shadow-orange/20 hover:shadow-lg hover:shadow-orange/25 border-0',
				outline:
					'border-border bg-transparent text-foreground hover:bg-foreground/5 hover:border-foreground/30 dark:hover:bg-foreground/10 dark:hover:border-foreground/40',
				ghost:
					'bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/10 border-transparent dark:hover:bg-foreground/15',
				destructive:
					'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/25',
			},
			size: {
				sm: 'h-10 gap-1.5 px-3.5 text-xs',
				default: 'h-12 gap-2 px-5 text-sm',
				lg: 'h-14 gap-2.5 px-7 text-sm sm:text-base',
				icon: 'size-12',
			},
		},
		defaultVariants: {
			variant: 'orange',
			size: 'default',
		},
	}
);

function Button({
	className,
	variant = 'orange',
	// "flame" (ember→saffron warm) is the signature CTA treatment — used in
	// the QR-corner moments (menu order FAB, share card).
	size = 'default',
	loading = false,
	'aria-label': ariaLabel,
	children,
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
	loading?: boolean;
	'aria-label'?: string;
}) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			aria-label={ariaLabel}
			aria-busy={loading}
			disabled={loading || props.disabled}
			{...props}
		>
			{loading && (
				<Loader2 className="animate-spin size-4" aria-hidden="true">
					<title>جاري التحميل</title>
				</Loader2>
			)}
			{!loading && children}
		</ButtonPrimitive>
	);
}

export { Button, buttonVariants };
