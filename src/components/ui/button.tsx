import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent font-display text-sm font-bold whitespace-nowrap cursor-pointer transition-all duration-300 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				orange:
					"bg-orange text-orange-foreground hover:brightness-110 shadow-lg shadow-orange/20 hover:shadow-xl hover:shadow-orange/25 border-0",
				outline:
					"border-border bg-transparent text-foreground hover:bg-foreground/5 hover:border-foreground/30",
				ghost:
					"bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/10 border-transparent",
				destructive:
					"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
			},
			size: {
				sm: "h-8 gap-1.5 px-3.5 text-xs",
				default: "h-10 gap-2 px-5 text-sm",
				lg: "h-12 gap-2.5 px-7 text-sm sm:text-base",
				icon: "size-8",
			},
		},
		defaultVariants: {
			variant: "orange",
			size: "default",
		},
	}
)

function Button({
	className,
	variant = "orange",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
