import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent font-display text-sm whitespace-nowrap cursor-pointer transition-all duration-300 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				orange:
					"bg-orange text-orange-foreground hover:bg-[#e05f0a] shadow-lg shadow-orange/20 hover:shadow-lg hover:shadow-orange/25 border-0 active:scale-[0.98] transition-all duration-300",
				outline:
					"border-orange/40 bg-transparent text-orange hover:bg-orange/10 hover:border-orange/60 hover:shadow-md hover:shadow-orange/15 active:scale-[0.98] transition-all duration-300",
				ghost:
					"bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/10 active:scale-[0.98] transition-all duration-300",
				destructive:
					"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 active:scale-[0.98] transition-all duration-300",
			},
			size: {
				sm: "h-8 gap-1.5 px-4 text-xs",
				default: "h-10 gap-2 px-5 text-sm",
				lg: "h-14 gap-2.5 px-8 text-base",
				icon: "size-10",
				"icon-sm": "size-8",
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
