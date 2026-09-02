import * as React from "react"
import { useId } from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

type InputState = "default" | "error" | "success" | "warning"

function Input({
	className,
	type,
	state = "default",
	id,
	"aria-describedby": ariaDescribedBy,
	...props
}: React.ComponentProps<"input"> & {
	state?: InputState;
}) {
	// Token-aligned state styles. Uses --success / --destructive / --warning
	// from globals.css instead of hard-coded Tailwind palette colors so the
	// ring + border + icon stay in lockstep across dark/light themes.
	const stateStyles: Record<InputState, string> = {
		default: "border-input focus-visible:border-orange focus-visible:ring-ring/20",
		error:
			"border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
		success:
			"border-[color:var(--success)] focus-visible:border-[color:var(--success)] focus-visible:ring-[color:var(--success)]/20",
		warning:
			"border-[color:var(--warning)] focus-visible:border-[color:var(--warning)] focus-visible:ring-[color:var(--warning)]/20",
	}

	// End-relative padding so typed text (Arabic or Latin) never collides
	// with the trailing state icon. Logical property works in both LTR/RTL.
	const hasTrailingIcon = state === "success" || state === "error" || state === "warning"

	// Stable id for label association if consumer didn't pass one.
	const generatedId = useId()
	const inputId = id ?? generatedId

	return (
		<div className="relative w-full">
			<InputPrimitive
				id={inputId}
				type={type}
				data-slot="input"
				data-state={state}
				dir="auto"
				className={cn(
					// h-12 already equals 48px — single source of truth.
					"h-12 w-full min-w-0 rounded-lg border bg-transparent py-3 text-base shadow-xs transition-[color,background-color,border-color,box-shadow] duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:shadow-[0_0_0_4px_oklch(0.55_0.19_45_/_0.12)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/60 md:text-sm dark:bg-input/30 dark:disabled:bg-muted dark:disabled:text-muted-foreground/50",
					// Logical inline-end padding reserves space for the icon.
					hasTrailingIcon ? "px-12" : "px-4",
					stateStyles[state],
					className
				)}
				aria-invalid={state === "error" || undefined}
				aria-describedby={ariaDescribedBy}
				{...props}
			/>
			{/* Icon container: smooth crossfade so state changes feel intentional,
			    not snappy. pointer-events-none so the icon never eats the click. */}
			{state === "success" && (
				<CheckCircle2
					className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-[color:var(--success)] transition-opacity duration-200"
					aria-hidden="true"
				/>
			)}
			{state === "error" && (
				<AlertCircle
					className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-destructive transition-opacity duration-200"
					aria-hidden="true"
				/>
			)}
			{state === "warning" && (
				<AlertTriangle
					className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-[color:var(--warning)] transition-opacity duration-200"
					aria-hidden="true"
				/>
			)}
		</div>
	)
}

export { Input }
export type { InputState }
